const { logger } = require("firebase-functions");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const axios = require("axios");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const i18n = require("./bot-i18n");

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

async function getUserLang(chatId) {
  const doc = await db().collection("telegram_users").doc(String(chatId)).get();
  if (doc.exists && doc.data().lang) return i18n.normalizeLang(doc.data().lang);
  return "en";
}

async function setUserLang(chatId, lang) {
  await db()
    .collection("telegram_users")
    .doc(String(chatId))
    .set({ lang: i18n.normalizeLang(lang), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

function displayName(from) {
  return (
    [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
    from?.first_name ||
    "Guest"
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

function getAvailableDays(bookedByDate, daysAhead = 14, lang = "en") {
  const dayNames = i18n.getAvailableDayNames(lang);
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
  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, body);
  } catch (err) {
    const desc = err.response?.data?.description || err.message;
    logger.error("sendTelegram failed", { chatId, desc });
    if (options.replyMarkup) {
      delete body.reply_markup;
      await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, body);
    } else {
      throw err;
    }
  }
}

function welcomeText(lang, name) {
  return i18n.msg(lang, "welcome")(escapeHtml(name));
}

function bookingConfirmText(lang, name, date, time) {
  const day = i18n.formatDayLocalized(date, lang);
  return i18n.msg(lang, "bookingConfirm")(escapeHtml(name), escapeHtml(day), escapeHtml(time));
}

async function answerCallback(callbackQueryId, text) {
  await axios.post(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    callback_query_id: callbackQueryId,
    text,
    show_alert: !!text,
  });
}

async function saveTelegramUser(chatId, from, phone = null, lang = null) {
  const name = displayName(from) || from?.username || "Guest";
  const data = {
    chatId: String(chatId),
    name,
    username: from?.username || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (phone) data.phone = normalizePhone(phone);
  if (lang) data.lang = i18n.normalizeLang(lang);
  else if (from?.language_code) {
    const doc = await db().collection("telegram_users").doc(String(chatId)).get();
    if (!doc.exists || !doc.data().lang) {
      data.lang = i18n.detectLangFromTelegram(from.language_code);
    }
  }
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
  const lang = await getUserLang(actorChatId);
  const ref = db().collection("bookings").doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, message: i18n.msg(lang, "errNotFound") };

  const b = doc.data();
  if (b.status === "cancelled") return { ok: false, message: i18n.msg(lang, "errAlreadyCancelled") };

  const master = isMaster(actorChatId);
  const owner = String(b.telegramChatId) === String(actorChatId);
  const userDoc = await db().collection("telegram_users").doc(String(actorChatId)).get();
  const userPhone = userDoc.exists ? userDoc.data().phone : null;
  const phoneMatch =
    userPhone && b.phone && normalizePhone(b.phone) === normalizePhone(userPhone);

  if (!master && !owner && !phoneMatch) {
    return { ok: false, message: i18n.msg(lang, "errCannotCancel") };
  }

  await ref.update({
    status: "cancelled",
    cancelledAt: FieldValue.serverTimestamp(),
    cancelledBy,
  });

  const customerLang = b.telegramChatId
    ? await getUserLang(b.telegramChatId)
    : lang;
  const day = i18n.formatDayLocalized(b.date, customerLang);
  const customerMsg = i18n.msg(customerLang, "customerCancelledNotify")(
    escapeHtml(day),
    escapeHtml(b.time)
  );
  const masterMsg = i18n.msg("en", "masterCancelledNotify")(
    escapeHtml(b.name),
    escapeHtml(i18n.formatDayLocalized(b.date, "en")),
    escapeHtml(b.time),
    bookingId,
    cancelledBy
  );

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
  const lang = await getUserLang(chatId);
  await db().collection("bookings").doc(bookingId).update({
    telegramChatId: String(chatId),
  });
  await sendTelegram(chatId, bookingConfirmText(lang, b.name, b.date, b.time));
}

async function linkBookingFromStart(bookingId, chatId, from) {
  const lang = await getUserLang(chatId);
  const ref = db().collection("bookings").doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) {
    await sendTelegram(chatId, i18n.msg(lang, "bookingNotFound"));
    return;
  }
  const b = doc.data();
  if (b.status === "cancelled") {
    await sendTelegram(chatId, i18n.msg(lang, "bookingWasCancelled"));
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

async function sendWelcome(chatId, from) {
  const lang = await getUserLang(chatId);
  const name = displayName(from);
  await sendTelegram(chatId, welcomeText(lang, name), {
    replyMarkup: i18n.startKeyboard(lang),
  });
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

function customerBookingsKeyboard(bookings, lang) {
  const rows = bookings.slice(0, 8).map((b) => [
    {
      text: `❌ ${b.date} ${b.time} — ${b.service}`.slice(0, 60),
      callback_data: `customer_cancel:${b.id}`,
    },
  ]);
  return {
    inline_keyboard: rows.length
      ? rows
      : [[{ text: i18n.msg(lang, "inlineBook"), url: SITE_URL }]],
  };
}

function apiPath(req) {
  const raw = String(req.path || req.url || "").split("?")[0];
  const normalized = raw.replace(/^\/api/, "") || "/";
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

const httpOptions = { region: "us-central1", invoker: "public" };

exports.bookingApi = onRequest(httpOptions, async (req, res) => {
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
        }).catch((e) => logger.error("Master notify failed", e));
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
    logger.error("bookingApi error", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

exports.telegramWebhook = onRequest(httpOptions, async (req, res) => {
  try {
    const update = req.body || {};

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id;
      const data = cq.data || "";
      const lang = await getUserLang(chatId);

      if (data.startsWith("lang:")) {
        const newLang = i18n.normalizeLang(data.replace("lang:", ""));
        await setUserLang(chatId, newLang);
        if (cq.from) await saveTelegramUser(chatId, cq.from, null, newLang);
        await answerCallback(cq.id, i18n.msg(newLang, "language.set"));
        try {
          await sendWelcome(chatId, cq.from || { first_name: "Guest" });
        } catch (e) {
          logger.error("welcome after lang failed", e);
        }
        return res.send("ok");
      }

      if (data.startsWith("master_cancel:")) {
        if (!isMaster(chatId)) {
          await answerCallback(cq.id, i18n.msg(lang, "callbackMasterOnly"));
          return res.send("ok");
        }
        const id = data.replace("master_cancel:", "");
        const result = await cancelBooking(id, "master", chatId);
        await answerCallback(cq.id, result.ok ? i18n.msg(lang, "callbackCancelled") : result.message);
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
          : i18n.msg(lang, "noActiveBookings");
        await sendTelegram(
          chatId,
          `📋 <b>${i18n.msg(lang, "bookingsTitle")}</b>\n\n${body}\n\n${i18n.msg(lang, "cancelHint")}`
        );
        await answerCallback(cq.id);
      } else if (data.startsWith("customer_cancel:")) {
        const id = data.replace("customer_cancel:", "");
        const result = await cancelBooking(id, "customer", chatId);
        await answerCallback(
          cq.id,
          result.ok ? i18n.msg(lang, "callbackApptCancelled") : result.message
        );
      }

      return res.send("ok");
    }

    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const from = message.from;
      const text = message.text || "";

      const lang = await getUserLang(chatId);

      if (message.contact) {
        const phone = message.contact.phone_number;
        const name = await saveTelegramUser(chatId, from, phone);
        await sendTelegram(
          chatId,
          `${i18n.msg(lang, "phoneSaved")(escapeHtml(name))}\n\n${welcomeText(lang, name)}`,
          { replyMarkup: i18n.startKeyboard(lang) }
        );
        return res.send("ok");
      }

      const startPayload = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
      if (startPayload) {
        const payload = startPayload[1]?.trim();

        if (payload?.startsWith("confirm_")) {
          const bookingId = payload.replace("confirm_", "");
          await linkBookingFromStart(bookingId, chatId, from);
          return res.send("ok");
        }

        await saveTelegramUser(chatId, from);
        const userDoc = await db().collection("telegram_users").doc(String(chatId)).get();
        const hasLang = userDoc.exists && userDoc.data().lang;

        if (!hasLang) {
          await sendTelegram(chatId, i18n.msg("en", "language.choose"), {
            replyMarkup: i18n.languageKeyboard(),
          });
          return res.send("ok");
        }

        try {
          await sendWelcome(chatId, from);
        } catch (e) {
          logger.error("/start send failed", e.response?.data || e.message);
          await sendTelegram(chatId, welcomeText(lang, displayName(from))).catch(() => {});
        }
        return res.send("ok");
      }

      if (text === "/language" || text.startsWith("/language@")) {
        await sendTelegram(chatId, i18n.msg(lang, "language.choose"), {
          replyMarkup: i18n.languageKeyboard(),
        });
        return res.send("ok");
      }

      if (i18n.isBookWebsiteButton(text)) {
        await sendTelegram(chatId, i18n.msg(lang, "bookLink"));
        return res.send("ok");
      }

      if (text === "/help" || text.startsWith("/help@")) {
        await sendTelegram(chatId, i18n.msg(lang, "help"));
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
        const days = getAvailableDays(bookedByDate, 14, lang);
        const lines = days
          .map((d) => `📅 <b>${d.dayName} ${d.date}</b>\n⏰ ${d.freeSlots.join(" | ")}`)
          .join("\n\n");
        await sendTelegram(
          chatId,
          `✅ <b>${i18n.msg(lang, "freeTitle")}</b>\n\n${lines || i18n.msg(lang, "noSlots")}`
        );
        return res.send("ok");
      }

      if (text === "/mybookings" || text.startsWith("/mybookings@")) {
        const userDoc = await db().collection("telegram_users").doc(String(chatId)).get();
        const phone = userDoc.exists ? userDoc.data().phone : null;
        const mine = await listCustomerBookings(chatId, phone);
        if (!mine.length) {
          await sendTelegram(chatId, i18n.msg(lang, "noBookings")(BOT_USERNAME));
        } else {
          const lines = mine
            .map(
              (b, i) =>
                `${i + 1}. <b>${escapeHtml(b.service)}</b>\n   ${i18n.formatDayLocalized(b.date, lang)} — ${b.time}\n   🆔 <code>${b.id}</code>`
            )
            .join("\n\n");
          await sendTelegram(chatId, `📋 <b>${i18n.msg(lang, "myBookingsTitle")}</b>\n\n${lines}`, {
            replyMarkup: customerBookingsKeyboard(mine, lang),
          });
        }
        return res.send("ok");
      }

      if (text === "/cancelbooking" || text.startsWith("/cancelbooking@")) {
        const userDoc = await db().collection("telegram_users").doc(String(chatId)).get();
        const phone = userDoc.exists ? userDoc.data().phone : null;
        const mine = await listCustomerBookings(chatId, phone);
        if (!mine.length) {
          await sendTelegram(chatId, i18n.msg(lang, "noCancel"));
        } else {
          await sendTelegram(chatId, i18n.msg(lang, "cancelPrompt"), {
            replyMarkup: customerBookingsKeyboard(mine, lang),
          });
        }
        return res.send("ok");
      }

      if (text.startsWith("/cancel ") || text.startsWith("/cancel@")) {
        const id = text.split(/\s+/)[1]?.trim();
        if (!id) {
          await sendTelegram(chatId, i18n.msg(lang, "cancelUsage"));
          return res.send("ok");
        }
        if (isMaster(chatId)) {
          const result = await cancelBooking(id, "master", chatId);
          await sendTelegram(
            chatId,
            result.ok ? i18n.msg(lang, "cancelledOk")(id) : `❌ ${result.message}`
          );
        } else {
          const result = await cancelBooking(id, "customer", chatId);
          await sendTelegram(
            chatId,
            result.ok ? i18n.msg(lang, "customerCancelledOk") : `❌ ${result.message}`
          );
        }
        return res.send("ok");
      }

      if (text === "/bookings" || text.startsWith("/bookings@")) {
        if (!isMaster(chatId)) {
          await sendTelegram(chatId, i18n.msg(lang, "masterOnly"));
        } else {
          const list = await listActiveBookings();
          const body = list.length
            ? list
                .map(
                  (b, i) =>
                    `${i + 1}. <b>${escapeHtml(b.name)}</b>\n   📞 ${escapeHtml(b.phone)}\n   💅 ${escapeHtml(b.service)}\n   📅 ${b.date} ${b.time}\n   🆔 <code>${b.id}</code>`
                )
                .join("\n\n")
            : i18n.msg(lang, "noActiveBookings");
          await sendTelegram(
            chatId,
            `📋 <b>${i18n.msg(lang, "bookingsTitle")}</b>\n\n${body}\n\n${i18n.msg(lang, "cancelHint")}`
          );
        }
        return res.send("ok");
      }

      if (!text.startsWith("/")) {
        await sendTelegram(chatId, i18n.msg(lang, "hello"));
      }
      return res.send("ok");
    }

    return res.send("ok");
  } catch (error) {
    logger.error("telegramWebhook error", error);
    return res.status(200).send("ok");
  }
});

exports.submitBooking = onCall({ region: "us-central1" }, async (request) => {
  const { name, phone, service, date, time } = request.data || {};
  const normalized = normalizeTime(time);
  if (!name || !phone || !service || !date || !normalized) {
    throw new HttpsError("invalid-argument", "Missing required fields");
  }
  if (await isSlotTaken(date, normalized)) {
    throw new HttpsError("already-exists", "This time slot is already booked.");
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
