// ScamLens UI — vanilla JS. All inference lives in ./ai.js and goes
// through Firebase AI Logic only. This file never calls a model API.

import { isFirebaseConfigured, checkOnDevice, checkInCloud, CLOUD_MODEL } from './ai.js';

const HISTORY_KEY = 'scamlens-history-v1';
const MAX_HISTORY = 20;

const $ = (id) => document.getElementById(id);
const messageInput = $('message');
const checkButton = $('check-btn');
const setupBanner = $('setup-banner');
const setupNotice = $('setup-notice');
const deviceCard = $('result-device');
const cloudCard = $('result-cloud');
const historyList = $('history-list');
const historyEmpty = $('history-empty');
const clearHistoryButton = $('clear-history-btn');

// ---------------------------------------------------------------------------
// Example messages (one click fills the textarea)
// ---------------------------------------------------------------------------

const SAMPLES = [
  {
    id: 'scam-en',
    label: 'Scam (English)',
    text: 'Congratulations! You have been selected for a remote data entry job paying $4,500/month, no experience needed. To activate your account, pay a $50 registration fee in crypto to the wallet below and send us a screenshot. Hurry, only 3 spots left today!',
  },
  {
    id: 'scam-id',
    label: 'Scam (Bahasa Indonesia)',
    text: 'Selamat! Kamu memenangkan 500 USDT dari Airdrop Spesial Binance. Klik link ini dan hubungkan wallet kamu untuk klaim hadiah sebelum 24 jam, kalau tidak hadiah hangus. Jangan bagikan kode ini ke siapa pun, langsung klaim sekarang!',
  },
  {
    id: 'legit-en',
    label: 'Legit (English)',
    text: 'Hi Sarah, this is Maya from Bright Dental Clinic. Just a reminder of your check-up appointment tomorrow at 10:30 AM with Dr. Lee. Reply YES to confirm, or call us at (021) 555-0134 to reschedule. Thank you!',
  },
  {
    id: 'legit-id',
    label: 'Legit (Bahasa Indonesia)',
    text: 'Halo Pak Budi, ini Andi dari RT 05. Iuran kebersihan bulan November Rp25.000, bisa transfer ke rekening bendahara BCA 1234567890 a.n. Siti. Terima kasih, dan mohon maaf mengganggu.',
  },
];

function buildSampleButtons() {
  const container = $('sample-buttons');
  for (const sample of SAMPLES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = sample.label;
    button.addEventListener('click', () => {
      messageInput.value = sample.text;
      messageInput.focus();
    });
    container.appendChild(button);
  }
}

// ---------------------------------------------------------------------------
// History (localStorage)
// ---------------------------------------------------------------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Storage full or unavailable: history is best-effort, never fatal.
  }
}

function verdictBadge(verdict) {
  if (!verdict) return '<span class="badge unknown">not run</span>';
  const label = verdict.charAt(0).toUpperCase() + verdict.slice(1);
  return `<span class="badge ${verdict}">${label}</span>`;
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';
  historyEmpty.style.display = history.length ? 'none' : 'block';
  clearHistoryButton.style.display = history.length ? '' : 'none';
  for (const entry of history) {
    const li = document.createElement('li');
    const snippet = entry.message.length > 120
      ? `${entry.message.slice(0, 120)}…`
      : entry.message;
    const time = new Date(entry.time).toLocaleString();
    li.innerHTML = `
      <p class="snippet"></p>
      <p class="meta">${time} · On-device ${verdictBadge(entry.deviceVerdict)} · Cloud ${verdictBadge(entry.cloudVerdict)}</p>
    `;
    li.querySelector('.snippet').textContent = snippet;
    historyList.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Result rendering (honest per-step status, never faked)
// ---------------------------------------------------------------------------

function setStatus(card, status, label) {
  const el = card.querySelector('.status');
  el.textContent = label || status;
  el.className = `status ${status}`;
}

function showResult(card, result, listField, listTitle) {
  card.classList.add('visible');
  setStatus(card, 'done', 'done');
  const verdictEl = card.querySelector('.verdict');
  verdictEl.textContent = result.verdict.charAt(0).toUpperCase() + result.verdict.slice(1);
  verdictEl.className = `verdict ${result.verdict}`;
  card.querySelector('.confidence').textContent = `Confidence: ${result.confidence}%`;
  const list = card.querySelector('ul');
  list.innerHTML = '';
  const items = result[listField] || [];
  if (items.length === 0) {
    const li = document.createElement('li');
    li.textContent = listTitle === 'Red flags'
      ? 'No red flags found.'
      : 'No additional notes.';
    list.appendChild(li);
  } else {
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    }
  }
  const extra = card.querySelector('.extra');
  if (extra) {
    extra.innerHTML = '';
    if (Array.isArray(result.what_to_do) && result.what_to_do.length > 0) {
      const heading = document.createElement('p');
      heading.innerHTML = '<strong>What to do</strong>';
      const whatList = document.createElement('ul');
      for (const item of result.what_to_do) {
        const li = document.createElement('li');
        li.textContent = item;
        whatList.appendChild(li);
      }
      extra.append(heading, whatList);
    }
  }
}

function showError(card, message) {
  card.classList.add('visible');
  setStatus(card, 'failed', 'failed');
  const verdictEl = card.querySelector('.verdict');
  verdictEl.textContent = 'Unavailable';
  verdictEl.className = 'verdict';
  card.querySelector('.confidence').textContent = '';
  card.querySelector('ul').innerHTML = '';
  const extra = card.querySelector('.extra');
  if (extra) extra.innerHTML = '';
  const errorEl = card.querySelector('.error');
  errorEl.textContent = message;
}

function resetResultCard(card) {
  card.classList.remove('visible');
  card.querySelector('.verdict').textContent = '';
  card.querySelector('.confidence').textContent = '';
  card.querySelector('ul').innerHTML = '';
  const extra = card.querySelector('.extra');
  if (extra) extra.innerHTML = '';
  card.querySelector('.error').textContent = '';
  card.querySelector('.progress').textContent = '';
  setStatus(card, 'idle', 'idle');
}

// ---------------------------------------------------------------------------
// Check flow
// ---------------------------------------------------------------------------

async function handleCheck() {
  const message = messageInput.value.trim();
  if (!message) {
    setupNotice.hidden = true;
    deviceCard.classList.add('visible');
    showError(deviceCard, 'Paste a message first, then press Check.');
    cloudCard.classList.remove('visible');
    return;
  }

  // Config gate: never attempt inference without a real Firebase config.
  if (!isFirebaseConfigured()) {
    setupBanner.classList.add('visible');
    setupNotice.hidden = false;
    deviceCard.classList.remove('visible');
    cloudCard.classList.remove('visible');
    return;
  }
  setupNotice.hidden = true;

  checkButton.disabled = true;
  checkButton.textContent = 'Checking…';
  resetResultCard(deviceCard);
  resetResultCard(cloudCard);

  let deviceVerdict = null;
  let cloudVerdict = null;

  // Step 1 — On-device. If it is unavailable in this browser, say so
  // honestly and continue to the cloud step. Never fake an on-device result.
  deviceCard.classList.add('visible');
  setStatus(deviceCard, 'running', 'running');
  deviceCard.querySelector('.progress').textContent =
    'Preparing the on-device model… (first use may download Gemini Nano)';
  try {
    const deviceResult = await checkOnDevice(message, (progress) => {
      const pct = Math.round(progress * 100);
      deviceCard.querySelector('.progress').textContent =
        `Downloading on-device model… ${pct}%`;
    });
    deviceCard.querySelector('.progress').textContent = '';
    deviceVerdict = deviceResult.verdict;
    showResult(deviceCard, deviceResult, 'red_flags', 'Red flags');
  } catch (err) {
    deviceCard.querySelector('.progress').textContent = '';
    const honest =
      /not available|unavailable|not supported|download|prompt api|language model/i.test(
        err?.message || '',
      )
        ? 'On-device model unavailable in this browser. (Gemini Nano needs Chrome 139+ on desktop with the Prompt API enabled.)'
        : `On-device check failed: ${err?.message || 'unknown error'}`;
    showError(deviceCard, honest);
    console.warn('[ScamLens] On-device step failed:', err);
  }

  // Step 2 — Cloud. Runs even if the on-device step failed.
  cloudCard.classList.add('visible');
  setStatus(cloudCard, 'running', 'running');
  try {
    const cloudResult = await checkInCloud(message);
    cloudVerdict = cloudResult.verdict;
    showResult(cloudCard, cloudResult, 'reasons', 'Reasons');
  } catch (err) {
    showError(cloudCard, `Cloud check failed: ${err?.message || 'unknown error'}`);
    console.warn('[ScamLens] Cloud step failed:', err);
  }

  saveHistoryEntry({
    message,
    deviceVerdict,
    cloudVerdict,
    time: new Date().toISOString(),
  });
  renderHistory();

  checkButton.disabled = false;
  checkButton.textContent = 'Check this message';
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  // Cloud model name shown in the UI so it is clear which model answers.
  document.querySelector('#cloud-model-name').textContent = CLOUD_MODEL;

  if (!isFirebaseConfigured()) {
    setupBanner.classList.add('visible');
  }

  buildSampleButtons();
  renderHistory();
  checkButton.addEventListener('click', handleCheck);
  clearHistoryButton.addEventListener('click', () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // Ignore storage errors.
    }
    renderHistory();
  });
}

init();
