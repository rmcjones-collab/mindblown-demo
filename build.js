/* MindBlown: Build — start from an empty brain and grow it by answering questions.
   Everything lives in this browser (or in the brain file you save). Nothing is uploaded. */
(() => {
  const Q = window.MINDBLOWN_BUILD;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)) + Date.now().toString(36).slice(-3);
  const today = () => new Date().toISOString().slice(0, 10);
  const pw = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => window.innerWidth <= 900;

  // ---------- toast + in-page dialogs (native alert/confirm/prompt are blocked in sandboxed previews) ----------
  const toastEl = document.createElement('div'); toastEl.className = 'toast'; $('stage').appendChild(toastEl);
  let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }
  const dlg = $('dlg'), dlgTitle = $('dlg-title'), dlgText = $('dlg-text'), dlgInput = $('dlg-input'), dlgOk = $('dlg-ok'), dlgCancel = $('dlg-cancel');
  let dlgResolve = null, dlgReturn = null;
  function ask({ title, text = '', input = null, ok = 'OK', danger = false }) {
    return new Promise(res => {
      dlgResolve = res; dlgReturn = document.activeElement; dlgTitle.textContent = title; dlgText.textContent = text; dlgText.hidden = !text;
      dlgInput.hidden = input === null; dlgInput.value = input || ''; dlgOk.textContent = ok; dlgOk.style.background = danger ? '#ff6b6b' : ''; dlgOk.style.borderColor = danger ? '#ff6b6b' : '';
      dlg.hidden = false; setTimeout(() => (input === null ? dlgOk : dlgInput).focus(), 30);
    });
  }
  function dlgClose(v) { dlg.hidden = true; const r = dlgResolve; dlgResolve = null; const back = dlgReturn; dlgReturn = null; if (back && back.isConnected && back !== document.body) back.focus?.(); r && r(v); }
  dlgOk.addEventListener('click', () => dlgClose(dlgInput.hidden ? true : dlgInput.value.trim()));
  dlgCancel.addEventListener('click', () => dlgClose(null));
  dlgInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); dlgClose(dlgInput.value.trim()); } });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlgClose(null); });
  const confirmDlg = (title, text, ok = 'Delete') => ask({ title, text, ok, danger: true });
  const promptDlg = (title, value = '', ok = 'Save') => ask({ title, input: value, ok });

  // ---------- storage: browser database when the page has a real origin, memory otherwise ----------
  const store = (() => {
    let db = null, mode = 'memory';
    const mem = { brain: null, files: new Map() };
    const tx = (name, m, fn) => new Promise((res, rej) => { const t = db.transaction(name, m); const r = fn(t.objectStore(name)); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); });
    async function open() {
      try {
        const idb = window.indexedDB; if (!idb) throw new Error('no idb');
        db = await new Promise((res, rej) => {
          const r = idb.open('mindblown-build', 1);
          r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('files')) d.createObjectStore('files'); };
          r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked'));
        });
        mode = 'browser';
      } catch (e) { mode = 'memory'; db = null; }
      return mode;
    }
    return {
      open, get mode() { return mode; },
      async loadBrain() { if (!db) return mem.brain; try { return await tx('kv', 'readonly', s => s.get('brain')); } catch { return null; } },
      async saveBrain(b) { if (!db) { mem.brain = b; return true; } try { await tx('kv', 'readwrite', s => s.put(b, 'brain')); return true; } catch (e) { console.warn('save failed', e); return false; } },
      // swap the whole brain and its files in one transaction: either everything lands or nothing changes
      async replaceAll(b, files) {
        if (!db) { mem.brain = b; mem.files = new Map(files.map(f => [f.id, f.blob])); return; }
        await new Promise((res, rej) => {
          const t = db.transaction(['kv', 'files'], 'readwrite');
          const kv = t.objectStore('kv'), fs = t.objectStore('files');
          kv.clear(); fs.clear(); kv.put(b, 'brain'); files.forEach(f => fs.put(f.blob, f.id));
          t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('aborted'));
        });
      },
      async putFile(id, blob) { if (!db) { mem.files.set(id, blob); return; } await tx('files', 'readwrite', s => s.put(blob, id)); },
      async getFile(id) { if (!db) return mem.files.get(id) || null; try { return (await tx('files', 'readonly', s => s.get(id))) || null; } catch { return null; } },
      async delFile(id) { if (!db) { mem.files.delete(id); return; } await tx('files', 'readwrite', s => s.delete(id)); },
      async clear() { mem.brain = null; mem.files.clear(); if (db) { await tx('kv', 'readwrite', s => s.clear()); await tx('files', 'readwrite', s => s.clear()); } },
    };
  })();

  // ---------- model ----------
  function emptyBrain(id = 'root', name = '') {
    return {
      v: 1, id, name, origin: null, color: '#ff8a3d',   // origin: { brain, sub } when this brain was grown from a neuron of another brain
      created: today(), updated: today(), interestsChosen: false, interests: [], paused: false,
      cats: Q.categories.map(c => ({ ...c, enabled: true, custom: false })),
      subjects: [{ id: 'me', cat: 'you', name: 'Me', starred: false, desc: 'This is you, at the centre of your brain.', created: today() }],
      entries: [],      // { id, cat, sub|null, kind: answer|note|link|file, lead, text, q, fileName, fileType, fileSize, created }
      custom: [],       // user-written questions
      followups: [],    // generated follow-up questions waiting to be asked
      disabled: [],     // question ids turned off
      answered: {},     // qid -> [entry ids]
      skipped: {},      // qid -> ask counter when skipped
      asks: 0, lastCat: null, history: [],
    };
  }
  // the document is a network: one root brain plus any brains grown from its neurons, and the connections the user drew between neurons
  function emptyNet() { return { v: 2, active: 'root', brains: [emptyBrain()], links: [] }; }
  let net = null, brain = null;   // brain = the active one
  const brainById = id => net.brains.find(b => b.id === id);
  const brainLabel = b => b.name ? `${b.name}'s brain` : 'your brain';
  // links: { id, a: {b: brainId, s: subId}, b: {...}, label, notes, strength 1..3, created }
  const endAt = (l, bid, sid) => (l.a.b === bid && l.a.s === sid) ? 'a' : (l.b.b === bid && l.b.s === sid) ? 'b' : null;
  const linksOf = sid => net.links.filter(l => endAt(l, brain.id, sid));
  const otherEnd = (l, sid) => endAt(l, brain.id, sid) === 'a' ? l.b : l.a;
  const localLinks = () => net.links.filter(l => l.a.b === brain.id && l.b.b === brain.id);
  const endOf = e => { const b = brainById(e.b); return { brain: b, sub: b?.subjects.find(x => x.id === e.s) || null }; };
  const sameEnd = (x, y) => x.b === y.b && x.s === y.s;
  function addLink(a, b, label, notes = '', strength = 2) {
    if (sameEnd(a, b)) return null;
    const ex = net.links.find(l => (sameEnd(l.a, a) && sameEnd(l.b, b)) || (sameEnd(l.a, b) && sameEnd(l.b, a)));
    if (ex) { ex.label = label || ex.label; if (notes) ex.notes = notes; ex.strength = strength; return ex; }
    const l = { id: uid(), a, b, label: label || 'connected to', notes, strength, created: today() };
    net.links.push(l); return l;
  }
  const removeLink = id => { net.links = net.links.filter(l => l.id !== id); };
  const catById = id => brain.cats.find(c => c.id === id);
  const subById = id => brain.subjects.find(s => s.id === id);
  const entriesOf = subId => brain.entries.filter(e => e.sub === subId);
  const catEntries = catId => brain.entries.filter(e => e.cat === catId && !e.sub);
  const subsOf = catId => brain.subjects.filter(s => s.cat === catId);
  const isFile = e => e.kind === 'file';
  const isImage = e => /^image\//.test(e.fileType || '');

  let saveT = 0, dirty = false, saveGen = 0, saveFailed = false;
  function save(immediate) {
    brain.updated = today(); dirty = true; saveFailed = false; updateStore();
    clearTimeout(saveT);
    const gen = ++saveGen;
    const run = async () => { const ok = await store.saveBrain(JSON.parse(JSON.stringify(net))); if (gen === saveGen) { dirty = !ok; saveFailed = !ok; } updateStore(); };
    if (immediate) return run();
    saveT = setTimeout(run, 400);
  }
  function updateStore() {
    const el = $('store');
    if (store.mode === 'browser' && saveFailed) { el.textContent = 'not saved · use Save'; el.classList.add('warn'); el.title = 'This browser refused to store the last change. Download a copy with Save so nothing is lost.'; }
    else if (store.mode === 'browser') { el.textContent = dirty ? 'saving…' : 'saved in this browser'; el.classList.remove('warn'); el.title = 'Your brain is stored in this browser only. Use Save to keep a copy as a file.'; }
    else { el.textContent = 'not stored · use Save'; el.classList.add('warn'); el.title = 'This preview cannot store anything between visits. Use Save to download your brain, and Open to continue later.'; }
  }

  function addSubject(catId, name, desc = '') {
    const existing = subsOf(catId).find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const s = { id: uid(), cat: catId, name, starred: false, desc, created: today() };
    brain.subjects.push(s); graph.birth(s); return s;
  }
  function addEntry(o) {
    const e = { id: uid(), kind: 'answer', lead: '', text: '', created: today(), sub: null, ...o };
    brain.entries.push(e); graph.birth(e); return e;
  }
  function removeEntry(id) {
    const e = brain.entries.find(x => x.id === id); if (!e) return;
    if (isFile(e)) { store.delFile(e.id); revoke(e.id); }
    brain.entries = brain.entries.filter(x => x.id !== id);
    Object.keys(brain.answered).forEach(q => { brain.answered[q] = brain.answered[q].filter(x => x !== id); if (!brain.answered[q].length) delete brain.answered[q]; });
  }
  function removeSubject(id) {
    const s = subById(id);
    entriesOf(id).forEach(e => removeEntry(e.id));
    net.links = net.links.filter(l => !endAt(l, brain.id, id));
    if (s?.brainId) { const sb = brainById(s.brainId); if (sb) sb.origin = null; }   // the brain it grew stays in the network, now on its own
    brain.subjects = brain.subjects.filter(s2 => s2.id !== id);
    brain.followups = brain.followups.filter(f => f.sub !== id);
    brain.interests = brain.interests.filter(i => i !== 'sub:' + id);
  }
  function addCategory(name) {
    const existing = brain.cats.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const used = new Set(brain.cats.map(c => c.color));
    const color = Q.palette.find(c => !used.has(c)) || Q.palette[brain.cats.length % Q.palette.length];
    const c = { id: 'c_' + uid(), name, color, enabled: true, custom: true };
    brain.cats.push(c); return c;
  }
  function removeCategory(id) {
    subsOf(id).forEach(s => removeSubject(s.id));
    catEntries(id).forEach(e => removeEntry(e.id));
    brain.cats = brain.cats.filter(c => c.id !== id);
    brain.followups = brain.followups.filter(f => f.cat !== id);
    brain.interests = brain.interests.filter(i => i !== id);
    brain.custom = brain.custom.filter(q => q.cat !== id);
  }

  // a neuron becomes a brain of its own: same interview, its own categories and files, tied back to the neuron by a synapse
  function growBrain(s) {
    const nb = emptyBrain('b_' + uid(), s.name); nb.origin = { brain: brain.id, sub: s.id }; nb.color = catById(s.cat)?.color || nb.color;
    const me = nb.subjects[0]; me.name = s.name; me.desc = s.desc || `${s.name}, grown from ${brainLabel(brain)}.`;
    const nameQ = Q.questions.find(q => q.first); const e = { id: uid(), kind: 'answer', cat: 'you', sub: 'me', lead: 'Name', text: s.name, q: nameQ?.id || 'name', created: today() };
    nb.entries.push(e); if (nameQ) nb.answered[nameQ.id] = [e.id];
    net.brains.push(nb); s.brainId = nb.id;
    addLink({ b: brain.id, s: s.id }, { b: nb.id, s: 'me' }, 'same person', `${s.name} is a neuron in ${brainLabel(brain)} and the centre of their own.`, 3);
    save(); switchBrain(nb.id, `This is ${s.name}'s brain. Answer as ${s.name}, or as well as you know them.`);
  }
  function switchBrain(id, ack) {
    const b = brainById(id); if (!b) return;
    net.active = id; brain = b; clearSelection(); graph.rebuild(true); graph.fit(); renderCats(); renderModal(); renderBrainSwitch();
    iv.classList.toggle('paused', brain.paused); $('iv-pause').textContent = brain.paused ? 'Resume' : 'Pause';
    advance(ack || (b.origin ? `Back in ${b.name}'s brain.` : `Back in your brain, ${b.name}.`)); save();
  }
  function renderBrainSwitch() {
    const btn = $('brain-switch'), menu = $('brain-menu');
    btn.hidden = net.brains.length < 2;
    btn.innerHTML = `<span class="sw" style="background:${esc(brain.color)}"></span>${esc(brainLabel(brain))} <span class="caret">▾</span>`;
    const depth = b => { let d = 0, cur = b; while (cur?.origin && d < 12) { cur = brainById(cur.origin.brain); d++; } return d; };
    menu.innerHTML = net.brains.map(b => `<button role="menuitem" data-brain="${esc(b.id)}" class="${b === brain ? 'on' : ''}" style="padding-left:${10 + depth(b) * 14}px"><span class="sw" style="background:${esc(b.color)}"></span>${esc(brainLabel(b))}<span class="n">${b.subjects.length - 1}</span></button>`).join('');
    menu.querySelectorAll('[data-brain]').forEach(x => x.addEventListener('click', () => { menu.hidden = true; switchBrain(x.dataset.brain); }));
    document.title = net.brains.length > 1 ? `MindBlown: Build — ${brainLabel(brain)}` : 'MindBlown: Build — grow your own brain';
    $('m-delete-brain').hidden = !brain.origin;
  }
  async function deleteBrain(b) {
    const n = b.subjects.length - 1, files = b.entries.filter(isFile);
    if (!(await confirmDlg(`Delete ${brainLabel(b)}?`, `${pw(n, 'neuron')}, ${pw(b.entries.length, 'synapse')} and ${pw(files.length, 'file')} go with it. The neuron it grew from stays.`, 'Delete brain'))) return;
    files.forEach(e => { store.delFile(e.id); revoke(e.id); });
    net.links = net.links.filter(l => l.a.b !== b.id && l.b.b !== b.id);
    net.brains.forEach(o => { if (o.origin?.brain === b.id) o.origin = null; o.subjects.forEach(s => { if (s.brainId === b.id) delete s.brainId; }); });
    const back = b.origin?.brain && brainById(b.origin.brain) ? b.origin.brain : net.brains[0].id;
    net.brains = net.brains.filter(o => o !== b);
    switchBrain(back, `${b.name}'s brain is gone.`);
  }

  // object URLs for file previews
  const urlCache = new Map();
  async function fileUrl(id) {
    if (urlCache.has(id)) return urlCache.get(id);
    const blob = await store.getFile(id); if (!blob) return null;
    const u = URL.createObjectURL(blob); urlCache.set(id, u); return u;
  }
  function revoke(id) { const u = urlCache.get(id); if (u) { URL.revokeObjectURL(u); urlCache.delete(id); } }

  // ---------- questions ----------
  const fill = (t, vars) => t.replace(/\{(name|item|sub|cat|answer)\}/g, (_, k) => vars[k] ?? (k === 'name' ? (brain.name || 'friend') : ''));
  function allQuestions() {
    const list = [];
    Q.questions.forEach(q => { if (catById(q.cat)) list.push({ ...q, source: 'default' }); });
    brain.custom.forEach(q => list.push({ ...q, source: 'custom' }));
    brain.cats.filter(c => c.custom).forEach(c => Q.categoryTemplates.forEach((t, i) => list.push({ id: `gen:cat:${c.id}:${i}`, cat: c.id, sub: c.name, type: t.type, list: !!t.list, then: t.then, text: fill(t.text, { cat: c.name }), source: 'category' })));
    brain.subjects.filter(s => s.starred).forEach(s => Q.subjectTemplates.forEach((t, i) => list.push({ id: `gen:sub:${s.id}:${i}`, cat: s.cat, subId: s.id, sub: s.name, type: t.type, text: fill(t.text, { sub: s.name }), source: 'starred' })));
    brain.followups.forEach(f => list.push({ ...f, source: 'follow-up' }));
    return list;
  }
  const qEnabled = q => !brain.disabled.includes(q.id) && (catById(q.cat)?.enabled ?? false);
  const qAnswered = q => !!brain.answered[q.id];
  const interestOf = q => brain.interests.includes(q.cat) || (q.subId && brain.interests.includes('sub:' + q.subId)) || q.source === 'starred';

  let current = null, mode = 'question'; // question | interests | empty | name
  function nextQuestion() {
    if (!brain.name) return Q.questions.find(q => q.first);
    const pool = allQuestions().filter(q => !q.first && qEnabled(q) && !qAnswered(q) && !(brain.skipped[q.id] !== undefined && brain.asks - brain.skipped[q.id] < 6));
    if (!pool.length) {
      const stale = allQuestions().filter(q => !q.first && qEnabled(q) && !qAnswered(q));
      if (stale.length) { brain.skipped = {}; return stale[Math.floor(Math.random() * stale.length)]; }
      return null;
    }
    const fu = pool.filter(q => q.source === 'follow-up');
    const recentFu = brain.history.slice(-3).filter(h => h.followup).length;
    if (fu.length && recentFu < 3) return fu[0];
    const perCat = {}; brain.entries.forEach(e => { perCat[e.cat] = (perCat[e.cat] || 0) + 1; });
    const maxCat = Math.max(1, ...Object.values(perCat));
    const total = brain.entries.length;
    let best = null, bestS = -Infinity;
    pool.forEach(q => {
      let s = 1 + Math.random() * 0.7;
      if (interestOf(q)) s += 3;
      s += 1 - (perCat[q.cat] || 0) / maxCat;
      if (q.cat === brain.lastCat) s -= 1.5;
      if (q.cat === 'you') s += total < 5 ? 1.5 : -0.5;
      if (q.type === 'files') s -= (perCat[q.cat] || 0) < 2 ? 1.2 : 0;
      if (q.source === 'custom') s += 0.6;
      if (s > bestS) { bestS = s; best = q; }
    });
    return best;
  }

  // ---------- interview card ----------
  const iv = $('interview'), ivQ = $('iv-q'), ivAck = $('iv-ack'), ivCtx = $('iv-ctx'), ivOpts = $('iv-opts'), ivFiles = $('iv-files'), ivInput = $('iv-input'), ivAnswer = $('iv-answer'), ivTools = iv.querySelector('.iv-tools'), ivInterests = $('iv-interests'), ivEmpty = $('iv-empty'), ivCount = $('iv-count');
  let pendingFiles = [];
  function showQuestion(q, ack) {
    current = q; mode = q ? (q.first ? 'name' : 'question') : 'empty';
    ivAck.textContent = ack || '';
    [ivOpts, ivFiles, ivInterests, ivEmpty].forEach(el => el.hidden = true); ivInput.hidden = false; ivTools.hidden = false;
    ivQ.classList.remove('fade'); void ivQ.offsetWidth; ivQ.classList.add('fade');
    if (!q) { ivQ.textContent = brain.paused ? 'Interview paused.' : 'That is everything I have for now.'; ivCtx.innerHTML = ''; ivInput.hidden = true; ivTools.hidden = true; if (!brain.paused) ivEmpty.hidden = false; return; }
    const c = catById(q.cat);
    ivQ.textContent = fill(q.text, { sub: q.sub, cat: c?.name });
    ivCtx.innerHTML = c ? `<span class="sw" style="background:${c.color};color:${c.color}"></span>${esc(c.name)}${q.sub ? ' · ' + esc(q.sub) : ''}${q.source === 'follow-up' ? ' · follow-up' : q.source === 'starred' ? ' · starred' : ''}${brain.origin ? ` · ${esc(brain.name)}'s brain` : ''}` : '';
    ivAnswer.value = ''; ivAnswer.style.height = 'auto';
    ivAnswer.placeholder = q.type === 'list' && q.list ? 'Separate items with commas…' : q.type === 'date' ? 'A date, a year, or roughly when…' : q.type === 'files' ? 'Optional note about these files…' : 'Type your answer…';
    if (q.type === 'choice') { ivOpts.hidden = false; ivOpts.innerHTML = q.options.map(o => `<button type="button" data-v="${esc(o)}">${esc(o)}</button>`).join(''); ivOpts.querySelectorAll('button').forEach(b => b.addEventListener('click', () => answer(b.dataset.v))); }
    if (q.type === 'files') { ivFiles.hidden = false; pendingFiles = []; renderPendingFiles(); }
    $('iv-never').hidden = q.first; $('iv-skip').hidden = q.first; $('iv-more').hidden = q.first || !q.sub;
    if (!mobile()) setTimeout(() => ivAnswer.focus(), 50);
    updateCount();
  }
  function updateCount() {
    const all = allQuestions().filter(q => !q.first && qEnabled(q));
    const left = all.filter(q => !qAnswered(q)).length;
    ivCount.textContent = `${left} to go · ${Object.keys(brain.answered).length} answered`;
  }
  function advance(ack) {
    if (brain.paused) { showQuestion(null); return; }
    if (brain.name && !brain.interestsChosen) { showInterests(ack); return; }
    showQuestion(nextQuestion(), ack);
  }
  const randomAck = () => Q.acks[Math.floor(Math.random() * Q.acks.length)];

  function splitList(t) { return t.split(/\s*(?:,|;|\n|\band\b)\s*/i).map(s => s.trim().replace(/^(my|the)\s+/i, m => m)).filter(s => s.length > 0 && s.length < 60); }
  const gist = q => fill(q.text, { sub: q.sub, cat: catById(q.cat)?.name }).replace(/^(Hello\.|Nice to meet you, [^.]+\.)\s*/i, '').replace(/\s*(List them.*|Give me.*|Names,.*|A few words.*|Separate.*|Tell me their names\.)$/i, '').trim();

  async function answer(text) {
    const q = current; if (!q) return;
    text = (text ?? ivAnswer.value).trim();
    if (q.type !== 'files' && !text) { ivAnswer.focus(); return; }
    const c = catById(q.cat);
    const ids = [];
    if (q.first) {
      brain.name = text.replace(/^(i am|i'm|my name is|call me|it's|its)\s+/i, '').replace(/[.!]+$/, '').trim() || text;
      const me = subById('me'); me.name = brain.name;
      ids.push(addEntry({ cat: 'you', sub: 'me', lead: 'Name', text: brain.name, q: q.id }).id);
    } else if (q.type === 'files') {
      if (!pendingFiles.length && !text) { toast('Add at least one file, or skip this question.'); return; }
      const target = ensureSubject(q);
      for (const f of pendingFiles) ids.push((await attachFile(f, q.cat, target?.id || null, q.id)).id);
      if (text) ids.push(addEntry({ cat: q.cat, sub: target?.id || null, kind: 'note', lead: gist(q), text, q: q.id }).id);
      pendingFiles = [];
    } else if (q.type === 'list' && q.list) {
      const items = splitList(text);
      const spawned = items.map(it => addSubject(q.cat, it[0].toUpperCase() + it.slice(1), gist(q)));
      if (q.sub) ids.push(addEntry({ cat: q.cat, sub: ensureSubject(q).id, lead: gist(q), text, q: q.id }).id);
      else if (!spawned.length) ids.push(addEntry({ cat: q.cat, sub: null, lead: gist(q), text, q: q.id }).id);
      spawned.forEach(s => { if (!brain.entries.some(e => e.sub === s.id)) ids.push(addEntry({ cat: q.cat, sub: s.id, lead: gist(q), text: s.name, q: q.id }).id); });
      if (q.then) spawned.slice(0, 6).forEach(s => q.then.forEach(t => brain.followups.push({ id: 'fu:' + uid(), cat: q.cat, sub: s.name, subId: s.id, type: 'long', text: fill(t, { item: s.name, cat: c?.name }), parent: q.id })));
    } else {
      const target = ensureSubject(q);
      ids.push(addEntry({ cat: q.cat, sub: target?.id || null, lead: gist(q), text, q: q.id }).id);
      if (q.then) q.then.forEach(t => brain.followups.push({ id: 'fu:' + uid(), cat: q.cat, sub: q.sub, subId: target?.id, type: 'long', text: fill(t, { answer: text, item: text }), parent: q.id }));
    }
    brain.answered[q.id] = ids;
    brain.followups = brain.followups.filter(f => f.id !== q.id);
    brain.history.push({ at: new Date().toISOString(), q: fill(q.text, { sub: q.sub }), a: text, cat: q.cat, entries: ids, followup: q.source === 'follow-up' });
    brain.asks++; brain.lastCat = q.cat;
    save(); graph.rebuild(); renderCats(); if (selected) refreshPanel();
    if (!selected) graph.ensureVisible(ids.map(id => brain.entries.find(e => e.id === id)?.sub).filter(Boolean));
    advance(q.first ? `Good to meet you, ${brain.name}.` : randomAck());
  }
  // the neuron an answer lands on: the question's subject (created on demand), or the centre for identity
  function ensureSubject(q) {
    if (q.subId && subById(q.subId)) return subById(q.subId);
    if (q.cat === 'you' && (!q.sub || q.sub === 'Me')) return subById('me');
    if (!q.sub) return null;
    return addSubject(q.cat, q.sub);
  }
  async function attachFile(file, cat, sub, qid) {
    const e = addEntry({ cat, sub, kind: 'file', lead: 'File', text: file.name, fileName: file.name, fileType: file.type || 'application/octet-stream', fileSize: file.size, q: qid || null });
    await store.putFile(e.id, file);
    return e;
  }

  $('iv-send').addEventListener('click', () => answer());
  ivAnswer.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); answer(); } });
  ivAnswer.addEventListener('input', () => { ivAnswer.style.height = 'auto'; ivAnswer.style.height = Math.min(180, ivAnswer.scrollHeight) + 'px'; });
  $('iv-skip').addEventListener('click', () => { if (!current) return; brain.skipped[current.id] = brain.asks; brain.asks++; save(); advance('Skipped. I will come back to it.'); });
  $('iv-never').addEventListener('click', () => { if (!current) return; if (current.source === 'follow-up') brain.followups = brain.followups.filter(f => f.id !== current.id); else brain.disabled.push(current.id); brain.asks++; save(); advance('Turned off. You can turn it back on under Questions.'); });
  $('iv-more').addEventListener('click', () => { if (!current) return; const s = ensureSubject(current); if (!s) return; s.starred = true; if (!brain.interests.includes(current.cat)) brain.interests.push(current.cat); save(); graph.rebuild(); renderCats(); toast(`I will ask more about ${s.name}.`); updateCount(); });
  $('iv-pause').addEventListener('click', () => { brain.paused = !brain.paused; iv.classList.toggle('paused', brain.paused); $('iv-pause').textContent = brain.paused ? 'Resume' : 'Pause'; $('iv-pause').setAttribute('aria-pressed', String(brain.paused)); save(); if (brain.paused) showQuestion(null); else advance(); });
  $('iv-open-questions').addEventListener('click', () => openModal());
  $('iv-new-cat').addEventListener('click', () => newCategory());

  // interview file drop
  const drop = ivFiles.querySelector('.drop'), ivFileInput = $('iv-file-input');
  ivFileInput.addEventListener('change', () => { pendingFiles.push(...ivFileInput.files); ivFileInput.value = ''; renderPendingFiles(); });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { pendingFiles.push(...e.dataTransfer.files); renderPendingFiles(); });
  function renderPendingFiles() {
    const el = $('iv-file-list');
    el.innerHTML = pendingFiles.map((f, i) => `<span class="filechip">${/^image\//.test(f.type) ? `<img alt="" src="${URL.createObjectURL(f)}">` : ''}<span class="nm">${esc(f.name)}</span><button class="x" data-i="${i}" aria-label="Remove">×</button></span>`).join('');
    el.querySelectorAll('.x').forEach(b => b.addEventListener('click', () => { pendingFiles.splice(+b.dataset.i, 1); renderPendingFiles(); }));
  }

  // ---------- interests picker ----------
  function showInterests(ack) {
    mode = 'interests'; current = null;
    ivAck.textContent = ack || `Good to meet you, ${brain.name}.`;
    ivQ.textContent = brain.origin ? `What should I ask about ${brain.name} most?` : 'What would you like me to ask about most?'; ivCtx.innerHTML = '';
    [ivOpts, ivFiles, ivEmpty].forEach(el => el.hidden = true); ivInput.hidden = true; ivTools.hidden = true; ivInterests.hidden = false;
    renderChips($('interest-chips'));
  }
  function renderChips(el, removable = false) {
    const chips = brain.cats.filter(c => c.id !== 'you').map(c => ({ key: c.id, name: c.name, color: c.color, on: brain.interests.includes(c.id), custom: c.custom }))
      .concat(brain.subjects.filter(s => s.starred).map(s => ({ key: 'sub:' + s.id, name: s.name, color: catById(s.cat)?.color || '#999', on: true, star: true })));
    el.innerHTML = chips.map(c => `<button type="button" class="chip${c.on ? ' on' : ''}" data-k="${esc(c.key)}"><span class="sw" style="background:${c.color}"></span>${c.star ? '★ ' : ''}${esc(c.name)}${removable && c.custom ? '<span class="x" data-x="1" title="Delete category">×</span>' : ''}</button>`).join('');
    el.querySelectorAll('.chip').forEach(b => b.addEventListener('click', async e => {
      const k = b.dataset.k;
      if (e.target.dataset.x) { const c = catById(k); if (await confirmDlg(`Delete “${c.name}”?`, 'Its neurons, answers and files go with it.')) { removeCategory(k); save(); graph.rebuild(); renderCats(); renderModal(); renderChips(el, removable); } return; }
      if (k.startsWith('sub:')) { const s = subById(k.slice(4)); if (s) s.starred = false; }
      else if (brain.interests.includes(k)) brain.interests = brain.interests.filter(x => x !== k); else brain.interests.push(k);
      save(); renderChips(el, removable); if (el !== $('interest-chips')) renderChips($('interest-chips')); updateCount();
    }));
  }
  function addInterest(name) {
    name = name.trim(); if (!name) return;
    const c = addCategory(name); if (!brain.interests.includes(c.id)) brain.interests.push(c.id);
    save(); graph.rebuild(); renderCats(); toast(c.custom ? `New category “${c.name}”. I have questions ready for it.` : `“${c.name}” is now an interest.`);
  }
  $('interest-add').addEventListener('submit', e => { e.preventDefault(); addInterest($('interest-new').value); $('interest-new').value = ''; renderChips($('interest-chips')); });
  $('interest-done').addEventListener('click', () => { brain.interestsChosen = true; save(); advance(brain.interests.length ? 'Noted. I will lean that way.' : 'No preference, so I will roam.'); });

  // ---------- categories list ----------
  const catList = $('cat-list');
  function renderCats() {
    const cats = brain.cats;
    $('cats-n').textContent = cats.length;
    catList.innerHTML = cats.map(c => {
      const ns = subsOf(c.id).length, ne = brain.entries.filter(e => e.cat === c.id).length;
      return `<button class="lobe${c.enabled ? '' : ' off'}" data-id="${esc(c.id)}" title="${c.enabled ? 'Open' : 'Questions off · open'}"><span class="sw" style="background:${c.color};color:${c.color}"></span><span>${esc(c.name)}</span>${brain.interests.includes(c.id) ? '<span class="star">★</span>' : '<span></span>'}<span class="n">${ne ? `${ns}·${ne}` : ns ? `${ns}` : '—'}</span></button>`;
    }).join('');
    catList.querySelectorAll('.lobe').forEach(b => b.addEventListener('click', () => selectCat(b.dataset.id)));
  }
  $('add-cat').addEventListener('click', () => newCategory());
  async function newCategory() {
    const name = await promptDlg('Name the new category', '', 'Create'); if (!name) return;
    const c = addCategory(name); save(); graph.rebuild(); renderCats(); renderModal(); selectCat(c.id);
    toast(`“${c.name}” added, with questions ready.`);
  }
  $('cats-head').addEventListener('click', () => { if (mobile()) document.body.classList.toggle('cats-open'); });
  $('level').addEventListener('click', () => { if (mobile()) document.body.classList.toggle('cats-open'); });
  $('explode-all').addEventListener('change', e => { graph.forceExplode = e.target.checked; });

  // ---------- detail panel ----------
  const panel = $('panel'), panelBody = $('panel-body');
  let selected = null; // { kind: 'cat'|'sub', id }
  $('panel-close').addEventListener('click', clearSelection);
  function clearSelection() { selected = null; panel.hidden = true; graph.selected = null; }
  function selectCat(id) { selected = { kind: 'cat', id }; graph.selected = null; graph.focusCat(id); refreshPanel(); panel.hidden = false; document.body.classList.remove('cats-open'); }
  function selectSub(id, noZoom) { const s = subById(id); if (!s) return; selected = { kind: 'sub', id }; graph.selected = graph.nodeFor(id); if (!noZoom) graph.zoomToSub(id); refreshPanel(); panel.hidden = false; document.body.classList.remove('cats-open'); }
  async function refreshPanel() {
    if (!selected) return;
    if (selected.kind === 'cat') { const c = catById(selected.id); if (!c) return clearSelection(); return renderCatPanel(c); }
    const s = subById(selected.id); if (!s) return clearSelection(); renderSubPanel(s);
  }
  function entryHtml(e) {
    if (isFile(e)) return '';
    const safeHref = u => /^https?:\/\/\S+$/i.test(u) ? u : null; // only web links become anchors; anything else renders as text
    const txt = e.kind === 'link' && safeHref(e.text) ? `<a href="${esc(e.text)}" target="_blank" rel="noopener noreferrer">${esc(e.text)}</a>` : esc(e.text);
    return `<li class="entry" data-id="${esc(e.id)}"><div class="lead">${esc(e.lead || (e.kind === 'note' ? 'Note' : e.kind === 'link' ? 'Link' : 'Answer'))}</div><div class="txt">${txt}</div><span class="ops"><button data-op="edit" title="Edit">✎</button><button data-op="del" title="Delete">×</button></span></li>`;
  }
  async function filesHtml(list) {
    if (!list.length) return '';
    const parts = await Promise.all(list.map(async e => {
      const u = isImage(e) ? await fileUrl(e.id) : null;
      const ext = (e.fileName.split('.').pop() || 'file').slice(0, 5).toUpperCase();
      return `<a class="file" data-id="${esc(e.id)}" href="#" title="${esc(e.fileName)}">${u ? `<img alt="${esc(e.fileName)}" src="${u}"><span class="cap">${esc(e.fileName)}</span>` : `<span class="ext">${esc(ext)}</span><span class="nm">${esc(e.fileName)}</span>`}<button class="del" data-del="${esc(e.id)}" title="Delete file">×</button></a>`;
    }));
    return `<div class="files">${parts.join('')}</div>`;
  }
  const adderHtml = `<div class="add-row"><button data-add="note">+ Note</button><button data-add="link">+ Link</button><button data-add="file">+ Files</button><span class="slot"></span></div><label class="drop" data-dropzone><span>Drop pictures or documents here</span></label>`;

  async function renderSubPanel(s) {
    const c = catById(s.cat); const es = entriesOf(s.id); const files = es.filter(isFile), notes = es.filter(e => !isFile(e));
    const me = s.id === 'me';
    const grown = s.brainId ? brainById(s.brainId) : null, origin = me && brain.origin ? brainById(brain.origin.brain) : null;
    const conns = linksOf(s.id);
    let h = `<div class="kind"><span class="sw" style="background:${c.color};color:${c.color}"></span>${me ? 'centre' : 'neuron'} · ${esc(c.name)}${grown ? ' · own brain' : origin ? ` · grown from ${esc(brainLabel(origin))}` : ''}</div>`;
    h += `<h2 contenteditable="true" spellcheck="false" id="p-title" title="Click to rename">${esc(s.name)}</h2>`;
    h += `<p class="desc" id="p-desc" contenteditable="true" data-ph="Add a line about this…">${esc(s.desc || '')}</p>`;
    h += `<div class="ptools">${me ? '' : `<button data-t="star" class="${s.starred ? 'on' : ''}" title="Ask me more about this">★ ${s.starred ? 'Asking more' : 'Ask me more'}</button>`}`;
    h += grown ? `<button data-t="open-brain" class="brainy" title="Open this neuron's own brain">Open ${esc(s.name)}'s brain →</button>` : origin ? `<button data-t="back" title="Return to the brain this one grew from">← ${esc(brainLabel(origin))}</button>` : me ? '' : `<button data-t="grow" class="brainy" title="Give this neuron a brain of its own, connected to this one">Grow into a brain</button>`;
    h += `${me ? '' : '<button data-t="move">Move to…</button><button data-t="del" class="danger">Delete</button>'}</div>`;
    h += `<div class="meta"><span>${pw(notes.length, 'synapse')}</span><span>${pw(conns.length, 'connection')}</span><span>${pw(files.length, 'file')}</span><span>added ${esc(s.created)}</span></div>`;
    h += `<div class="pa">`;
    h += `<h3>Synapses <span>${notes.length}</span></h3>`;
    h += notes.length ? `<ul>${notes.map(entryHtml).join('')}</ul>` : `<div class="empty">Nothing here yet. Answer a question about it, or add a note.</div>`;
    h += `<h3>Connections <span>${conns.length}</span></h3>`;
    h += conns.length ? `<ul class="links">${conns.map(l => linkHtml(l, s.id)).join('')}</ul>` : `<div class="empty">No connections yet. Link ${esc(s.name)} to anything else in your network and say how they relate.</div>`;
    h += `<div class="add-row"><button data-add="link">+ Connect to…</button><button data-add="link-pick" title="Then click another neuron on the canvas">Pick on canvas</button><span class="slot-link"></span></div>`;
    h += `<h3>Files <span>${files.length}</span></h3>` + (files.length ? await filesHtml(files) : `<div class="empty">Pictures, documents, anything.</div>`);
    h += adderHtml + `</div>`;
    panelBody.innerHTML = h; wirePanel({ cat: s.cat, sub: s.id }); wireLinks(s);
    panelBody.querySelector('[data-t=grow]')?.addEventListener('click', async () => { if (await ask({ title: `Grow ${s.name} into a brain?`, text: `${s.name} becomes the centre of a new brain with its own categories, questions and files. It stays connected to this neuron by a synapse, and you can switch between brains any time.`, ok: 'Grow' })) growBrain(s); });
    panelBody.querySelector('[data-t=open-brain]')?.addEventListener('click', () => switchBrain(s.brainId));
    panelBody.querySelector('[data-t=back]')?.addEventListener('click', () => switchBrain(brain.origin.brain));
    const title = $('p-title');
    title.addEventListener('blur', () => { const v = title.textContent.trim(); if (v && v !== s.name) { renameSubject(s, v); save(); graph.rebuild(); renderCats(); renderBrainSwitch(); } else title.textContent = s.name; });
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
    const desc = $('p-desc');
    desc.addEventListener('blur', () => { const v = desc.textContent.trim(); if (v !== (s.desc || '')) { s.desc = v; save(); } });
    panelBody.querySelector('[data-t=star]')?.addEventListener('click', () => { s.starred = !s.starred; if (s.starred && !brain.interests.includes(s.cat)) brain.interests.push(s.cat); save(); refreshPanel(); renderCats(); updateCount(); toast(s.starred ? `I will ask more about ${s.name}.` : `Fewer questions about ${s.name}.`); });
    panelBody.querySelector('[data-t=move]')?.addEventListener('click', async () => {
      const names = brain.cats.map(c2 => c2.name);
      const v = await promptDlg(`Move “${s.name}” to which category?`, c.name, 'Move'); if (!v) return;
      let target = brain.cats.find(c2 => c2.name.toLowerCase() === v.toLowerCase()) || addCategory(v);
      s.cat = target.id; entriesOf(s.id).forEach(e => e.cat = target.id); save(); graph.rebuild(); renderCats(); refreshPanel(); toast(`Moved to ${target.name}.` + (names.includes(target.name) ? '' : ' New category created.'));
    });
    panelBody.querySelector('[data-t=del]')?.addEventListener('click', async () => { if (await confirmDlg(`Delete “${s.name}”?`, `${pw(notes.length, 'synapse')}, ${pw(conns.length, 'connection')} and ${pw(files.length, 'file')} go with it.${grown ? ` ${s.name}'s brain stays in the network on its own.` : ''}`)) { removeSubject(s.id); save(); graph.rebuild(); renderCats(); renderBrainSwitch(); clearSelection(); } });
    panel.scrollTop = 0;
  }
  // a neuron, the brain it grew and the neuron a brain grew from all share one name
  function renameSubject(s, v) {
    s.name = v;
    if (s.id === 'me') { brain.name = v; if (brain.origin) { const o = endOf(brain.origin).sub; if (o) o.name = v; } }
    if (s.brainId) { const b = brainById(s.brainId); if (b) { b.name = v; const m = b.subjects.find(x => x.id === 'me'); if (m) m.name = v; } }
  }

  // ---------- connections between neurons ----------
  const strengthName = v => v >= 3 ? 'strong' : v <= 1 ? 'faint' : '';
  function linkHtml(l, sid) {
    const o = otherEnd(l, sid), { brain: ob, sub: os } = endOf(o);
    if (!os) return '';
    const away = ob !== brain, col = away ? ob.color : (catById(os.cat)?.color || '#9aa');
    return `<li class="nb link" data-link="${esc(l.id)}" data-to-brain="${esc(o.b)}" data-to-sub="${esc(o.s)}"><span class="sw" style="background:${esc(col)}"></span><span class="t"><b>${esc(l.label)}</b> → ${esc(os.name)}${away ? ` <span class="far">in ${esc(brainLabel(ob))}</span>` : ''}<span class="note">${esc(l.notes || '')}${l.notes && strengthName(l.strength) ? ' · ' : ''}${strengthName(l.strength)}</span></span><span class="ops"><button data-op="edit" title="Edit connection">✎</button><button data-op="del" title="Remove connection">×</button></span></li>`;
  }
  // every neuron a connection could go to: this brain grouped by category, then the other brains
  function targetOptions(sid, chosen) {
    const opt = (b, s2) => `<option value="${esc(b.id)}|${esc(s2.id)}" ${chosen && chosen.b === b.id && chosen.s === s2.id ? 'selected' : ''}>${esc(s2.name)}</option>`;
    let h = brain.cats.map(c => { const subs = subsOf(c.id).filter(s2 => s2.id !== sid); return subs.length ? `<optgroup label="${esc(c.name)}">${subs.map(s2 => opt(brain, s2)).join('')}</optgroup>` : ''; }).join('');
    net.brains.filter(b => b !== brain).forEach(b => { h += `<optgroup label="${esc(brainLabel(b))}">${b.subjects.map(s2 => opt(b, s2)).join('')}</optgroup>`; });
    return h;
  }
  function linkForm(s, existing) {
    const old = panelBody.querySelector('.adder'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'adder link-form';
    const chosen = existing ? otherEnd(existing, s.id) : null;
    box.innerHTML = `<label>Connect ${esc(s.name)} to<select data-f="to"><option value="">Choose a neuron…</option>${targetOptions(s.id, chosen)}</select></label>
      <label>How are they connected?<input data-f="label" placeholder="mother of · works with · lives at · inspired by…" maxlength="120" value="${esc(existing?.label || '')}"></label>
      <label>Anything about this connection<textarea data-f="notes" rows="3" placeholder="How you met, what you share, dates, the story…">${esc(existing?.notes || '')}</textarea></label>
      <label>Strength<select data-f="strength"><option value="1" ${existing?.strength === 1 ? 'selected' : ''}>Faint</option><option value="2" ${!existing || existing.strength === 2 ? 'selected' : ''}>Normal</option><option value="3" ${existing?.strength === 3 ? 'selected' : ''}>Strong</option></select></label>
      <div class="row"><button data-c>Cancel</button><button data-ok class="primary">${existing ? 'Save' : 'Connect'}</button></div>`;
    panelBody.querySelector('.slot-link').closest('.add-row').insertAdjacentElement('afterend', box);
    const f = k => box.querySelector(`[data-f=${k}]`);
    (existing ? f('label') : f('to')).focus();
    box.querySelector('[data-c]').addEventListener('click', () => box.remove());
    box.querySelector('[data-ok]').addEventListener('click', () => {
      const [tb, ts] = f('to').value.split('|'); if (!tb || !ts) { f('to').focus(); return; }
      const label = f('label').value.trim() || 'connected to', notes = f('notes').value.trim(), strength = +f('strength').value || 2;
      if (existing) { const to = { b: tb, s: ts }; const mine = endAt(existing, brain.id, s.id); existing[mine === 'a' ? 'b' : 'a'] = to; existing.label = label; existing.notes = notes; existing.strength = strength; }
      else addLink({ b: brain.id, s: s.id }, { b: tb, s: ts }, label, notes, strength);
      save(); graph.rebuild(); refreshPanel(); toast(existing ? 'Connection updated.' : `Connected to ${endOf({ b: tb, s: ts }).sub?.name || 'it'}.`);
    });
  }
  function wireLinks(s) {
    panelBody.querySelectorAll('.links [data-link]').forEach(li => {
      const l = net.links.find(x => x.id === li.dataset.link); if (!l) return;
      li.addEventListener('click', e => {
        if (e.target.closest('[data-op]')) return;
        const tb = li.dataset.toBrain, ts = li.dataset.toSub;
        if (tb !== brain.id) { switchBrain(tb); setTimeout(() => selectSub(ts), 60); } else selectSub(ts);
      });
      li.querySelector('[data-op=edit]').addEventListener('click', e => { e.stopPropagation(); linkForm(s, l); });
      li.querySelector('[data-op=del]').addEventListener('click', async e => { e.stopPropagation(); if (await confirmDlg('Remove this connection?', `${l.label} → ${endOf(otherEnd(l, s.id)).sub?.name || ''}`, 'Remove')) { removeLink(l.id); save(); graph.rebuild(); refreshPanel(); } });
    });
    panelBody.querySelector('[data-add=link]').addEventListener('click', () => linkForm(s, null));
    panelBody.querySelector('[data-add=link-pick]').addEventListener('click', () => { if (brain.subjects.length < 2) { toast('Nothing else to connect to yet.'); return; } graph.linkFrom = s.id; toast(`Click the neuron to connect ${s.name} to. Esc cancels.`); });
  }
  // the canvas picked a target: make the connection and open its details
  async function linkPicked(fromId, toId) {
    const a = subById(fromId), b = subById(toId); if (!a || !b || a === b) return;
    const label = await promptDlg(`How is ${a.name} connected to ${b.name}?`, '', 'Connect'); if (label === null) return;
    addLink({ b: brain.id, s: a.id }, { b: brain.id, s: b.id }, label || 'connected to', '', 2);
    save(); graph.rebuild(); selectSub(a.id, true); toast(`${a.name} → ${b.name}. Add notes under Connections.`);
  }
  async function renderCatPanel(c) {
    const subs = subsOf(c.id); const es = catEntries(c.id); const files = es.filter(isFile), notes = es.filter(e => !isFile(e));
    const total = brain.entries.filter(e => e.cat === c.id).length;
    let h = `<div class="kind"><span class="sw" style="background:${c.color};color:${c.color}"></span>category</div>`;
    h += `<h2 contenteditable="true" spellcheck="false" id="p-title" title="Click to rename">${esc(c.name)}</h2>`;
    h += `<div class="ptools"><button data-t="ask" class="${c.enabled ? 'on' : ''}">${c.enabled ? 'Asking about this' : 'Questions off'}</button><button data-t="star" class="${brain.interests.includes(c.id) ? 'on' : ''}">★ Interest</button>${c.id === 'you' ? '' : '<button data-t="del" class="danger">Delete</button>'}<span class="swatches">${[c.color, ...Q.palette.slice(0, 7)].filter((x, i, a) => a.indexOf(x) === i).map(col => `<button data-col="${col}" class="${col === c.color ? 'on' : ''}" style="background:${col}" title="Colour"></button>`).join('')}</span></div>`;
    h += `<div class="meta"><span>${pw(subs.length, 'neuron')}</span><span>${pw(total, 'synapse')}</span><span>${allQuestions().filter(q => q.cat === c.id && qEnabled(q) && !qAnswered(q)).length} questions left</span></div>`;
    h += `<div class="pa">`;
    h += `<h3>Neurons <span>${subs.length}</span></h3>`;
    h += subs.length ? `<ul class="sub-list">${subs.map(s => `<li class="nb" data-sub="${esc(s.id)}"><span class="sw" style="background:${c.color}"></span><span class="t">${s.starred ? '★ ' : ''}${esc(s.name)}<span class="note">${esc(s.desc || '')}</span></span><span class="w">${entriesOf(s.id).length}</span></li>`).join('')}</ul>` : `<div class="empty">No neurons yet. Answer a question in this category, or add one.</div>`;
    h += `<div class="add-row"><button data-add="sub">+ New neuron</button></div>`;
    h += `<h3>Notes about ${esc(c.name)} <span>${notes.length}</span></h3>` + (notes.length ? `<ul>${notes.map(entryHtml).join('')}</ul>` : `<div class="empty">Anything that belongs to the whole category.</div>`);
    h += `<h3>Files <span>${files.length}</span></h3>` + (files.length ? await filesHtml(files) : `<div class="empty">Pictures, documents, anything.</div>`);
    h += adderHtml + `</div>`;
    panelBody.innerHTML = h; wirePanel({ cat: c.id, sub: null });
    const title = $('p-title');
    title.addEventListener('blur', () => { const v = title.textContent.trim(); if (v && v !== c.name) { c.name = v; save(); graph.rebuild(); renderCats(); renderModal(); } else title.textContent = c.name; });
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
    panelBody.querySelectorAll('[data-sub]').forEach(el => el.addEventListener('click', () => selectSub(el.dataset.sub)));
    panelBody.querySelector('[data-t=ask]').addEventListener('click', () => { c.enabled = !c.enabled; save(); refreshPanel(); renderCats(); renderModal(); updateCount(); if (mode === 'question' && current?.cat === c.id && !c.enabled) advance(); });
    panelBody.querySelector('[data-t=star]').addEventListener('click', () => { brain.interests = brain.interests.includes(c.id) ? brain.interests.filter(x => x !== c.id) : [...brain.interests, c.id]; save(); refreshPanel(); renderCats(); });
    panelBody.querySelector('[data-t=del]')?.addEventListener('click', async () => { if (await confirmDlg(`Delete “${c.name}”?`, `${pw(subs.length, 'neuron')}, ${pw(total, 'synapse')} and every file in it go too.`)) { removeCategory(c.id); save(); graph.rebuild(); renderCats(); renderModal(); clearSelection(); } });
    panelBody.querySelectorAll('[data-col]').forEach(b => b.addEventListener('click', () => { c.color = b.dataset.col; save(); refreshPanel(); renderCats(); }));
    panelBody.querySelector('[data-add=sub]').addEventListener('click', async () => { const v = await promptDlg('Name the new neuron', '', 'Add'); if (!v) return; const s = addSubject(c.id, v); save(); graph.rebuild(); renderCats(); selectSub(s.id); });
    panel.scrollTop = 0;
  }
  function wirePanel(where) {
    panelBody.querySelectorAll('.entry [data-op]').forEach(b => b.addEventListener('click', async e => {
      e.stopPropagation(); const li = b.closest('.entry'), en = brain.entries.find(x => x.id === li.dataset.id); if (!en) return;
      if (b.dataset.op === 'del') { if (await confirmDlg('Delete this synapse?', en.text.slice(0, 120))) { removeEntry(en.id); save(); graph.rebuild(); renderCats(); refreshPanel(); } return; }
      const ta = document.createElement('textarea'); ta.value = en.text; ta.rows = Math.min(8, Math.max(2, Math.ceil(en.text.length / 44)));
      li.querySelector('.txt').replaceWith(ta); ta.focus();
      const done = () => { const v = ta.value.trim(); if (v && v !== en.text) { en.text = v; save(); graph.rebuild(); } refreshPanel(); };
      ta.addEventListener('blur', done); ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ta.blur(); } if (ev.key === 'Escape') { ta.value = en.text; ta.blur(); } });
    }));
    panelBody.querySelectorAll('.file').forEach(a => a.addEventListener('click', async e => {
      e.preventDefault(); const id = a.dataset.id;
      if (e.target.dataset.del) { const en = brain.entries.find(x => x.id === id); if (await confirmDlg('Delete this file?', en?.fileName || '')) { removeEntry(id); save(); graph.rebuild(); renderCats(); refreshPanel(); } return; }
      const en = brain.entries.find(x => x.id === id); const u = await fileUrl(id); if (!u || !en) return;
      if (isImage(en)) { lightbox(u, en.fileName); return; }
      const a2 = document.createElement('a'); a2.href = u; a2.download = en.fileName; document.body.appendChild(a2); a2.click(); a2.remove(); toast(`Downloading ${en.fileName}`);
    }));
    const slot = panelBody.querySelector('.add-row .slot');
    panelBody.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.add; if (t === 'sub' || t === 'link' || t === 'link-pick') return;
      if (t === 'file') { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.addEventListener('change', async () => { for (const f of inp.files) await attachFile(f, where.cat, where.sub); save(); graph.rebuild(); renderCats(); refreshPanel(); toast(pw(inp.files.length, 'file') + ' added.'); }); inp.click(); return; }
      const old = panelBody.querySelector('.adder'); if (old) old.remove();
      const box = document.createElement('div'); box.className = 'adder';
      box.innerHTML = t === 'link' ? `<input type="url" placeholder="https://…" aria-label="Link"><input placeholder="What is it? (optional)" aria-label="Label" style="margin-top:6px">` : `<textarea rows="3" placeholder="Write anything…" aria-label="Note"></textarea>`;
      box.insertAdjacentHTML('beforeend', `<div class="row"><button data-c>Cancel</button><button data-ok class="primary">Add</button></div>`);
      slot.parentElement.insertAdjacentElement('afterend', box); box.querySelector('input,textarea').focus();
      box.querySelector('[data-c]').addEventListener('click', () => box.remove());
      box.querySelector('[data-ok]').addEventListener('click', () => {
        if (t === 'link') { const [u, l] = box.querySelectorAll('input'); if (!u.value.trim()) return; addEntry({ cat: where.cat, sub: where.sub, kind: 'link', lead: l.value.trim() || 'Link', text: u.value.trim() }); }
        else { const v = box.querySelector('textarea').value.trim(); if (!v) return; addEntry({ cat: where.cat, sub: where.sub, kind: 'note', lead: 'Note', text: v }); }
        save(); graph.rebuild(); renderCats(); refreshPanel();
      });
    }));
    const dz = panelBody.querySelector('[data-dropzone]');
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', async e => { for (const f of e.dataTransfer.files) await attachFile(f, where.cat, where.sub); save(); graph.rebuild(); renderCats(); refreshPanel(); toast(pw(e.dataTransfer.files.length, 'file') + ' added.'); });
    dz.addEventListener('click', () => panelBody.querySelector('[data-add=file]').click());
  }

  const lb = document.createElement('div'); lb.className = 'lightbox'; lb.hidden = true; lb.innerHTML = '<button class="lb-close" aria-label="Close">×</button><img alt=""><div class="lb-cap"></div>'; $('stage').appendChild(lb);
  function lightbox(url, name) { lb.querySelector('img').src = url; lb.querySelector('img').alt = name; lb.querySelector('.lb-cap').textContent = name; lb.hidden = false; }
  lb.addEventListener('click', () => { lb.hidden = true; lb.querySelector('img').src = ''; });

  // ---------- questions modal ----------
  const qmodal = $('qmodal');
  let modalReturn = null;
  function openModal() { renderModal(); modalReturn = document.activeElement; qmodal.hidden = false; setTimeout(() => $('qmodal-close').focus(), 30); }
  function closeModal() { qmodal.hidden = true; const back = modalReturn; modalReturn = null; if (back && back.isConnected && back !== document.body) back.focus?.(); }
  $('act-questions').addEventListener('click', openModal);
  $('qmodal-close').addEventListener('click', closeModal);
  qmodal.addEventListener('click', e => { if (e.target === qmodal) closeModal(); });
  $('modal-interest-add').addEventListener('submit', e => { e.preventDefault(); addInterest($('modal-interest-new').value); $('modal-interest-new').value = ''; renderModal(); });
  $('q-add').addEventListener('submit', e => {
    e.preventDefault();
    const text = $('qa-text').value.trim(); if (!text) return;
    const type = $('qa-type').value;
    brain.custom.push({ id: 'cq:' + uid(), cat: $('qa-cat').value, sub: $('qa-sub').value.trim(), type, list: type === 'list', text });
    $('qa-text').value = ''; $('qa-sub').value = ''; save(); renderModal(); updateCount(); toast('Question added. It will come up soon.');
    if (mode === 'empty') advance();
  });
  $('q-filter').addEventListener('input', renderGroups);
  function renderModal() {
    if (qmodal.hidden && !document.activeElement?.closest('#qmodal')) { /* still refresh cheaply */ }
    renderChips($('modal-interests'), true);
    $('qa-cat').innerHTML = brain.cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    renderGroups();
  }
  const openGroups = new Set();
  function renderGroups() {
    const all = allQuestions(); const term = $('q-filter').value.trim().toLowerCase();
    const on = all.filter(q => !q.first && qEnabled(q)).length, done = Object.keys(brain.answered).length;
    $('q-summary').textContent = `${on} on · ${done} answered · ${all.length - 1} total`;
    $('q-groups').innerHTML = brain.cats.map(c => {
      const qs = all.filter(q => q.cat === c.id && !q.first && (!term || fill(q.text, { sub: q.sub, cat: c.name }).toLowerCase().includes(term)));
      if (term && !qs.length) return '';
      const open = openGroups.has(c.id) || !!term;
      return `<div class="qg${open ? ' open' : ''}" data-cat="${esc(c.id)}"><div class="qg-head"><span class="sw" style="background:${c.color};color:${c.color}"></span><span>${esc(c.name)}</span><span class="cnt">${qs.filter(qEnabled).length}/${qs.length}</span><label class="tog" title="Ask about this category"><input type="checkbox" data-cat-tog ${c.enabled ? 'checked' : ''}> ask</label></div><div class="qg-body">${qs.map(q => {
        const en = !brain.disabled.includes(q.id), an = qAnswered(q);
        const meta = [q.sub ? `→ ${q.sub}` : '', q.type === 'list' && q.list ? 'list · each item becomes a neuron' : q.type === 'files' ? 'files' : q.type === 'choice' ? 'choice' : '', q.source !== 'default' ? q.source : ''].filter(Boolean).join(' · ');
        return `<div class="qrow${en ? '' : ' off'}${an ? ' done' : ''}" data-q="${esc(q.id)}"><input type="checkbox" ${en ? 'checked' : ''} aria-label="Enabled"><span><span class="qt">${esc(fill(q.text, { sub: q.sub, cat: c.name }))}</span>${meta ? `<span class="qm">${esc(meta)}</span>` : ''}</span><span class="qops">${an ? `<button data-again title="Ask again">↻</button>` : ''}${q.source === 'custom' ? `<button data-edit title="Edit">✎</button>` : ''}${q.source === 'custom' || q.source === 'follow-up' ? `<button data-del title="Delete">×</button>` : ''}</span></div>`;
      }).join('') || '<div class="empty" style="padding:8px 10px;color:var(--text-3);font-size:13px">No questions here yet. Add one above.</div>'}</div></div>`;
    }).join('');
    const groups = $('q-groups');
    groups.querySelectorAll('.qg-head').forEach(h => h.addEventListener('click', e => { if (e.target.closest('.tog')) return; const g = h.parentElement, id = g.dataset.cat; g.classList.toggle('open'); g.classList.contains('open') ? openGroups.add(id) : openGroups.delete(id); }));
    groups.querySelectorAll('[data-cat-tog]').forEach(i => i.addEventListener('change', () => { const c = catById(i.closest('.qg').dataset.cat); c.enabled = i.checked; save(); renderCats(); renderGroups(); updateCount(); if (selected?.kind === 'cat') refreshPanel(); if (mode === 'question' && current?.cat === c.id && !c.enabled) advance(); if (mode === 'empty') advance(); }));
    groups.querySelectorAll('.qrow').forEach(row => {
      const id = row.dataset.q;
      row.querySelector('input[type=checkbox]').addEventListener('change', e => { brain.disabled = e.target.checked ? brain.disabled.filter(x => x !== id) : [...brain.disabled, id]; save(); renderGroups(); updateCount(); if (mode === 'question' && current?.id === id && !e.target.checked) advance(); if (mode === 'empty' && e.target.checked) advance(); });
      row.querySelector('[data-again]')?.addEventListener('click', () => { delete brain.answered[id]; delete brain.skipped[id]; save(); renderGroups(); updateCount(); toast('I will ask that again.'); if (mode === 'empty') advance(); });
      row.querySelector('[data-edit]')?.addEventListener('click', async () => { const q = brain.custom.find(x => x.id === id); const v = await promptDlg('Edit question', q.text); if (v) { q.text = v; save(); renderGroups(); if (current?.id === id) showQuestion({ ...q, source: 'custom' }); } });
      row.querySelector('[data-del]')?.addEventListener('click', () => { brain.custom = brain.custom.filter(x => x.id !== id); brain.followups = brain.followups.filter(x => x.id !== id); save(); renderGroups(); updateCount(); if (current?.id === id) advance(); });
    });
  }

  // ---------- header actions ----------
  const moreMenu = $('more-menu');
  $('act-more').addEventListener('click', e => { e.stopPropagation(); moreMenu.hidden = !moreMenu.hidden; });
  document.addEventListener('click', e => { if (!e.target.closest('.actions')) moreMenu.hidden = true; });
  $('m-rename').addEventListener('click', async () => { moreMenu.hidden = true; const v = await promptDlg(brain.origin ? 'Rename this brain' : 'What should I call you?', brain.name); if (v) { renameSubject(subById('me'), v); save(); graph.rebuild(); refreshPanel(); renderBrainSwitch(); } });
  $('m-delete-brain').addEventListener('click', () => { moreMenu.hidden = true; if (brain.origin) deleteBrain(brain); });
  $('m-reset').addEventListener('click', async () => { moreMenu.hidden = true; if (await confirmDlg('Start over with an empty brain?', `Everything in this browser is erased${net.brains.length > 1 ? `, all ${net.brains.length} brains` : ''}. Save a copy first if you want to keep it.`, 'Erase everything')) { await store.clear(); urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear(); net = emptyNet(); brain = net.brains[0]; await save(true); clearSelection(); graph.rebuild(true); graph.fit(); renderCats(); renderBrainSwitch(); iv.classList.remove('paused'); $('iv-pause').textContent = 'Pause'; advance(); toast('Fresh brain.'); } });
  const brainMenu = $('brain-menu');
  $('brain-switch').addEventListener('click', e => { e.stopPropagation(); brainMenu.hidden = !brainMenu.hidden; moreMenu.hidden = true; });
  document.addEventListener('click', e => { if (!e.target.closest('.netsw')) brainMenu.hidden = true; });
  $('m-export-data').addEventListener('click', () => { moreMenu.hidden = true; download(`window.MINDBLOWN = ${JSON.stringify(toDataset())};\n`, `${slug(brain.name || 'brain')}-data.js`, 'text/javascript'); toast('Dataset downloaded. Drop it into a MindBlown page as data.js.'); });
  // A brain file is untrusted input: constrain every value that reaches HTML attributes or the layout.
  const safeColor = v => /^#[0-9a-f]{3,8}$/i.test(String(v)) ? String(v) : '#9aa4b8';
  const safeDate = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : today();
  const str = (v, max = 4000) => typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max);
  const arr = v => Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : [];
  function sanitizeBrain(b) {
    const base = emptyBrain();
    b.id = str(b.id, 60) || 'root'; b.color = safeColor(b.color);
    b.origin = b.origin && typeof b.origin === 'object' && typeof b.origin.brain === 'string' && typeof b.origin.sub === 'string' ? { brain: str(b.origin.brain, 60), sub: str(b.origin.sub, 60) } : null;
    b.name = str(b.name, 80); b.created = safeDate(b.created); b.updated = safeDate(b.updated);
    b.cats = !Array.isArray(b.cats) ? base.cats : arr(b.cats).map(c => ({ id: str(c.id, 60), name: str(c.name, 80) || 'Category', color: safeColor(c.color), enabled: c.enabled !== false, custom: !!c.custom, desc: str(c.desc, 400), icon: str(c.icon, 8) }));
    if (!b.cats.some(c => c.id !== 'you')) b.cats = base.cats; // nothing usable: restore the default set
    if (!b.cats.some(c => c.id === 'you')) b.cats.unshift(base.cats[0]);
    b.subjects = arr(b.subjects).map(s => ({ id: str(s.id, 60), cat: str(s.cat, 60), name: str(s.name, 120) || 'Neuron', starred: !!s.starred, desc: str(s.desc, 600), created: safeDate(s.created), ...(typeof s.brainId === 'string' ? { brainId: str(s.brainId, 60) } : {}) }));
    if (!b.subjects.some(s => s.id === 'me')) b.subjects.unshift({ ...base.subjects[0], name: b.name || 'Me' });
    const kinds = ['answer', 'note', 'link', 'file'];
    b.entries = arr(b.entries).map(e => ({ id: str(e.id, 60), kind: kinds.includes(e.kind) ? e.kind : 'note', lead: str(e.lead, 300), text: str(e.text, 20000), q: str(e.q, 120), sub: e.sub == null ? null : str(e.sub, 60), cat: str(e.cat, 60), created: safeDate(e.created), fileName: str(e.fileName, 255), fileType: str(e.fileType, 120), fileSize: Number(e.fileSize) || 0 }));
    b.custom = arr(b.custom).map(q => ({ id: str(q.id, 60), cat: str(q.cat, 60), text: str(q.text, 500), sub: str(q.sub, 120), type: str(q.type, 20) || 'text', list: q.type === 'list' }));
    b.followups = arr(b.followups).map(f => ({ id: str(f.id, 60), cat: str(f.cat, 60), sub: f.sub == null ? null : str(f.sub, 120), subId: f.subId == null ? null : str(f.subId, 60), type: str(f.type, 20) || 'long', text: str(f.text, 500), parent: str(f.parent, 120) }));
    b.interests = Array.isArray(b.interests) ? b.interests.map(i => str(i, 70)) : [];
    b.disabled = Array.isArray(b.disabled) ? b.disabled.map(i => str(i, 120)) : [];
    const plain = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    b.answered = Object.fromEntries(Object.entries(plain(b.answered)).map(([k, v]) => [str(k, 120), Array.isArray(v) ? v.map(x => str(x, 60)) : []]));
    b.skipped = Object.fromEntries(Object.entries(plain(b.skipped)).filter(([, v]) => Number.isFinite(v)).map(([k, v]) => [str(k, 120), v]));
    b.history = arr(b.history).slice(-200).map(h => ({ at: str(h.at, 40), q: str(h.q, 500), a: str(h.a, 20000), cat: str(h.cat, 60), entries: Array.isArray(h.entries) ? h.entries.map(x => str(x, 60)) : [], followup: !!h.followup }));
    b.asks = Number.isFinite(b.asks) ? b.asks : 0; b.lastCat = b.lastCat == null ? null : str(b.lastCat, 60);
    b.paused = !!b.paused; b.interestsChosen = !!b.interestsChosen;
    return b;
  }
  // a saved document is either a network (v2) or a single brain (v1); either way every cross-reference must point at something that exists
  function sanitizeNet(doc) {
    const n = Array.isArray(doc.brains) ? { ...emptyNet(), ...doc } : { ...emptyNet(), brains: [doc] };
    n.brains = arr(n.brains).map(b => sanitizeBrain({ ...emptyBrain(), ...b }));
    if (!n.brains.length) n.brains = [emptyBrain()];
    const seen = new Set(); n.brains = n.brains.filter(b => !seen.has(b.id) && seen.add(b.id));
    const ids = new Set(n.brains.map(b => b.id)), has = (bid, sid) => n.brains.find(b => b.id === bid)?.subjects.some(s => s.id === sid);
    n.brains.forEach(b => {
      if (b.origin && (b.origin.brain === b.id || !has(b.origin.brain, b.origin.sub))) b.origin = null;
      b.subjects.forEach(s => { if (s.brainId && (s.brainId === b.id || !ids.has(s.brainId))) delete s.brainId; });
    });
    // the first brain is the root: it has no origin, and no brain may be its own ancestor
    n.brains[0].origin = null;
    n.brains.forEach(b => { let cur = b, hops = 0; while (cur?.origin && hops < 50) { cur = n.brains.find(x => x.id === cur.origin.brain); hops++; if (cur === b) { b.origin = null; break; } } });
    const end = e => e && typeof e === 'object' && typeof e.b === 'string' && typeof e.s === 'string' && has(e.b, e.s) ? { b: str(e.b, 60), s: str(e.s, 60) } : null;
    n.links = arr(n.links).map(l => { const a = end(l.a), b = end(l.b); return a && b && !(a.b === b.b && a.s === b.s) ? { id: str(l.id, 60) || uid(), a, b, label: str(l.label, 120) || 'connected to', notes: str(l.notes, 2000), strength: [1, 2, 3].includes(l.strength) ? l.strength : 2, created: safeDate(l.created) } : null; }).filter(Boolean);
    n.active = ids.has(n.active) ? n.active : n.brains[0].id; n.v = 2;
    return n;
  }
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brain';
  function download(content, name, type) { const b = content instanceof Blob ? content : new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }

  // save / open: one JSON file with every file embedded, so the brain travels as a single document
  const blobToB64 = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.readAsDataURL(blob); });
  async function exportBrain() {
    const files = [];
    for (const b of net.brains) for (const e of b.entries.filter(isFile)) { const bl = await store.getFile(e.id); if (bl) files.push({ id: e.id, name: e.fileName, type: e.fileType, data: await blobToB64(bl) }); }
    const nm = slug(net.brains[0].name || 'brain');
    download(JSON.stringify({ app: 'mindblown-build', v: 2, exported: new Date().toISOString(), brain: net, files }), `${nm}.mindblown.json`, 'application/json');
    toast(`Saved ${nm}.mindblown.json${net.brains.length > 1 ? ` · ${net.brains.length} brains` : ''}`);
  }
  async function importBrain(file) {
    let doc; try { doc = JSON.parse(await file.text()); } catch { toast('That is not a brain file.'); return; }
    if (!doc || doc.app !== 'mindblown-build' || !doc.brain || typeof doc.brain !== 'object' || Array.isArray(doc.brain)) { toast('That is not a MindBlown brain file.'); return; }
    if (doc.files != null && !Array.isArray(doc.files)) { toast('That brain file is damaged (files list).'); return; }
    // parse and sanitize everything before touching storage, so a bad file can never leave the browser empty
    let next; try { next = sanitizeNet(doc.brain); } catch { toast('That brain file is damaged.'); return; }
    const files = (doc.files || []).filter(f => f && typeof f === 'object' && typeof f.id === 'string' && typeof f.data === 'string');
    if (net.brains.some(b => b.entries.length) && !(await confirmDlg('Replace the current brain?', 'The brain in this browser is replaced by the file. Save a copy first if you want to keep it.', 'Replace'))) return;
    const blobs = [];
    for (const f of files) { try { const bin = atob(f.data); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); blobs.push({ id: f.id, blob: new Blob([arr], { type: str(f.type, 120) || 'application/octet-stream' }) }); } catch { /* skip a broken file */ } }
    next.brains.forEach(b => { b.updated = today(); });
    try { await store.replaceAll(JSON.parse(JSON.stringify(next)), blobs); }
    catch (e) { console.warn('import failed', e); toast('Could not store that brain. Nothing was changed.'); return; }
    urlCache.forEach(u => URL.revokeObjectURL(u)); urlCache.clear();
    net = next; brain = brainById(net.active); dirty = false; saveFailed = false; updateStore(); clearSelection(); graph.rebuild(true); graph.fit(); renderCats(); renderBrainSwitch(); iv.classList.toggle('paused', brain.paused); $('iv-pause').textContent = brain.paused ? 'Resume' : 'Pause'; advance(`Welcome back, ${brain.name}.`); toast(next.brains.length > 1 ? `${next.brains.length} brains loaded.` : 'Brain loaded.');
  }
  $('act-save').addEventListener('click', exportBrain);
  $('act-open').addEventListener('click', () => $('file-open').click());
  $('file-open').addEventListener('change', () => { const f = $('file-open').files[0]; $('file-open').value = ''; if (f) importBrain(f); });
  window.addEventListener('beforeunload', () => { if (dirty) store.saveBrain(JSON.parse(JSON.stringify(net))); });

  // ---------- the full explorer: translate the live brain into a MindBlown dataset ----------
  // One brain becomes a plain dataset. Several become the renderer's network form: every id namespaced "<brain>:<id>",
  // each brain with its own hub lobe (self: true) and brain-tagged lobes, and the user's connections as links between them.
  function toDataset() {
    const multi = net.brains.length > 1;
    const lobeId = c => c === 'you' ? 'self' : c;
    const mp = (bid, sid) => multi ? `${bid}:${sid}` : sid, ml = (bid, cid) => multi ? `${bid}:${lobeId(cid)}` : lobeId(cid);
    const shift = (hex, deg) => { const c = d3.hsl(d3.color(hex) || d3.color('#999')); c.h = ((c.h || 0) + deg) % 360; return c.formatHex(); };
    const out = { lobes: [], pages: [], synapses: [], sources: [], links: [], synLinks: [], cocite: [], brains: [], centers: [], built: today(), demo: false };
    const linkIx = {};
    const pushLink = (a, b, w, kind, note) => { const key = [a, b].sort().join('|'); const ex = linkIx[key]; if (ex) { ex.w += w; if (!ex.kinds.includes(kind)) ex.kinds.push(kind); if (note && !ex.notes.includes(note)) ex.notes.push(note); } else { linkIx[key] = { s: a, t: b, w, kinds: [kind], notes: note ? [note] : [] }; out.links.push(linkIx[key]); } };
    net.brains.forEach((b, bi) => {
      const subs = b.subjects, eOf = sid => b.entries.filter(e => e.sub === sid);
      const byName = subs.map(s2 => ({ s: s2, re: s2.name.length >= 3 ? new RegExp(`\\b${s2.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null }));
      const used = new Set(subs.map(s2 => s2.cat));
      b.cats.filter(c => used.has(c.id)).forEach(c => {
        const self = c.id === 'you';
        const l = { id: ml(b.id, c.id), name: self && multi ? b.name || 'Me' : bi && !self ? `${b.name} · ${c.name}` : c.name, color: self ? (multi ? b.color : c.color) : bi ? shift(c.color, 40 * bi) : c.color, hidden: false };
        if (multi) { l.brain = b.id; l.self = self; }
        out.lobes.push(l);
      });
      subs.forEach(s2 => {
        const es = eOf(s2.id), notes = es.filter(e => !isFile(e));
        const p = { id: mp(b.id, s2.id), title: s2.name, type: s2.id === 'me' ? 'person' : s2.brainId ? 'brain' : 'neuron', lobe: ml(b.id, s2.cat), parent: null, desc: s2.desc || notes[0]?.text?.slice(0, 160) || '', intro: '', created: s2.created, updated: b.updated, synapses: notes.map(e => e.id) };
        if (multi) { p.brain = b.id; p.orig = s2.id; }
        out.pages.push(p);
        notes.forEach(e => {
          const links = byName.filter(x => x.re && x.s.id !== s2.id && x.re.test(e.text)).map(x => x.s.id).slice(0, 4);
          links.forEach(t => { out.synLinks.push({ s: e.id, t: mp(b.id, t) }); pushLink(mp(b.id, s2.id), mp(b.id, t), 1, 'mention', 'mentioned in a synapse'); });
          out.synapses.push({ id: e.id, page: mp(b.id, s2.id), lead: e.lead || e.kind, text: e.text, section: e.kind === 'answer' ? 'Answers' : e.kind === 'link' ? 'Links' : 'Notes', links: links.map(t => mp(b.id, t)), cites: [] });
        });
        es.filter(isFile).forEach(e => out.sources.push({ id: 'file:' + e.id, label: e.fileName, kind: isImage(e) ? 'image' : 'file', pages: [mp(b.id, s2.id)] }));
        if (s2.id !== 'me') pushLink(mp(b.id, 'me'), mp(b.id, s2.id), s2.cat === 'you' ? 3 : 1, 'see-also', s2.cat === 'you' ? 'about you' : b.cats.find(c => c.id === s2.cat)?.name || '');
      });
      out.brains.push({ id: b.id, title: brainLabel(b), short: b.name || 'Me', color: b.color, href: '#', self: ml(b.id, 'you'), center: mp(b.id, 'me') });
      out.centers.push(mp(b.id, 'me'));
    });
    const ids = new Set(out.pages.map(p => p.id));
    net.links.forEach(l => { const a = mp(l.a.b, l.a.s), b = mp(l.b.b, l.b.s); if (ids.has(a) && ids.has(b)) pushLink(a, b, l.strength, l.label, l.notes || ''); });
    const root = net.brains[0];
    if (multi) Object.assign(out, { brain: 'network', title: `MindBlown: ${root.name ? root.name + "'s" : 'your'} network`, subtitle: `${net.brains.length} brains · ${pw(net.links.length, 'connection')} · built by hand` });
    else { Object.assign(out, { center: 'me', title: 'MindBlown: Build', subtitle: `${root.name || 'your'} brain · built by hand` }); delete out.brains; delete out.centers; }
    return out;
  }
  async function openExplorer() {
    if (net.brains.reduce((n, b) => n + b.subjects.length, 0) < 2) { toast('Answer a few questions first, then explode.'); return; }
    const base = new URL('./', location.href).href;
    const html = await fetch('./projects.html').then(r => r.text()).catch(() => null);
    if (!html) { toast('Could not load the explorer.'); return; }
    const doc = html.replace(/<script src="\.\/data\.js"><\/script>/, `<script>window.MINDBLOWN_EMBEDDED=true;window.MINDBLOWN=${JSON.stringify(toDataset()).replace(/</g, '\\u003c')};</script>`)
      .replace('<head>', `<head><base href="${base}">`).replace(/<\/a>\s*<nav class="brains"[\s\S]*?<\/nav>/, '</span>')
      .replace(/<a class="home"[^>]*>/, '<span style="display:flex;align-items:center;gap:12px">'); // the shell's home link and brain switcher would navigate inside the iframe
    $('explorer-frame').srcdoc = doc; $('explorer').hidden = false;
  }
  $('act-explode').addEventListener('click', openExplorer);
  $('explorer-close').addEventListener('click', () => { $('explorer').hidden = true; $('explorer-frame').srcdoc = ''; });

  // ---------- search ----------
  const q = $('q'), results = $('results'); let resultItems = [], activeIdx = -1;
  function hideResults() { results.hidden = true; activeIdx = -1; }
  q.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase(); if (term.length < 2) { hideResults(); return; }
    const hits = [];
    brain.subjects.forEach(s => { const t = s.name.toLowerCase(); if (t.includes(term)) hits.push({ kind: 'sub', id: s.id, score: t.startsWith(term) ? 0 : 1, title: s.name, sub: catById(s.cat)?.name, color: catById(s.cat)?.color }); });
    brain.cats.forEach(c => { if (c.name.toLowerCase().includes(term)) hits.push({ kind: 'cat', id: c.id, score: 1.5, title: c.name, sub: 'category', color: c.color }); });
    brain.entries.forEach(e => { const t = (e.text + ' ' + (e.lead || '')).toLowerCase(); if (t.includes(term)) hits.push({ kind: e.sub ? 'sub' : 'cat', id: e.sub || e.cat, score: 3, title: e.text.slice(0, 70), sub: (isFile(e) ? 'file in ' : 'synapse of ') + (e.sub ? subById(e.sub)?.name : catById(e.cat)?.name), color: catById(e.cat)?.color }); });
    net.links.forEach(l => { if (!endAt(l, brain.id, l.a.s) && !endAt(l, brain.id, l.b.s)) return; const t = (l.label + ' ' + l.notes).toLowerCase(); if (!t.includes(term)) return; const mine = l.a.b === brain.id ? l.a : l.b, other = endOf(mine === l.a ? l.b : l.a).sub; const me = subById(mine.s); if (me) hits.push({ kind: 'sub', id: me.id, score: 2.5, title: `${l.label} → ${other?.name || ''}`, sub: 'connection of ' + me.name, color: catById(me.cat)?.color }); });
    net.brains.filter(b => b !== brain).forEach(b => {
      b.subjects.forEach(s => { if (s.name.toLowerCase().includes(term)) hits.push({ kind: 'sub', id: s.id, brain: b.id, score: 4, title: s.name, sub: `in ${brainLabel(b)}`, color: b.color }); });
      b.entries.forEach(e => { if (!e.sub) return; const t = (e.text + ' ' + (e.lead || '')).toLowerCase(); if (t.includes(term)) hits.push({ kind: 'sub', id: e.sub, brain: b.id, score: 5, title: e.text.slice(0, 70), sub: `${isFile(e) ? 'file' : 'synapse'} of ${b.subjects.find(x => x.id === e.sub)?.name || ''} · in ${brainLabel(b)}`, color: b.color }); });
    });
    hits.sort((a, b) => a.score - b.score); resultItems = hits.slice(0, 9);
    results.innerHTML = resultItems.length ? resultItems.map(h => `<li role="option"><span class="sw" style="background:${h.color}"></span><span><span class="rt">${esc(h.title)}</span><span class="rs">${esc(h.sub)}</span></span></li>`).join('') : `<li><span class="empty">Nothing fires for “${esc(q.value)}”</span></li>`;
    results.hidden = false; activeIdx = -1;
    results.querySelectorAll('li[role=option]').forEach((li, i) => li.addEventListener('click', () => choose(i)));
  });
  q.addEventListener('keydown', e => { if (results.hidden) return; if (e.key === 'ArrowDown') { activeIdx = Math.min(activeIdx + 1, resultItems.length - 1); mark(); e.preventDefault(); } else if (e.key === 'ArrowUp') { activeIdx = Math.max(activeIdx - 1, 0); mark(); e.preventDefault(); } else if (e.key === 'Enter') choose(Math.max(activeIdx, 0)); });
  function mark() { results.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === activeIdx)); }
  function choose(i) { const h = resultItems[i]; if (!h) return; hideResults(); q.blur(); if (h.brain && h.brain !== brain.id) { switchBrain(h.brain); setTimeout(() => selectSub(h.id), 60); return; } h.kind === 'sub' ? selectSub(h.id) : selectCat(h.id); }
  document.addEventListener('click', e => { if (!e.target.closest('.search')) hideResults(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!dlg.hidden) dlgClose(null); else if (!lb.hidden) lb.click(); else if (!qmodal.hidden) closeModal(); else if (!$('explorer').hidden) $('explorer-close').click(); else if (graph.linkFrom) { graph.linkFrom = null; toast('Connection cancelled.'); } else { clearSelection(); hideResults(); } } });

  // ---------- the living brain (canvas) ----------
  const graph = (() => {
    const canvas = $('brain'), ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, k = 0.5, tx = 0, ty = 0;
    let nodes = [], subNodes = [], synNodes = [], links = [], anchor = {}, R = 420;
    let explodeF = 0, explodeTarget = 0;
    const births = new Map();
    const api = { forceExplode: false, selected: null, hover: null, linkFrom: null };   // linkFrom: neuron id while the user is picking a connection target on the canvas
    let pointerW = null;   // world position of the pointer, for the rubber-band line while linking
    let userLinks = [];    // the user's connections inside this brain, as sim links
    const byId = new Map();
    const colorCache = {};
    const rgba = (hex, a) => { const key = hex + a; if (colorCache[key]) return colorCache[key]; const c = d3.color(hex) || d3.color('#999'); c.opacity = a; return (colorCache[key] = c.formatRgb()); };
    const colorOf = n => catById(n.cat)?.color || '#9aa';
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const orbitR = n => 14 + n.nSyn * 1.6;

    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; }
    let resizeT = 0; window.addEventListener('resize', () => { resize(); clearTimeout(resizeT); resizeT = setTimeout(() => { if (selected?.kind === 'sub') api.zoomToSub(selected.id); else fitAll(); }, 250); }); resize();

    const zoom = d3.zoom().scaleExtent([0.12, 9]).on('zoom', ev => { k = ev.transform.k; tx = ev.transform.x; ty = ev.transform.y; updateLevel(); }).filter(ev => !ev.button);
    d3.select(canvas).call(zoom).on('dblclick.zoom', null);
    const toWorld = (sx, sy) => [(sx - tx) / k, (sy - ty) / k];
    const sw = px => px / k;

    // forces
    const linkDist = l => l.kind === 'st' ? 4 + explodeF * orbitR(l.target) : l.kind === 'uu' ? 150 + explodeF * (orbitR(l.source) + orbitR(l.target)) * 0.6 : 60;
    const linkStrength = l => l.kind === 'st' ? 0.15 : l.kind === 'uu' ? 0.02 * l.ref.strength : 0.05;
    const charge = n => n.kind === 'sub' ? (n.id === 'me' ? -900 : -260 - n.nSyn * 8) : 0;
    const pageCharge = d3.forceManyBody().strength(charge).theta(0.9).distanceMax(700);
    const chargeForce = Object.assign(a => pageCharge(a), { initialize: (ns, rnd) => pageCharge.initialize(ns.filter(n => n.kind === 'sub'), rnd), strength: f => (pageCharge.strength(f), chargeForce) });
    const collideR = n => n.kind === 'sub' ? n.r + 6 : 1 + 4 * explodeF;
    const pageCollideR = n => n.r + 24 + explodeF * (n.nSyn ? orbitR(n) + 14 : 0);
    const pageCollide = d3.forceCollide().radius(pageCollideR).strength(0.7).iterations(2);
    const pageCollideForce = Object.assign(a => pageCollide(a), { initialize: (ns, rnd) => pageCollide.initialize(ns.filter(n => n.kind === 'sub'), rnd), radius: f => (pageCollide.radius(f), pageCollideForce) });
    function orbitForce(alpha) {
      const st = 0.3 * alpha;
      for (const n of synNodes) { const p = n.parent, m = p.nSyn || 1; const a = p.spin + (n.ordinal / m) * Math.PI * 2; const rr = (orbitR(p) + (n.ordinal % 2 ? 6 : -4)) * explodeF + 2; n.vx += (p.x + Math.cos(a) * rr - n.x) * st; n.vy += (p.y + Math.sin(a) * rr - n.y) * st; }
    }
    const catSize = {};
    const anchorStrength = n => n.kind !== 'sub' ? 0 : n.id === 'me' ? 1 : n.cat === 'you' ? 0.5 : (catSize[n.cat] || 1) <= 3 ? 0.5 : (catSize[n.cat] || 1) <= 8 ? 0.35 : 0.22;
    const sim = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(linkDist).strength(linkStrength))
      .force('charge', chargeForce).force('collide', d3.forceCollide().radius(collideR).iterations(2))
      .force('orbit', orbitForce).force('pageCollide', pageCollideForce)
      .force('x', d3.forceX(n => anchor[n.cat]?.x ?? 0).strength(anchorStrength)).force('y', d3.forceY(n => anchor[n.cat]?.y ?? 0).strength(anchorStrength))
      .alphaDecay(0.03).velocityDecay(0.35).stop();
    function refreshForces() { sim.force('link').distance(linkDist); sim.force('charge').strength(charge); sim.force('collide').radius(collideR); sim.force('pageCollide').radius(pageCollideR); sim.force('x').x(n => anchor[n.cat]?.x ?? 0).strength(anchorStrength); sim.force('y').y(n => anchor[n.cat]?.y ?? 0).strength(anchorStrength); }

    function layoutAnchors() {
      const cats = brain.cats.filter(c => c.id !== 'you' && (c.enabled || subsOf(c.id).length));
      Object.keys(catSize).forEach(k2 => delete catSize[k2]); brain.subjects.forEach(s => { catSize[s.cat] = (catSize[s.cat] || 0) + 1; });
      const totalSubs = brain.subjects.length;
      R = 330 + Math.sqrt(Math.max(0, totalSubs - 1)) * 34 + Math.max(0, cats.length - 8) * 24;
      const span = cats.map(c => Math.sqrt(catSize[c.id] || 1) + 2.4), total = d3.sum(span) || 1;
      let acc = -Math.PI / 2 - (span[0] / total) * Math.PI;
      const next = { you: { x: 0, y: 0 } };
      cats.forEach((c, i) => { const a = acc + (span[i] / total) * Math.PI; acc += (span[i] / total) * Math.PI * 2; next[c.id] = { x: Math.cos(a) * R, y: Math.sin(a) * R, a }; });
      anchor = next;
    }

    function rebuild(warm) {
      layoutAnchors();
      const prev = new Map(byId); byId.clear();
      subNodes = brain.subjects.map(s => {
        const es = entriesOf(s.id); const o = prev.get(s.id);
        const n = o || { id: s.id, kind: 'sub', spin: Math.random() * Math.PI * 2 };
        Object.assign(n, { ref: s, cat: s.cat, name: s.name, nSyn: es.length, starred: s.starred });
        n.r = s.id === 'me' ? 15 : 5.5 + Math.sqrt(es.length) * 1.3 + (s.starred ? 1 : 0);
        if (!o) { const a = anchor[s.cat] || anchor.you; n.x = a.x + (Math.random() - 0.5) * 120; n.y = a.y + (Math.random() - 0.5) * 120; if (s.id === 'me') { n.x = 0; n.y = 0; } }
        if (s.id === 'me') { n.fx = 0; n.fy = 0; }
        byId.set(n.id, n); return n;
      });
      synNodes = [];
      subNodes.forEach(p => { entriesOf(p.id).forEach((e, i) => { const o = prev.get(e.id); const n = o || { id: e.id, kind: 'syn', x: p.x + (Math.random() - 0.5) * 4, y: p.y + (Math.random() - 0.5) * 4 }; Object.assign(n, { ref: e, cat: e.cat, parent: p, ordinal: i, file: isFile(e), label: isFile(e) ? e.fileName : e.text }); byId.set(n.id, n); synNodes.push(n); }); });
      nodes = [...subNodes, ...synNodes];
      links = synNodes.map(s => ({ source: s, target: s.parent, kind: 'st' }));
      userLinks = localLinks().map(l => ({ source: byId.get(l.a.s), target: byId.get(l.b.s), kind: 'uu', ref: l })).filter(l => l.source && l.target);
      links.push(...userLinks);
      subNodes.forEach(n => { n.far = linksOf(n.id).some(l => otherEnd(l, n.id).b !== brain.id); n.brainId = n.ref.brainId && brainById(n.ref.brainId) ? n.ref.brainId : null; });
      sim.nodes(nodes); sim.force('link').links(links); refreshForces();
      if (warm) { sim.alpha(1); for (let i = 0; i < 200; i++) sim.tick(); }
      sim.alpha(warm ? 0.3 : 0.5).restart();
      if (api.selected) api.selected = byId.get(api.selected.id) || null;
      updateLevel();
    }
    function birth(o) { births.set(o.id, performance.now()); }

    // camera
    function fitAll(dur = 900) {
      const pts = subNodes.length > 1 ? subNodes : [{ x: 0, y: 0 }];
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      const empties = Object.values(anchor); xs.push(...empties.map(a => a.x)); ys.push(...empties.map(a => a.y));
      const padX = mobile() ? 150 : 140, padY = mobile() ? 170 : 150;
      const minX = Math.min(...xs) - padX, maxX = Math.max(...xs) + padX, minY = Math.min(...ys) - padY, maxY = Math.max(...ys) + padY;
      const padL = mobile() ? 0 : 410, padR = mobile() ? 0 : 340; // interview card on the left, categories list on the right
      const availH = mobile() ? H * 0.62 - 150 : H - 200;
      const labelRoom = mobile() ? 40 : 300; // screen-space allowance for the radial labels on the ring's left and right
      const kk = Math.min((W - padL - padR - labelRoom) / (maxX - minX), availH / (maxY - minY));
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const t = d3.zoomIdentity.translate(padL + (W - padL - padR) / 2 - cx * kk, (mobile() ? (90 + H * 0.62) / 2 : H / 2 + 10) - cy * kk).scale(Math.max(0.12, kk));
      d3.select(canvas).transition().duration(dur).ease(d3.easeCubicInOut).call(zoom.transform, t);
    }
    function zoomTo(x, y, kk, dur = 1000) {
      const padL = mobile() ? 0 : 430, padR = mobile() ? 0 : 380;
      const cy = mobile() ? H * 0.26 : H / 2;
      const t = d3.zoomIdentity.translate(padL + (W - padL - padR) / 2 - x * kk, cy - y * kk).scale(kk);
      d3.select(canvas).transition().duration(dur).ease(d3.easeCubicInOut).call(zoom.transform, t);
    }
    api.zoomToSub = id => { const n = byId.get(id); if (n) zoomTo(n.x, n.y, Math.max(k, n.nSyn > 12 ? 2.2 : 2.8)); };
    api.focusCat = id => { const ps = subNodes.filter(p => p.cat === id); const a = anchor[id] || anchor.you; const cx = ps.length ? d3.mean(ps, p => p.x) : a.x, cy = ps.length ? d3.mean(ps, p => p.y) : a.y; zoomTo(cx, cy, Math.max(0.9, Math.min(k, 1.3))); };
    api.nodeFor = id => byId.get(id) || null;
    api.fit = fitAll;
    // after an answer: if the neurons it landed on sit outside the visible stage, pull the camera back so growth is never off-screen
    api.ensureVisible = ids => {
      const ps = ids.map(id => byId.get(id)).filter(Boolean); if (!ps.length) return;
      const padL = mobile() ? 0 : 410, padR = mobile() ? 0 : 340, top = 70, bottom = mobile() ? H * 0.4 : H - 60;
      const off = ps.some(n => { const sx = n.x * k + tx, sy = n.y * k + ty; return sx < padL + 30 || sx > W - padR - 30 || sy < top || sy > bottom; });
      if (off) fitAll();
    };

    // pulses
    const pulses = []; let lastPulse = 0;
    // user connections are drawn as a quadratic curve bowing to one side; pulses ride the same curve
    const curveCtl = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, dl = Math.hypot(dx, dy) || 1, bend = Math.min(60, dl * 0.18); return [(a.x + b.x) / 2 - dy / dl * bend, (a.y + b.y) / 2 + dx / dl * bend]; };
    const s0 = l => l.source, s1 = l => l.target;
    function spawnPulse(l, fast) { if (!l || pulses.length > 40) return; pulses.push({ l, t: 0, speed: (fast ? 0.03 : 0.01) + Math.random() * 0.006 }); }

    // pointer
    const tip = $('tip'); let downAt = null;
    function pick(sx, sy) {
      const [x, y] = toWorld(sx, sy);
      const synOk = explodeF > 0.6;
      if (synOk) for (let i = synNodes.length - 1; i >= 0; i--) { const n = synNodes[i]; if (Math.hypot(n.x - x, n.y - y) < sw(7)) return n; }
      for (let i = subNodes.length - 1; i >= 0; i--) { const n = subNodes[i]; if (Math.hypot(n.x - x, n.y - y) < Math.max(n.r / Math.pow(k, 0.45), sw(9)) + sw(4)) return n; }
      for (const h of halos) if (Math.hypot(h.x - x, h.y - y) < h.r) return h;
      return null;
    }
    canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; canvas.classList.add('grabbing'); });
    canvas.addEventListener('pointerup', e => {
      canvas.classList.remove('grabbing');
      if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
      const n = pick(e.clientX, e.clientY);
      if (api.linkFrom) { const from = api.linkFrom; api.linkFrom = null; const to = n && (n.kind === 'sub' ? n : n.kind === 'syn' ? n.parent : null); if (to && to.id !== from) linkPicked(from, to.id); else toast('Connection cancelled.'); return; }
      if (!n) { clearSelection(); return; }
      if (n.kind === 'halo') selectCat(n.cat); else if (n.kind === 'sub') selectSub(n.id); else selectSub(n.parent.id, true);
    });
    canvas.addEventListener('dblclick', e => { const n = pick(e.clientX, e.clientY); if (n && n.kind === 'sub' && n.brainId) switchBrain(n.brainId); });
    canvas.addEventListener('pointermove', e => {
      pointerW = toWorld(e.clientX, e.clientY);
      const n = pick(e.clientX, e.clientY); api.hover = n && n.kind !== 'halo' ? n : null; canvas.classList.toggle('pointer', !!n); canvas.classList.toggle('linking', !!api.linkFrom);
      if (n) { tip.hidden = false; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.innerHTML = n.kind === 'halo' ? `<span class="k">category</span><b>${esc(catById(n.cat)?.name)}</b>${n.count ? pw(n.count, 'neuron') : 'empty · click to add or answer'}` : n.kind === 'sub' ? `<span class="k">${n.id === 'me' ? 'centre' : 'neuron'} · ${esc(catById(n.cat)?.name)}</span><b>${esc(n.name)}</b>${pw(n.nSyn, 'synapse')}${linksOf(n.id).length ? ' · ' + pw(linksOf(n.id).length, 'connection') : ''}${n.starred ? ' · ★' : ''}${n.brainId ? '<br>has a brain of its own · double-click to open' : n.id === 'me' && brain.origin ? `<br>grown from ${esc(brainLabel(brainById(brain.origin.brain)) )}` : ''}` : `<span class="k">${n.file ? 'file' : 'synapse'} of ${esc(n.parent.name)}</span><b>${esc(n.ref.lead || n.ref.kind)}</b>${esc(n.label.slice(0, 140))}`; }
      else tip.hidden = true;
    });
    canvas.addEventListener('pointerleave', () => { api.hover = null; tip.hidden = true; pointerW = null; });

    // level pill + zoom buttons
    const levelText = $('level-text'), levelDot = $('level').querySelector('.dot'), hint = $('hint');
    function updateLevel() {
      const ns = brain.subjects.length - 1, ne = brain.entries.length;
      const lvl = api.forceExplode || k >= 1.4 ? 'Synapses' : k >= 0.55 ? 'Neurons' : 'Categories';
      levelText.textContent = ns === 0 && ne === 0 ? 'Empty brain' : `${pw(ns, 'neuron')} · ${pw(ne, 'synapse')} · ${lvl} ${k.toFixed(1)}×`;
      const c = lvl === 'Synapses' ? '#ffffff' : lvl === 'Neurons' ? '#ff8a3d' : '#4fd1c5';
      levelDot.style.background = c; levelDot.style.boxShadow = `0 0 12px ${c}`;
      hint.textContent = ns === 0 ? 'answer a question to grow a neuron' : lvl === 'Categories' ? 'scroll to zoom · click a category or neuron' : lvl === 'Neurons' ? 'keep zooming: synapses explode at 1.4×' : 'click a synapse to open its neuron';
    }
    $('z-in').addEventListener('click', () => d3.select(canvas).transition().duration(350).call(zoom.scaleBy, 1.6));
    $('z-out').addEventListener('click', () => d3.select(canvas).transition().duration(350).call(zoom.scaleBy, 1 / 1.6));
    $('z-fit').addEventListener('click', () => { clearSelection(); fitAll(); });

    // draw
    let halos = [];
    const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    function draw(now) {
      const want = api.forceExplode || k >= 1.4 ? 1 : 0;
      if (want !== explodeTarget) explodeTarget = want;
      if (Math.abs(explodeF - explodeTarget) > 0.004) { explodeF += (explodeTarget - explodeF) * 0.12; refreshForces(); if (sim.alpha() < 0.2) sim.alpha(0.35).restart(); }
      else if (explodeF !== explodeTarget) { explodeF = explodeTarget; refreshForces(); }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.translate(tx, ty); ctx.scale(k, k);
      const haloVis = clamp01((1.3 - k) / 0.6);
      const synVis = api.forceExplode ? 1 : clamp01((k - 1.15) / 0.45);
      const labelVis = clamp01((k - 0.32) / 0.3);
      const synLabelVis = clamp01((k - 1.7) / 0.6);
      const focus = api.selected || api.hover;
      const focusSet = focus ? neighborhood(focus) : null;
      const [vx0, vy0] = toWorld(-80, -80), [vx1, vy1] = toWorld(W + 80, H + 80);
      const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
      const nodeR = n => n.kind === 'sub' ? n.r / Math.pow(k, 0.45) : sw(3.2);
      const scaleOf = n => { const b = births.get(n.id); if (b === undefined) return 1; const t = (now - b) / 700; if (t >= 1) { births.delete(n.id); return 1; } return reduceMotion ? 1 : easeOutBack(Math.max(0, t)); };

      // category halos (also the places empty categories live)
      halos = [];
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let li = 0;
      brain.cats.forEach(c => {
        if (c.id === 'you') return;
        const ps = subNodes.filter(p => p.cat === c.id); const a = anchor[c.id]; if (!a && !ps.length) return;
        const stagger = (li++ % 2) * sw(22); // alternate label radii so neighbours do not collide at the top and bottom of the ring
        const cx = ps.length ? d3.mean(ps, p => p.x) : a.x, cy = ps.length ? d3.mean(ps, p => p.y) : a.y;
        const rr = ps.length ? Math.max(48, d3.quantile(ps.map(p => Math.hypot(p.x - cx, p.y - cy)).sort(d3.ascending), 0.92) + 46 + explodeF * 30) : 46;
        halos.push({ kind: 'halo', cat: c.id, x: cx, y: cy, r: rr, count: ps.length });
        if (haloVis <= 0) return;
        const dimmed = api.selected?.kind === 'sub' && api.selected.cat !== c.id ? 0.5 : 1;
        const v = haloVis * dimmed * (c.enabled || ps.length ? 1 : 0.4);
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        if (ps.length) { ctx.fillStyle = rgba(c.color, 0.06 * v); ctx.fill(); ctx.setLineDash([]); ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(c.color, 0.24 * v); }
        else { ctx.setLineDash([sw(3), sw(5)]); ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(c.color, 0.45 * v); }
        ctx.stroke(); ctx.setLineDash([]);
        const dl = Math.hypot(cx, cy) || 1, ux = cx / dl, uy = cy / dl;
        const fs = mobile() ? 10.5 + Math.sqrt(ps.length) * 1.6 : Math.min(W / 24, 12.5 + Math.sqrt(ps.length) * 2.2);
        if (mobile() && !ps.length && k < 0.4) return; // too dense on phones: empty rings stay anonymous until you zoom or open the list
        const showSub = !(!ps.length && k < (mobile() ? 0.6 : 0.42));
        const m = mobile();
        const off = rr + sw(12) + (k < 0.6 ? stagger : 0);
        const ax = m ? cx : cx + ux * off, ay = m ? cy + (uy < 0 ? -1 : 1) * (rr + sw(10) + (k < 0.6 ? stagger : 0)) : cy + uy * off, lh = sw(fs + 5);
        ctx.textAlign = m || Math.abs(ux) < 0.1 ? 'center' : ux > 0 ? 'left' : 'right';
        const top = uy < 0;
        ctx.font = `600 ${sw(fs)}px 'Clash Display', 'Satoshi', sans-serif`; ctx.fillStyle = rgba(c.color, 0.9 * v);
        ctx.fillText(c.name, ax, top ? ay - lh : ay);
        ctx.font = `500 ${sw(11)}px 'Satoshi', sans-serif`; ctx.fillStyle = rgba('#a7b2cc', 0.8 * v);
        const ne = brain.entries.filter(e => e.cat === c.id).length;
        if (showSub) ctx.fillText(ps.length ? `${pw(ps.length, 'neuron')} · ${pw(ne, 'synapse')}` : c.enabled ? 'empty · waiting for answers' : 'empty · questions off', ax, top ? ay : ay + lh);
        ctx.textAlign = 'center';
      });

      // centre → neuron tethers
      subNodes.forEach(n => {
        if (n.id === 'me' || !inView(n.x, n.y)) return;
        const related = !focusSet || focusSet.has(n);
        ctx.strokeStyle = rgba(colorOf(n), (related ? 0.16 : 0.03) * (n.cat === 'you' ? 2 : 1)); ctx.lineWidth = sw(0.7);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(n.x, n.y); ctx.stroke();
      });
      // the user's connections: curved, coloured by their ends, labelled when the neuron is in focus
      const linkLabelVis = clamp01((k - 0.5) / 0.4);
      userLinks.forEach(l => {
        const a = l.source, b = l.target; if (!inView(a.x, a.y) && !inView(b.x, b.y)) return;
        const related = !focusSet || (focusSet.has(a) && focusSet.has(b));
        const dx = b.x - a.x, dy = b.y - a.y, [cx, cy] = curveCtl(a, b);
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, rgba(colorOf(a), related ? 0.75 : 0.08)); g.addColorStop(1, rgba(colorOf(b), related ? 0.75 : 0.08));
        ctx.strokeStyle = g; ctx.lineWidth = sw(0.6 + 0.7 * l.ref.strength); ctx.setLineDash(l.ref.strength === 1 ? [sw(4), sw(4)] : []);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
        if (related && focusSet && linkLabelVis > 0.02) {
          const px = 0.25 * a.x + 0.5 * cx + 0.25 * b.x, py = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
          let ang = Math.atan2(dy, dx); if (Math.cos(ang) < 0) ang += Math.PI;
          ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.font = `500 ${sw(11)}px 'Satoshi', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          const lab = l.ref.label.length > 32 ? l.ref.label.slice(0, 30) + '…' : l.ref.label;
          ctx.fillStyle = rgba('#000000', 0.5 * linkLabelVis); ctx.fillText(lab, sw(0.8), -sw(3) + sw(0.8));
          ctx.fillStyle = rgba('#f1f4ff', 0.92 * linkLabelVis); ctx.fillText(lab, 0, -sw(3)); ctx.restore();
        }
      });
      // rubber band while picking a connection target
      if (api.linkFrom && pointerW) { const a = byId.get(api.linkFrom); if (a) { ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = sw(1.2); ctx.setLineDash([sw(5), sw(4)]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointerW[0], pointerW[1]); ctx.stroke(); ctx.setLineDash([]); } }
      // synapse tethers
      if (synVis > 0.02 && explodeF > 0.05) {
        const v = synVis * explodeF;
        links.forEach(l => { if (!inView(l.target.x, l.target.y)) return; const related = !focusSet || focusSet.has(l.source) || focusSet.has(l.target); ctx.strokeStyle = rgba(colorOf(l.target), (related ? 0.35 : 0.05) * v); ctx.lineWidth = sw(0.8); ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke(); });
      }
      // pulses along the spokes
      if (!reduceMotion && subNodes.length > 1) {
        if (now - lastPulse > 420) { lastPulse = now; if (userLinks.length && Math.random() < 0.35) { const l = userLinks[Math.floor(Math.random() * userLinks.length)]; spawnPulse(Math.random() < 0.5 ? l : { source: l.target, target: l.source, kind: 'uu', rev: l }); } else { const n = subNodes[1 + Math.floor(Math.random() * (subNodes.length - 1))]; spawnPulse({ source: byId.get('me'), target: n }); } }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]; p.t += p.speed; if (p.t >= 1) { pulses.splice(i, 1); continue; }
          const s = p.l.source, e = p.l.target; if (!s || !e) { pulses.splice(i, 1); continue; }
          let x = s.x + (e.x - s.x) * p.t, y = s.y + (e.y - s.y) * p.t; const a = Math.sin(p.t * Math.PI) * (focusSet ? 0.5 : 1);
          if (p.l.kind === 'uu') { const L = p.l.rev || p.l, [cx, cy] = curveCtl(s0(L), s1(L)); const t = p.l.rev ? 1 - p.t : p.t, u = 1 - t; x = u * u * s0(L).x + 2 * u * t * cx + t * t * s1(L).x; y = u * u * s0(L).y + 2 * u * t * cy + t * t * s1(L).y; }
          ctx.fillStyle = rgba(colorOf(e), 0.9 * a); ctx.beginPath(); ctx.arc(x, y, sw(2.2), 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = rgba(colorOf(e), 0.25 * a); ctx.beginPath(); ctx.arc(x, y, sw(6), 0, Math.PI * 2); ctx.fill();
        }
      }
      // synapses
      if (synVis > 0.02 && explodeF > 0.05) {
        synNodes.forEach(n => {
          if (!inView(n.x, n.y)) return;
          const related = !focusSet || focusSet.has(n); const col = colorOf(n); const sc = scaleOf(n);
          const r = nodeR(n) * (0.5 + 0.5 * explodeF) * sc;
          if (n.file) { ctx.fillStyle = rgba('#dbe4ff', (related ? 0.95 : 0.15) * synVis); const rr = r * 1.25; ctx.beginPath(); ctx.moveTo(n.x, n.y - rr * 1.4); ctx.lineTo(n.x + rr, n.y); ctx.lineTo(n.x, n.y + rr * 1.4); ctx.lineTo(n.x - rr, n.y); ctx.closePath(); ctx.fill(); }
          else { ctx.fillStyle = rgba(col, (related ? 0.95 : 0.15) * synVis); ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill(); }
          if (n.ref.kind === 'link') { ctx.strokeStyle = rgba('#ffffff', 0.7 * synVis); ctx.lineWidth = sw(0.8); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(1.6), 0, Math.PI * 2); ctx.stroke(); }
          const lv = focusSet && related ? Math.max(synLabelVis, clamp01((k - 1.4) / 0.4)) : synLabelVis;
          if (lv > 0.02 && related) {
            const p = n.parent; let ang = Math.atan2(n.y - p.y, n.x - p.x); const flip = Math.cos(ang) < 0;
            ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(flip ? ang + Math.PI : ang);
            ctx.font = `500 ${sw(10.5)}px 'Satoshi', sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = flip ? 'right' : 'left';
            ctx.fillStyle = rgba('#e9eefb', 0.92 * lv * synVis * explodeF);
            const label = n.label.length > 38 ? n.label.slice(0, 36) + '…' : n.label;
            ctx.fillText(label, flip ? -(r + sw(5)) : r + sw(5), 0); ctx.restore();
          }
        });
      }
      // neurons
      subNodes.forEach(n => {
        if (!inView(n.x, n.y)) return;
        const related = !focusSet || focusSet.has(n); const col = colorOf(n); const sc = scaleOf(n);
        const r = nodeR(n) * sc, a = related ? 1 : 0.2;
        if (sc < 1) { ctx.strokeStyle = rgba(col, 0.6 * (1 - sc)); ctx.lineWidth = sw(1.5); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(6) + (1 - sc) * sw(40), 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = rgba(col, 0.10 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col, 0.22 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col, 0.95 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.55 * a); ctx.beginPath(); ctx.arc(n.x - r * 0.25, n.y - r * 0.25, r * 0.32, 0, Math.PI * 2); ctx.fill();
        if (explodeF < 0.95 && n.nSyn) { ctx.strokeStyle = rgba(col, 0.5 * a * (1 - explodeF)); ctx.lineWidth = sw(1); ctx.setLineDash([sw(1.5), sw(Math.max(2, 40 / n.nSyn))]); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        // a neuron with a brain of its own, or with connections into another brain, wears a thin dashed ring (the network mark)
        if (n.brainId || n.far) { ctx.strokeStyle = rgba('#ffffff', (n.brainId ? 0.85 : 0.5) * a); ctx.lineWidth = sw(n.brainId ? 1.3 : 0.9); ctx.setLineDash([sw(3), sw(3)]); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(n.brainId ? 13 : 11), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        if (n.starred) { ctx.fillStyle = rgba('#ffd166', 0.95 * a); ctx.font = `${sw(9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', n.x + r + sw(5), n.y - r - sw(3)); }
        if (n === api.selected) { ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = sw(1.6); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(9), 0, Math.PI * 2); ctx.stroke(); }
        else if (n === api.hover) { ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = sw(1.2); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(7), 0, Math.PI * 2); ctx.stroke(); }
        const me = n.id === 'me';
        const lv = me ? 1 : Math.max(labelVis, subNodes.length <= 12 ? 0.9 : 0);
        if (lv > 0.02 && (related || lv > 0.6)) {
          ctx.font = `${me ? 600 : 500} ${sw(me ? 15 : 12)}px 'Satoshi', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          const label = me ? (brain.name || 'You') : n.name;
          ctx.fillStyle = rgba('#000000', 0.55 * lv * a); ctx.fillText(label, n.x + sw(0.8), n.y + r + sw(5.8));
          ctx.fillStyle = rgba(related ? '#f1f4ff' : '#9aa5c2', (related ? 0.95 : 0.5) * lv); ctx.fillText(label, n.x, n.y + r + sw(5));
          if (n.brainId && k > 0.45) { ctx.font = `500 ${sw(9.5)}px 'Satoshi', sans-serif`; ctx.fillStyle = rgba('#a7b2cc', 0.85 * lv); ctx.fillText('own brain ↗', n.x, n.y + r + sw(5) + sw(me ? 18 : 15)); }
        }
      });
      // an empty brain still shows where you are
      if (subNodes.length === 1 && !brain.name) {
        ctx.font = `500 ${sw(12)}px 'Satoshi', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = rgba('#a7b2cc', 0.7);
        ctx.fillText('your brain starts here', 0, sw(34));
      }
      requestAnimationFrame(draw);
    }
    function neighborhood(n) {
      const set = new Set([n]);
      if (n.kind === 'sub') { synNodes.forEach(s => { if (s.parent === n) set.add(s); }); userLinks.forEach(l => { if (l.source === n) set.add(l.target); if (l.target === n) set.add(l.source); }); if (n.id !== 'me') set.add(byId.get('me')); else subNodes.forEach(s => set.add(s)); }
      else if (n.kind === 'syn') { set.add(n.parent); synNodes.forEach(s => { if (s.parent === n.parent) set.add(s); }); }
      return set;
    }
    api.rebuild = rebuild; api.birth = birth; api.updateLevel = updateLevel;
    api.start = () => { rebuild(true); fitAll(0); requestAnimationFrame(draw); };
    return api;
  })();

  // ---------- boot ----------
  (async () => {
    await store.open();
    const saved = await store.loadBrain();
    net = saved && typeof saved === 'object' ? sanitizeNet(saved) : emptyNet(); brain = brainById(net.active);
    if (!saved) await save(true);
    updateStore(); renderCats(); renderBrainSwitch(); graph.start();
    iv.classList.toggle('paused', brain.paused); $('iv-pause').textContent = brain.paused ? 'Resume' : 'Pause';
    if (saved && brain.name) advance(`Welcome back, ${brain.name}.`); else advance();
    document.fonts?.ready.then(() => $('loading').classList.add('done'));
    setTimeout(() => $('loading').classList.add('done'), 1500);
  })();
})();
