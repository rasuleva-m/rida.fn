/**
 * RIDA.FN — Telegram bot + booking API (deploy on Railway)
 *
 * Env: BOT_TOKEN, MASTER_CHAT_ID, PORT, ALLOWED_ORIGINS (comma-separated)
 * Optional: DATA_FILE — full path to JSON store
 * On Railway with a volume, set mount path to /app/data (see DEPLOY-RAILWAY.md)
 */

import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";
const MASTER_CHAT_ID = process.env.MASTER_CHAT_ID ?? "";
const PORT = Number(process.env.PORT) || 3000;

function resolveDataFile(): string {
  if (process.env.DATA_FILE) return process.env.DATA_FILE;
  const volumeMount = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  const dataDir = volumeMount || path.join(process.cwd(), "data");
  return path.join(dataDir, "bookings.json");
}

const DATA_FILE = resolveDataFile();

function ensureDataDir(): void {
  const dir = path.dirname(DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });
}

const WORKING_HOURS: string[] = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00",
];
const DAY_OFF: number[] = [0];

const defaultOrigins = [
  "https://gen-lang-client-0122413605.web.app",
  "http://localhost:5173",
  "http://localhost:3000",
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? defaultOrigins.join(","))
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

interface Booking {
  id: string;
  fullName: string;
  phoneNumber: string;
  service: string;
  date: string;
  time: string;
  status: "confirmed" | "cancelled";
  source: "website" | "telegram";
  bookedAt: string;
}

interface BookingRequest {
  fullName?: string;
  phoneNumber?: string;
  name?: string;
  phone?: string;
  service: string;
  date: string;
  time: string;
}

ensureDataDir();
let bookings: Booking[] = loadBookings();

function loadBookings(): Booking[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load bookings:", e);
    return [];
  }
}

function saveBookings(): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function isSlotTaken(date: string, time: string): boolean {
  return bookings.some(
    (b) =>
      b.date === date &&
      b.time === time &&
      b.status !== "cancelled"
  );
}

function getFreeSlots(date: string): string[] {
  const taken = bookings
    .filter((b) => b.date === date && b.status !== "cancelled")
    .map((b) => b.time);
  return WORKING_HOURS.filter((h) => !taken.includes(h));
}

function getAvailableDays(daysAhead = 14) {
  const result: { date: string; dayName: string; freeSlots: string[] }[] = [];
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];

  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const dayOfWeek = d.getDay();
    if (DAY_OFF.includes(dayOfWeek)) continue;

    const dateStr = toDateString(d);
    const freeSlots = getFreeSlots(dateStr);
    if (freeSlots.length > 0) {
      result.push({
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        freeSlots,
      });
    }
  }
  return result;
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeTime(time: string): string | null {
  const t = time.trim();
  const m24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m24) {
    const h = m24[1].padStart(2, "0");
    const min = m24[2];
    if (min !== "00") return null;
    return `${h}:${min}`;
  }
  const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const min = m12[2];
    const ampm = m12[3].toUpperCase();
    if (min !== "00") return null;
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
  }
  return null;
}

function parseBody(req: Partial<BookingRequest>) {
  const fullName = (req.fullName ?? req.name ?? "").trim();
  const phoneNumber = (req.phoneNumber ?? req.phone ?? "").trim();
  const service = (req.service ?? "").trim();
  const date = (req.date ?? "").trim();
  const time = normalizeTime(req.time ?? "");
  return { fullName, phoneNumber, service, date, time };
}

function formatBookingsList(): string {
  const active = bookings.filter((b) => b.status !== "cancelled");
  if (active.length === 0) return "📭 No active bookings.";

  const sorted = [...active].sort((a, b) => {
    const da = new Date(`${a.date}T${a.time}`);
    const db = new Date(`${b.date}T${b.time}`);
    return da.getTime() - db.getTime();
  });

  return sorted
    .map(
      (b, i) =>
        `${i + 1}. 👤 *${b.fullName}*\n` +
        `   📞 ${b.phoneNumber}\n` +
        `   💅 ${b.service}\n` +
        `   📅 ${b.date}  ⏰ ${b.time}\n` +
        `   🆔 #${b.id}`
    )
    .join("\n\n");
}

function formatFreeDays(days: ReturnType<typeof getAvailableDays>): string {
  if (days.length === 0) return "😔 No free slots in the next 14 days.";
  return days
    .map(
      (d) =>
        `📅 *${d.dayName}, ${d.date}*\n` +
        `⏰ Free: ${d.freeSlots.join(" | ")}`
    )
    .join("\n\n");
}

if (!BOT_TOKEN || !MASTER_CHAT_ID) {
  console.error(
    "Missing BOT_TOKEN or MASTER_CHAT_ID. Set them in Railway Variables."
  );
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from?.first_name ?? "there";
  const site = "https://gen-lang-client-0122413605.web.app";
  bot.sendMessage(
    chatId,
    `✨ *Welcome, ${name}!* ✨\n\n` +
      `*RIDA.FN* nail studio bot.\n\n` +
      `🌐 Book online: ${site}\n\n` +
      `*Commands:*\n` +
      `/free — Available times\n` +
      `/help — Help`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🆘 *Help*\n\n` +
      `/start — Start\n` +
      `/free — Free slots (next 14 days)\n` +
      `/bookings — All bookings *(master only)*\n` +
      `/cancel <ID> — Cancel booking *(master only)*`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/free/, (msg) => {
  const days = getAvailableDays(14);
  bot.sendMessage(
    msg.chat.id,
    `✅ *Available times:*\n\n${formatFreeDays(days)}`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/bookings/, (msg) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(MASTER_CHAT_ID)) {
    bot.sendMessage(chatId, "❌ Master only.");
    return;
  }
  bot.sendMessage(
    chatId,
    `📋 *Bookings:*\n\n${formatBookingsList()}`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/cancel (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(MASTER_CHAT_ID)) {
    bot.sendMessage(chatId, "❌ Master only.");
    return;
  }
  const id = match?.[1]?.trim();
  const idx = bookings.findIndex((b) => b.id === id);
  if (idx === -1) {
    bot.sendMessage(chatId, `❌ Booking #${id} not found.`);
    return;
  }
  const removed = bookings[idx];
  bookings[idx] = { ...removed, status: "cancelled" };
  saveBookings();
  bot.sendMessage(
    chatId,
    `✅ Cancelled *${removed.fullName}* (${removed.date} ${removed.time}).`,
    { parse_mode: "Markdown" }
  );
});

bot.on("message", (msg) => {
  const text = msg.text ?? "";
  if (text.startsWith("/")) return;
  bot.sendMessage(
    msg.chat.id,
    "Thanks! For booking use our website or /free for available times."
  );
});

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "RIDA.FN Booking API",
    bookingsCount: bookings.filter((b) => b.status !== "cancelled").length,
  });
});

app.get("/api/available", (_req: Request, res: Response) => {
  res.json({
    success: true,
    workingHours: WORKING_HOURS,
    availableDays: getAvailableDays(14),
  });
});

app.get("/api/available/:date", (req: Request, res: Response) => {
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: "Invalid date format." });
  }
  res.json({ success: true, date, freeSlots: getFreeSlots(date) });
});

app.post("/api/booking", (req: Request, res: Response) => {
  const { fullName, phoneNumber, service, date, time } = parseBody(
    req.body as BookingRequest
  );

  if (!fullName || !phoneNumber || !service || !date || !time) {
    return res.status(400).json({
      success: false,
      message: "All fields are required (name, phone, service, date, time).",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Invalid date. Use YYYY-MM-DD.",
    });
  }

  if (!WORKING_HOURS.includes(time)) {
    return res.status(400).json({
      success: false,
      message: `Choose a time between ${WORKING_HOURS[0]} and ${WORKING_HOURS[WORKING_HOURS.length - 1]}.`,
      freeSlots: getFreeSlots(date),
    });
  }

  const requestedDateTime = new Date(`${date}T${time}:00`);
  if (requestedDateTime < new Date()) {
    return res.status(400).json({
      success: false,
      message: "Cannot book a past date or time.",
    });
  }

  if (isSlotTaken(date, time)) {
    return res.status(409).json({
      success: false,
      message: `Sorry, ${date} at ${time} is already booked.`,
      freeSlots: getFreeSlots(date),
      availableDays: getAvailableDays(7),
    });
  }

  const newBooking: Booking = {
    id: Date.now().toString(36),
    fullName,
    phoneNumber,
    service,
    date,
    time,
    status: "confirmed",
    source: "website",
    bookedAt: new Date().toISOString(),
  };

  bookings.push(newBooking);
  saveBookings();

  const masterMsg =
    `🔔 *NEW BOOKING — RIDA.FN*\n\n` +
    `👤 *${newBooking.fullName}*\n` +
    `📞 \`${newBooking.phoneNumber}\`\n` +
    `💅 ${newBooking.service}\n` +
    `📅 ${newBooking.date}\n` +
    `⏰ ${newBooking.time}\n` +
    `🆔 #${newBooking.id}`;

  bot
    .sendMessage(MASTER_CHAT_ID, masterMsg, { parse_mode: "Markdown" })
    .catch((err) => console.error("Telegram notify failed:", err));

  return res.status(200).json({
    success: true,
    message: `Booked for ${newBooking.date} at ${newBooking.time}. We will confirm shortly.`,
    booking: {
      id: newBooking.id,
      fullName: newBooking.fullName,
      service: newBooking.service,
      date: newBooking.date,
      time: newBooking.time,
    },
  });
});

app.listen(PORT, "0.0.0.0", () => {
  const volume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  console.log(`✅ API on port ${PORT}`);
  console.log(`✅ Telegram bot polling`);
  console.log(`✅ CORS: ${allowedOrigins.join(", ")}`);
  console.log(`✅ Bookings file: ${DATA_FILE}`);
  console.log(
    volume
      ? `✅ Railway volume mounted at ${volume}`
      : `⚠️  No Railway volume — bookings reset on redeploy unless you add one`
  );
});
