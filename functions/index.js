const functions = require("firebase-functions");
const axios = require("axios");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

admin.initializeApp();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MASTER_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = "https://gen-lang-client-0122413605.web.app";
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  "ai-studio-f44ab210-e45a-4425-91fb-d6567b47335e";

let firestoreDb;
function db() {
  if (!firestoreDb) {
    firestoreDb = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
  }
  return firestoreDb;
}

const WORKING_HOURS = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00",
];
const DAY_OFF = [0];

function setCors(res) {
  res.set("Access-Control-Allow-Origin", SITE_URL);
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeTime(time) {
  const t = String(time || "").trim();
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m24) {
    if (m24[2] !== "00") return null;
    return `${m24[1].padStart(2, "0")}:00`;
  }
  const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (m12) {
    if (m12[2] !== "00") return null;
    let hour = parseInt(m12[1], 10);
    const ampm = m12[3].toUpperCase();
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
  }
  return null;
}

function parseBody(body) {
  return {
    name: (body.fullName || body.name || "").trim(),
    phone: (body.phoneNumber || body.phone || "").trim(),
    service: (body.service || "").trim(),
    date: (body.date || "").trim(),
    time: normalizeTime(body.time),
  };
}

async function getBookedTimes(date) {
  const snap = await db()
    .collection("bookings")
    .where("date", "==", date)
    .get();

  return snap.docs
    .map((d) => d.data())
    .filter((b) => b.status !== "cancelled")
    .map((b) => b.time);
}

function getFreeSlots(date, booked) {
  return WORKING_HOURS.filter((h) => !booked.includes(h));
}

async function isSlotTaken(date, time) {
  const booked = await getBookedTimes(date);
  return booked.includes(time);
}

function getAvailableDays(bookedByDate, daysAhead = 14) {
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  const result = [];

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    if (DAY_OFF.includes(d.getDay())) continue;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    const booked = bookedByDate[dateStr] || [];
    const freeSlots = getFreeSlots(dateStr, booked);
    if (freeSlots.length > 0) {
      result.push({ date: dateStr, dayName: dayNames[d.getDay()], freeSlots });
    }
  }
  return result;
}

async function sendTelegram(chatId, text, parseMode = "HTML") {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  });
}

async function listActiveBookings() {
  const snap = await db()
    .collection("bookings")
    .where("status", "in", ["pending", "confirmed"])
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`);
      const db_ = new Date(`${b.date}T${b.time}`);
      return da - db_;
    });
}

function apiPath(req) {
  const raw = String(req.path || req.url || "").split("?")[0];
  const normalized = raw.replace(/^\/api/, "") || "/";
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

// HTTP API for website (Hosting rewrite: /api/** → bookingApi)
exports.bookingApi = functions.https.onRequest(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).send("");

  const path = apiPath(req);

  try {
    if (req.method === "GET" && (path === "/" || path === "")) {
      const count = (await listActiveBookings()).length;
      return res.json({ status: "ok", service: "RIDA.FN Booking API", bookingsCount: count });
    }

    if (req.method === "GET" && path === "/available") {
      const days = [];
      for (let i = 0; i <= 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        days.push(`${y}-${m}-${day}`);
      }
      const bookedByDate = {};
      for (const date of days) {
        bookedByDate[date] = await getBookedTimes(date);
      }
      return res.json({
        success: true,
        workingHours: WORKING_HOURS,
        availableDays: getAvailableDays(bookedByDate, 14),
      });
    }

    const dateMatch = path.match(/^\/available\/(\d{4}-\d{2}-\d{2})$/);
    if (req.method === "GET" && dateMatch) {
      const date = dateMatch[1];
      const booked = await getBookedTimes(date);
      return res.json({ success: true, date, freeSlots: getFreeSlots(date, booked) });
    }

    if (req.method === "POST" && path === "/booking") {
      const { name, phone, service, date, time } = parseBody(req.body);

      if (!name || !phone || !service || !date || !time) {
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });
      }

      if (!WORKING_HOURS.includes(time)) {
        const booked = await getBookedTimes(date);
        return res.status(400).json({
          success: false,
          message: `Choose a time between ${WORKING_HOURS[0]} and ${WORKING_HOURS[WORKING_HOURS.length - 1]}.`,
          freeSlots: getFreeSlots(date, booked),
        });
      }

      if (await isSlotTaken(date, time)) {
        const booked = await getBookedTimes(date);
        return res.status(409).json({
          success: false,
          message: `Sorry, ${date} at ${time} is already booked.`,
          freeSlots: getFreeSlots(date, booked),
        });
      }

      const docRef = await db().collection("bookings").add({
        name,
        phone,
        service,
        date,
        time,
        status: "confirmed",
        source: "website",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (TOKEN && MASTER_CHAT_ID) {
        const msg =
          `🔔 <b>NEW BOOKING — RIDA.FN</b>\n\n` +
          `👤 <b>${name}</b>\n` +
          `📞 ${phone}\n` +
          `💅 ${service}\n` +
          `📅 ${date}\n` +
          `⏰ ${time}\n` +
          `🆔 #${docRef.id}`;
        await sendTelegram(MASTER_CHAT_ID, msg).catch((e) =>
          functions.logger.error("Telegram notify failed", e)
        );
      }

      return res.json({
        success: true,
        message: `Booked for ${date} at ${time}. We will confirm shortly.`,
        booking: { id: docRef.id, name, service, date, time },
      });
    }

    return res.status(404).json({ success: false, message: "Not found" });
  } catch (err) {
    functions.logger.error("bookingApi error", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Telegram webhook (bot commands + optional legacy POST)
exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const update = req.body || {};

    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text || "";

      if (text === "/start") {
        await sendTelegram(
          chatId,
          `✨ <b>Welcome to RIDA.FN</b>\n\nBook online:\n${SITE_URL}\n\n/free — available times\n/help — help`
        );
      } else if (text === "/help") {
        await sendTelegram(
          chatId,
          `<b>Commands</b>\n/start\n/free\n/bookings (master)\n/cancel &lt;id&gt; (master)`
        );
      } else if (text === "/free") {
        const bookedByDate = {};
        for (let i = 0; i <= 14; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${day}`;
          bookedByDate[dateStr] = await getBookedTimes(dateStr);
        }
        const days = getAvailableDays(bookedByDate, 14);
        const lines = days
          .map((d) => `📅 <b>${d.dayName} ${d.date}</b>\n⏰ ${d.freeSlots.join(" | ")}`)
          .join("\n\n");
        await sendTelegram(chatId, `✅ <b>Free slots</b>\n\n${lines || "No slots found."}`);
      } else if (text === "/bookings") {
        if (String(chatId) !== String(MASTER_CHAT_ID)) {
          await sendTelegram(chatId, "❌ Master only.");
        } else {
          const list = await listActiveBookings();
          const body = list.length
            ? list
                .map(
                  (b, i) =>
                    `${i + 1}. <b>${b.name}</b>\n   📞 ${b.phone}\n   💅 ${b.service}\n   📅 ${b.date} ${b.time}\n   🆔 #${b.id}`
                )
                .join("\n\n")
            : "📭 No active bookings.";
          await sendTelegram(chatId, `📋 <b>Bookings</b>\n\n${body}`);
        }
      } else if (text.startsWith("/cancel ")) {
        if (String(chatId) !== String(MASTER_CHAT_ID)) {
          await sendTelegram(chatId, "❌ Master only.");
        } else {
          const id = text.replace("/cancel ", "").trim();
          const ref = db().collection("bookings").doc(id);
          const doc = await ref.get();
          if (!doc.exists) {
            await sendTelegram(chatId, `❌ Booking #${id} not found.`);
          } else {
            const b = doc.data();
            await ref.update({ status: "cancelled" });
            await sendTelegram(
              chatId,
              `✅ Cancelled <b>${b.name}</b> (${b.date} ${b.time})`
            );
          }
        }
      } else if (!text.startsWith("/")) {
        await sendTelegram(
          chatId,
          `Thanks! Book at ${SITE_URL} or use /free for available times.`
        );
      }
      return res.send("ok");
    }

    return res.send("ok");
  } catch (error) {
    functions.logger.error("telegramWebhook error", error);
    res.status(500).send("error");
  }
});

// Callable (legacy clients)
exports.submitBooking = functions.https.onCall(async (data) => {
  const { name, phone, service, date, time } = data;
  const normalized = normalizeTime(time);

  if (!name || !phone || !service || !date || !normalized) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  if (await isSlotTaken(date, normalized)) {
    throw new functions.https.HttpsError(
      "already-exists",
      "This time slot is already booked."
    );
  }

  const docRef = await db().collection("bookings").add({
    name: String(name).trim(),
    phone: String(phone).trim(),
    service,
    date,
    time: normalized,
    status: "confirmed",
    source: "callable",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (TOKEN && MASTER_CHAT_ID) {
    await sendTelegram(
      MASTER_CHAT_ID,
      `🔔 <b>NEW BOOKING</b>\n👤 ${name}\n📞 ${phone}\n💅 ${service}\n📅 ${date} ${normalized}\n🆔 #${docRef.id}`
    );
  }

  return { success: true, bookingId: docRef.id };
});
