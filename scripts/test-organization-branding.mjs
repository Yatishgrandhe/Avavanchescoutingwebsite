// Exercise organization identity and real App context, including account-switch races.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const transpile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const branding = { exports: {} };
vm.runInNewContext(transpile('lib/organization-branding.ts'), { module: branding, exports: branding.exports });
const { getOrganizationDisplayName, getScoutingTitle } = branding.exports;
let checks = 0;
for (const [organization, user, name, title] of [
  [{ id: 'robo', name: 'RoboKnights' }, { organization_id: 'robo' }, 'RoboKnights', 'RoboKnights Scouting'],
  [{ id: 'avalanche', name: 'Avalanche' }, { organization_id: 'avalanche' }, 'Avalanche', 'Avalanche Scouting'],
  [{ id: 'other', name: ' 新しいチーム ' }, { organization_id: 'other' }, '新しいチーム', '新しいチーム Scouting'],
  [{ id: 'other', name: 'Team Scouting' }, { organization_id: 'other' }, 'Team Scouting', 'Team Scouting'],
  [{ id: 'old', name: 'Avalanche' }, { organization_id: 'robo' }, 'Scouting', 'Scouting'],
  [null, {}, 'Scouting', 'Scouting'],
  [null, null, 'Avalanche', 'Avalanche Scouting'],
  [{ id: 'blank', name: '  ' }, { organization_id: 'blank' }, 'Scouting', 'Scouting'],
]) {
  assert.equal(getOrganizationDisplayName(organization, user), name);
  assert.equal(getScoutingTitle(organization, user), title);
  checks++;
}

function appFixture({ delayOrganization = false, organizationError = false } = {}) {
  const values = [], effects = [], requests = [];
  let cursor = 0, effectCursor = 0, authListener, resolveOrganization;
  let authSession = { user: { id: 'member', email: 'member@example.test', user_metadata: {} }, access_token: 'fixture' };
  const organizationPromise = new Promise(resolve => { resolveOrganization = resolve; });
  const client = {
    auth: {
      getSession: async () => ({ data: { session: authSession } }),
      onAuthStateChange: callback => { authListener = callback; return { data: { subscription: { unsubscribe() {} } } }; },
    },
    from(table) {
      const filters = {};
      const query = {
        select() { return query; }, eq(key, value) { filters[key] = value; return query; },
        async maybeSingle() {
          requests.push({ table, filters });
          if (table === 'users') return { data: { id: filters.id, name: 'Member', organization_id: 'robo', role: 'admin' } };
          assert.equal(table, 'organizations');
          assert.equal(filters.id, 'robo');
          if (delayOrganization) return organizationPromise;
          return organizationError ? { data: null, error: new Error('Unavailable') } : { data: { id: 'robo', name: 'RoboKnights' } };
        },
      };
      return query;
    },
  };
  const react = {
    createContext: () => ({ Provider: 'provider' }), useContext() {},
    useState(initial) { const i = cursor++; if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial; return [values[i], value => { values[i] = typeof value === 'function' ? value(values[i]) : value; }]; },
    useEffect(run, dependencies) { const i = effectCursor++; if (!effects[i]) { effects[i] = dependencies; queueMicrotask(run); } },
  };
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  vm.runInNewContext(transpile('pages/_app.tsx'), {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
      if (name === '@/lib/organization-branding') return branding.exports;
      if (name === '@/lib/supabase') return { getSupabaseClient: () => client };
      if (name === '@/lib/refresh-handler') return { handleRefreshResize: () => () => {} };
      return {};
    },
    console: { warn() {} }, fetch: () => { throw new Error('Unexpected network request'); },
  });
  function render() {
    cursor = effectCursor = 0;
    const tree = module.exports.default({ Component: 'test-page', pageProps: {} });
    return tree.props.children.find(child => child.type === 'provider').props.value;
  }
  async function flush() { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); }
  return { render, flush, requests,
    signOut() { authSession = null; authListener('SIGNED_OUT', null); },
    resolveOrganization() { resolveOrganization({ data: { id: 'robo', name: 'RoboKnights' } }); },
  };
}
{
  const f = appFixture(); f.render(); await f.flush(); const context = f.render();
  assert.equal(context.loading, false);
  assert.equal(context.user.organization_id, context.organization.id);
  assert.equal(getScoutingTitle(context.organization, context.user), 'RoboKnights Scouting');
  assert.equal(f.requests.filter(row => row.table === 'organizations').length, 1, 'The shell must share one organization lookup');
  checks++;
}
{
  const f = appFixture({ organizationError: true }); f.render(); await f.flush(); const context = f.render();
  assert.equal(context.loading, false);
  assert.equal(getScoutingTitle(context.organization, context.user), 'Scouting', 'Lookup errors must never label a RoboKnights user as Avalanche');
  checks++;
}
{
  const f = appFixture({ delayOrganization: true }); f.render(); await f.flush();
  f.signOut(); await f.flush(); f.resolveOrganization(); await f.flush();
  const context = f.render();
  assert.equal(context.session, null); assert.equal(context.user, null); assert.equal(context.organization, null);
  assert.equal(getScoutingTitle(context.organization, context.user), 'Avalanche Scouting', 'A previous account must not relabel a signed-out page');
  checks++;
}
console.log(`Passed ${checks} organization branding and auth-context checks.`);
