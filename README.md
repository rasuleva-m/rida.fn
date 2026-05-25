<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f44ab210-e45a-4425-91fb-d6567b47335e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `.env.local` (or `.env`) and set required env vars:
   - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (for booking notifications)
   - Optional: `APP_URL` (public URL, **no path**; e.g. `https://yourapp.run.app`) to enable Telegram webhook callbacks (Confirm/Cancel buttons)
   - Optional: `FIREBASE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS` to save bookings to Firestore
   - Optional: `FIREBASE_DATABASE_URL` (only needed if you use Realtime Database from the server)
   - Optional: `GEMINI_API_KEY` (if you add Gemini-powered routes)
   - Optional: `VITE_ADMIN_EMAILS` (comma-separated) to allow access to `/admin`
3. Run the app:
   `npm run dev`
