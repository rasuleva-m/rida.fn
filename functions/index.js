const functions = require("firebase-functions");
const axios = require("axios");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Your Telegram Bot Token
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  functions.logger.warn("Warning: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in environment variables");
}

// Telegram Webhook Handler
exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Handle POST requests from booking form
    if (req.method === "POST") {
      const { name, phone, service, date, time } = req.body;

      // Validate input
      if (!name || !phone || !service || !date || !time) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Format message for Telegram
      const message = `
🎉 <b>New Booking Request!</b>

👤 <b>Name:</b> ${name}
📱 <b>Phone:</b> ${phone}
💅 <b>Service:</b> ${service}
📅 <b>Date:</b> ${date}
⏰ <b>Time:</b> ${time}

Message sent from: Rida.FN Portfolio
      `.trim();

      try {
        // Send message to Telegram
        await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML"
        });

        // Also save to Firestore for admin panel
        const db = admin.firestore();
        await db.collection("bookings").add({
          name,
          phone,
          service,
          date,
          time,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "pending"
        });

        return res.status(200).json({ success: true, message: "Booking received!" });
      } catch (telegramError) {
        console.error("Telegram error:", telegramError);
        return res.status(500).json({ error: "Failed to send booking" });
      }
    }

    // Handle Telegram webhook updates (for bot interactions)
    if (req.method === "POST" && req.body.message) {
      const update = req.body;
      const message = update.message;

      if (message && message.text) {
        const chatId = message.chat.id;
        const text = message.text;

        // Simple bot response
        const responseText = `Rahmat! Sizning xabatingiz qabul qilindi. Tez orada bog'lanamiz! ✅`;

        try {
          await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: responseText
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
    }

    res.send("ok");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// HTTP callable function for booking form
exports.submitBooking = functions.https.onCall(async (data, context) => {
  try {
    const { name, phone, service, date, time } = data;

    // Validate input
    if (!name || !phone || !service || !date || !time) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required booking fields"
      );
    }

    // Format message
    const message = `
🎉 <b>New Booking Request!</b>

👤 <b>Name:</b> ${name}
📱 <b>Phone:</b> ${phone}
💅 <b>Service:</b> ${service}
📅 <b>Date:</b> ${date}
⏰ <b>Time:</b> ${time}
    `.trim();

    // Send to Telegram
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML"
    });

    // Save to Firestore
    const db = admin.firestore();
    const docRef = await db.collection("bookings").add({
      name,
      phone,
      service,
      date,
      time,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending"
    });

    return { success: true, bookingId: docRef.id };
  } catch (error) {
    console.error("Booking error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
