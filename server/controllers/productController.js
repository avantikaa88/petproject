const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Cart = require('../models/Cart');
const { saveBase64Image, deleteUploadedImage } = require('../utils/imageUpload');


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

// GET /api/products/admin/all  (admin only)
// Same as getProducts, but includes soft-deleted products so the admin
// panel can list them (and offer a restore option).
exports.getProductsForAdmin = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search } = req.query;
        const products = await Product.getAll({
            category, minPrice, maxPrice, search,
            includeDeleted: true,
        });
        res.status(200).json({ success: true, count: products.length, products });
    } catch (error) {
        console.error('Get products (admin) error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};


exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let images = await ProductImage.getByProductId(req.params.id);

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
            image_url: savedUrls[primary], 
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

    
        
        delete updateData.image_url;

        const deleteIds = Array.isArray(deleteImageIds) ? deleteImageIds : [];

        if (deleteIds.includes('legacy') && product.image_url) {
            deleteUploadedImage(product.image_url);
        }


        let existingImages = await ProductImage.getByProductId(product_id);
        if (existingImages.length === 0 && product.image_url && !deleteIds.includes('legacy')) {
            await ProductImage.create(product_id, product.image_url, { isPrimary: true, displayOrder: 0 });
            existingImages = await ProductImage.getByProductId(product_id);
        }


        const numericDeleteIds = deleteIds.filter((id) => id !== 'legacy');
        for (const imageId of numericDeleteIds) {
            const img = await ProductImage.findById(imageId);
            if (img && String(img.product_id) === String(product_id)) {
                await ProductImage.delete(imageId);
                deleteUploadedImage(img.image_url);
            }
        }

       
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

     
        if (primaryImageId) {
            await ProductImage.setPrimary(primaryImageId, product_id);
        } else if (typeof primaryNewImageIndex === 'number' && newImageIds[primaryNewImageIndex]) {
            await ProductImage.setPrimary(newImageIds[primaryNewImageIndex], product_id);
        }

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

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

       
        await Cart.removeByProduct(req.params.id);

        
        await Product.delete(req.params.id);

        res.status(200).json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PATCH /api/products/:id/restore  (admin only)
// Un-deletes a soft-deleted product. Its row, image_url, and ProductImage
// rows were never touched by the delete, so this just makes it visible
// again everywhere (shop, product detail, admin list) -- past orders
// already showed its image the whole time.
exports.restoreProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id, { includeDeleted: true });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!product.is_deleted) {
            return res.status(400).json({ success: false, message: 'Product is not deleted' });
        }

        await Product.restore(req.params.id);

        res.status(200).json({ success: true, message: 'Product restored' });
    } catch (error) {
        console.error('Restore product error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};