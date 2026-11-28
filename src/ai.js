// ScamLens — all AI inference goes through Firebase AI Logic only.
// No other model API is called directly from this app.
//
// Backend: Gemini Developer API (free, no billing), via GoogleAIBackend.
// Two hybrid models, both created with getGenerativeModel():
//   - On-device: mode InferenceMode.ONLY_ON_DEVICE (Gemini Nano in Chrome).
//     Single-turn generateContent only, structured JSON via
//     onDeviceParams.promptOptions.responseConstraint.
//   - Cloud: mode InferenceMode.ONLY_IN_CLOUD, cloud model named in
//     inCloudParams.model, structured JSON via
//     inCloudParams.generationConfig { responseMimeType, responseSchema }.
//
// API verified against the installed SDK (firebase 13.4.0, @firebase/ai
// 3.1.0) and the official Firebase AI Logic hybrid docs:
//   - getGenerativeModel(ai, { mode, inCloudParams, onDeviceParams })
//     takes NO top-level `model` string for hybrid models; the cloud model
//     name lives in inCloudParams.model, the on-device model has no name
//     (it is Gemini Nano via Chrome's Prompt API).
//   - Default cloud model in SDK v13 is gemini-3.5-flash-lite; we pin
//     gemini-3.5-flash-lite explicitly below. It previously pinned
//     gemini-2.5-flash, but Google deprecated that model on 2 Nov 2026
//     (retired 1 Dec 2026, requests auto-routed to gemini-3.5-flash-lite).
//     If this name ever stops resolving, delete the `model` line in
//     `inCloudParams` to fall back to the SDK default.
//   - initializeDeviceModel() must run after a user gesture (the Check
//     button click) and before generateContent on the on-device model.
//   - result.response.inferenceSource is 'on_device' | 'in_cloud'
//     (available since JS SDK v12.5.0).

import { initializeApp } from 'firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  Schema,
} from 'firebase/ai';
import { firebaseConfig } from './firebase-config.js';

// Cloud-hosted Gemini model for the ONLY_IN_CLOUD step.
// Free tier on the Gemini Developer API, no billing required.
export const CLOUD_MODEL = 'gemini-3.5-flash-lite';

// ---------------------------------------------------------------------------
// Config check
// ---------------------------------------------------------------------------

const PLACEHOLDER_PREFIX = 'TODO-';

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(
    (value) =>
      typeof value === 'string' &&
      value.trim().length > 0 &&
      !value.startsWith(PLACEHOLDER_PREFIX),
  );
}

// ---------------------------------------------------------------------------
// Firebase init (lazy, only after the config check passes)
// ---------------------------------------------------------------------------

let app = null;
let ai = null;
let appCheckInitPromise = null;

// TEMPORARY DIAGNOSTIC (28 Nov 2026, App Check 401 investigation):
// tracks whether App Check initialised and whether a token could be
// fetched, so the live page can show it in the UI. Remove before
// submission once the 401 is fixed.
let appCheckInstance = null;
let appCheckInitError = null;
let appCheckTokenProbe = null; // { ok: true } | { ok: false, error: string } | null (pending)

export function getAppCheckDiagnostics() {
  return {
    initialised: !!appCheckInstance,
    initError: appCheckInitError,
    tokenProbe: appCheckTokenProbe,
  };
}

// reCAPTCHA site key for App Check. Registered 26 Nov 2026 as a
// score-based key in Google Cloud Fraud Defense ("scamlens-web").
// reCAPTCHA Classic is deprecated, so the Enterprise provider below is
// required; ReCaptchaV3Provider does NOT match this key. A site key is a
// public identifier, not a secret. Never commit a debug token.
const RECAPTCHA_SITE_KEY = '6Lc2wjMuAAAAAGdcWqPgiS1xr0xL7m8N1hbtpRl0';

function initAppCheck(firebaseApp) {
  // Memoised: App Check is initialised once, and getAIInstance() awaits
  // this before creating the AI instance. Firebase requires App Check to
  // be initialised BEFORE any other Firebase service, so the AI instance
  // picks up a working App Check provider. Previously this ran
  // fire-and-forget while getAI() ran immediately, so the AI instance
  // could capture a not-yet-registered provider and cloud calls went out
  // without a token, which the backend rejected with 401 even though a
  // token could be fetched fine (proven by the probe below).
  if (appCheckInitPromise) return appCheckInitPromise;
  if (!RECAPTCHA_SITE_KEY) {
    console.info(
      '[ScamLens] App Check not configured (no reCAPTCHA site key); running without App Check.',
    );
    appCheckInitPromise = Promise.resolve();
    return appCheckInitPromise;
  }
  appCheckInitPromise = import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider, getToken }) => {
      // `true` makes the SDK auto-generate a debug token for this browser
      // and print it in the console. That token is for local dev only:
      // never commit it, never paste it into a production build.
      if (import.meta.env.DEV) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      appCheckInstance = initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.info('[ScamLens] App Check initialised.');
      // Probe a token right away: if the exchange fails, the error
      // surfaces here (and in the UI diagnostics) instead of hiding
      // behind the cloud call's generic 401.
      return getToken(appCheckInstance, false);
    })
    .then((tokenResult) => {
      appCheckTokenProbe =
        tokenResult && tokenResult.token
          ? { ok: true }
          : { ok: false, error: 'empty token' };
    })
    .catch((err) => {
      if (!appCheckInstance) {
        appCheckInitError = err?.message || String(err);
      } else if (!appCheckTokenProbe) {
        appCheckTokenProbe = { ok: false, error: err?.message || String(err) };
      }
      console.warn('[ScamLens] App Check problem:', err);
    });
  return appCheckInitPromise;
}

export async function getAIInstance() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured yet. Fill in src/firebase-config.js with your Firebase web config first.',
    );
  }
  if (!ai) {
    app = initializeApp(firebaseConfig);
    try {
      await initAppCheck(app);
    } catch (err) {
      console.warn('[ScamLens] App Check init failed, continuing without it:', err);
    }
    ai = getAI(app, { backend: new GoogleAIBackend() });
  }
  return ai;
}

// ---------------------------------------------------------------------------
// Structured-output schemas (Firebase Schema helpers)
// ---------------------------------------------------------------------------

const verdictEnum = ['safe', 'suspicious', 'scam'];

const deviceSchema = Schema.object({
  properties: {
    verdict: Schema.enumString({
      description: 'Overall verdict for the message.',
      enum: verdictEnum,
    }),
    confidence: Schema.number({
      description: 'Confidence in the verdict, 0 to 100.',
    }),
    red_flags: Schema.array({
      description: 'Short suspicious signals found in the message, if any.',
      items: Schema.string(),
    }),
  },
});

const cloudSchema = Schema.object({
  properties: {
    verdict: Schema.enumString({
      description: 'Overall verdict for the message.',
      enum: verdictEnum,
    }),
    confidence: Schema.number({
      description: 'Confidence in the verdict, 0 to 100.',
    }),
    reasons: Schema.array({
      description: 'Plain-language reasons behind the verdict.',
      items: Schema.string(),
    }),
    what_to_do: Schema.array({
      description: 'Concrete next steps for the user.',
      items: Schema.string(),
    }),
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonResponse(text, stepLabel) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error(`${stepLabel}: empty response from the model.`);
  }
  // Be tolerant of markdown fences in case a model wraps the JSON.
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`${stepLabel}: model did not return valid JSON.`);
  }
  return parsed;
}

function normalizeResult(parsed, stepLabel, extraArrayField) {
  const verdict = verdictEnum.includes(parsed?.verdict) ? parsed.verdict : null;
  if (!verdict) {
    throw new Error(`${stepLabel}: model returned an unknown verdict.`);
  }
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(parsed.confidence) || 0)),
  );
  const list = Array.isArray(parsed[extraArrayField])
    ? parsed[extraArrayField].filter((item) => typeof item === 'string')
    : [];
  return { verdict, confidence, [extraArrayField]: list };
}

const DEVICE_PROMPT = `You are a scam detector. Analyse the suspicious message below and reply with JSON only.
Classify it as "safe" (an ordinary legitimate message), "suspicious" (some red flags but not clearly a scam), or "scam" (clearly fraudulent or a phishing attempt).
confidence is 0-100. red_flags lists each suspicious signal as a short phrase; use an empty list when the message looks safe.

Message:
"""`;

const CLOUD_PROMPT = `You are a scam and hoax detector. Analyse the suspicious message below and reply with JSON only.
Classify it as "safe" (an ordinary legitimate message), "suspicious" (some red flags but not clearly a scam), or "scam" (clearly fraudulent or a phishing attempt).
confidence is 0-100. reasons explains the verdict in plain language. what_to_do lists concrete next steps for the user (for example: do not click links, do not send money, verify through an official channel, report and block).

Message:
"""`;

// ---------------------------------------------------------------------------
// Step 1 — On-device (Gemini Nano). Single-turn text generation only.
// ---------------------------------------------------------------------------

export async function checkOnDevice(message, onProgress) {
  const aiInstance = await getAIInstance();
  const model = getGenerativeModel(aiInstance, {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      promptOptions: { responseConstraint: deviceSchema },
    },
  });

  // MUST run after a user gesture (the Check button click) and before
  // generateContent. On first use this may download the on-device model.
  await model.initializeDeviceModel((progressValue) => {
    if (typeof onProgress === 'function') onProgress(progressValue);
  });

  const result = await model.generateContent(`${DEVICE_PROMPT}${message}"""`);
  const parsed = parseJsonResponse(result.response.text(), 'On-device');
  return {
    ...normalizeResult(parsed, 'On-device', 'red_flags'),
    inferenceSource: result.response.inferenceSource || 'on_device',
  };
}

// ---------------------------------------------------------------------------
// Step 2 — Cloud (Gemini). Single-turn text generation only.
// ---------------------------------------------------------------------------

export async function checkInCloud(message) {
  const aiInstance = await getAIInstance();
  const model = getGenerativeModel(aiInstance, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: cloudSchema,
      },
    },
  });

  const result = await model.generateContent(`${CLOUD_PROMPT}${message}"""`);
  const parsed = parseJsonResponse(result.response.text(), 'Cloud');
  return {
    ...normalizeResult(parsed, 'Cloud', 'reasons'),
    what_to_do: Array.isArray(parsed.what_to_do)
      ? parsed.what_to_do.filter((item) => typeof item === 'string')
      : [],
    inferenceSource: result.response.inferenceSource || 'in_cloud',
  };
}
