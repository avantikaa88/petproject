const { pool } = require("../config/db");

class Order {

    // Create Order
    static async create(user_id, items, shipping_address, payment_method = "cod") {

        const connection = await pool.getConnection();

        try {

            await connection.beginTransaction();

            const total_amount = items.reduce(
                (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
                0
            );

            // COD is a firm commitment the moment it's placed, so it goes
            // straight to "processing". Khalti orders stay "pending" until
            // verifyKhalti confirms payment and advances them itself.
            const initialStatus = payment_method === "cod" ? "processing" : "pending";

            // Create Order
            const [orderResult] = await connection.execute(
                `INSERT INTO Orders
                (
                    user_id,
                    total_amount,
                    shipping_address,
                    payment_method,
                    payment_status,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    user_id,
                    total_amount,
                    shipping_address || null,
                    payment_method,
                    "pending",
                    initialStatus
                ]
            );

            const order_id = orderResult.insertId;

            // Insert Order Items
            for (const item of items) {

                // Reduce Product Stock
                const [stockResult] = await connection.execute(
                    `UPDATE Product
                     SET stock = stock - ?
                     WHERE product_id = ?
                     AND stock >= ?`,
                    [
                        item.quantity,
                        item.product_id,
                        item.quantity
                    ]
                );

                if (stockResult.affectedRows === 0) {
                    throw new Error(
                        `Not enough stock for product ID ${item.product_id}`
                    );
                }

                await connection.execute(
                    `INSERT INTO OrderItems
                    (
                        order_id,
                        product_id,
                        quantity,
                        price
                    )
                    VALUES (?, ?, ?, ?)`,
                    [
                        order_id,
                        item.product_id,
                        item.quantity,
                        item.price
                    ]
                );
            }

            await connection.commit();

            return {
                order_id,
                total_amount
            };

        } catch (err) {

            await connection.rollback();
            throw err;

        } finally {

            connection.release();

        }

    }

    // User Orders
    static async getByUser(user_id) {

        const [orders] = await pool.execute(
            `SELECT *
             FROM Orders
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [user_id]
        );

        if (orders.length === 0) return [];

        const orderIds = orders.map(order => order.order_id);

        const [items] = await pool.query(
            `SELECT
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.price,
                p.name,
                p.image_url
            FROM OrderItems oi
            JOIN Product p
                ON oi.product_id = p.product_id
            WHERE oi.order_id IN (?)`,
            [orderIds]
        );

        const itemsByOrder = {};

        items.forEach(item => {

            if (!itemsByOrder[item.order_id]) {
                itemsByOrder[item.order_id] = [];
            }

            itemsByOrder[item.order_id].push(item);

        });

        return orders.map(order => ({

            ...order,

            item_count:
                (itemsByOrder[order.order_id] || []).length,

            preview_images:
                (itemsByOrder[order.order_id] || [])
                    .map(item => item.image_url)
                    .filter(Boolean)
                    .slice(0, 3)

        }));

    }

    // Find Single Order
    static async findById(order_id) {

        const [orderRows] = await pool.execute(
            `SELECT *
             FROM Orders
             WHERE order_id = ?`,
            [order_id]
        );

        if (orderRows.length === 0)
            return null;

        const order = orderRows[0];

        const [items] = await pool.execute(
            `SELECT
                oi.*,
                p.name,
                p.image_url
            FROM OrderItems oi
            JOIN Product p
                ON oi.product_id = p.product_id
            WHERE oi.order_id = ?`,
            [order_id]
        );

        order.items = items;

        return order;

    }

    // Admin Orders
    static async getAll() {

        const [orders] = await pool.execute(
            `SELECT
                o.*,
                u.full_name,
                u.email
            FROM Orders o
            JOIN User u
                ON o.user_id = u.user_id
            ORDER BY o.created_at DESC`
        );

        if (orders.length === 0) return [];

        const orderIds = orders.map(order => order.order_id);

        const [items] = await pool.query(
            `SELECT
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.price,
                p.name,
                p.image_url
            FROM OrderItems oi
            JOIN Product p
                ON oi.product_id = p.product_id
            WHERE oi.order_id IN (?)`,
            [orderIds]
        );

        const itemsByOrder = {};

        items.forEach(item => {

            if (!itemsByOrder[item.order_id]) {
                itemsByOrder[item.order_id] = [];
            }

            itemsByOrder[item.order_id].push(item);

        });

        return orders.map(order => ({

            ...order,

            items: itemsByOrder[order.order_id] || []

        }));

    }

    // Update Order Status
    static async updateStatus(order_id, status) {

        // COD is paid in cash at the door, so delivering the order is what
        // actually confirms payment -- flip payment_status to "paid" at
        // that moment. Khalti orders are already "paid" by the time they
        // can move through shipped/delivered, so this is a harmless no-op
        // for them (ELSE branch just keeps the existing payment_status).
        //
        // The WHERE clause also guards against updating an order that is
        // already "delivered" -- this is a second line of defense in case
        // the check in the controller is ever bypassed, so a delivered
        // order can never be moved to a different status.
        const [result] = await pool.execute(
            `UPDATE Orders
             SET
                status = ?,
                payment_status = CASE
                    WHEN ? = 'delivered' AND payment_method = 'cod' THEN 'paid'
                    ELSE payment_status
                END
             WHERE order_id = ?
             AND status != 'delivered'`,
            [status, status, order_id]
        );

        return result;

    }

}

module.exports = Order;