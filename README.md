# firebase-razorpay-integrate-nodejs

This project demonstrates how to integrate the Razorpay payment gateway with Firebase Cloud Functions.

## Steps to run the project

1. Clone the project repository.
2. Install all the project dependencies by running `npm install` in the project directory.
3. Start the Firebase emulator by running `npm run serve`.
4. Open the Firebase shell by running `npm run shell`.
5. Deploy the functions to Firebase by running `npm run deploy`.

## Firebase Functions

1. `createOrder` - This function creates a new order in Razorpay and returns the order ID.
2. `verifyPayment` - This function verifies the payment and updates the order status in Firestore.
3. `capturePayment` - This function captures the payment and updates the order status in Firestore.

Make sure to follow these steps in order to successfully run and utilize the Firebase Razorpay integration in this project.
