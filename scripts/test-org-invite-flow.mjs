// Exercise the actual auth/setup components with isolated hooks and provider responses.
// No network, cloud credentials, or production data access.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

let checks = 0;
const validInvite = { valid: true, invite_type: 'new_org', expires_at: '2099-01-01T00:00:00Z' };

function fixture({ token = 'invitation', preview = validInvite, previewStatus = 200, previewFailure = false, providerToken = null, query = {}, organizationId = 'default-avalanche', signedInDuringRestore = false, signedIn = true, profilePresent = true, routerReady = true, previews = {}, delayedTokens = [] } = {}) {
  const storage = new Map(token ? [['org_invite_token', token], ['org_invite_type', 'new_org']] : []);
  const requests = [], routes = [], states = [], refs = [], effects = [], pendingEffects = [], cleanups = [];
  const pendingPreviews = new Map();
  let cursor = 0, effectCursor = 0, refCursor = 0;
  let authListener = null, authLockHeld = false, profileReads = 0, authCallbackReturnedPromise = false;
  const session = signedIn ? { access_token: 'supabase-session', provider_token: providerToken, user: { id: 'invited-user' } } : null;
  const router = { isReady: routerReady, query, replace: route => routes.push(route), push: route => routes.push(route) };
  const supabase = {
    auth: {
      getSession: async () => {
        if (signedInDuringRestore) {
          authLockHeld = true;
          const callbackResult = authListener?.('SIGNED_IN', session);
          // Supabase holds its auth lock while invoking the callback. Record whether the
          // listener returns a promise, then release the lock as restore completes.
          authCallbackReturnedPromise = Boolean(callbackResult && typeof callbackResult.then === 'function');
          authLockHeld = false;
        }
        return { data: { session } };
      },
      onAuthStateChange: callback => { authListener = callback; return { data: { subscription: { unsubscribe() { authListener = null; } } } }; },
      signOut: async () => { throw new Error('Unexpected sign out'); },
    },
    from(table) {
      assert.equal(table, 'users', 'Invitations must be validated by the server, not a client table query');
      const result = { select() { return result; }, eq() { return result; }, maybeSingle: async () => {
        profileReads++;
        if (signedInDuringRestore && authLockHeld) await new Promise(resolve => {
          const poll = () => authLockHeld ? setTimeout(poll, 0) : resolve();
          poll();
        });
        return { data: profilePresent ? { organization_id: organizationId, banned: false } : null };
      } };
      return result;
    },
  };
  const createElement = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });
  const react = {
    createElement,
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useRef(initial) { const index = refCursor++; return refs[index] ||= { current: initial }; },
    useEffect(run, deps) {
      const index = effectCursor++;
      if (!effects[index] || !deps || deps.some((value, i) => value !== effects[index][i])) pendingEffects.push(() => {
        cleanups[index]?.(); cleanups[index] = run();
      });
      effects[index] = deps;
    },
  };
  const cache = new Map();
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.startsWith('/api/invite-preview?')) {
      if (previewFailure) throw new Error('Temporary connection failure');
      const requestedToken = new URL(url, 'https://example.test').searchParams.get('token');
      if (delayedTokens.includes(requestedToken)) await new Promise(resolve => pendingPreviews.set(requestedToken, resolve));
      return { ok: previewStatus >= 200 && previewStatus < 300, status: previewStatus, json: async () => previews[requestedToken] ?? preview };
    }
    if (url === '/api/organization/complete-new-org-setup' || url === '/api/organization/complete-join-invite') return { ok: true, json: async () => ({ ok: true }) };
    throw new Error(`Unexpected fetch ${url}`);
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
    const customRequire = name => {
      if (name === 'react') return react;
      if (name === 'next/router') return { useRouter: () => router };
      if (name === '@/lib/supabase') return { getSupabaseClient: () => supabase };
      if (name === '@/pages/_app') return { useSupabase: () => ({ user: session && profilePresent ? { id: session.user.id, organization_id: organizationId } : null, session, supabase, loading: false }) };
      if (name === '@/lib/auth-return') return { consumeAuthReturnPath: () => null, pickAuthReturnPath: (value, fallback) => value || fallback, storeAuthReturnPath() {} };
      if (name.includes('use-toast')) return { useToast: () => ({ toast() {} }) };
      if (name === '@/lib/org-invite-flow') return load('lib/org-invite-flow.ts');
      if (name === '@/lib/invite-config') return { formatInviteExpiryLabel: value => value };
      if (name === 'framer-motion') return { motion: new Proxy({}, { get: (_, key) => key }), AnimatePresence: 'AnimatePresence' };
      return new Proxy({}, { get: (_, key) => key });
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: customRequire, React: react, fetch, localStorage,
      window: { localStorage, location: { search: new URLSearchParams(query).toString() ? `?${new URLSearchParams(query)}` : '', assign: route => routes.push(route) } },
      console, Error, URLSearchParams, URL, setTimeout, clearTimeout, AbortController, process: { env: {} } }, { filename: file });
    return module.exports;
  }
  function render(file) {
    cursor = effectCursor = refCursor = 0;
    const tree = load(file).default();
    while (pendingEffects.length) pendingEffects.shift()();
    return tree;
  }
  async function flush() { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); }
  return { render, flush, requests, routes, storage, states,
    setQuery(query, ready = true) { router.query = query; router.isReady = ready; },
    resolvePreview(token) { pendingPreviews.get(token)?.(); },
    get profileReads() { return profileReads; }, get authCallbackReturnedPromise() { return authCallbackReturnedPromise; } };
}

for (const providerToken of [null, 'fresh-discord-token']) {
 for (const invite_type of ['new_org', 'join_org']) {
  const f = fixture({ providerToken, preview: { ...validInvite, invite_type } });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/setup-org'], 'Valid invite must win over default Avalanche membership on fresh and resumed sessions');
  assert(f.storage.has('org_invite_token'), 'Callback must preserve token until completion');
  assert.equal(f.requests.length, 1);
  checks++;
 }
}
for (const preview of [{ valid: false, reason: 'expired' }, { valid: false, reason: 'already_used' }, { valid: true, invite_type: 'invented' }]) {
  const f = fixture({ preview });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/']);
  assert(!f.storage.has('org_invite_token'));
  assert(!f.requests.some(({ url }) => url.includes('complete-')));
  checks++;
}
{
  const f = fixture({ previewFailure: true });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, []);
  assert(f.storage.has('org_invite_token'), 'Transient errors must not erase a valid invitation');
  assert(f.states.some(value => value === 'Temporary connection failure'));
  checks++;
}
{
  const f = fixture({ previewStatus: 404, preview: { error: 'Invite not found' } });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/']);
  assert(!f.storage.has('org_invite_token'));
  checks++;
}
{
  const f = fixture({ previewStatus: 503 });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, []);
  assert(f.storage.has('org_invite_token'));
  checks++;
}
{
  const f = fixture({ token: null });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/']);
  assert.equal(f.requests.length, 0);
  checks++;
}
for (const query of [{}, { token: 'reopened-invite', invite_type: 'new_org' }]) {
  const f = fixture({ query });
  f.render('pages/auth/signin.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/auth/callback'], 'Signed-in users must resume validation for stored and reopened invitations');
  checks++;
}
{
  const f = fixture({ token: null, signedInDuringRestore: true, organizationId: 'established-org' });
  f.render('pages/auth/callback.tsx');
  await Promise.race([
    f.flush(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('SIGNED_IN callback deadlocked session restoration')), 500)),
  ]);
  assert.equal(f.authCallbackReturnedPromise, false, 'SIGNED_IN listener must return synchronously while session restoration holds the auth lock');
  assert.equal(f.profileReads, 1, 'Restored SIGNED_IN session must finish one profile lookup after releasing the auth lock');
  assert.deepEqual(f.routes, ['/']);
  checks++;
}
{
  const f = fixture({ token: null });
  f.render('pages/auth/signin.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/'], 'Ordinary established-user sign-in must retain its home redirect');
  checks++;
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of tree.props?.children || []) { const found = find(child, predicate); if (found) return found; }
  return null;
}
{
  const f = fixture();
  f.render('pages/setup-org.tsx'); await f.flush();
  let tree = f.render('pages/setup-org.tsx'); await f.flush();
  assert(!f.requests.some(({ url }) => url.includes('complete-')), 'New organization requires explicit form submission');
  const nameInput = find(tree, node => node.props?.id === 'orgName');
  const numberInput = find(tree, node => node.props?.id === 'teamNumber');
  assert(nameInput && numberInput, 'Valid new-org invite must show setup even for default org members');
  nameInput.props.onChange({ target: { value: 'Invited Team' } });
  numberInput.props.onChange({ target: { value: '4321' } });
  tree = f.render('pages/setup-org.tsx');
  await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  const request = f.requests.find(({ url }) => url === '/api/organization/complete-new-org-setup');
  assert(request);
  assert.deepEqual(JSON.parse(request.options.body), { token: 'invitation', orgName: 'Invited Team', teamNumber: 4321 });
  assert.equal(request.options.headers.Authorization, 'Bearer supabase-session');
  assert(!f.storage.has('org_invite_token'));
  assert(!f.storage.has('org_invite_type'));
  assert.deepEqual(f.routes, ['/']);
  checks++;
}
{
  const f = fixture({ preview: { ...validInvite, invite_type: 'join_org' } });
  f.render('pages/setup-org.tsx'); await f.flush();
  f.render('pages/setup-org.tsx'); await f.flush();
  const request = f.requests.find(({ url }) => url === '/api/organization/complete-join-invite');
  assert(request, 'Validated join invitations must still complete through the authenticated endpoint');
  assert.deepEqual(JSON.parse(request.options.body), { token: 'invitation' });
  assert(!f.requests.some(({ url }) => url === '/api/organization/complete-new-org-setup'));
  assert(!f.storage.has('org_invite_token'));
  assert.deepEqual(f.routes, ['/']);
  checks++;
}
{
  const f = fixture({ preview: { valid: false, reason: 'expired' } });
  f.render('pages/setup-org.tsx'); await f.flush();
  const tree = f.render('pages/setup-org.tsx'); await f.flush();
  assert.equal(find(tree, node => node.type === 'form'), null, 'Invalid invite must never expose the setup form');
  assert(!f.requests.some(({ url }) => url.includes('complete-')));
  checks++;
}
{
  const f = fixture({ token: null, signedIn: false, query: { token: 'first-link', invite_type: 'new_org', target_org: 'old-hint' } });
  f.render('pages/auth/signin.tsx'); await f.flush();
  assert.equal(f.storage.get('org_invite_token'), 'first-link');
  assert.deepEqual(f.routes, [], 'Signed-out invite holders must be allowed to sign in');
  f.setQuery({ token: 'second-link', invite_type: 'new_org' });
  f.render('pages/auth/signin.tsx'); await f.flush();
  assert.equal(f.storage.get('org_invite_token'), 'second-link', 'Client-side invite navigation must replace the original token');
  assert(!f.storage.has('org_invite_target_org'), 'A new link must not retain a different organization hint');
  checks++;
}
{
  const f = fixture({ profilePresent: false, organizationId: null });
  f.render('pages/auth/callback.tsx'); await f.flush();
  assert.deepEqual(f.routes, ['/setup-org'], 'A first-time account without a public profile must still reach setup');
  assert.equal(f.profileReads, 0, 'A pending invitation must not depend on default organization assignment');
  checks++;
}
{
  const f = fixture({ token: 'stale-link', query: { token: 'direct-link' } });
  f.render('pages/setup-org.tsx'); await f.flush();
  const tree = f.render('pages/setup-org.tsx');
  assert.equal(f.storage.get('org_invite_token'), 'direct-link');
  assert(f.requests.some(row => row.url.includes('token=direct-link')));
  assert(find(tree, node => node.props?.id === 'orgName'), 'A direct setup URL must show its validated form');
  checks++;
}
{
  const f = fixture({ token: null, routerReady: false });
  f.render('pages/setup-org.tsx'); await f.flush();
  assert.equal(f.requests.length, 0, 'Wait for URL hydration before deciding no invite exists');
  f.setQuery({ token: 'hydrated-link' });
  f.render('pages/setup-org.tsx'); await f.flush();
  const tree = f.render('pages/setup-org.tsx');
  assert(find(tree, node => node.props?.id === 'orgName'), 'A valid hydrated URL must recover without a stale error');
  checks++;
}
{
  const f = fixture({ token: null, query: { token: 'slow-valid' }, delayedTokens: ['slow-valid'], previews: { 'new-invalid': { valid: false, reason: 'expired' } } });
  f.render('pages/setup-org.tsx'); await f.flush();
  f.setQuery({ token: 'new-invalid' });
  f.render('pages/setup-org.tsx'); await f.flush();
  f.resolvePreview('slow-valid'); await f.flush();
  const tree = f.render('pages/setup-org.tsx');
  assert.equal(find(tree, node => node.type === 'form'), null, 'A late previous validation must not activate a different invalid link');
  assert(!f.requests.some(row => row.url.includes('complete-')));
  checks++;
}
console.log(`Passed ${checks} isolated organization invite flow checks; no network or production data access.`);
