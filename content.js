// Pip overlay: draws the buddy above any page and walks it to parts of the trading UI.
(() => {
  if (window.__pip) return;
  window.__pip = true;

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
<style>
  :host { all: initial; }
  * { box-sizing: border-box; }
  .layer { position: fixed; inset: 0; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  #pip { position: fixed; left: 24px; top: 24px; width: 72px; height: 88px; transition: left 1s linear, top 1s linear; }
  #pip { --skin: #e8453c; --limb: #b8282e; --belly: #ff9a8f; --leaf: #2fbf71; }
  #pip.green { --skin: #7cc242; --limb: #4f8f22; --belly: #c8ec9e; --leaf: #2e7d32; }
  .skin { fill: var(--skin); } .limb { fill: var(--limb); } .belly { fill: var(--belly); } .leaf { fill: var(--leaf); }
  #pip svg { width: 100%; height: 100%; overflow: visible; transition: transform .18s; }
  #pip.left svg { transform: scaleX(-1); }
  .leg { transform-box: fill-box; transform-origin: 50% 0; }
  .arm { transform-box: view-box; transform-origin: 54px 50px; transform: rotate(var(--arm, 65deg)); transition: transform .35s cubic-bezier(.3,1.6,.5,1); }
  .bob { animation: idle 2.6s ease-in-out infinite; }
  #pip.walking .bob { animation: bob .3s ease-in-out infinite alternate; }
  #pip.walking .leg.l { animation: stepA .3s ease-in-out infinite alternate; }
  #pip.walking .leg.r { animation: stepB .3s ease-in-out infinite alternate; }
  #pip.thinking .bob { animation: think .8s ease-in-out infinite; }
  .lids { animation: blink 4.2s infinite; transform-box: fill-box; transform-origin: 50% 0; }
  @keyframes stepA { from { transform: rotate(-24deg); } to { transform: rotate(24deg); } }
  @keyframes stepB { from { transform: rotate(24deg); } to { transform: rotate(-24deg); } }
  @keyframes bob { to { transform: translateY(-3px); } }
  @keyframes idle { 50% { transform: translateY(-1.5px); } }
  @keyframes think { 50% { transform: rotate(-6deg); } }
  @keyframes blink { 0%, 94%, 100% { transform: scaleY(0); } 96% { transform: scaleY(1); } }
  .ring { position: fixed; border: 2px solid #ffb547; border-radius: 10px; box-shadow: 0 0 0 4px rgba(255,181,71,.25); transition: all .35s ease; }
  .bubble { position: fixed; width: min(300px, calc(100vw - 32px)); background: #fff8ec; color: #2b1a07; border-radius: 14px; padding: 12px 14px; box-shadow: 0 10px 30px rgba(0,0,0,.35); pointer-events: auto; }
  .bubble .step { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #e08a1e; font-weight: 600; }
  .bubble h4 { font-size: 17px; margin: 2px 0 4px; }
  .bubble p { margin: 0 0 8px; }
  .nav { display: flex; gap: 6px; justify-content: flex-end; }
  .nav .skip { margin-right: auto; background: none; border: 0; color: #8a6a3e; cursor: pointer; }
  .nav button.b { border: 1px solid #e3cfae; background: #fff; color: #2b1a07; padding: 6px 12px; border-radius: 8px; cursor: pointer; font: inherit; }
  .nav button.go { background: #2b1a07; color: #fff8ec; border-color: #2b1a07; }
  [hidden] { display: none !important; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
<div class="layer">
  <div class="ring" hidden></div>
  <div id="pip" hidden>
    <svg viewBox="0 0 80 96"><g class="bob">
      
      <g class="leg l"><rect x="27" y="64" width="9" height="20" rx="4.5" class="limb"/><ellipse cx="30" cy="86" rx="8" ry="4" fill="#2b1a07"/></g>
      <g class="leg r"><rect x="44" y="64" width="9" height="20" rx="4.5" class="limb"/><ellipse cx="50" cy="86" rx="8" ry="4" fill="#2b1a07"/></g>
      <rect x="11" y="44" width="8" height="20" rx="4" class="limb" transform="rotate(18 15 46)"/>
      <path d="M40 26 C34 18 13 18 13 42 C13 60 26 72 34 71 C37 70.5 43 70.5 46 71 C54 72 67 60 67 42 C67 18 46 18 40 26 Z" class="skin"/><path d="M40 27 q-1 -11 4 -17" stroke="#6b3e1f" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse class="leaf" cx="51" cy="13" rx="8" ry="4" transform="rotate(-25 51 13)"/><ellipse cx="40" cy="55" rx="16" ry="11" class="belly"/>
      <circle cx="31" cy="39" r="7" fill="#fff"/><circle cx="50" cy="39" r="7" fill="#fff"/>
      <circle cx="33" cy="40" r="3.4" fill="#2b1a07"/><circle cx="52" cy="40" r="3.4" fill="#2b1a07"/>
      <g class="lids"><rect x="23" y="31" width="16" height="16" rx="8" class="skin"/><rect x="42" y="31" width="16" height="16" rx="8" class="skin"/></g>
      <path d="M35 51 q6 5 12 0" stroke="#2b1a07" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <g class="arm"><rect x="52" y="46" width="26" height="8" rx="4" class="limb"/><circle cx="79" cy="50" r="5" class="limb"/><rect x="80" y="47.5" width="9" height="4" rx="2" class="limb"/></g>
    </g></svg>
  </div>
  <div class="bubble" hidden></div>
</div>`;
  document.documentElement.appendChild(host);

  const pip = root.getElementById('pip'), ring = root.querySelector('.ring'), bubble = root.querySelector('.bubble');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let pos = { x: 24, y: 24 }, facing = 'right', steps = [], step = -1, exploring = false;

  /* ---- apple colour (picked in the side panel's Settings) ---- */
  const setColor = c => pip.classList.toggle('green', c === 'green');
  chrome.storage.local.get('appleColor', d => setColor(d.appleColor));
  chrome.storage.onChanged.addListener(ch => { if (ch.appleColor) setColor(ch.appleColor.newValue); });

  /* ---- movement ---- */
  function setFacing(f) { facing = f; pip.classList.toggle('left', f === 'left'); }
  function walkTo(t) {
    pip.hidden = false;
    const PW = 72, PH = 88, vw = innerWidth, vh = innerHeight, cx = t.x + t.w / 2;
    let x, y;
    if (t.x - PW - 4 >= 0 && (cx > vw / 2 || t.x + t.w + PW + 4 > vw)) { x = t.x - PW - 4; y = t.y + t.h / 2 - PH * 0.55; }
    else if (t.x + t.w + PW + 4 <= vw) { x = t.x + t.w + 4; y = t.y + t.h / 2 - PH * 0.55; }
    else { x = t.x + 10; y = t.y + t.h - PH - 8; }
    x = clamp(x, 4, vw - PW - 4); y = clamp(y, 4, vh - PH - 4);
    const d = Math.hypot(x - pos.x, y - pos.y), dur = clamp(d / 280, 0.4, 2.2);
    if (Math.abs(x - pos.x) > 4) setFacing(x > pos.x ? 'right' : 'left');
    pip.style.setProperty('--arm', '65deg');
    pip.style.transition = `left ${dur}s linear, top ${dur}s linear`;
    pip.classList.add('walking');
    pip.style.left = x + 'px'; pip.style.top = y + 'px';
    pos = { x, y };
    return new Promise(res => setTimeout(() => {
      pip.classList.remove('walking');
      setFacing(cx >= x + PW / 2 ? 'right' : 'left');
      const sx = facing === 'right' ? x + 48.6 : x + PW - 48.6, sy = y + 45;
      const ang = Math.atan2(t.y + t.h / 2 - sy, (facing === 'right' ? 1 : -1) * (cx - sx)) * 180 / Math.PI;
      pip.style.setProperty('--arm', clamp(ang, -110, 110) + 'deg');
      res();
    }, dur * 1000 + 40));
  }
  function say(t, html) {
    if (t) { ring.hidden = false; Object.assign(ring.style, { left: t.x - 5 + 'px', top: t.y - 5 + 'px', width: t.w + 10 + 'px', height: t.h + 10 + 'px' }); }
    else ring.hidden = true;
    bubble.innerHTML = html; bubble.hidden = false;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const x = clamp(pos.x + 36 - bw / 2, 8, innerWidth - bw - 8);
    const above = pos.y - bh - 8;
    bubble.style.left = x + 'px';
    bubble.style.top = (above >= 4 ? above : Math.min(pos.y + 96, innerHeight - bh - 8)) + 'px';
  }
  const card = (title, text, nav = '', label = '') =>
    `${label ? `<div class="step">${esc(label)}</div>` : ''}<h4>${esc(title)}</h4><p>${esc(text)}</p>${nav}`;
  const closeNav = '<div class="nav"><button class="b" data-a="close">Done</button></div>';

  function thinking(text) {
    pip.hidden = false; pip.classList.add('thinking'); ring.hidden = true;
    say(null, card('One sec…', text));
  }

  /* ---- snap a rough vision box onto the real page element under it ---- */
  function snap(box) {
    const iou = (a, b) => {
      const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      const i = ix * iy; return i / (a.w * a.h + b.w * b.h - i || 1);
    };
    let el = document.elementFromPoint(box.x + box.w / 2, box.y + box.h / 2), best = box, score = 0.3;
    for (let i = 0; el && i < 8; i++, el = el.parentElement) {
      const r = el.getBoundingClientRect(), c = { x: r.left, y: r.top, w: r.width, h: r.height }, s = iou(c, box);
      if (s > score) { score = s; best = c; }
    }
    return best;
  }

  /* ---- talking to the background script (hide Pip so it isn't in the screenshot) ---- */
  async function ask(msg) {
    host.style.visibility = 'hidden';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const p = chrome.runtime.sendMessage(msg);
    setTimeout(() => (host.style.visibility = 'visible'), 250);
    const res = await p;
    host.style.visibility = 'visible'; pip.classList.remove('thinking');
    if (!res?.ok) throw new Error(res?.error || 'Something went wrong.');
    return res.result;
  }

  /* ---- guided tour ---- */
  async function startTour() {
    exploring = false; document.removeEventListener('click', onExplainClick, true);
    thinking("I'm looking at your screen to work out where everything is.");
    try {
      const data = await ask({ type: 'pip:analyze', width: innerWidth, height: innerHeight });
      steps = (data.steps || []).map(s => ({ ...s, rect: snap({ x: s.box[0] * innerWidth, y: s.box[1] * innerHeight, w: s.box[2] * innerWidth, h: s.box[3] * innerHeight }) }));
      if (!steps.length) throw new Error("I couldn't find trading controls on this screen.");
      say(null, card(`Welcome to ${data.platform}!`, "I found the main parts of this screen. Let's walk through them in the order you'd use them for a first trade.",
        '<div class="nav"><button class="skip" data-a="close">Not now</button><button class="b go" data-a="next">Let\'s go</button></div>'));
      step = -1;
    } catch (e) { say(null, card('Hmm', e.message, closeNav)); }
  }
  async function goStep(i) {
    step = i; const s = steps[i];
    bubble.hidden = true; ring.hidden = true;
    await walkTo(s.rect);
    if (step !== i) return;
    say(s.rect, card(s.title, s.text,
      `<div class="nav"><button class="skip" data-a="close">End tour</button>${i ? '<button class="b" data-a="back">Back</button>' : ''}<button class="b go" data-a="next">${i === steps.length - 1 ? 'Finish' : 'Next'}</button></div>`,
      `Step ${i + 1} of ${steps.length}`));
  }

  /* ---- explain mode: click any element ---- */
  async function onExplainClick(e) {
    if (e.composedPath().includes(host)) return;
    e.preventDefault(); e.stopPropagation();
    const el = e.target, r = el.getBoundingClientRect(), rect = { x: r.left, y: r.top, w: r.width, h: r.height };
    const info = {
      tag: el.tagName.toLowerCase(), text: (el.innerText || el.value || '').trim().slice(0, 200),
      label: el.getAttribute('aria-label') || el.title || el.placeholder || '',
      nearby: (el.parentElement?.innerText || '').trim().slice(0, 300),
    };
    await walkTo(rect);
    thinking('Let me take a look at that.');
    try {
      const d = await ask({ type: 'pip:describe', element: { info, fx: (rect.x + rect.w / 2) / innerWidth, fy: (rect.y + rect.h / 2) / innerHeight } });
      say(rect, card(d.title, d.text, closeNav));
    } catch (err) { say(rect, card('Hmm', err.message, closeNav)); }
  }
  function startExplain() {
    exploring = true;
    document.addEventListener('click', onExplainClick, true);
    pip.hidden = false;
    say(null, card('Explain mode is on', "Click anything on the page and I'll walk over and tell you what it does. Clicks won't trigger trades while this is on.", closeNav));
  }

  function finishTour() {
    step = -1; ring.hidden = true;
    chrome.storage.local.set({ tourDone: true });
    say(null, card("That's the whole screen!", "You now know what every part does. Your next steps are waiting in the Pip side panel. Click the Pip icon in the toolbar if it's closed.", closeNav));
  }

  /* ---- "Show me on my screen" from a guide lesson ---- */
  async function show({ query, title, text }) {
    thinking(`Looking for ${query.split('(')[0].trim()}…`);
    try {
      const d = await ask({ type: 'pip:locate', query });
      if (!d.found) return say(null, card("I can't see it right now", d.note || 'It may be hidden in a menu on this platform.', closeNav));
      const rect = snap({ x: d.box[0] * innerWidth, y: d.box[1] * innerHeight, w: d.box[2] * innerWidth, h: d.box[3] * innerHeight });
      await walkTo(rect);
      say(rect, card(title, d.note ? `${d.note} ${text}` : text, closeNav));
    } catch (e) { say(null, card('Hmm', e.message, closeNav)); }
  }

  function hideAll() {
    exploring = false; step = -1;
    document.removeEventListener('click', onExplainClick, true);
    bubble.hidden = true; ring.hidden = true; pip.hidden = true;
  }

  bubble.addEventListener('click', e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'next') step < steps.length - 1 ? goStep(step + 1) : finishTour();
    if (a === 'back') goStep(step - 1);
    if (a === 'close') { if (exploring) { exploring = false; document.removeEventListener('click', onExplainClick, true); } bubble.hidden = true; ring.hidden = true; }
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'pip:tour') startTour();
    if (msg.type === 'pip:explain') startExplain();
    if (msg.type === 'pip:hide') hideAll();
    if (msg.type === 'pip:show') show(msg);
  });
})();
