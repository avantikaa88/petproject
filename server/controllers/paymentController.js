const { pool } = require("../config/db");
const Order = require("../models/Order");
const {
  initiatePayment,
  verifyPayment,
} = require("../services/khaltiService");

// POST /api/payment/initiate
exports.initiateKhalti = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(order_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const khalti = await initiatePayment(order);

    await pool.execute(
      `INSERT INTO Payments
      (order_id,pidx,amount,payment_status)
      VALUES(?,?,?,'pending')`,
      [
        order.order_id,
        khalti.pidx,
        order.total_amount
      ]
    );

    res.json({
      success: true,
      payment_url: khalti.payment_url,
      pidx: khalti.pidx,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};

// POST /api/payment/verify
exports.verifyKhalti = async (req, res) => {

  try {

    const { pidx } = req.body;

    const result = await verifyPayment(pidx);

    if (result.status !== "Completed") {

      return res.status(400).json({
        success:false,
        message:"Payment not completed."
      });

    }

    const [payment] = await pool.execute(
      "SELECT * FROM Payments WHERE pidx=?",
      [pidx]
    );

    if(payment.length===0){

      return res.status(404).json({
        success:false,
        message:"Payment not found"
      });

    }

    const pay=payment[0];

    await pool.execute(
      `UPDATE Payments
       SET
       payment_status='paid',
       transaction_id=?
       WHERE pidx=?`,
      [
        result.transaction_id,
        pidx
      ]
    );

    // Payment confirmed: mark the order paid and move it out of "pending"
    // into "processing" so staff know it's ready to be fulfilled. Only
    // advance orders that are still pending, so this can't clobber a status
    // an admin already moved forward (e.g. re-verifying an old pidx).
    await pool.execute(
      `UPDATE Orders
       SET
       payment_status='paid',
       payment_method='khalti',
       status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
       WHERE order_id=?`,
      [
        pay.order_id
      ]
    );

    res.json({
      success:true,
      message:"Payment Verified"
    });

  } catch(err){

    console.log(err);

    res.status(500).json({
      success:false,
      message:err.message
    });

  }

};