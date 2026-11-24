# Gmail Phishing Detector

A Chrome extension (Manifest V3) that analyzes open Gmail messages for phishing indicators using Google Gemini. 

Originally built for **TCS Tech Day 2026 at JNTUH**, where it won **1st Place in the Cybersecurity domain**.

---

## How It Works

1. **Email Extraction (`extension/popup.js`, `extension/content.js`):** When you click **Check for Phishing** inside an open Gmail thread, the extension injects a script into the active tab to extract the sender address, subject line, and plain-text email body. Nothing is scanned automatically or stored in a database.
2. **Serverless Analysis (`api/analyze.js`):** The extracted payload is sent via `POST` to a Vercel serverless endpoint. The backend prompts Google Gemini (`gemini-3.8-flash`, with automatic fallback to `gemini-3.5-flash-lite` and `gemini-3.6-flash`) and enforces a structured JSON response.
3. **Instant Verdict (`extension/popup.html`):** The popup renders a risk score (`0–100`), a verdict (`Safe`, `Suspicious`, or `Phishing`), and a brief explanation of the detected patterns.

---

## Repository Structure

```text
├── api/
│   └── analyze.js          # Vercel serverless function calling the Gemini API
├── extension/
│   ├── manifest.json       # Chrome Extension Manifest V3 configuration
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Tab validation, Gmail DOM extraction, and API fetch
│   ├── content.js          # Gmail message listener and fallback DOM parsers
│   └── style.css           # Additional extension styles
├── n8n-workflow/
│   └── *.json              # Archived n8n workflow from the original hackathon prototype
├── index.html              # Web demo page for testing the API without installing the extension
├── package.json            # Enables ES module imports for Vercel functions
└── .env.example            # Template for required environment variables
```

---

## Setup & Installation

### 1. Deploy the Backend (Vercel)

1. Fork or clone this repository and import it into [Vercel](https://vercel.com).
2. In your Vercel project dashboard, go to **Settings > Environment Variables** and add:
   * **Name:** `GEMINI_API_KEY`
   * **Value:** Your API key from [Google AI Studio](https://aistudio.google.com/)
3. Deploy the project and copy your live domain (e.g., `https://your-project.vercel.app`).

### 2. Load the Chrome Extension

1. Open `extension/popup.js` and update `N8N_WEBHOOK_URL` with your Vercel endpoint:
   ```javascript
   const N8N_WEBHOOK_URL = "https://your-project.vercel.app/api/analyze";
   ```
2. Open `extension/manifest.json` and add your Vercel domain under `host_permissions`:
   ```json
   "host_permissions": [
     "https://mail.google.com/*",
     "https://your-project.vercel.app/*"
   ]
   ```
3. Open `chrome://extensions` in Google Chrome.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the `extension/` folder.
6. Open any email in Gmail, click the extension icon, and select **Check for Phishing**.

---

## Architecture Note

The initial prototype routed webhook requests through **n8n Cloud** (`n8n-workflow/`). After the trial workspace expired, the backend was migrated to a stateless **Vercel Serverless Function** (`api/analyze.js`) to eliminate webhook downtime and keep the API key isolated from client-side extension code.