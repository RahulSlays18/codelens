// ══════════════════════════════════════════════
//  CodeLens — Auth UI  (js/auth-ui.js)
// ══════════════════════════════════════════════

const CL = {
  token:    localStorage.getItem('cl_token'),
  username: localStorage.getItem('cl_username'),
  lastResult: null,
  get competitors() {
    return JSON.parse(localStorage.getItem(`cl_competitors_${this.username}`) || '[]');
  },
  set competitors(val) {
    localStorage.setItem(`cl_competitors_${this.username}`, JSON.stringify(val));
  },
};

// ── INIT ──────────────────────────────────────
(function init() {
  if (CL.token && CL.username) {
    hideGate();
    showAuthUI();
    checkNotifications();
    setInterval(checkNotifications, 30000);
  }
})();

function hideGate() {
  document.getElementById('auth-gate').classList.add('hidden');
}

function continueAsGuest() {
  hideGate();
  document.getElementById('guest-actions').style.display = 'flex';
}

async function showAuthUI() {
  document.getElementById('auth-actions').style.display = 'flex';
  const initial = (CL.username || '?')[0].toUpperCase();
  document.getElementById('user-avatar').textContent       = initial;
  document.getElementById('user-name-display').textContent = CL.username;
  document.getElementById('dropdown-username').textContent = CL.username;

  // sync accepted competitors from server into localStorage
  await syncCompetitors();
  renderCompetitorAvatars();
}

// ── SYNC COMPETITORS FROM SERVER ──────────────
async function syncCompetitors() {
  if (!CL.token) return;
  try {
    const res  = await fetch('/competitor/accepted', {
      headers: { 'Authorization': `Bearer ${CL.token}` },
    });
    const data = await res.json();
    CL.competitors = data; // overwrites localStorage with server truth
  } catch {}
}

// ── DROPDOWN ──────────────────────────────────
function toggleDropdown() {
  document.getElementById('user-dropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  const pill = document.getElementById('user-pill');
  if (pill && !pill.contains(e.target))
    document.getElementById('user-dropdown').classList.remove('open');
});

// ── LOGOUT ────────────────────────────────────
function handleLogout() {
  localStorage.removeItem('cl_token');
  localStorage.removeItem('cl_username');
  window.location.href = '/login';
}

// ── MODALS ────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// ── HOOK INTO populateResults ─────────────────
window.addEventListener('load', () => {
  const original = window.populateResults;
  if (typeof original === 'function') {
    window.populateResults = function(data) {
      CL.lastResult = data;
      original(data);
    };
  }
});

// ── SAVE ──────────────────────────────────────
async function handleSave() {
  if (!CL.token)      { showToast('Please log in to save.'); return; }
  if (!CL.lastResult) { showToast('Run an analysis first!'); return; }

  const btn = document.getElementById('save-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ Saving...';

  try {
    const res = await fetch('/save', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${CL.token}`,
      },
      body: JSON.stringify({
        code:     document.getElementById('code-input').value,
        language: document.getElementById('lang').value,
        result:   CL.lastResult,
      }),
    });
    if (!res.ok) throw new Error();
    showToast('✓ Analysis saved!');
  } catch {
    showToast('❌ Save failed. Are you logged in?');
  } finally {
    btn.disabled    = false;
    btn.textContent = '💾 Save';
  }
}

// ── SHARE MODAL ───────────────────────────────
function openShareModal() {
  if (!CL.lastResult) { showToast('Run an analysis first!'); return; }
  openModal('share-modal');
}

async function generateChallenge() {
  if (!CL.token)      { showToast('Log in to create challenges.'); return; }
  if (!CL.lastResult) { showToast('Run an analysis first!'); return; }

  const btn = document.getElementById('gen-challenge-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ Generating...';

  try {
    const res = await fetch('/challenge/create', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${CL.token}`,
      },
      body: JSON.stringify({
        code:   document.getElementById('code-input').value,
        lang:   document.getElementById('lang').value,
        result: CL.lastResult,
      }),
    });
    const data = await res.json();
    const link = window.location.origin + data.link;
    document.getElementById('share-link-input').value = link;
    showToast('⚔ Challenge created!');
  } catch {
    showToast('❌ Could not generate challenge.');
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚔ Generate Challenge Link';
  }
}

function copyShareLink() {
  const val = document.getElementById('share-link-input').value;
  if (!val) { showToast('Generate a link first!'); return; }
  navigator.clipboard.writeText(val);
  showToast('📋 Link copied!');
}

function shareAsText() {
  if (!CL.lastResult) { showToast('No analysis to share.'); return; }
  const c    = CL.lastResult.complexity || {};
  const text =
    `🔍 CodeLens Analysis\n` +
    `Time:  ${c.time  || '—'}\n` +
    `Space: ${c.space || '—'}\n` +
    `Tip:   ${c.tip   || '—'}\n\n` +
    window.location.href;
  navigator.clipboard.writeText(text);
  showToast('📋 Copied as text!');
}

function downloadPNG() {
  if (!window.cyInstance) { showToast('Render a graph first!'); return; }
  const blob = window.cyInstance.png({ output: 'blob', bg: '#111318', scale: 2 });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'codelens-graph.png';
  a.click();
  URL.revokeObjectURL(url);
}

function shareToTwitter() {
  const c    = (CL.lastResult || {}).complexity || {};
  const text = encodeURIComponent(
    `Just analyzed my code with CodeLens! ⚡\n` +
    `Time: ${c.time || '?'} | Space: ${c.space || '?'}\n` +
    `#CodeLens #BigO #DSA`
  );
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

// ── HISTORY MODAL ─────────────────────────────
async function openHistory() {
  document.getElementById('user-dropdown').classList.remove('open');
  openModal('history-modal');

  const list = document.getElementById('history-list');
  list.innerHTML = '<div class="comp-empty">Loading...</div>';

  try {
    const res  = await fetch('/history', {
      headers: { 'Authorization': `Bearer ${CL.token}` },
    });
    const rows = await res.json();

    if (!rows.length) {
      list.innerHTML = '<div class="comp-empty">No saves yet — run an analysis and hit 💾 Save!</div>';
      return;
    }

    list.innerHTML = rows.map(r => {
      const parsed  = (() => { try { return JSON.parse(r.result || '{}'); } catch { return {}; } })();
      const c       = parsed.complexity || {};
      const date    = new Date(r.created).toLocaleDateString();
      const preview = (r.code || '').split('\n')[0].slice(0, 55);
      return `
        <div class="history-item"
             onclick="loadHistoryItem(this)"
             data-code="${encodeURIComponent(r.code)}"
             data-lang="${r.language}">
          <div class="history-item-top">
            <span class="history-lang">${r.language.toUpperCase()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-complexity">
            Time: <span style="color:var(--accent)">${c.time || '—'}</span>
            &nbsp;·&nbsp;
            Space: <span style="color:var(--accent)">${c.space || '—'}</span>
          </div>
          <div class="history-preview">${preview}</div>
        </div>`;
    }).join('');

  } catch {
    list.innerHTML = '<div class="comp-empty">Failed to load history.</div>';
  }
}

function loadHistoryItem(el) {
  const code  = decodeURIComponent(el.dataset.code);
  const lang  = el.dataset.lang;
  document.getElementById('code-input').value = code;
  document.getElementById('lang').value       = lang;
  const lines = code.split('\n').length;
  document.getElementById('line-count').textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
  closeModal('history-modal');
  showToast('Code loaded — hit ⚡ Analyze to re-run!');
}

// ── NOTIFICATIONS ─────────────────────────────
async function checkNotifications() {
  if (!CL.token) return;
  try {
    const res   = await fetch('/competitor/requests', {
      headers: { 'Authorization': `Bearer ${CL.token}` },
    });
    const rows  = await res.json();
    const badge = document.getElementById('notif-count');
    if (!badge) return;
    if (rows.length > 0) {
      badge.textContent   = rows.length;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

async function openNotifications() {
  openModal('notif-modal');
  const list = document.getElementById('notif-list');
  list.innerHTML = '<div class="comp-empty">Loading...</div>';

  try {
    const res  = await fetch('/competitor/requests', {
      headers: { 'Authorization': `Bearer ${CL.token}` },
    });
    const rows = await res.json();

    if (!rows.length) {
      list.innerHTML = '<div class="comp-empty">No pending requests.</div>';
      return;
    }

    list.innerHTML = rows.map(r => `
      <div class="comp-result-item" id="req-${r.id}">
        <div class="comp-result-info">
          <div class="comp-avatar">${r.from_user[0].toUpperCase()}</div>
          <div>
            <div class="comp-name">${r.from_user}</div>
            <div style="font-size:0.68rem;color:var(--muted);">wants to compete with you</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="comp-add-btn"
            onclick="respondToRequest('${r.from_user}', 'accept', ${r.id})">
            ✓ Accept
          </button>
          <button class="comp-add-btn"
            style="border-color:rgba(255,77,109,0.3);color:var(--danger);background:rgba(255,77,109,0.07);"
            onclick="respondToRequest('${r.from_user}', 'decline', ${r.id})">
            ✕ Decline
          </button>
        </div>
      </div>`).join('');

  } catch {
    list.innerHTML = '<div class="comp-empty">Failed to load requests.</div>';
  }
}

async function respondToRequest(from_user, action, id) {
  try {
    await fetch('/competitor/respond', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${CL.token}`,
      },
      body: JSON.stringify({ from_user, action }),
    });

    const row = document.getElementById(`req-${id}`);
    if (row) row.remove();

    if (action === 'accept') {
      // sync from server so both sides are correct
      await syncCompetitors();
      renderCompetitorAvatars();
      showToast(`⚔ You and ${from_user} are now competitors!`);
    } else {
      showToast(`Request from ${from_user} declined.`);
    }
    checkNotifications();
  } catch {
    showToast('❌ Could not respond to request.');
  }
}

// ── ADD COMPETITOR MODAL ──────────────────────
async function openAddCompetitor() {
  document.getElementById('user-dropdown').classList.remove('open');
  document.getElementById('competitor-search').value = '';
  document.getElementById('competitor-results').innerHTML =
    '<div class="comp-empty">Type a username to search</div>';
  
  // sync from server first, then render
  await syncCompetitors();
  renderMyCompetitors();
  openModal('competitor-modal');
}

let searchTimer = null;

function searchCompetitors(query) {
  clearTimeout(searchTimer);
  if (!query.trim()) {
    document.getElementById('competitor-results').innerHTML =
      '<div class="comp-empty">Type a username to search</div>';
    return;
  }
  searchTimer = setTimeout(() => doSearch(query.trim()), 350);
}

async function doSearch(query) {
  const el = document.getElementById('competitor-results');
  el.innerHTML = '<div class="comp-empty">Searching...</div>';

  try {
    const res   = await fetch(`/users/search?q=${encodeURIComponent(query)}`, {
      headers: CL.token ? { 'Authorization': `Bearer ${CL.token}` } : {},
    });
    const users = await res.json();

    if (!users.length) {
      el.innerHTML = '<div class="comp-empty">No users found.</div>';
      return;
    }

    el.innerHTML = users.map(u => {
      const isMe    = u.username === CL.username;
      const already = CL.competitors.some(c => c.username === u.username);
      const initial = u.username[0].toUpperCase();
      return `
        <div class="comp-result-item">
          <div class="comp-result-info">
            <div class="comp-avatar">${initial}</div>
            <span class="comp-name">${u.username}</span>
          </div>
          ${isMe
            ? `<span style="font-size:0.7rem;color:var(--muted)">You</span>`
            : already
            ? `<button class="comp-add-btn" disabled>✓ Added</button>`
            : `<button class="comp-add-btn" onclick="addCompetitor('${u.username}', this)">+ Add</button>`
          }
        </div>`;
    }).join('');

  } catch {
    el.innerHTML = '<div class="comp-empty">Search requires a server connection.</div>';
  }
}

async function addCompetitor(username, btn) {
  if (!CL.token) { showToast('Log in to add competitors.'); return; }

  btn.disabled    = true;
  btn.textContent = '⏳ Sending...';

  try {
    const res = await fetch('/competitor/request', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${CL.token}`,
      },
      body: JSON.stringify({ to_user: username }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not send request.');
      btn.disabled    = false;
      btn.textContent = '+ Add';
      return;
    }
    btn.textContent = '⏳ Pending';
    showToast(`📨 Request sent to ${username}!`);
  } catch {
    showToast('❌ Failed to send request.');
    btn.disabled    = false;
    btn.textContent = '+ Add';
  }
}

function removeCompetitor(username) {
  CL.competitors = CL.competitors.filter(c => c.username !== username);
  renderMyCompetitors();
  renderCompetitorAvatars();
  showToast(`${username} removed.`);
}

function renderMyCompetitors() {
  const el = document.getElementById('my-competitors-list');
  if (!CL.competitors.length) {
    el.innerHTML = '<div class="comp-empty">No competitors added yet</div>';
    return;
  }
  el.innerHTML = CL.competitors.map(c => `
    <div class="comp-result-item">
      <div class="comp-result-info">
        <div class="comp-avatar">${c.username[0].toUpperCase()}</div>
        <span class="comp-name">${c.username}</span>
      </div>
      <button class="comp-add-btn"
        style="border-color:rgba(255,77,109,0.3);color:var(--danger);background:rgba(255,77,109,0.07);"
        onclick="removeCompetitor('${c.username}')">
        Remove
      </button>
    </div>`).join('');
}

function renderCompetitorAvatars() {
  const el = document.getElementById('competitors-list');
  if (!el || !CL.competitors.length) {
    if (el) el.innerHTML = '';
    return;
  }
  el.innerHTML = CL.competitors.slice(0, 5).map(c => `
    <div class="comp-pill-avatar" title="${c.username}">
      ${c.username[0].toUpperCase()}
    </div>`).join('');
}