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
import { logger } from "firebase-functions"
import admin from "firebase-admin"
import Razorpay from "razorpay"

admin.initializeApp()

// Create a new instance of Razorpay
const razorpayInstance = new Razorpay({
  key_id: "rzp_test_uGhG8zcJwEt2zs",
  key_secret: "vJ7BT16aWtsjWy3AnxEWJICP",
})

export const helloWorld = onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true })
  res.json("Hello from Firebase!")
})

export const createOrder = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed!` })
    }
    const { amount, currency, receipt } = req.body

    const options = {
      amount: amount * 100, // Amount in paise
      currency: currency,
      receipt: receipt,
      // Set payment_capture to 0 if you want to capture later
      payment_capture: 0,
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
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed!` })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body

    const generatedSignature = razorpayInstance.utils.generateSignature(
      {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      "vJ7BT16aWtsjWy3AnxEWJICP"
    )

    if (generatedSignature === razorpay_signature) {
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

export const capturePayment = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed!` })
    }

    const { razorpay_payment_id, amount, currency } = req.body

    const payment = await razorpayInstance.payments.capture(
      razorpay_payment_id,
      {
        amount: amount * 100, // Amount to capture in paise
        currency: currency,
      }
    )

    res.status(200).send(payment)
  } catch (error) {
    console.error("Error capturing Razorpay payment:", error)
    res.status(500).json({ error: "Failed to capture payment" })
  }
})
