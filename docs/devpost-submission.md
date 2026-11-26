# ScamLens — Devpost Submission Material

**Hackathon:** #BuildHybridAI 2026
**Platform:** Web / Chrome

> **Note:** the repository https://github.com/apiznk/scam-lens did not exist yet when this document was written. Create the repo first, push the code, and verify the link before submitting. The demo video link below is a placeholder until the video is recorded and uploaded to YouTube.

---

## Project title

ScamLens

## Tagline

Check a suspicious message before you trust it. On your device first, in the cloud second.

## Links

- **Repository:** https://github.com/apiznk/scam-lens
- **Live demo:** https://apiznk.github.io/scam-lens/
- **Demo video:** [TO BE FILLED AFTER YOUTUBE UPLOAD]

---

## Description

### Inspiration

Scam and hoax messages reach everyone. A fake job offer on WhatsApp. An "investment" pitch on Telegram. A fake airdrop promising free tokens if you connect your wallet. A parcel-delivery text with a strange link. The usual ways to check them are slow, or they ask you to forward a private message to a server you do not control. Most people just guess, and scammers count on that. We wanted a checker that is fast, private by default, and honest about what it knows.

### What it does

ScamLens is a web app that checks whether a pasted message looks like a scam or a hoax. You paste the message, tap **Check this message**, and you get a verdict (`safe`, `suspicious`, or `scam`) with a confidence score (0–100): red flags from the on-device step, and reasons plus what-to-do steps from the cloud step. It works in English and Indonesian, ships with ready-made sample messages (scam and legit, in both languages), and keeps a check history in your browser, with no account and no sign-in.

### How Firebase AI Logic is used

All inference goes through **Firebase AI Logic**, using `getAI()` with the `GoogleAIBackend`. There are no direct calls to any other model API.

The check runs in two steps:

1. **On-device (Gemini Nano).** The first step uses inference mode `ONLY_ON_DEVICE`, so Gemini Nano analyses the message entirely in Chrome on the user's device. Nothing leaves the device, and the result comes back in seconds.
2. **Cloud (Gemini `gemini-2.5-flash`).** The second step uses inference mode `ONLY_IN_CLOUD`, running Gemini `gemini-2.5-flash` (pinned explicitly in `inCloudParams.model` in `src/ai.js`; the SDK v13 default is `gemini-3.5-flash-lite`) in the cloud for a deeper read. It runs automatically right after the on-device step, as part of the same **Check this message** click: that click is the moment the message leaves the device. There is no separate cloud button.

Both steps return a structured JSON verdict — verdict (`safe` / `suspicious` / `scam`) and confidence (0–100) in both, plus `red_flags` from the on-device step and `reasons` + `what_to_do` from the cloud step — and each result is labelled in the UI with the engine that produced it ("On-device" or "Cloud"), so users always know which answer came from where. If on-device inference is unavailable, the app says so honestly in the UI instead of pretending, and the cloud step still runs. Hybrid `getGenerativeModel()` takes no top-level `model` string: the cloud model name lives in `inCloudParams.model`, and the on-device model has no name (Gemini Nano via Chrome's Prompt API). Firebase App Check is wired only for local dev builds (reCAPTCHA v3 provider, and only once a site key is pasted in); the production build currently runs without App Check.

### Value proposition

Privacy first, cloud power when you need it. The fast check never exposes your message to anyone. The deeper check runs automatically as step 2 of the same click, and the UI labels each result with the engine that produced it, so the user always knows which answer came from where. For everyday users, that means a second opinion in seconds before replying, clicking, or sending money, without handing a private message to a stranger's server.

---

## How we built it

ScamLens is built with **Vite + vanilla JavaScript**, with no frontend framework and no backend server of our own. The UI and check flow live in `src/main.js`; all Firebase AI Logic calls live in `src/ai.js`; the Firebase web config lives in `src/firebase-config.js`.

We started from the Firebase AI Logic hybrid inference pattern: one model configured `ONLY_ON_DEVICE` for Gemini Nano, one configured `ONLY_IN_CLOUD` for Gemini `gemini-2.5-flash` (pinned in `inCloudParams.model`), both asked for structured JSON output so the UI can render verdicts reliably. A single **Check this message** button runs both steps in sequence. Check history is stored in `localStorage`. The build is fully static (`npm run build` outputs to `dist/`), and `vite.config.js` sets `base: '/scam-lens/'` so the site deploys cleanly to GitHub Pages at https://apiznk.github.io/scam-lens/.

Everything runs on the free tier: the Firebase Spark plan, GitHub Pages hosting, and no paid services anywhere.

## Challenges we ran into

- **On-device availability is not guaranteed.** Gemini Nano needs Chrome Desktop 139+ with the Prompt API flag enabled and the model downloaded. We had to design the UI to detect that honestly and degrade gracefully, instead of silently failing or faking a result.
- **Two engines, one experience.** The on-device and cloud steps share the verdict and confidence fields but return different detail fields (`red_flags` vs `reasons` + `what_to_do`), and they disagree sometimes (a polished scam can look "suspicious" on-device and clearer in the cloud). Presenting both labels side by side, without hiding the disagreement, took deliberate UI work.
- **Structured output from two different models.** Getting both Gemini Nano and cloud Gemini to return the same JSON shape reliably meant writing careful prompts and validating the shape before rendering.
- **Privacy as a real constraint, not a slogan.** The message only leaves the device for the cloud step, which runs as step 2 of the single Check click — there is no separate cloud button, so the UI has to make that clear instead of implying a separate opt-in tap.

## What's next

- **Browser extension:** check a message in place on WhatsApp Web or Telegram Web, without copy-pasting.
- **More languages:** extend beyond English and Indonesian, starting with the languages most common in regional scam traffic.
- **Smarter history:** let users flag wrong verdicts, so the app can learn which scam patterns are trending.
- **Shareable verdicts:** a one-tap way to warn friends and family about a scam message, without sharing the message itself.
- **Offline-first polish:** clearer on-device readiness states (model downloading, model ready) so first-time users are never confused.

---

## Note

Submitting on Devpost requires Sumadi's Devpost account. The repo link and the video link above must be verified as live before the submission is sent.
