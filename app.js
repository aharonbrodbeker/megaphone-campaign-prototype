/* Megaphone campaign-agent HTML prototype — all client-side mock */

const state = {
  route: 'ops',
  stopped: false,
  agentStatus: DEMO.agent.status,
  actions: structuredClone(DEMO.actions),
  artifacts: structuredClone(DEMO.artifacts),
  thoughts: [...DEMO.thoughts],
  tools: structuredClone(DEMO.tools),
  shop: structuredClone(DEMO.shop),
  brain: structuredClone(DEMO.brain),
  kpis: structuredClone(DEMO.kpis),
  calls: structuredClone(DEMO.calls),
  spends: structuredClone(DEMO.spends),
  chat: [],
  logFilter: { tool: 'all', status: 'all' },
  selectedCall: DEMO.calls[0].id,
  callPlaying: false,
  callLine: 0,
  liveIdx: 0,
  mobileNav: false,
};

const NAV = [
  { id: 'ops', label: 'Ops room', icon: 'radar' },
  { id: 'approvals', label: 'Approvals', icon: 'shield-check', badge: () => state.actions.filter(a => a.status === 'pending').length },
  { id: 'log', label: 'Activity log', icon: 'scroll-text' },
  { id: 'brain', label: 'Agent brain', icon: 'brain' },
  { id: 'tools', label: 'Tools', icon: 'wrench' },
  { id: 'budget', label: 'Budget', icon: 'wallet' },
  { id: 'calls', label: 'Calls', icon: 'phone-call' },
  { id: 'public', label: 'Public page', icon: 'globe', divider: true },
];

const TOOL_LABEL = {
  web_research: 'Research',
  post_tweet: 'X / Twitter',
  send_email: 'Email',
  make_call: 'Call',
  request_payment: 'Payment',
  boost_ad: 'Paid ads',
};

const TOOL_ICON = {
  web_research: 'search',
  post_tweet: 'twitter',
  send_email: 'mail',
  make_call: 'phone',
  request_payment: 'credit-card',
  boost_ad: 'megaphone',
};

/* ---------- utils ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtMoney = (n) => `₪${n.toLocaleString()}`;
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uid = () => 'a' + Math.random().toString(36).slice(2, 8);

function toast(msg, type = 'ok') {
  const root = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i data-lucide="${type === 'err' ? 'x-circle' : type === 'warn' ? 'alert-triangle' : 'check-circle'}" class="w-4 h-4 shrink-0"></i><span>${escapeHtml(msg)}</span>`;
  root.appendChild(el);
  lucide.createIcons({ nodes: [el] });
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 2800);
  setTimeout(() => el.remove(), 3200);
}

function icon(name, cls = 'w-4 h-4') {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}

/* ---------- router ---------- */
function parseRoute() {
  const h = (location.hash || '#/ops').replace(/^#\/?/, '');
  return h.split('?')[0] || 'ops';
}

function navigate(id) {
  location.hash = '#/' + id;
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = NAV.map(item => {
    const badge = item.badge ? item.badge() : 0;
    return `
      ${item.divider ? '<div class="my-3 border-t border-white/5"></div>' : ''}
      <a href="#/${item.id}" class="nav-item ${state.route === item.id ? 'active' : ''}" data-route="${item.id}">
        ${icon(item.icon)}
        <span>${item.label}</span>
        ${badge ? `<span class="badge">${badge}</span>` : ''}
      </a>`;
  }).join('');
  lucide.createIcons({ nodes: [nav] });
}

function renderAgentPill() {
  const pill = $('#agent-pill');
  const map = {
    thinking: { label: 'Thinking', cls: 'thinking' },
    executing: { label: 'Executing', cls: '' },
    waiting: { label: 'Waiting on approval', cls: 'waiting' },
    stopped: { label: 'Stopped', cls: 'stopped' },
  };
  const s = state.stopped ? map.stopped : map[state.agentStatus] || map.thinking;
  pill.className = `agent-pill ${s.cls}`;
  pill.innerHTML = `<span class="dot"></span><span>${s.label}</span><span class="text-slate-500 font-mono hidden sm:inline">· ${DEMO.agent.model}</span>`;
}

function tickClock() {
  const el = $('#clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* ---------- kill switch ---------- */
function showKillModal() {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="kill-backdrop">
      <div class="modal">
        <div class="flex items-center gap-3 mb-3 text-neon-red">
          ${icon('octagon-x', 'w-6 h-6')}
          <h2 class="text-xl font-bold text-white">Kill switch</h2>
        </div>
        <p class="text-slate-400 text-sm leading-relaxed mb-6">
          This immediately stops the agent loop. No tweets, emails, calls, or payments will run until you resume.
        </p>
        <div class="flex gap-3 justify-end">
          <button class="btn-soft" id="kill-cancel">Cancel</button>
          <button class="kill-btn armed" id="kill-confirm">${icon('power')} Confirm stop</button>
        </div>
      </div>
    </div>`;
  lucide.createIcons({ nodes: [root] });
  $('#kill-cancel').onclick = () => { root.innerHTML = ''; };
  $('#kill-backdrop').addEventListener('click', (e) => { if (e.target.id === 'kill-backdrop') root.innerHTML = ''; });
  $('#kill-confirm').onclick = () => {
    state.stopped = true;
    state.agentStatus = 'stopped';
    root.innerHTML = '';
    toast('Agent stopped. All tools frozen.', 'err');
    renderAgentPill();
    render();
  };
}

function resumeAgent() {
  state.stopped = false;
  state.agentStatus = 'thinking';
  toast('Agent resumed', 'ok');
  renderAgentPill();
  render();
}

/* ---------- drawer ---------- */
function openDrawer(html) {
  const root = $('#drawer-root');
  root.innerHTML = `
    <div class="drawer-backdrop" id="drawer-bg"></div>
    <aside class="drawer" id="drawer">${html}</aside>`;
  lucide.createIcons({ nodes: [root] });
  $('#drawer-bg').onclick = closeDrawer;
  const closeBtn = $('#drawer-close');
  if (closeBtn) closeBtn.onclick = closeDrawer;
}

function closeDrawer() {
  $('#drawer-root').innerHTML = '';
}

function openActionDrawer(id) {
  const a = state.actions.find(x => x.id === id);
  if (!a) return;
  openDrawer(`
    <div class="p-5 border-b border-white/5 flex items-center justify-between sticky top-0 bg-ink-850 z-10">
      <div>
        <div class="text-xs text-slate-500 font-mono mb-1">${a.id}</div>
        <h2 class="text-lg font-bold text-white">${TOOL_LABEL[a.tool] || a.tool}</h2>
      </div>
      <button class="btn-ghost" id="drawer-close">${icon('x')}</button>
    </div>
    <div class="p-5 space-y-5">
      <div class="flex flex-wrap gap-2">
        <span class="status-pill ${a.status}">${a.status}</span>
        <span class="status-pill ${a.mode === 'auto' ? 'auto' : 'pending'}">${a.mode}</span>
        <span class="text-xs text-slate-500 font-mono self-center">${fmtTime(a.createdAt)}</span>
      </div>
      <section>
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Reasoning</h3>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(a.reasoning)}</p>
      </section>
      <section>
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">PolicyEngine</h3>
        <div class="font-mono text-xs p-3 rounded-lg bg-black/30 border border-white/5 text-neon-cyan">${escapeHtml(a.policy)}</div>
      </section>
      <section>
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Input</h3>
        <pre class="font-mono text-xs p-3 rounded-lg bg-black/30 border border-white/5 text-slate-300 whitespace-pre-wrap overflow-x-auto">${escapeHtml(JSON.stringify(a.input, null, 2))}</pre>
      </section>
      <section>
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Output</h3>
        <pre class="font-mono text-xs p-3 rounded-lg bg-black/30 border border-white/5 text-slate-300 whitespace-pre-wrap overflow-x-auto">${escapeHtml(JSON.stringify(a.output, null, 2))}</pre>
      </section>
      <section>
        <h3 class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Cost</h3>
        <div class="text-white font-semibold">${a.cost ? fmtMoney(a.cost) : '—'}</div>
      </section>
    </div>`);
}

/* ---------- views ---------- */
function render() {
  state.route = parseRoute();
  const shell = $('#admin-shell');
  const topbar = $('#topbar');

  if (state.route === 'public') {
    shell.classList.add('public-mode');
    $('#sidebar').classList.add('!hidden');
    topbar.classList.add('hidden');
  } else {
    shell.classList.remove('public-mode');
    $('#sidebar').classList.remove('!hidden');
    $('#sidebar').classList.add('hidden', 'lg:flex');
    topbar.classList.remove('hidden');
  }

  renderNav();
  renderAgentPill();

  const view = $('#view');
  const map = {
    ops: renderOps,
    approvals: renderApprovals,
    log: renderLog,
    brain: renderBrain,
    tools: renderTools,
    budget: renderBudget,
    calls: renderCalls,
    public: renderPublic,
  };
  (map[state.route] || renderOps)(view);
  lucide.createIcons({ nodes: [view] });
}

/* ===== OPS ROOM ===== */
function sparkline(values) {
  const w = 320, h = 64, pad = 4;
  const max = Math.max(...values, 1);
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return `
    <svg viewBox="0 0 ${w} ${h}" class="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2ee6ff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#2ee6ff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon fill="url(#sg)" points="${pad},${h - pad} ${pts} ${w - pad},${h - pad}" />
      <polyline fill="none" stroke="#2ee6ff" stroke-width="2" points="${pts}" />
    </svg>`;
}

function renderOps(view) {
  const pending = state.actions.filter(a => a.status === 'pending').length;
  const recent = [...state.actions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Ops room</h1>
          <p class="text-slate-500 text-sm mt-1">Live loop · ${DEMO.campaign.name}</p>
        </div>
        ${state.stopped
          ? `<button class="btn-primary" id="resume-btn">${icon('play')} Resume agent</button>`
          : `<div class="text-xs font-mono text-slate-500">Cycle live · policy mixed</div>`}
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="kpi"><div class="label">Tweets</div><div class="value">${state.kpis.tweets}</div><div class="delta text-neon-green">+2 today</div></div>
        <div class="kpi"><div class="label">Emails sent</div><div class="value">${state.kpis.emails.toLocaleString()}</div><div class="delta text-slate-500">subscribers ${state.kpis.subscribers.toLocaleString()}</div></div>
        <div class="kpi"><div class="label">Calls</div><div class="value">${state.kpis.calls}</div><div class="delta text-slate-500">opt-in only</div></div>
        <div class="kpi"><div class="label">Pending approvals</div><div class="value ${pending ? 'text-neon-amber' : ''}">${pending}</div><div class="delta text-neon-amber">${pending ? 'needs attention' : 'clear'}</div></div>
      </div>

      <div class="grid lg:grid-cols-5 gap-4">
        <div class="panel lg:col-span-3">
          <div class="panel-header">
            <div class="flex items-center gap-2 text-sm font-semibold text-white">${icon('cpu')} Thought stream</div>
            <span class="status-pill ${state.stopped ? 'stopped' : 'thinking'}">${state.stopped ? 'stopped' : state.agentStatus}</span>
          </div>
          <div class="p-4">
            <div class="thought-stream" id="thought-stream">
              ${state.thoughts.map((t, i) => `<div class="line ${t.cls}" style="animation-delay:${i * 0.05}s">› ${escapeHtml(t.t)}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="panel lg:col-span-2">
          <div class="panel-header">
            <div class="flex items-center gap-2 text-sm font-semibold text-white">${icon('activity')} Activity · 24h</div>
          </div>
          <div class="p-4">
            ${sparkline(DEMO.activitySeries)}
            <div class="flex justify-between text-[10px] text-slate-600 font-mono mt-2">
              <span>00:00</span><span>12:00</span><span>now</span>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-black/25 border border-white/5 p-3">
                <div class="text-[10px] uppercase text-slate-500 tracking-wider">Spend today</div>
                <div class="text-lg font-bold text-white mt-1">${fmtMoney(state.kpis.spendToday)}</div>
                <div class="text-[11px] text-slate-500 mt-1">of ${fmtMoney(state.kpis.dailyBudget)} daily</div>
                <div class="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-neon-cyan" style="width:${Math.min(100, state.kpis.spendToday / state.kpis.dailyBudget * 100)}%"></div>
                </div>
              </div>
              <div class="rounded-lg bg-black/25 border border-white/5 p-3">
                <div class="text-[10px] uppercase text-slate-500 tracking-wider">Month</div>
                <div class="text-lg font-bold text-white mt-1">${fmtMoney(state.kpis.spendMonth)}</div>
                <div class="text-[11px] text-slate-500 mt-1">of ${fmtMoney(state.kpis.monthlyBudget)}</div>
                <div class="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div class="h-full rounded-full bg-neon-violet" style="width:${Math.min(100, state.kpis.spendMonth / state.kpis.monthlyBudget * 100)}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div class="flex items-center gap-2 text-sm font-semibold text-white">${icon('zap')} Live action feed</div>
          <a href="#/log" class="btn-ghost text-xs">Full log →</a>
        </div>
        <div id="ops-feed">
          ${recent.map(a => feedRow(a)).join('') || `<div class="p-8 text-center text-slate-500 text-sm">No actions yet</div>`}
        </div>
      </div>
    </div>`;

  const resume = $('#resume-btn');
  if (resume) resume.onclick = resumeAgent;
  $$('#ops-feed .feed-item').forEach(el => {
    el.onclick = () => openActionDrawer(el.dataset.id);
  });
}

function feedRow(a) {
  return `
    <div class="feed-item" data-id="${a.id}">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 w-8 h-8 rounded-lg bg-white/5 border border-white/5 grid place-items-center text-slate-400">${icon(TOOL_ICON[a.tool] || 'circle')}</div>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="text-sm font-semibold text-white">${TOOL_LABEL[a.tool] || a.tool}</span>
            <span class="status-pill ${a.status}">${a.status}</span>
            <span class="text-[11px] text-slate-600 font-mono">${fmtTime(a.createdAt)}</span>
          </div>
          <p class="text-sm text-slate-400 truncate">${escapeHtml(a.reasoning)}</p>
        </div>
        ${a.cost ? `<div class="text-xs font-mono text-slate-500">${fmtMoney(a.cost)}</div>` : ''}
      </div>
    </div>`;
}

/* ===== APPROVALS ===== */
function renderApprovals(view) {
  const pending = state.actions.filter(a => a.status === 'pending');
  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-6 max-w-[1000px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Approval queue</h1>
        <p class="text-slate-500 text-sm mt-1">${pending.length} action${pending.length === 1 ? '' : 's'} waiting for a human</p>
      </div>
      <div class="space-y-4" id="approval-list">
        ${pending.length ? pending.map(approvalCard).join('') : `
          <div class="panel p-12 text-center">
            <div class="text-neon-green mb-2">${icon('check-circle', 'w-8 h-8 mx-auto')}</div>
            <div class="text-white font-semibold">Queue clear</div>
            <p class="text-slate-500 text-sm mt-1">The agent will keep running auto-allowed tools.</p>
          </div>`}
      </div>
      <div class="panel p-4">
        <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Recently blocked</div>
        ${state.actions.filter(a => a.status === 'blocked').map(a => `
          <div class="flex items-start gap-3 py-3 border-t border-white/5 first:border-0">
            <span class="status-pill blocked">blocked</span>
            <div class="flex-1">
              <div class="text-sm text-white">${TOOL_LABEL[a.tool]} · ${escapeHtml(a.policy)}</div>
              <div class="text-xs text-slate-500 mt-1 font-mono">${escapeHtml(a.input.text || JSON.stringify(a.input)).slice(0, 120)}</div>
            </div>
          </div>`).join('') || '<div class="text-sm text-slate-500">Nothing blocked yet.</div>'}
      </div>
    </div>`;

  $$('[data-approve]').forEach(btn => {
    btn.onclick = () => decideApproval(btn.dataset.approve, 'approved');
  });
  $$('[data-reject]').forEach(btn => {
    btn.onclick = () => decideApproval(btn.dataset.reject, 'rejected');
  });
  $$('[data-edit]').forEach(btn => {
    btn.onclick = () => toast('Edit preview — wire to form in production', 'warn');
  });
}

function approvalCard(a) {
  let preview = '';
  if (a.tool === 'send_email') {
    preview = `
      <div class="rounded-lg bg-black/30 border border-white/5 p-3 text-sm">
        <div class="text-xs text-slate-500 mb-1">To ${a.input.recipients?.toLocaleString()} subscribers</div>
        <div class="font-semibold text-white mb-2">${escapeHtml(a.input.subject)}</div>
        <pre class="text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">${escapeHtml(a.input.body)}</pre>
      </div>`;
  } else if (a.tool === 'request_payment') {
    preview = `
      <div class="rounded-lg bg-black/30 border border-white/5 p-4 flex items-center gap-4">
        <div class="text-3xl font-bold text-neon-amber">${fmtMoney(a.input.amount)}</div>
        <div>
          <div class="text-white font-medium">${escapeHtml(a.input.vendor)}</div>
          <div class="text-sm text-slate-400">${escapeHtml(a.input.reason)}</div>
        </div>
      </div>`;
  } else if (a.tool === 'make_call') {
    preview = `
      <div class="rounded-lg bg-black/30 border border-white/5 p-3 text-sm text-slate-300">
        Batch of <strong class="text-white">${a.input.batch}</strong> opt-in callbacks · script <code class="text-neon-cyan">${escapeHtml(a.input.script)}</code>
        · est. ${fmtMoney(a.input.estimatedCost || a.cost)}
      </div>`;
  } else {
    preview = `<pre class="text-xs text-slate-400 whitespace-pre-wrap">${escapeHtml(JSON.stringify(a.input, null, 2))}</pre>`;
  }

  return `
    <div class="approval-card" id="card-${a.id}">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="status-pill pending">pending</span>
        <span class="text-sm font-semibold text-white">${TOOL_LABEL[a.tool]}</span>
        <span class="text-[11px] text-slate-500 font-mono">${fmtTime(a.createdAt)}</span>
      </div>
      <p class="text-sm text-slate-400 mb-4">${escapeHtml(a.reasoning)}</p>
      ${preview}
      <div class="font-mono text-[11px] text-slate-500 mt-3 mb-4">${escapeHtml(a.policy)}</div>
      <div class="flex flex-wrap gap-2">
        <button class="btn-approve" data-approve="${a.id}">${icon('check')} Approve</button>
        <button class="btn-reject" data-reject="${a.id}">${icon('x')} Reject</button>
        <button class="btn-soft" data-edit="${a.id}">${icon('pencil')} Edit</button>
      </div>
    </div>`;
}

function decideApproval(id, decision) {
  const card = $(`#card-${id}`);
  const a = state.actions.find(x => x.id === id);
  if (!a) return;
  if (card) card.classList.add('leaving');
  setTimeout(() => {
    a.status = decision === 'approved' ? 'executed' : 'rejected';
    a.policy = decision === 'approved'
      ? `APPROVED by Yoav · then executed`
      : `REJECTED by Yoav`;
    if (decision === 'approved') {
      a.output = a.output || { ok: true };
      if (a.tool === 'send_email') state.kpis.emails += a.input.recipients || 0;
      if (a.tool === 'request_payment') {
        state.kpis.spendToday += a.input.amount || 0;
        state.kpis.spendMonth += a.input.amount || 0;
        const sp = state.spends.find(s => s.actionId === id);
        if (sp) sp.status = 'settled';
      }
      if (a.tool === 'make_call') state.kpis.calls += a.input.batch || 1;
      toast(`Approved · ${TOOL_LABEL[a.tool]}`, 'ok');
    } else {
      toast(`Rejected · ${TOOL_LABEL[a.tool]}`, 'warn');
    }
    state.kpis.approvalsPending = state.actions.filter(x => x.status === 'pending').length;
    render();
  }, 280);
}

/* ===== LOG ===== */
function renderLog(view) {
  const tools = ['all', ...new Set(state.actions.map(a => a.tool))];
  const statuses = ['all', 'executed', 'pending', 'blocked', 'rejected', 'failed'];
  const filtered = state.actions.filter(a => {
    if (state.logFilter.tool !== 'all' && a.tool !== state.logFilter.tool) return false;
    if (state.logFilter.status !== 'all' && a.status !== state.logFilter.status) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-5 max-w-[1200px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Activity log</h1>
        <p class="text-slate-500 text-sm mt-1">${filtered.length} actions · click a row for full detail</p>
      </div>
      <div class="flex flex-wrap gap-2" id="log-filters">
        <span class="text-xs text-slate-500 self-center mr-1">Tool</span>
        ${tools.map(t => `<button class="filter-chip ${state.logFilter.tool === t ? 'active' : ''}" data-ft="${t}">${t === 'all' ? 'All' : TOOL_LABEL[t] || t}</button>`).join('')}
        <span class="text-xs text-slate-500 self-center ml-3 mr-1">Status</span>
        ${statuses.map(s => `<button class="filter-chip ${state.logFilter.status === s ? 'active' : ''}" data-fs="${s}">${s}</button>`).join('')}
      </div>
      <div class="panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                <th class="px-4 py-3 font-semibold">When</th>
                <th class="px-4 py-3 font-semibold">Tool</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 font-semibold">Reasoning</th>
                <th class="px-4 py-3 font-semibold">Cost</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => `
                <tr class="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition" data-log="${a.id}">
                  <td class="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">${fmtTime(a.createdAt)}</td>
                  <td class="px-4 py-3 text-white font-medium">${TOOL_LABEL[a.tool] || a.tool}</td>
                  <td class="px-4 py-3"><span class="status-pill ${a.status}">${a.status}</span></td>
                  <td class="px-4 py-3 text-slate-400 max-w-md truncate">${escapeHtml(a.reasoning)}</td>
                  <td class="px-4 py-3 font-mono text-xs text-slate-500">${a.cost ? fmtMoney(a.cost) : '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  $$('[data-ft]').forEach(b => b.onclick = () => { state.logFilter.tool = b.dataset.ft; render(); });
  $$('[data-fs]').forEach(b => b.onclick = () => { state.logFilter.status = b.dataset.fs; render(); });
  $$('[data-log]').forEach(r => r.onclick = () => openActionDrawer(r.dataset.log));
}

/* ===== BRAIN ===== */
function previewAnswer(style) {
  const sharp = style.sharpness;
  const tone = style.tone;
  const humor = style.humor;
  if (sharp > 70 && tone > 55) {
    return `Dues without disclosure is a blank check. Publish the audited allocation — annually, in language any member can read. [source: campaign demand] — Megaphone (bot)`;
  }
  if (humor > 50) {
    return `Plot twist: asking where the money goes isn’t radical. It’s bookkeeping. Open the books. [source: campaign principles] — Megaphone (bot)`;
  }
  return `We support strong worker representation. We also support clear public reporting of membership dues. Transparency and solidarity can coexist. [source: campaign principles] — Megaphone (bot)`;
}

function renderBrain(view) {
  const b = state.brain;
  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Agent brain</h1>
        <p class="text-slate-500 text-sm mt-1">System prompt, voice, messages, and red lines</p>
      </div>
      <div class="grid lg:grid-cols-5 gap-4">
        <div class="panel lg:col-span-3">
          <div class="panel-header"><div class="text-sm font-semibold text-white">System prompt</div></div>
          <div class="p-4">
            <textarea id="prompt-editor" class="w-full h-64 bg-black/30 border border-white/8 rounded-xl p-4 text-sm text-slate-200 font-mono leading-relaxed resize-y focus:outline-none focus:border-neon-cyan/40">${escapeHtml(b.systemPrompt)}</textarea>
            <div class="flex justify-end mt-3"><button class="btn-primary" id="save-prompt">${icon('save')} Save prompt</button></div>
          </div>
        </div>
        <div class="panel lg:col-span-2">
          <div class="panel-header"><div class="text-sm font-semibold text-white">Style guide</div></div>
          <div class="p-4 space-y-5">
            ${styleSlider('tone', 'Tone', 'Measured', 'Assertive', b.style.tone)}
            ${styleSlider('sharpness', 'Sharpness', 'Soft', 'Cutting', b.style.sharpness)}
            ${styleSlider('humor', 'Humor', 'None', 'Dry wit', b.style.humor)}
            <div>
              <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Live preview</div>
              <div id="style-preview" class="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3 text-sm text-slate-200 leading-relaxed">${escapeHtml(previewAnswer(b.style))}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="panel">
          <div class="panel-header"><div class="text-sm font-semibold text-white">Core messages</div></div>
          <ul class="p-4 space-y-2">
            ${b.messages.map(m => `<li class="flex gap-2 text-sm text-slate-300"><span class="text-neon-cyan">▹</span>${escapeHtml(m)}</li>`).join('')}
          </ul>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="text-sm font-semibold text-white">Red lines</div></div>
          <ul class="p-4 space-y-2">
            ${b.redLines.map(m => `<li class="flex gap-2 text-sm text-slate-300"><span class="text-neon-red">✕</span>${escapeHtml(m)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>`;

  $$('.style-range').forEach(input => {
    input.oninput = () => {
      state.brain.style[input.dataset.key] = Number(input.value);
      $(`#val-${input.dataset.key}`).textContent = input.value;
      $('#style-preview').textContent = previewAnswer(state.brain.style);
    };
  });
  $('#save-prompt').onclick = () => {
    state.brain.systemPrompt = $('#prompt-editor').value;
    toast('System prompt saved', 'ok');
  };
}

function styleSlider(key, label, left, right, value) {
  return `
    <div class="slider-row">
      <div class="flex justify-between text-sm mb-2">
        <span class="text-white font-medium">${label}</span>
        <span class="font-mono text-neon-cyan text-xs" id="val-${key}">${value}</span>
      </div>
      <input type="range" min="0" max="100" value="${value}" class="style-range" data-key="${key}" />
      <div class="flex justify-between text-[10px] text-slate-600 mt-1"><span>${left}</span><span>${right}</span></div>
    </div>`;
}

/* ===== TOOLS ===== */
function renderTools(view) {
  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Tools & permissions</h1>
        <p class="text-slate-500 text-sm mt-1">Mode is enforced by PolicyEngine — the model cannot override it</p>
      </div>
      <div class="grid md:grid-cols-2 gap-4" id="tool-grid">
        ${state.tools.map(toolCard).join('')}
      </div>
      <div>
        <h2 class="text-lg font-bold text-white mb-3">Tool shop</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          ${state.shop.map(s => `
            <div class="tool-card disconnected">
              <div class="flex items-center gap-2 mb-2 text-white font-semibold">${icon(s.icon)}${escapeHtml(s.name)}</div>
              <p class="text-xs text-slate-500 mb-3">${escapeHtml(s.desc)}</p>
              <button class="btn-soft w-full justify-center" data-connect="${s.id}">${icon('plug')} Connect</button>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  $$('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      const tool = state.tools.find(t => t.id === btn.dataset.tool);
      if (!tool) return;
      tool.mode = btn.dataset.mode;
      toast(`${tool.name} → ${tool.mode}`, 'ok');
      render();
    };
  });
  $$('[data-connect]').forEach(btn => {
    btn.onclick = () => toast(`Connect ${btn.dataset.connect} — OAuth stub in prototype`, 'warn');
  });
}

function toolCard(t) {
  return `
    <div class="tool-card">
      <div class="flex items-start justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-9 h-9 rounded-lg bg-white/5 grid place-items-center text-neon-cyan">${icon(t.icon)}</div>
          <div>
            <div class="font-semibold text-white">${escapeHtml(t.name)}</div>
            <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(t.quota)}</div>
          </div>
        </div>
        <div class="mode-toggle">
          <button class="mode-btn ${t.mode === 'off' ? 'active-off' : ''}" data-tool="${t.id}" data-mode="off">Off</button>
          <button class="mode-btn ${t.mode === 'approval' ? 'active-approval' : ''}" data-tool="${t.id}" data-mode="approval">Approval</button>
          <button class="mode-btn ${t.mode === 'auto' ? 'active-auto' : ''}" data-tool="${t.id}" data-mode="auto">Auto</button>
        </div>
      </div>
      <p class="text-sm text-slate-400">${escapeHtml(t.desc)}</p>
    </div>`;
}

/* ===== BUDGET ===== */
function renderBudget(view) {
  const dayPct = Math.min(100, state.kpis.spendToday / state.kpis.dailyBudget * 100);
  const monthPct = Math.min(100, state.kpis.spendMonth / state.kpis.monthlyBudget * 100);
  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Budget & payments</h1>
        <p class="text-slate-500 text-sm mt-1">The model never sees full card numbers — only request_payment()</p>
      </div>
      <div class="grid lg:grid-cols-3 gap-4">
        <div class="virtual-card lg:col-span-1 flex flex-col justify-between">
          <div class="flex justify-between items-start relative z-10">
            <div class="text-xs font-mono text-white/70">MEGAPHONE VIRTUAL</div>
            <div class="text-white/80">${icon('cpu', 'w-5 h-5')}</div>
          </div>
          <div class="relative z-10 mt-8">
            <div class="font-mono text-xl tracking-[0.2em] text-white">•••• •••• •••• 4429</div>
            <div class="flex justify-between mt-4 text-xs text-white/70">
              <div><div class="opacity-60">Holder</div><div class="text-white mt-0.5">Agent Megaphone</div></div>
              <div><div class="opacity-60">Exp</div><div class="text-white mt-0.5">09/28</div></div>
            </div>
          </div>
        </div>
        <div class="panel p-5 lg:col-span-2 space-y-5">
          <div>
            <div class="flex justify-between text-sm mb-2"><span class="text-slate-400">Daily</span><span class="font-mono text-white">${fmtMoney(state.kpis.spendToday)} / ${fmtMoney(state.kpis.dailyBudget)}</span></div>
            <div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-neon-cyan rounded-full" style="width:${dayPct}%"></div></div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-2"><span class="text-slate-400">Monthly</span><span class="font-mono text-white">${fmtMoney(state.kpis.spendMonth)} / ${fmtMoney(state.kpis.monthlyBudget)}</span></div>
            <div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full bg-neon-violet rounded-full" style="width:${monthPct}%"></div></div>
          </div>
          <div class="grid sm:grid-cols-3 gap-3 pt-2">
            <div class="rounded-lg bg-black/25 border border-white/5 p-3">
              <div class="text-[10px] uppercase text-slate-500">Auto limit</div>
              <div class="text-white font-bold mt-1">₪100</div>
            </div>
            <div class="rounded-lg bg-black/25 border border-white/5 p-3">
              <div class="text-[10px] uppercase text-slate-500">Vendors</div>
              <div class="text-white font-bold mt-1 text-sm">X Ads, Resend, Twilio</div>
            </div>
            <div class="rounded-lg bg-black/25 border border-white/5 p-3">
              <div class="text-[10px] uppercase text-slate-500">Rule</div>
              <div class="text-white font-bold mt-1 text-sm">≤₪100 auto · else approve</div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel overflow-hidden">
        <div class="panel-header"><div class="text-sm font-semibold text-white">Spend ledger</div></div>
        <div class="divide-y divide-white/5">
          ${state.spends.map(s => `
            <div class="flex items-center gap-4 px-5 py-3">
              <div class="flex-1 min-w-0">
                <div class="text-sm text-white font-medium">${escapeHtml(s.vendor)} · ${escapeHtml(s.reason)}</div>
                <div class="text-[11px] text-slate-500 font-mono">${fmtTime(s.at)}</div>
              </div>
              <span class="status-pill ${s.status === 'settled' ? 'executed' : 'pending'}">${s.status}</span>
              <div class="font-mono text-sm text-white w-20 text-right">${fmtMoney(s.amount)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}

/* ===== CALLS ===== */
function renderCalls(view) {
  const call = state.calls.find(c => c.id === state.selectedCall) || state.calls[0];
  view.innerHTML = `
    <div class="p-4 sm:p-6 space-y-4 max-w-[1200px]">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Calls center</h1>
        <p class="text-slate-500 text-sm mt-1">Opt-in outreach only · full transcripts logged</p>
      </div>
      <div class="grid lg:grid-cols-5 gap-4">
        <div class="panel lg:col-span-2 overflow-hidden">
          <div class="panel-header"><div class="text-sm font-semibold text-white">Recent calls</div></div>
          <div>
            ${state.calls.map(c => `
              <button class="w-full text-left feed-item ${c.id === call.id ? '!bg-neon-cyan/5' : ''}" data-call="${c.id}">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-white/5 grid place-items-center text-slate-400">${icon('phone')}</div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-white font-medium">${escapeHtml(c.name)}</div>
                    <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(c.to)} · ${c.durationSec}s</div>
                  </div>
                  <span class="status-pill ${c.outcome === 'supporter' ? 'executed' : c.outcome === 'opposed' ? 'rejected' : 'pending'}">${c.outcome.replace('_', ' ')}</span>
                </div>
              </button>`).join('')}
          </div>
        </div>
        <div class="panel lg:col-span-3" id="call-player">
          ${callPlayer(call)}
        </div>
      </div>
    </div>`;

  $$('[data-call]').forEach(btn => {
    btn.onclick = () => {
      state.selectedCall = btn.dataset.call;
      state.callPlaying = false;
      state.callLine = 0;
      render();
    };
  });
  wireCallPlayer();
}

function callPlayer(call) {
  const bars = Array.from({ length: 42 }, (_, i) => {
    const h = 8 + ((Math.sin(i * 0.7) + 1) * 16) + (i % 5) * 2;
    return `<span style="height:${h}px;animation-delay:${(i % 8) * 0.08}s"></span>`;
  }).join('');
  return `
    <div class="panel-header">
      <div>
        <div class="text-sm font-semibold text-white">${escapeHtml(call.name)}</div>
        <div class="text-[11px] text-slate-500 font-mono">${escapeHtml(call.to)} · ${fmtTime(call.at)}</div>
      </div>
      <div class="flex gap-1 flex-wrap">${call.tags.map(t => `<span class="filter-chip !cursor-default">${escapeHtml(t)}</span>`).join('')}</div>
    </div>
    <div class="p-5 space-y-4">
      <div class="rounded-xl bg-black/30 border border-white/5 p-4 flex items-center gap-4">
        <button class="btn-primary !rounded-full w-11 h-11 !p-0" id="play-call">${icon(state.callPlaying ? 'pause' : 'play', 'w-5 h-5')}</button>
        <div class="flex-1">
          <div class="waveform ${state.callPlaying ? 'playing' : ''}" id="waveform">${bars}</div>
          <div class="flex justify-between text-[10px] font-mono text-slate-600 mt-1"><span>0:00</span><span>${Math.floor(call.durationSec / 60)}:${String(call.durationSec % 60).padStart(2, '0')}</span></div>
        </div>
      </div>
      <div id="transcript" class="max-h-80 overflow-y-auto pr-1">
        ${call.transcript.map((line, i) => `
          <div class="transcript-line ${line.who} ${i === state.callLine && state.callPlaying ? 'active' : i <= state.callLine ? 'active' : ''}" data-line="${i}">
            <div class="who">${line.who === 'bot' ? 'Megaphone (bot)' : 'Human'}</div>
            <div>${escapeHtml(line.text)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

let callTimer = null;
function wireCallPlayer() {
  const btn = $('#play-call');
  if (!btn) return;
  btn.onclick = () => {
    state.callPlaying = !state.callPlaying;
    if (state.callPlaying) {
      toast('Playing mock call…', 'ok');
      const call = state.calls.find(c => c.id === state.selectedCall);
      clearInterval(callTimer);
      callTimer = setInterval(() => {
        if (!state.callPlaying) { clearInterval(callTimer); return; }
        state.callLine++;
        if (state.callLine >= call.transcript.length) {
          state.callPlaying = false;
          state.callLine = call.transcript.length - 1;
          clearInterval(callTimer);
        }
        if (state.route === 'calls') {
          const player = $('#call-player');
          if (player) {
            player.innerHTML = callPlayer(call);
            lucide.createIcons({ nodes: [player] });
            wireCallPlayer();
            const active = $(`.transcript-line[data-line="${state.callLine}"]`);
            if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }, 1600);
    } else {
      clearInterval(callTimer);
    }
    const call = state.calls.find(c => c.id === state.selectedCall);
    const player = $('#call-player');
    if (player) {
      player.innerHTML = callPlayer(call);
      lucide.createIcons({ nodes: [player] });
      wireCallPlayer();
    }
  };
}

/* ===== PUBLIC ===== */
function renderPublic(view) {
  view.innerHTML = `
    <div class="min-h-screen">
      <div class="public-hero">
        <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-14">
          <div class="flex items-center justify-between mb-10">
            <div class="flex items-center gap-3">
              <div class="logo-mark">${icon('megaphone', 'w-5 h-5')}</div>
              <div>
                <div class="font-bold text-white">Megaphone</div>
                <div class="text-[11px] text-slate-500">Public activity · always on the record</div>
              </div>
            </div>
            <a href="#/ops" class="btn-soft text-xs">${icon('layout-dashboard')} Ops room</a>
          </div>
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2 text-xs font-mono text-neon-cyan mb-4 px-2 py-1 rounded-md bg-neon-cyan/10 border border-neon-cyan/20">
              <span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--neon-green);box-shadow:0 0 8px var(--neon-green);display:inline-block"></span>
              LIVE AGENT
            </div>
            <h1 class="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]">${escapeHtml(DEMO.campaign.name)}</h1>
            <p class="mt-4 text-lg text-slate-400 leading-relaxed">${escapeHtml(DEMO.campaign.tagline)}</p>
            <p class="mt-3 text-sm text-slate-500">${escapeHtml(DEMO.campaign.disclaimer)}</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
            <div class="kpi"><div class="label">Posts</div><div class="value">${state.kpis.tweets}</div></div>
            <div class="kpi"><div class="label">Emails</div><div class="value">${state.kpis.emails.toLocaleString()}</div></div>
            <div class="kpi"><div class="label">Calls</div><div class="value">${state.kpis.calls}</div></div>
            <div class="kpi"><div class="label">Spend MTD</div><div class="value text-xl sm:text-2xl">${fmtMoney(state.kpis.spendMonth)}</div></div>
          </div>
        </div>
      </div>

      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-5 gap-8">
        <div class="lg:col-span-3 space-y-4">
          <h2 class="text-lg font-bold text-white">What I’ve done</h2>
          ${state.artifacts.map(artifactCard).join('')}
        </div>
        <div class="lg:col-span-2">
          <div class="panel sticky top-6 overflow-hidden flex flex-col" style="max-height:calc(100vh - 3rem)">
            <div class="panel-header">
              <div class="text-sm font-semibold text-white flex items-center gap-2">${icon('message-square')} Ask the bot</div>
            </div>
            <div id="chat-thread" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
              ${state.chat.length ? '' : `<div class="text-sm text-slate-500 text-center py-8">Ask what I posted, emailed, spent, or why something was blocked.</div>`}
              ${state.chat.map(m => chatBubble(m)).join('')}
            </div>
            <form id="chat-form" class="p-3 border-t border-white/5 flex gap-2">
              <input id="chat-input" class="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan/40" placeholder="e.g. What did you tweet today?" autocomplete="off" />
              <button class="btn-primary" type="submit">${icon('send')}</button>
            </form>
            <div class="px-3 pb-3 flex flex-wrap gap-1.5">
              ${['What did you tweet?', 'Any payments pending?', 'Why was something blocked?', 'Who are you?'].map(q =>
                `<button type="button" class="filter-chip suggest-q">${escapeHtml(q)}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;

  $('#chat-form').onsubmit = (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    askBot(q);
  };
  $$('.suggest-q').forEach(b => b.onclick = () => askBot(b.textContent));
}

function artifactCard(a) {
  if (a.type === 'tweet') {
    return `
      <div class="tweet-card">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-neon-violet to-neon-cyan grid place-items-center text-ink-950 font-bold text-xs">M</div>
          <div>
            <div class="text-sm font-semibold text-white">Megaphone <span class="text-slate-500 font-normal">@MegaphoneBot</span></div>
            <div class="text-[11px] text-slate-500">${fmtTime(a.at)} · bot</div>
          </div>
        </div>
        <p class="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">${escapeHtml(a.content)}</p>
        <div class="flex gap-4 mt-3 text-xs text-slate-500 font-mono">
          <span>${a.stats.replies} replies</span>
          <span>${a.stats.reposts} reposts</span>
          <span>${a.stats.likes} likes</span>
        </div>
      </div>`;
  }
  if (a.type === 'email') {
    return `
      <div class="email-card">
        <div class="flex items-center gap-2 mb-2 text-neon-amber text-xs font-mono uppercase">${icon('mail', 'w-3.5 h-3.5')} Email · ${escapeHtml(a.status)}</div>
        <div class="text-white font-semibold">${escapeHtml(a.subject)}</div>
        <p class="text-sm text-slate-400 mt-1">${escapeHtml(a.preview)}</p>
        <div class="text-[11px] text-slate-600 mt-2 font-mono">${fmtTime(a.at)}</div>
      </div>`;
  }
  if (a.type === 'call') {
    return `
      <div class="call-card">
        <div class="flex items-center gap-2 mb-2 text-neon-cyan text-xs font-mono uppercase">${icon('phone', 'w-3.5 h-3.5')} Call · ${escapeHtml(a.outcome)}</div>
        <p class="text-sm text-slate-300">${escapeHtml(a.summary)}</p>
        <div class="text-[11px] text-slate-600 mt-2 font-mono">${fmtTime(a.at)} · ${a.durationSec}s</div>
      </div>`;
  }
  return `
    <div class="research-card">
      <div class="flex items-center gap-2 mb-2 text-slate-400 text-xs font-mono uppercase">${icon('search', 'w-3.5 h-3.5')} Research</div>
      <div class="text-white font-semibold">${escapeHtml(a.title)}</div>
      <p class="text-sm text-slate-400 mt-1">${escapeHtml(a.summary)}</p>
    </div>`;
}

function chatBubble(m) {
  return `<div class="chat-bubble ${m.role}">${m.html}</div>`;
}

function askBot(question) {
  state.chat.push({ role: 'user', html: escapeHtml(question) });
  const match = DEMO.qa.find(q => q.keys.some(k => question.toLowerCase().includes(k)));
  const answer = match
    ? match.answer
    : `I logged that question. In production I’d search my action log. Try asking about tweets, emails, payments, calls, or blocked actions.`;
  const cite = match ? match.cite : 'QA fallback';
  state.chat.push({ role: 'bot', html: `<span class="typing-cursor" id="typing-target"></span>` });
  render();
  const target = $('#typing-target');
  if (!target) return;
  let i = 0;
  const tick = () => {
    if (i <= answer.length) {
      target.textContent = answer.slice(0, i);
      i++;
      setTimeout(tick, 12 + Math.random() * 18);
    } else {
      target.classList.remove('typing-cursor');
      const citeEl = document.createElement('div');
      citeEl.className = 'cite';
      citeEl.textContent = '↩ ' + cite;
      target.parentElement.appendChild(citeEl);
      state.chat[state.chat.length - 1].html = escapeHtml(answer) + `<div class="cite">↩ ${escapeHtml(cite)}</div>`;
    }
  };
  tick();
}

/* ---------- live simulation ---------- */
function pushThought(text, cls = '') {
  state.thoughts.push({ t: text, cls });
  if (state.thoughts.length > 10) state.thoughts.shift();
}

function liveTick() {
  if (state.stopped) return;
  const pool = DEMO.livePool;
  const item = pool[state.liveIdx % pool.length];
  state.liveIdx++;

  state.agentStatus = 'thinking';
  renderAgentPill();
  pushThought(item.thought || item.reasoning, 'hl');

  setTimeout(() => {
    if (state.stopped) return;
    state.agentStatus = 'executing';
    renderAgentPill();

    const action = {
      id: uid(),
      tool: item.tool,
      status: item.status,
      mode: item.mode,
      createdAt: new Date().toISOString(),
      reasoning: item.reasoning,
      input: item.input,
      output: item.output,
      cost: item.cost,
      policy: item.policy,
    };
    state.actions.unshift(action);
    if (item.tool === 'post_tweet' && item.status === 'executed') {
      state.kpis.tweets += 1;
      if (item.artifact) {
        state.artifacts.unshift({
          id: 'art' + uid(),
          type: 'tweet',
          actionId: action.id,
          at: action.createdAt,
          content: item.input.text,
          stats: { likes: item.output.likes || 0, reposts: item.output.reposts || 0, replies: 0 },
        });
      }
    }
    pushThought(`Executed ${TOOL_LABEL[item.tool]} (${action.id})`, 'ok');

    if (state.route === 'ops') render();
    else {
      renderNav();
      renderAgentPill();
    }

    setTimeout(() => {
      if (state.stopped) return;
      const pending = state.actions.some(a => a.status === 'pending');
      state.agentStatus = pending ? 'waiting' : 'thinking';
      renderAgentPill();
    }, 1200);
  }, 900);
}

/* ---------- mobile nav ---------- */
function openMobileNav() {
  const existing = $('#mobile-drawer');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'mobile-drawer';
  el.className = 'mobile-drawer open';
  el.innerHTML = `
    <div class="backdrop" id="mob-bg"></div>
    <div class="panel-nav">
      <div class="flex items-center gap-3 mb-4 px-2">
        <div class="logo-mark">${icon('megaphone', 'w-5 h-5')}</div>
        <div class="font-bold text-white">Megaphone</div>
      </div>
      <nav class="space-y-1">
        ${NAV.map(item => `
          <a href="#/${item.id}" class="nav-item ${state.route === item.id ? 'active' : ''}" data-mob="${item.id}">
            ${icon(item.icon)}<span>${item.label}</span>
          </a>`).join('')}
      </nav>
    </div>`;
  document.body.appendChild(el);
  lucide.createIcons({ nodes: [el] });
  $('#mob-bg').onclick = () => el.remove();
  $$('[data-mob]').forEach(a => a.onclick = () => el.remove());
}

/* ---------- boot ---------- */
function boot() {
  window.addEventListener('hashchange', render);
  $('#kill-btn').onclick = showKillModal;
  $('#mobile-nav-btn').onclick = openMobileNav;
  tickClock();
  setInterval(tickClock, 1000);
  render();
  setInterval(liveTick, 9000);
  // gentle status flicker when idle on ops
  setInterval(() => {
    if (state.stopped || state.route !== 'ops') return;
    if (state.agentStatus === 'thinking') {
      pushThought('Heartbeat · tools healthy · waiting for next cycle', 'dim');
      const stream = $('#thought-stream');
      if (stream) {
        const line = document.createElement('div');
        line.className = 'line dim';
        line.textContent = '› Heartbeat · tools healthy · waiting for next cycle';
        stream.appendChild(line);
        while (stream.children.length > 10) stream.firstChild.remove();
      }
    }
  }, 14000);
}

document.addEventListener('DOMContentLoaded', boot);
