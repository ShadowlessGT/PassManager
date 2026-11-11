import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function harness() {
  let onMessage;
  let onRemoved;
  const session = {};
  const local = {};
  const allowed = new Set();
  const opened = [];
  const runtime = {
    id: 'parola-test-extension',
    getURL: path => 'chrome-extension://parola-test-extension/' + path,
    onMessage: { addListener(handler) { onMessage = handler; } }
  };
  const api = {
    runtime,
    storage: {
      session: {
        async get(key) { return { [key]: session[key] }; },
        async set(values) { Object.assign(session, values); },
        async remove(key) { delete session[key]; }
      },
      local: {
        async get(key) { return { [key]: local[key] }; },
        async set(values) { Object.assign(local, values); }
      }
    },
    permissions: {
      async contains({origins}) { return origins.every(x => allowed.has(x)); },
      onRemoved: { addListener(handler) { onRemoved = handler; } }
    },
    tabs: {
      async create(options) { opened.push(options); }
    }
  };
  runInNewContext(readFileSync(new URL('../browser/background.js', import.meta.url), 'utf8'), {
    browser: api, URL, Promise, Date, setTimeout
  });
  async function message(msg, sender = {id:runtime.id, frameId:0,
    url:'https://example.test/login', tab:{id:7,url:'https://example.test/login'}}) {
    return new Promise((resolve, reject) => {
      let settled=false;
      const response = obj => { settled=true; resolve(obj); };
      const asyncResponse = onMessage(msg, sender, response);
      if(!asyncResponse && !settled)reject(new Error('Missing message reply'));
      setTimeout(()=>{if(!settled)reject(new Error('Async response timed out'))},500);
    });
  }
  return { message, session, local, allowed, opened, onRemoved:()=>onRemoved };
}

describe('Automatic Parola login capture user authorization', () => {
  const attempt = { type:'PAROLA_LOGIN_ATTEMPT', origin:'https://example.test',
    username:'dummy', password:'DUMMY-NOT-REAL' };
  const query = {type:'PAROLA_CHECK_PENDING', origin:'https://example.test'};
  const sender = {id:'parola-test-extension',frameId:0,
    url:'https://example.test/login',tab:{id:7,url:'https://example.test/login'}};
  it('does not capture before Firebase sign-in and per-site permission', async () => {
    const x=harness();
    assert.equal((await x.message(attempt,sender)).ok, undefined);
    assert.equal(x.session.parolaPending, undefined);
    x.session.parolaAuth={uid:'dummy123',refreshToken:'test-only'};
    assert.equal((await x.message(attempt,sender)).ok, undefined);
    x.local.parolaAllowedOrigins=['https://example.test'];
    x.allowed.add('https://example.test/*');
    assert.equal((await x.message(attempt,sender)).ok, true);
    assert.equal(x.session.parolaPending.password, attempt.password);
  });
  it('will not expose captured secret to a content script, even on same site', async () => {
    const x=harness();
    x.session.parolaAuth={uid:'dummy123',refreshToken:'test-only'};
    x.local.parolaAllowedOrigins=['https://example.test'];
    x.allowed.add('https://example.test/*');
    await x.message(attempt,sender);
    const response=await x.message(query,sender);
    assert.equal(response.pending,true);
    assert.equal(JSON.stringify(response).includes(attempt.password),false);
    assert.equal((await x.message(query,{...sender,url:'https://evil.example/login'})).pending,undefined);
    assert.equal((await x.message(query,{...sender,tab:{id:8,url:sender.url}})).pending,undefined);
  });
  it('only extension-owned pages can access review credentials', async () => {
    const x=harness();
    x.session.parolaAuth={uid:'dummy123',refreshToken:'test-only'};
    x.local.parolaAllowedOrigins=['https://example.test'];
    x.allowed.add('https://example.test/*');
    await x.message(attempt,sender);
    const popup={id:'parola-test-extension', url:'chrome-extension://parola-test-extension/popup.html'};
    assert.equal((await x.message({type:'PAROLA_GET_PENDING_FROM_POPUP'},sender)).candidate,undefined);
    const data=await x.message({type:'PAROLA_GET_PENDING_FROM_POPUP'},popup);
    assert.equal(data.candidate.password,attempt.password);
    await x.message({type:'PAROLA_CLEAR_PENDING_FROM_POPUP'},popup);
    assert.equal(x.session.parolaPending,undefined);
  });
  it('discards stale captures and blocks invalid/HTTP origins', async () => {
    const x=harness();
    x.session.parolaAuth={uid:'dummy123',refreshToken:'test-only'};
    x.local.parolaAllowedOrigins=['https://example.test'];
    x.allowed.add('https://example.test/*');
    assert.equal((await x.message({...attempt,origin:'http://example.test'},sender)).ok,undefined);
    await x.message(attempt,sender);
    x.session.parolaPending.at=Date.now()-125000;
    assert.equal((await x.message(query,sender)).pending,undefined);
    assert.equal(x.session.parolaPending,undefined);
  });
  it('opens review only after user request and discards on dismiss', async () => {
    const x=harness();
    x.session.parolaAuth={uid:'dummy123',refreshToken:'test-only'};
    x.local.parolaAllowedOrigins=['https://example.test'];
    x.allowed.add('https://example.test/*');
    await x.message(attempt,sender);
    assert.equal(x.opened.length,0);
    await x.message({type:'PAROLA_OPEN_PENDING',origin:attempt.origin},sender);
    assert.equal(x.opened.length,1);
    assert.ok(x.opened[0].url.endsWith('/popup.html?review=1'));
    await x.message({type:'PAROLA_DISMISS_PENDING',origin:attempt.origin},sender);
    assert.equal(x.session.parolaPending,undefined);
  });
});
