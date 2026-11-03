// Public destinations only. One catalog feeds every module and the homepage.
// Private previews and unpublished brains must not be added to this public file.
(() => {
  'use strict';
  const local = [
    ['Home', 'index.html'],
    ['Projects', 'projects.html'],
    ['Life', 'life.html'],
    ['Programming', 'programming.html'],
    ['Build', 'build.html']
  ];
  const networks = [
    ['Brain 42', 'https://brain42.pplx.app'],
    ['Deep Answers', 'https://deepanswers.pplx.app'],
    ['Human Genome', 'https://humangenome.pplx.app'],
    ['GTA Network', 'https://gtabrain.pplx.app'],
    ['AI Hub', 'https://hubbrain.pplx.app']
  ];
  // Only the private launcher's generic URL belongs in this public bundle.
  // Its catalog and destination IDs are stored in a separate private app.
  const ownerMenu = ['Owner menu', 'https://www.perplexity.ai/computer/a/31a9ffb6-619a-4904-bd49-59ca1c658585'];
  const decorateOwnerLink = a => {
    a.title = 'Open your private Owner menu in Perplexity (new tab)';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.referrerPolicy = 'no-referrer';
  };
  const current = location.pathname.split('/').pop() || 'index.html';
  const link = ([label, href]) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (href === current) {
      a.className = 'on';
      a.setAttribute('aria-current', 'page');
    }
    if (href.startsWith('https://')) a.title = `Open ${label} (separate MindBlown site)`;
    if (href === ownerMenu[1]) {
      decorateOwnerLink(a);
    }
    return a;
  };
  document.querySelectorAll('nav.brains, [data-project-menu]').forEach(nav => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.setAttribute('role', 'separator');
    nav.replaceChildren(...local.map(link), sep, ...networks.map(link), link(ownerMenu));
  });
  document.querySelectorAll('[data-public-networks]').forEach(container => {
    const label = document.createElement('span');
    label.textContent = 'Public networks';
    container.replaceChildren(label, ...networks.map(link));
  });
  // app.js rebuilds the module dropdown after this script runs, copying only
  // href/text. Restore safe new-tab semantics on those replacement anchors.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(`a[href="${ownerMenu[1]}"]`).forEach(decorateOwnerLink);
  }, { once: true });
  // Build can autofocus its interview after a dropdown opens. Escape should
  // still dismiss the open navigation even when focus has moved outside it.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const nav = document.querySelector('nav.brains.open');
    if (!nav) return;
    const menu = nav.querySelector('.nav-menu');
    const button = nav.querySelector('.nav-btn');
    if (!menu || !button) return;
    menu.hidden = true;
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
    event.preventDefault();
    event.stopPropagation();
  }, true);
  const picker = document.querySelector('.project-picker');
  if (picker) {
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        picker.open = false;
        picker.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (!picker.contains(event.target)) picker.open = false;
    });
  }
})();
