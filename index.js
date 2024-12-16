const express = require("express")
const app = express()
const Razorpay = require('razorpay');
const crypto = require('crypto');
const bodyParser = require('body-parser');
require("dotenv").config()
const port = process.env.PORT || 5000

const { connectDb } = require("./utilityFunction/connectDb")
const { serverStabilityChecker } = require("./utilityFunction/serverStabilityChecker")
const { serverListener } = require("./utilityFunction/serverListener")
const { finalErrorHandler } = require("./utilityFunction/finalErrorHandler")
const { applicationMiddleware } = require("./middleware/applicationMiddleware")
const { routeHandlingMiddleware } = require("./middleware/routeHandlingMiddleware")


// Razorpay payment integration--------------------------------------
const instance = new Razorpay({
    key_id: 'rzp_test_9utBHx11kNXM5B', // Replace with your key_id
    key_secret: 't1IdSHtpLM44yNPzpfDGIHD3', // Replace with your key_secret
});

app.use(bodyParser.json());


app.post("/an", async (req, res) => {
    try {
        const { name } = req.body
        console.log("---------------------->", name)
        res.json({ message: " Working", name })
    } catch (error) {
        res.json({ message: '121' })
    }
})


// Payment order 
app.post("/createOrder", async (req, res) => {
    const { amount, currency } = req.body 
    
    try {
        const options = {
            amount: amount * 100, // Amount in paise
            currency: currency || "INR",
            receipt: "receipt_order_" + Math.random(),
        };
        const order = await instance.orders.create(options);
        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Something went wrong" });
    }
});

// Payment verification এন্ডপয়েন্ট
app.post("/verify-payment", (req, res) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const shasum = crypto.createHmac("sha256", "t1IdSHtpLM44yNPzpfDGIHD3");
    shasum.update(razorpay_order_id + "|" + razorpay_payment_id);
    const digest = shasum.digest("hex");

    if (digest === razorpay_signature) {
        res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
});


app.post("/initiate-refund", async (req, res) => {
    const { payment_id, amount } = req.body;

    try {
        const refund = await instance.payments.refund(payment_id, {
            amount: amount * 100, // Amount in paise
        });

        res.status(200).json({ success: true, refund });
    } catch (error) {
        console.error("Refund Error:", error);
        res.status(500).json({ success: false, message: "Failed to process refund" });
    }
});

// =====================================================================

// middleware
applicationMiddleware(app) // application middleware
routeHandlingMiddleware(app) // routehandler middleware

// connect to the database
connectDb()

// Final error handler 
finalErrorHandler(app)

// check if the server is running or not
serverStabilityChecker(app)
serverListener(app, port)



