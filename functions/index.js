/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.

// import "dotenv/config"
import { onRequest } from "firebase-functions/v2/https"
// import { logger } from "firebase-functions"
import admin from "firebase-admin"
import Razorpay from "razorpay"
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js"

admin.initializeApp()

const key_id = "rzp_test_uGhG8zcJwEt2zs"
const key_secret = "vJ7BT16aWtsjWy3AnxEWJICP"

// Create a new instance of Razorpay
const razorpayInstance = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
})

// Define your CORS configuration object
const corsConfig = {
  "Access-Control-Allow-Origin": "*", // Optional: Adjust according to your needs
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "3600", // Optional: Adjust according to your needs
}

// Helper function to apply CORS headers to the response
function applyCorsHeaders(res) {
  Object.keys(corsConfig).forEach((header) => {
    res.set(header, corsConfig[header])
  })
}

// // Example usage in a Cloud Function
// export const helloWorld = onRequest((req, res) => {
//   // Apply CORS headers
//   applyCorsHeaders(res)

//   // Handle preflight OPTIONS request
//   if (req.method === "OPTIONS") {
//     res.status(204).send("")
//     return
//   }

//   // Handle actual request
//   logger.info("Hello logs!", { structuredData: true })
//   res.json("Hello from Firebase!")
// })

export const createOrder = onRequest(async (req, res) => {
  try {
    // Apply CORS headers
    applyCorsHeaders(res)

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed!` })
    }

    //handle the post request
    const { amount, receipt } = req.body

    const options = {
      amount: amount * 100, // Amount in paise
      receipt: receipt,
      // Set currency to "INR" by default
      currency: "INR",
      // Set payment_capture to 0 if you want to capture later
      payment_capture: 1,
    }

    const order = await razorpayInstance.orders.create(options)

    res.status(200).send(order)
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    res.status(500).json({ error: "Failed to create order" })
  }
})

export const verifyPayment = onRequest(async (req, res) => {
  try {
    // Apply CORS headers
    applyCorsHeaders(res)

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed!` })
    }

    //handle the post request
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    const generatedSignature = validatePaymentVerification(
      { order_id: razorpayOrderId, payment_id: razorpayPaymentId },
      razorpaySignature,
      key_secret
    )

    if (generatedSignature === true) {
      // Payment is verified
      res.status(200).send({ message: "Payment verified" })
    } else {
      // Payment verification failed
      res.status(400).send({ error: "Payment verification failed" })
    }
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error)
    res.status(500).json({ error: "Failed to verify payment" })
  }
})

// export const capturePayment = onRequest(async (req, res) => {
//   try {
//     // Apply CORS headers
//     applyCorsHeaders(res)

//     // Handle preflight OPTIONS request
//     if (req.method === "OPTIONS") {
//       res.status(204).send("")
//       return
//     }

//     if (req.method !== "POST") {
//       return res
//         .status(405)
//         .json({ error: `Method ${req.method} Not Allowed!` })
//     }

//     //handle the post request
//     const { razorpay_payment_id, amount, currency } = req.body

//     const payment = await razorpayInstance.payments.capture(
//       razorpay_payment_id,
//       {
//         amount: amount * 100, // Amount to capture in paise
//         currency: currency,
//       }
//     )

//     res.status(200).send(payment)
//   } catch (error) {
//     console.error("Error capturing Razorpay payment:", error)
//     res.status(500).json({ error: "Failed to capture payment" })
//   }
// })
