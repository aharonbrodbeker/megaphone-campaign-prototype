(() => {
  'use strict';

  const D = window.DATA;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------------------------------------------------------------- state
  const S = {
    route: 'public',
    paused: false,
    agentState: 'thinking',
    actions: clone(D.actions),
    approvals: clone(D.approvals),
    feed: clone(D.feed),
    stats: clone(D.stats),
    tools: clone(D.tools),
    budget: clone(D.budget),
    brain: { ...clone(D.brain), tone: 35, sharpness: 50, humor: 30 },
    store: {},
    hourly: [...D.hourly],
    logFilter: { tool: 'all', status: 'all', q: '' },
    feedFilter: 'all',
    callFilter: 'all',
    chat: [{ who: 'bot', text: "Hi, I'm Megaphone, the campaign's AI agent. Ask me anything about what I've done: posts, emails, calls or spending. My answers come straight from the activity log." }],
    chatBusy: false,
    thoughtIdx: 0,
    evIdx: 0,
    nextId: 1091,
    selectedCall: 'C-1',
    player: { playing: false, t: 0, timer: null },
    editing: null,
    cardFrozen: false,
  };

  // ---------------------------------------------------------------- helpers
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const ils = (n) => '₪' + Number(n).toLocaleString('en-US', { maximumFractionDigits: n % 1 ? 2 : 0 });
  const compact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
  const icons = () => window.lucide && window.lucide.createIcons();
  const nowHM = () => new Date().toTimeString().slice(0, 5);
  const rich = (s) => esc(s).replace(/\[\[src:(.+?)\]\]/g, (_, l) => `<span class="src-tag"><i data-lucide="link-2" class="w-3 h-3"></i>${l}</span>`);
  const findAction = (id) => S.actions.find((a) => a.id === id);
  const TOOL = Object.fromEntries(D.tools.map((t) => [t.id, t]));
  const tool = (id) => S.tools.find((t) => t.id === id) || TOOL[id];

  const X_SVG = (cls) => `<svg viewBox="0 0 24 24" class="${cls}" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
  const toolIcon = (id, cls = 'w-4 h-4') => (id === 'x' ? X_SVG(cls) : `<i data-lucide="${TOOL[id]?.icon || 'circle'}" class="${cls}"></i>`);
  const toolChip = (id, extra = '') => `<div class="tool-chip tool-${id} ${extra}">${toolIcon(id)}</div>`;

  const STATUS = {
    executed: ['b-green', 'check', 'Executed'],
    pending: ['b-amber', 'clock', 'Awaiting approval'],
    blocked: ['b-red', 'shield-x', 'Blocked'],
    rejected: ['b-slate', 'x', 'Rejected'],
    failed: ['b-red', 'triangle-alert', 'Failed'],
  };
  const POLICY = {
    auto: ['b-green', 'zap', 'Auto'],
    approval: ['b-amber', 'user-check', 'Human approval'],
    blocked: ['b-red', 'shield-alert', 'Blocked by policy'],
  };
  const MODES = { off: 'Off', approval: 'Needs approval', auto: 'Automatic' };
  const badge = (map, k) => { const [c, i, l] = map[k]; return `<span class="badge ${c}"><i data-lucide="${i}" class="w-3 h-3"></i>${l}</span>`; };
  const statusBadge = (s) => badge(STATUS, s);
  const policyBadge = (p) => badge(POLICY, p);

  const highlightJson = (obj) =>
    esc(JSON.stringify(obj, null, 2))
      .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="k">$1</span>$2')
      .replace(/:\s(&quot;.*?&quot;)/g, ': <span class="s">$1</span>')
      .replace(/:\s(-?\d+\.?\d*|true|false)/g, ': <span class="n">$1</span>');

  // ---------------------------------------------------------------- UI primitives
  function toast(msg, color = 'cyan', icon = 'info') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<div class="tool-chip !w-7 !h-7" style="color:var(--${color})"><i data-lucide="${icon}" class="w-4 h-4"></i></div><div class="flex-1 pt-0.5 text-slate-200 leading-snug">${msg}</div>`;
    $('#toasts').prepend(el);
    icons();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 4200);
  }

  function modal({ title, body, confirm = 'Confirm', cancel = 'Cancel', kind = 'btn-primary', icon = 'info', color = 'cyan', onConfirm }) {
    const root = $('#modal-root');
    root.innerHTML = `
      <div class="modal-wrap" data-act="modal-bg">
        <div class="modal panel p-6">
          <div class="flex items-start gap-4">
            <div class="tool-chip !w-11 !h-11" style="color:var(--${color})"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-bold text-white">${title}</h3>
              <div class="mt-2 text-sm text-slate-400 leading-relaxed">${body}</div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            ${cancel ? `<button class="btn btn-outline" data-act="modal-close">${cancel}</button>` : ''}
            ${confirm ? `<button class="btn ${kind}" id="modal-ok">${confirm}</button>` : ''}
          </div>
        </div>
      </div>`;
    icons();
    const ok = $('#modal-ok');
    if (ok) ok.onclick = () => { const r = onConfirm && onConfirm(root); if (r !== false) closeModal(); };
  }
  const closeModal = () => { $('#modal-root').innerHTML = ''; };

  function openDrawer(html) {
    $('#drawer-root').innerHTML = `<div class="drawer-backdrop" data-act="drawer-close"></div><aside class="drawer">${html}</aside>`;
    icons();
  }
  const closeDrawer = () => { $('#drawer-root').innerHTML = ''; };

  function page(title, sub, actions, body) {
    return `
      ${S.paused ? `<div class="paused-banner px-6 py-3 flex items-center gap-3 text-sm"><i data-lucide="octagon-x" class="w-4 h-4 text-neon-red"></i><span class="text-white font-semibold">Agent paused.</span><span class="text-slate-300">All tool calls are frozen, scheduled posts are on hold and payments are blocked.</span><button class="ms-auto btn btn-green !py-1.5" data-act="kill">Resume agent</button></div>` : ''}
      <div class="p-6 lg:p-8 max-w-[1500px] mx-auto">
        <div class="flex flex-wrap items-end gap-4 mb-7">
          <div class="flex-1 min-w-[240px]">
            <h1 class="text-2xl font-extrabold text-white tracking-tight">${title}</h1>
            <p class="text-sm text-slate-500 mt-1">${sub}</p>
          </div>
          <div class="flex flex-wrap gap-2">${actions || ''}</div>
        </div>
        ${body}
      </div>`;
  }

  const orbClass = () => (S.paused ? 'paused' : S.agentState === 'acting' ? 'acting' : S.agentState === 'waiting' ? 'waiting' : '');
  const stateWord = () => (S.paused ? 'paused by a manager' : S.agentState === 'acting' ? 'executing an action' : S.agentState === 'waiting' ? 'waiting for approval' : 'thinking');

  // ---------------------------------------------------------------- chrome
  const NAV = [
    { sec: 'Command' },
    { id: 'ops', label: 'Ops room', icon: 'radar' },
    { id: 'approvals', label: 'Approval queue', icon: 'inbox', badge: () => S.approvals.length },
    { id: 'log', label: 'Activity log', icon: 'scroll-text' },
    { sec: 'Agent' },
    { id: 'brain', label: 'Agent brain', icon: 'brain' },
    { id: 'tools', label: 'Tools & permissions', icon: 'plug-zap' },
    { id: 'budget', label: 'Budget & payments', icon: 'wallet' },
    { id: 'calls', label: 'Call center', icon: 'phone-call' },
    { sec: 'Public' },
    { id: 'public', label: 'Public page', icon: 'globe' },
  ];

  function renderNav() {
    $('#nav').innerHTML = NAV.map((n) =>
      n.sec
        ? `<div class="nav-section">${n.sec}</div>`
        : `<a href="#/${n.id}" class="nav-item ${S.route === n.id ? 'active' : ''}"><i data-lucide="${n.icon}" class="w-4 h-4"></i><span>${n.label}</span>${n.badge && n.badge() ? `<span class="nav-badge" id="nav-badge-${n.id}">${n.badge()}</span>` : ''}</a>`
    ).join('');
    renderPill();
    renderKillBtn();
  }

  function renderPill() {
    const [dot, label] = S.paused ? ['dot-red', 'Paused'] : { thinking: ['dot-cyan', 'Thinking'], acting: ['dot-green', 'Executing'], waiting: ['dot-amber', 'Waiting for approval'] }[S.agentState];
    $('#agent-pill').innerHTML = `<div class="agent-pill"><span class="dot ${dot}"></span><span class="font-semibold text-white">Megaphone</span><span class="text-slate-400">${label}</span><span class="hidden sm:inline text-slate-600">·</span><span class="hidden sm:inline text-slate-500 font-mono text-xs">claude-opus</span></div>`;
  }

  function renderKillBtn() {
    const b = $('#kill-btn');
    b.classList.toggle('resume', S.paused);
    b.innerHTML = S.paused ? '<i data-lucide="play" class="w-4 h-4"></i><span>Resume agent</span>' : '<i data-lucide="octagon-x" class="w-4 h-4"></i><span>Stop everything</span>';
    icons();
  }

  function tickClock() {
    const el = $('#clock');
    if (!el) return;
    const d = new Date();
    el.innerHTML = `<i data-lucide="clock-3" class="w-3.5 h-3.5"></i>${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toTimeString().slice(0, 8)} · Day ${D.campaign.day}`;
    icons();
  }

  // ---------------------------------------------------------------- thought typing
  let typeTimer = null;
  function showThought(text = D.thoughts[S.thoughtIdx]) {
    clearInterval(typeTimer);
    const targets = ['#thought-ops', '#thought-public'].map((s) => $(s)).filter(Boolean);
    if (!targets.length) return;
    const t = S.paused ? 'Paused. Waiting for a manager to resume.' : text;
    let i = 0;
    typeTimer = setInterval(() => {
      i += 2;
      targets.forEach((el) => (el.textContent = t.slice(0, i)));
      if (i >= t.length) clearInterval(typeTimer);
    }, 22);
  }

  function updateOrbs() {
    $$('.orb').forEach((o) => { o.classList.remove('paused', 'acting', 'waiting'); const c = orbClass(); if (c) o.classList.add(c); });
    $$('[data-state-word]').forEach((el) => (el.textContent = stateWord()));
  }

  // ================================================================ PUBLIC
  function feedItem(f, extra = '') {
    const head = (icon, label) => `
      <div class="flex items-center gap-3">
        <div class="logo-mark !w-10 !h-10"><i data-lucide="megaphone" class="w-4 h-4"></i></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap"><span class="text-white font-semibold text-sm">${D.campaign.name}</span><span class="bot-tag"><i data-lucide="bot" class="w-3 h-3"></i>AI</span><span class="text-xs text-slate-500">${f.type === 'tweet' ? D.campaign.handle + ' · ' : ''}${f.time}</span></div>
          <div class="text-[11px] text-slate-500 mt-0.5">${label}</div>
        </div>
        <div class="text-slate-500">${icon}</div>
      </div>`;
    const why = `<button class="btn-ghost text-xs !px-2 !py-1" data-act="why" data-id="${f.actionId}"><i data-lucide="brain" class="w-3.5 h-3.5"></i>Why did the agent do this?</button>`;
    if (f.type === 'tweet') {
      return `<article class="panel panel-hover p-5 ${extra}" data-feed="${f.actionId}">
        ${head(X_SVG('w-4 h-4'), 'Posted on X')}
        <div class="tweet-text mt-4">${rich(f.text)}</div>
        <div class="mt-2 text-xs text-slate-500 italic">Written and posted by Megaphone (AI)</div>
        <div class="mt-4 flex items-center gap-5 text-xs text-slate-500">
          <span class="flex items-center gap-1.5"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i>${fmt(f.replies)}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="repeat-2" class="w-3.5 h-3.5"></i>${fmt(f.reposts)}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="heart" class="w-3.5 h-3.5"></i>${fmt(f.likes)}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>${f.views}</span>
          <span class="ms-auto">${why}</span>
        </div>
      </article>`;
    }
    if (f.type === 'email') {
      return `<article class="panel panel-hover p-5 ${extra}" data-feed="${f.actionId}">
        ${head('<i data-lucide="mail" class="w-4 h-4"></i>', 'Email · opt-in list only')}
        <div class="mt-4 rounded-xl border border-white/5 bg-ink-950/60 p-4">
          <div class="text-white font-semibold text-sm">${esc(f.subject)}</div>
          <div class="text-sm text-slate-400 mt-1.5 line-clamp-2">${esc(f.preview)}</div>
        </div>
        <div class="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span class="flex items-center gap-1.5"><i data-lucide="send" class="w-3.5 h-3.5"></i>${fmt(f.sent)} delivered</span>
          <span class="flex items-center gap-1.5"><i data-lucide="mail-open" class="w-3.5 h-3.5"></i>${f.openRate}% opened</span>
          <span class="badge b-green"><i data-lucide="shield-check" class="w-3 h-3"></i>Opt-in</span>
          <span class="ms-auto">${why}</span>
        </div>
      </article>`;
    }
    return `<article class="panel panel-hover p-5 ${extra}" data-feed="${f.actionId}">
      ${head('<i data-lucide="phone" class="w-4 h-4"></i>', 'Voice calls · requested by recipients')}
      <p class="mt-4 text-sm text-slate-300 leading-relaxed">${esc(f.summary)}</p>
      <div class="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span class="flex items-center gap-1.5"><i data-lucide="phone-outgoing" class="w-3.5 h-3.5"></i>${f.calls} calls</span>
        <span class="flex items-center gap-1.5"><i data-lucide="phone-incoming" class="w-3.5 h-3.5"></i>${f.connected} connected</span>
        <span class="badge b-cyan"><i data-lucide="bot" class="w-3 h-3"></i>Disclosed as AI</span>
        <span class="ms-auto">${why}</span>
      </div>
    </article>`;
  }

  function publicFeedHtml() {
    const map = { posts: 'tweet', emails: 'email', calls: 'call' };
    const items = S.feed.filter((f) => S.feedFilter === 'all' || f.type === map[S.feedFilter]);
    return items.map((f) => feedItem(f)).join('') || `<div class="panel p-10 text-center text-slate-500">Nothing here yet.</div>`;
  }

  function publicLogHtml() {
    return S.actions.slice(0, 9).map((a) => `
      <button class="w-full text-start flex gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/[.02] px-1 rounded" data-act="why" data-id="${a.id}">
        ${toolChip(a.tool, '!w-7 !h-7')}
        <div class="flex-1 min-w-0">
          <div class="text-[13px] text-slate-200 line-clamp-2 leading-snug">${esc(a.title)}</div>
          <div class="mt-1 flex items-center gap-2"><span class="text-[11px] text-slate-500 font-mono">${a.time}</span>${statusBadge(a.status)}</div>
        </div>
      </button>`).join('');
  }

  function publicStatsHtml() {
    const st = S.stats;
    const card = (icon, color, label, value, sub) => `
      <div class="panel p-5">
        <div class="flex items-center gap-2 text-xs text-slate-500"><i data-lucide="${icon}" class="w-4 h-4" style="color:var(--${color})"></i>${label}</div>
        <div class="mt-2 text-3xl font-black text-white tracking-tight">${value}</div>
        <div class="text-xs text-slate-500 mt-1">${sub}</div>
      </div>`;
    return [
      card('send', 'cyan', 'Posts on X', fmt(st.tweets), `${compact(st.reach)} total reach`),
      card('mail', 'violet', 'Emails delivered', fmt(st.emails), 'Opt-in subscribers only'),
      card('phone', 'green', 'Calls made', fmt(st.calls), 'Every call discloses AI'),
      card('users', 'amber', 'Supporters', fmt(st.supporters), '+214 this week'),
      card('wallet', 'red', 'Budget used', ils(st.spent), `of ${ils(st.budget)} this month`),
    ].join('');
  }

  function viewPublic() {
    const c = D.campaign;
    const chips = [['all', 'Everything'], ['posts', 'Posts'], ['emails', 'Emails'], ['calls', 'Calls']]
      .map(([k, l]) => `<button class="chip-filter ${S.feedFilter === k ? 'active' : ''}" data-act="feed-filter" data-v="${k}">${l}</button>`).join('');
    const suggestions = ['What did you do today?', 'Did you spend money?', 'Who did you call?', 'Are you a real person?', 'How do you check facts?']
      .map((q) => `<button class="chip-filter !text-[11px] !py-1" data-act="ask" data-q="${esc(q)}">${q}</button>`).join('');
    const blockedToday = S.actions.filter((a) => a.status === 'blocked').length;
    return `
    <div class="min-h-screen">
      <header class="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
        <div class="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div class="logo-mark"><i data-lucide="megaphone" class="w-5 h-5"></i></div>
          <div><div class="font-extrabold text-white tracking-tight">${c.name}</div><div class="text-[11px] text-slate-500">${c.handle} · Day ${c.day}</div></div>
          <div class="flex-1"></div>
          <div class="hidden md:flex items-center gap-2 text-sm text-slate-400 live-indicator" id="public-live"><span class="dot ${S.paused ? 'dot-red' : 'dot-green'}"></span>${S.paused ? 'Agent paused' : 'Agent live'}</div>
          <a href="#/ops" class="btn btn-outline"><i data-lucide="lock" class="w-4 h-4"></i>Managers</a>
        </div>
      </header>

      <section class="max-w-7xl mx-auto px-6 pt-14 pb-10 grid lg:grid-cols-5 gap-10 items-center">
        <div class="lg:col-span-3 fade-in">
          <span class="badge b-cyan !px-3 !py-1 mb-6"><i data-lucide="bot" class="w-3.5 h-3.5"></i>Run by an AI agent · supervised by humans · fully logged</span>
          <h1 class="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.02]">Your dues.<br/>Your voice.<br/><span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-green">Your right to know.</span></h1>
          <p class="mt-6 text-slate-400 text-lg max-w-xl leading-relaxed">${c.description}</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <button class="btn btn-primary !px-5 !py-3 !text-sm" data-act="join"><i data-lucide="user-plus" class="w-4 h-4"></i>Join the campaign</button>
            <a href="#ask-anchor" class="btn btn-outline !px-5 !py-3 !text-sm" data-act="scroll-ask"><i data-lucide="message-square" class="w-4 h-4"></i>Ask the agent</a>
          </div>
        </div>
        <div class="lg:col-span-2 fade-in">
          <div class="panel p-6 scan-line">
            <div class="flex items-center gap-4">
              <div class="orb !w-14 !h-14 ${orbClass()}"></div>
              <div>
                <div class="text-[11px] text-slate-500 uppercase tracking-widest">Right now</div>
                <div class="text-white font-semibold">Megaphone is <span data-state-word>${stateWord()}</span></div>
              </div>
            </div>
            <div class="mt-5 font-mono text-[13px] text-neon-cyan/90 min-h-[66px] leading-relaxed caret" id="thought-public"></div>
            <div class="mt-5 pt-5 border-t border-white/5 grid grid-cols-3 gap-3 text-center">
              <div><div class="text-2xl font-black text-white" id="pub-actions">${S.stats.actionsToday}</div><div class="text-[11px] text-slate-500">actions today</div></div>
              <div><div class="text-2xl font-black text-neon-amber" id="pub-pending">${S.approvals.length}</div><div class="text-[11px] text-slate-500">awaiting a human</div></div>
              <div><div class="text-2xl font-black text-neon-red">${blockedToday}</div><div class="text-[11px] text-slate-500">blocked by policy</div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-4 stagger" id="public-stats">${publicStatsHtml()}</section>

      <section class="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          <div class="flex items-center gap-3 mb-5 flex-wrap">
            <h2 class="text-xl font-bold text-white">What the agent published</h2>
            <span class="text-xs text-slate-500">Every item links to the agent's reasoning</span>
            <div class="ms-auto flex gap-2">${chips}</div>
          </div>
          <div class="space-y-4" id="public-feed">${publicFeedHtml()}</div>
        </div>

        <aside class="space-y-6">
          <div id="ask-anchor" class="panel flex flex-col h-[600px] lg:sticky lg:top-6">
            <div class="p-4 border-b border-white/5 flex items-center gap-3">
              <div class="orb !w-9 !h-9 ${orbClass()}"></div>
              <div class="flex-1"><div class="text-white font-semibold text-sm">Ask Megaphone</div><div class="text-[11px] text-slate-500">Answers are grounded in the public activity log</div></div>
              <span class="badge b-slate"><i data-lucide="lock" class="w-3 h-3"></i>Read-only</span>
            </div>
            <div id="chat-log" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
            <div class="px-4 pb-2 flex flex-wrap gap-1.5">${suggestions}</div>
            <form class="p-3 border-t border-white/5 flex gap-2" data-form="chat">
              <input class="input" name="q" placeholder="Ask about anything the agent did…" autocomplete="off" />
              <button class="btn btn-primary !px-3" type="submit"><i data-lucide="arrow-up" class="w-4 h-4"></i></button>
            </form>
          </div>
        </aside>
      </section>

      <section class="max-w-7xl mx-auto px-6 pb-16">
        <div class="panel p-6">
          <div class="flex items-center gap-3 mb-3">
            <i data-lucide="scroll-text" class="w-4 h-4 text-neon-cyan"></i>
            <h2 class="text-white font-bold">Public activity log</h2>
            <span class="text-xs text-slate-500">Includes blocked and rejected actions. Nothing is hidden.</span>
          </div>
          <div class="grid md:grid-cols-3 gap-x-8" id="public-log">${publicLogHtml()}</div>
        </div>
        <footer class="mt-10 text-center text-xs text-slate-600 space-y-1">
          <div>This campaign is operated by an AI agent (Megaphone, built on Claude) under the supervision of a human team.</div>
          <div>Prototype · all data is simulated</div>
        </footer>
      </section>
    </div>`;
  }

  function renderChat() {
    const log = $('#chat-log');
    if (!log) return;
    log.innerHTML = S.chat.map((m) => {
      if (m.who === 'user') return `<div class="chat-msg chat-user fade-in">${esc(m.text)}</div>`;
      if (m.typing && !m.text) return `<div class="chat-msg chat-bot w-16"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
      const a = m.ref && findAction(m.ref);
      return `<div class="chat-msg chat-bot">${esc(m.text)}${m.typing ? '<span class="caret"></span>' : ''}
        ${a && !m.typing ? `<div class="mt-2.5 pt-2.5 border-t border-white/5"><button class="src-tag !text-[11px] !py-0.5" data-act="why" data-id="${a.id}"><i data-lucide="scroll-text" class="w-3 h-3"></i>From log · ${a.id} · ${a.time}</button></div>` : ''}</div>`;
    }).join('');
    icons();
    log.scrollTop = log.scrollHeight;
  }

  function answerFor(q) {
    const text = q.toLowerCase();
    let best = null, score = 0;
    D.qa.forEach((item) => {
      const s = item.keys.reduce((n, k) => n + (new RegExp(`\\b${k}\\b`, 'i').test(text) ? 1 : 0), 0);
      if (s > score) { score = s; best = item; }
    });
    return best || { answer: "I couldn't find anything in my activity log that answers that precisely. I can tell you about today's posts, emails, calls, spending, or how I verify facts. The human team also reads these questions daily.", ref: null };
  }

  function askBot(q) {
    if (!q.trim() || S.chatBusy) return;
    S.chatBusy = true;
    S.chat.push({ who: 'user', text: q });
    const reply = answerFor(q);
    const msg = { who: 'bot', text: '', ref: reply.ref, typing: true };
    S.chat.push(msg);
    renderChat();
    setTimeout(() => {
      let i = 0;
      const timer = setInterval(() => {
        i += 3;
        msg.text = reply.answer.slice(0, i);
        if (i >= reply.answer.length) { msg.text = reply.answer; msg.typing = false; clearInterval(timer); S.chatBusy = false; }
        renderChat();
      }, 18);
    }, 900);
  }

  function showWhy(id) {
    const a = findAction(id);
    if (!a) return toast('That action is older than this demo log.', 'amber', 'archive');
    modal({
      title: esc(a.title),
      icon: 'brain', color: 'violet',
      body: `
        <div class="flex flex-wrap gap-2 mb-4">${statusBadge(a.status)}${policyBadge(a.policy)}<span class="badge b-slate font-mono">${a.id} · ${a.time}</span></div>
        <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Agent's reasoning at the time</div>
        <div class="text-slate-200 mb-4">${esc(a.reasoning)}</div>
        <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Result</div>
        <div class="text-slate-300">${esc(a.output)}</div>
        ${a.approvedBy ? `<div class="mt-4 text-xs text-neon-green flex items-center gap-1.5"><i data-lucide="user-check" class="w-3.5 h-3.5"></i>Approved by ${a.approvedBy}</div>` : ''}
        ${a.rejectedBy ? `<div class="mt-4 text-xs text-slate-400 flex items-center gap-1.5"><i data-lucide="user-x" class="w-3.5 h-3.5"></i>Rejected by ${a.rejectedBy}</div>` : ''}`,
      confirm: null, cancel: 'Close',
    });
  }

  // ================================================================ OPS
  function kpiHtml() {
    const pend = S.approvals.length;
    const k = (id, icon, color, label, value, sub) => `
      <div class="col-span-6 md:col-span-3 panel p-5" id="${id}">
        <div class="flex items-center justify-between"><span class="text-xs text-slate-500">${label}</span><i data-lucide="${icon}" class="w-4 h-4" style="color:var(--${color})"></i></div>
        <div class="mt-2 text-3xl font-black text-white tracking-tight">${value}</div>
        <div class="text-xs mt-1 text-slate-500">${sub}</div>
      </div>`;
    return [
      k('kpi-actions', 'activity', 'cyan', 'Actions today', S.stats.actionsToday, `${S.actions.filter((a) => a.policy === 'auto').length} automatic · ${S.actions.filter((a) => a.policy === 'approval').length} approved`),
      k('kpi-pending', 'inbox', 'amber', 'Awaiting approval', pend, pend ? '<a href="#/approvals" class="text-neon-amber hover:underline">Review queue →</a>' : 'Queue is clear'),
      k('kpi-spend', 'wallet', 'green', 'Spent today', ils(S.budget.dailySpent), `of ${ils(S.budget.dailyCap)} daily cap`),
      k('kpi-reach', 'radio-tower', 'violet', 'Reach this month', compact(S.stats.reach), '+12% vs last week'),
    ].join('');
  }

  function actionRow(a, cls = '') {
    return `<div class="flex gap-4 px-5 py-4 hover:bg-white/[.02] cursor-pointer ${cls}" data-act="open-action" data-id="${a.id}">
      ${toolChip(a.tool)}
      <div class="flex-1 min-w-0">
        <div class="text-white text-sm font-medium">${esc(a.title)}</div>
        <div class="text-xs text-slate-500 mt-1 line-clamp-1">${esc(a.reasoning)}</div>
      </div>
      <div class="text-end shrink-0 space-y-1.5">
        <div>${statusBadge(a.status)}</div>
        <div class="text-[11px] text-slate-500 font-mono">${a.time} · ${a.id}</div>
      </div>
    </div>`;
  }

  function chartSvg() {
    const max = Math.max(...S.hourly, 1), w = 300, h = 110, bw = w / 24, cur = new Date().getHours();
    const bars = S.hourly.map((v, i) => {
      const bh = Math.max(2, (v / max) * (h - 10));
      return `<rect x="${i * bw + 1.5}" y="${h - bh}" width="${bw - 3}" height="${bh}" rx="2" fill="${i === cur ? 'url(#gGreen)' : 'url(#gCyan)'}"><title>${String(i).padStart(2, '0')}:00 · ${v} actions</title></rect>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" class="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ee6ff" stop-opacity=".85"/><stop offset="1" stop-color="#2ee6ff" stop-opacity=".08"/></linearGradient>
        <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bff9a"/><stop offset="1" stop-color="#2bff9a" stop-opacity=".15"/></linearGradient>
      </defs>${bars}</svg>
      <div class="flex justify-between text-[10px] text-slate-600 font-mono mt-1"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>`;
  }

  function toolUsageHtml() {
    return S.tools.map((t) => {
      const pct = Math.min(100, (t.used / t.quota) * 100);
      const color = t.mode === 'off' ? '#475569' : pct > 85 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--cyan)';
      return `<div>
        <div class="flex items-center gap-2 text-xs mb-1.5"><span class="text-slate-500">${toolIcon(t.id, 'w-3.5 h-3.5')}</span><span class="text-slate-300">${t.name}</span><span class="ms-auto font-mono text-slate-500">${fmt(t.used)}/${fmt(t.quota)}</span></div>
        <div class="progress-bar"><div style="width:${pct}%;background:${color};box-shadow:0 0 8px ${color}"></div></div>
      </div>`;
    }).join('');
  }

  function opsPendingHtml() {
    if (!S.approvals.length) return `<div class="text-sm text-slate-500 py-4 text-center">Nothing waiting. Nice.</div>`;
    return S.approvals.slice(0, 3).map((p) => `
      <a href="#/approvals" class="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
        ${toolChip(p.tool, '!w-8 !h-8')}
        <div class="flex-1 min-w-0"><div class="text-sm text-slate-200 truncate">${esc(p.title)}</div><div class="text-[11px] ${p.blocked ? 'text-neon-red' : 'text-neon-amber'}">${esc(p.why)}</div></div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      </a>`).join('') + (S.approvals.length > 3 ? `<a href="#/approvals" class="block text-center text-xs text-slate-400 pt-3 hover:text-white">+${S.approvals.length - 3} more</a>` : '');
  }

  function viewOps() {
    const plan = ['Morning news scan', 'Dues thread on X', 'Call new volunteers', 'Weekly newsletter', 'Boost thread if it performs', 'Build journalist list'];
    const done = [true, true, true, false, false, true];
    return page('Ops room', `Day ${D.campaign.day} · live view of everything Megaphone is doing right now`,
      `<a href="#/log" class="btn btn-outline"><i data-lucide="scroll-text" class="w-4 h-4"></i>Full log</a><a href="#/brain" class="btn btn-outline"><i data-lucide="sliders-horizontal" class="w-4 h-4"></i>Steer the agent</a>`,
      `<div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 xl:col-span-8 panel p-6 scan-line">
          <div class="flex items-start gap-6">
            <div class="orb ${orbClass()}"></div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] uppercase tracking-widest text-slate-500">Agent status</span>
                <span class="badge b-violet font-mono">claude-opus · tool use</span>
                <span class="badge b-slate font-mono">prompt v${S.brain.version}</span>
              </div>
              <div class="text-2xl font-extrabold text-white mt-1 first-letter:uppercase" data-state-word>${stateWord()}</div>
              <div class="mt-3 font-mono text-[13px] text-neon-cyan/90 min-h-[44px] leading-relaxed caret" id="thought-ops"></div>
            </div>
          </div>
          <div class="mt-6 pt-5 border-t border-white/5">
            <div class="flex items-center justify-between mb-3"><span class="text-xs text-slate-500">Today's plan (set by the agent at 09:05)</span><span class="text-xs font-mono text-slate-400">${done.filter(Boolean).length}/${plan.length}</span></div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              ${plan.map((p, i) => `<div class="flex items-center gap-2 text-[13px] rounded-lg px-3 py-2 ${done[i] ? 'bg-neon-green/5 text-slate-300' : 'bg-white/[.02] text-slate-400'}"><i data-lucide="${done[i] ? 'circle-check' : i === 3 ? 'clock' : 'circle-dashed'}" class="w-4 h-4 ${done[i] ? 'text-neon-green' : i === 3 ? 'text-neon-amber' : 'text-slate-600'}"></i>${p}</div>`).join('')}
            </div>
          </div>
        </div>

        <div class="col-span-12 xl:col-span-4 panel p-6 flex flex-col">
          <div class="panel-title"><i data-lucide="shield-alert" class="w-4 h-4 text-neon-red"></i>Emergency stop</div>
          <p class="text-sm text-slate-400 mt-2 leading-relaxed">Freezes the agent instantly. No posts, emails, calls or payments until a manager resumes it.</p>
          <ul class="mt-4 space-y-2 text-[13px] text-slate-400">
            <li class="flex gap-2"><i data-lucide="x-circle" class="w-4 h-4 text-slate-600 shrink-0"></i>All pending tool calls are cancelled</li>
            <li class="flex gap-2"><i data-lucide="x-circle" class="w-4 h-4 text-slate-600 shrink-0"></i>Scheduled posts are put on hold</li>
            <li class="flex gap-2"><i data-lucide="x-circle" class="w-4 h-4 text-slate-600 shrink-0"></i>Active calls end politely</li>
            <li class="flex gap-2"><i data-lucide="x-circle" class="w-4 h-4 text-slate-600 shrink-0"></i>Virtual card is frozen</li>
          </ul>
          <div class="flex-1"></div>
          <button class="kill-btn ${S.paused ? 'resume' : ''} w-full justify-center !py-4 !text-base mt-6" data-act="kill">
            <i data-lucide="${S.paused ? 'play' : 'octagon-x'}" class="w-5 h-5"></i>${S.paused ? 'Resume agent' : 'Stop everything'}
          </button>
        </div>

        <div class="col-span-12 grid grid-cols-12 gap-5" id="kpis">${kpiHtml()}</div>

        <div class="col-span-12 xl:col-span-8 panel overflow-hidden">
          <div class="px-5 py-4 border-b border-white/5 flex items-center gap-3">
            <span class="dot ${S.paused ? 'dot-red' : 'dot-green'} live-indicator"></span>
            <span class="panel-title">Live activity</span>
            <span class="panel-sub">New actions appear automatically. Click any row for full details.</span>
          </div>
          <div id="live-feed" class="divide-y divide-white/5 max-h-[620px] overflow-y-auto">${S.actions.map((a) => actionRow(a)).join('')}</div>
        </div>

        <div class="col-span-12 xl:col-span-4 space-y-5">
          <div class="panel p-5">
            <div class="flex items-center justify-between"><span class="panel-title"><i data-lucide="bar-chart-3" class="w-4 h-4 text-neon-cyan"></i>Actions per hour</span><span class="panel-sub">today</span></div>
            <div class="mt-4" id="chart">${chartSvg()}</div>
          </div>
          <div class="panel p-5">
            <div class="flex items-center justify-between mb-4"><span class="panel-title"><i data-lucide="gauge" class="w-4 h-4 text-neon-violet"></i>Tool quotas</span><a href="#/tools" class="text-xs text-slate-500 hover:text-white">Edit</a></div>
            <div class="space-y-3.5" id="tool-usage">${toolUsageHtml()}</div>
          </div>
          <div class="panel p-5">
            <div class="flex items-center justify-between mb-2"><span class="panel-title"><i data-lucide="inbox" class="w-4 h-4 text-neon-amber"></i>Needs your decision</span><a href="#/approvals" class="text-xs text-slate-500 hover:text-white">Open queue</a></div>
            <div id="ops-pending">${opsPendingHtml()}</div>
          </div>
        </div>
      </div>`);
  }

  // ================================================================ APPROVALS
  function previewHtml(p) {
    const pv = p.preview;
    if (pv.type === 'tweet') {
      return `<div class="tweet">
        <div class="flex items-center gap-2 mb-2"><div class="logo-mark !w-7 !h-7 !rounded-lg"><i data-lucide="megaphone" class="w-3.5 h-3.5"></i></div><span class="text-sm font-semibold text-white">${D.campaign.name}</span><span class="bot-tag">AI</span><span class="ms-auto text-slate-500">${X_SVG('w-3.5 h-3.5')}</span></div>
        <div class="tweet-text" data-edit>${rich(pv.text)}</div>
        ${p.blocked ? `<div class="mt-3 flex items-start gap-2 text-xs text-neon-red bg-neon-red/5 border border-neon-red/20 rounded-lg p-2.5"><i data-lucide="shield-x" class="w-4 h-4 shrink-0"></i><span><b>PolicyEngine:</b> "40%" is a factual claim with no verified source. Also matches tone rule: avoid charged language ("outrageous").</span></div>` : ''}
      </div>`;
    }
    if (pv.type === 'email') {
      return `<div class="rounded-xl border border-white/10 bg-ink-950/70 overflow-hidden">
        <div class="px-4 py-2.5 border-b border-white/5 text-xs text-slate-500 flex gap-2"><span>To:</span><span class="text-slate-300">${esc(p.audience)}</span></div>
        <div class="px-4 py-2.5 border-b border-white/5 text-sm text-white font-semibold" data-edit>${esc(pv.subject)}</div>
        <div class="px-4 py-3 text-[13px] text-slate-300 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto" data-edit>${esc(pv.body)}</div>
      </div>`;
    }
    if (pv.type === 'payment') {
      const remain = S.budget.dailyCap - S.budget.dailySpent - pv.amount;
      return `<div class="rounded-xl border border-neon-amber/20 bg-neon-amber/[.03] p-4">
        <div class="flex items-end justify-between gap-4">
          <div><div class="text-[11px] uppercase tracking-widest text-slate-500">Amount</div><div class="text-4xl font-black text-white">${ils(pv.amount)}</div></div>
          <div class="text-end text-xs text-slate-400 space-y-1"><div>Vendor: <span class="text-slate-200">${esc(pv.vendor)}</span></div><div>Duration: <span class="text-slate-200">${esc(pv.duration)}</span></div><div>Card: <span class="font-mono text-slate-200">•••• ${S.budget.card.last4}</span></div></div>
        </div>
        <div class="mt-3 pt-3 border-t border-white/5 text-xs text-slate-400">Target: <span class="text-slate-200">${esc(pv.target)}</span></div>
        <div class="mt-2 text-xs ${remain < 50 ? 'text-neon-amber' : 'text-slate-400'}">Daily budget left after approval: <b>${ils(Math.max(0, remain))}</b></div>
      </div>`;
    }
    return `<div class="rounded-xl border border-white/8 bg-ink-950/70 p-4">
      <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="file-text" class="w-3.5 h-3.5"></i>Call script</div>
      <div class="text-[13px] text-slate-300 whitespace-pre-line leading-relaxed" data-edit>${esc(pv.script)}</div>
    </div>`;
  }

  function approvalCard(p) {
    const riskCls = { Low: 'b-green', Medium: 'b-amber', High: 'b-red' }[p.risk];
    const editing = S.editing === p.id;
    return `<div class="panel p-5 flex flex-col gap-4 ${p.blocked ? '!border-neon-red/30' : ''} fade-in" id="card-${p.id}">
      <div class="flex items-start gap-3">
        ${toolChip(p.tool, '!w-10 !h-10')}
        <div class="flex-1 min-w-0">
          <div class="text-white font-semibold">${esc(p.title)}</div>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <span class="badge ${p.blocked ? 'b-red' : 'b-amber'}"><i data-lucide="${p.blocked ? 'shield-x' : 'user-check'}" class="w-3 h-3"></i>${esc(p.why)}</span>
            <span class="badge ${riskCls}">Risk: ${p.risk}</span>
            ${p.cost ? `<span class="badge b-slate">${ils(p.cost)}</span>` : ''}
          </div>
        </div>
        <span class="text-[11px] font-mono text-slate-600">${p.actionId}</span>
      </div>
      <div id="pv-${p.id}">${previewHtml(p)}</div>
      <div class="rounded-xl bg-neon-violet/[.04] border border-neon-violet/15 p-3.5">
        <div class="text-[11px] uppercase tracking-widest text-neon-violet/80 mb-1 flex items-center gap-1.5"><i data-lucide="brain" class="w-3.5 h-3.5"></i>Agent's reasoning</div>
        <div class="text-[13px] text-slate-300 leading-relaxed">${esc(p.reasoning)}</div>
      </div>
      <div class="text-xs text-slate-500 flex items-center gap-1.5"><i data-lucide="users" class="w-3.5 h-3.5"></i>${esc(p.audience)}</div>
      <div class="flex flex-wrap gap-2 pt-1">
        ${p.blocked
          ? `<button class="btn btn-primary" data-act="fix-blocked" data-id="${p.id}"><i data-lucide="search-check" class="w-4 h-4"></i>Ask agent to find a source</button>
             <button class="btn btn-red" data-act="reject" data-id="${p.id}"><i data-lucide="trash-2" class="w-4 h-4"></i>Discard</button>`
          : `<button class="btn btn-green" data-act="approve" data-id="${p.id}"><i data-lucide="check" class="w-4 h-4"></i>${editing ? 'Save & approve' : 'Approve'}</button>
             <button class="btn btn-outline" data-act="edit" data-id="${p.id}"><i data-lucide="${editing ? 'x' : 'pencil'}" class="w-4 h-4"></i>${editing ? 'Cancel edit' : 'Edit'}</button>
             <button class="btn btn-red" data-act="reject" data-id="${p.id}"><i data-lucide="x" class="w-4 h-4"></i>Reject</button>`}
      </div>
    </div>`;
  }

  function approvalsGridHtml() {
    if (!S.approvals.length) {
      return `<div class="col-span-full panel p-14 text-center fade-in">
        <div class="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-neon-green/10 text-neon-green mb-4"><i data-lucide="check-check" class="w-7 h-7"></i></div>
        <div class="text-white font-bold text-lg">Queue is clear</div>
        <div class="text-sm text-slate-500 mt-1">Megaphone keeps working on everything that doesn't need a human.</div>
      </div>`;
    }
    return S.approvals.map(approvalCard).join('');
  }

  function viewApprovals() {
    const blocked = S.approvals.filter((p) => p.blocked).length;
    return page('Approval queue', 'Actions the PolicyEngine routed to a human. Your feedback is sent back to the agent so it learns your preferences.',
      `<button class="btn btn-outline" data-act="approve-low"><i data-lucide="check-check" class="w-4 h-4"></i>Approve all low-risk</button>`,
      `<div class="grid grid-cols-3 gap-4 mb-6">
        <div class="panel p-4 flex items-center gap-3"><i data-lucide="inbox" class="w-5 h-5 text-neon-amber"></i><div><div class="text-xl font-black text-white" id="ap-count">${S.approvals.length - blocked}</div><div class="text-xs text-slate-500">waiting for approval</div></div></div>
        <div class="panel p-4 flex items-center gap-3"><i data-lucide="shield-x" class="w-5 h-5 text-neon-red"></i><div><div class="text-xl font-black text-white">${blocked}</div><div class="text-xs text-slate-500">blocked by policy</div></div></div>
        <div class="panel p-4 flex items-center gap-3"><i data-lucide="timer" class="w-5 h-5 text-neon-cyan"></i><div><div class="text-xl font-black text-white">6 min</div><div class="text-xs text-slate-500">avg. decision time</div></div></div>
      </div>
      <div class="grid lg:grid-cols-2 gap-5 items-start" id="approval-grid">${approvalsGridHtml()}</div>`);
  }

  function refreshApprovals() {
    const g = $('#approval-grid');
    if (g) { g.innerHTML = approvalsGridHtml(); icons(); }
    updateBadges();
  }

  function resolveApproval(id, decision, note) {
    const p = S.approvals.find((x) => x.id === id);
    if (!p) return;
    const card = $(`#card-${id}`);
    if (card) card.classList.add(decision === 'approve' ? 'card-out-right' : 'card-out-left');
    setTimeout(() => {
      S.approvals = S.approvals.filter((x) => x.id !== id);
      let a = findAction(p.actionId);
      if (!a) {
        a = { id: p.actionId, time: nowHM(), tool: p.tool, title: p.title, policy: p.blocked ? 'blocked' : 'approval', cost: p.cost, tokens: 2400, reasoning: p.reasoning, input: { type: p.preview.type } };
        S.actions.unshift(a);
      }
      if (decision === 'approve') {
        a.status = 'executed';
        a.approvedBy = 'Yoav C.';
        a.time = nowHM();
        a.output = { email: 'Sent to list. Delivery in progress.', ads: 'Campaign live. Charged card •••• ' + S.budget.card.last4 + '.', x: 'Posted.', calls: 'Call round scheduled for 18:00-20:30.' }[p.tool] || 'Done.';
        S.actions = [a, ...S.actions.filter((x) => x !== a)];
        if (p.tool === 'x') {
          S.stats.tweets++;
          S.feed.unshift({ id: 'F-' + a.id, type: 'tweet', time: a.time, actionId: a.id, text: p.preview.text, likes: 0, reposts: 0, replies: 0, views: '0' });
        }
        if (p.tool === 'ads') { S.budget.dailySpent += p.cost; S.budget.monthlySpent += p.cost; S.stats.spent += p.cost; S.budget.expenses[0].status = 'approved'; }
        if (p.tool === 'email') S.stats.emails += 18340;
        toast(`Approved: <b>${esc(p.title)}</b>. The agent is executing it now.`, 'green', 'check');
      } else {
        a.status = 'rejected';
        a.rejectedBy = 'Yoav C.';
        a.output = note ? `Rejected with feedback: "${note}"` : 'Rejected by manager.';
        if (p.tool === 'ads') S.budget.expenses[0].status = 'rejected';
        toast(`Rejected: <b>${esc(p.title)}</b>.${note ? ' Feedback sent to the agent.' : ''}`, 'red', 'x');
      }
      if (S.editing === id) S.editing = null;
      if (!S.approvals.length && S.agentState === 'waiting') S.agentState = 'thinking';
      renderPill();
      refreshApprovals();
    }, 420);
  }

  // ================================================================ LOG
  function filteredActions() {
    const f = S.logFilter, q = f.q.toLowerCase();
    return S.actions.filter((a) =>
      (f.tool === 'all' || a.tool === f.tool) &&
      (f.status === 'all' || a.status === f.status) &&
      (!q || (a.title + a.reasoning + a.id).toLowerCase().includes(q)));
  }

  function logRowsHtml(flashFirst = false) {
    const rows = filteredActions();
    if (!rows.length) return `<tr><td colspan="6" class="text-center text-slate-500 !py-12">No actions match these filters.</td></tr>`;
    return rows.map((a, i) => `
      <tr data-act="open-action" data-id="${a.id}" class="${flashFirst && i === 0 ? 'flash' : ''}">
        <td class="font-mono text-xs text-slate-500 whitespace-nowrap">${a.time}<div class="text-[10px] text-slate-600">${a.id}</div></td>
        <td><div class="flex items-center gap-2">${toolChip(a.tool, '!w-7 !h-7')}<span class="text-slate-400 text-xs hidden xl:inline">${tool(a.tool).name}</span></div></td>
        <td class="text-slate-200 max-w-[420px]"><div class="line-clamp-1">${esc(a.title)}</div></td>
        <td>${policyBadge(a.policy)}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="text-end font-mono text-xs text-slate-400 whitespace-nowrap">${a.cost ? ils(a.cost) : '—'}</td>
      </tr>`).join('');
  }

  function viewLog() {
    const f = S.logFilter;
    const statuses = [['all', 'All'], ['executed', 'Executed'], ['pending', 'Pending'], ['blocked', 'Blocked'], ['rejected', 'Rejected'], ['failed', 'Failed']];
    const total = S.actions.reduce((s, a) => s + (a.cost || 0), 0);
    return page('Activity log', 'Every decision, tool call and result. Immutable and exportable.',
      `<button class="btn btn-outline" data-act="export"><i data-lucide="download" class="w-4 h-4"></i>Export CSV</button>`,
      `<div class="panel p-4 mb-5 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-[220px]"><i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i><input class="input !pl-9" placeholder="Search actions, reasoning, IDs…" data-input="log-q" value="${esc(f.q)}" /></div>
        <select class="select !w-auto" data-input="log-tool">
          <option value="all">All tools</option>
          ${S.tools.map((t) => `<option value="${t.id}" ${f.tool === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
        <div class="flex flex-wrap gap-1.5">${statuses.map(([k, l]) => `<button class="chip-filter ${f.status === k ? 'active' : ''}" data-act="log-status" data-v="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div class="panel p-4"><div class="text-xs text-slate-500">Total actions</div><div class="text-xl font-black text-white mt-1" id="log-total">${S.actions.length}</div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">Automatic</div><div class="text-xl font-black text-neon-green mt-1">${S.actions.filter((a) => a.policy === 'auto').length}</div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">Blocked by policy</div><div class="text-xl font-black text-neon-red mt-1">${S.actions.filter((a) => a.status === 'blocked').length}</div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">Total cost (incl. model)</div><div class="text-xl font-black text-white mt-1">${ils(Math.round(total * 100) / 100)}</div></div>
      </div>
      <div class="panel overflow-x-auto">
        <table class="table">
          <thead><tr><th>Time</th><th>Tool</th><th>Action</th><th>Policy</th><th>Status</th><th class="!text-end">Cost</th></tr></thead>
          <tbody id="log-body">${logRowsHtml()}</tbody>
        </table>
      </div>`);
  }

  function refreshLog(flash) {
    const b = $('#log-body');
    if (b) { b.innerHTML = logRowsHtml(flash); icons(); }
    const t = $('#log-total');
    if (t) t.textContent = S.actions.length;
  }

  function policyChecks(a) {
    const t = tool(a.tool);
    return [
      ['Tool enabled', true, `${t.name} is set to "${MODES[t.mode]}"`],
      ['Within daily quota', !/#13/.test(a.title), /#13/.test(a.title) ? `Would be ${t.quota + 1} of ${t.quota}` : `${t.used} of ${t.quota} ${t.unit}`],
      ['Within budget', true, a.cost >= 1 ? `${ils(a.cost)} · auto-limit ${ils(S.budget.autoLimit)}` : 'Model cost only'],
      ['Claims have verified sources', a.status !== 'blocked', a.status === 'blocked' ? 'Factual claim without a verified source' : 'All factual claims sourced'],
      ['Red lines', a.status !== 'rejected' || !/chairman/.test(a.title), /chairman/.test(a.title) ? 'Targets an individual (added as red line after this)' : 'No violations'],
      ['Recipients opted in', true, ['email', 'calls'].includes(a.tool) ? 'All recipients on opt-in list' : 'Not applicable'],
    ];
  }

  function openAction(id) {
    const a = findAction(id);
    if (!a) return;
    const feed = S.feed.find((f) => f.actionId === a.id);
    const decision = { auto: ['Executed automatically', 'All checks passed and the tool is in automatic mode.', 'green'], approval: ['Routed to a human', 'Tool requires approval or the action exceeded an automatic limit.', 'amber'], blocked: ['Blocked', 'A hard rule failed. The agent was told why and asked to try again.', 'red'] }[a.policy];
    openDrawer(`
      <div class="sticky top-0 bg-ink-850/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-start gap-3 z-10">
        ${toolChip(a.tool, '!w-10 !h-10')}
        <div class="flex-1 min-w-0">
          <div class="text-white font-bold leading-snug">${esc(a.title)}</div>
          <div class="text-xs text-slate-500 font-mono mt-1">${a.id} · ${a.time} · ${tool(a.tool).provider}</div>
        </div>
        <button class="btn-ghost" data-act="drawer-close"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <div class="p-6 space-y-6">
        <div class="flex flex-wrap gap-2">${statusBadge(a.status)}${policyBadge(a.policy)}${a.approvedBy ? `<span class="badge b-green"><i data-lucide="user-check" class="w-3 h-3"></i>${a.approvedBy}</span>` : ''}${a.rejectedBy ? `<span class="badge b-slate"><i data-lucide="user-x" class="w-3 h-3"></i>${a.rejectedBy}</span>` : ''}</div>

        <section>
          <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="brain" class="w-3.5 h-3.5"></i>Agent's reasoning</div>
          <div class="text-sm text-slate-200 leading-relaxed bg-neon-violet/[.04] border border-neon-violet/15 rounded-xl p-4">${esc(a.reasoning)}</div>
        </section>

        <section>
          <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="terminal" class="w-3.5 h-3.5"></i>Tool call</div>
          <div class="code-block"><span class="k">${a.tool}</span>(${highlightJson(a.input || {})})</div>
        </section>

        <section>
          <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5"></i>PolicyEngine decision</div>
          <div class="rounded-xl border border-white/10 overflow-hidden">
            <div class="px-4 py-3 flex items-center gap-2" style="background:color-mix(in srgb, var(--${decision[2]}) 8%, transparent)">
              <span class="dot dot-${decision[2]}"></span><span class="text-white font-semibold text-sm">${decision[0]}</span>
              <span class="text-xs text-slate-400 ms-2">${decision[1]}</span>
            </div>
            ${policyChecks(a).map(([name, ok, detail]) => `
              <div class="px-4 py-2.5 border-t border-white/5 flex items-center gap-3 text-[13px]">
                <i data-lucide="${ok ? 'circle-check' : 'circle-x'}" class="w-4 h-4 ${ok ? 'text-neon-green' : 'text-neon-red'}"></i>
                <span class="text-slate-200">${name}</span><span class="ms-auto text-xs text-slate-500 text-end">${detail}</span>
              </div>`).join('')}
          </div>
        </section>

        <section>
          <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i>Result</div>
          <div class="text-sm text-slate-300 leading-relaxed">${esc(a.output)}</div>
          ${feed && feed.type === 'tweet' ? `<div class="tweet mt-3"><div class="tweet-text">${rich(feed.text)}</div></div>` : ''}
        </section>

        <section class="grid grid-cols-3 gap-3">
          <div class="panel p-3"><div class="text-[11px] text-slate-500">Cost</div><div class="text-white font-bold mt-0.5">${a.cost ? ils(a.cost) : '₪0'}</div></div>
          <div class="panel p-3"><div class="text-[11px] text-slate-500">Tokens</div><div class="text-white font-bold mt-0.5">${fmt(a.tokens || 0)}</div></div>
          <div class="panel p-3"><div class="text-[11px] text-slate-500">Model</div><div class="text-white font-bold mt-0.5 text-sm">opus</div></div>
        </section>

        ${a.status === 'pending' ? `<a href="#/approvals" class="btn btn-primary w-full" data-act="drawer-close"><i data-lucide="inbox" class="w-4 h-4"></i>Decide in approval queue</a>` : ''}
      </div>`);
  }

  // ================================================================ BRAIN
  function stylePreview() {
    const { tone, sharpness, humor } = S.brain;
    const b = (v) => (v < 34 ? 0 : v < 67 ? 1 : 2);
    const open = ['Fair question, Dan.', 'Good question, and an important one.', "Respectfully, Dan, that's exactly the problem."][b(tone)];
    const body = [
      "Negotiating salaries is valuable work and we're grateful for it. We just think members should also be able to see how their dues are spent.",
      'Negotiating salaries is the job, and it matters. But you pay for it every month, so you should be able to see the accounts [[src:Annual report 2025]].',
      'You pay every month and get no itemized breakdown. Any other organization holding your money would have to show you the books [[src:Annual report 2025]].',
    ][b(sharpness)];
    const close = ['Published, audited accounts would settle the question for everyone.', "Transparency isn't anti-union. It's pro-member.", 'Even your gym tells you what the membership fee covers.'][b(humor)];
    return `${open} ${body}\n\n${close}`;
  }

  function sliderRow(key, label, left, right) {
    return `<div>
      <div class="flex items-center justify-between text-xs mb-2"><span class="text-slate-300 font-medium">${label}</span><span class="font-mono text-neon-cyan" id="val-${key}">${S.brain[key]}</span></div>
      <input type="range" min="0" max="100" value="${S.brain[key]}" data-input="style" data-key="${key}" />
      <div class="flex justify-between text-[11px] text-slate-600 mt-1.5"><span>${left}</span><span>${right}</span></div>
    </div>`;
  }

  function listEditor(kind, items, color, icon, placeholder) {
    return `<div class="space-y-2" id="list-${kind}">
      ${items.map((m, i) => `<div class="flex items-start gap-2.5 group rounded-lg px-3 py-2 bg-white/[.02] border border-white/5">
        <i data-lucide="${icon}" class="w-4 h-4 mt-0.5 shrink-0" style="color:var(--${color})"></i>
        <span class="text-[13px] text-slate-300 flex-1">${esc(m)}</span>
        <button class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-neon-red transition" data-act="rm-item" data-kind="${kind}" data-i="${i}"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>`).join('')}
      <form class="flex gap-2" data-form="add-${kind}"><input class="input" name="v" placeholder="${placeholder}" /><button class="btn btn-outline" type="submit"><i data-lucide="plus" class="w-4 h-4"></i></button></form>
    </div>`;
  }

  function viewBrain() {
    const br = S.brain;
    return page('Agent brain', 'Steer how Megaphone thinks, what it says and what it must never do. Changes apply from its next step.',
      `<button class="btn btn-outline" data-act="test-prompt"><i data-lucide="flask-conical" class="w-4 h-4"></i>Test on a sample</button><button class="btn btn-primary" data-act="save-brain"><i data-lucide="save" class="w-4 h-4"></i>Save as v${br.version + 1}</button>`,
      `<div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 xl:col-span-7 space-y-5">
          <div class="panel p-5">
            <div class="flex items-center justify-between mb-3">
              <div class="panel-title"><i data-lucide="file-code-2" class="w-4 h-4 text-neon-cyan"></i>System prompt</div>
              <div class="flex items-center gap-2"><span class="badge b-slate font-mono">v${br.version}</span><span class="text-xs text-slate-500 font-mono" id="prompt-count">${br.systemPrompt.length} chars</span></div>
            </div>
            <textarea class="textarea" rows="24" data-input="prompt" spellcheck="false">${esc(br.systemPrompt)}</textarea>
          </div>
          <div class="grid md:grid-cols-2 gap-5">
            <div class="panel p-5">
              <div class="panel-title mb-3"><i data-lucide="message-square-quote" class="w-4 h-4 text-neon-green"></i>Core messages</div>
              ${listEditor('messages', br.messages, 'green', 'quote', 'Add a message…')}
            </div>
            <div class="panel p-5">
              <div class="panel-title mb-3"><i data-lucide="ban" class="w-4 h-4 text-neon-red"></i>Red lines (hard rules)</div>
              ${listEditor('redLines', br.redLines, 'red', 'octagon-x', 'Add a red line…')}
            </div>
          </div>
        </div>

        <div class="col-span-12 xl:col-span-5 space-y-5">
          <div class="panel p-5 space-y-5">
            <div class="panel-title"><i data-lucide="sliders-horizontal" class="w-4 h-4 text-neon-violet"></i>Voice & style</div>
            ${sliderRow('tone', 'Tone', 'Calm', 'Combative')}
            ${sliderRow('sharpness', 'Sharpness', 'Gentle', 'Pointed')}
            ${sliderRow('humor', 'Humor', 'Serious', 'Playful')}
          </div>

          <div class="panel p-5">
            <div class="panel-title mb-1"><i data-lucide="eye" class="w-4 h-4 text-neon-cyan"></i>Live preview</div>
            <div class="panel-sub mb-4">How Megaphone would reply with the current style</div>
            <div class="tweet !bg-ink-950/40 mb-3">
              <div class="flex items-center gap-2 mb-1.5"><div class="w-7 h-7 rounded-full bg-slate-700 grid place-items-center text-[11px] font-bold">D</div><span class="text-sm font-semibold text-white">Dan</span><span class="text-xs text-slate-500">@skeptic_dan</span></div>
              <div class="tweet-text !text-[13px] text-slate-300">Why should I care where my dues go? The union negotiates my salary. That's what I pay for.</div>
            </div>
            <div class="flex justify-center text-slate-600 my-1"><i data-lucide="corner-down-right" class="w-4 h-4"></i></div>
            <div class="tweet !border-neon-cyan/25">
              <div class="flex items-center gap-2 mb-2"><div class="logo-mark !w-7 !h-7 !rounded-lg"><i data-lucide="megaphone" class="w-3.5 h-3.5"></i></div><span class="text-sm font-semibold text-white">${D.campaign.name}</span><span class="bot-tag">AI</span></div>
              <div class="tweet-text" id="style-preview">${rich(stylePreview())}</div>
            </div>
          </div>

          <div class="panel p-5">
            <div class="panel-title mb-3"><i data-lucide="history" class="w-4 h-4 text-slate-400"></i>Version history</div>
            <div class="space-y-1" id="versions">${br.versions.map((v, i) => `
              <div class="flex items-center gap-3 py-2 ${i ? 'border-t border-white/5' : ''}">
                <span class="badge ${i ? 'b-slate' : 'b-cyan'} font-mono">v${v.v}</span>
                <div class="flex-1 min-w-0"><div class="text-[13px] text-slate-300 truncate">${esc(v.note)}</div><div class="text-[11px] text-slate-500">${v.by} · ${v.when}</div></div>
                ${i ? `<button class="text-xs text-slate-500 hover:text-white" data-act="restore" data-v="${v.v}">Restore</button>` : '<span class="text-[11px] text-neon-cyan">live</span>'}
              </div>`).join('')}</div>
          </div>
        </div>
      </div>`);
  }

  // ================================================================ TOOLS
  function toolCard(t) {
    const pct = Math.min(100, (t.used / t.quota) * 100);
    const isMoney = t.unit.startsWith('₪');
    const max = isMoney ? 2000 : t.id === 'calls' ? 500 : t.id === 'research' ? 500 : t.id === 'email' ? 10 : 40;
    return `<div class="panel panel-hover p-5 flex flex-col gap-4 ${t.mode === 'off' ? 'opacity-60' : ''}" id="tool-${t.id}">
      <div class="flex items-start gap-3">
        ${toolChip(t.id, '!w-11 !h-11')}
        <div class="flex-1 min-w-0">
          <div class="text-white font-semibold">${t.name}</div>
          <div class="text-[11px] text-slate-500 font-mono">${t.provider}</div>
        </div>
        <span class="badge b-green"><span class="dot dot-green !w-1.5 !h-1.5"></span>Connected</span>
      </div>
      <p class="text-[13px] text-slate-400 leading-relaxed">${t.desc}</p>
      <div class="seg w-full">${['off', 'approval', 'auto'].map((m) => `<button class="flex-1 ${t.mode === m ? 'on-' + m : ''}" data-act="tool-mode" data-id="${t.id}" data-v="${m}">${MODES[m]}</button>`).join('')}</div>
      <div>
        <div class="flex items-center justify-between text-xs mb-2"><span class="text-slate-400">${t.mode === 'auto' ? 'Automatic up to' : 'Daily limit'}</span><span class="font-mono text-white" id="quota-${t.id}">${isMoney ? ils(t.quota) : fmt(t.quota)} <span class="text-slate-500">${t.unit.replace('₪ ', '')}</span></span></div>
        <input type="range" min="${isMoney ? 50 : 1}" max="${max}" step="${isMoney ? 50 : 1}" value="${t.quota}" data-input="tool-quota" data-id="${t.id}" ${t.mode === 'off' ? 'disabled' : ''} />
      </div>
      <div>
        <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1.5"><span>Used today</span><span class="font-mono">${isMoney ? ils(t.used) : fmt(t.used)}</span></div>
        <div class="progress-bar"><div style="width:${pct}%;background:var(--cyan)"></div></div>
      </div>
    </div>`;
  }

  function storeCard(s) {
    const st = S.store[s.id];
    return `<div class="panel p-4 flex items-center gap-3" id="store-${s.id}">
      <div class="tool-chip !w-10 !h-10 text-slate-300"><i data-lucide="${s.icon}" class="w-4 h-4"></i></div>
      <div class="flex-1 min-w-0"><div class="text-sm text-white font-medium">${s.name}</div><div class="text-[11px] text-slate-500 truncate">${s.desc}</div><div class="text-[10px] text-slate-600 font-mono mt-0.5">via ${s.via}</div></div>
      ${st === 'connected' ? '<span class="badge b-green"><i data-lucide="check" class="w-3 h-3"></i>Connected</span>'
        : st === 'connecting' ? '<span class="badge b-cyan"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>Connecting</span>'
        : `<button class="btn btn-outline !py-1.5" data-act="connect" data-id="${s.id}"><i data-lucide="plug" class="w-3.5 h-3.5"></i>Connect</button>`}
    </div>`;
  }

  function viewTools() {
    return page('Tools & permissions', 'What Megaphone is allowed to do in the world, and how much of it without asking.',
      `<button class="btn btn-outline" data-act="add-mcp"><i data-lucide="server" class="w-4 h-4"></i>Add MCP server</button>`,
      `<div class="panel p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]">
        <div class="flex items-center gap-2 text-slate-300"><i data-lucide="shield-check" class="w-4 h-4 text-neon-cyan"></i><b class="text-white">Every tool call passes through the PolicyEngine.</b> The model can ask; only the server decides.</div>
        <div class="flex items-center gap-4 ms-auto text-xs">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-slate-500"></span>Off: tool is hidden from the model</span>
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-neon-amber"></span>Needs approval</span>
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-neon-green"></span>Automatic within limits</span>
        </div>
      </div>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-5 stagger" id="tool-grid">${S.tools.map(toolCard).join('')}</div>
      <div class="mt-10 flex items-end gap-3 mb-4">
        <div><h2 class="text-lg font-bold text-white">Tool store</h2><p class="text-sm text-slate-500">Give the agent new capabilities. New tools start in "Needs approval" mode.</p></div>
      </div>
      <div class="grid md:grid-cols-2 xl:grid-cols-4 gap-4" id="store-grid">${D.store.map(storeCard).join('')}</div>`);
  }

  // ================================================================ BUDGET
  function ring(pct, color, big, small) {
    const r = 42, c = 2 * Math.PI * r;
    return `<div class="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="${r}" fill="none" class="ring-track" stroke-width="8"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}" style="filter:drop-shadow(0 0 6px ${color});transition:stroke-dashoffset .8s"/>
      </svg>
      <div class="absolute inset-0 grid place-items-center text-center"><div><div class="text-xl font-black text-white">${big}</div><div class="text-[10px] text-slate-500">${small}</div></div></div>
    </div>`;
  }

  function viewBudget() {
    const b = S.budget;
    const catTotal = b.byCategory.reduce((s, c) => s + c.amount, 0);
    const stCls = { auto: ['b-green', 'Auto'], approved: ['b-cyan', 'Approved'], pending: ['b-amber', 'Pending'], rejected: ['b-slate', 'Rejected'] };
    return page('Budget & payments', 'The agent can spend money, but only through a virtual card with hard limits. It never sees card details.',
      `<button class="btn ${S.cardFrozen ? 'btn-green' : 'btn-red'}" data-act="freeze-card"><i data-lucide="${S.cardFrozen ? 'flame' : 'snowflake'}" class="w-4 h-4"></i>${S.cardFrozen ? 'Unfreeze card' : 'Freeze card'}</button>`,
      `<div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 lg:col-span-5 space-y-5">
          <div class="vcard ${S.cardFrozen ? 'grayscale' : ''}">
            <div class="relative z-10 h-full flex flex-col">
              <div class="flex items-center justify-between"><div class="flex items-center gap-2 text-white font-bold"><i data-lucide="megaphone" class="w-4 h-4 text-neon-cyan"></i>Megaphone</div><span class="text-[10px] tracking-widest text-slate-400">VIRTUAL · AGENT</span></div>
              <div class="mt-6 chip-gold"></div>
              <div class="mt-auto font-mono text-xl md:text-2xl text-white tracking-[.18em]">•••• •••• •••• ${b.card.last4}</div>
              <div class="mt-3 flex items-end justify-between text-[11px] text-slate-400">
                <div><div class="text-[9px] tracking-widest text-slate-500">HOLDER</div>${b.card.holder}</div>
                <div><div class="text-[9px] tracking-widest text-slate-500">EXP</div>${b.card.exp}</div>
                <div class="text-white font-black italic text-lg">${b.card.network}</div>
              </div>
            </div>
            ${S.cardFrozen ? '<div class="absolute inset-0 z-20 grid place-items-center bg-ink-950/50 backdrop-blur-[2px]"><span class="badge b-cyan !text-sm !px-4 !py-1.5"><i data-lucide="snowflake" class="w-4 h-4"></i>Frozen</span></div>' : ''}
          </div>
          <div class="panel p-4 flex gap-3 text-[13px] text-slate-400">
            <i data-lucide="lock-keyhole" class="w-5 h-5 text-neon-cyan shrink-0"></i>
            <div>The full card number lives only with the card issuer. The model calls <span class="font-mono text-neon-cyan">request_payment(amount, vendor, reason)</span>; the server checks the rules below and charges the card itself.</div>
          </div>
          <div class="panel p-5">
            <div class="panel-title mb-4"><i data-lucide="git-branch" class="w-4 h-4 text-neon-violet"></i>How a payment flows</div>
            <div class="space-y-2 text-[13px]">
              ${[['bot', 'Agent requests a payment with a reason', 'violet'], ['shield-check', 'PolicyEngine checks vendor, amount and caps', 'cyan'], ['git-fork', `≤ ${ils(b.autoLimit)} & allow-listed → automatic. Otherwise → human`, 'amber'], ['credit-card', 'Server charges the virtual card', 'green'], ['receipt', 'Receipt is attached to the activity log', 'slate']]
                .map(([ic, txt, col], i) => `<div class="flex items-center gap-3"><div class="w-7 h-7 rounded-lg grid place-items-center border border-white/10 text-[11px] font-mono" style="color:var(--${col === 'slate' ? 'cyan' : col})">${i + 1}</div><i data-lucide="${ic}" class="w-4 h-4 text-slate-500"></i><span class="text-slate-300">${txt}</span></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-7 space-y-5">
          <div class="panel p-6 grid sm:grid-cols-2 gap-6">
            <div class="flex items-center gap-5">${ring(b.monthlySpent / b.monthlyCap, '#2ee6ff', ils(b.monthlySpent), 'of ' + ils(b.monthlyCap))}<div><div class="text-white font-semibold">This month</div><div class="text-xs text-slate-500 mt-1">${Math.round((b.monthlySpent / b.monthlyCap) * 100)}% used · 15 days left</div><div class="text-xs text-neon-green mt-2">On track</div></div></div>
            <div class="flex items-center gap-5">${ring(b.dailySpent / b.dailyCap, '#2bff9a', ils(b.dailySpent), 'of ' + ils(b.dailyCap))}<div><div class="text-white font-semibold">Today</div><div class="text-xs text-slate-500 mt-1">${ils(b.dailyCap - b.dailySpent)} remaining</div><div class="text-xs text-neon-amber mt-2">${S.approvals.some((p) => p.tool === 'ads') ? '₪350 pending approval' : 'No pending payments'}</div></div></div>
          </div>

          <div class="panel p-5">
            <div class="panel-title mb-4"><i data-lucide="pie-chart" class="w-4 h-4 text-neon-cyan"></i>Spend by category (month)</div>
            <div class="flex h-3 rounded-full overflow-hidden mb-4">${b.byCategory.map((c) => `<div style="width:${(c.amount / catTotal) * 100}%;background:${c.color}"></div>`).join('')}</div>
            <div class="grid sm:grid-cols-2 gap-3">${b.byCategory.map((c) => `<div class="flex items-center gap-2 text-[13px]"><span class="w-2.5 h-2.5 rounded-sm" style="background:${c.color}"></span><span class="text-slate-300">${c.label}</span><span class="ms-auto font-mono text-slate-400">${ils(c.amount)}</span></div>`).join('')}</div>
          </div>

          <div class="panel p-5 space-y-5">
            <div class="panel-title"><i data-lucide="scale" class="w-4 h-4 text-neon-amber"></i>Spending rules</div>
            <div class="grid sm:grid-cols-2 gap-5">
              <div>
                <div class="flex justify-between text-xs mb-2"><span class="text-slate-400">Automatic payment limit</span><span class="font-mono text-white" id="auto-limit-val">${ils(b.autoLimit)}</span></div>
                <input type="range" min="0" max="500" step="10" value="${b.autoLimit}" data-input="auto-limit" />
              </div>
              <div>
                <div class="flex justify-between text-xs mb-2"><span class="text-slate-400">Daily cap</span><span class="font-mono text-white" id="daily-cap-val">${ils(b.dailyCap)}</span></div>
                <input type="range" min="100" max="3000" step="50" value="${b.dailyCap}" data-input="daily-cap" />
              </div>
            </div>
            <div class="space-y-2" id="rules">${b.rules.map((r) => `
              <label class="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[.02] border border-white/5 cursor-pointer">
                <input type="checkbox" class="accent-cyan-400 w-4 h-4" ${r.on ? 'checked' : ''} data-act="toggle-rule" data-id="${r.id}" />
                <span class="text-[13px] ${r.on ? 'text-slate-200' : 'text-slate-500'}" data-rule-text="${r.id}">${r.text.replaceAll('{auto}', b.autoLimit)}</span>
              </label>`).join('')}</div>
            <div>
              <div class="text-xs text-slate-500 mb-2">Allow-listed vendors</div>
              <div class="flex flex-wrap gap-1.5">${b.allowList.map((v) => `<span class="badge b-slate !py-1">${v}</span>`).join('')}<button class="badge b-cyan !py-1" data-act="add-vendor"><i data-lucide="plus" class="w-3 h-3"></i>Add vendor</button></div>
            </div>
          </div>
        </div>

        <div class="col-span-12 panel overflow-x-auto">
          <div class="px-5 py-4 border-b border-white/5 panel-title"><i data-lucide="receipt" class="w-4 h-4 text-neon-green"></i>Transactions</div>
          <table class="table">
            <thead><tr><th>When</th><th>Vendor</th><th>Description</th><th>Decision</th><th class="!text-end">Amount</th></tr></thead>
            <tbody>${b.expenses.map((e) => `<tr class="!cursor-default"><td class="text-xs text-slate-500 whitespace-nowrap">${e.time}</td><td class="text-slate-200">${e.vendor}</td><td class="text-slate-400">${e.desc}</td><td><span class="badge ${stCls[e.status][0]}">${stCls[e.status][1]}</span></td><td class="text-end font-mono text-white">${ils(e.amount)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`);
  }

  // ================================================================ CALLS
  const OUTCOME = { supporter: ['b-green', 'Supporter'], neutral: ['b-cyan', 'Undecided'], opposed: ['b-red', 'Opposed · removed'], 'no-answer': ['b-slate', 'No answer'] };
  const fmtSec = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function waveBars(id, n = 96) {
    let seed = [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: n }, (_, i) => 18 + Math.abs(Math.sin(i / 5)) * 50 * rnd() + rnd() * 30);
  }

  function callListHtml() {
    return D.calls.filter((c) => S.callFilter === 'all' || c.outcome === S.callFilter).map((c) => `
      <button class="w-full text-start flex items-center gap-3 px-4 py-3.5 border-b border-white/5 transition ${S.selectedCall === c.id ? 'bg-neon-cyan/[.06]' : 'hover:bg-white/[.02]'}" data-act="select-call" data-id="${c.id}">
        <div class="w-9 h-9 rounded-full bg-ink-600 grid place-items-center text-xs font-bold text-slate-300">${c.name[0]}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2"><span class="text-sm text-white font-medium">${c.name}</span><span class="text-[11px] text-slate-500 font-mono">${c.phone}</span></div>
          <div class="mt-1 flex items-center gap-2"><span class="badge ${OUTCOME[c.outcome][0]}">${OUTCOME[c.outcome][1]}</span><span class="text-[11px] text-slate-500">${c.time} · ${c.duration ? fmtSec(c.duration) : '—'}</span></div>
        </div>
      </button>`).join('');
  }

  function playerHtml() {
    const c = D.calls.find((x) => x.id === S.selectedCall);
    const bars = waveBars(c.id);
    const t = S.player.t;
    if (!c.transcript.length) {
      return `<div class="p-10 text-center"><div class="mx-auto w-14 h-14 rounded-2xl grid place-items-center bg-white/5 text-slate-500 mb-4"><i data-lucide="phone-missed" class="w-7 h-7"></i></div><div class="text-white font-semibold">${c.name} didn't answer</div><div class="text-sm text-slate-500 mt-1">${esc(c.summary)}</div></div>`;
    }
    const curIdx = c.transcript.reduce((idx, l, i) => (l.t <= t ? i : idx), -1);
    return `
      <div class="p-6 border-b border-white/5">
        <div class="flex items-start gap-4 flex-wrap">
          <div class="w-12 h-12 rounded-full bg-ink-600 grid place-items-center font-bold text-slate-200">${c.name[0]}</div>
          <div class="flex-1 min-w-0">
            <div class="text-lg text-white font-bold">${c.name} <span class="text-sm text-slate-500 font-mono font-normal ms-2">${c.phone}</span></div>
            <div class="flex flex-wrap gap-1.5 mt-2"><span class="badge ${OUTCOME[c.outcome][0]}">${OUTCOME[c.outcome][1]}</span>${c.tags.map((tg) => `<span class="badge b-slate">${tg}</span>`).join('')}<span class="badge b-cyan"><i data-lucide="bot" class="w-3 h-3"></i>AI disclosed in first sentence</span></div>
          </div>
          <div class="text-end text-xs text-slate-500">Today ${c.time}<div class="font-mono">${fmtSec(c.duration)}</div></div>
        </div>
        <div class="mt-6 flex items-center gap-4">
          <button class="w-12 h-12 rounded-full grid place-items-center bg-neon-green text-ink-950 shadow-[0_0_24px_rgba(43,255,154,.4)] shrink-0" data-act="play"><i data-lucide="${S.player.playing ? 'pause' : 'play'}" class="w-5 h-5"></i></button>
          <div class="flex-1"><div class="wave" id="wave" data-act="seek">${bars.map((h, i) => `<span style="height:${h}%" class="${i / bars.length <= t / c.duration ? 'played' : ''}"></span>`).join('')}</div></div>
          <div class="font-mono text-xs text-slate-400 w-20 text-end" id="call-time">${fmtSec(t)} / ${fmtSec(c.duration)}</div>
        </div>
      </div>
      <div class="grid md:grid-cols-5">
        <div class="md:col-span-3 p-6 border-e border-white/5">
          <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><i data-lucide="captions" class="w-3.5 h-3.5"></i>Live transcript</div>
          <div class="space-y-3 max-h-[380px] overflow-y-auto pe-2" id="transcript">
            ${c.transcript.map((l, i) => `<div class="flex gap-3 transition-opacity duration-300 ${t === 0 && !S.player.playing ? '' : i > curIdx ? 'opacity-25' : ''}" ${i === curIdx ? 'data-current' : ''}>
              <div class="w-7 h-7 rounded-full shrink-0 grid place-items-center text-[10px] font-bold ${l.who === 'bot' ? 'bg-neon-cyan/15 text-neon-cyan' : 'bg-ink-600 text-slate-300'}">${l.who === 'bot' ? '<i data-lucide="bot" class="w-3.5 h-3.5"></i>' : c.name[0]}</div>
              <div class="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${i === curIdx && (S.player.playing || t > 0) ? 'bg-neon-cyan/[.07] border border-neon-cyan/25 text-white' : 'bg-white/[.02] border border-white/5 text-slate-300'}">
                <div class="text-[10px] font-mono text-slate-500 mb-0.5">${l.who === 'bot' ? 'Megaphone' : c.name} · ${fmtSec(l.t)}</div>${esc(l.text)}
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="md:col-span-2 p-6 space-y-5">
          <div>
            <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i>AI summary</div>
            <p class="text-[13px] text-slate-300 leading-relaxed">${esc(c.summary)}</p>
          </div>
          <div>
            <div class="text-[11px] uppercase tracking-widest text-slate-500 mb-2">Compliance checks</div>
            <div class="space-y-1.5 text-[13px]">
              ${['Recipient opted in to calls', 'AI disclosed at start', 'Within calling hours (09:00-20:30)', 'Opt-out offered', 'No sensitive data recorded'].map((x) => `<div class="flex items-center gap-2 text-slate-300"><i data-lucide="circle-check" class="w-4 h-4 text-neon-green"></i>${x}</div>`).join('')}
            </div>
          </div>
          <div class="flex gap-2"><button class="btn btn-outline flex-1" data-act="flag-call"><i data-lucide="flag" class="w-4 h-4"></i>Flag</button><button class="btn btn-outline flex-1" data-act="handoff"><i data-lucide="user-round" class="w-4 h-4"></i>Hand to human</button></div>
        </div>
      </div>`;
  }

  function viewCalls() {
    const filters = [['all', 'All'], ['supporter', 'Supporters'], ['neutral', 'Undecided'], ['opposed', 'Opposed'], ['no-answer', 'No answer']];
    return page('Call center', 'Every call the agent makes is recorded, transcribed and checked for compliance.',
      `<button class="btn btn-outline" data-act="script"><i data-lucide="file-text" class="w-4 h-4"></i>Edit call script</button>`,
      `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div class="panel p-4"><div class="text-xs text-slate-500">Calls today</div><div class="text-2xl font-black text-white mt-1">64</div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">Connected</div><div class="text-2xl font-black text-white mt-1">41 <span class="text-sm text-slate-500 font-medium">64%</span></div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">New supporters</div><div class="text-2xl font-black text-neon-green mt-1">23</div></div>
        <div class="panel p-4"><div class="text-xs text-slate-500">Opt-outs (honored)</div><div class="text-2xl font-black text-white mt-1">3</div></div>
      </div>
      <div class="grid grid-cols-12 gap-5">
        <div class="col-span-12 lg:col-span-4 panel overflow-hidden">
          <div class="p-3 border-b border-white/5 flex flex-wrap gap-1.5">${filters.map(([k, l]) => `<button class="chip-filter !text-[11px] ${S.callFilter === k ? 'active' : ''}" data-act="call-filter" data-v="${k}">${l}</button>`).join('')}</div>
          <div id="call-list">${callListHtml()}</div>
        </div>
        <div class="col-span-12 lg:col-span-8 panel overflow-hidden" id="player">${playerHtml()}</div>
      </div>`);
  }

  function refreshPlayer() {
    const p = $('#player');
    if (!p) return;
    const prev = $('#transcript')?.scrollTop || 0;
    p.innerHTML = playerHtml();
    icons();
    const tr = $('#transcript');
    if (!tr) return;
    tr.scrollTop = prev;
    const cur = $('#transcript [data-current]');
    if (cur && S.player.playing) tr.scrollTop = Math.max(0, cur.offsetTop - tr.offsetTop - 120);
  }

  function stopPlayer() {
    clearInterval(S.player.timer);
    S.player.playing = false;
  }

  function togglePlay() {
    const c = D.calls.find((x) => x.id === S.selectedCall);
    if (S.player.playing) { stopPlayer(); refreshPlayer(); return; }
    if (S.player.t >= c.duration) S.player.t = 0;
    S.player.playing = true;
    S.player.timer = setInterval(() => {
      S.player.t = Math.min(c.duration, S.player.t + 0.5);
      if (S.player.t >= c.duration) stopPlayer();
      refreshPlayer();
    }, 200);
    refreshPlayer();
  }

  // ================================================================ router
  const VIEWS = { public: viewPublic, ops: viewOps, approvals: viewApprovals, log: viewLog, brain: viewBrain, tools: viewTools, budget: viewBudget, calls: viewCalls };

  function render() {
    const v = $('#view');
    v.innerHTML = VIEWS[S.route]();
    if (S.route === 'public') renderChat();
    icons();
    showThought();
  }

  function route() {
    const r = location.hash.replace(/^#\/?/, '') || 'public';
    if (!VIEWS[r]) return;
    S.route = r;
    document.body.classList.toggle('is-public', r === 'public');
    stopPlayer();
    closeDrawer();
    closeModal();
    $('#sidebar').classList.remove('open');
    renderNav();
    render();
    window.scrollTo({ top: 0 });
  }

  function updateBadges() {
    renderNav();
    const pp = $('#pub-pending'); if (pp) pp.textContent = S.approvals.length;
    const k = $('#kpis'); if (k) { k.innerHTML = kpiHtml(); }
    const op = $('#ops-pending'); if (op) op.innerHTML = opsPendingHtml();
    icons();
  }

  // ================================================================ simulation
  function nextThought() {
    S.thoughtIdx = (S.thoughtIdx + 1) % D.thoughts.length;
    if (S.agentState !== 'acting') S.agentState = S.approvals.length && Math.random() < 0.25 ? 'waiting' : 'thinking';
    renderPill();
    updateOrbs();
    showThought();
  }

  function liveEvent() {
    const tpl = D.liveEvents[S.evIdx++ % D.liveEvents.length];
    const a = { ...clone(tpl), id: 'A-' + S.nextId++, time: nowHM(), tokens: 800 + Math.floor(Math.random() * 9000), input: { generated: true, step: S.evIdx } };
    delete a.feed;
    S.actions.unshift(a);
    S.stats.actionsToday++;
    S.hourly[new Date().getHours()]++;
    const t = S.tools.find((x) => x.id === a.tool);
    if (t && a.status === 'executed') t.used += a.tool === 'payments' ? a.cost : 1;
    if (a.tool === 'x' && a.status === 'executed') { S.stats.tweets++; S.stats.reach += 3200; }
    if (a.tool === 'calls' && a.status === 'executed') S.stats.calls++;
    if (a.tool === 'payments' && a.status === 'executed') {
      S.budget.dailySpent += a.cost; S.budget.monthlySpent += a.cost; S.stats.spent += a.cost;
      S.budget.expenses.unshift({ time: 'Today ' + a.time, vendor: 'Unsplash+', desc: 'Stock photo license', amount: a.cost, status: 'auto' });
    }
    let feedItemData = null;
    if (tpl.feed) { feedItemData = { id: 'F-' + a.id, time: a.time, actionId: a.id, ...clone(tpl.feed) }; S.feed.unshift(feedItemData); }
    if (a.status === 'pending') {
      S.approvals.unshift({
        id: 'P-' + a.id, actionId: a.id, tool: a.tool, title: a.title, why: 'Email always requires approval', risk: 'Low', cost: 0.4, audience: '3 journalists from the press list',
        reasoning: a.reasoning,
        preview: { type: 'email', subject: 'Research summary: union financial transparency', body: 'Hi {name},\n\nAs requested, here is our 6-page summary. Every claim links to a primary source, and we are happy to walk you through any of it.\n\nWritten by Megaphone (AI) for the Transparent Histadrut team.' },
      });
    }

    S.agentState = 'acting';
    renderPill(); updateOrbs();
    setTimeout(() => { if (!S.paused) { S.agentState = S.approvals.length ? 'waiting' : 'thinking'; renderPill(); updateOrbs(); } }, 3500);

    const msg = { executed: ['green', 'zap', 'Executed'], pending: ['amber', 'inbox', 'Needs approval'], blocked: ['red', 'shield-x', 'Blocked by policy'] }[a.status];
    if (S.route !== 'public') toast(`<span class="text-slate-400">${msg[2]}:</span> ${esc(a.title)}`, msg[0], msg[1]);

    // targeted DOM updates so inputs keep focus
    const lf = $('#live-feed');
    if (lf) { lf.insertAdjacentHTML('afterbegin', actionRow(a, 'slide-in')); }
    const ch = $('#chart'); if (ch) ch.innerHTML = chartSvg();
    const tu = $('#tool-usage'); if (tu) tu.innerHTML = toolUsageHtml();
    if (S.route === 'public') {
      const ps = $('#public-stats'); if (ps) ps.innerHTML = publicStatsHtml();
      const pa = $('#pub-actions'); if (pa) pa.textContent = S.stats.actionsToday;
      const pl = $('#public-log'); if (pl) pl.innerHTML = publicLogHtml();
      const pf = $('#public-feed');
      if (pf && feedItemData && (S.feedFilter === 'all' || S.feedFilter === 'posts')) pf.insertAdjacentHTML('afterbegin', feedItem(feedItemData, 'slide-in'));
    }
    if (S.route === 'log') refreshLog(true);
    if (S.route === 'approvals' && a.status === 'pending' && !S.editing) refreshApprovals();
    if (S.route === 'budget' && a.tool === 'payments') render();
    updateBadges();
  }

  function setPaused(p) {
    S.paused = p;
    S.agentState = 'thinking';
    document.body.classList.toggle('paused', p);
    stopPlayer();
    renderNav();
    render();
    if (p) toast('<b>Agent stopped.</b> All tools frozen, card frozen, scheduled posts on hold.', 'red', 'octagon-x');
    else toast('<b>Agent resumed.</b> Megaphone is picking up where it left off.', 'green', 'play');
  }

  function startSim() {
    setInterval(() => { if (!S.paused) nextThought(); }, 7000);
    setInterval(() => { if (!S.paused) liveEvent(); }, 14000);
    setInterval(tickClock, 1000);
  }

  // ================================================================ events
  const ACTS = {
    'modal-close': closeModal,
    'modal-bg': (el, e) => { if (e.target === el) closeModal(); },
    'drawer-close': closeDrawer,
    kill: () => {
      if (S.paused) return setPaused(false);
      modal({
        title: 'Stop everything?', icon: 'octagon-x', color: 'red', kind: 'btn-red', confirm: 'Stop the agent',
        body: 'Megaphone will stop immediately. Pending tool calls are cancelled, scheduled posts are held, active calls end politely and the virtual card is frozen. You can resume at any time.',
        onConfirm: () => setPaused(true),
      });
    },
    why: (el) => showWhy(el.dataset.id),
    'open-action': (el) => openAction(el.dataset.id),
    'feed-filter': (el) => { S.feedFilter = el.dataset.v; $$('[data-act="feed-filter"]').forEach((b) => b.classList.toggle('active', b === el)); $('#public-feed').innerHTML = publicFeedHtml(); icons(); },
    ask: (el) => askBot(el.dataset.q),
    'scroll-ask': (el, e) => { e.preventDefault(); $('#ask-anchor').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('[data-form="chat"] input')?.focus(), 500); },
    join: () => modal({
      title: 'Join Transparent Histadrut', icon: 'user-plus', color: 'cyan', confirm: 'Join',
      body: `<div class="space-y-3 mt-3"><input class="input" placeholder="Full name" /><input class="input" placeholder="Email" /><label class="flex items-start gap-2 text-xs text-slate-400"><input type="checkbox" checked class="accent-cyan-400 mt-0.5" />I agree to receive emails from the campaign. Some messages are written by an AI agent. Unsubscribe anytime.</label><label class="flex items-start gap-2 text-xs text-slate-400"><input type="checkbox" class="accent-cyan-400 mt-0.5" />I'd also like a phone call (the caller will be an AI assistant).</label></div>`,
      onConfirm: () => { S.stats.supporters++; toast("You're in. Expect one email a week, never more.", 'green', 'check'); const ps = $('#public-stats'); if (ps) { ps.innerHTML = publicStatsHtml(); icons(); } },
    }),

    approve: (el) => {
      const id = el.dataset.id;
      if (S.editing === id) {
        const p = S.approvals.find((x) => x.id === id);
        const edits = $$(`#card-${id} [data-edit]`);
        if (p.preview.type === 'tweet') p.preview.text = edits[0].innerText;
        if (p.preview.type === 'email') { p.preview.subject = edits[0].innerText; p.preview.body = edits[1].innerText; }
        if (p.preview.type === 'call') p.preview.script = edits[0].innerText;
      }
      resolveApproval(id, 'approve');
    },
    reject: (el) => {
      const id = el.dataset.id;
      const p = S.approvals.find((x) => x.id === id);
      modal({
        title: p.blocked ? 'Discard this draft?' : 'Reject this action?', icon: 'message-square-warning', color: 'red', kind: 'btn-red', confirm: p.blocked ? 'Discard' : 'Reject',
        body: `<div class="mb-2">Tell the agent why. It uses this feedback for similar decisions.</div><textarea id="reject-note" class="textarea !font-sans" rows="3" placeholder="e.g. Too aggressive. We don't comment on individuals."></textarea>`,
        onConfirm: () => resolveApproval(id, 'reject', $('#reject-note').value.trim()),
      });
    },
    edit: (el) => {
      const id = el.dataset.id;
      S.editing = S.editing === id ? null : id;
      const card = $(`#card-${id}`);
      const p = S.approvals.find((x) => x.id === id);
      card.outerHTML = approvalCard(p);
      icons();
      if (S.editing) {
        $$(`#card-${id} [data-edit]`).forEach((e) => { e.contentEditable = 'true'; e.classList.add('contenteditable-on'); });
        $(`#card-${id} [data-edit]`)?.focus();
        toast('Edit the content directly. Your changes are also sent to the agent as feedback.', 'amber', 'pencil');
      }
    },
    'fix-blocked': (el) => {
      const id = el.dataset.id;
      const p = S.approvals.find((x) => x.id === id);
      const pv = $(`#pv-${id}`);
      pv.innerHTML = `<div class="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[.03] p-4 font-mono text-[12px] text-neon-cyan/90 space-y-1.5">
        <div class="flex items-center gap-2"><i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i>web_search("dues political spending share annual report")</div>
        <div class="text-slate-500 ps-6">→ Reading annual_report_2025.pdf §4…</div>
        <div class="text-slate-500 ps-6">→ No exact figure published. Rephrasing as a sourced question.</div>
      </div>`;
      icons();
      el.disabled = true;
      setTimeout(() => {
        Object.assign(p, {
          blocked: false, why: 'Rewritten after policy block', risk: 'Low',
          reasoning: 'I could not find a published figure for political spending, so I removed the number and the charged language. The reply now asks the question and points to the report section where the answer should be.',
          preview: { type: 'tweet', text: 'Good question. The annual report does not break out political spending as its own line [[src:Annual report 2025, §4]].\n\nThat is exactly what we are asking for: a clear number every member can see.' },
        });
        const a = findAction(p.actionId);
        if (a) { a.status = 'pending'; a.policy = 'approval'; }
        const card = $(`#card-${id}`);
        card.outerHTML = approvalCard(p);
        icons();
        $(`#card-${id}`).classList.add('slide-in');
        toast('The agent found a safer way to say it. Review the rewrite.', 'cyan', 'search-check');
        updateBadges();
      }, 2600);
    },
    'approve-low': () => {
      const low = S.approvals.filter((p) => p.risk === 'Low' && !p.blocked);
      if (!low.length) return toast('No low-risk items to approve.', 'amber', 'info');
      modal({
        title: `Approve ${low.length} low-risk actions?`, icon: 'check-check', color: 'green', kind: 'btn-green', confirm: 'Approve all',
        body: low.map((p) => `<div class="flex items-center gap-2 py-1">${toolIcon(p.tool, 'w-3.5 h-3.5')}<span>${esc(p.title)}</span></div>`).join(''),
        onConfirm: () => low.forEach((p, i) => setTimeout(() => resolveApproval(p.id, 'approve'), i * 180)),
      });
    },

    'log-status': (el) => { S.logFilter.status = el.dataset.v; $$('[data-act="log-status"]').forEach((b) => b.classList.toggle('active', b === el)); refreshLog(); },
    export: () => toast(`Exported ${filteredActions().length} actions to <span class="font-mono">megaphone-log.csv</span>`, 'cyan', 'download'),

    'rm-item': (el) => { S.brain[el.dataset.kind].splice(+el.dataset.i, 1); render(); },
    'save-brain': () => {
      S.brain.version++;
      S.brain.versions.unshift({ v: S.brain.version, by: 'Yoav C.', when: 'Just now', note: `Style: tone ${S.brain.tone}, sharpness ${S.brain.sharpness}, humor ${S.brain.humor}` });
      render();
      toast(`Saved as <b>v${S.brain.version}</b>. Megaphone will use it from its next step.`, 'green', 'save');
    },
    restore: (el) => modal({ title: `Restore v${el.dataset.v}?`, icon: 'history', body: 'The current version stays in history. The agent switches on its next step.', confirm: 'Restore', onConfirm: () => toast(`Restored v${el.dataset.v} as a new version.`, 'cyan', 'history') }),
    'test-prompt': () => modal({
      title: 'Test run (sandbox)', icon: 'flask-conical', color: 'violet', confirm: null, cancel: 'Close',
      body: `<div class="text-xs text-slate-500 mb-2">Input: "A journalist asks for a comment on today's committee hearing."</div><div class="code-block !text-slate-300">Plan:\n 1. web_search("Knesset labor committee hearing union transparency")\n 2. Draft 3-sentence comment, one sourced fact\n 3. send_email → <span class="n">needs approval</span> (tool mode)\n\nDraft:\n"We welcome the hearing. Members deserve to see audited accounts and decide whether their dues fund political activity. We'll be there on Tuesday."\n\nPolicy check: <span class="s">passed</span> · no red lines triggered</div>`,
    }),

    'tool-mode': (el) => {
      const t = S.tools.find((x) => x.id === el.dataset.id);
      t.mode = el.dataset.v;
      $(`#tool-${t.id}`).outerHTML = toolCard(t);
      icons();
      toast(`<b>${t.name}</b> set to ${MODES[t.mode]}.`, t.mode === 'auto' ? 'green' : t.mode === 'approval' ? 'amber' : 'red', 'plug-zap');
    },
    connect: (el) => {
      const id = el.dataset.id, s = D.store.find((x) => x.id === id);
      S.store[id] = 'connecting';
      $(`#store-${id}`).outerHTML = storeCard(s); icons();
      setTimeout(() => { S.store[id] = 'connected'; const c = $(`#store-${id}`); if (c) { c.outerHTML = storeCard(s); icons(); } toast(`<b>${s.name}</b> connected. Starts in "Needs approval" mode.`, 'green', 'plug'); }, 1800);
    },
    'add-mcp': () => modal({
      title: 'Add an MCP server', icon: 'server', color: 'cyan', confirm: 'Connect',
      body: `<div class="space-y-3 mt-2"><input class="input" placeholder="Name, e.g. Zapier" /><input class="input font-mono" placeholder="https://mcp.example.com/sse" /><div class="text-xs text-slate-500">Tools from this server will be wrapped by the PolicyEngine and start in "Needs approval" mode.</div></div>`,
      onConfirm: () => toast('MCP server connected. 14 tools discovered.', 'green', 'server'),
    }),

    'freeze-card': () => { S.cardFrozen = !S.cardFrozen; render(); toast(S.cardFrozen ? 'Card frozen. All payment requests will be declined.' : 'Card active again.', S.cardFrozen ? 'cyan' : 'green', S.cardFrozen ? 'snowflake' : 'flame'); },
    'toggle-rule': (el) => { const r = S.budget.rules.find((x) => x.id === el.dataset.id); r.on = el.checked; const tx = $(`[data-rule-text="${r.id}"]`); tx.classList.toggle('text-slate-200', r.on); tx.classList.toggle('text-slate-500', !r.on); },
    'add-vendor': () => modal({ title: 'Add an allow-listed vendor', icon: 'store', body: '<input class="input mt-2" id="vendor-name" placeholder="Vendor name" />', confirm: 'Add', onConfirm: () => { const v = $('#vendor-name').value.trim(); if (v) { S.budget.allowList.push(v); setTimeout(render, 0); } } }),

    'select-call': (el) => { stopPlayer(); S.selectedCall = el.dataset.id; S.player.t = 0; $('#call-list').innerHTML = callListHtml(); refreshPlayer(); icons(); },
    'call-filter': (el) => { S.callFilter = el.dataset.v; $$('[data-act="call-filter"]').forEach((b) => b.classList.toggle('active', b === el)); $('#call-list').innerHTML = callListHtml(); icons(); },
    play: togglePlay,
    seek: (el, e) => {
      const c = D.calls.find((x) => x.id === S.selectedCall);
      const r = el.getBoundingClientRect();
      S.player.t = Math.round(((e.clientX - r.left) / r.width) * c.duration);
      refreshPlayer();
    },
    'flag-call': () => toast('Call flagged for human review.', 'amber', 'flag'),
    handoff: () => toast('Maya L. will follow up with this contact today.', 'cyan', 'user-round'),
    script: () => modal({ title: 'Call script', icon: 'file-text', confirm: 'Save', body: `<textarea class="textarea mt-2" rows="8">${esc(D.approvals[3].preview.script)}</textarea>`, onConfirm: () => toast('Call script saved. Used from the next call.', 'green', 'save') }),
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACTS[el.dataset.act];
    if (fn) fn(el, e);
  });

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    if (kind === 'chat') { const i = f.q; askBot(i.value); i.value = ''; return; }
    const v = f.v.value.trim();
    if (!v) return;
    if (kind === 'add-messages') S.brain.messages.push(v);
    if (kind === 'add-redLines') S.brain.redLines.push(v);
    render();
  });

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    switch (el.dataset.input) {
      case 'log-q': S.logFilter.q = el.value; refreshLog(); break;
      case 'log-tool': S.logFilter.tool = el.value; refreshLog(); break;
      case 'style':
        S.brain[el.dataset.key] = +el.value;
        $(`#val-${el.dataset.key}`).textContent = el.value;
        $('#style-preview').innerHTML = rich(stylePreview());
        icons();
        break;
      case 'prompt': S.brain.systemPrompt = el.value; $('#prompt-count').textContent = el.value.length + ' chars'; break;
      case 'tool-quota': {
        const t = S.tools.find((x) => x.id === el.dataset.id);
        t.quota = +el.value;
        const isMoney = t.unit.startsWith('₪');
        $(`#quota-${t.id}`).innerHTML = `${isMoney ? ils(t.quota) : fmt(t.quota)} <span class="text-slate-500">${t.unit.replace('₪ ', '')}</span>`;
        break;
      }
      case 'auto-limit':
        S.budget.autoLimit = +el.value;
        $('#auto-limit-val').textContent = ils(el.value);
        S.budget.rules.forEach((r) => { const tx = $(`[data-rule-text="${r.id}"]`); if (tx) tx.textContent = r.text.replaceAll('{auto}', el.value); });
        break;
      case 'daily-cap': S.budget.dailyCap = +el.value; $('#daily-cap-val').textContent = ils(el.value); break;
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closeModal(); } });
  $('#mobile-nav-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  window.addEventListener('hashchange', route);

  // ================================================================ boot
  if (!location.hash) location.hash = '#/public';
  route();
  tickClock();
  startSim();
})();
