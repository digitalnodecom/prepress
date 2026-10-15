// Site launcher: recent sites, new site, open folder. Talks to the Rust side (src-tauri/src/main.rs).
const { invoke } = window.__TAURI__.core;
const $ = (id) => document.getElementById(id);
// Lucide icons (lucide.dev, ISC), inlined: the launcher has no build step.
const ICONS = {
  plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
  folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>',
  arrowRight: '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
  x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
};
const icon = (name) => {
  const t = document.createElement('template');
  t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
};


function showError(text) {
  $('error').textContent = text || '';
  $('error').hidden = !text;
}

function setStarting(name) {
  $('starting').hidden = !name;
  $('home').hidden = !!name;
  $('starting-name').textContent = name || '';
}

async function open(path, name) {
  showError('');
  setStarting(name || path);
  try {
    await invoke('open_site', { path }); // navigates the window to the editor
  } catch (e) {
    setStarting(null);
    showError(String(e));
    await render();
  }
}

function el(tag, props = {}, ...children) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

async function render() {
  const sites = await invoke('list_sites');
  $('recent-title').hidden = !sites.length;
  $('sites').replaceChildren(
    ...sites.map((s) => {
      const name = el('strong', {}, s.name);
      if (s.running) name.append(el('span', { className: 'badge' }, 'OPEN'));
      const actions = [];
      if (s.exists) {
        actions.push(el('button', { className: 'primary', onclick: () => open(s.path, s.name) }, s.running ? 'Back to editor' : 'Open', icon('arrowRight')));
        actions.push(el('button', { className: 'link', onclick: () => invoke('reveal', { path: s.path }) }, icon('folder'), 'Show folder'));
      }
      actions.push(
        el('button', {
          className: 'link',
          title: 'Remove from this list (the folder is not deleted)',
          onclick: async () => {
            await invoke('forget_site', { path: s.path });
            render();
          },
        }, icon('x'), 'Remove'),
      );
      return el('li', { className: s.exists ? '' : 'missing' }, el('div', { className: 'site' }, name, el('span', { className: 'mono' }, s.exists ? s.path : `${s.path} (missing)`)), ...actions);
    }),
  );
  return sites;
}

$('new-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const name = $('new-name').value.trim();
  if (!name) return $('new-name').focus();
  showError('');
  try {
    const path = await invoke('create_site', { name });
    await open(path, name);
  } catch (e) {
    showError(String(e));
  }
});

async function pickFolder() {
  showError('');
  const path = await invoke('pick_folder');
  if (path) await open(path);
}
$('open-folder').addEventListener('click', pickFolder);

(async () => {
  $('sites-folder').textContent = await invoke('sites_folder');
  const sites = await render();
  const hash = location.hash.slice(1);
  if (hash === 'new') return $('new-name').focus();
  if (hash === 'open') return pickFolder();
  // App start: reopen the last site. From the File menu (#sites) stay here.
  if (!hash && !sessionStorage.getItem('pp:started')) {
    sessionStorage.setItem('pp:started', '1');
    const last = sites.find((s) => s.exists);
    if (last) return open(last.path, last.name);
  }
  sessionStorage.setItem('pp:started', '1');
  if (!sites.length) $('new-name').focus();
})();
