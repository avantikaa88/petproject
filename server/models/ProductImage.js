const { pool } = require('../config/db');

class ProductImage {
    // All images for a product, primary first, then by display_order
    static async getByProductId(product_id) {
        const query = `
            SELECT image_id, product_id, image_url, is_primary, display_order, created_at
            FROM ProductImage
            WHERE product_id = ?
            ORDER BY is_primary DESC, display_order ASC, image_id ASC
        `;
        const [rows] = await pool.execute(query, [product_id]);
        return rows;
    }

    // Insert one image row. If isPrimary is true, any existing primary is demoted first.
    static async create(product_id, image_url, { isPrimary = false, displayOrder = 0 } = {}) {
        if (isPrimary) {
            await ProductImage.clearPrimary(product_id);
        }
        const query = `
            INSERT INTO ProductImage (product_id, image_url, is_primary, display_order)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [
            product_id, image_url, isPrimary ? 1 : 0, displayOrder
        ]);
        return result.insertId;
    }

    // Unset is_primary on every image for a product
    static async clearPrimary(product_id) {
        await pool.execute('UPDATE ProductImage SET is_primary = 0 WHERE product_id = ?', [product_id]);
    }

    // Make one image the primary one for its product
    static async setPrimary(image_id, product_id) {
        await ProductImage.clearPrimary(product_id);
        const query = 'UPDATE ProductImage SET is_primary = 1 WHERE image_id = ? AND product_id = ?';
        const [result] = await pool.execute(query, [image_id, product_id]);
        return result;
    }

    // Single image row (used to grab its image_url before deleting the file)
    static async findById(image_id) {
        const [rows] = await pool.execute('SELECT * FROM ProductImage WHERE image_id = ?', [image_id]);
        return rows[0] || null;
    }

    static async delete(image_id) {
        const [result] = await pool.execute('DELETE FROM ProductImage WHERE image_id = ?', [image_id]);
        return result;
    }

    // Used when the product itself is deleted (DB also cascades this via FK,
    // but we call it explicitly so we get the rows back for file cleanup first)
    static async deleteByProductId(product_id) {
        const [result] = await pool.execute('DELETE FROM ProductImage WHERE product_id = ?', [product_id]);
        return result;
    }

    // Highest display_order in use, so new images can be appended after it
    static async getMaxDisplayOrder(product_id) {
        const [rows] = await pool.execute(
            'SELECT MAX(display_order) AS maxOrder FROM ProductImage WHERE product_id = ?',
            [product_id]
        );
        return rows[0]?.maxOrder ?? -1;
    }
}

module.exports = ProductImage;