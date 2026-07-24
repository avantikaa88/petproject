const Order = require("../models/Order");
const Cart = require("../models/Cart");

// Create Order
exports.createOrder = async (req, res) => {
    try {

        const {
            shipping_address,
            payment_method = "cod"
        } = req.body;

        console.log("========== ORDER ==========");
        console.log(req.body);
        console.log("Payment Method:", payment_method);
        console.log("===========================");

        // Accept only COD or Khalti
        if (payment_method !== "cod" && payment_method !== "khalti") {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        const cartItems = await Cart.getByUser(req.user.userId);

        if (cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty"
            });
        }

        // Cart items can go stale between being added and checkout (stock
        // sold to someone else, or an admin adjustment). Catch that here
        // with a clear, per-item message instead of a generic 500 from the
        // transaction below.
        const insufficient = cartItems.filter(
            item => Number(item.quantity) > Number(item.stock)
        );
        if (insufficient.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Some items in your cart are no longer available in that quantity.",
                insufficient_items: insufficient.map(item => ({
                    product_id: item.product_id,
                    name: item.name,
                    requested: item.quantity,
                    available: Number(item.stock)
                }))
            });
        }

        const items = cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price
        }));

        const order = await Order.create(
            req.user.userId,
            items,
            shipping_address,
            payment_method
        );

        // The moment an order row exists, stock has already been reserved
        // for those items (see Order.create) -- they're "placed", not just
        // "in the cart" anymore, regardless of whether payment (Khalti)
        // still needs to be confirmed. Clear the cart right away so those
        // items can never show up in the cart again, even if the user
        // abandons the Khalti payment step.
        await Cart.clearCart(req.user.userId);

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order_id: order.order_id,
            total_amount: order.total_amount,
            payment_method
        });

    } catch (error) {

        console.error("Create Order Error:", error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// User Orders
exports.getMyOrders = async (req, res) => {

    try {

        const orders = await Order.getByUser(req.user.userId);

        res.json({
            success: true,
            orders
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// Single Order
exports.getOrderById = async (req, res) => {

    try {

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (
            order.user_id !== req.user.userId &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// Admin Orders
exports.getAllOrders = async (req, res) => {

    try {

        const orders = await Order.getAll();

        res.json({
            success: true,
            orders
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// Update Status
exports.updateOrderStatus = async (req, res) => {

    try {

        const { status } = req.body;

        const validStatuses = [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status"
            });
        }

        const existingOrder = await Order.findById(req.params.id);

        if (!existingOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Delivered is a final state -- once an order has been marked
        // delivered it must never be moved to any other status (no undo).
        if (existingOrder.status === "delivered") {
            return res.status(400).json({
                success: false,
                message: "This order has already been delivered and its status can no longer be changed"
            });
        }

        await Order.updateStatus(req.params.id, status);

        const order = await Order.findById(req.params.id);

        res.json({
            success: true,
            message: "Order status updated",
            status: order?.status,
            payment_status: order?.payment_status
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};