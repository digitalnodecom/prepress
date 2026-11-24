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
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
  trash: '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>',
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

/** "3 hours ago" for a time in seconds since 1970. */
function ago(secs) {
  if (!secs) return '';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const d = secs - Date.now() / 1000;
  for (const [unit, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
    if (Math.abs(d) >= n) return rtf.format(Math.round(d / n), unit);
  }
  return 'just now';
}

/**
 * Text that edits in place: looks like text, becomes an input on focus, saves on Enter or when
 * focus leaves, Escape puts the old value back. `save` returns the value to show (or throws).
 */
function inlineEdit({ value, label, className, save }) {
  const input = el('input', { value, className: `inline ${className || ''}`, spellcheck: false, title: `${label}: click to change` });
  input.setAttribute('aria-label', label);
  let current = value;
  let busy = false;
  const commit = async () => {
    const next = input.value.trim();
    if (busy || !next || next === current) {
      input.value = current;
      return;
    }
    busy = true;
    input.disabled = true;
    showError('');
    try {
      current = (await save(next)) || next;
      input.value = current;
    } catch (e) {
      input.value = current;
      showError(String(e));
    } finally {
      busy = false;
      input.disabled = false;
    }
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') input.blur();
    if (ev.key === 'Escape') {
      input.value = current;
      input.blur();
    }
  });
  input.addEventListener('blur', commit);
  return input;
}

async function act(fn) {
  showError('');
  try {
    await fn();
  } catch (e) {
    showError(String(e));
  }
  await render();
}

async function render() {
  const sites = await invoke('list_sites');
  $('recent-title').hidden = !sites.length;
  $('sites').replaceChildren(
    ...sites.map((s) => {
      const head = el('div', { className: 'site-head' });
      if (s.exists) {
        head.append(inlineEdit({ value: s.name, label: 'Site name', className: 'name', save: (name) => invoke('rename_site', { path: s.path, name }) }));
      } else {
        head.append(el('strong', {}, s.name));
      }
      if (s.running) head.append(el('span', { className: 'badge' }, 'OPEN'));

      const meta = el('div', { className: 'meta' });
      if (s.exists) {
        meta.append(
          el('span', { className: 'folder' }, icon('folder'), inlineEdit({ value: s.folder, label: 'Folder name', className: 'mono', save: async (folder) => {
            await invoke('rename_folder', { path: s.path, folder });
            await render();
          } })),
        );
        if (s.pages) meta.append(el('span', {}, `${s.pages} page${s.pages === 1 ? '' : 's'}`));
        if (s.edited) meta.append(el('span', { title: new Date(s.edited * 1000).toLocaleString() }, `edited ${ago(s.edited)}`));
        if (s.address) meta.append(el('a', { href: '#', className: 'address', title: 'Open the published site', onclick: (ev) => { ev.preventDefault(); invoke('open_url', { url: s.address }); } }, s.address.replace(/^https?:\/\//, '')));
        else meta.append(el('span', { className: 'muted' }, 'not published'));
      }

      const actions = [];
      if (s.exists) {
        actions.push(el('button', { className: 'primary', onclick: () => open(s.path, s.name) }, s.running ? 'Back to editor' : 'Open', icon('arrowRight')));
      }
      const tools = el('div', { className: 'tools' });
      if (s.exists) {
        tools.append(
          el('button', { className: 'link', onclick: () => invoke('reveal', { path: s.path }) }, icon('folder'), 'Show folder'),
          el('button', { className: 'link', title: 'Copy the site and its media into a new folder (publish settings are not copied)', onclick: () => act(() => invoke('duplicate_site', { path: s.path })) }, icon('copy'), 'Duplicate'),
          el('button', { className: 'link danger', title: 'Move the folder to the Trash (asks first)', onclick: () => act(() => invoke('trash_site', { path: s.path })) }, icon('trash'), 'Move to Trash'),
        );
      }
      tools.append(el('button', { className: 'link', title: 'Remove from this list (the folder is not deleted)', onclick: () => act(() => invoke('forget_site', { path: s.path })) }, icon('x'), 'Remove from list'));

      return el(
        'li',
        { className: s.exists ? '' : 'missing' },
        el('div', { className: 'site' }, head, meta, el('span', { className: 'mono path' }, s.exists ? s.path : `${s.path} (missing)`), tools),
        ...actions,
      );
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
