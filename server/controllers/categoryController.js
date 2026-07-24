const Category = require('../models/Category');
const Product = require('../models/Product');

// GET /api/categories  (public) - list all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.getAll();
        res.status(200).json({ success: true, count: categories.length, categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// GET /api/categories/:id  (public)
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// POST /api/categories  (admin only)
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const existing = await Category.findByName(name.trim());
        if (existing) {
            return res.status(409).json({ success: false, message: 'A category with this name already exists' });
        }

        const category_id = await Category.create({ name: name.trim(), description });
        res.status(201).json({ success: true, message: 'Category created', category_id });
    } catch (error) {
        console.error('Create category error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A category with this name already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// PUT /api/categories/:id  (admin only)
exports.updateCategory = async (req, res) => {
    try {
        const category_id = req.params.id;
        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const { name, description } = req.body;

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ success: false, message: 'Category name cannot be empty' });
            }
            const existing = await Category.findByName(name.trim());
            if (existing && String(existing.category_id) !== String(category_id)) {
                return res.status(409).json({ success: false, message: 'A category with this name already exists' });
            }
        }

        const result = await Category.update(category_id, {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(description !== undefined ? { description } : {}),
        });

        if (!result) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        res.status(200).json({ success: true, message: 'Category updated' });
    } catch (error) {
        console.error('Update category error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'A category with this name already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// DELETE /api/categories/:id  (admin only)
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Product.category is stored as free text (matching the category name),
        // so warn the admin instead of silently orphaning existing products.
        const productsUsingIt = await Product.getAll({ category: category.name });
        if (productsUsingIt.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Cannot delete "${category.name}" - it is currently used by ${productsUsingIt.length} product(s). Reassign those products to a different category first.`
            });
        }

        await Category.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};