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
    return a;
  };
  document.querySelectorAll('nav.brains, [data-project-menu]').forEach(nav => {
    const sep = document.createElement('span');
    sep.className = 'sep';
    sep.setAttribute('role', 'separator');
    nav.replaceChildren(...local.map(link), sep, ...networks.map(link));
  });
  document.querySelectorAll('[data-public-networks]').forEach(container => {
    const label = document.createElement('span');
    label.textContent = 'Public networks';
    container.replaceChildren(label, ...networks.map(link));
  });
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
