'use strict';
/* ================================================================
   KONFIGURASI
================================================================ */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwFfFEwEO-3uF6sTTgyu3hkIYjtJBb-1mP5wUVce-II9-5rqaDviL30w4U_hcYUfU1I/exec',
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/1gskS3-4y-zOe5xxilH9SOT2jWvQtg5O_gO1wog0hJOU/edit?gid=0#gid=0',
  REFRESH_MS: 15000,
  CACHE_KEY: 'mahasiswaData',
  SOUND_KEY: 'presensiSound',
  THEME_KEY: 'presensiTheme',
  QR_PREFIX: 'PRSN',
  QR_SALT: 'presensi-kelas-2026'
};
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ================================================================
   STORE
================================================================ */
const Store = {
  roster: [],
  today: new Map(),
  online: false,
  busy: false,
  scanning: false,
  torch: false,
  reader: null,
  cardNim: '',
  query: '',
  filter: 'all',
  classFilter: 'all',
  flashNim: null,
  fullscreen: false,
  refreshTimer: null,
  countdown: 15
};

/* ================================================================
   THEME MANAGER
================================================================ */
const Theme = {
  current: localStorage.getItem(CONFIG.THEME_KEY) || 'light',
  init() {
    document.documentElement.setAttribute('data-theme', this.current);
    this.paint();
    // Auto dark mode berdasarkan preferensi sistem (hanya jika belum di-set)
    if (!localStorage.getItem(CONFIG.THEME_KEY) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.set('dark');
    }
  },
  toggle() {
    this.set(this.current === 'light' ? 'dark' : 'light');
  },
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
    btn.innerHTML = this.current === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }
};

/* ================================================================
   PARTICLES BACKGROUND
================================================================ */
const Particles = {
  init() {
    const container = $('particles');
    if (!container) return;
    const count = window.innerWidth < 768 ? 15 : 30;
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

/* ================================================================
   CONFETTI
================================================================ */
const Confetti = {
  canvas: null, ctx: null, pieces: [], running: false,
  init() {
    this.canvas = $('confetti');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },
  launch() {
    if (!this.canvas) return;
    this.pieces = [];
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    for (let i = 0; i < 150; i++) {
      this.pieces.push({
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * 200,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        life: 0
      });
    }
    if (!this.running) {
      this.running = true;
      this.animate();
    }
  },
  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let alive = 0;
    this.pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.rot += p.vr;
      p.life++;
      if (p.y < this.canvas.height + 50) {
        alive++;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot * Math.PI / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      }
    });
    if (alive > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.running = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

/* ================================================================
   RIPPLE EFFECT
================================================================ */
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

/* ================================================================
   UI HELPER
================================================================ */
const Notice = {
  el: null,
  timer: null,
  icons: { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' },
  init() { this.el = $('notice'); },
  show(message, type = 'info', ms = 4000) {
    if (!this.el) return;
    this.el.className = 'notice show ' + type;
    this.el.innerHTML = `<i class="fa-solid ${this.icons[type] || this.icons.info}"></i> ${esc(message)}`;
    clearTimeout(this.timer);
    if (type === 'success' || type === 'error' || type === 'info') {
      this.timer = setTimeout(() => this.el.classList.remove('show'), ms);
    }
  }
};

function setNet(state, label) {
  $('netDot').className = 'net-dot ' + state;
  $('netLabel').textContent = label;
  Store.online = state === 'online';
}
function setScanInfo(stateText, hintText) {
  if (stateText) { $('scanState').textContent = stateText; $('footStatus').textContent = stateText; }
  if (hintText) $('scanHintText').textContent = hintText;
}

function countTo(el, to) {
  const from = parseInt(el.textContent, 10) || 0;
  if (from === to) return;
  const start = performance.now(), dur = 700;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setCircleProgress(selector, percent) {
  const circle = document.querySelector(selector);
  if (!circle) return;
  const clamped = Math.max(0, Math.min(100, percent));
  circle.setAttribute('stroke-dasharray', `${clamped}, 100`);
}

/* ================================================================
   JAM DI NAVBAR
================================================================ */
function startClock() {
  const tick = () => {
    const d = new Date();
    $('clockTime').textContent = d.toLocaleTimeString('id-ID', { hour12: false });
    $('clockDate').textContent = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
  };
  tick();
  setInterval(tick, 1000);
}

/* ================================================================
   FEEDBACK
================================================================ */
const Feedback = {
  on: localStorage.getItem(CONFIG.SOUND_KEY) !== 'off',
  ctx: null,
  unlock() {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* tidak didukung */ }
  },
  tone(freq, start, dur, type = 'sine') {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + start + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(this.ctx.currentTime + start);
    o.stop(this.ctx.currentTime + start + dur + 0.05);
  },
  play(kind) {
    if (!this.on) return;
    if (kind === 'success') {
      this.tone(880, 0, 0.12);
      this.tone(1320, 0.12, 0.18);
      navigator.vibrate && navigator.vibrate(80);
    } else if (kind === 'warning') {
      this.tone(660, 0, 0.15);
      this.tone(660, 0.2, 0.15);
      navigator.vibrate && navigator.vibrate([60, 60, 60]);
    } else if (kind === 'celebrate') {
      this.tone(523, 0, 0.1);
      this.tone(659, 0.1, 0.1);
      this.tone(784, 0.2, 0.1);
      this.tone(1047, 0.3, 0.3);
      navigator.vibrate && navigator.vibrate([100, 50, 100, 50, 200]);
    } else {
      this.tone(220, 0, 0.3);
      navigator.vibrate && navigator.vibrate(200);
    }
  },
  toggle() {
    this.on = !this.on;
    localStorage.setItem(CONFIG.SOUND_KEY, this.on ? 'on' : 'off');
    this.paint();
    this.unlock();
    Notice.show(this.on ? 'Suara & getar aktif 🔊' : 'Suara & getar dimatikan 🔇', 'info', 2000);
  },
  paint() {
    const b = $('btnSound');
    if (!b) return;
    b.classList.toggle('muted', !this.on);
    b.innerHTML = `<i class="fa-solid ${this.on ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
  }
};

/* ================================================================
   POPUP HASIL SCAN
================================================================ */
const ScanResult = {
  timer: null,
  show(kind, title, sub) {
    const el = $('scanResult');
    if (!el) return;
    el.className = 'scan-result ' + kind;
    $('srIcon').className = 'fa-solid ' + ({ success: 'fa-check', warning: 'fa-clock', error: 'fa-xmark' }[kind]);
    $('srTitle').textContent = title;
    $('srSub').textContent = sub || '';
    void el.offsetWidth;
    el.classList.add('show');
    Feedback.play(kind);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => el.classList.remove('show'), 2300);
  }
};

/* ================================================================
   API
================================================================ */
const Api = {
  async ping() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(CONFIG.API_URL + '?action=ping', { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      return res.ok;
    } catch (e) { return false; }
    finally { clearTimeout(t); }
  },
  async get(action) {
    const res = await fetch(`${CONFIG.API_URL}?action=${action}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json || json.success === false) throw new Error(json && json.message ? json.message : 'Respons server tidak valid');
    return json;
  },
  async students() { return normalizeRoster((await this.get('get_all')).data); },
  async todayAttendance() {
    try {
      const json = await this.get('get_today_attendance');
      const map = new Map();
      (json.data || []).forEach((r) => map.set(String(r.nim), { waktu: r.waktu, status: r.status }));
      Store.today = map;
    } catch (e) { console.warn('Gagal ambil presensi hari ini:', e.message); }
  },
  async submit(nim) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'presensi', nim })
    });
    return res.json();
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

/* ================================================================
   TOKEN QR
================================================================ */
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

/* ================================================================
   ACHIEVEMENTS
================================================================ */
const Achievements = {
  list: [
    { id: 'first', icon: '🥇', title: 'First Arrival', desc: 'Mahasiswa pertama yang hadir hari ini', check: () => Store.today.size >= 1 },
    { id: 'ten', icon: '🎯', title: 'Double Digits', desc: '10+ mahasiswa sudah hadir', check: () => Store.today.size >= 10 },
    { id: 'half', icon: '⚡', title: 'Half Way', desc: '50% kehadiran tercapai', check: () => Store.roster.length && Store.today.size >= Store.roster.length / 2 },
    { id: 'perfect', icon: '🏆', title: 'Perfect Day', desc: 'Semua mahasiswa hadir!', check: () => Store.roster.length > 0 && Store.today.size >= Store.roster.length },
    { id: 'early', icon: '🌅', title: 'Early Bird', desc: 'Ada yang hadir sebelum jam 8', check: () => [...Store.today.values()].some(r => { const h = parseInt((r.waktu || '').split(':')[0]); return !isNaN(h) && h < 8; }) },
    { id: 'fullhouse', icon: '🎉', title: 'Full House', desc: 'Kelas dengan kehadiran 100%', check: () => {
      const classes = [...new Set(Store.roster.map(m => m.kelas).filter(Boolean))];
      return classes.some(kelas => {
        const inClass = Store.roster.filter(m => m.kelas === kelas);
        return inClass.length > 0 && inClass.every(m => Store.today.has(m.nim));
      });
    }}
  ],
  celebrated: new Set(),
  render() {
    const grid = $('achievementGrid');
    if (!grid) return;
    grid.innerHTML = this.list.map(a => {
      const unlocked = a.check();
      if (unlocked && !this.celebrated.has(a.id)) {
        this.celebrated.add(a.id);
        if (a.id === 'perfect') {
          Confetti.launch();
          Feedback.play('celebrate');
          Notice.show('🏆 PERFECT DAY! Semua mahasiswa hadir!', 'success', 5000);
        }
      }
      return `<div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-title">${a.title}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>`;
    }).join('');
  }
};

/* ================================================================
   ROSTER
================================================================ */
const Roster = {
  suffix: '',
  animateNext: true,
  isPresent(nim) { return Store.today.has(nim); },
  getClasses() {
    return [...new Set(Store.roster.map(m => m.kelas).filter(Boolean))].sort();
  },
  populateClassFilter() {
    const sel = $('classFilter');
    if (!sel) return;
    const classes = this.getClasses();
    const current = Store.classFilter;
    sel.innerHTML = '<option value="all">Semua Kelas</option>' +
      classes.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
    sel.value = current;
  },
  filtered() {
    const q = Store.query.trim().toLowerCase();
    const kelas = Store.classFilter;
    return Store.roster.filter((m) => {
      const present = this.isPresent(m.nim);
      if (Store.filter === 'hadir' && !present) return false;
      if (Store.filter === 'belum' && present) return false;
      if (kelas !== 'all' && m.kelas !== kelas) return false;
      if (!q) return true;
      return [m.nim, m.nama, m.kelas, m.jurusan].some((v) => v.toLowerCase().includes(q));
    });
  },
  updateStats() {
    const total = Store.roster.length;
    const hadir = Store.roster.filter((m) => this.isPresent(m.nim)).length;
    const belum = Math.max(total - hadir, 0);
    const pct = total ? Math.round((hadir / total) * 100) : 0;
    countTo($('statTotal'), total);
    countTo($('statHadir'), hadir);
    countTo($('statBelum'), belum);
    $('progressPct').textContent = pct + '%';
    $('progressFill').style.width = pct + '%';
    // Circular progress
    setCircleProgress('.stat-circle:nth-child(1) .circle-fill', 100);
    setCircleProgress('.stat-circle:nth-child(2) .circle-fill', total ? (hadir / total) * 100 : 0);
    setCircleProgress('.stat-circle:nth-child(3) .circle-fill', total ? (belum / total) * 100 : 0);
    Achievements.render();
  },
  showState(html) {
    $('stateBox').innerHTML = html;
    $('stateBox').hidden = false;
    $('rosterTable').hidden = true;
  },
  render() {
    const list = this.filtered();
    const total = Store.roster.length;
    const filtering = Store.query.trim() || Store.filter !== 'all' || Store.classFilter !== 'all';
    $('listCount').textContent = (filtering ? `${list.length} dari ${total}` : `${total}`) + ' mahasiswa' + this.suffix;
    this.updateStats();
    if (!total) {
      this.showState('<i class="fa-solid fa-inbox big"></i>Tidak ada data');
      return;
    }
    if (!list.length) {
      this.showState('<i class="fa-solid fa-magnifying-glass big"></i><strong>Tidak ada hasil</strong><p>Coba kata kunci atau filter lain.</p>');
      return;
    }
    const body = $('rosterBody');
    body.className = this.animateNext ? 'animate' : '';
    this.animateNext = false;
    body.innerHTML = list.map((m, i) => {
      const rec = Store.today.get(m.nim);
      const ok = !!rec;
      return `<tr data-nim="${esc(m.nim)}" class="${Store.flashNim === m.nim ? 'flash' : ''}" style="--i:${Math.min(i, 15)}">
        <td>${esc(m.nim)}</td>
        <td>${esc(m.nama) || '-'}</td>
        <td>${esc(m.kelas) || '-'}</td>
        <td>${esc(m.jurusan) || '-'}</td>
        <td><span class="pill ${ok ? 'hadir' : 'belum'}"><i class="fa-solid fa-circle"></i> ${ok ? 'Hadir' : 'Belum'}</span></td>
        <td class="waktu">${ok && rec.waktu ? esc(rec.waktu) : '-'}</td>
      </tr>`;
    }).join('');
    Store.flashNim = null;
    $('stateBox').hidden = true;
    $('rosterTable').hidden = false;
  },
  markPresent(nim, waktu) {
    const old = Store.today.get(nim);
    Store.today.set(nim, {
      waktu: waktu || (old && old.waktu) || new Date().toLocaleTimeString('id-ID', { hour12: false }),
      status: 'Hadir'
    });
    Store.flashNim = nim;
    this.render();
    Log.render(nim);
  },
  useCache(label) {
    try {
      const cached = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY) || '[]');
      if (cached.length) {
        Store.roster = cached;
        this.suffix = ` (${label})`;
        this.populateClassFilter();
        this.render();
        Log.render();
        return true;
      }
    } catch (e) { /* cache rusak */ }
    return false;
  },
  async load(silent = false) {
    const first = !Store.roster.length;
    if (!silent) this.animateNext = true;
    if (first) this.showState('<i class="fa-solid fa-spinner fa-spin big"></i><strong>Mengambil data...</strong><p>Menghubungkan ke Google Sheets</p>');
    setNet('checking', 'Mengecek...');
    try {
      if (!(await Api.ping())) {
        setNet('offline', 'Offline');
        if (this.useCache('offline')) {
          if (!silent) Notice.show('Menampilkan data dari cache (offline)', 'warning', 3000);
          return;
        }
        this.showState(`
          <i class="fa-solid fa-wifi big" style="color:hsl(var(--destructive))"></i>
          <strong>Tidak ada koneksi</strong>
          <p>Tidak ada koneksi internet dan tidak ada data cache.</p>
          <button class="btn btn-main btn-sm" onclick="Roster.load()"><i class="fa-solid fa-rotate"></i> Coba lagi</button>`);
        $('listCount').textContent = '0 mahasiswa';
        return;
      }
      const data = await Api.students();
      await Api.todayAttendance();
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
      setNet('online', 'Online - kosong');
      if (this.useCache('cache')) return;
      this.showState(`
        <i class="fa-solid fa-circle-info big" style="color:hsl(var(--warning))"></i>
        <strong>Belum ada data</strong>
        <p>Silakan tambahkan data mahasiswa di Google Sheets.</p>
        <a class="btn btn-main btn-sm" href="${CONFIG.SHEET_URL}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Sheets</a>
        <button class="btn btn-ghost btn-sm" onclick="Roster.load()"><i class="fa-solid fa-rotate"></i> Refresh</button>`);
      $('listCount').textContent = '0 mahasiswa';
    } catch (err) {
      console.error('Gagal memuat data:', err);
      setNet('offline', 'Gagal');
      if (this.useCache('error')) return;
      this.showState(`
        <i class="fa-solid fa-triangle-exclamation big" style="color:hsl(var(--destructive))"></i>
        <strong>Gagal memuat data</strong>
        <p>${esc(err.message)}</p>
        <button class="btn btn-main btn-sm" onclick="Roster.load()"><i class="fa-solid fa-rotate"></i> Coba lagi</button>`);
      $('listCount').textContent = '0 mahasiswa';
    }
  },
  exportCsv() {
    if (!Store.roster.length) { Notice.show('Belum ada data untuk diexport', 'error'); return; }
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['NIM', 'Nama', 'Kelas', 'Jurusan', 'Status', 'Waktu']];
    Store.roster.forEach((m) => {
      const rec = Store.today.get(m.nim);
      rows.push([m.nim, m.nama, m.kelas, m.jurusan, rec ? 'Hadir' : 'Belum', rec ? (rec.waktu || '') : '']);
    });
    const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    const tgl = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `rekap-presensi-${tgl}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Notice.show('Rekap presensi berhasil didownload 📥', 'success', 3000);
  }
};

/* ================================================================
   LOG
================================================================ */
const Log = {
  render(freshNim) {
    const entries = [...Store.today.entries()].reverse();
    const list = $('logList');
    if (!list) return;
    const n = entries.length;
    $('logCount').textContent = `${n} presensi hari ini`;
    [$('navLogBadge'), $('tabLogBadge')].forEach((b) => {
      if (!b) return;
      if (n > 0) {
        b.hidden = false;
        if (b.textContent !== String(n)) { b.textContent = n; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
      } else {
        b.hidden = true;
      }
    });
    $('logEmpty').hidden = n > 0;
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

/* ================================================================
   KARTU QR
================================================================ */
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
    new QRCode(holder, { text, width: size, height: size, colorDark: '#1d4ed8', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    const canvas = holder.querySelector('canvas');
    const out = document.createElement('canvas');
    out.width = size; out.height = size;
    out.getContext('2d').drawImage(canvas, 0, 0, size, size);
    holder.remove();
    return out;
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
    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    this.roundRect(ctx, 0, 0, W, H, 36);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Top accent bar with gradient
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, '#3b82f6');
    topGrad.addColorStop(0.5, '#8b5cf6');
    topGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 14);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('KARTU PRESENSI KELAS', W / 2, 62);
    const qrSize = 340, panel = 380, px = (W - panel) / 2, py = 92;
    this.roundRect(ctx, px, py, panel, panel, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.drawImage(this.makeQrCanvas(Token.encode(m.nim), qrSize), (W - qrSize) / 2, py + (panel - qrSize) / 2, qrSize, qrSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(this.fit(ctx, m.nama || '-', W - 80), W / 2, 540);
    ctx.fillStyle = '#60a5fa';
    ctx.font = '600 26px ui-monospace, monospace';
    ctx.fillText(m.nim, W / 2, 584);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText(this.fit(ctx, [m.kelas, m.jurusan].filter(Boolean).join('  •  '), W - 80), W / 2, 628);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillText('Tunjukkan kartu ini ke kamera saat presensi', W / 2, 706);
    return cv;
  },
  make() {
    const nim = $('nimInput').value.trim();
    if (!nim) { Notice.show('Masukkan NIM terlebih dahulu', 'error'); $('nimInput').focus(); return; }
    if (nim.length < 3) { Notice.show('NIM minimal 3 karakter', 'error'); return; }
    const m = Store.roster.find((s) => s.nim === nim);
    if (!m) { Notice.show(`NIM ${esc(nim)} tidak terdaftar`, 'error'); return; }
    if (typeof QRCode === 'undefined') { Notice.show('Library QR belum termuat', 'error'); return; }
    Store.cardNim = m.nim;
    const wrap = $('cardResult');
    wrap.hidden = true;
    $('cardImage').src = this.draw(m).toDataURL('image/png');
    void wrap.offsetWidth;
    wrap.hidden = false;
    Notice.show(`Kartu QR dibuat untuk ${esc(m.nama)} ✨`, 'success');
  },
  download() {
    const src = $('cardImage').src;
    if (!src) { Notice.show('Tidak ada kartu untuk didownload', 'error'); return; }
    const a = document.createElement('a');
    a.download = `kartu-presensi-${Store.cardNim || 'mahasiswa'}.png`;
    a.href = src;
    document.body.appendChild(a);
    a.click();
    a.remove();
    Notice.show('Kartu QR berhasil didownload 📥', 'success');
  },
  print() {
    const src = $('cardImage').src;
    if (!src) { Notice.show('Tidak ada kartu untuk diprint', 'error'); return; }
    const area = $('printArea');
    area.innerHTML = `<img src="${src}" alt="Kartu QR">`;
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

/* ================================================================
   SCANNER
================================================================ */
const Scanner = {
  setButton(running) {
    const btn = $('btnScan');
    if (!btn) return;
    btn.classList.toggle('stop', running);
    btn.innerHTML = running
      ? '<i class="fa-solid fa-stop"></i><span>Stop Scan</span>'
      : '<i class="fa-solid fa-play"></i><span>Mulai Scan</span>';
    $('viewfinder').classList.toggle('live', running && Store.scanning);
  },
  toggle() { Store.scanning ? this.stop() : this.start(); },
  async start() {
    if (Store.scanning) return;
    if (Store.reader) { try { Store.reader.clear(); } catch (e) {} Store.reader = null; }
    $('qr-reader').innerHTML = '';
    this.setButton(true);
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    const attempt = async (facing) => {
      Store.reader = new Html5Qrcode('qr-reader', { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      await Store.reader.start({ facingMode: facing }, config, (t) => this.onDecode(t), () => {});
    };
    try {
      try { await attempt('environment'); Notice.show('Kamera aktif 📷', 'info', 2500); }
      catch (e) { await attempt('user'); Notice.show('Kamera depan aktif 📷', 'info', 2500); }
      Store.scanning = true;
      $('viewfinder').classList.add('live');
      setScanInfo('Mendeteksi...', 'Arahkan ke QR Code');
    } catch (err) {
      Notice.show('Gagal akses kamera: ' + (err.message || err), 'error');
      Store.scanning = false;
      this.setButton(false);
    }
  },
  async stop() {
    if (Store.reader && Store.scanning) {
      try { await Store.reader.stop(); Store.reader.clear(); } catch (e) {}
      Store.reader = null;
    }
    Store.scanning = false;
    this.setButton(false);
    setScanInfo('Scanner berhenti', 'Scanner berhenti');
  },
  async torch() {
    Store.torch = !Store.torch;
    $('btnTorch').classList.toggle('active', Store.torch);
    try {
      const video = Store.reader && Store.reader._videoElement;
      const track = video && video.srcObject && video.srcObject.getVideoTracks()[0];
      if (track && track.getCapabilities && track.getCapabilities().torch) {
        await track.applyConstraints({ advanced: [{ torch: Store.torch }] });
      }
    } catch (e) { /* tidak didukung */ }
  },
  toggleFullscreen() {
    Store.fullscreen = !Store.fullscreen;
    $('viewfinder').classList.toggle('fullscreen', Store.fullscreen);
    $('btnFullscreen').classList.toggle('active', Store.fullscreen);
    const icon = $('btnFullscreen').querySelector('i');
    icon.className = Store.fullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
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
    await Attendance.process(text);
    setTimeout(() => {
      Store.busy = false;
      setScanInfo(null, 'Arahkan ke QR Code');
      if (!Store.scanning && !Store.fullscreen) this.start();
    }, 2500);
  }
};

/* ================================================================
   PRESENSI
================================================================ */
const Attendance = {
  async process(text) {
    try {
      Notice.show('Memproses presensi...', 'info', 5000);
      const nim = Token.decode(text);
      if (!nim) {
        Notice.show('QR tidak dikenali. Gunakan Kartu QR resmi.', 'error');
        ScanResult.show('error', 'QR tidak valid', 'Gunakan Kartu QR resmi');
        setScanInfo('QR tidak valid', 'QR tidak valid');
        return;
      }
      const m = Store.roster.find((s) => s.nim === nim);
      if (!m) {
        Notice.show(`NIM ${esc(nim)} tidak terdaftar`, 'error');
        ScanResult.show('error', 'Tidak terdaftar', `NIM ${nim}`);
        setScanInfo('Tidak terdaftar', 'Tidak terdaftar');
        return;
      }
      const result = await Api.submit(nim);
      if (!result.success) {
        if (result.alreadyPresent) {
          Notice.show(result.message || `${m.nama} sudah presensi hari ini`, 'warning');
          ScanResult.show('warning', m.nama, 'Sudah presensi');
          setScanInfo('Sudah hadir', 'Sudah presensi');
          Roster.markPresent(nim);
        } else {
          Notice.show(result.message || 'Gagal menyimpan presensi', 'error');
          ScanResult.show('error', 'Gagal menyimpan', result.message || 'Coba lagi');
          setScanInfo('Gagal', 'Gagal');
        }
        return;
      }
      const waktu = result.data && result.data.waktu ? result.data.waktu : '';
      Notice.show(`${m.nama} HADIR ✓`, 'success');
      ScanResult.show('success', m.nama, `${m.nim} • Hadir tercatat`);
      setScanInfo('Hadir', 'Hadir tercatat');
      Roster.markPresent(nim, waktu);
    } catch (err) {
      console.error('Error presensi:', err);
      Notice.show(`Error: ${err.message}`, 'error');
      ScanResult.show('error', 'Terjadi error', err.message);
      setScanInfo('Error', 'Error');
    }
  },
  async manual(nim) {
    if (!nim) return;
    const m = Store.roster.find((s) => s.nim === nim);
    if (!m) {
      Notice.show(`NIM ${esc(nim)} tidak terdaftar`, 'error');
      return false;
    }
    try {
      const result = await Api.submit(nim);
      if (!result.success) {
        if (result.alreadyPresent) {
          Notice.show(`${m.nama} sudah presensi`, 'warning');
          Roster.markPresent(nim);
        } else {
          Notice.show(result.message || 'Gagal menyimpan', 'error');
          return false;
        }
      } else {
        const waktu = result.data && result.data.waktu ? result.data.waktu : '';
        Notice.show(`${m.nama} HADIR ✓ (manual)`, 'success');
        Roster.markPresent(nim, waktu);
      }
      return true;
    } catch (err) {
      Notice.show(`Error: ${err.message}`, 'error');
      return false;
    }
  }
};

/* ================================================================
   MODAL
================================================================ */
const Modal = {
  open(id) {
    const m = $(id);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  },
  close(id) {
    const m = $(id);
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
  },
  closeAll() {
    document.querySelectorAll('.modal').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  },
  init() {
    document.querySelectorAll('[data-close]').forEach(b => {
      b.addEventListener('click', () => {
        const modal = b.closest('.modal');
        if (modal) Modal.close(modal.id);
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', () => {
        const modal = bd.closest('.modal');
        if (modal) Modal.close(modal.id);
      });
    });
  }
};

/* ================================================================
   MANUAL ENTRY
================================================================ */
const ManualEntry = {
  open() {
    Modal.open('manualModal');
    setTimeout(() => $('manualNimInput').focus(), 100);
  },
  preview() {
    const nim = $('manualNimInput').value.trim();
    const preview = $('manualPreview');
    if (!nim) { preview.hidden = true; return; }
    const m = Store.roster.find(s => s.nim === nim);
    if (!m) {
      preview.hidden = false;
      preview.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color:hsl(var(--destructive))"></i> NIM tidak terdaftar`;
      return;
    }
    const hadir = Store.today.has(m.nim);
    preview.hidden = false;
    preview.innerHTML = `
      <strong>${esc(m.nama)}</strong>
      <span>${esc(m.nim)} • ${esc(m.kelas)} • ${esc(m.jurusan)}</span>
      ${hadir ? '<div style="margin-top:8px;color:hsl(var(--warning))"><i class="fa-solid fa-clock"></i> Sudah hadir</div>' : ''}
    `;
  },
  async submit() {
    const nim = $('manualNimInput').value.trim();
    if (!nim) { Notice.show('Masukkan NIM', 'error'); return; }
    const ok = await Attendance.manual(nim);
    if (ok) {
      Modal.close('manualModal');
      $('manualNimInput').value = '';
      $('manualPreview').hidden = true;
    }
  }
};

/* ================================================================
   NAVIGASI + TAB
================================================================ */
const Nav = {
  setActive(key) {
    document.querySelectorAll('.nav-link').forEach((b) => b.classList.toggle('active', b.dataset.go === key));
  },
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
    if (key === 'scan') {
      $('secScan').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const tabMap = { data: 'tabRoster', card: 'tabCard', log: 'tabLog' };
    if (tabMap[key]) this.showTab(tabMap[key]);
    if (window.innerWidth <= 900) $('secData').scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  init() {
    document.querySelectorAll('.nav-link').forEach((b) => b.addEventListener('click', () => this.go(b.dataset.go)));
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { this.showTab(t.dataset.tab); this.setActive(t.dataset.tab); }));
    window.addEventListener('resize', () => this.moveIndicator());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.moveIndicator());
    requestAnimationFrame(() => this.moveIndicator());
  }
};

/* ================================================================
   FILTERS
================================================================ */
function initFilters() {
  let t = null;
  $('searchInput').addEventListener('input', (e) => {
    clearTimeout(t);
    t = setTimeout(() => { Store.query = e.target.value; Roster.animateNext = true; Roster.render(); }, 150);
  });
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
      Store.filter = chip.dataset.filter;
      Roster.animateNext = true;
      Roster.render();
    });
  });
  $('classFilter').addEventListener('change', (e) => {
    Store.classFilter = e.target.value;
    Roster.animateNext = true;
    Roster.render();
  });
}

/* ================================================================
   KEYBOARD SHORTCUTS
================================================================ */
const Shortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      // Ignore saat typing di input
      if (e.target.matches('input, textarea, select')) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      // Ignore saat modal terbuka
      const modalOpen = [...document.querySelectorAll('.modal')].some(m => !m.hidden);
      if (modalOpen && e.key !== 'Escape') return;

      const key = e.key.toLowerCase();
      switch (key) {
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
        case '4': Nav.showTab('tabAchieve'); break;
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

/* ================================================================
   AUTO REFRESH INDICATOR
================================================================ */
const RefreshIndicator = {
  timer: null,
  start() {
    Store.countdown = Math.round(CONFIG.REFRESH_MS / 1000);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      Store.countdown--;
      if (Store.countdown <= 0) Store.countdown = Math.round(CONFIG.REFRESH_MS / 1000);
      const el = $('refreshCountdown');
      if (el) el.textContent = Store.countdown;
    }, 1000);
  }
};

/* ================================================================
   CAMERA CHECK
================================================================ */
async function checkCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Notice.show('Browser tidak mendukung kamera', 'error');
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

/* ================================================================
   INIT
================================================================ */
async function init() {
  Theme.init();
  Particles.init();
  Confetti.init();
  Ripple.init();
  Notice.init();
  startClock();
  Nav.init();
  Modal.init();
  initFilters();
  Feedback.paint();
  document.addEventListener('click', () => Feedback.unlock(), { once: true });

  // Button bindings
  $('btnScan').addEventListener('click', () => Scanner.toggle());
  $('btnTorch').addEventListener('click', () => Scanner.torch());
  $('btnFullscreen').addEventListener('click', () => Scanner.toggleFullscreen());
  $('btnSound').addEventListener('click', () => Feedback.toggle());
  $('btnTheme').addEventListener('click', () => Theme.toggle());
  $('btnShortcuts').addEventListener('click', () => Modal.open('shortcutsModal'));
  $('btnExport').addEventListener('click', () => Roster.exportCsv());
  $('btnRefresh').addEventListener('click', () => {
    const icon = $('btnRefresh').querySelector('i');
    icon.classList.remove('spin'); void icon.offsetWidth; icon.classList.add('spin');
    Roster.load();
  });
  $('btnMake').addEventListener('click', () => Card.make());
  $('btnSave').addEventListener('click', () => Card.download());
  $('btnPrint').addEventListener('click', () => Card.print());
  $('btnCloseCard').addEventListener('click', () => Card.close());
  $('nimInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') Card.make(); });
  $('btnManual').addEventListener('click', () => ManualEntry.open());
  $('btnManualSubmit').addEventListener('click', () => ManualEntry.submit());
  $('manualNimInput').addEventListener('input', () => ManualEntry.preview());
  $('manualNimInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') ManualEntry.submit(); });
  $('sheetLink').href = CONFIG.SHEET_URL;

  setScanInfo('Menunggu scan');
  await Roster.load();
  setInterval(() => Roster.load(true), CONFIG.REFRESH_MS);
  RefreshIndicator.start();
  if (await checkCamera()) setTimeout(() => Scanner.start(), 800);
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => {
  if (Store.reader && Store.scanning) Store.reader.stop().catch(() => {});
});