// Takes screenshots of the active tab and asks Claude to describe the trading UI.
const MODEL = 'claude-sonnet-5-5';

// Clicking the toolbar icon opens Pip's side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

const SYSTEM = `You are Pip, a friendly trading coach for complete beginners. You only teach: explain what parts of a trading platform are and how they work.
Never recommend buying or selling any specific security, never predict prices, and never tell the user to place a trade. Use plain words, short sentences, and define any jargon.`;

async function getKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) throw new Error('Add your Anthropic API key in the Settings tab of the Pip side panel first.');
  return apiKey;
}

async function claude(apiKey, content, maxTokens = 2000) {
  return claudeChat(apiKey, [{ role: 'user', content }], maxTokens);
}

async function claudeChat(apiKey, messages, maxTokens, system = SYSTEM) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

function parseJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : text);
}

async function screenshot(windowId) {
  const url = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 70 });
  return url.split(',')[1];
}

async function tour(sender, { width, height }) {
  const apiKey = await getKey();
  const img = await screenshot(sender.tab.windowId);
  const text = await claude(apiKey, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
    { type: 'text', text: `This is a screenshot of a trading platform (${width}x${height} CSS pixels; the image may be scaled).
Build a beginner tour of the 6-10 most important parts, ordered the way someone would use them to place a first trade
(account/balance, symbol search, price, bid/ask, chart, buy/sell, order type, quantity, stop-loss, review/submit, positions). Skip anything not visible.
Reply with JSON only:
{"platform": "<name if recognizable, else 'trading platform'>",
 "steps": [{"title": "<2-4 words>", "text": "<2-3 plain sentences for a beginner>", "box": [x, y, w, h]}]}
"box" is the element's bounding box as fractions of the image width/height (0-1).` },
  ]);
  return parseJSON(text);
}

async function explain(sender, { element }) {
  const apiKey = await getKey();
  const img = await screenshot(sender.tab.windowId);
  const text = await claude(apiKey, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
    { type: 'text', text: `The beginner clicked this element on the trading platform shown (at about ${element.fx.toFixed(2)}, ${element.fy.toFixed(2)} as fractions of the screen):
${JSON.stringify(element.info)}
Explain what it is and what it does. Reply with JSON only: {"title": "<2-4 words>", "text": "<2-4 plain sentences>"}` },
  ], 600);
  return parseJSON(text);
}

async function locate(sender, { query }) {
  const apiKey = await getKey();
  const img = await screenshot(sender.tab.windowId);
  const text = await claude(apiKey, [
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } },
    { type: 'text', text: `Find ${query} in this screenshot of a trading platform.
Reply with JSON only: {"found": true, "box": [x, y, w, h], "note": "<one short sentence on where it is or how to open it>"}
"box" is the bounding box as fractions of the image width/height (0-1).
If it is not visible, reply {"found": false, "note": "<one or two sentences on where it is usually found on platforms like this, e.g. which menu>"}.` },
  ], 400);
  return parseJSON(text);
}

// Free-form questions from the side panel's "Ask Pip" tab.
async function chat({ messages, withScreen, context }) {
  const apiKey = await getKey();
  const msgs = structuredClone(messages);
  if (withScreen) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    try {
      const img = await screenshot(tab.windowId);
      const last = msgs[msgs.length - 1];
      last.content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }, { type: 'text', text: last.content }];
    } catch { /* some pages (chrome://, the web store) can't be captured; answer without the screen */ }
  }
  const system = `${SYSTEM}
You are chatting in a side panel next to the user's trading platform. If a screenshot is attached, it shows their screen right now.
Keep answers short (under 120 words unless they ask for detail) and warm. Suggest practicing with paper trading.
${context}`;
  return claudeChat(apiKey, msgs, 800, system);
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const jobs = { 'pip:analyze': tour, 'pip:describe': explain, 'pip:locate': locate, 'pip:chat': (_, m) => chat(m) };
  const job = jobs[msg.type]?.(sender, msg);
  if (!job) return;
  job.then(result => reply({ ok: true, result }), err => reply({ ok: false, error: String(err.message || err) }));
  return true; // keep the channel open for the async reply
});
