# ScamLens — Demo Video Script

**Hackathon:** #BuildHybridAI 2026
**Maximum length:** 3 minutes (180 seconds)
**Language:** English narration; the app demo includes one Indonesian-language example
**Format:** Screen recording of the live app (https://apiznk.github.io/scam-lens/) with voiceover. No face cam needed.

Total runtime of the shots below: **175 seconds**, leaving a 5-second buffer under the 3-minute limit.

---

## Shot 1 — Hook (0:00–0:30, 30s)

**Narration:**

> "Every day, millions of people get messages like this: a job offer that sounds too good to be true, or a free crypto airdrop if you just connect your wallet first. Most people have no fast way to check them, and forwarding a private message to some random checker site is not safe either. So I built ScamLens for anyone who gets suspicious messages and wants a quick second opinion. It checks your message in two steps, both powered by Firebase AI Logic: first privately on your device with Gemini Nano, and then deeper in the cloud with Gemini, both on a single click."

**On-screen action:** Quick cuts of three suspicious messages (a WhatsApp job offer, a Telegram airdrop pitch, an SMS parcel link), then the ScamLens homepage at https://apiznk.github.io/scam-lens/.

**Duration:** 30 seconds.

---

## Shot 2 — Demo: scam message, on-device check (0:30–1:05, 35s)

**Narration:**

> "Here is a message I got. 'Congratulations, you are selected for a remote data entry job paying 4,500 dollars a month. Pay a 50 dollar registration fee in crypto to start.' Let me paste it in and tap Check this message. The on-device step runs first. Nothing leaves my device here. Gemini Nano runs right in Chrome. And there it is: scam, with a high confidence score. The red flags are urgency, and asking for money before any interview. That took seconds, and the message never left my laptop for this step. The cloud card then appears below it automatically, as step 2 of the same click."

**On-screen action:** Paste the English fake job-offer message into the input (or tap the **Scam (English)** sample button). Click **Check this message** — the app's single Check button; there is no separate on-device or cloud button. Show the loading state, then the result card with the **"On-device"** label, verdict **scam**, confidence shown as a percentage number, and the red flags list. The **"Cloud"** card then appears below it automatically. Cursor briefly highlights the "On-device" label.

**Duration:** 35 seconds.

---

## Shot 3 — Demo: second message, cloud check (1:05–1:40, 35s)

**Narration:**

> "Now a trickier one. This message looks more professional, no obvious spelling mistakes, no direct demand for money. The on-device check says suspicious, with a middling confidence score. The cloud check then runs right after, automatically, as step 2 of the same click. This is the only moment the message leaves my device. The cloud Gemini model reads the full context and agrees it is suspicious: the sender domain does not match the company, and the link does not go where it claims. Two engines, two labels, one clear answer."

**On-screen action:** Paste a second, subtler English message (a polished fake interview invitation with a mismatched link — this one is pasted by hand, it is not one of the app's built-in sample buttons). Click **Check this message** once: the on-device card appears first (verdict **suspicious**, confidence as a percentage number), then the cloud card appears automatically below it. Show both result cards, each with its own label (**"On-device"** and **"Cloud"**), and highlight the cloud result's reasons and what-to-do list.

**Duration:** 35 seconds.

---

## Shot 4 — Demo: Indonesian example and history (1:40–2:25, 45s)

**Narration:**

> "It also works in Indonesian. This is a fake airdrop message: 500 USDT free, but you have to connect your wallet and claim within 24 hours. Same flow, same labels, and the verdict is scam. And everything I checked is saved here in my history, only in my browser, so I can look back at what I already checked without any account or sign-in."

**On-screen action:** Tap the **Scam (Bahasa Indonesia)** sample button (fake 500 USDT airdrop pitch), then click **Check this message** and show both verdict cards. Then scroll down to the **Check history** section on the same page, showing the three checks just made with their verdicts and timestamps. (History entries are a plain list, not clickable; do not show clicking one to reopen a result.)

**Duration:** 45 seconds.

---

## Shot 5 — Closing (2:25–2:55, 30s)

**Narration:**

> "ScamLens is for everyone who gets a suspicious message and wants a second opinion before replying, clicking, or sending money. The hybrid part matters: the fast, private check happens on your device, and the deeper check runs right after it, on the same click. That is privacy first, with cloud power when you need it. Try it at the link below. Built with Firebase AI Logic for the Build Hybrid AI hackathon."

**On-screen action:** Back on the ScamLens homepage. The live site URL (https://apiznk.github.io/scam-lens/) and the repo link (https://github.com/apiznk/scam-lens) appear as on-screen text. End card with the ScamLens name.

**Duration:** 30 seconds.

---

## Recording notes

- Record in Chrome Desktop 139+ with the Prompt API flag enabled (`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`), so the on-device step actually runs live on camera.
- Do a full rehearsal run first: run all three sample checks once before recording, so the on-device model is warm and the results appear quickly.
- Keep the browser zoom at 100% and hide bookmarks and unrelated tabs before recording.
- Use the exact sample messages from the app where possible, so the video matches what a viewer sees when they try it.
- Capture at 1080p. Keep background noise out; record the voiceover in a quiet room, or record the screen muted and add the voiceover afterwards.

## Note

Recording the video and uploading it to YouTube requires Sumadi's account (his YouTube channel and his logged-in browser). The demo video link in the Devpost submission stays as a placeholder until that upload is done.
