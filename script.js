'use strict';

/* ================================================================
   PRESENSI KELAS — script.js
   Dipakai oleh login.html (form login) dan index.html (dashboard)
================================================================ */

/* ===== KONFIGURASI ===== */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwhpeZ9abc6BoZ3MJR790U9CkrV0oLRETrP2PtbKVu4mOydJ3sZ4Xz78ijB5PM9tu2x/exec',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1OmJeh0-W-7BnxZWDTJjesMJl1v31CJjf8dRHmXFuF2g/edit?gid=2067236183#gid=2067236183',
  REFRESH_MS: 15000,
  CACHE_KEY: 'mahasiswaData',
  SOUND_KEY: 'presensiSound',
  THEME_KEY: 'presensiTheme',
  SESSION_KEY: 'presensiSesi',
  AUTH_KEY: 'presensiAuth',
  QUEUE_KEY: 'presensiQueue',
  QR_PREFIX: 'PRSN',
  QR_SALT: 'presensi-kelas-2026',
  INSTITUTION: { name: 'Nama Kampus Anda', prodi: 'Program Studi Anda (S1)' },
  SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8],
  ACCOUNTS: [
    { user: 'dosen', pass: 'dosen123', name: 'Dosen Demo' },
    { user: 'admin', pass: 'admin123', name: 'Admin' }
  ]
};

/* ===== HELPER ===== */
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const clockStr = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const dateStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

/* ===== STORE ===== */
const Store = {
  roster: [], today: new Map(), online: false, busy: false, scanning: false, starting: false, userStopped: false,
  torch: false, reader: null, cardNim: '', query: '', filter: 'all', classFilter: 'all', flashNim: null, fullscreen: false
};

/* ===== AUTH ===== */
const Auth = {
  _ready: false,
  current() {
    try { return JSON.parse(localStorage.getItem(CONFIG.AUTH_KEY) || 'null'); }
    catch (e) { return null; }
  },
  login(user, pass) {
    const acc = CONFIG.ACCOUNTS.find((a) => a.user.toLowerCase() === String(user).trim().toLowerCase() && a.pass === pass);
    if (!acc) return false;
    localStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify({ user: acc.user, name: acc.name }));
    return true;
  },
  logout() {
    localStorage.removeItem(CONFIG.AUTH_KEY);
    location.replace('login.html');
  },
  updateUI(me) {
    const chip = $('userChip');
    if (!chip) return;
    $('userAvatar').textContent = (me.name || me.user || '?').slice(0, 1).toUpperCase();
    $('userName').textContent = me.name || me.user;
    chip.onclick = () => { if (confirm('Keluar dari sistem?')) this.logout(); };
  },
  // Dipanggil dari init() saat halaman login dibuka
  initLoginPage() {
    if (this._ready) return;
    this._ready = true;

    // Sudah login -> langsung ke dashboard
    if (this.current()) { location.replace('index.html'); return; }

    const demoList = $('demoList');
    if (demoList) {
      demoList.innerHTML = CONFIG.ACCOUNTS.map((a) => (
        `<div class="auth-demo-item" data-user="${esc(a.user)}" data-pass="${esc(a.pass)}">
          <span>${esc(a.name)}</span>
          <span>${esc(a.user)} / ${esc(a.pass)}</span>
        </div>`
      )).join('');
      demoList.querySelectorAll('.auth-demo-item').forEach((el) => {
        el.addEventListener('click', () => {
          $('loginUser').value = el.dataset.user;
          $('loginPass').value = el.dataset.pass;
        });
      });
    }

    $('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.login($('loginUser').value, $('loginPass').value)) {
        location.replace('index.html');
      } else {
        const err = $('loginError');
        err.classList.add('show');
        setTimeout(() => err.classList.remove('show'), 2500);
      }
    });
  }
};

/* ===== THEME ===== */
const Theme = {
  current: 'light',
  init() {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.current = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this.current);
    this.paint();
  },
  toggle() { this.set(this.current === 'light' ? 'dark' : 'light'); },
  set(theme) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(CONFIG.THEME_KEY, theme);
    this.paint();
    Notice.show(`Mode ${theme === 'dark' ? 'gelap 🌙' : 'terang ☀️'} aktif`, 'info', 2000);
  },
  paint() {
    const btn = $('btnTheme');
    if (!btn) return;
    btn.innerHTML = this.current === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }
};

/* ===== PARTICLES ===== */
const Particles = {
  init() {
    const container = $('particles');
    if (!container || container.childElementCount) return;
    const count = window.innerWidth < 768 ? 12 : 24;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (8 + Math.random() * 12) + 's';
      p.style.animationDelay = Math.random() * 10 + 's';
      p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
      p.style.opacity = 0.2 + Math.random() * 0.4;
      container.appendChild(p);
    }
  }
};

/* ===== RIPPLE ===== */
const Ripple = {
  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .btn-icon, .chip, .nav-link, .tab');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }
};

/* ===== NOTICE ===== */
const Notice = {
  el: null, timer: null,
  icons: { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' },
  init() { this.el = $('notice'); },
  show(message, type = 'info', ms = 4000) {
    if (!this.el) return;
    this.el.className = 'notice show ' + type;
    this.el.innerHTML = `<i class="fa-solid ${this.icons[type] || this.icons.info}"></i> ${esc(message)}`;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.el.classList.remove('show'), ms);
  }
};

function setNet(state, label) {
  const dot = $('netDot');
  if (dot) dot.className = 'net-dot ' + state;
  const lab = $('netLabel');
  if (lab) lab.textContent = label;
  Store.online = state === 'online';
}

function setScanInfo(stateText, hintText) {
  if (stateText) {
    if ($('scanState')) $('scanState').textContent = stateText;
    if ($('footStatus')) $('footStatus').textContent = stateText;
  }
  if (hintText && $('scanHintText')) $('scanHintText').textContent = hintText;
}

function countTo(el, to) {
  if (!el) return;
  const from = parseInt(el.textContent, 10) || 0;
  if (from === to) return;
  const start = performance.now(), dur = 700;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setCircleProgress(index, percent) {
  const circle = document.querySelectorAll('.stat-circle .circle-fill')[index];
  if (!circle) return;
  circle.setAttribute('stroke-dasharray', `${Math.max(0, Math.min(100, percent))}, 100`);
}

/* ===== JAM ===== */
function startClock() {
  const fmtD = (d) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
  const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  const tick = () => {
    const d = new Date();
    const t = clockStr(d), dt = fmtD(d);
    setText('clockTime', t); setText('clockDate', dt);
    setText('instClockTime', t); setText('instClockDate', dt);
  };
  tick();
  setInterval(tick, 1000);
}

/* ===== FEEDBACK (suara & getar) ===== */
const Feedback = {
  on: localStorage.getItem(CONFIG.SOUND_KEY) !== 'off',
  ctx: null,
  unlock() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {}
  },
  tone(freq, start, dur, type = 'sine') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + start + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(this.ctx.currentTime + start);
    o.stop(this.ctx.currentTime + start + dur + 0.05);
  },
  play(kind) {
    if (!this.on) return;
    if (kind === 'success') { this.tone(880, 0, 0.12); this.tone(1320, 0.12, 0.18); navigator.vibrate && navigator.vibrate(80); }
    else if (kind === 'warning') { this.tone(660, 0, 0.15); this.tone(660, 0.2, 0.15); navigator.vibrate && navigator.vibrate([60, 60, 60]); }
    else { this.tone(220, 0, 0.3); navigator.vibrate && navigator.vibrate(200); }
  },
  toggle() {
    this.on = !this.on;
    localStorage.setItem(CONFIG.SOUND_KEY, this.on ? 'on' : 'off');
    this.paint(); this.unlock();
    Notice.show(this.on ? 'Suara & getar aktif 🔊' : 'Suara & getar dimatikan 🔇', 'info', 2000);
  },
  paint() {
    const b = $('btnSound');
    if (!b) return;
    b.classList.toggle('muted', !this.on);
    b.innerHTML = `<i class="fa-solid ${this.on ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
  }
};

/* ===== HASIL SCAN (overlay) ===== */
const ScanResult = {
  timer: null,
  show(kind, title, sub) {
    const el = $('scanResult');
    if (!el) return;
    el.className = 'scan-result ' + kind;
    $('srIcon').className = 'fa-solid ' + ({ success: 'fa-check', warning: 'fa-clock', error: 'fa-xmark' }[kind] || 'fa-xmark');
    $('srTitle').textContent = title;
    $('srSub').textContent = sub || '';
    void el.offsetWidth;
    el.classList.add('show');
    Feedback.play(kind);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => el.classList.remove('show'), 2300);
  }
};

/* ===== API ===== */
const Api = {
  async get(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${CONFIG.API_URL}?${qs}`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let json;
    try { json = await res.json(); }
    catch (e) { throw new Error('Respons server bukan JSON — cek deploy Apps Script (akses harus "Anyone")'); }
    if (!json || json.success === false) throw new Error(json && json.message ? json.message : 'Respons server tidak valid');
    return json;
  },
  async students() { return normalizeRoster((await this.get('get_all')).data); },
  async todayAttendance() {
    const s = Session.data;
    // Sesi belum lengkap -> jangan tampilkan status hadir apa pun
    if (!s.kelas || !String(s.matkul || '').trim()) { Store.today = new Map(); return; }
    const json = await this.get('get_today_attendance', { kelas: s.kelas, matkul: String(s.matkul).trim() });
    const map = new Map();
    (json.data || []).forEach((r) => map.set(String(r.nim), { waktu: r.waktu, status: r.status }));
    Store.today = map;
  },
  async submit(nim, ctx = Session.data) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'presensi', nim, semester: ctx.semester, kelas: ctx.kelas, matkul: String(ctx.matkul || '').trim() }),
      signal: AbortSignal.timeout(20000)
    });
    try { return await res.json(); }
    catch (e) { throw new Error('BAD_RESPONSE'); }
  }
};

function normalizeRoster(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const n = {};
    Object.keys(row || {}).forEach((k) => { n[k.toString().trim().toLowerCase().replace(/\s+/g, '')] = row[k]; });
    return {
      nim: String(n.nim ?? '').trim(),
      nama: String(n.nama ?? '').trim(),
      kelas: String(n.kelas ?? '').trim(),
      jurusan: String(n.jurusan ?? '').trim()
    };
  }).filter((m) => m.nim !== '');
}

/* ===== TOKEN QR ===== */
const Token = {
  sign(nim) {
    const s = `${CONFIG.QR_SALT}|${nim}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36).toUpperCase().padStart(7, '0');
  },
  encode(nim) { return `${CONFIG.QR_PREFIX}:${nim}:${this.sign(nim)}`; },
  decode(text) {
    const p = String(text || '').trim().split(':');
    if (p.length !== 3 || p[0] !== CONFIG.QR_PREFIX) return null;
    return p[2] === this.sign(p[1]) ? p[1] : null;
  }
};

/* ===== SESI PERKULIAHAN ===== */
const Session = {
  data: { semester: '', kelas: '', matkul: '' },
  kelasSig: null,
  reloadTimer: null,

  load() {
    try { this.data = { ...this.data, ...JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY) || '{}') }; }
    catch (e) {}
    if (this.data.kelas) Store.classFilter = this.data.kelas;
  },
  save() { localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(this.data)); },
  isReady() {
    const d = this.data;
    return !!(d.semester && d.kelas && String(d.matkul || '').trim());
  },
  populateSemester() {
    const sel = $('semesterSelect');
    if (!sel) return;
    if (sel.options.length <= 1) {
      sel.innerHTML = '<option value="">— Pilih Semester —</option>' + CONFIG.SEMESTERS.map((s) => `<option value="${s}">Semester ${s}</option>`).join('');
    }
    sel.value = this.data.semester || '';
  },
  populateKelas() {
    const kelasSel = $('sessionKelas');
    if (!kelasSel) return;
    const classes = Roster.getClasses();
    // Kelas tersimpan sudah tidak ada di data -> kosongkan
    if (classes.length && this.data.kelas && !classes.includes(this.data.kelas)) {
      this.data.kelas = ''; this.data.matkul = ''; this.save();
    }
    const enabled = !!this.data.semester;
    const sig = (enabled ? '1|' : '0|') + classes.join('|');
    if (sig !== this.kelasSig) {
      this.kelasSig = sig;
      kelasSel.innerHTML = enabled
        ? '<option value="">— Pilih Kelas —</option>' + classes.map((k) => `<option value="${esc(k)}">Kelas ${esc(k)}</option>`).join('')
        : '<option value="">— Pilih Semester dulu —</option>';
    }
    kelasSel.disabled = !enabled;
    kelasSel.value = enabled ? (this.data.kelas || '') : '';
  },
  applyKelasToMatkul() {
    const input = $('sessionMatkul');
    if (!input) return;
    if (!this.data.kelas) {
      input.disabled = true; input.value = ''; input.placeholder = '— Pilih Kelas dulu —';
      return;
    }
    input.disabled = false;
    input.placeholder = 'Contoh: Pemrograman Web';
    if (document.activeElement !== input) input.value = this.data.matkul || '';
  },
  updateStatus() {
    const box = $('sessionStatus'), txt = $('sessionStatusText');
    if (!box || !txt) return;
    if (this.isReady()) {
      txt.textContent = `Aktif: Semester ${this.data.semester} · Kelas ${this.data.kelas} · ${this.data.matkul}`;
      box.classList.add('show');
    } else box.classList.remove('show');
  },
  syncClassFilter() {
    const cf = $('classFilter');
    if (this.data.kelas) {
      Store.classFilter = this.data.kelas;
      if (cf && [...cf.options].some((o) => o.value === this.data.kelas)) cf.value = this.data.kelas;
    }
    Roster.animateNext = true;
    Roster.render();
  },
  refresh() {
    this.populateSemester();
    this.populateKelas();
    this.applyKelasToMatkul();
    this.updateStatus();
  },
  // Ambil ulang status hadir sesuai sesi yang baru dipilih
  scheduleReload() {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(async () => {
      try { await Api.todayAttendance(); } catch (e) { console.warn('Gagal ambil presensi:', e.message); }
      Roster.render();
      Log.render();
    }, 500);
  },
  init() {
    this.load();
    this.refresh();

    on('semesterSelect', 'change', (e) => {
      this.data.semester = e.target.value;
      this.data.kelas = ''; this.data.matkul = '';
      this.save(); this.refresh();
      Roster.renderSession();
      this.scheduleReload();
    });
    on('sessionKelas', 'change', (e) => {
      this.data.kelas = e.target.value;
      if (!this.data.kelas) this.data.matkul = '';
      this.save(); this.applyKelasToMatkul(); this.updateStatus();
      this.syncClassFilter();
      this.scheduleReload();
    });
    on('sessionMatkul', 'input', (e) => {
      this.data.matkul = e.target.value;
      this.save(); this.updateStatus();
      Roster.renderSession();
      this.scheduleReload();
    });
  }
};

/* ===== DAFTAR MAHASISWA ===== */
const Roster = {
  suffix: '',
  animateNext: true,
  loading: false,
  classSig: null,

  isPresent(nim) { return Store.today.has(nim); },
  getClasses() {
    return [...new Set(Store.roster.map((m) => m.kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  },
  populateClassFilter() {
    const classes = this.getClasses();
    if (Store.classFilter !== 'all' && !classes.includes(Store.classFilter)) Store.classFilter = 'all';
    const sel = $('classFilter');
    if (sel) {
      const sig = classes.join('|');
      if (sig !== this.classSig) {
        this.classSig = sig;
        sel.innerHTML = '<option value="all">Semua Kelas</option>' + classes.map((k) => `<option value="${esc(k)}">Kelas ${esc(k)}</option>`).join('');
      }
      sel.value = Store.classFilter;
    }
    Session.refresh();
  },
  scoped() {
    return Store.classFilter === 'all' ? Store.roster : Store.roster.filter((m) => m.kelas === Store.classFilter);
  },
  filtered() {
    const q = Store.query.trim().toLowerCase();
    return this.scoped().filter((m) => {
      const present = this.isPresent(m.nim);
      if (Store.filter === 'hadir' && !present) return false;
      if (Store.filter === 'belum' && present) return false;
      if (!q) return true;
      return [m.nim, m.nama, m.kelas, m.jurusan].some((v) => v.toLowerCase().includes(q));
    });
  },
  updateStats() {
    const list = this.scoped();
    const total = list.length;
    const hadir = list.filter((m) => this.isPresent(m.nim)).length;
    const belum = Math.max(total - hadir, 0);
    const pct = total ? Math.round((hadir / total) * 100) : 0;
    countTo($('statTotal'), total);
    countTo($('statHadir'), hadir);
    countTo($('statBelum'), belum);
    if ($('progressPct')) $('progressPct').textContent = pct + '%';
    if ($('progressFill')) $('progressFill').style.width = pct + '%';
    setCircleProgress(0, 100);
    setCircleProgress(1, total ? (hadir / total) * 100 : 0);
    setCircleProgress(2, total ? (belum / total) * 100 : 0);
  },
  showState(html) {
    const stateBox = $('stateBox');
    if (stateBox) { stateBox.innerHTML = html; stateBox.hidden = false; }
    const table = $('rosterTable');
    if (table) table.hidden = true;
  },
  renderSession() {
    const el = $('rosterSession');
    if (!el) return;
    const d = Session.data;
    const parts = [];
    if (d.semester) parts.push(`Semester ${esc(d.semester)}`);
    parts.push(Store.classFilter === 'all' ? 'Semua kelas' : `Kelas ${esc(Store.classFilter)}`);
    el.innerHTML = `<i class="fa-solid fa-book-open"></i><strong>${parts.join(' · ')}</strong>` +
      (d.matkul ? `<span>· ${esc(d.matkul)}</span>` : '<span class="warn">· Mata kuliah belum diisi</span>');
  },
  render() {
    const body = $('rosterBody');
    if (!body) return;
    const base = this.scoped();
    const list = this.filtered().sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
    const filtering = Store.query.trim() || Store.filter !== 'all';
    this.renderSession();
    if ($('listCount')) $('listCount').textContent = (filtering ? `${list.length} dari ${base.length}` : `${base.length}`) + ' mahasiswa' + this.suffix;
    this.updateStats();
    if (!Store.roster.length) { this.showState('<i class="fa-solid fa-inbox big"></i><strong>Tidak ada data</strong>'); return; }
    if (!base.length) { this.showState('<i class="fa-solid fa-inbox big"></i><strong>Belum ada mahasiswa di kelas ini</strong><p>Cek kolom Kelas di Google Sheets.</p>'); return; }
    if (!list.length) { this.showState('<i class="fa-solid fa-magnifying-glass big"></i><strong>Tidak ada hasil</strong><p>Coba kata kunci atau filter lain.</p>'); return; }
    body.className = this.animateNext ? 'animate' : '';
    this.animateNext = false;
    body.innerHTML = list.map((m, i) => {
      const rec = Store.today.get(m.nim);
      const ok = !!rec;
      return `<tr data-nim="${esc(m.nim)}" class="${Store.flashNim === m.nim ? 'flash' : ''}" style="--i:${Math.min(i, 15)}">
        <td>${i + 1}</td>
        <td>${esc(m.nim)}</td>
        <td>${esc(m.nama) || '-'}</td>
        <td>${esc(m.kelas) || '-'}</td>
        <td>${esc(m.jurusan) || '-'}</td>
        <td><span class="pill ${ok ? 'hadir' : 'belum'}"><i class="fa-solid fa-circle"></i> ${ok ? 'Hadir' : 'Belum'}</span></td>
        <td class="waktu">${ok && rec.waktu ? esc(rec.waktu) : '-'}</td>
      </tr>`;
    }).join('');
    Store.flashNim = null;
    if ($('stateBox')) $('stateBox').hidden = true;
    if ($('rosterTable')) $('rosterTable').hidden = false;
  },
  markPresent(nim, waktu) {
    const old = Store.today.get(nim);
    Store.today.set(nim, { waktu: waktu || (old && old.waktu) || clockStr(), status: 'Hadir' });
    Store.flashNim = nim;
    this.render();
    Log.render(nim);
  },
  useCache(label) {
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length) {
        Store.roster = cached;
        this.suffix = ` (${label})`;
        this.populateClassFilter();
        this.render();
        Log.render();
        return true;
      }
    } catch (e) {}
    return false;
  },
  async load(silent = false) {
    if (this.loading) return;
    this.loading = true;
    const first = !Store.roster.length;
    if (!silent) this.animateNext = true;
    if (first) this.showState('<i class="fa-solid fa-spinner fa-spin big"></i><strong>Mengambil data...</strong><p>Menghubungkan ke Google Sheets</p>');
    if (!silent) setNet('checking', 'Mengecek...');
    try {
      await Queue.flush();
      const data = await Api.students();
      try { await Api.todayAttendance(); }
      catch (e) {
        console.warn('Gagal ambil presensi hari ini:', e.message);
        if (!silent) Notice.show('Daftar tersinkron, tapi data presensi gagal dibaca: ' + e.message, 'warning', 6000);
      }
      if (data.length) {
        Store.roster = data;
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
        this.suffix = '';
        this.populateClassFilter();
        this.render();
        Log.render();
        setNet('online', 'Online');
        if (!silent) Notice.show(`${data.length} data mahasiswa tersinkron ✓`, 'success', 3000);
        return;
      }
      // Sheet terhubung tapi kosong
      Store.roster = [];
      localStorage.removeItem(CONFIG.CACHE_KEY);
      setNet('online', 'Online - kosong');
      this.showState(`<i class="fa-solid fa-circle-info big" style="color:hsl(var(--gold-deep))"></i><strong>Belum ada data</strong><p>Isi tab Mahasiswa di Google Sheets (header: NIM, Nama, Kelas, Jurusan).</p><a class="btn btn-main btn-sm" href="${CONFIG.SHEET_URL}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Sheets</a><button class="btn btn-ghost btn-sm" onclick="Roster.load()"><i class="fa-solid fa-rotate"></i> Refresh</button>`);
      if ($('listCount')) $('listCount').textContent = '0 mahasiswa';
    } catch (err) {
      console.error('Gagal memuat data:', err);
      setNet('offline', 'Offline');
      const hasData = Store.roster.length ? true : this.useCache('cache');
      if (hasData) {
        this.suffix = ' (cache)';
        this.render();
        if (!silent) Notice.show('Server tidak terhubung: ' + err.message + ' — memakai data cache', 'warning', 6000);
        return;
      }
      this.showState(`<i class="fa-solid fa-triangle-exclamation big" style="color:hsl(var(--destructive))"></i><strong>Gagal memuat data</strong><p>${esc(err.message)}</p><button class="btn btn-main btn-sm" onclick="Roster.load()"><i class="fa-solid fa-rotate"></i> Coba lagi</button>`);
      if ($('listCount')) $('listCount').textContent = '0 mahasiswa';
    } finally {
      this.loading = false;
    }
  },
  exportCsv() {
    const list = this.scoped();
    if (!list.length) { Notice.show('Belum ada data untuk diexport', 'error'); return; }
    const s = Session.data;
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Semester', 'Kelas', 'Mata Kuliah', 'NIM', 'Nama', 'Jurusan', 'Status', 'Waktu']];
    list.forEach((m) => {
      const rec = Store.today.get(m.nim);
      rows.push([s.semester || '', m.kelas, s.matkul || '', m.nim, m.nama, m.jurusan, rec ? 'Hadir' : 'Belum', rec ? (rec.waktu || '') : '']);
    });
    const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const nama = (s.matkul || 'presensi').trim().replace(/[^\w-]+/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap-${nama}-${dateStr()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Notice.show('Rekap presensi berhasil didownload 📥', 'success', 3000);
  }
};

/* ===== RIWAYAT ===== */
const Log = {
  render(freshNim) {
    const list = $('logList');
    if (!list) return;
    const entries = [...Store.today.entries()].reverse();
    const n = entries.length;
    if ($('logCount')) $('logCount').textContent = `${n} presensi hari ini`;
    [$('navLogBadge'), $('tabLogBadge')].forEach((b) => {
      if (!b) return;
      if (n > 0) {
        b.hidden = false;
        if (b.textContent !== String(n)) { b.textContent = n; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
      } else b.hidden = true;
    });
    if ($('logEmpty')) $('logEmpty').hidden = n > 0;
    list.innerHTML = entries.map(([nim, rec], i) => {
      const m = Store.roster.find((s) => s.nim === nim);
      const nama = m ? m.nama : nim;
      const initials = nama.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
      return `<li class="log-item ${nim === freshNim ? 'fresh' : ''}" style="--i:${Math.min(i, 12)}">
        <div class="log-avatar">${esc(initials)}</div>
        <div class="log-main"><strong>${esc(nama)}</strong><span>${esc(nim)}${m && m.kelas ? ' • ' + esc(m.kelas) : ''}</span></div>
        <div class="log-time">${esc(rec.waktu) || 'Hadir'}</div>
      </li>`;
    }).join('');
  }
};

/* ===== KARTU QR ===== */
const Card = {
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  makeQrCanvas(text, size) {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(holder);
    try {
      new QRCode(holder, { text, width: size, height: size, colorDark: '#1d4ed8', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
      const canvas = holder.querySelector('canvas');
      if (!canvas) throw new Error('Canvas QR tidak terbentuk');
      const out = document.createElement('canvas');
      out.width = size; out.height = size;
      out.getContext('2d').drawImage(canvas, 0, 0, size, size);
      return out;
    } finally {
      holder.remove();
    }
  },
  fit(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  },
  draw(m) {
    const W = 560, H = 760;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e293b');
    this.roundRect(ctx, 0, 0, W, H, 36); ctx.fillStyle = grad; ctx.fill();
    ctx.save(); ctx.clip();
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, '#3b82f6'); topGrad.addColorStop(0.5, '#8b5cf6'); topGrad.addColorStop(1, '#f0b429');
    ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 14);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8'; ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('KARTU PRESENSI KELAS', W / 2, 62);
    const qrSize = 340, panel = 380, px = (W - panel) / 2, py = 92;
    this.roundRect(ctx, px, py, panel, panel, 26); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.drawImage(this.makeQrCanvas(Token.encode(m.nim), qrSize), (W - qrSize) / 2, py + (panel - qrSize) / 2, qrSize, qrSize);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(this.fit(ctx, m.nama || '-', W - 80), W / 2, 540);
    ctx.fillStyle = '#facc15'; ctx.font = '600 26px ui-monospace, monospace';
    ctx.fillText(m.nim, W / 2, 584);
    ctx.fillStyle = '#94a3b8'; ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText(this.fit(ctx, [m.kelas, m.jurusan].filter(Boolean).join(' • '), W - 80), W / 2, 628);
    ctx.fillStyle = '#64748b'; ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillText('Tunjukkan kartu ini ke kamera saat presensi', W / 2, 706);
    return cv;
  },
  make() {
    const nim = $('nimInput').value.trim();
    if (!nim) { Notice.show('Masukkan NIM terlebih dahulu', 'error'); $('nimInput').focus(); return; }
    const m = Store.roster.find((s) => s.nim === nim);
    if (!m) { Notice.show(`NIM ${nim} tidak terdaftar`, 'error'); return; }
    if (typeof QRCode === 'undefined') { Notice.show('Library QR belum termuat — cek koneksi internet', 'error'); return; }
    try {
      Store.cardNim = m.nim;
      const wrap = $('cardResult');
      wrap.hidden = true;
      $('cardImage').src = this.draw(m).toDataURL('image/png');
      void wrap.offsetWidth;
      wrap.hidden = false;
      Notice.show(`Kartu QR dibuat untuk ${m.nama} ✨`, 'success');
    } catch (e) {
      Notice.show('Gagal membuat kartu: ' + e.message, 'error');
    }
  },
  download() {
    const src = $('cardImage').getAttribute('src');
    if (!src) { Notice.show('Tidak ada kartu untuk didownload', 'error'); return; }
    const a = document.createElement('a');
    a.download = `kartu-presensi-${Store.cardNim || 'mahasiswa'}.png`;
    a.href = src; document.body.appendChild(a); a.click(); a.remove();
    Notice.show('Kartu QR berhasil didownload 📥', 'success');
  },
  print() {
    const src = $('cardImage').getAttribute('src');
    if (!src) { Notice.show('Tidak ada kartu untuk diprint', 'error'); return; }
    $('printArea').innerHTML = `<img src="${src}" alt="Kartu QR">`;
    window.print();
    Notice.show('Mengirim ke printer... 🖨️', 'info', 2000);
  },
  close() {
    $('cardResult').hidden = true;
    $('cardImage').removeAttribute('src');
    $('nimInput').value = '';
    Store.cardNim = '';
  }
};

/* ===== SCANNER ===== */
const Scanner = {
  setButton(running) {
    const btn = $('btnScan');
    if (!btn) return;
    btn.classList.toggle('stop', running);
    btn.innerHTML = running ? '<i class="fa-solid fa-stop"></i><span>Stop Scan</span>' : '<i class="fa-solid fa-play"></i><span>Mulai Scan</span>';
    $('viewfinder').classList.toggle('live', running && Store.scanning);
  },
  toggle() { Store.scanning ? this.stop() : this.start(); },
  async start() {
    if (Store.scanning || Store.starting) return;
    Store.starting = true;
    Store.userStopped = false;
    try {
      if (typeof Html5Qrcode === 'undefined') throw new Error('Library scanner belum termuat — cek koneksi internet');
      if (Store.reader) { try { await Store.reader.clear(); } catch (e) {} Store.reader = null; }
      $('qr-reader').innerHTML = '';
      this.setButton(true);
      const config = {
        fps: 10,
        aspectRatio: 1.0,
        qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; }
      };
      const attempt = async (facing) => {
        Store.reader = new Html5Qrcode('qr-reader', { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
        await Store.reader.start({ facingMode: facing }, config, (t) => this.onDecode(t), () => {});
      };
      try {
        await attempt('environment');
        Notice.show('Kamera aktif 📷', 'info', 2500);
      } catch (e) {
        try { await Store.reader.clear(); } catch (x) {}
        $('qr-reader').innerHTML = '';
        await attempt('user');
        Notice.show('Kamera depan aktif 📷', 'info', 2500);
      }
      Store.scanning = true;
      this.setButton(true);
      setScanInfo('Mendeteksi...', 'Arahkan ke QR Code');
    } catch (err) {
      Notice.show('Gagal akses kamera: ' + (err.message || err), 'error', 6000);
      Store.scanning = false;
      Store.reader = null;
      this.setButton(false);
    } finally {
      Store.starting = false;
    }
  },
  async stop() {
    Store.userStopped = true;
    if (Store.reader && Store.scanning) {
      try { await Store.reader.stop(); await Store.reader.clear(); } catch (e) {}
    }
    Store.reader = null;
    Store.scanning = false;
    this.setButton(false);
    setScanInfo('Scanner berhenti', 'Scanner berhenti');
  },
  async torch() {
    Store.torch = !Store.torch;
    $('btnTorch').classList.toggle('active', Store.torch);
    try {
      const video = document.querySelector('#qr-reader video');
      const track = video && video.srcObject && video.srcObject.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        await track.applyConstraints({ advanced: [{ torch: Store.torch }] });
      } else {
        Notice.show('Perangkat ini tidak mendukung senter', 'warning', 2500);
        Store.torch = false;
        $('btnTorch').classList.remove('active');
      }
    } catch (e) {}
  },
  toggleFullscreen() {
    Store.fullscreen = !Store.fullscreen;
    $('viewfinder').classList.toggle('fullscreen', Store.fullscreen);
    $('btnFullscreen').classList.toggle('active', Store.fullscreen);
    $('btnFullscreen').querySelector('i').className = Store.fullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
    if (Store.fullscreen && !Store.scanning) this.start();
  },
  async onDecode(text) {
    if (Store.busy) return;
    Store.busy = true;
    try {
      if (Store.reader && Store.scanning) {
        await Store.reader.stop();
        Store.scanning = false;
        this.setButton(false);
      }
    } catch (e) {}
    try { await Attendance.process(text); }
    catch (e) { Notice.show('Terjadi kesalahan: ' + e.message, 'error'); }
    setTimeout(() => {
      Store.busy = false;
      setScanInfo(null, 'Arahkan ke QR Code');
      if (!Store.scanning && !Store.userStopped) this.start();
    }, 2500);
  }
};

/* ===== ANTRIAN OFFLINE ===== */
const Queue = {
  flushing: false,
  read() {
    try { return JSON.parse(localStorage.getItem(CONFIG.QUEUE_KEY) || '[]'); }
    catch (e) { return []; }
  },
  write(list) { localStorage.setItem(CONFIG.QUEUE_KEY, JSON.stringify(list)); },
  add(nim) {
    const d = Session.data;
    const q = this.read();
    if (q.some((i) => i.nim === nim && i.kelas === d.kelas && i.matkul === d.matkul)) return;
    q.push({ nim, semester: d.semester, kelas: d.kelas, matkul: d.matkul });
    this.write(q);
  },
  async flush() {
    if (this.flushing) return;
    const q = this.read();
    if (!q.length) return;
    this.flushing = true;
    try {
      const left = [];
      for (let i = 0; i < q.length; i++) {
        try { await Api.submit(q[i].nim, q[i]); }
        catch (e) { left.push(...q.slice(i)); break; }
      }
      this.write(left);
      const sent = q.length - left.length;
      if (sent) Notice.show(`${sent} presensi offline berhasil terkirim ✓`, 'success', 3000);
    } finally {
      this.flushing = false;
    }
  }
};

/* ===== PROSES PRESENSI ===== */
const Attendance = {
  check(nim) {
    if (!Session.isReady()) return { err: 'Pilih semester, kelas & mata kuliah dulu', sub: 'Lengkapi sesi perkuliahan' };
    const m = Store.roster.find((s) => s.nim === nim);
    if (!m) return { err: 'NIM tidak terdaftar', sub: `NIM ${nim}` };
    if (m.kelas !== Session.data.kelas) return { err: `${m.nama} bukan dari kelas ${Session.data.kelas}`, sub: `Kelas: ${m.kelas || '-'}` };
    return { m };
  },
  async send(m) {
    try {
      const r = await Api.submit(m.nim);
      if (r.success) {
        Roster.markPresent(m.nim, r.data && r.data.waktu);
        return { kind: 'success', sub: `${m.nim} • Hadir tercatat` };
      }
      if (r.alreadyPresent) {
        Roster.markPresent(m.nim);
        return { kind: 'warning', sub: 'Sudah presensi' };
      }
      return { kind: 'error', sub: r.message || 'Gagal menyimpan' };
    } catch (e) {
      if (e.message === 'BAD_RESPONSE') return { kind: 'error', sub: 'Respons server tidak valid — cek deploy Apps Script' };
      Queue.add(m.nim);
      Roster.markPresent(m.nim);
      return { kind: 'warning', sub: 'Offline — dikirim otomatis nanti' };
    }
  },
  async process(text) {
    Notice.show('Memproses presensi...', 'info', 5000);
    const nim = Token.decode(text);
    if (!nim) {
      Notice.show('QR tidak dikenali. Gunakan Kartu QR resmi.', 'error');
      ScanResult.show('error', 'QR tidak valid', 'Gunakan Kartu QR resmi');
      setScanInfo('QR tidak valid', 'QR tidak valid');
      return;
    }
    const c = this.check(nim);
    if (c.err) {
      Notice.show(c.err, 'error');
      ScanResult.show('error', c.err, c.sub);
      setScanInfo('Ditolak', 'Ditolak');
      return;
    }
    const r = await this.send(c.m);
    Notice.show(`${c.m.nama}: ${r.sub}`, r.kind);
    ScanResult.show(r.kind, c.m.nama, r.sub);
    setScanInfo(r.kind === 'error' ? 'Gagal' : 'Hadir', r.sub);
  },
  async manual(nim) {
    nim = String(nim || '').trim();
    if (!nim) return false;
    const c = this.check(nim);
    if (c.err) { Notice.show(c.err, 'error'); return false; }
    const r = await this.send(c.m);
    Notice.show(`${c.m.nama}: ${r.sub} (manual)`, r.kind);
    return r.kind !== 'error';
  }
};

/* ===== MODAL ===== */
const Modal = {
  open(id) { const m = $(id); if (!m) return; m.hidden = false; document.body.style.overflow = 'hidden'; },
  close(id) { const m = $(id); if (!m) return; m.hidden = true; document.body.style.overflow = ''; },
  closeAll() { document.querySelectorAll('.modal').forEach((m) => (m.hidden = true)); document.body.style.overflow = ''; },
  init() {
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
      const modal = b.closest('.modal');
      if (modal) Modal.close(modal.id);
    }));
  }
};

/* ===== PRESENSI MANUAL ===== */
const ManualEntry = {
  open() { Modal.open('manualModal'); setTimeout(() => $('manualNimInput').focus(), 100); },
  preview() {
    const nim = $('manualNimInput').value.trim();
    const preview = $('manualPreview');
    if (!nim) { preview.hidden = true; return; }
    const m = Store.roster.find((s) => s.nim === nim);
    if (!m) {
      preview.hidden = false;
      preview.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color:hsl(var(--destructive))"></i> NIM tidak terdaftar';
      return;
    }
    const hadir = Store.today.has(m.nim);
    preview.hidden = false;
    preview.innerHTML = `<strong>${esc(m.nama)}</strong><span>${esc(m.nim)} • ${esc(m.kelas)} • ${esc(m.jurusan)}</span>${hadir ? '<div style="margin-top:8px;color:hsl(var(--gold-deep))"><i class="fa-solid fa-clock"></i> Sudah hadir</div>' : ''}`;
  },
  async submit() {
    const nim = $('manualNimInput').value.trim();
    if (!nim) { Notice.show('Masukkan NIM', 'error'); return; }
    if (await Attendance.manual(nim)) {
      Modal.close('manualModal');
      $('manualNimInput').value = '';
      $('manualPreview').hidden = true;
    }
  }
};

/* ===== NAVIGASI ===== */
const Nav = {
  tabToNav: { tabRoster: 'data', tabCard: 'card', tabLog: 'log' },
  setActive(key) { document.querySelectorAll('.nav-link').forEach((b) => b.classList.toggle('active', b.dataset.go === key)); },
  moveIndicator() {
    const active = document.querySelector('.tab.active');
    const bar = $('tabIndicator');
    if (!active || !bar) return;
    bar.style.left = active.offsetLeft + 'px';
    bar.style.width = active.offsetWidth + 'px';
  },
  showTab(id) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.tab-body').forEach((b) => b.classList.toggle('active', b.id === id));
    this.moveIndicator();
  },
  go(key) {
    this.setActive(key);
    if (key === 'scan') { $('secScan').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const tabMap = { data: 'tabRoster', card: 'tabCard', log: 'tabLog' };
    if (tabMap[key]) this.showTab(tabMap[key]);
    if (window.innerWidth <= 900) $('secData').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  init() {
    document.querySelectorAll('.nav-link').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.go)));
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      this.showTab(t.dataset.tab);
      this.setActive(this.tabToNav[t.dataset.tab]);
    }));
    window.addEventListener('resize', () => this.moveIndicator());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.moveIndicator());
    requestAnimationFrame(() => this.moveIndicator());
  }
};

/* ===== FILTER & PENCARIAN ===== */
function initFilters() {
  let t = null;
  on('searchInput', 'input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { Store.query = e.target.value; Roster.animateNext = true; Roster.render(); }, 150);
  });
  document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    Store.filter = chip.dataset.filter;
    Roster.animateNext = true;
    Roster.render();
  }));
  on('classFilter', 'change', (e) => { Store.classFilter = e.target.value; Roster.animateNext = true; Roster.render(); });
}

/* ===== KEYBOARD SHORTCUTS ===== */
const Shortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // jangan bentrok dengan Ctrl+R, Ctrl+S, dll
      if (e.target.matches('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
      const modalOpen = [...document.querySelectorAll('.modal')].some((m) => !m.hidden);
      if (modalOpen && e.key !== 'Escape') return;
      switch (e.key.toLowerCase()) {
        case 's': Scanner.toggle(); break;
        case 'd': Theme.toggle(); break;
        case 'e': Roster.exportCsv(); break;
        case 'r': Roster.load(); break;
        case 'f': Scanner.toggleFullscreen(); break;
        case 'm': Feedback.toggle(); break;
        case '/': e.preventDefault(); $('searchInput').focus(); break;
        case '1': Nav.go('data'); break;
        case '2': Nav.go('card'); break;
        case '3': Nav.go('log'); break;
        case 'escape':
          Modal.closeAll();
          if (Store.fullscreen) Scanner.toggleFullscreen();
          if (Store.scanning) Scanner.stop();
          break;
        case '?': Modal.open('shortcutsModal'); break;
      }
    });
  }
};

/* ===== AUTO REFRESH ===== */
const RefreshIndicator = {
  timer: null, left: 15,
  start() {
    const total = Math.round(CONFIG.REFRESH_MS / 1000);
    this.left = total;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.left--;
      if (this.left <= 0) {
        this.left = total;
        if (!document.hidden) Roster.load(true);
      }
      const el = $('refreshCountdown');
      if (el) el.textContent = this.left;
    }, 1000);
  }
};

/* ===== CEK KAMERA ===== */
async function checkCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Notice.show('Browser tidak mendukung kamera (butuh localhost atau https)', 'error', 6000);
      return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (e) {
    Notice.show('Izin kamera diperlukan untuk scan QR', 'error');
    return false;
  }
}

/* ===== TOMBOL DASHBOARD ===== */
function setupDashboardButtons() {
  on('btnScan', 'click', () => Scanner.toggle());
  on('btnTorch', 'click', () => Scanner.torch());
  on('btnFullscreen', 'click', () => Scanner.toggleFullscreen());
  on('btnSound', 'click', () => Feedback.toggle());
  on('btnTheme', 'click', () => Theme.toggle());
  on('btnShortcuts', 'click', () => Modal.open('shortcutsModal'));
  on('btnExport', 'click', () => Roster.exportCsv());
  on('btnRefresh', 'click', () => {
    const icon = $('btnRefresh').querySelector('i');
    icon.classList.remove('spin'); void icon.offsetWidth; icon.classList.add('spin');
    Roster.load();
  });
  on('btnMake', 'click', () => Card.make());
  on('btnSave', 'click', () => Card.download());
  on('btnPrint', 'click', () => Card.print());
  on('btnCloseCard', 'click', () => Card.close());
  on('nimInput', 'keydown', (e) => { if (e.key === 'Enter') Card.make(); });
  on('btnManual', 'click', () => ManualEntry.open());
  on('btnManualSubmit', 'click', () => ManualEntry.submit());
  on('manualNimInput', 'input', () => ManualEntry.preview());
  on('manualNimInput', 'keydown', (e) => { if (e.key === 'Enter') ManualEntry.submit(); });
  Shortcuts.init();
  window.addEventListener('online', () => Queue.flush());
}

/* ===== INIT ===== */
async function init() {
  Notice.init();
  Theme.init();
  Particles.init();

  // --- Halaman login ---
  if ($('loginForm')) { Auth.initLoginPage(); return; }

  // --- Halaman dashboard: wajib sudah login ---
  const me = Auth.current();
  if (!me) { location.replace('login.html'); return; }
  Auth.updateUI(me);

  if ($('instName')) $('instName').textContent = CONFIG.INSTITUTION.name;
  if ($('instProdi')) $('instProdi').textContent = CONFIG.INSTITUTION.prodi;
  if ($('sheetLink')) $('sheetLink').href = CONFIG.SHEET_URL;

  Ripple.init();
  startClock();
  Nav.init();
  Modal.init();
  Feedback.paint();
  document.addEventListener('click', () => Feedback.unlock(), { once: true });
  setupDashboardButtons();

  Session.init();
  initFilters();
  Roster.renderSession();
  await Roster.load();

  RefreshIndicator.start();
  checkCamera().then((ok) => { if (ok) setTimeout(() => Scanner.start(), 800); });
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((e) => {
    console.error(e);
    Notice.show('Terjadi error: ' + e.message, 'error', 8000);
  });
});
window.addEventListener('beforeunload', () => {
  if (Store.reader && Store.scanning) Store.reader.stop().catch(() => {});
});