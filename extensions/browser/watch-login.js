/* Parola watcher, loaded only for a user-allowlisted HTTPS origin.
 * Captures filled login values on actual form submission, never keystrokes.
 * Does NOT assert that a login was successful and never submits any form.
 */
(() => {
  'use strict';
  if (globalThis.__parolaLoginWatcher) return;
  globalThis.__parolaLoginWatcher = true;
  const ext = globalThis.browser || globalThis.chrome;
  if (location.protocol !== 'https:') return;
  let displayShown = false;
  let attempts = 0;
  const visible = input => {
    if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) return false;
    const styles = getComputedStyle(input);
    return styles.display !== 'none' && styles.visibility !== 'hidden' &&
      input.getClientRects().length > 0;
  };
  function findLogin(form) {
    const controls = Array.from(form.querySelectorAll('input')).filter(visible);
    const passwords = controls.filter(input => input.type === 'password' &&
      input.autocomplete !== 'new-password' && input.autocomplete !== 'one-time-code' &&
      typeof input.value === 'string' && input.value);
    if (passwords.length !== 1) return null;
    const pw = passwords[0];
    const options = controls.filter(input => input !== pw &&
      ['text', 'email', 'tel', ''].includes(input.type) && input.value);
    const name = options.find(input => input.autocomplete === 'username') ||
      options.find(input => input.type === 'email') ||
      options.find(input => /user|login|mail/i.test(input.name + ' ' + input.id)) ||
      options[0];
    if (!name || name.value.length > 512 || pw.value.length > 8192) return null;
    return { origin: location.origin, username: name.value, password: pw.value };
  }
  document.addEventListener('submit', event => {
    if (!(event.target instanceof HTMLFormElement) || !event.isTrusted) return;
    const candidate = findLogin(event.target);
    if (!candidate) return;
    // Content script's runtime message is visible only to the extension background.
    // All sensitive data expires from browser memory promptly if not approved.
    void ext.runtime.sendMessage({ type: 'PAROLA_LOGIN_ATTEMPT', ...candidate })
      .then(() => { setTimeout(checkForPrompt, 1400); })
      .catch(() => {});
  }, true);

  function noVisiblePasswordField() {
    return !Array.from(document.querySelectorAll('input[type="password"]')).some(visible);
  }
  async function checkForPrompt() {
    if (displayShown || !noVisiblePasswordField() || document.visibilityState !== 'visible') return;
    let result;
    try {
      result = await ext.runtime.sendMessage({
        type: 'PAROLA_CHECK_PENDING', origin: location.origin
      });
    } catch { return; }
    if (!result?.pending || displayShown) return;
    displayShown = true;
    const host = document.createElement('div');
    host.setAttribute('data-parola-prompt', '');
    host.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:350px';
    const shadow = host.attachShadow({ mode: 'closed' });
    const panel = document.createElement('section');
    panel.style.cssText = 'background:#101e37;color:#fff;font:13px/1.5 system-ui,sans-serif;padding:17px;border:1px solid #6282b8;border-radius:14px;box-shadow:0 12px 40px #0008';
    const heading = document.createElement('strong');
    heading.textContent = 'Parola · Login erkannt';
    heading.style.cssText = 'display:block;font-size:15px;margin-bottom:7px';
    const copy = document.createElement('p');
    copy.textContent = 'Möchtest du diesen Login verschlüsselt in Parola speichern? Es wurde noch nichts gespeichert.';
    copy.style.cssText = 'margin:0 0 10px;color:#c5d9fb';
    function button(text, primary, callback) {
      const b = document.createElement('button');
      b.textContent = text;
      b.type = 'button';
      b.style.cssText = 'cursor:pointer;margin-right:8px;padding:8px 10px;border-radius:9px;border:1px solid #4771ac;color:white;background:' +
        (primary ? '#1767df' : '#294262');
      b.addEventListener('click', callback);
      return b;
    }
    const open = button('In Parola speichern', true, () => {
      void ext.runtime.sendMessage({ type: 'PAROLA_OPEN_PENDING', origin: location.origin })
        .then(() => host.remove()).catch(() => host.remove());
    });
    const dismiss = button('Nicht jetzt', false, () => {
      void ext.runtime.sendMessage({ type: 'PAROLA_DISMISS_PENDING', origin: location.origin })
        .finally(() => host.remove());
    });
    panel.append(heading, copy, open, dismiss);
    shadow.append(panel);
    (document.body || document.documentElement).append(host);
    setTimeout(() => host.remove(), 30000);
  }
  function scheduleCheck() {
    if (++attempts > 5) return;
    setTimeout(() => {
      void checkForPrompt();
      if (!displayShown) scheduleCheck();
    }, attempts === 1 ? 600 : 2200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleCheck, { once: true });
  } else {
    scheduleCheck();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForPrompt();
  });
})();
