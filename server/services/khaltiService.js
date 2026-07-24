const fetch = require("node-fetch");

const BASE_URL =
  process.env.KHALTI_BASE_URL || "https://dev.khalti.com/api/v2";

const SECRET_KEY = process.env.KHALTI_SECRET_KEY;

function headers() {
  if (!SECRET_KEY) {
    throw new Error("KHALTI_SECRET_KEY is missing.");
  }

  return {
    Authorization: `Key ${SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

// Initiate Payment
async function initiatePayment(order) {
  const response = await fetch(`${BASE_URL}/epayment/initiate/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      return_url: "http://localhost:5173/payment-success",
      website_url: "http://localhost:5173",

      amount: Math.round(Number(order.total_amount) * 100),

      purchase_order_id: String(order.order_id),

      purchase_order_name: `Pet Paw Order #${order.order_id}`,

      customer_info: {
        name: "Customer",
        email: "customer@example.com",
        phone: "9800000000",
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.log(data);
    throw new Error(data.detail || "Khalti initiation failed.");
  }

  return data;
}

// Verify Payment
async function verifyPayment(pidx) {
  const response = await fetch(`${BASE_URL}/epayment/lookup/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      pidx,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.log(data);
    throw new Error(data.detail || "Verification failed.");
  }

  return data;
}

module.exports = {
  initiatePayment,
  verifyPayment,
};