import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';

// PIN Akses Aplikasi
const CORRECT_PIN = "080798";

// Urutan tab — dasar navigasi swipe (kiri = maju, kanan = mundur)
const TAB_ORDER = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];
let currentTab = 'input';

const viewId = (tab) => `view${tab.charAt(0).toUpperCase()}${tab.slice(1)}`;

/* =========================================================
   1) LIVE CLOCK — Jam, Hari & Tanggal Real-Time (WIB)
   ========================================================= */
const clockTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const clockDayFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long'
});

const clockDateFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

function updateLiveClock() {
  const now = new Date();
  let teks;

  try {
    teks = `${clockTimeFmt.format(now)} WIB | ${clockDayFmt.format(now)}, ${clockDateFmt.format(now)}`;
  } catch (err) {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][now.getMonth()];
    const p = (n) => String(n).padStart(2, '0');
    teks = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())} WIB | ${hari}, ${now.getDate()} ${bulan} ${now.getFullYear()}`;
  }

  document.querySelectorAll('.live-clock').forEach((el) => {
    el.textContent = teks;
  });
}

function startLiveClock() {
  updateLiveClock();
  setInterval(updateLiveClock, 1000);
}

/* =========================================================
   2) KALENDER-ONLY — cegah keyboard muncul di field Tanggal
   ========================================================= */
const lockedCalendarInputs = new WeakSet();

function lockCalendarInput(el) {
  if (!el || lockedCalendarInputs.has(el)) return;
  lockedCalendarInputs.add(el);

  const lock = () => {
    if (!el.hasAttribute('readonly')) el.setAttribute('readonly', 'readonly');
    if (el.getAttribute('inputmode') !== 'none') el.setAttribute('inputmode', 'none');
  };

  lock();

  new MutationObserver(lock).observe(el, {
    attributes: true,
    attributeFilter: ['readonly', 'inputmode']
  });
}

function enforceCalendarOnlyInput() {
  lockCalendarInput(document.getElementById('tanggal'));

  const sweep = () => {
    document.querySelectorAll('input.flatpickr-input, input.alt-input').forEach(lockCalendarInput);
  };
  setTimeout(sweep, 800);
  setTimeout(sweep, 2000);
}

function guardTanggalWajib() {
  const form = document.getElementById('txForm');
  const tgl = document.getElementById('tanggal');
  if (!form || !tgl) return;

  form.addEventListener('submit', (e) => {
    if (!tgl.value.trim()) {
      e.preventDefault();
      e.stopImmediatePropagation();

      tgl.classList.remove('animate-shake');
      void tgl.offsetWidth;
      tgl.classList.add('animate-shake');

      if (tgl._flatpickr && typeof tgl._flatpickr.open === 'function') {
        tgl._flatpickr.open();
      }
    }
  });
}

/* =========================================================
   3) GLIDER — bubble pink yang meluncur di menu bar.
   Posisinya dihitung per menu, ikut gerak proporsional
   saat halaman di-swipe (updateGliderDrag).
   ========================================================= */
function gliderPos(tab) {
  const track = document.getElementById('navTrack');
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (!track || !btn) return null;
  const box = btn.querySelector('.nav-icon-box');
  if (!box) return null;

  const trackRect = track.getBoundingClientRect();
  const boxRect = box.getBoundingClientRect();
  const pad = 4; // glider sedikit lebih besar dari kotak icon

  return {
    x: boxRect.left - trackRect.left - pad,
    y: boxRect.top - trackRect.top - pad,
    size: boxRect.width + pad * 2
  };
}

function positionGlider(tab, animate = true) {
  const glider = document.getElementById('navGlider');
  const pos = gliderPos(tab);
  if (!glider || !pos) return;

  glider.style.transition = animate ? '' : 'none';
  glider.style.width = `${pos.size}px`;
  glider.style.height = `${pos.size}px`;
  glider.style.transform = `translate(${pos.x}px, ${pos.y}px)`;

  if (!animate) {
    void glider.offsetWidth;
    glider.style.transition = '';
  }
  glider.classList.add('nav-glider-ready');
}

function updateGliderDrag(targetTab, progress) {
  const glider = document.getElementById('navGlider');
  const from = gliderPos(currentTab);
  const to = gliderPos(targetTab);
  if (!glider || !from || !to) return;

  const x = from.x + (to.x - from.x) * progress;
  glider.style.transition = 'none';
  glider.style.transform = `translate(${x}px, ${from.y}px)`;
  glider.classList.add('nav-glider-ready');
}

/* =========================================================
   4) TRANSISI CAROUSEL GAYA INSTAGRAM
   Saat swipe: halaman aktif & halaman sebelah BERGESER BERSAMAAN
   1:1 mengikuti jari. Lepas jari: selesai meluncur / snap balik.
   Klik menu pun memakai transisi slide yang sama.
   ========================================================= */
const swipe = {
  active: false,
  dir: null,
  targetTab: null,
  currentView: null,
  targetView: null,
  width: 0,
  lastD: 0,
  lastX: 0,
  lastT: 0
};

function closeFlatpickrIfOpen() {
  try {
    if (window.flatpickr && Array.isArray(window.flatpickr.instances)) {
      window.flatpickr.instances.forEach((inst) => {
        if (inst && typeof inst.close === 'function' && inst.isOpen) inst.close();
      });
    }
  } catch (err) { /* aman */ }
}

function stagePrepare(targetTab, direction) {
  const viewport = document.getElementById('pagesViewport');
  const currentView = document.querySelector('.app-module:not(.hidden)');
  const targetView = document.getElementById(viewId(targetTab));
  if (!viewport || !currentView || !targetView || currentView === targetView) return false;

  closeFlatpickrIfOpen();
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  viewport.classList.add('pages-clip');

  [currentView, targetView].forEach(v => {
    v.classList.remove('module-anim', 'module-anim-next', 'module-anim-prev');
  });

  const w = viewport.offsetWidth;
  const dirSign = direction === 'next' ? 1 : -1;

  // Halaman tujuan disiapkan di samping halaman aktif (di luar layar)
  targetView.classList.remove('hidden');
  targetView.style.position = 'absolute';
  targetView.style.top = '0px';
  targetView.style.left = '0px';
  targetView.style.width = '100%';
  targetView.style.margin = '0px';
  targetView.style.transition = 'none';
  targetView.style.transform = `translateX(${dirSign * w}px)`;
  targetView.style.willChange = 'transform';

  currentView.style.transition = 'none';
  currentView.style.willChange = 'transform';

  swipe.active = true;
  swipe.dir = direction;
  swipe.targetTab = targetTab;
  swipe.currentView = currentView;
  swipe.targetView = targetView;
  swipe.width = w;
  swipe.lastD = 0;
  swipe.lastX = 0;
  swipe.lastT = Date.now();
  return true;
}

function stageUpdate(dx) {
  if (!swipe.active) return;

  // Kunci arah sesuai stage (biar balik arah di tengah jalan tetap rapi)
  let d = dx;
  if (swipe.dir === 'next') d = Math.min(d, 0);
  else d = Math.max(d, 0);
  d = Math.max(Math.min(d, swipe.width), -swipe.width);
  swipe.lastD = d;

  const dirSign = swipe.dir === 'next' ? 1 : -1;
  swipe.currentView.style.transform = `translateX(${d}px)`;
  swipe.targetView.style.transform = `translateX(${d + dirSign * swipe.width}px)`;

  // Glider pink ikut bergerak proporsional mengikuti progres swipe
  const progress = Math.min(Math.abs(d) / swipe.width, 1);
  updateGliderDrag(swipe.targetTab, progress);
}

function stageCommit() {
  if (!swipe.active) return;
  const { currentView, targetView, width, dir, targetTab } = swipe;
  const dirSign = dir === 'next' ? 1 : -1;
  const D = 300;

  const shell = document.getElementById('appShell');
  const viewport = document.getElementById('pagesViewport');

  // Kunci tinggi kartu & viewport, lalu animasikan ke tinggi halaman baru
  const shellCur = shell.offsetHeight;
  const viewCur = viewport.offsetHeight;
  const targetH = targetView.offsetHeight;
  shell.style.height = `${shellCur}px`;
  viewport.style.height = `${viewCur}px`;

  currentView.style.transition = `transform ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  targetView.style.transition = `transform ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  requestAnimationFrame(() => {
    currentView.style.transform = `translateX(${-dirSign * width}px)`;
    targetView.style.transform = 'translateX(0px)';

    shell.style.transition = `height ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    viewport.style.transition = `height ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    shell.style.height = `${Math.max(shellCur + (targetH - viewCur), 0)}px`;
    viewport.style.height = `${targetH}px`;

    // Glider meluncur sampai ke menu tujuan
    positionGlider(targetTab, true);
  });

  const finDir = dir;
  setTimeout(() => finalizeTab(targetTab, finDir), D + 50);
}

function stageCancel() {
  if (!swipe.active) return;
  const { currentView, targetView, width, dir } = swipe;
  const D = 240;

  currentView.style.transition = `transform ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  targetView.style.transition = `transform ${D}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  currentView.style.transform = 'translateX(0px)';
  targetView.style.transform = `translateX(${dir === 'next' ? width : -width}px)`;

  // Glider balik ke menu asal
  positionGlider(currentTab, true);

  setTimeout(() => {
    [currentView, targetView].forEach(v => {
      v.style.transition = '';
      v.style.transform = '';
      v.style.position = '';
      v.style.top = '';
      v.style.left = '';
      v.style.width = '';
      v.style.margin = '';
      v.style.willChange = '';
    });
    targetView.classList.add('hidden');
    document.getElementById('pagesViewport')?.classList.remove('pages-clip');

    swipe.active = false;
    swipe.dir = null;
    swipe.targetTab = null;
    swipe.currentView = null;
    swipe.targetView = null;
    swipe.width = 0;
    swipe.lastD = 0;
  }, D + 50);
}

function finalizeTab(targetTab, direction) {
  const shell = document.getElementById('appShell');
  const viewport = document.getElementById('pagesViewport');
  const prevView = swipe.currentView;
  const newView = swipe.targetView;
  if (!prevView || !newView) return;

  [prevView, newView].forEach(v => {
    v.style.transition = '';
    v.style.transform = '';
    v.style.position = '';
    v.style.top = '';
    v.style.left = '';
    v.style.width = '';
    v.style.margin = '';
    v.style.willChange = '';
  });

  prevView.classList.add('hidden');
  if (viewport) viewport.classList.remove('pages-clip');

  if (shell) { shell.style.transition = ''; shell.style.height = ''; }
  if (viewport) { viewport.style.transition = ''; viewport.style.height = ''; }

  swipe.active = false;
  swipe.dir = null;
  swipe.targetTab = null;
  swipe.currentView = null;
  swipe.targetView = null;
  swipe.width = 0;
  swipe.lastD = 0;

  applyTabState(targetTab, direction, false);
}

function initSwipeNavigation() {
  const shell = document.getElementById('appShell');
  if (!shell) return;

  const INTERACTIVE = 'input, select, textarea, button, a, label, .flatpickr-calendar, .nav-bar, [data-no-swipe]';

  let startX = 0, startY = 0, startT = 0;
  let tracking = false, horizontal = false, boundary = false;
  let activeView = null;

  shell.addEventListener('touchstart', (e) => {
    if (swipe.active || e.touches.length !== 1) { tracking = false; return; }
    if (e.target.closest && e.target.closest(INTERACTIVE)) { tracking = false; return; }

    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    tracking = true;
    horizontal = false;
    boundary = false;
    activeView = null;
  }, { passive: true });

  shell.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!horizontal) {
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        // Gerakan jelas horizontal → mulai seret carousel
        horizontal = true;
        e.preventDefault();
        activeView = document.querySelector('.app-module:not(.hidden)');

        const idx = TAB_ORDER.indexOf(currentTab);
        const nextIdx = dx < 0 ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) {
          boundary = true; // mentok di ujung → rubber band
        } else {
          boundary = !stagePrepare(TAB_ORDER[nextIdx], dx < 0 ? 'next' : 'prev');
        }
      } else if (Math.abs(dy) > 12) {
        tracking = false; // user lagi scroll vertikal
      }
      return;
    }

    e.preventDefault();

    if (boundary) {
      if (activeView) {
        activeView.style.transition = 'none';
        activeView.style.transform = `translateX(${dx * 0.3}px)`;
      }
      return;
    }

    if (swipe.active) {
      stageUpdate(dx);
      swipe.lastX = t.clientX;
      swipe.lastT = Date.now();
    }
  }, { passive: false });

  const endGesture = (e, canceled) => {
    if (!tracking) return;
    tracking = false;

    if (boundary && activeView) {
      activeView.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
      activeView.style.transform = '';
      const av = activeView;
      setTimeout(() => { av.style.transition = ''; }, 260);
      activeView = null;
      return;
    }

    if (!(swipe.active && swipe.targetView)) { activeView = null; return; }

    const endX = canceled ? (swipe.lastX || startX) : (e.changedTouches[0]?.clientX ?? startX);
    const dxTotal = endX - startX;
    const d = swipe.lastD || 0;

    // Deteksi flick (sentilan cepat)
    const sinceLast = Date.now() - (swipe.lastT || startT);
    const lastDelta = endX - (swipe.lastX || startX);
    const flick = !canceled && sinceLast < 120 && Math.abs(lastDelta) > 16;

    const dirOk = (swipe.dir === 'next' && dxTotal < 0) || (swipe.dir === 'prev' && dxTotal > 0);
    const threshold = swipe.width * 0.2;
    const shouldCommit = dirOk && (Math.abs(d) >= threshold || (flick && Math.abs(dxTotal) > 36));

    if (shouldCommit) stageCommit();
    else stageCancel();

    activeView = null;
  };

  shell.addEventListener('touchend', (e) => endGesture(e, false), { passive: true });
  shell.addEventListener('touchcancel', (e) => endGesture(e, true), { passive: true });
}

/* =========================================================
   5) NAVBAR — sembunyi saat keyboard virtual aktif
   ========================================================= */
function initNavbarKeyboardAwareness() {
  const bar = document.querySelector('.nav-bar');
  if (!bar || !window.visualViewport) return;

  const vv = window.visualViewport;
  const check = () => {
    const keyboardOpen = (window
