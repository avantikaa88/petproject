const express = require("express");

const router = express.Router();

const paymentController = require("../controllers/paymentController");

const { protect } = require("../middleware/auth");

router.post(
  "/initiate",
  protect,
  paymentController.initiateKhalti
);

router.post(
  "/verify",
  protect,
  paymentController.verifyKhalti
);

module.exports = router;