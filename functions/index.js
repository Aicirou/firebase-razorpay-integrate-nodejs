/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.

import "dotenv/config"
import https from "firebase-functions/v2/https"
import { logger } from "firebase-functions"
import admin from "firebase-admin"
import Razorpay from "razorpay"

admin.initializeApp()

const key_id = process.env.RAZORPAY_KEY_ID
const key_secret = process.env.RAZORPAY_KEY_SECRET
console.log(key_id, key_secret)

// Create a new instance of Razorpay
const razorpayInstance = new Razorpay({
  key_id: "process.env.RAZORPAY_KEY_ID",
  key_secret: "process.env.RAZORPAY_KEY_SECRET",
})

export const helloWorld = https.onRequest((req, res) => {
  logger.info("Hello logs!", { structuredData: true })
  res.send("Hello from Firebase!")
})

export const createOrder = https.onRequest(async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body

    const options = {
      amount: amount * 100, // Amount in paise
      currency: currency,
      receipt: receipt,
      // Set payment_capture to 0 if you want to capture later
      payment_capture: 0,
    }

    const order = await razorpayInstance.orders.create(options)
    console.log("Order:", order)

    res.status(200).send(order)
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    res.status(500).send({ error: "Failed to create order" })
  }
})

export const verifyPayment = https.onRequest(async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body

    const generatedSignature = razorpayInstance.utils.generateSignature(
      {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
      "YOUR_RAZORPAY_KEY_SECRET"
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
    res.status(500).send({ error: "Failed to verify payment" })
  }
})

export const capturePayment = https.onRequest(async (req, res) => {
  try {
    const { razorpay_payment_id } = req.body

    const payment = await razorpayInstance.payments.capture(
      razorpay_payment_id,
      {
        amount: 100, // Amount to capture in paise
      }
    )

    res.status(200).send(payment)
  } catch (error) {
    console.error("Error capturing Razorpay payment:", error)
    res.status(500).send({ error: "Failed to capture payment" })
  }
})
