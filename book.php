<?php
/**
 * Rida.FN Nail Studio — Website Booking API
 * Accepts JSON POST requests and saves bookings to the shared data store.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Use Railway API (bot.ts) instead — do not store tokens in this file.
define('BOT_TOKEN', getenv('BOT_TOKEN') ?: '');
define('ADMIN_CHAT_ID', getenv('MASTER_CHAT_ID') ?: '');
define('DATA_DIR', __DIR__ . '/data');
define('DATA_FILE', DATA_DIR . '/appointments.json');
define('WORK_START', 10);
define('WORK_END', 19);

@mkdir(DATA_DIR, 0755, true);

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true) ?? [];
if (empty($body)) {
    $body = $_POST;
}

$name    = trim($body['name'] ?? '');
$phone   = trim($body['phone'] ?? '');
$service = trim($body['service'] ?? '');
$date    = trim($body['date'] ?? '');
$time    = trim($body['time'] ?? '');

if (!$name || !$phone || !$service || !$date || !$time) {
    respond(false, 'All fields are required.');
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    respond(false, 'Invalid date format. Use YYYY-MM-DD.');
}

if (!preg_match('/^\d{2}:00$/', $time)) {
    respond(false, 'Invalid time format. Use HH:00.');
}

if ($date < date('Y-m-d')) {
    respond(false, 'Cannot book a date in the past.');
}

$hour = (int) substr($time, 0, 2);
if ($hour < WORK_START || $hour >= WORK_END) {
    respond(false, sprintf('Working hours are %02d:00 – %02d:00.', WORK_START, WORK_END));
}

$booked = getBookedSlots($date);
if (in_array($time, $booked, true)) {
    respond(false, 'This time slot is already taken. Please choose another time.');
}

$booking = [
    'id'         => uniqid('web_', true),
    'source'     => 'website',
    'chat_id'    => null,
    'name'       => $name,
    'phone'      => $phone,
    'service'    => $service,
    'date'       => $date,
    'time'       => $time,
    'status'     => 'confirmed',
    'created_at' => date('Y-m-d H:i:s'),
];

saveBooking($booking);

if (ADMIN_CHAT_ID) {
    $displayDate = (new DateTime($date))->format('D, d M Y');
    $msg = "🔔 *New Website Booking!*\n\n"
         . "👤 {$name}\n"
         . "📱 {$phone}\n"
         . "💅 {$service}\n"
         . "📅 {$displayDate}\n"
         . "🕐 {$time}\n"
         . "🆔 `{$booking['id']}`";
    tgMessage(ADMIN_CHAT_ID, $msg);
}

respond(true, 'Booking confirmed!', ['booking_id' => $booking['id']]);

function getBookedSlots(string $date): array
{
    $slots = [];
    foreach (loadAppointments() as $a) {
        if (($a['date'] ?? '') === $date && ($a['status'] ?? '') !== 'cancelled') {
            $slots[] = $a['time'];
        }
    }
    return $slots;
}

function loadAppointments(): array
{
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    return json_decode(file_get_contents(DATA_FILE), true) ?? [];
}

function saveBooking(array $booking): void
{
    $all = loadAppointments();
    $all[] = $booking;
    file_put_contents(DATA_FILE, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function tgMessage(string $chatId, string $text): void
{
    $url = 'https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage';
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['chat_id' => $chatId, 'text' => $text, 'parse_mode' => 'Markdown']),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

function respond(bool $ok, string $message, array $extra = []): never
{
    http_response_code($ok ? 200 : 422);
    echo json_encode(array_merge(['success' => $ok, 'message' => $message], $extra));
    exit;
}
