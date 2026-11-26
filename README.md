# ScamLens

**Check a suspicious message before you trust it. On your device first, in the cloud second.**

ScamLens is a web app for the **#BuildHybridAI 2026** hackathon. It checks whether a message looks like a scam or a hoax, using **Firebase AI Logic** hybrid inference: a fast, private first pass on-device with **Gemini Nano**, and a deeper second pass in the cloud with **Gemini `gemini-2.5-flash`**, run automatically right after the on-device step on the same click.

- **Live demo:** https://apiznk.github.io/scam-lens/
- **Repository:** https://github.com/apiznk/scam-lens
- **License:** Apache License 2.0 (see [LICENSE](LICENSE))
- **Cost:** free tier only. No paid services, no spending.

> **Status note:** the Firebase web config in `src/firebase-config.js` is still a placeholder (every value is a `TODO`). It will be filled in with the config of a Firebase project created by the project owner. Until then, no check can run at all: every inference goes through Firebase AI Logic, so the app needs a real Firebase project config to initialise it, even for the on-device step. The on-device step still runs locally on the device (the message content never leaves the device), but it cannot start without that config. See [Firebase setup](#firebase-setup).

## The problem

Scam and hoax messages reach everyone: fake job offers on WhatsApp, "investment" pitches on Telegram, fake airdrop announcements, parcel-delivery links, and account-warning texts. The usual ways to check them are slow or unsafe:

- Searching the web takes time, and by then the message may already have done its damage.
- Forwarding the message to a checker service means sending a private, sometimes sensitive message to a server you do not control.
- Most people simply guess, and scammers count on that.

## The solution

ScamLens checks a message in **two steps, privacy first**:

1. **Step 1 — On-device (Gemini Nano).** The message is analysed entirely in your browser by Gemini Nano, running on your device through Firebase AI Logic. Nothing leaves your device. You get a fast first verdict: `safe`, `suspicious`, or `scam`, with a confidence score (0–100) and a list of red flags.
2. **Step 2 — Cloud (Gemini `gemini-2.5-flash`).** Right after the on-device step, the same click sends the message to the cloud Gemini model, also through Firebase AI Logic, for a deeper read with reasons and concrete next steps. This step is automatic, not a separate opt-in: tapping **Check this message** runs both steps in sequence, and the message leaves the device for the cloud step. If on-device inference is unavailable, the cloud step still runs.

Each step shows its own label in the UI ("On-device" or "Cloud"), so you always know which engine produced which verdict. If on-device inference is not available on your machine, the app says so honestly in the UI instead of pretending, and you can still continue to the cloud step.

## Who it is for

Anyone who gets suspicious messages and wants a quick second opinion before replying, clicking, or sending money: everyday WhatsApp and Telegram users, job seekers getting "too good to be true" offers, and crypto users seeing fake airdrop pitches.

## Features

- Two-step hybrid check: on-device Gemini Nano first, cloud Gemini `gemini-2.5-flash` second. Both steps run on one click of the single **Check this message** button.
- Structured JSON output from both steps: a verdict (`safe` / `suspicious` / `scam`) and a confidence score (0–100), plus red flags from the on-device step and reasons plus what-to-do steps from the cloud step.
- Works in English and Indonesian, with ready-made sample messages for both languages (scam and legit examples).
- Check history saved in `localStorage`, so you can review past checks without an account.
- No account, no sign-in, no server of our own. Your messages are never stored anywhere except your own browser's history.
- Static build, deployable to GitHub Pages.

## Quick start

### Requirements

- **Google Chrome Desktop 139+** (on-device Gemini Nano is a Chrome feature).
- The Prompt API flag enabled: open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and set it to **Enabled**, then relaunch Chrome.
- Node.js 18+ and npm (for local development only).

### Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal (usually `http://localhost:5173/scam-lens/`, because `vite.config.js` sets `base: '/scam-lens/'`).

### Build and preview

```bash
npm run build    # produces the static site in dist/
npm run preview  # serves the production build locally
```

## Firebase setup

The app needs a Firebase project for both steps: Firebase AI Logic must be initialised with a real project config before any inference can run, including the on-device step. The on-device step still runs locally on the device (the message content never leaves the device), but it cannot start without that config. App Check is optional in the current code (see step 4).

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) and create a new project (free Spark plan is enough).
2. In the project, add a **Web app** (Project settings → Your apps → Web).
3. Copy the web app config object Firebase shows you.

### 2. Fill in the config

Open `src/firebase-config.js` and replace **every** `TODO` value with the values from your Firebase web app config (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Do not leave any `TODO` in place.

### 3. Enable Firebase AI Logic

In the Firebase console, enable **Firebase AI Logic** for the project (the Gemini API backing it is billed on the free tier; stay within the free quota). No other Firebase products are required.

### 4. App Check (optional, dev only in the current code)

App Check is **not** initialised by the current code in production builds: `src/ai.js` only initialises it in local dev builds (`import.meta.env.DEV`), and only after a reCAPTCHA v3 site key is pasted into `RECAPTCHA_SITE_KEY` in that file. Until then the app runs without App Check. To enable it for local development:

- In the Firebase console, go to **Build → App Check** and register the web app with the reCAPTCHA v3 provider, then paste the site key into `RECAPTCHA_SITE_KEY` in `src/ai.js`.
- Run the app locally (`npm run dev`). On first load, Firebase prints an App Check debug token in the browser console; copy it into the Firebase console under **App Check → Manage debug tokens**.
- Reload the app; local development requests are now accepted.
- Production (GitHub Pages) currently runs without App Check; wiring the reCAPTCHA v3 provider into the production build is a follow-up, not part of this release.

> **⚠️ Never commit secrets.** Never commit an App Check debug token, a service-account key, or any `.env` file to a public repo. Debug tokens are for your own machine only; anyone who has one can impersonate your app. If a token ever leaks, delete it in the Firebase console immediately and generate a new one.

## How Firebase AI Logic is used

All model inference in ScamLens goes through **Firebase AI Logic**. There are no direct calls to any other model API.

- The app initialises Firebase AI Logic with `getAI()` using the `GoogleAIBackend`.
- **Step 1 (on-device):** a model is created with inference mode `ONLY_ON_DEVICE`, which runs **Gemini Nano** locally in Chrome. The message never leaves the device. The on-device model has no name: it is Gemini Nano via Chrome's Prompt API.
- **Step 2 (cloud):** a model is created with inference mode `ONLY_IN_CLOUD`, which runs **Gemini `gemini-2.5-flash`** in the cloud. The model name is pinned explicitly in `inCloudParams.model` in `src/ai.js` (the SDK v13 default is `gemini-3.5-flash-lite`). This step runs automatically right after the on-device step, as part of the same **Check this message** click.
- Hybrid `getGenerativeModel()` takes no top-level `model` string: the cloud model name lives in `inCloudParams.model`, and the on-device model has no name (see above). This follows the installed SDK (firebase 13.4.0, `@firebase/ai` 3.1.0).
- Both steps ask the model for a **structured JSON** verdict: verdict (`safe` / `suspicious` / `scam`) and confidence (0–100) in both, plus `red_flags` from the on-device step and `reasons` + `what_to_do` from the cloud step, so the UI can render the result reliably instead of parsing free-form text.
- If Gemini Nano is unavailable (unsupported Chrome version, flag off, or model not downloaded yet), the UI shows that clearly and the user can still use the cloud step.

## Architecture

Vite + vanilla JavaScript. No frontend framework, no backend server of our own.

```
scam-lens/
├── index.html                 # App shell and UI
├── src/
│   ├── main.js                # UI logic and check flow
│   ├── ai.js                  # All Firebase AI Logic calls
│   └── firebase-config.js     # Firebase web config (TODO placeholders)
├── vite.config.js             # Vite config, base '/scam-lens/' for GitHub Pages
└── dist/                      # Static build output (generated by npm run build)
```

### Check flow

1. The user pastes a message (or taps a sample message) and taps **Check this message** — the app's single Check button.
2. `src/ai.js` runs the on-device Gemini Nano model (`ONLY_ON_DEVICE`) and returns a structured JSON verdict (`verdict`, `confidence` 0–100, `red_flags`), shown with an "On-device" label. If Gemini Nano is unavailable in the browser, the card says so honestly and the flow continues to the cloud step.
3. The same click then runs the cloud Gemini model (`gemini-2.5-flash`, `ONLY_IN_CLOUD`) and returns a structured JSON verdict (`verdict`, `confidence` 0–100, `reasons`, `what_to_do`), shown with a "Cloud" label. The message leaves the device for this step.
4. Each completed check is saved to `localStorage` history, which the user can browse and clear.

### Example output

The two steps return different detail fields (example):

```json
// Step 1 — on-device
{
  "verdict": "scam",
  "confidence": 87,
  "red_flags": ["urgency pressure", "request to send money first"]
}

// Step 2 — cloud
{
  "verdict": "scam",
  "confidence": 92,
  "reasons": ["The message creates false urgency.", "A legitimate employer never asks for an upfront fee."],
  "what_to_do": ["Do not send money or click the link.", "Verify the job through the company's official channel."]
}
```

Possible verdicts are `safe`, `suspicious`, and `scam`. Confidence is a number from 0 to 100.

## Sample messages

The app ships with ready-made examples so anyone can try it in seconds, in both languages and both directions:

- **Scam (English):** a fake remote job offer paying $4,500/month, asking for a $50 "registration fee" in crypto before starting.
- **Legit (English):** a dental clinic appointment reminder (check-up tomorrow at 10:30 AM with Dr. Lee), asking only to reply YES to confirm.
- **Scam (Indonesian):** a fake Binance airdrop pitch promising 500 USDT if you connect your wallet and claim within 24 hours.
- **Legit (Indonesian):** a neighbourhood (RT 05) cleaning-fee notice for November, Rp25.000, payable by bank transfer to the treasurer.

## Deployment

The app is deployed to **GitHub Pages** from this same repository. `vite.config.js` sets `base: '/scam-lens/'` so the built site works under the repository path.

Live site: https://apiznk.github.io/scam-lens/

To deploy: push to the repository and let the GitHub Pages workflow (or manual `dist/` publish) serve the static build.

## Privacy

- **On-device step:** your message never leaves your device. (It still needs a real Firebase project config to initialise Firebase AI Logic; see [Firebase setup](#firebase-setup).)
- **Cloud step:** your message is sent to Google's Gemini API through Firebase AI Logic, as step 2 of the same **Check this message** click. It is not sent anywhere else.
- **History:** stored only in your browser's `localStorage`. Clearing it in the app (or clearing browser data) deletes it.
- **No tracking, no analytics, no account.**

## Limitations

- ScamLens gives an AI second opinion, not a guarantee. A "safe" verdict does not prove a message is safe; always verify through an official channel before sending money or personal data.
- On-device inference needs Chrome Desktop 139+ with the Prompt API flag enabled and the Gemini Nano model downloaded; on other browsers or machines the on-device step will report itself as unavailable.
- The cloud step needs a filled-in Firebase config and an internet connection.
- Verdict quality depends on the models; new scam wordings can fool any checker.

## License

Apache License 2.0. See [LICENSE](LICENSE).
