/** Telegram bot strings: en | ru | uz */

const SITE_URL = "https://gen-lang-client-0122413605.web.app";

const DAY_NAMES = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ru: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
  uz: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
};

const LOCALES = { en: "en-US", ru: "ru-RU", uz: "uz-UZ" };

const MESSAGES = {
  en: {
    buttons: {
      sharePhone: "📱 Share phone for auto-confirm",
      bookWebsite: "📅 Book on website",
      bookOnSite: "Book on website",
    },
    language: {
      choose: "🌐 <b>Choose your language</b>\n\nO'zbekcha | Русский | English",
      set: "✅ Language set to <b>English</b>",
    },
    welcome: (name) =>
      `Welcome <b>${name}</b> to Rida Personal Care Studio ✨\n\n` +
      `Where elegance meets perfection.\n` +
      `We create beauty that speaks without words.\n\n` +
      `Please choose what you'd like to do:\n` +
      `• Book your appointment through our website\n` +
      `  <a href="${SITE_URL}">${SITE_URL}</a>\n` +
      `• Discover our services — /free\n\n` +
      `Your beauty journey starts here 🤍\n\n` +
      `<b>Your appointments</b> — /mybookings\n` +
      `<b>Cancel a booking</b> — /cancelbooking\n` +
      `<b>Language</b> — /language`,
    bookingConfirm: (name, day, time) =>
      `Dear <b>${name}</b> your appointment is booked for <b>${day}</b> at <b>${time}</b>.\n` +
      `We're looking forward to seeing you.\n` +
      `Your master is Farida. 💖🌝\n\n` +
      `To cancel: /mybookings or /cancelbooking`,
    phoneSaved: (name) =>
      `Thank you <b>${name}</b>! Your number is saved.\n` +
      `When you book on our website with this phone, confirmations arrive here automatically. 🤍`,
    help:
      `<b>Commands</b>\n` +
      `/start — Welcome\n` +
      `/language — Change language\n` +
      `/free — Free times\n` +
      `/mybookings — Your appointments\n` +
      `/cancelbooking — Cancel booking\n` +
      `/bookings — All bookings (master)\n` +
      `/cancel &lt;id&gt; — Cancel by ID (master)`,
    freeTitle: "Free slots",
    noSlots: "No slots found.",
    myBookingsTitle: "Your bookings",
    noBookings: (botUser) =>
      `You have no active bookings.\n\nBook here: ${SITE_URL}\n\n` +
      `After booking, open:\nhttps://t.me/${botUser}?start=confirm_&lt;booking_id&gt;`,
    cancelPrompt: "Tap the appointment to cancel:",
    noCancel: "No active bookings to cancel.",
    bookLink: `Book your appointment here:\n<a href="${SITE_URL}">${SITE_URL}</a>`,
    hello: `Hello! Tap /start or book on our website:\n${SITE_URL}`,
    masterOnly: "❌ Master only.",
    bookingNotFound: "❌ Booking not found. It may have expired.",
    bookingWasCancelled: "This booking was cancelled. Please book again on our website.",
    cancelledOk: (id) => `✅ Cancelled #${id}`,
    customerCancelledOk: "✅ Your appointment was cancelled.",
    customerCancelledNotify: (day, time) =>
      `Your appointment on <b>${day}</b> at <b>${time}</b> has been cancelled.\n` +
      `Book again: ${SITE_URL}`,
    masterCancelledNotify: (name, day, time, id, by) =>
      `❌ <b>Booking cancelled</b> (${by})\n\n👤 ${name}\n📅 ${day} ${time}\n🆔 #${id}`,
    bookingsTitle: "Bookings",
    noActiveBookings: "📭 No active bookings.",
    cancelHint: "Cancel: /cancel &lt;id&gt; or use ❌ on new booking messages",
    cancelUsage: "Usage: /cancel &lt;booking_id&gt;",
    callbackCancelled: "Cancelled",
    callbackApptCancelled: "Appointment cancelled",
    callbackMasterOnly: "Master only",
    errNotFound: "Booking not found.",
    errAlreadyCancelled: "Already cancelled.",
    errCannotCancel: "You cannot cancel this booking.",
    inlineBook: "Book on website",
  },
  ru: {
    buttons: {
      sharePhone: "📱 Отправить телефон",
      bookWebsite: "📅 Запись на сайте",
      bookOnSite: "Запись на сайте",
    },
    language: {
      choose: "🌐 <b>Выберите язык</b>\n\nO'zbekcha | Русский | English",
      set: "✅ Язык изменён на <b>Русский</b>",
    },
    welcome: (name) =>
      `Добро пожаловать, <b>${name}</b>, в Rida Personal Care Studio ✨\n\n` +
      `Где элегантность встречается с совершенством.\n` +
      `Мы создаём красоту, которая говорит без слов.\n\n` +
      `Выберите действие:\n` +
      `• Записаться на сайте\n` +
      `  <a href="${SITE_URL}">${SITE_URL}</a>\n` +
      `• Свободное время — /free\n\n` +
      `Ваш путь к красоте начинается здесь 🤍\n\n` +
      `<b>Ваши записи</b> — /mybookings\n` +
      `<b>Отмена записи</b> — /cancelbooking\n` +
      `<b>Язык</b> — /language`,
    bookingConfirm: (name, day, time) =>
      `Уважаемая <b>${name}</b>, ваша запись на <b>${day}</b> в <b>${time}</b> подтверждена.\n` +
      `Ждём вас с нетерпением.\n` +
      `Ваш мастер — Фарида. 💖🌝\n\n` +
      `Отмена: /mybookings или /cancelbooking`,
    phoneSaved: (name) =>
      `Спасибо, <b>${name}</b>! Номер сохранён.\n` +
      `При записи на сайте с этим номером подтверждение придёт сюда автоматически. 🤍`,
    help:
      `<b>Команды</b>\n` +
      `/start — Приветствие\n` +
      `/language — Сменить язык\n` +
      `/free — Свободное время\n` +
      `/mybookings — Ваши записи\n` +
      `/cancelbooking — Отменить запись\n` +
      `/bookings — Все записи (мастер)\n` +
      `/cancel &lt;id&gt; — Отмена по ID (мастер)`,
    freeTitle: "Свободное время",
    noSlots: "Свободных слотов нет.",
    myBookingsTitle: "Ваши записи",
    noBookings: (botUser) =>
      `У вас нет активных записей.\n\nЗаписаться: ${SITE_URL}\n\n` +
      `После записи откройте:\nhttps://t.me/${botUser}?start=confirm_&lt;booking_id&gt;`,
    cancelPrompt: "Нажмите на запись для отмены:",
    noCancel: "Нет активных записей для отмены.",
    bookLink: `Записаться здесь:\n<a href="${SITE_URL}">${SITE_URL}</a>`,
    hello: `Здравствуйте! Нажмите /start или запишитесь на сайте:\n${SITE_URL}`,
    masterOnly: "❌ Только для мастера.",
    bookingNotFound: "❌ Запись не найдена.",
    bookingWasCancelled: "Эта запись отменена. Запишитесь снова на сайте.",
    cancelledOk: (id) => `✅ Отменено #${id}`,
    customerCancelledOk: "✅ Ваша запись отменена.",
    customerCancelledNotify: (day, time) =>
      `Ваша запись на <b>${day}</b> в <b>${time}</b> отменена.\n` +
      `Записаться снова: ${SITE_URL}`,
    masterCancelledNotify: (name, day, time, id, by) =>
      `❌ <b>Запись отменена</b> (${by})\n\n👤 ${name}\n📅 ${day} ${time}\n🆔 #${id}`,
    bookingsTitle: "Записи",
    noActiveBookings: "📭 Нет активных записей.",
    cancelHint: "Отмена: /cancel &lt;id&gt; или кнопка ❌ в уведомлении",
    cancelUsage: "Использование: /cancel &lt;booking_id&gt;",
    callbackCancelled: "Отменено",
    callbackApptCancelled: "Запись отменена",
    callbackMasterOnly: "Только мастер",
    errNotFound: "Запись не найдена.",
    errAlreadyCancelled: "Уже отменено.",
    errCannotCancel: "Вы не можете отменить эту запись.",
    inlineBook: "Запись на сайте",
  },
  uz: {
    buttons: {
      sharePhone: "📱 Telefonni ulashish",
      bookWebsite: "📅 Saytda bron qilish",
      bookOnSite: "Saytda bron qilish",
    },
    language: {
      choose: "🌐 <b>Tilni tanlang</b>\n\nO'zbekcha | Русский | English",
      set: "✅ Til <b>O'zbekcha</b> ga o'rnatildi",
    },
    welcome: (name) =>
      `<b>${name}</b>, Rida Personal Care Studio ga xush kelibsiz ✨\n\n` +
      `Nafislik va mukammallik uyg'unligi.\n` +
      `So'zsiz go'zallik yaratamiz.\n\n` +
      `Tanlang:\n` +
      `• Veb-saytimizda bron qiling\n` +
      `  <a href="${SITE_URL}">${SITE_URL}</a>\n` +
      `• Bo'sh vaqtlar — /free\n\n` +
      `Go'zallik safaringiz shu yerdan boshlanadi 🤍\n\n` +
      `<b>Bronlaringiz</b> — /mybookings\n` +
      `<b>Bekor qilish</b> — /cancelbooking\n` +
      `<b>Til</b> — /language`,
    bookingConfirm: (name, day, time) =>
      `Hurmatli <b>${name}</b>, sizning broningiz <b>${day}</b> kuni soat <b>${time}</b> ga qabul qilindi.\n` +
      `Sizni kutamiz.\n` +
      `Ustangiz — Farida. 💖🌝\n\n` +
      `Bekor qilish: /mybookings yoki /cancelbooking`,
    phoneSaved: (name) =>
      `Rahmat, <b>${name}</b>! Raqamingiz saqlandi.\n` +
      `Saytda shu raqam bilan bron qilsangiz, tasdiq avtomatik keladi. 🤍`,
    help:
      `<b>Buyruqlar</b>\n` +
      `/start — Salomlashish\n` +
      `/language — Tilni o'zgartirish\n` +
      `/free — Bo'sh vaqtlar\n` +
      `/mybookings — Bronlaringiz\n` +
      `/cancelbooking — Bekor qilish\n` +
      `/bookings — Barcha bronlar (usta)\n` +
      `/cancel &lt;id&gt; — ID bo'yicha bekor (usta)`,
    freeTitle: "Bo'sh vaqtlar",
    noSlots: "Bo'sh vaqt topilmadi.",
    myBookingsTitle: "Bronlaringiz",
    noBookings: (botUser) =>
      `Faol broningiz yo'q.\n\nBron qilish: ${SITE_URL}\n\n` +
      `Brondan keyin oching:\nhttps://t.me/${botUser}?start=confirm_&lt;booking_id&gt;`,
    cancelPrompt: "Bekor qilish uchun bronni bosing:",
    noCancel: "Bekor qilish uchun faol bron yo'q.",
    bookLink: `Bron qiling:\n<a href="${SITE_URL}">${SITE_URL}</a>`,
    hello: `Salom! /start bosing yoki saytda bron qiling:\n${SITE_URL}`,
    masterOnly: "❌ Faqat usta uchun.",
    bookingNotFound: "❌ Bron topilmadi.",
    bookingWasCancelled: "Bu bron bekor qilindi. Qayta saytda bron qiling.",
    cancelledOk: (id) => `✅ Bekor qilindi #${id}`,
    customerCancelledOk: "✅ Broningiz bekor qilindi.",
    customerCancelledNotify: (day, time) =>
      `<b>${day}</b> soat <b>${time}</b> dagi broningiz bekor qilindi.\n` +
      `Qayta bron: ${SITE_URL}`,
    masterCancelledNotify: (name, day, time, id, by) =>
      `❌ <b>Bron bekor qilindi</b> (${by})\n\n👤 ${name}\n📅 ${day} ${time}\n🆔 #${id}`,
    bookingsTitle: "Bronlar",
    noActiveBookings: "📭 Faol bronlar yo'q.",
    cancelHint: "Bekor: /cancel &lt;id&gt; yoki yangi xabardagi ❌",
    cancelUsage: "Foydalanish: /cancel &lt;booking_id&gt;",
    callbackCancelled: "Bekor qilindi",
    callbackApptCancelled: "Bron bekor qilindi",
    callbackMasterOnly: "Faqat usta",
    errNotFound: "Bron topilmadi.",
    errAlreadyCancelled: "Allaqachon bekor qilingan.",
    errCannotCancel: "Bu bronni bekor qila olmaysiz.",
    inlineBook: "Saytda bron qilish",
  },
};

function normalizeLang(code) {
  if (!code || !MESSAGES[code]) return "en";
  return code;
}

function detectLangFromTelegram(languageCode) {
  const lc = String(languageCode || "").toLowerCase();
  if (lc.startsWith("uz")) return "uz";
  if (lc.startsWith("ru")) return "ru";
  return "en";
}

function msg(lang, key) {
  const parts = key.split(".");
  let v = MESSAGES[normalizeLang(lang)];
  for (const p of parts) v = v[p];
  return v;
}

function formatDayLocalized(dateStr, lang) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString(LOCALES[normalizeLang(lang)] || "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function languageKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🇺🇿 O'zbekcha", callback_data: "lang:uz" },
        { text: "🇷🇺 Русский", callback_data: "lang:ru" },
      ],
      [{ text: "🇺🇸 English", callback_data: "lang:en" }],
    ],
  };
}

function startKeyboard(lang) {
  const b = msg(lang, "buttons");
  return {
    keyboard: [
      [{ text: b.sharePhone, request_contact: true }],
      [{ text: b.bookWebsite }],
    ],
    resize_keyboard: true,
  };
}

function isBookWebsiteButton(text) {
  const t = String(text || "");
  return ["📅 Book on website", "📅 Запись на сайте", "📅 Saytda bron qilish"].includes(t);
}

function getAvailableDayNames(lang) {
  return DAY_NAMES[normalizeLang(lang)] || DAY_NAMES.en;
}

module.exports = {
  SITE_URL,
  MESSAGES,
  normalizeLang,
  detectLangFromTelegram,
  msg,
  formatDayLocalized,
  languageKeyboard,
  startKeyboard,
  isBookWebsiteButton,
  getAvailableDayNames,
};
