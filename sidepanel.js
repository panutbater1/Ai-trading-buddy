// Pip's side panel: quick actions, the beginner guide, tools, and chat.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- saved state ---------- */
const DEFAULT = { tasks: {}, journal: [], plan: {}, golive: [], quizPassed: false, sizerUsed: false, sizer: { account: 5000, pct: 1, entry: '', stop: '' } };
let S = structuredClone(DEFAULT), tourDone = false, view = { lesson: null }, chat = [], lastQuote = null;

const save = () => chrome.storage.local.set({ pip: S });
async function load() {
  const d = await chrome.storage.local.get(['pip', 'tourDone', 'apiKey', 'appleColor']);
  S = { ...structuredClone(DEFAULT), ...(d.pip || {}) };
  tourDone = !!d.tourDone;
  $('#key').value = d.apiKey || '';
  setAppleColor(d.appleColor || 'red');
}

/* ---------- progress ---------- */
const AUTO = {
  tourDone: () => tourDone,
  quizPassed: () => S.quizPassed,
  journal1: () => S.journal.length >= 1,
  journal3: () => S.journal.length >= 3,
  journal10: () => S.journal.length >= 10,
  journal20: () => S.journal.length >= 20,
  sizerUsed: () => S.sizerUsed,
  planComplete: () => PLAN_FIELDS.every(f => (S.plan[f.id] || '').trim()),
  goliveAll: () => GOLIVE_ITEMS.every((_, i) => S.golive[i]),
};
const taskDone = t => (t.auto ? AUTO[t.auto]() : !!S.tasks[t.id]);
const lessonDone = l => l.tasks.every(taskDone);
const stageDone = s => s.lessons.every(lessonDone);
const stageUnlocked = i => i === 0 || stageDone(CURRICULUM[i - 1]);
const allLessons = () => CURRICULUM.flatMap((s, si) => s.lessons.map(l => ({ ...l, stage: s, si })));
const findLesson = id => allLessons().find(l => l.id === id);
const nextLesson = () => allLessons().find(l => stageUnlocked(l.si) && !lessonDone(l));

function renderProgress() {
  const all = allLessons(), done = all.filter(lessonDone).length;
  const cur = CURRICULUM.findIndex(s => !stageDone(s));
  $('#progressBar').style.width = (done / all.length * 100) + '%';
  $('#progressText').textContent = cur < 0 ? 'Guide complete. Nice work!' : `Stage ${cur + 1} of ${CURRICULUM.length}: ${CURRICULUM[cur].title}`;
}

/* ---------- guide overview ---------- */
function renderGuide() {
  renderProgress();
  if (view.lesson) return renderLesson(findLesson(view.lesson));
  const nx = nextLesson();
  const cur = CURRICULUM.findIndex(s => !stageDone(s));
  $('#guide').innerHTML = `
    ${nx ? `<div class="next">
      <span class="eyebrow">Up next</span>
      <h2>${esc(nx.title)}</h2>
      <p class="muted">${esc(nx.stage.title)} · ${esc(nx.body[0].slice(0, 110))}${nx.body[0].length > 110 ? '…' : ''}</p>
      <button class="btn go" data-open="${nx.id}">Start this step</button>
    </div>` : `<div class="next"><span class="eyebrow">All done</span><h2>You finished Pip's beginner guide</h2>
      <p class="muted">Keep journaling and doing weekly reviews. Ask me anything in the Ask Pip tab.</p></div>`}
    ${CURRICULUM.map((s, i) => {
      const unlocked = stageUnlocked(i), d = s.lessons.filter(lessonDone).length;
      const cls = stageDone(s) ? 'done' : i === cur ? 'current' : unlocked ? '' : 'locked';
      return `<details class="stage ${cls}" ${i === cur ? 'open' : ''}>
        <summary><span class="n">${stageDone(s) ? '✓' : i + 1}</span><div><h3>${esc(s.title)}</h3><p class="sub">${esc(s.blurb)}</p></div><span class="count">${d}/${s.lessons.length}</span></summary>
        <div class="lessons">${unlocked
          ? s.lessons.map(l => `<button data-open="${l.id}"><span>${esc(l.title)}</span>${lessonDone(l) ? '<span class="tick">✓</span>' : ''}</button>`).join('')
          : `<p class="lock-note">Finish "${esc(CURRICULUM[i - 1].title)}" to unlock this stage.</p>`}</div>
      </details>`;
    }).join('')}`;
}

/* ---------- a single lesson ---------- */
function renderLesson(l) {
    $('#guide').innerHTML = `
    <button class="back" data-back>← All steps</button>
    <div class="lesson tab">
      <p class="crumb">Stage ${l.si + 1} · ${esc(l.stage.title)}</p>
      <h2>${esc(l.title)}</h2>
      <div class="body">${l.body.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      ${l.show ? `<button class="btn" data-show>Show me on my screen</button>` : ''}
      ${l.quiz ? quizHTML(l) : ''}
      ${l.tool ? `<div class="box" id="tool">${TOOLS[l.tool].html()}</div>` : ''}
      <div class="box"><h3>Your to-do</h3><ul class="tasks" id="tasks"></ul></div>
      <div class="lesson-nav" id="lessonNav"></div>
    </div>`;
  view.wasDone = lessonDone(l);
  renderTasks(l);
  if (l.tool) TOOLS[l.tool].after?.();
}
function renderNav(l) {
  const lessons = allLessons(), nx = lessons[lessons.findIndex(x => x.id === l.id) + 1];
  $('#lessonNav').innerHTML = `<button class="btn" data-back>Back to guide</button>
    ${nx ? (stageUnlocked(nx.si) ? `<button class="btn go" data-open="${nx.id}" ${lessonDone(l) ? '' : 'disabled'}>Next step →</button>` : '<span class="muted">Finish this stage to unlock the next one.</span>')
         : (lessonDone(l) ? '<span class="up">Guide complete!</span>' : '')}`;
}
function renderTasks(l) {
  $('#tasks').innerHTML = l.tasks.map(t => `<li><label><input type="checkbox" data-task="${t.id}" ${taskDone(t) ? 'checked' : ''} ${t.auto ? 'disabled' : ''}>
    <span>${esc(t.text)}${t.auto ? '<span class="auto">(ticks itself)</span>' : ''}</span></label></li>`).join('');
  renderNav(l);
  renderProgress();
}
function refreshTasks() {
  if (!view.lesson) return;
  const l = findLesson(view.lesson);
  renderTasks(l);
  const done = lessonDone(l);
  if (done && !view.wasDone) toast(`Step complete: ${l.title}. 🎉`);
  view.wasDone = done;
}

/* ---------- quiz ---------- */
function quizHTML(l) {
  return `<form class="box quiz" id="quiz"><h3>Quick check</h3>
    ${l.quiz.map((q, i) => `<fieldset><legend>${i + 1}. ${esc(q.q)}</legend>
      ${q.options.map((o, j) => `<label class="check"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join('')}
      <p class="why" id="why${i}"></p></fieldset>`).join('')}
    <button class="btn go" type="submit">Check my answers</button></form>`;
}
function gradeQuiz(l) {
  let right = 0;
  l.quiz.forEach((q, i) => {
    const pick = document.querySelector(`input[name="q${i}"]:checked`), ok = pick && +pick.value === q.answer;
    if (ok) right++;
    $(`#why${i}`).innerHTML = pick ? `<span class="${ok ? 'up' : 'down'}">${ok ? 'Correct.' : 'Not quite.'}</span> ${esc(q.why)}` : '<span class="down">Pick an answer.</span>';
  });
  if (right === l.quiz.length) { S.quizPassed = true; save(); refreshTasks(); }
}

/* ---------- tools ---------- */
const TOOLS = {
  sizer: {
    html: () => `<h3>Position size calculator</h3>
      <div class="grid2">
        <div class="field"><label for="sz-account">Account size ($)</label><input id="sz-account" inputmode="decimal" value="${esc(S.sizer.account)}"></div>
        <div class="field"><label for="sz-pct">Risk per trade (%)</label><input id="sz-pct" inputmode="decimal" value="${esc(S.sizer.pct)}"></div>
        <div class="field"><label for="sz-entry">Entry price ($)</label><input id="sz-entry" inputmode="decimal" placeholder="e.g. 100" value="${esc(S.sizer.entry)}"></div>
        <div class="field"><label for="sz-stop">Stop-loss price ($)</label><input id="sz-stop" inputmode="decimal" placeholder="e.g. 97" value="${esc(S.sizer.stop)}"></div>
      </div>
      <div class="result" id="sz-out"></div>`,
    after: () => TOOLS.sizer.calc(),
    calc() {
      const v = id => parseFloat($('#sz-' + id).value);
      const account = v('account'), pct = v('pct'), entry = v('entry'), stop = v('stop');
      S.sizer = { account: $('#sz-account').value, pct: $('#sz-pct').value, entry: $('#sz-entry').value, stop: $('#sz-stop').value };
      const out = $('#sz-out');
      if (!(account > 0 && pct > 0 && entry > 0 && stop > 0)) { out.innerHTML = '<span class="muted">Fill in all four boxes to see how many shares to buy.</span>'; save(); return; }
      if (stop >= entry) { out.innerHTML = '<span class="warn">For a buy, the stop-loss must be below the entry price.</span>'; save(); return; }
      const riskAmt = account * pct / 100, perShare = entry - stop, shares = Math.floor(riskAmt / perShare), cost = shares * entry;
      out.innerHTML = `<span class="muted">Buy up to</span><strong>${shares.toLocaleString()} shares</strong>
        <span>Cost ${money(cost)} · Lose at most ${money(shares * perShare)} if the stop is hit</span>
        ${pct > 2 ? '<span class="warn">That is more than 2% risk. Beginners should stay at 1% or less.</span>' : ''}
        ${cost > account ? '<span class="warn">That costs more than your account. Use a closer stop or skip this trade.</span>' : ''}
        ${shares < 1 ? '<span class="warn">Your stop is too far away to fit your risk limit. Skip this trade or use a closer stop.</span>' : ''}`;
      if (shares >= 1 && !S.sizerUsed) { S.sizerUsed = true; refreshTasks(); }
      save();
    },
  },

  journal: {
    html: () => {
      const closed = S.journal.map(j => (j.exit - j.entry) * j.shares);
      const wins = closed.filter(x => x > 0), losses = closed.filter(x => x < 0);
      const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
      return `<h3>Trade journal</h3>
      <div class="stats">
        <div><b>${S.journal.length}</b><small>trades</small></div>
        <div><b>${S.journal.length ? Math.round(wins.length / S.journal.length * 100) + '%' : '—'}</b><small>win rate</small></div>
        <div><b class="up">${wins.length ? money(avg(wins)) : '—'}</b><small>avg win</small></div>
        <div><b class="down">${losses.length ? money(avg(losses)) : '—'}</b><small>avg loss</small></div>
      </div>
      <form id="jForm" class="tab">
        <div class="grid2">
          <div class="field"><label for="j-ticker">Ticker</label><input id="j-ticker" required placeholder="AAPL"></div>
          <div class="field"><label for="j-shares">Shares</label><input id="j-shares" required inputmode="decimal" placeholder="5"></div>
          <div class="field"><label for="j-entry">Bought at ($)</label><input id="j-entry" required inputmode="decimal"></div>
          <div class="field"><label for="j-exit">Sold at ($)</label><input id="j-exit" required inputmode="decimal"></div>
        </div>
        <div class="field"><label for="j-why">Why I took it / what I learned</label><textarea id="j-why" rows="2"></textarea></div>
        <label class="check"><input type="checkbox" id="j-plan"> Followed my plan</label>
        <label class="check"><input type="checkbox" id="j-stop"> Had a stop-loss</label>
        <button class="btn go" type="submit">Add to journal</button>
      </form>
      <ul class="entries">${S.journal.map((j, i) => ({ j, i })).reverse().map(({ j, i }) => {
        const pl = (j.exit - j.entry) * j.shares;
        return `<li><div class="head"><b>${esc(j.ticker)} · ${j.shares} sh</b><span class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${money(pl)}</span></div>
          <span class="muted">${esc(j.date)} · ${j.plan ? 'followed plan' : 'off plan'} · ${j.stop ? 'stop set' : 'no stop'}</span>
          ${j.why ? `<span>${esc(j.why)}</span>` : ''}
          <button class="del" data-del="${i}">Delete</button></li>`;
      }).join('')}</ul>`;
    },
    add() {
      const n = id => parseFloat($('#j-' + id).value);
      const e = { ticker: $('#j-ticker').value.trim().toUpperCase(), shares: n('shares'), entry: n('entry'), exit: n('exit'),
        why: $('#j-why').value.trim(), plan: $('#j-plan').checked, stop: $('#j-stop').checked, date: new Date().toLocaleDateString() };
      if (!e.ticker || !(e.shares > 0) || !(e.entry > 0) || !(e.exit > 0)) return toast('Fill in ticker, shares and both prices.');
      S.journal.push(e); save();
      if (!e.stop) toast('Logged. Next time, add a stop-loss before you enter.');
      $('#tool').innerHTML = TOOLS.journal.html(); refreshTasks();
    },
  },

  plan: {
    html: () => `<h3>My trading plan</h3>${PLAN_FIELDS.map(f => `<div class="field"><label for="p-${f.id}">${esc(f.label)}</label>
      <textarea id="p-${f.id}" data-plan="${f.id}" rows="2" placeholder="${esc(f.ph)}">${esc(S.plan[f.id] || '')}</textarea></div>`).join('')}
      <p class="muted">Saves as you type.</p>`,
  },

  golive: {
    html: () => `<h3>Go-live checklist</h3><ul class="tasks">${GOLIVE_ITEMS.map((t, i) =>
      `<li><label><input type="checkbox" data-golive="${i}" ${S.golive[i] ? 'checked' : ''}><span>${esc(t)}</span></label></li>`).join('')}</ul>
      <p class="muted">You have logged ${S.journal.length} paper trade${S.journal.length === 1 ? '' : 's'} so far.</p>`,
  },
};

/* ---------- talking to the page ---------- */
async function toPage(msg) {
  $('#status').textContent = '';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { await chrome.tabs.sendMessage(tab.id, msg); }
  catch { $('#status').textContent = 'Pip can\'t reach this tab. Open your trading platform and reload the page once.'; }
}
$('#tourBtn').onclick = () => toPage({ type: 'pip:tour' });
$('#explainBtn').onclick = () => toPage({ type: 'pip:explain' });
$('#hideBtn').onclick = () => toPage({ type: 'pip:hide' });

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  const open = t.closest('[data-open]');
  if (open && !open.disabled) { view.lesson = open.dataset.open; renderGuide(); scrollTo(0, 0); return; }
  if (t.closest('[data-back]')) { view.lesson = null; renderGuide(); return; }
  if (t.closest('[data-show]')) { const l = findLesson(view.lesson); toPage({ type: 'pip:show', query: l.show, title: l.title, text: l.body[0] }); return; }
  const del = t.closest('[data-del]');
  if (del) { S.journal.splice(+del.dataset.del, 1); save(); $('#tool').innerHTML = TOOLS.journal.html(); refreshTasks(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.task) { S.tasks[t.dataset.task] = t.checked; save(); refreshTasks(); }
  if (t.dataset.golive) { S.golive[+t.dataset.golive] = t.checked; save(); refreshTasks(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id?.startsWith('sz-')) TOOLS.sizer.calc();
  if (t.dataset.plan) { S.plan[t.dataset.plan] = t.value; save(); refreshTasks(); }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'quiz') { e.preventDefault(); gradeQuiz(findLesson(view.lesson)); }
  if (e.target.id === 'jForm') { e.preventDefault(); TOOLS.journal.add(); }
});

/* ---------- tabs ---------- */
document.querySelector('.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.tab[id]').forEach(s => (s.hidden = s.id !== b.dataset.tab));
});

/* ---------- chat ---------- */
function renderChat() {
  $('#log').innerHTML = chat.length ? chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'pip'} ${m.wait ? 'wait' : ''}">${esc(m.content)}</div>`).join('')
    : '<div class="msg pip">Hi! Ask me anything about trading or about what\'s on your screen. I explain how things work, but I won\'t tell you what to buy.</div>';
  $('#log').lastElementChild?.scrollIntoView({ block: 'end' });
}
$('#chatForm').addEventListener('submit', async e => {
  e.preventDefault();
  const q = $('#chatInput').value.trim(); if (!q) return;
  $('#chatInput').value = '';
  chat.push({ role: 'user', content: q }, { role: 'assistant', content: 'Pip is thinking…', wait: true });
  renderChat();
  const nx = nextLesson();
  const res = await chrome.runtime.sendMessage({
    type: 'pip:chat', withScreen: $('#withScreen').checked,
    messages: chat.filter(m => !m.wait).map(({ role, content }) => ({ role, content })),
    context: (nx ? `The user is on stage "${nx.stage.title}", working on the step "${nx.title}". They have logged ${S.journal.length} paper trades.` : 'The user has finished the beginner guide.')
      + (lastQuote ? `\nThey just looked up this quote: ${JSON.stringify(lastQuote)}. Explain what the numbers mean if asked, but never say whether to buy or sell.` : ''),
  });
  chat.pop();
  chat.push({ role: 'assistant', content: res?.ok ? res.result : `I couldn't answer that: ${res?.error || 'unknown error'}` });
  renderChat();
});
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chatForm').requestSubmit(); } });

/* ---------- quotes (Finnhub, via the local backend) ---------- */
$('#quoteForm').addEventListener('submit', async e => {
  e.preventDefault();
  const symbol = $('#quoteSymbol').value.trim().toUpperCase(); if (!symbol) return;
  $('#quoteOut').innerHTML = '<p class="muted">Looking up…</p>';
  const res = await chrome.runtime.sendMessage({ type: 'pip:quote', symbol });
  if (!res?.ok) { lastQuote = null; $('#quoteOut').innerHTML = `<p class="warn">${esc(res?.error || 'Could not get a quote.')}</p>`; return; }
  const q = lastQuote = res.result;
  const dir = q.change > 0 ? 'up' : q.change < 0 ? 'down' : '';
  const sign = q.change > 0 ? '+' : '';
  $('#quoteOut').innerHTML = `<div class="result">
    <span class="muted">${esc(q.symbol)} · ${new Date(q.time * 1000).toLocaleString()}</span>
    <strong>${money(q.price)} <span class="chg ${dir}">${sign}${q.change.toFixed(2)} (${sign}${q.changePct.toFixed(2)}%)</span></strong>
    <span class="muted">Open ${money(q.open)} · High ${money(q.high)} · Low ${money(q.low)} · Prev close ${money(q.prevClose)}</span>
  </div>
  <p class="muted">Not sure what these mean? Ask Pip below.</p>`;
});

/* ---------- settings ---------- */
async function checkBackend() {
  $('#backendStatus').textContent = 'Checking…';
  const res = await chrome.runtime.sendMessage({ type: 'pip:health' });
  $('#backendStatus').textContent = !res?.ok ? res?.error || 'Backend not reachable.'
    : `Running. Finnhub key: ${res.result.finnhub ? 'set' : 'missing'}. Anthropic key: ${res.result.claude ? 'set' : 'missing (using the key below)'}.`;
}
$('#backendCheck').onclick = checkBackend;
document.querySelector('[data-tab="settings"]').addEventListener('click', checkBackend);
$('#key').addEventListener('change', () => chrome.storage.local.set({ apiKey: $('#key').value.trim() }, () => toast('API key saved.')));
function setAppleColor(c) {
  $('#miniPip').classList.toggle('green', c === 'green');
  document.querySelector(`[name="appleColor"][value="${c}"]`).checked = true;
}
document.querySelectorAll('[name="appleColor"]').forEach(r => r.addEventListener('change', () => {
  setAppleColor(r.value); chrome.storage.local.set({ appleColor: r.value });
}));
let resetArmed = false;
$('#resetBtn').onclick = async () => {
  if (!resetArmed) { resetArmed = true; $('#resetBtn').textContent = 'Click again to erase all progress'; $('#resetNote').textContent = 'This clears your steps, journal and plan.'; return; }
  S = structuredClone(DEFAULT); tourDone = false; await chrome.storage.local.set({ pip: S, tourDone: false });
  resetArmed = false; $('#resetBtn').textContent = 'Reset my progress'; $('#resetNote').textContent = 'Progress reset.';
  view.lesson = null; renderGuide();
};

/* ---------- toast + live updates from the page ---------- */
let toastTimer;
function toast(text) {
  let el = $('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.textContent = text; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 3500);
}
chrome.storage.onChanged.addListener(ch => {
  if (ch.tourDone?.newValue && !tourDone) {
    tourDone = true;
    const nx = nextLesson();
    toast(`Tour finished! Next up: ${nx ? nx.title : 'you\'re all done'}.`);
    renderGuide();
  }
});

load().then(() => { renderGuide(); renderChat(); });
