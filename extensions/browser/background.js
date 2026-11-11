/* Parola MV3 background: no cloud write and no telemetry here.
 * A user-approved HTTPS host may stage a login only while Firebase is signed in.
 * Pending credentials live in browser.storage.session (memory, max 2 minutes),
 * and are deleted on save, dismiss, logout, or expiration.
 */
(() => {
  'use strict';
  const ext = globalThis.browser || globalThis.chrome;
  const EXPIRY_MS = 2 * 60 * 1000;
  const exactOrigin = value => {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password ||
          u.pathname !== '/' || u.search || u.hash) return null;
      return u.origin;
    } catch { return null; }
  };
  async function isAllowed(origin) {
    const saved = await ext.storage.local.get('parolaAllowedOrigins');
    if (!(saved.parolaAllowedOrigins || []).includes(origin)) return false;
    return ext.permissions.contains({ origins: [origin + '/*'] });
  }
  async function pending() {
    const saved = await ext.storage.session.get('parolaPending');
    const candidate = saved.parolaPending;
    if (!candidate) return null;
    if (!Number.isFinite(candidate.at) || Date.now() - candidate.at > EXPIRY_MS ||
        candidate.at > Date.now() + 1000) {
      await ext.storage.session.remove('parolaPending');
      return null;
    }
    return candidate;
  }
  async function handle(msg, sender) {
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return {};
    if (msg.type === 'PAROLA_GET_PENDING_FROM_POPUP') {
      // Only extension-owned popup pages; never expose secrets to content scripts.
      if (sender.id !== ext.runtime.id || sender.tab?.url?.startsWith('https:')) return {};
      const candidate = await pending();
      return candidate ? { candidate } : {};
    }
    if (msg.type === 'PAROLA_CLEAR_PENDING_FROM_POPUP') {
      if (sender.id !== ext.runtime.id || sender.tab?.url?.startsWith('https:')) return {};
      await ext.storage.session.remove('parolaPending');
      return { ok: true };
    }
    if (!sender.tab?.id || sender.frameId !== 0) return {};
    const origin = exactOrigin(msg.origin);
    if (!origin || !sender.url?.startsWith(origin + '/') || !await isAllowed(origin)) return {};
    if (msg.type === 'PAROLA_LOGIN_ATTEMPT') {
      const auth = (await ext.storage.session.get('parolaAuth')).parolaAuth;
      if (!auth?.uid || !auth?.refreshToken || auth.provider !== 'google.com') return {};
      if (typeof msg.username !== 'string' || typeof msg.password !== 'string' ||
          !msg.username.trim() || msg.username.length > 512 ||
          msg.password.length < 1 || msg.password.length > 8192) return {};
      // No filesystem/local storage, no remote requests, no logs.
      await ext.storage.session.set({
        parolaPending: { at: Date.now(), tabId: sender.tab.id, origin,
          username: msg.username, password: msg.password }
      });
      return { ok: true };
    }
    const candidate = await pending();
    if (!candidate || candidate.tabId !== sender.tab.id || candidate.origin !== origin) return {};
    if (msg.type === 'PAROLA_CHECK_PENDING') {
      return { pending: true }; // No username/password returned to website.
    }
    if (msg.type === 'PAROLA_OPEN_PENDING') {
      await ext.tabs.create({ url: ext.runtime.getURL('popup.html?review=1') });
      return { ok: true };
    }
    if (msg.type === 'PAROLA_DISMISS_PENDING') {
      await ext.storage.session.remove('parolaPending');
      return { ok: true };
    }
    return {};
  }
  ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    Promise.resolve(handle(msg, sender)).then(
      result => sendResponse(result || {}),
      () => sendResponse({})
    );
    return true; // Chrome and Firefox async message response.
  });
  ext.permissions.onRemoved.addListener(async removed => {
    if (!removed.origins?.length) return;
    const saved = await ext.storage.local.get('parolaAllowedOrigins');
    const list = saved.parolaAllowedOrigins || [];
    const remaining = [];
    for (const origin of list) {
      if (await ext.permissions.contains({ origins: [origin + '/*'] })) remaining.push(origin);
    }
    await ext.storage.local.set({ parolaAllowedOrigins: remaining });
  });
})();
