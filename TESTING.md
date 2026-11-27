# ScamLens — Testing checklist

## What is already verified (on this VM, 26 Nov 2026)

- [x] `npm install` — firebase **13.4.0** (`@firebase/ai` 3.1.0), vite **8.3.8**.
  `npm list firebase` reports `firebase@13.4.0`, which is >= 12.5.0.
- [x] Firebase AI Logic API verified against the installed SDK
  (`node_modules/@firebase/ai/dist/ai-public.d.ts`) and the official
  Firebase AI Logic hybrid docs:
  - `getAI(firebaseApp, { backend: new GoogleAIBackend() })`
  - `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams: { promptOptions: { responseConstraint } } })`
  - `getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD, inCloudParams: { model, generationConfig: { responseMimeType: "application/json", responseSchema } } })`
  - `model.initializeDeviceModel(onDownloadProgress)` — must run after a
    user gesture and before `generateContent` for on-device.
  - `result.response.text()`, `result.response.inferenceSource`
    (`on_device` | `in_cloud`, since SDK v12.5.0).
  - Structured output: cloud via `responseMimeType` + `responseSchema`
    (`Schema.object` / `Schema.enumString` / `Schema.number` /
    `Schema.array` helpers); on-device via `responseConstraint`.
  - **Difference from the brief's shorthand:** hybrid `getGenerativeModel`
    takes NO top-level `model` string. The cloud model name lives in
    `inCloudParams.model`; the on-device model has no name (it is Gemini
    Nano via Chrome's Prompt API). The code follows the SDK.
  - Default cloud model in SDK v13 is `gemini-3.5-flash-lite`. This app
    pins `gemini-2.5-flash` explicitly in `src/ai.js` (`CLOUD_MODEL`). If
    that name ever stops resolving, delete the `model:` line in
    `inCloudParams` to fall back to the SDK default.
- [x] `npm run build` passes (static output in `dist/`).
- [x] Smoke test with placeholder config (see below): the app loads, shows
  the setup banner, does not crash, and the Check button explains that
  Firebase is not configured and attempts no inference.

## Smoke test with placeholder config (run on this VM)

1. `npm run build`
2. `npm run preview -- --port 4173` (or `npm run dev`)
3. Open http://localhost:4173/ (preview serves the built app;
   dev serves at http://localhost:5173/)
4. Expect:
   - [ ] Page loads, no console errors, no crash.
   - [ ] Yellow banner visible: "Firebase is not configured yet."
   - [ ] All 4 example buttons fill the textarea.
   - [ ] Clicking **Check this message** shows the setup notice and does
         NOT call any model (check the Network tab: no request to
         googleapis / firebasevertexai / generativelanguage).
   - [ ] History section shows "No checks yet."

## UNVERIFIED — needs Sumadi's device browser

On-device inference CANNOT be verified on this VM: there is no real
Chrome 139+ with Gemini Nano here. Do NOT mark it verified until the
checklist below is done on a real device.

### Device test (Sumadi, Chrome desktop)

1. Use Chrome **139 or newer** on desktop.
2. Open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   and enable it, then relaunch Chrome.
   (Also confirm Gemini Nano is downloaded: open
   `chrome://components` and check "Optimization Guide On Device Model".)
3. In the Firebase console, create/select the project, register a Web
   app, and paste the web config into `src/firebase-config.js`
   (replacing every `TODO-...` value). Do NOT commit real keys.
   - Firebase AI Logic: enable the Firebase AI Logic API; backend is the
     Gemini Developer API (free, no billing).
4. `npm install`, then `npm run dev` and open the app.
5. Expect the setup banner to be GONE.
6. Click each example and press **Check this message**:
   - [ ] Example "Scam (English)" — on-device step shows a verdict
         (expect `scam`, high confidence) with red flags; cloud step
         shows a verdict with reasons + what to do.
   - [ ] Example "Scam (Bahasa Indonesia)" — same, expect `scam`.
   - [ ] Example "Legit (English)" — expect `safe` on both steps.
   - [ ] Example "Legit (Bahasa Indonesia)" — expect `safe` on both steps.
   - [ ] Each result card shows an honest status (`running` → `done`).
   - [ ] If the on-device step fails, the UI must say so honestly
         ("On-device model unavailable in this browser") and the cloud
         step must still run. Record the exact error message.
   - [ ] First on-device run may take a while (model download) and show
         a download percentage.
7. History:
   - [ ] Each check appears in the history list with both verdicts.
   - [ ] Reload the page: history persists (localStorage).
   - [ ] **Clear history** empties the list.
8. Record results here:

| Date / device / Chrome | Example | On-device verdict + conf. | Cloud verdict + conf. | Notes |
| --- | --- | --- | --- | --- |
| _fill in_ | | | | |

## Known limits

- On-device only supports single-turn text generation (no chat) — the
  app only ever calls `generateContent` on the on-device model.
- On-device availability depends on the browser/device (Chrome 139+
  desktop + Gemini Nano download). The app reports unavailability
  honestly instead of faking a result.
- App Check: initialised in every build with `ReCaptchaEnterpriseProvider`
  (Fraud Defense score-based key, since reCAPTCHA Classic is deprecated).
  The debug token is auto-generated ONLY in dev builds
  (`import.meta.env.DEV` guard in `src/ai.js`). No debug token is committed.
