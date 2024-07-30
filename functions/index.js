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
import { get } from "https"
import axios from "axios"

admin.initializeApp()

const key_id = "rzp_test_uGhG8zcJwEt2zs"
const key_secret = "vJ7BT16aWtsjWy3AnxEWJICP"

// Create a new instance of Razorpay
const razorpayInstance = new Razorpay({
  key_id: key_id,
  key_secret: key_secret,
})

//wati.io API to send template messages
const sendTemplateMessagesAPI =
  "https://live-mt-server.wati.io/311385/api/v2/sendTemplateMessages"

// Define your CORS configuration object
const corsConfig = {
  "Access-Control-Allow-Origin": "*", // Optional: Adjust according to your needs
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, authkey",
  "Access-Control-Max-Age": "3600", // Optional: Adjust according to your needs
}

// headers for the request
const headers = {
  "Content-Type": "application/json",
  Authorization:
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNDkwNmJjNi01YzE0LTRiZDEtOWIxMi1kZjY4NjQzYjhmYWQiLCJ1bmlxdWVfbmFtZSI6ImFqYXkubWVlbmFAc2VuZGZhc3QuaW4iLCJuYW1laWQiOiJhamF5Lm1lZW5hQHNlbmRmYXN0LmluIiwiZW1haWwiOiJhamF5Lm1lZW5hQHNlbmRmYXN0LmluIiwiYXV0aF90aW1lIjoiMDcvMTkvMjAyNCAxMjoxMzozMyIsImRiX25hbWUiOiJtdC1wcm9kLVRlbmFudHMiLCJ0ZW5hbnRfaWQiOiIzMTEzODUiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBRE1JTklTVFJBVE9SIiwiZXhwIjoyNTM0MDIzMDA4MDAsImlzcyI6IkNsYXJlX0FJIiwiYXVkIjoiQ2xhcmVfQUkifQ.FJuOy3GDl2f9tFq5hOKh9E2lv_UjimwnE_FXOMiLGPE",
}

// Helper function to apply CORS headers to the response
function applyCorsHeaders(res) {
  Object.keys(corsConfig).forEach((header) => {
    res.set(header, corsConfig[header])
  })
}

// Function to expand receivers
function expandReceivers(receivers) {
  return receivers.flatMap((receiver) => {
    const numbers = Array.isArray(receiver.whatsappNumber)
      ? receiver.whatsappNumber
      : [receiver.whatsappNumber]

    return numbers.map((number) => ({
      whatsappNumber: number,
      customParams: receiver.customParams,
    }))
  })
}

// Function to convert a file URL to an attachment object
async function fileUrlToAttachment(fileUrl) {
  return new Promise((resolve, reject) => {
    get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch file: ${response.statusCode}`))
        return
      }

      const chunks = []
      response.on("data", (chunk) => chunks.push(chunk))
      response.on("end", () => {
        const buffer = Buffer.concat(chunks)
        const base64 = buffer.toString("base64")
        const mimeType =
          response.headers["content-type"] || "application/octet-stream"
        const dataURI = `data:${mimeType};base64,${base64}`

        // Decode the URL and extract the filename
        const decodedUrl = decodeURIComponent(fileUrl)
        const fileName = decodedUrl.split("/").pop().split("?")[0]

        // Create and resolve with the attachment object
        const attachment = {
          file: dataURI,
          fileName: fileName,
        }
        resolve(attachment)
      })
    }).on("error", reject)
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

export const notifyTripConfirmation = onRequest(async (req, res) => {
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
    const { userTripDetails, adminTripDetails } = req.body

    if (!userTripDetails || !adminTripDetails) {
      return res.status(405).json({ error: "Please provide the tripDetails!" })
    }

    //notify the user
    const userData = {
      template_name: userTripDetails.template_name ?? "",
      broadcast_name: userTripDetails.broadcast_name ?? "",
      receivers: expandReceivers(userTripDetails.receivers).map((receiver) => ({
        whatsappNumber: receiver.whatsappNumber,
        customParams: receiver.customParams.map((param) => ({
          name: Object.keys(param)[0],
          value: Object.values(param)[0],
        })),
      })),
    }

    //notify the admin
    const adminData = {
      template_name: adminTripDetails.template_name ?? "",
      broadcast_name: adminTripDetails.broadcast_name ?? "",
      receivers: expandReceivers(adminTripDetails.receivers).map(
        (receiver) => ({
          whatsappNumber: receiver.whatsappNumber,
          customParams: receiver.customParams.map((param) => ({
            name: Object.keys(param)[0],
            value: Object.values(param)[0],
          })),
        })
      ),
    }

    const userNotification = axios.post(
      sendTemplateMessagesAPI,
      { ...userData },
      { headers }
    )

    const adminNotification = axios.post(
      sendTemplateMessagesAPI,
      { ...adminData },
      { headers }
    )

    const [userResponse, adminResponse] = await Promise.all([
      userNotification,
      adminNotification,
    ])

    //check if userResponse and adminResponse are failed
    if (!userResponse.data.result || !adminResponse.data.result) {
      return res.status(500).json({
        message: "Failed to send trip confirmation notifications",
        userNotification: userResponse.data,
        adminNotification: adminResponse.data,
      })
    }

    res.status(200).json({
      message: "Trip confirmation notifications sent successfully",
      userNotification: userResponse.data,
      adminNotification: adminResponse.data,
    })
  } catch (error) {
    console.error("Error sending trip confirmation notification:", error)
    res
      .status(500)
      .json({ error: "Failed to send trip confirmation notification" })
  }
})

export const notifyBookingDetails = onRequest(async (req, res) => {
  //template_name: ["share_driverdetails_to_user", "share_details_to_driver]
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
    const { userBookingDetails, driverBookingDetails } = req.body

    if (!userBookingDetails || !driverBookingDetails) {
      return res
        .status(405)
        .json({ error: "Please provide the bookingDetails!" })
    }

    //notify the user
    const userData = {
      template_name: userBookingDetails.template_name ?? "",
      broadcast_name: userBookingDetails.broadcast_name ?? "",
      receivers: expandReceivers(userBookingDetails.receivers).map(
        (receiver) => ({
          whatsappNumber: receiver.whatsappNumber,
          customParams: receiver.customParams.map((param) => ({
            name: Object.keys(param)[0],
            value: Object.values(param)[0],
          })),
        })
      ),
    }

    //notify the driver
    const driverData = {
      template_name: driverBookingDetails.template_name ?? "",
      broadcast_name: driverBookingDetails.broadcast_name ?? "",
      parameters: driverBookingDetails.parameters.map((param) => ({
        name: Object.keys(param)[0],
        value: Object.values(param)[0],
      })),
    }

    const userNotification = axios.post(
      sendTemplateMessagesAPI,
      {
        ...userData,
      },
      {
        headers,
      }
    )

    const driverNotification = axios.post(
      sendTemplateMessagesAPI.slice(0, -1),
      {
        ...driverData,
      },
      {
        headers,
        params: { whatsappNumber: driverBookingDetails.waId ?? "" },
      }
    )

    const [userResponse, driverResponse] = await Promise.all([
      userNotification,
      driverNotification,
    ])

    //check if userResponse and driverResponse are failed
    if (!userResponse.data.result || !driverResponse.data.result) {
      return res.status(500).json({
        message: "Failed to send booking details notifications",
        userNotification: userResponse.data,
        driverNotification: driverResponse.data,
      })
    }

    res.status(200).json({
      message: "Booking details notifications sent successfully",
      userNotification: userResponse.data,
      driverNotification: driverResponse.data,
    })
  } catch (error) {
    console.error("Error sending booking details notification:", error)
    res
      .status(500)
      .json({ error: "Failed to send booking details notification" })
  }
})

export const notifyInvoiceCreation = onRequest(async (req, res) => {
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
    const {
      template_id,
      name,
      email,
      booking_id,
      booking_date,
      pickup_location,
      dropoff_location,
      pickup_time,
      trip_amount,
      fileUrl,
    } = req.body

    //payload for sending email
    const payload = {
      recipients: [
        {
          to: [{ name: name, email: email }],
          variables: {
            VAR1: name,
            VAR2: booking_id,
            VAR3: booking_date,
            VAR4: pickup_location,
            VAR5: dropoff_location,
            VAR6: pickup_time,
            VAR7: trip_amount,
          },
        },
      ],
      from: { name: "Trip Invoice - Teksi", email: "noreply@teksi.in" },
      domain: "teksi.in",
      template_id: template_id ?? "",
    }

    //convert fileUrl to attachment, if provided and push it to the payload
    await fileUrlToAttachment(fileUrl)
      .then((attachment) => {
        console.log("Attachment ready:", attachment)
        // Now you can use this attachment in your email sending code
        if (attachment) {
          payload.attachments = [attachment]
        }
      })
      .catch((error) => console.error("Error:", error))

    //send email using MSG91 API
    const response = await axios.post(
      "http://control.msg91.com/api/v5/email/send",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          authkey: "321794AzjmHjH685e61f188P1",
        },
      }
    )

    if (response.status !== 200) {
      return res.status(response.status).json({
        message: "Failed to send invoice creation email",
        response: response.data,
      })
    }

    res.status(200).json({
      message: "Invoice creation email sent successfully",
      response: response.data,
    })
  } catch (error) {
    console.error(error)
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
