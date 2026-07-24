const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Cart = require('../models/Cart');
const { saveBase64Image, deleteUploadedImage } = require('../utils/imageUpload');

// GET /api/products  (public) - supports ?category=&minPrice=&maxPrice=&search=
exports.getProducts = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search } = req.query;
        const products = await Product.getAll({ category, minPrice, maxPrice, search });
        res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// GET /api/products/:id  (public)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let images = await ProductImage.getByProductId(req.params.id);

        // Products created before the gallery existed only have Product.image_url
        // with no ProductImage rows — synthesize a matching virtual entry so the
        // frontend can treat every product the same way.
        if (images.length === 0 && product.image_url) {
            images = [{
                image_id: null,
                product_id: product.product_id,
                image_url: product.image_url,
                is_primary: 1,
                display_order: 0,
            }];
        }

        res.status(200).json({ success: true, product: { ...product, images } });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// POST /api/products  (admin only)
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, category, stock, images, primaryIndex } = req.body;

        if (!name || !price) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ success: false, message: 'Please upload at least one product image' });
        }

        const savedUrls = [];
        try {
            for (const dataUrl of images) {
                const url = saveBase64Image(dataUrl);
                if (!url) throw new Error('INVALID_IMAGE');
                savedUrls.push(url);
            }
        } catch (uploadError) {
            // Clean up anything we already wrote to disk before hitting the bad file
            savedUrls.forEach(deleteUploadedImage);
            if (uploadError.message === 'INVALID_IMAGE') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image file. Please upload JPG, PNG, GIF, or WEBP images.'
                });
            }
            return res.status(400).json({ success: false, message: uploadError.message });
        }

        const primary = Number.isInteger(primaryIndex) && primaryIndex >= 0 && primaryIndex < savedUrls.length
            ? primaryIndex
            : 0;

        const product_id = await Product.create({
            name, description, price, category, stock,
            image_url: savedUrls[primary], // kept in sync as the primary image
            seller_id: req.user.userId
        });

        for (let i = 0; i < savedUrls.length; i++) {
            await ProductImage.create(product_id, savedUrls[i], {
                isPrimary: i === primary,
                displayOrder: i,
            });
        }

        res.status(201).json({ success: true, message: 'Product created', product_id });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PUT /api/products/:id  (admin only)
exports.updateProduct = async (req, res) => {
    try {
        const product_id = req.params.id;
        const product = await Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const { newImages, deleteImageIds, primaryImageId, primaryNewImageIndex, ...fields } = req.body;
        const updateData = { ...fields };

        // Never allow image_url to be set directly from the request body — it's
        // only ever derived from the ProductImage rows below.
        delete updateData.image_url;

        const deleteIds = Array.isArray(deleteImageIds) ? deleteImageIds : [];

        // Handle deleting the legacy (pre-gallery) single image, which has no
        // real ProductImage row of its own.
        if (deleteIds.includes('legacy') && product.image_url) {
            deleteUploadedImage(product.image_url);
        }

        // Migrate a legacy single image into a real ProductImage row so it
        // isn't silently dropped once the gallery starts being used, unless
        // the admin explicitly deleted it above.
        let existingImages = await ProductImage.getByProductId(product_id);
        if (existingImages.length === 0 && product.image_url && !deleteIds.includes('legacy')) {
            await ProductImage.create(product_id, product.image_url, { isPrimary: true, displayOrder: 0 });
            existingImages = await ProductImage.getByProductId(product_id);
        }

        // Delete any images the admin removed
        const numericDeleteIds = deleteIds.filter((id) => id !== 'legacy');
        for (const imageId of numericDeleteIds) {
            const img = await ProductImage.findById(imageId);
            if (img && String(img.product_id) === String(product_id)) {
                await ProductImage.delete(imageId);
                deleteUploadedImage(img.image_url);
            }
        }

        // Add any newly-uploaded images, appended after existing ones
        const newImageIds = [];
        if (Array.isArray(newImages) && newImages.length > 0) {
            let nextOrder = (await ProductImage.getMaxDisplayOrder(product_id)) + 1;
            for (const dataUrl of newImages) {
                let url;
                try {
                    url = saveBase64Image(dataUrl);
                } catch (uploadError) {
                    return res.status(400).json({ success: false, message: uploadError.message });
                }
                if (!url) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid image file. Please upload a JPG, PNG, GIF, or WEBP image.'
                    });
                }
                const imageId = await ProductImage.create(product_id, url, { displayOrder: nextOrder++ });
                newImageIds.push(imageId);
            }
        }

        // Update which image is primary, if requested
        if (primaryImageId) {
            await ProductImage.setPrimary(primaryImageId, product_id);
        } else if (typeof primaryNewImageIndex === 'number' && newImageIds[primaryNewImageIndex]) {
            await ProductImage.setPrimary(newImageIds[primaryNewImageIndex], product_id);
        }

        // Keep Product.image_url in sync with whichever image ends up primary,
        // but only touch it when something about the images actually changed.
        const imagesChanged = numericDeleteIds.length > 0
            || deleteIds.includes('legacy')
            || newImageIds.length > 0
            || !!primaryImageId
            || typeof primaryNewImageIndex === 'number';

        if (imagesChanged) {
            const finalImages = await ProductImage.getByProductId(product_id);
            updateData.image_url = finalImages[0]?.image_url || null;
        }

        const result = await Product.update(product_id, updateData);
        if (!result) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        res.status(200).json({ success: true, message: 'Product updated' });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// DELETE /api/products/:id  (admin only)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const images = await ProductImage.getByProductId(req.params.id);

        // Drop this product from every cart it's sitting in first. A cart line
        // for a product that's about to stop existing is meaningless, and
        // would otherwise block the delete via the Cart -> Product foreign key.
        await Cart.removeByProduct(req.params.id);

        // ProductImage rows cascade-delete via the FK, but we still need to
        // remove the actual files from disk.
        await Product.delete(req.params.id);
        images.forEach((img) => deleteUploadedImage(img.image_url));

        // Safety net for legacy products that never got a ProductImage row
        if (product.image_url && !images.some((img) => img.image_url === product.image_url)) {
            deleteUploadedImage(product.image_url);
        }

        res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);

        // A product that has already been part of an order is referenced by
        // OrderItems. Until the migration in server/migrations/001_allow_product_delete.sql
        // has been run, that foreign key still blocks the delete -- surface
        // that clearly instead of a generic 500 so it's obvious what to do.
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                success: false,
                message: 'This product is part of one or more existing orders, so it can\'t be deleted yet. Run the database migration in server/migrations/001_allow_product_delete.sql, then try again.'
            });
        }

        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};