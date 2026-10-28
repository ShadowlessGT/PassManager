/* Parola website: progressive enhancements without trackers or remote dependencies. */
const root = document.documentElement;
const query = window.matchMedia('(prefers-color-scheme: dark)');
const storageKey = 'parola-site-theme';
function readPreferredTheme() {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}
function applyTheme() {
  const selected = readPreferredTheme();
  if (selected) root.setAttribute('data-theme', selected);
  else root.removeAttribute('data-theme');
  const effective = selected || (query.matches ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-label]').forEach(node => {
    node.textContent = effective === 'dark' ? 'Hell' : 'Dunkel';
  });
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-label', effective === 'dark'
      ? 'Helles Design einschalten' : 'Dunkles Design einschalten');
    button.setAttribute('title', effective === 'dark'
      ? 'Helles Design einschalten' : 'Dunkles Design einschalten');
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#071324' : '#f7faff');
}
function toggleTheme() {
  const active = root.dataset.theme || (query.matches ? 'dark' : 'light');
  try { window.localStorage.setItem(storageKey, active === 'dark' ? 'light' : 'dark'); }
  catch {
    root.dataset.theme = active === 'dark' ? 'light' : 'dark';
    return applyTheme();
  }
  applyTheme();
}
if (!document.querySelector('[data-theme-toggle]')) {
  const nav = document.querySelector('header .menu');
  if (nav) {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.type = 'button';
    button.setAttribute('data-theme-toggle', '');
    button.innerHTML = '<span class="theme-icon" aria-hidden="true"></span><span data-theme-label>Design</span>';
    nav.appendChild(button);
  }
}
document.querySelectorAll('[data-theme-toggle]').forEach(button => {
  button.addEventListener('click', toggleTheme);
});
applyTheme();
query.addEventListener?.('change', applyTheme);

// Illustrative product preview only: changing modes does not store any data.
const modeButtons = document.querySelectorAll('[data-mode]');
const extraFields = document.querySelector('[data-expert-fields]');
const modeTitle = document.querySelector('[data-mode-title]');
const modeDescription = document.querySelector('[data-mode-description]');
modeButtons.forEach(button => button.addEventListener('click', () => {
  const expert = button.getAttribute('data-mode') === 'expert';
  modeButtons.forEach(other => {
    const active = other === button;
    other.classList.toggle('is-active', active);
    other.setAttribute('aria-pressed', String(active));
  });
  if (extraFields) extraFields.hidden = !expert;
  if (modeTitle) modeTitle.textContent = expert
    ? 'Mehr Informationen, wenn du sie brauchst.'
    : 'Auf das Wesentliche konzentriert.';
  if (modeDescription) modeDescription.textContent = expert
    ? 'Zusätzliche Optionen und individuelle Felder in der erweiterten Ansicht.'
    : 'Große Bedienelemente und nur die Angaben, die du regelmäßig brauchst.';
}));
