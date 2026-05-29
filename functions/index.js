const functions = require("firebase-functions");
const axios = require("axios");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MASTER_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "RidaNailBot";
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

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function formatDay(dateStr) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function welcomeMessage(customerName) {
  const name = escapeHtml(customerName || "Guest");
  return (
    `Welcome <b>${name}</b> to Rida Personal Care Studio ✨\n\n` +
    `Where elegance meets perfection.\n` +
    `We create beauty that speaks without words.\n\n` +
    `Please choose what you'd like to do:\n` +
    `• Book your appointment through our website\n` +
    `  <a href="${SITE_URL}">${SITE_URL}</a>\n` +
    `• Discover our services — tap /free\n\n` +
    `Your beauty journey starts here 🤍\n\n` +
    `<b>Your appointments</b> — /mybookings\n` +
    `<b>Cancel a booking</b> — /cancelbooking`
  );
}

function customerBookingConfirmation(name, date, time) {
  const day = formatDay(date);
  return (
    `Dear <b>${escapeHtml(name)}</b> your appointment is booked for <b>${escapeHtml(day)}</b> at <b>${escapeHtml(time)}</b>.\n` +
    `We're looking forward to seeing you.\n` +
    `Your master is Farida. 💖🌝\n\n` +
    `To cancel: /mybookings then tap Cancel, or send /cancelbooking`
  );
}

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
    telegramChatId: body.telegramChatId ? String(body.telegramChatId) : null,
  };
}

async function getBookedTimes(date) {
  const snap = await db().collection("bookings").where("date", "==", date).get();
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

async function sendTelegram(chatId, text, options = {}) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const body = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || "HTML",
    disable_web_page_preview: options.disablePreview ?? false,
  };
  if (options.replyMarkup) body.reply_markup = options.replyMarkup;
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, body);
}

async function answerCallback(callbackQueryId, text) {
  await axios.post(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    callback_query_id: callbackQueryId,
    text,
    show_alert: !!text,
  });
}

async function saveTelegramUser(chatId, from, phone = null) {
  const name =
    [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
    from?.username ||
    "Guest";
  const data = {
    chatId: String(chatId),
    name,
    username: from?.username || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (phone) data.phone = normalizePhone(phone);
  await db().collection("telegram_users").doc(String(chatId)).set(data, { merge: true });
  return name;
}

async function findChatIdByPhone(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const snap = await db().collection("telegram_users").where("phone", "==", digits).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0].data().chatId;
}

async function listActiveBookings() {
  const snap = await db()
    .collection("bookings")
    .where("status", "in", ["pending", "confirmed"])
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

async function listCustomerBookings(chatId, phoneDigits = null) {
  const all = await listActiveBookings();
  const cid = String(chatId);
  return all.filter(
    (b) =>
      String(b.telegramChatId) === cid ||
      (phoneDigits && normalizePhone(b.phone) === phoneDigits)
  );
}

function isMaster(chatId) {
  return String(chatId) === String(MASTER_CHAT_ID);
}

async function cancelBooking(bookingId, cancelledBy, actorChatId) {
  const ref = db().collection("bookings").doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: "Booking not found." };

  const b = doc.data();
  if (b.status === "cancelled") return { ok: false, message: "Already cancelled." };

  const master = isMaster(actorChatId);
  const owner = String(b.telegramChatId) === String(actorChatId);
  const userDoc = await db().collection("telegram_users").doc(String(actorChatId)).get();
  const userPhone = userDoc.exists ? userDoc.data().phone : null;
  const phoneMatch =
    userPhone && b.phone && normalizePhone(b.phone) === normalizePhone(userPhone);

  if (!master && !owner && !phoneMatch) {
    return { ok: false, message: "You cannot cancel this booking." };
  }

  await ref.update({
    status: "cancelled",
    cancelledAt: FieldValue.serverTimestamp(),
    cancelledBy,
  });

  const day = formatDay(b.date);
  const customerMsg =
    `Your appointment on <b>${escapeHtml(day)}</b> at <b>${escapeHtml(b.time)}</b> has been cancelled.\n` +
    `If this was unexpected, please contact us or book again: ${SITE_URL}`;

  const masterMsg =
    `❌ <b>Booking cancelled</b> (${cancelledBy})\n\n` +
    `👤 ${escapeHtml(b.name)}\n📅 ${escapeHtml(day)} ${escapeHtml(b.time)}\n🆔 #${bookingId}`;

  if (b.telegramChatId) {
    await sendTelegram(b.telegramChatId, customerMsg).catch(() => {});
  }
  if (MASTER_CHAT_ID) {
    await sendTelegram(MASTER_CHAT_ID, masterMsg).catch(() => {});
  }

  return { ok: true, booking: b };
}

async function notifyCustomerBooking(bookingId, b, chatId) {
  if (!chatId) return;
  await db().collection("bookings").doc(bookingId).update({
    telegramChatId: String(chatId),
  });
  await sendTelegram(chatId, customerBookingConfirmation(b.name, b.date, b.time));
}

async function linkBookingFromStart(bookingId, chatId, from) {
  const ref = db().collection("bookings").doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) {
    await sendTelegram(chatId, "❌ Booking not found. It may have expired.");
    return;
  }
  const b = doc.data();
  if (b.status === "cancelled") {
    await sendTelegram(chatId, "This booking was cancelled. Please book again on our website.");
    return;
  }
  await saveTelegramUser(chatId, from, b.phone);
  await notifyCustomerBooking(bookingId, b, chatId);
}

async function tryNotifyCustomerByPhone(bookingId, b) {
  const chatId = await findChatIdByPhone(b.phone);
  if (chatId) await notifyCustomerBooking(bookingId, b, chatId);
  return chatId;
}

function masterBookingKeyboard(bookingId) {
  return {
    inline_keyboard: [
      [
        { text: "❌ Cancel booking", callback_data: `master_cancel:${bookingId}` },
        { text: "📋 All bookings", callback_data: "master_list" },
      ],
    ],
  };
}

function customerBookingsKeyboard(bookings) {
  const rows = bookings.slice(0, 8).map((b) => [
    {
      text: `❌ ${b.date} ${b.time} — ${b.service}`.slice(0, 60),
      callback_data: `customer_cancel:${b.id}`,
    },
  ]);
  return { inline_keyboard: rows.length ? rows : [[{ text: "Book on website", url: SITE_URL }]] };
}

function apiPath(req) {
  const raw = String(req.path || req.url || "").split("?")[0];
  const normalized = raw.replace(/^\/api/, "") || "/";
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

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
      const { name, phone, service, date, time, telegramChatId } = parseBody(req.body);

      if (!name || !phone || !service || !date || !time) {
        return res.status(400).json({ success: false, message: "All fields are required." });
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

      const bookingData = {
        name,
        phone,
        service,
        date,
        time,
        status: "confirmed",
        source: "website",
        createdAt: FieldValue.serverTimestamp(),
      };
      if (telegramChatId) bookingData.telegramChatId = telegramChatId;

      const docRef = await db().collection("bookings").add(bookingData);
      const bookingId = docRef.id;
      const b = { name, phone, service, date, time };

      const telegramConfirmUrl = `https://t.me/${BOT_USERNAME}?start=confirm_${bookingId}`;

      if (TOKEN && MASTER_CHAT_ID) {
        const masterMsg =
          `🔔 <b>NEW BOOKING — RIDA.FN</b>\n\n` +
          `👤 <b>${escapeHtml(name)}</b>\n` +
          `📞 ${escapeHtml(phone)}\n` +
          `💅 ${escapeHtml(service)}\n` +
          `📅 ${date}\n` +
          `⏰ ${time}\n` +
          `🆔 #${bookingId}`;
        await sendTelegram(MASTER_CHAT_ID, masterMsg, {
          replyMarkup: masterBookingKeyboard(bookingId),
        }).catch((e) => functions.logger.error("Master notify failed", e));
      }

      let customerNotified = false;
      if (telegramChatId) {
        await notifyCustomerBooking(bookingId, b, telegramChatId).catch(() => {});
        customerNotified = true;
      } else {
        const linked = await tryNotifyCustomerByPhone(bookingId, b);
        customerNotified = !!linked;
      }

      return res.json({
        success: true,
        message: `Booked for ${date} at ${time}.`,
        booking: { id: bookingId, name, service, date, time },
        telegramConfirmUrl,
        customerNotified,
      });
    }

    return res.status(404).json({ success: false, message: "Not found" });
  } catch (err) {
    functions.logger.error("bookingApi error", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id;
      const data = cq.data || "";

      if (data.startsWith("master_cancel:")) {
        if (!isMaster(chatId)) {
          await answerCallback(cq.id, "Master only");
          return res.send("ok");
        }
        const id = data.replace("master_cancel:", "");
        const result = await cancelBooking(id, "master", chatId);
        await answerCallback(cq.id, result.ok ? "Cancelled" : result.message);
        if (result.ok && cq.message) {
          await axios.post(`https://api.telegram.org/bot${TOKEN}/editMessageReplyMarkup`, {
            chat_id: chatId,
            message_id: cq.message.message_id,
            reply_markup: { inline_keyboard: [] },
          }).catch(() => {});
        }
      } else if (data === "master_list" && isMaster(chatId)) {
        const list = await listActiveBookings();
        const body = list.length
          ? list.map((b, i) => `${i + 1}. <b>${escapeHtml(b.name)}</b> — ${b.date} ${b.time}\n🆔 <code>${b.id}</code>`).join("\n\n")
          : "No active bookings.";
        await sendTelegram(chatId, `📋 <b>Bookings</b>\n\n${body}\n\nCancel: /cancel &lt;id&gt;`);
        await answerCallback(cq.id);
      } else if (data.startsWith("customer_cancel:")) {
        const id = data.replace("customer_cancel:", "");
        const result = await cancelBooking(id, "customer", chatId);
        await answerCallback(cq.id, result.ok ? "Appointment cancelled" : result.message);
      }

      return res.send("ok");
    }

    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const from = message.from;
      const text = message.text || "";

      if (message.contact) {
        const phone = message.contact.phone_number;
        const name = await saveTelegramUser(chatId, from, phone);
        await sendTelegram(
          chatId,
          `Thank you <b>${escapeHtml(name)}</b>! Your number is saved.\n` +
            `When you book on our website with this phone, confirmations arrive here automatically. 🤍\n\n` +
            welcomeMessage(name),
          {
            replyMarkup: {
              keyboard: [[{ text: "📅 Book on website", web_app: { url: SITE_URL } }]],
              resize_keyboard: true,
            },
          }
        );
        return res.send("ok");
      }

      const startPayload = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
      if (startPayload) {
        const payload = startPayload[1]?.trim();
        const displayName =
          [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
          from?.first_name ||
          "Guest";

        if (payload?.startsWith("confirm_")) {
          const bookingId = payload.replace("confirm_", "");
          await linkBookingFromStart(bookingId, chatId, from);
          return res.send("ok");
        }

        await saveTelegramUser(chatId, from);
        await sendTelegram(chatId, welcomeMessage(displayName), {
          replyMarkup: {
            keyboard: [
              [{ text: "📱 Share phone for auto-confirm", request_contact: true }],
              [{ text: "📅 Book on website", web_app: { url: SITE_URL } }],
            ],
            resize_keyboard: true,
          },
        });
        return res.send("ok");
      }

      if (text === "/help" || text.startsWith("/help@")) {
        await sendTelegram(
          chatId,
          `<b>Commands</b>\n` +
            `/start — Welcome\n` +
            `/free — Free times\n` +
            `/mybookings — Your appointments\n` +
            `/cancelbooking — Cancel (with buttons)\n` +
            `/bookings — All bookings (master)\n` +
            `/cancel &lt;id&gt; — Cancel by ID (master)`
        );
        return res.send("ok");
      }

      if (text === "/free" || text.startsWith("/free@")) {
        const bookedByDate = {};
        for (let i = 0; i <= 14; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          bookedByDate[`${y}-${m}-${day}`] = await getBookedTimes(`${y}-${m}-${day}`);
        }
        const days = getAvailableDays(bookedByDate, 14);
        const lines = days
          .map((d) => `📅 <b>${d.dayName} ${d.date}</b>\n⏰ ${d.freeSlots.join(" | ")}`)
          .join("\n\n");
        await sendTelegram(chatId, `✅ <b>Free slots</b>\n\n${lines || "No slots found."}`);
        return res.send("ok");
      }

      if (text === "/mybookings" || text.startsWith("/mybookings@")) {
        const userDoc = await db().collection("telegram_users").doc(String(chatId)).get();
        const phone = userDoc.exists ? userDoc.data().phone : null;
        const mine = await listCustomerBookings(chatId, phone);
        if (!mine.length) {
          await sendTelegram(
            chatId,
            `You have no active bookings.\n\nBook here: ${SITE_URL}\n\n` +
              `After booking, open:\nhttps://t.me/${BOT_USERNAME}?start=confirm_<booking_id>`
          );
        } else {
          const lines = mine
            .map(
              (b, i) =>
                `${i + 1}. <b>${escapeHtml(b.service)}</b>\n   ${formatDay(b.date)} at ${b.time}\n   🆔 <code>${b.id}</code>`
            )
            .join("\n\n");
          await sendTelegram(chatId, `📋 <b>Your bookings</b>\n\n${lines}`, {
            replyMarkup: customerBookingsKeyboard(mine),
          });
        }
        return res.send("ok");
      }

      if (text === "/cancelbooking" || text.startsWith("/cancelbooking@")) {
        const userDoc = await db().collection("telegram_users").doc(String(chatId)).get();
        const phone = userDoc.exists ? userDoc.data().phone : null;
        const mine = await listCustomerBookings(chatId, phone);
        if (!mine.length) {
          await sendTelegram(chatId, "No active bookings to cancel.");
        } else {
          await sendTelegram(chatId, "Tap the appointment to cancel:", {
            replyMarkup: customerBookingsKeyboard(mine),
          });
        }
        return res.send("ok");
      }

      if (text.startsWith("/cancel ") || text.startsWith("/cancel@")) {
        const id = text.split(/\s+/)[1]?.trim();
        if (!id) {
          await sendTelegram(chatId, "Usage: /cancel &lt;booking_id&gt;");
          return res.send("ok");
        }
        if (isMaster(chatId)) {
          const result = await cancelBooking(id, "master", chatId);
          await sendTelegram(chatId, result.ok ? `✅ Cancelled #${id}` : `❌ ${result.message}`);
        } else {
          const result = await cancelBooking(id, "customer", chatId);
          await sendTelegram(
            chatId,
            result.ok ? `✅ Your appointment was cancelled.` : `❌ ${result.message}`
          );
        }
        return res.send("ok");
      }

      if (text === "/bookings" || text.startsWith("/bookings@")) {
        if (!isMaster(chatId)) {
          await sendTelegram(chatId, "❌ Master only.");
        } else {
          const list = await listActiveBookings();
          const body = list.length
            ? list
                .map(
                  (b, i) =>
                    `${i + 1}. <b>${escapeHtml(b.name)}</b>\n   📞 ${escapeHtml(b.phone)}\n   💅 ${escapeHtml(b.service)}\n   📅 ${b.date} ${b.time}\n   🆔 <code>${b.id}</code>`
                )
                .join("\n\n")
            : "📭 No active bookings.";
          await sendTelegram(
            chatId,
            `📋 <b>Bookings</b>\n\n${body}\n\n/cancel &lt;id&gt; or use ❌ on new booking messages`
          );
        }
        return res.send("ok");
      }

      if (!text.startsWith("/")) {
        await sendTelegram(
          chatId,
          `Hello! Tap /start or book on our website:\n${SITE_URL}`
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

exports.submitBooking = functions.https.onCall(async (data) => {
  const { name, phone, service, date, time } = data;
  const normalized = normalizeTime(time);
  if (!name || !phone || !service || !date || !normalized) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }
  if (await isSlotTaken(date, normalized)) {
    throw new functions.https.HttpsError("already-exists", "This time slot is already booked.");
  }
  const docRef = await db().collection("bookings").add({
    name: String(name).trim(),
    phone: String(phone).trim(),
    service,
    date,
    time: normalized,
    status: "confirmed",
    source: "callable",
    createdAt: FieldValue.serverTimestamp(),
  });
  const b = { name, phone, service, date, time: normalized };
  if (TOKEN && MASTER_CHAT_ID) {
    await sendTelegram(MASTER_CHAT_ID, `🔔 <b>NEW BOOKING</b>\n👤 ${escapeHtml(name)}\n🆔 #${docRef.id}`, {
      replyMarkup: masterBookingKeyboard(docRef.id),
    });
  }
  await tryNotifyCustomerByPhone(docRef.id, b);
  return { success: true, bookingId: docRef.id };
});
