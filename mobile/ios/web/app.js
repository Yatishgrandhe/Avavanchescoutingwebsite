(function () {
  'use strict';

  const CONFIG = {
    supabaseUrl: 'https://ylzahxkfmklwcgkogeff.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE',
    apiBase: 'https://avalanchescouting.vercel.app'
  };

  const appEl = document.getElementById('app');
  const navEl = document.getElementById('nav');
  if (!appEl || !navEl) return;

  function createStubClient() {
    const empty = () => Promise.resolve({ data: [] });
    const emptySingle = () => Promise.resolve({ data: null });
    const fromStub = () => ({
      select: () => ({
        order: () => ({ limit: () => empty(), then: (cb) => empty().then(cb) }),
        eq: () => ({ single: () => emptySingle(), order: () => empty() }),
        in: () => empty()
      }),
      insert: () => Promise.reject(new Error('Sign in on the web for full access'))
    });
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        signOut: () => Promise.resolve(),
        signInWithOAuth: () => Promise.resolve(),
        onAuthStateChange: () => { }
      },
      from: fromStub
    };
  }

  let staticMode = false;
  const supabase = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
    ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
    : (staticMode = true, createStubClient());

  let currentSession = null;
  let verifyingGuild = false;

  function getRedirectUrl() {
    if (window.location.protocol === 'file:') {
      return 'avalanche-scouting://login-callback';
    }
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/?$/, '') || '';
    return origin + path + (path ? '/' : '') + (path.indexOf('index.html') !== -1 ? '' : 'index.html') + '#/dashboard';
  }

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async function verifyGuildMembership(session) {
    const providerToken = session?.provider_token || session?.providerToken;
    if (!providerToken) return true;
    try {
      const res = await fetch(CONFIG.apiBase + '/api/verify-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ providerToken })
      });
      const data = await res.json().catch(() => ({}));
      return data.inGuild === true;
    } catch (e) {
      return false;
    }
  }

  function showNav(show) {
    navEl.classList.toggle('nav-hidden', !show);
  }

  function setNavActive(route) {
    navEl.querySelectorAll('a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === route);
    });
  }

  function renderNav() {
    navEl.innerHTML = `
      <a href="#/dashboard">Home</a>
      <a href="#/scout">Scout</a>
      <a href="#/analysis">Analysis</a>
      <a href="#/pit-scouting">Pit</a>
      <a href="#/pit-data">Pit Data</a>
      <a href="#/pick-list">Pick List</a>
      <a href="#/past-competitions">Past</a>
      <a href="#/learn-game">Learn</a>
    `;
  }

  function html(el, content) {
    if (typeof content === 'string') el.innerHTML = content;
    else if (content != null) el.replaceChildren(content);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function logo(cls = 'logo') {
    return '<img src="image.png" alt="Avalanche" class="' + cls + '" />';
  }

  async function route() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const [path, ...rest] = hash.split('/').filter(Boolean);
    const param = rest[0];

    currentSession = await getSession();

    if (!currentSession && path !== 'login' && path !== 'auth-error') {
      window.location.hash = '#/login';
      renderLogin();
      showNav(false);
      return;
    }

    if (currentSession && path === 'login') {
      if (verifyingGuild) {
        appEl.innerHTML = '<div class="loading">Verifying Avalanche membership…</div>';
        showNav(false);
        return;
      }
      const isValid = await verifyGuildMembership(currentSession);
      if (!isValid) {
        await supabase.auth.signOut();
        window.location.hash = '#/auth-error';
        renderAuthError('You\'re not in the Avalanche server. Access denied.');
        showNav(false);
        return;
      }
      window.location.hash = '#/dashboard';
    }

    showNav(!!currentSession);
    renderNav();

    switch (path) {
      case 'login':
        renderLogin();
        break;
      case 'auth-error':
        renderAuthError();
        break;
      case 'dashboard':
        setNavActive('#/dashboard');
        await renderDashboard();
        break;
      case 'scout':
        setNavActive('#/scout');
        await renderScout();
        break;
      case 'analysis':
        setNavActive('#/analysis');
        await renderAnalysis();
        break;
      case 'team':
        await renderTeamDetail(param);
        break;
      case 'pit-scouting':
        setNavActive('#/pit-scouting');
        await renderPitScouting();
        break;
      case 'pit-data':
        setNavActive('#/pit-data');
        await renderPitData();
        break;
      case 'pit-detail':
        await renderPitDetail(param);
        break;
      case 'pick-list':
        setNavActive('#/pick-list');
        await renderPickList();
        break;
      case 'past-competitions':
        setNavActive('#/past-competitions');
        await renderPastCompetitions();
        break;
      case 'past-detail':
        await renderPastDetail(param);
        break;
      case 'learn-game':
        setNavActive('#/learn-game');
        renderLearnGame();
        break;
      case 'team-history':
        await renderTeamHistory(param);
        break;
      default:
        await renderDashboard();
    }
  }

  function renderLogin() {
    appEl.innerHTML = `
      <div class="bg-gradient" aria-hidden="true"></div>
      <header class="app-header">
        <div class="logo-wrap flex items-center gap-2">
          <img src="image.png" alt="Avalanche" class="logo-sm" />
          <span class="brand">Avalanche Scouting</span>
        </div>
        <span class="badge-text">FRC 2026 Rebuilt</span>
      </header>
      <div class="relative z-10 w-full max-w-md mx-auto px-4 pt-24 pb-8">
        <div class="glass-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <div class="p-8 pb-6 text-center space-y-4">
            <div class="flex justify-center mb-4">
              ${logo('logo-xl')}
            </div>
            <h1 class="text-3xl font-heading font-bold text-foreground" style="color:var(--foreground);">Welcome Back</h1>
            <p class="text-muted-foreground text-sm max-w-xs mx-auto" style="color:var(--muted-foreground);">Sign in to access the Avalanche Scouting platform and real-time data analysis.</p>
          </div>
          <div class="px-8 pb-8 space-y-6">
            ${staticMode ? '<div class="card mb-2" style="border-color:rgba(249,115,22,0.3);"><p class="card-desc mb-0">You can browse all pages here. Sign in on the web for live data and Discord login.</p></div>' : ''}
            <button class="btn btn-discord btn-block" id="btn-discord">${staticMode ? 'Open web app to sign in' : 'Continue with Discord'}</button>
            <div class="feature-grid">
              <div class="feature-pill"><span>Analytics</span></div>
              <div class="feature-pill"><span>Secure</span></div>
              <div class="feature-pill"><span>Real-time</span></div>
              <div class="feature-pill"><span>Reefscape</span></div>
            </div>
          </div>
          <div id="login-status"></div>
        </div>
        <p class="text-center text-xs mt-8" style="color:var(--muted-foreground);">Authorized personnel only. Contact admin for access.</p>
      </div>
    `;
    document.getElementById('btn-discord').onclick = async () => {
      if (staticMode) {
        window.open(CONFIG.apiBase + '/auth/signin', '_blank');
        return;
      }
      const statusEl = document.getElementById('login-status');
      if (statusEl) statusEl.innerHTML = '<div class="success-msg">Redirecting to Discord...</div>';
      verifyingGuild = true;
      try {
        const { data } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: { redirectTo: getRedirectUrl(), scopes: 'identify guilds' }
        });
        if (data && data.url) window.location.href = data.url;
      } catch (e) {
        verifyingGuild = false;
        if (statusEl) statusEl.innerHTML = '<div class="error-msg">' + escapeHtml(e.message || 'Unknown error') + '</div>';
      }
    };
  }

  function renderAuthError(message) {
    const q = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const msg = message || q.get('message') || 'An unexpected error occurred during the sign-in process.';
    const err = q.get('error') || '';
    const msgLower = (msg || '').toLowerCase();
    const isGuildError = msgLower.includes('avalanche server') || msgLower.includes('not allowed') || msgLower.includes('guild') || msgLower.includes('server membership');
    const title = isGuildError ? 'Access Denied' : 'Authentication Error';
    const suggestions = isGuildError
      ? ['You must be a member of the Avalanche Discord server to access this platform', 'Join the Avalanche Discord server and try signing in again', 'Contact an administrator if you believe you should have access']
      : ['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists'];
    appEl.innerHTML = `
      <div class="bg-gradient" aria-hidden="true"></div>
      <div class="relative z-10 w-full max-w-lg mx-auto px-4 py-8">
        <div class="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div class="p-8 pb-0 flex flex-col items-center">
            <div class="error-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h1 class="text-3xl font-bold font-heading text-center mb-2" style="color:var(--foreground);">${escapeHtml(title)}</h1>
            <p class="text-muted-foreground text-center text-lg max-w-sm mx-auto leading-relaxed px-4" style="color:var(--muted-foreground);">${escapeHtml(msg)}</p>
          </div>
          <div class="p-6 md:p-8 space-y-6">
            <div class="card" style="background:rgba(15,23,42,0.5);border:1px solid rgba(255,255,255,0.05);">
              <div class="flex items-center gap-2 mb-1">
                <span class="success-msg" style="margin:0;padding:0;background:0;border:0;color:hsl(142,76%,36%);">Admin team has been notified</span>
              </div>
              <p class="card-desc mb-0" style="font-size:0.75rem;padding-left:0;">Our system automatically logs these errors for review.</p>
            </div>
            ${err ? '<div class="card" style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.1);"><span class="card-desc" style="color:hsl(0,84%,60%);font-size:0.875rem;">Error Code: <code>' + escapeHtml(err) + '</code></span></div>' : ''}
            <div>
              <h3 class="card-title mb-2" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;">Troubleshooting Steps</h3>
              <ul class="troubleshoot-list">
                ${suggestions.map(s => '<li>' + escapeHtml(s) + '</li>').join('')}
              </ul>
            </div>
            <div class="flex flex-col gap-3 pt-2">
              <a href="#/login" class="btn btn-destructive btn-block">Try Signing In Again</a>
              <div class="flex gap-3" style="display:flex;gap:12px;">
                <a href="#/dashboard" class="btn btn-ghost btn-block">Go Home</a>
                <button type="button" class="btn btn-ghost btn-block" onclick="location.reload()">Refresh</button>
              </div>
            </div>
            <p class="text-center text-xs" style="color:var(--muted-foreground);">Contact Support Team</p>
          </div>
        </div>
        <div class="text-center mt-8 opacity-50">${logo('logo-sm')}</div>
      </div>
    `;
  }

  async function renderDashboard() {
    appEl.innerHTML = '<div class="loading">Loading dashboard…</div>';
    let teams = [], matches = [], scouting = [], activity = [];
    try {
      const [t, m, s, a] = await Promise.all([
        supabase.from('teams').select('team_number,team_name').order('team_number'),
        supabase.from('matches').select('match_id'),
        supabase.from('scouting_data').select('match_id').order('created_at', { ascending: false }).limit(100),
        supabase.from('scouting_data').select('id,team_number,match_id,created_at,matches(match_number,event_key),teams(team_name)').order('created_at', { ascending: false }).limit(5)
      ]);
      teams = t.data || [];
      matches = m.data || [];
      scouting = s.data || [];
      activity = a.data || [];
    } catch (e) {
      console.error(e);
    }
    const totalMatches = matches.length;
    const uniqueWithData = new Set(scouting.map(x => x.match_id)).size;
    const successRate = totalMatches > 0 ? Math.round(uniqueWithData / totalMatches * 100) : 0;
    const userName = (currentSession && currentSession.user && (currentSession.user.user_metadata?.full_name || currentSession.user.email || 'Scout').split(' ')[0]) || 'Scout';
    const activityHtml = activity.length
      ? activity.map(row => `
        <a href="#/team/${row.team_number}" class="activity-item" style="text-decoration:none;color:inherit;">
          <div class="activity-icon">✓</div>
          <div class="activity-body">
            <strong>Match ${row.matches?.match_number ?? row.match_id} Scouted</strong>
            <div class="card-desc">Team ${row.team_number} • ${row.teams?.team_name ?? 'Avalanche'}</div>
          </div>
        </a>
      `).join('')
      : '<div class="empty-state"><p class="mb-0">No recent activity</p></div>';
    const statsOverviewHtml = `
      <div class="flex justify-between mb-2"><span class="card-desc">Total Matches</span><span class="card-title" style="margin:0;font-size:0.875rem;">${totalMatches}</span></div>
      <div class="flex justify-between mb-2"><span class="card-desc">Teams Tracked</span><span class="card-title" style="margin:0;font-size:0.875rem;">${teams.length}</span></div>
      <div class="flex justify-between mb-2"><span class="card-desc">Data Points</span><span class="card-title" style="margin:0;font-size:0.875rem;">${scouting.length}</span></div>
      <div class="flex justify-between mt-2 pt-2" style="border-top:1px solid var(--border);"><span class="card-title" style="margin:0;font-size:0.875rem;">Success Rate</span><span class="badge ${successRate > 80 ? 'badge-online' : ''}">${successRate}%</span></div>
    `;
    appEl.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 class="page-title" style="font-size:1.875rem;">Dashboard</h1>
              <p class="page-subtitle mb-0">Welcome back, ${escapeHtml(userName)}. Ready for the competition?</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-ghost" id="btn-refresh" style="padding:8px 14px;font-size:0.875rem;">Refresh Data</button>
              <span class="badge badge-online">System Online</span>
            </div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Matches</div>
            <div class="stat-value">${totalMatches}</div>
            <p class="card-desc mb-0" style="font-size:0.75rem;">Matches scouted</p>
          </div>
          <div class="stat-card">
            <div class="stat-label">Teams Tracked</div>
            <div class="stat-value">${teams.length}</div>
            <p class="card-desc mb-0" style="font-size:0.75rem;">Active teams</p>
          </div>
          <div class="stat-card">
            <div class="stat-label">Data Points</div>
            <div class="stat-value">${scouting.length}</div>
            <p class="card-desc mb-0" style="font-size:0.75rem;">Data collected</p>
          </div>
          <div class="stat-card">
            <div class="stat-label">Success Rate</div>
            <div class="stat-value">${successRate}%</div>
            <p class="card-desc mb-0" style="font-size:0.75rem;">Completion rate</p>
          </div>
        </div>
        <div>
          <h2 class="card-title mb-2">Quick Actions</h2>
          <div class="quick-actions">
            <a href="#/scout" class="quick-action-card"><div class="card-title">Start Scouting</div><p class="card-desc mb-0">Collect match data</p></a>
            <a href="#/pit-scouting" class="quick-action-card"><div class="card-title">Pit Scouting</div><p class="card-desc mb-0">Robot analysis</p></a>
            <a href="#/analysis" class="quick-action-card"><div class="card-title">Data Analysis</div><p class="card-desc mb-0">View reports</p></a>
            <a href="#/analysis" class="quick-action-card"><div class="card-title">Team Comparison</div><p class="card-desc mb-0">Compare stats</p></a>
          </div>
        </div>
        <div class="card">
          <h2 class="card-title mb-1">Statistics Overview</h2>
          <p class="card-desc mb-2">Comprehensive view of scouting data</p>
          <div class="tabs"><a href="#" class="active">Overview</a><a href="#">Statistics</a><a href="#">Insights</a></div>
          <div class="mt-2">${statsOverviewHtml}</div>
        </div>
        <div class="card">
          <div class="flex justify-between items-center mb-2">
            <h2 class="card-title mb-0">Activity Feed</h2>
            <span class="badge">Latest</span>
          </div>
          <div>${activityHtml}</div>
        </div>
        <div class="text-center mt-4">
          <button class="btn btn-ghost" id="btn-logout">Logout</button>
        </div>
      </div>
    `;
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) refreshBtn.onclick = () => { renderDashboard(); };
    document.getElementById('btn-logout').onclick = async () => {
      await supabase.auth.signOut();
      window.location.hash = '#/login';
      route();
    };
  }

  async function renderScout() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let teams = [];
    try {
      const { data } = await supabase.from('teams').select('team_number,team_name').order('team_number');
      teams = data || [];
    } catch (e) { }
    const session = await getSession();
    const options = teams.map(t => `<option value="${t.team_number}">#${t.team_number} ${escapeHtml(t.team_name || '')}</option>`).join('');
    appEl.innerHTML = `
      <div class="mb-2">
        <h1 class="page-title">Match Scouting</h1>
        <p class="page-subtitle mb-0">Collect match data for analysis</p>
      </div>
      <form id="scout-form" class="card">
        <div class="form-group">
          <label>Team</label>
          <select id="team" required>${options}</select>
        </div>
        <div class="form-group">
          <label>Match ID</label>
          <input type="text" id="match_id" placeholder="e.g. 2024tx hou_qm1" required />
        </div>
        <div class="form-group">
          <label>Alliance</label>
          <select id="alliance"><option value="red">Red</option><option value="blue">Blue</option></select>
        </div>
        <div class="form-group">
          <label>Autonomous pts</label>
          <input type="number" id="auto" value="0" min="0" />
        </div>
        <div class="form-group">
          <label>Teleop pts</label>
          <input type="number" id="teleop" value="0" min="0" />
        </div>
        <div class="form-group">
          <label>Endgame pts</label>
          <input type="number" id="endgame" value="0" min="0" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="notes" rows="3" placeholder="Optional"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Submit</button>
        <div id="scout-error" class="error-msg" style="display:none;"></div>
      </form>
    `;
    const form = document.getElementById('scout-form');
    const errEl = document.getElementById('scout-error');
    form.onsubmit = async (e) => {
      e.preventDefault();
      errEl.style.display = 'none';
      const team = parseInt(document.getElementById('team').value, 10);
      const match_id = document.getElementById('match_id').value.trim();
      const alliance = document.getElementById('alliance').value;
      const auto = parseInt(document.getElementById('auto').value, 10) || 0;
      const teleop = parseInt(document.getElementById('teleop').value, 10) || 0;
      const endgame = parseInt(document.getElementById('endgame').value, 10) || 0;
      const notes = document.getElementById('notes').value.trim() || '{}';
      if (!session) { errEl.textContent = 'Not signed in.'; errEl.style.display = 'block'; return; }
      try {
        await supabase.from('scouting_data').insert({
          scout_id: session.user.id,
          team_number: team,
          match_id,
          alliance_color: alliance,
          autonomous_points: auto,
          teleop_points: teleop,
          final_score: auto + teleop + endgame,
          notes
        });
        alert('Submitted!');
        form.reset();
      } catch (err) {
        errEl.textContent = err.message || 'Submit failed';
        errEl.style.display = 'block';
      }
    };
  }

  async function renderAnalysis() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let teams = [], data = [];
    try {
      const [t, d] = await Promise.all([
        supabase.from('teams').select('*').order('team_number'),
        supabase.from('scouting_data').select('*').order('created_at', { ascending: false })
      ]);
      teams = t.data || [];
      data = d.data || [];
    } catch (e) { }
    const byTeam = {};
    data.forEach(row => {
      const n = row.team_number;
      if (!byTeam[n]) byTeam[n] = [];
      byTeam[n].push(row);
    });
    const search = document.createElement('input');
    search.placeholder = 'Search team or match…';
    search.className = 'mb-2';
    search.style.width = '100%';
    let searchVal = '';
    search.oninput = () => { searchVal = search.value.toLowerCase(); renderAnalysisContent(); };
    function renderAnalysisContent() {
      const filtered = searchVal
        ? data.filter(r => String(r.team_number).includes(searchVal) || (r.match_id || '').toLowerCase().includes(searchVal))
        : data;
      const teamStats = teams.map(team => {
        const entries = byTeam[team.team_number] || [];
        if (!entries.length) return null;
        const avgAuto = entries.reduce((s, e) => s + (e.autonomous_points || 0), 0) / entries.length;
        const avgTeleop = entries.reduce((s, e) => s + (e.teleop_points || 0), 0) / entries.length;
        const avgFinal = entries.reduce((s, e) => s + (e.final_score || 0), 0) / entries.length;
        return { team, count: entries.length, avgAuto, avgTeleop, avgFinal };
      }).filter(Boolean);
      const dataRows = filtered.slice(0, 50).map(r => `
        <div class="link-row">
          <div>
            <strong>#${r.team_number}</strong> ${escapeHtml(r.match_id || '')} – ${r.final_score ?? 0} pts
            <div class="card-desc">A: ${r.autonomous_points ?? 0} T: ${r.teleop_points ?? 0}</div>
          </div>
          <a href="#/team/${r.team_number}" class="chevron">›</a>
        </div>
      `).join('');
      content.innerHTML = `
        <div class="tabs">
          <a href="#/analysis" class="active">Teams</a>
          <a href="#" onclick="document.getElementById('analysis-data').style.display='block';document.getElementById('analysis-teams').style.display='none';return false;">Data</a>
        </div>
        <div id="analysis-teams">
          <h2 class="card-title mb-1">Team stats</h2>
          ${teamStats.map(s => `
            <a href="#/team/${s.team.team_number}" class="card link-row" style="display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:inherit;">
              <div>
                <strong>#${s.team.team_number}</strong> ${escapeHtml(s.team.team_name || '')}
                <div class="card-desc">${s.count} matches · Avg ${Math.round(s.avgFinal)} pts</div>
              </div>
              <span class="chevron">›</span>
            </a>
          `).join('')}
        </div>
        <div id="analysis-data" style="display:none;">
          <h2 class="card-title mb-1">Scouting data</h2>
          <div class="card">${dataRows}</div>
        </div>
      `;
    }
    const content = document.createElement('div');
    appEl.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'mb-2';
    header.innerHTML = '<h1 class="page-title">Analysis</h1><p class="page-subtitle mb-0">Team stats and scouting data</p>';
    appEl.appendChild(header);
    appEl.appendChild(search);
    appEl.appendChild(content);
    renderAnalysisContent();
  }

  async function renderTeamDetail(teamNumber) {
    if (!teamNumber) { route(); return; }
    appEl.innerHTML = '<div class="loading">Loading team…</div>';
    let team = null, history = [];
    try {
      const [t, h] = await Promise.all([
        supabase.from('teams').select('*').eq('team_number', teamNumber).single(),
        supabase.from('scouting_data').select('*').eq('team_number', teamNumber).order('created_at', { ascending: false })
      ]);
      team = t.data;
      history = h.data || [];
    } catch (e) { }
    if (!team) {
      appEl.innerHTML = '<p class="error-msg">Team not found.</p><a href="#/dashboard" class="btn btn-ghost">Back</a>';
      return;
    }
    const rows = history.map(m => `
      <div class="link-row">
        <span><strong>${escapeHtml(m.match_id || '')}</strong> – ${m.final_score ?? 0} PTS</span>
      </div>
    `).join('');
    appEl.innerHTML = `
      <a href="#/dashboard" class="btn btn-ghost mb-2">← Back</a>
      <h1 class="page-title">#${team.team_number} ${escapeHtml(team.team_name || '')}</h1>
      <div class="card mb-2">
        <h2 class="card-title">Match history</h2>
        ${rows || '<p class="empty-state">No matches</p>'}
      </div>
      <a href="#/team-history/${teamNumber}" class="btn btn-ghost btn-block">Past competitions & history</a>
    `;
  }

  async function renderTeamHistory(teamNumber) {
    if (!teamNumber) { route(); return; }
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let pastTeams = [], comps = [];
    try {
      const { data: pt } = await supabase.from('past_teams').select('*').eq('team_number', teamNumber);
      pastTeams = pt || [];
      if (pastTeams.length) {
        const ids = [...new Set(pastTeams.map(p => p.past_competition_id).filter(Boolean))];
        if (ids.length) {
          const { data: c } = await supabase.from('past_competitions').select('*').in('id', ids);
          comps = c || [];
        }
      }
    } catch (e) { }
    const list = comps.map(c => `
      <div class="card">
        <strong>${escapeHtml(c.competition_name || c.competition_key || c.id || '')}</strong>
        <div class="card-desc">${c.competition_year || ''} ${escapeHtml(c.competition_location || '')}</div>
      </div>
    `).join('');
    appEl.innerHTML = `
      <a href="#/team/${teamNumber}" class="btn btn-ghost mb-2">← Back</a>
      <h1 class="page-title">Team #${teamNumber} history</h1>
      ${list || '<p class="empty-state">No past competitions</p>'}
    `;
  }

  async function renderPitScouting() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let teams = [];
    try {
      const { data } = await supabase.from('teams').select('team_number,team_name').order('team_number');
      teams = data || [];
    } catch (e) { }
    const options = teams.map(t => `<option value="${t.team_number}">#${t.team_number} ${escapeHtml(t.team_name || '')}</option>`).join('');
    appEl.innerHTML = `
      <div class="mb-2">
        <h1 class="page-title">Pit Scouting</h1>
        <p class="page-subtitle mb-0">Robot analysis and data</p>
      </div>
      <form id="pit-form" class="card">
        <div class="form-group">
          <label>Team</label>
          <select id="pit-team" required>${options}</select>
        </div>
        <div class="form-group">
          <label>Robot name</label>
          <input type="text" id="robot_name" placeholder="Optional" />
        </div>
        <div class="form-group">
          <label>Drive type</label>
          <input type="text" id="drive_type" placeholder="e.g. Swerve" />
        </div>
        <div class="form-group">
          <label>Robot image</label>
          <input type="file" id="robot_image" accept="image/*" capture="environment" />
          <small class="card-desc">Upload to server (Google Drive / Supabase backup). Max 10MB.</small>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="pit_notes" rows="3"></textarea>
        </div>
        <button type="button" class="btn btn-accent btn-block mb-1" id="pit-upload-btn">Upload image</button>
        <button type="submit" class="btn btn-primary btn-block">Save pit data</button>
        <div id="pit-error" class="error-msg" style="display:none;"></div>
      </form>
    `;
    let robotImageUrl = null;
    const session = await getSession();
    document.getElementById('pit-upload-btn').onclick = async () => {
      const file = document.getElementById('robot_image').files[0];
      if (!file) { alert('Select an image first.'); return; }
      const teamNum = document.getElementById('pit-team').value;
      const teamName = teams.find(t => String(t.team_number) === teamNum)?.team_name || 'Team ' + teamNum;
      const fd = new FormData();
      fd.append('image', file);
      fd.append('teamNumber', teamNum);
      fd.append('teamName', teamName);
      const errEl = document.getElementById('pit-error');
      errEl.style.display = 'none';
      try {
        const res = await fetch(CONFIG.apiBase + '/api/upload-robot-image', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.directViewUrl) {
          robotImageUrl = json.directViewUrl;
          alert('Image uploaded.');
        } else {
          errEl.textContent = json.error || 'Upload failed';
          errEl.style.display = 'block';
        }
      } catch (e) {
        errEl.textContent = e.message || 'Upload failed';
        errEl.style.display = 'block';
      }
    };
    document.getElementById('pit-form').onsubmit = async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('pit-error');
      errEl.style.display = 'none';
      const team_number = parseInt(document.getElementById('pit-team').value, 10);
      const robot_name = document.getElementById('robot_name').value.trim() || null;
      const drive_type = document.getElementById('drive_type').value.trim() || null;
      const notes = document.getElementById('pit_notes').value.trim() || null;
      if (!session) { errEl.textContent = 'Not signed in.'; errEl.style.display = 'block'; return; }
      try {
        await supabase.from('pit_scouting_data').insert({
          team_number,
          robot_name,
          drive_type,
          notes,
          robot_image_url: robotImageUrl,
          photos: robotImageUrl ? [robotImageUrl] : []
        });
        alert('Saved.');
        robotImageUrl = null;
        document.getElementById('robot_image').value = '';
      } catch (err) {
        errEl.textContent = err.message || 'Save failed';
        errEl.style.display = 'block';
      }
    };
  }

  async function renderPitData() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let list = [];
    try {
      const { data } = await supabase.from('pit_scouting_data').select('*').order('created_at', { ascending: false });
      list = data || [];
    } catch (e) { }
    const rows = list.map(r => `
      <a href="#/pit-detail/${encodeURIComponent(r.id || '')}" class="link-row flex items-center gap-2">
        ${r.robot_image_url
        ? '<img src="' + escapeHtml(r.robot_image_url) + '" alt="" class="thumb" onerror="this.style.display=\'none\'" />'
        : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.75rem;">No image</div>'}
        <div>
          <strong>#${r.team_number}</strong> ${escapeHtml(r.robot_name || '—')}
          <div class="card-desc">${escapeHtml(r.drive_type || '')}</div>
        </div>
        <span class="chevron">›</span>
      </a>
    `).join('');
    appEl.innerHTML = `
      <h1 class="page-title">Pit Scouting Data</h1>
      <div class="card">${rows || '<p class="empty-state">No pit data yet</p>'}</div>
    `;
  }

  async function renderPitDetail(id) {
    if (!id) { route(); return; }
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    let record = null;
    try {
      const { data } = await supabase.from('pit_scouting_data').select('*').eq('id', decodeURIComponent(id)).single();
      record = data;
    } catch (e) { }
    if (!record) {
      appEl.innerHTML = '<p class="error-msg">Not found.</p><a href="#/pit-data" class="btn btn-ghost">Back</a>';
      return;
    }
    const img = record.robot_image_url
      ? '<img src="' + escapeHtml(record.robot_image_url) + '" alt="Robot" class="thumb-lg mb-2" onerror="this.parentElement.innerHTML=\'<p class=error-msg>Failed to load image</p>\'" />'
      : '<p class="empty-state">No robot image available</p>';
    appEl.innerHTML = `
      <a href="#/pit-data" class="btn btn-ghost mb-2">← Back</a>
      <h1 class="page-title">Pit detail</h1>
      <div class="card">
        ${img}
        <p><span class="card-desc">Team</span> #${record.team_number}</p>
        <p><span class="card-desc">Robot name</span> ${escapeHtml(record.robot_name || '—')}</p>
        <p><span class="card-desc">Drive type</span> ${escapeHtml(record.drive_type || '—')}</p>
        ${record.notes ? '<p><span class="card-desc">Notes</span> ' + escapeHtml(record.notes) + '</p>' : ''}
      </div>
    `;
  }

  async function renderPickList() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    const session = await getSession();
    if (!session) { appEl.innerHTML = '<p class="error-msg">Sign in required.</p>'; return; }
    let list = [];
    try {
      const res = await fetch(CONFIG.apiBase + '/api/pick-lists', {
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      });
      const json = await res.json();
      list = json.pickLists || json || [];
    } catch (e) { }
    const rows = list.map(pl => `
      <div class="link-row">
        <span><strong>${escapeHtml(pl.name || 'Unnamed')}</strong> ${escapeHtml(pl.event_key || '')}</span>
      </div>
    `).join('');
    appEl.innerHTML = `
      <div class="mb-2">
        <h1 class="page-title">Pick List</h1>
        <p class="page-subtitle mb-0">Admin pick lists</p>
      </div>
      <div class="card">${rows || '<p class="empty-state">No pick lists</p>'}</div>
    `;
  }

  async function renderPastCompetitions() {
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    const session = await getSession();
    if (!session) { appEl.innerHTML = '<p class="error-msg">Sign in required.</p>'; return; }
    let list = [];
    try {
      const res = await fetch(CONFIG.apiBase + '/api/past-competitions', {
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      });
      const json = await res.json();
      list = json.competitions || json || [];
    } catch (e) { }
    const rows = list.map(c => `
      <a href="#/past-detail/${encodeURIComponent(c.id)}" class="link-row">
        <span><strong>${escapeHtml(c.competition_name || 'Unnamed')}</strong> ${c.competition_year || ''}</span>
        <span class="chevron">›</span>
      </a>
    `).join('');
    appEl.innerHTML = `
      <div class="mb-2">
        <h1 class="page-title">Past Competitions</h1>
        <p class="page-subtitle mb-0">Competition history</p>
      </div>
      <div class="card">${rows || '<p class="empty-state">No past competitions</p>'}</div>
    `;
  }

  async function renderPastDetail(id) {
    if (!id) { route(); return; }
    appEl.innerHTML = '<div class="loading">Loading…</div>';
    const session = await getSession();
    let detail = null;
    try {
      const res = await fetch(CONFIG.apiBase + '/api/past-competitions?id=' + encodeURIComponent(decodeURIComponent(id)), {
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      });
      detail = await res.json();
    } catch (e) { }
    const c = detail?.competition || detail;
    const teams = detail?.teams?.length ?? 0;
    const matches = detail?.matches?.length ?? 0;
    appEl.innerHTML = `
      <a href="#/past-competitions" class="btn btn-ghost mb-2">← Back</a>
      <h1 class="page-title">${escapeHtml(c?.competition_name || 'Competition')}</h1>
      <div class="card">
        <p><span class="card-desc">Year</span> ${c?.competition_year || '—'}</p>
        <p><span class="card-desc">Teams</span> ${teams}</p>
        <p><span class="card-desc">Matches</span> ${matches}</p>
      </div>
    `;
  }

  function renderLearnGame() {
    const sections = [
      {
        id: 'overview', title: 'Game Overview', content: 'FIRST Robotics Competition: REBUILT presented by Haas is the 2026 FRC game. Teams compete in alliances of three robots each, working together to score points by placing FUEL in HUBs and climbing the TOWER.', subs: [
          { title: 'Match Duration', content: 'Each match consists of an Autonomous Period (first 20 seconds) followed by a Teleoperated Period (last 2:20, especially the last 0:30 Endgame).' },
          { title: 'Competition Format', content: 'Teams compete in alliances of three robots each, working together to score points and defeat their opponents. The alliance with the highest score wins the match.' }
        ]
      },
      {
        id: 'scoring', title: 'Scoring (Points Only)', content: 'Scoring in REBUILT 2026 is based on FUEL placement and TOWER climbing. Understanding the scoring system is crucial for effective strategy.', subs: [
          { title: 'FUEL Scoring', content: 'FUEL in active HUB (AUTO or TELEOP): 1 point per FUEL scored. FUEL in inactive HUB: 0 points. During Endgame (last 30 seconds), both HUBs are active, so every FUEL correctly scored = 1 point.' },
          { title: 'AUTO TOWER (First 20 seconds)', content: 'LEVEL 1 climb per ROBOT: 15 points. Robots must be fully supported by the lowest rung to earn these points.' },
          { title: 'TELEOP/END GAME TOWER', content: 'LEVEL 2 climb per ROBOT: 20 points (BUMPERS completely above LOW RUNG). LEVEL 3 climb per ROBOT: 30 points (BUMPERS completely above MID RUNG). Each ROBOT earns points for only one LEVEL in TELEOP/END GAME.' },
          { title: 'Evaluation Timing', content: 'TOWER points are evaluated about 3 seconds after the match ends or when all robots have come to rest.' }
        ]
      },
      {
        id: 'autonomous', title: 'Autonomous Period (First 20 seconds)', content: 'During the Autonomous period, robots operate using pre-programmed code. All scoring during this period sets the stage for the rest of the match.', subs: [
          { title: 'Autonomous Objectives', content: 'Robots can score FUEL in the active HUB (1 point per FUEL) and attempt TOWER LEVEL 1 climbs (15 points per robot). The Alliance with more FUEL scored in Auto determines which goal becomes inactive during Shifts 2 and 4 in Teleop.' },
          { title: 'Auto Shift Advantage', content: 'The Alliance with more FUEL scored in Auto determines which goal becomes inactive during Shifts 2 and 4 in Teleop. This strategic advantage can significantly impact match outcomes.' }
        ]
      },
      {
        id: 'teleop', title: 'Teleoperated Period (Last 2:20)', content: 'During the Teleoperated period, drivers take control. Scoring shifts focus to cycle efficiency and navigating field obstacles.', subs: [
          { title: 'FUEL Scoring', content: 'FUEL in active HUB: 1 point per FUEL scored. FUEL in inactive HUB: 0 points. The active/inactive status is determined by Auto performance.' },
          { title: 'TOWER Climbing', content: 'Robots can climb the TOWER during Teleop, earning 20 points for LEVEL 2 (BUMPERS above LOW RUNG) or 30 points for LEVEL 3 (BUMPERS above MID RUNG). Only the highest level achieved counts per robot.' },
          { title: 'The "Shift" Mechanic', content: 'Transition Shift: the initial segment of Teleop. Alliance Shifts: periodically, goals may become inactive. Refer to the FMS Game Data (\'R\' or \'B\') to identify which goal to target.' }
        ]
      },
      {
        id: 'endgame', title: 'Endgame Period (Last 30 seconds: 0:30-0:00)', content: 'The Endgame focuses on the TOWER. During Endgame, both HUBs are active.', subs: [
          { title: 'Endgame FUEL Scoring', content: 'During Endgame (0:30-0:00), both HUBs are active, so every FUEL correctly scored = 1 point. This creates a high-scoring opportunity in the final moments of the match.' },
          { title: 'Endgame TOWER Climbing', content: 'Robots may score TELEOP TOWER climbs during Endgame: LEVEL 2 = 20 points per ROBOT, LEVEL 3 = 30 points per ROBOT. These TOWER points contribute both to your match score and toward the TRAVERSAL ranking point threshold (50+ TOWER points at regionals).' },
          { title: 'Match Deciders', content: 'Endgame performance often determines match winners, as the combination of active HUBs and TOWER climbing opportunities can significantly change the score in the final moments.' }
        ]
      },
      {
        id: 'strategy', title: 'Strategy & Tactics', content: 'Successful REBUILT 2026 teams combine technical excellence with strategic thinking, developing game plans that maximize FUEL scoring and TOWER climbing while managing active/inactive HUB status.', subs: [
          { title: 'Active vs Inactive HUB Strategy', content: 'Understanding which HUB is active during different periods is crucial. The Alliance with more FUEL in Auto determines inactive HUBs during Shifts 2 and 4, making Auto performance strategically important.' },
          { title: 'TOWER Climbing Strategy', content: 'TOWER points are evaluated 3 seconds after match end, so robots must maintain their position. Each robot earns points for only one LEVEL, so teams must decide whether to attempt LEVEL 2 or LEVEL 3 based on robot capabilities.' },
          { title: 'Endgame Strategy', content: 'With both HUBs active during Endgame, teams should maximize FUEL scoring in the final 30 seconds. TOWER climbing during Endgame can provide both match points and ranking point opportunities.' }
        ]
      }
    ];
    const sectionHtml = sections.map(s => `
      <div class="card learn-section">
        <h2 class="card-title">${escapeHtml(s.title)}</h2>
        <p class="card-desc mb-2">${escapeHtml(s.content)}</p>
        ${(s.subs || []).map(sub => `
          <div class="learn-subsection">
            <h3 class="card-title" style="font-size:0.95rem;margin-top:12px;">${escapeHtml(sub.title)}</h3>
            <p class="card-desc mb-0">${escapeHtml(sub.content)}</p>
          </div>
        `).join('')}
      </div>
    `).join('');
    appEl.innerHTML = `
      <div class="text-center mb-2">${logo()}</div>
      <h1 class="page-title">REBUILT 2026 Game Rules</h1>
      <p class="page-subtitle">Comprehensive guide to FIRST Robotics Competition: REBUILT presented by Haas</p>
      <div class="card mb-3">
        <h2 class="card-title">Game Introduction Video</h2>
        <p class="card-desc mb-2">Watch this official REBUILT 2026 game animation to understand the basics</p>
        <div class="video-wrap">
          <iframe src="https://www.youtube.com/embed/_fybREErgyM" title="REBUILT 2026 Game Animation" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
      ${sectionHtml}
    `;
  }

  const validRoutes = ['login', 'dashboard', 'scout', 'analysis', 'team', 'pit-scouting', 'pit-data', 'pit-detail', 'pick-list', 'past-competitions', 'past-detail', 'learn-game', 'auth-error', 'team-history'];
  function hasValidRoute() {
    const hash = window.location.hash.slice(1) || '';
    const path = hash.split('/')[0].split('?')[0];
    return validRoutes.includes(path);
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      verifyingGuild = true;
      const ok = await verifyGuildMembership(session);
      verifyingGuild = false;
      if (!ok) {
        await supabase.auth.signOut();
        window.location.hash = '#/auth-error?message=' + encodeURIComponent('You\'re not in the Avalanche server. Access denied.');
        route();
        return;
      }
      if (!hasValidRoute()) window.location.hash = '#/dashboard';
    }
    currentSession = session;
    route();
  });

  window.addEventListener('hashchange', route);

  function bootstrap() {
    const h = window.location.hash;
    if (h === '' || h === '#' || h.startsWith('#access_token') || h.startsWith('#/access_token') || !hasValidRoute()) {
      window.location.hash = '#/dashboard';
    } else {
      route();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
