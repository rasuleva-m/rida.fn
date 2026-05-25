import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Load env vars for both Vite-style and server-side usage
const envLocalPath = path.join(process.cwd(), ".env.local");
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath, override: true });
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: true });

// Initialize Firebase Admin (optional in dev; required in production for Firestore persistence)
const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const firebaseDatabaseUrl =
  process.env.FIREBASE_DATABASE_URL ||
  (firebaseProjectId ? `https://${firebaseProjectId}-default-rtdb.firebaseio.com` : undefined);
let db: Firestore | null = null;
try {
  if (!getApps().length) {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const hasCredentialsFile = !!credentialsPath && fs.existsSync(credentialsPath);

    if (hasCredentialsFile && credentialsPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8")) as ServiceAccount & {
        project_id?: string;
      };
      const inferredProjectId = firebaseProjectId || serviceAccount.project_id || serviceAccount.projectId;
      initializeApp({
        credential: cert(serviceAccount),
        projectId: inferredProjectId,
        ...(firebaseDatabaseUrl ? { databaseURL: firebaseDatabaseUrl } : {}),
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId: firebaseProjectId,
        ...(firebaseDatabaseUrl ? { databaseURL: firebaseDatabaseUrl } : {}),
      });
    }
  }
  db = getFirestore();
} catch (e) {
  console.warn(
    "Firebase Admin is not configured; Firestore writes will be skipped in dev. " +
      "Set FIREBASE_PROJECT_ID (or GCLOUD_PROJECT) and GOOGLE_APPLICATION_CREDENTIALS to enable.",
    e
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === "production";

  app.use(express.json());

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  // Ensure "/" returns 200 OK (some platforms use it for startup probes).
  // In production, serve the built SPA if present, otherwise return a simple OK.
  app.get("/", async (req, res, next) => {
    if (!isProduction) return next();
    const indexPath = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    return res.status(200).type("text/plain").send("OK");
  });

  // API Routes
  app.post("/api/booking", async (req, res) => {
    const { name, phone, service, date, time } = req.body;
    
    console.log("New booking request:", { name, phone, service, date, time });

    try {
      // 1. Save to Firestore (if configured)
      let bookingRef: FirebaseFirestore.DocumentReference | null = null;
      let bookingId: string = crypto.randomUUID();
      let persisted = false;
      let telegramSent = false;

      if (db) {
        try {
          bookingRef = db.collection("bookings").doc();
          bookingId = bookingRef.id;

          await bookingRef.set({
            clientName: name,
            clientPhone: phone,
            service,
            date,
            time,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
          persisted = true;
        } catch (firestoreErr) {
          if (isProduction) throw firestoreErr;
          console.warn("Firestore write failed; continuing without persistence (dev only).", firestoreErr);
        }
      }

      // 2. Notify Master via Telegram (required)
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!token || !chatId) {
        return res.status(500).json({
          success: false,
          message: "Telegram is not configured (missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).",
        });
      }

      const message =
        `<b>📅 New Appointment Request — RIDA.FN</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Name:</b> ${escapeHtml(name)}\n` +
        `📞 <b>Phone:</b> ${escapeHtml(phone)}\n` +
        `💅 <b>Service:</b> ${escapeHtml(service)}\n` +
        `🗓 <b>Date:</b> ${escapeHtml(date)}\n` +
        `🕐 <b>Time:</b> ${escapeHtml(time)}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `<i>Status: Pending</i>`;

      const url = `https://api.telegram.org/bot${token}/sendMessage`;

      const telegramRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Confirm", callback_data: `confirm_${bookingId}` },
                { text: "❌ Cancel", callback_data: `cancel_${bookingId}` },
              ],
            ],
          },
        }),
      });

      if (telegramRes.ok) {
        telegramSent = true;
        if (bookingRef) {
          const data = await telegramRes.json();
          const telegramMessageId = data.result.message_id;
          await bookingRef.update({ telegramMessageId });
        }
      } else {
        const errText = await telegramRes.text().catch(() => "");
        console.warn("Telegram sendMessage failed:", telegramRes.status, errText);
        return res.status(502).json({ success: false, message: "Telegram sendMessage failed." });
      }

      res.json({ success: true, message: "Booking requested!", persisted, telegramSent });
    } catch (err) {
      console.error("Booking Logic Error:", err);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });

  // API: Telegram Webhook (Callback Selection)
  app.post("/api/telegram-webhook", async (req, res) => {
    const { callback_query } = req.body;
    
    if (!callback_query) return res.sendStatus(200);
    if (!db) return res.sendStatus(200);

    const data = callback_query.data; 
    const [action, bookingId] = data.split("_");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return res.sendStatus(200);

    try {
      const bookingRef = db.collection("bookings").doc(bookingId);
      const booking = await bookingRef.get();

      if (!booking.exists) return res.sendStatus(200);

      const newStatus = action === "confirm" ? "confirmed" : "cancelled";
      await bookingRef.update({ status: newStatus });

      const bookingData = booking.data();
      const statusIcon = newStatus === "confirmed" ? "✅" : "❌";
      const updatedMessage =
        `<b>📅 Booking — RIDA.FN</b>\n\n` +
        `👤 <b>Name:</b> ${escapeHtml(bookingData?.clientName)}\n` +
        `📞 <b>Phone:</b> ${escapeHtml(bookingData?.clientPhone)}\n` +
        `💅 <b>Service:</b> ${escapeHtml(bookingData?.service)}\n` +
        `🗓 <b>Date:</b> ${escapeHtml(bookingData?.date)}\n` +
        `🕐 <b>Time:</b> ${escapeHtml(bookingData?.time)}\n\n` +
        `<b>Status:</b> ${escapeHtml(newStatus.toUpperCase())} ${statusIcon}`;

      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: callback_query.message.chat.id,
          message_id: callback_query.message.message_id,
          text: updatedMessage,
          parse_mode: "HTML"
        })
      });

      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: callback_query.id,
          text: `Booking ${newStatus}!`
        })
      });

    } catch (err) {
      console.error("Webhook Error:", err);
    }

    res.sendStatus(200);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // SPA fallback for client-side routes like /admin (dev/non-production)
    app.use("*", async (req, res, next) => {
      try {
        if (req.originalUrl.startsWith("/api/")) return next();
        const url = req.originalUrl;
        const indexPath = path.join(process.cwd(), "index.html");
        let template = await fs.promises.readFile(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Auto-register webhook if APP_URL is provided
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const appUrl = process.env.APP_URL; // User should set this in Settings
    if (token && appUrl) {
      let webhookUrl: string | null = null;
      try {
        const origin = new URL(appUrl).origin;
        webhookUrl = `${origin}/api/telegram-webhook`;
      } catch {
        webhookUrl = `${appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl}/api/telegram-webhook`;
      }
      console.log(`Setting Telegram webhook to: ${webhookUrl}`);
      try {
        await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl })
        });
      } catch (e) {
        console.error("Failed to set Telegram webhook:", e);
      }
    }
  });
}

startServer();
