/* =========================================================
   script.js — ENHANCEMENT LAYER
   
   Login, navigasi dasar, jam live & glider dijalankan inline
   script di index.html (non-module) — tetap jalan walau file
   ini error sekalipun.

   MODE MANUAL-LOAD:
   - TIDAK ADA fetch otomatis saat pindah/swipe tab.
   - Data modul HANYA dimuat saat tombol "Tampilkan/Cari" diklik.
   - v7: + setup.js (panel Setup Budget via long-press kartu Total Aset)
   ========================================================= */

const TAB_ORDER = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];
let currentTab = 'input';

const viewId = function (tab) {
  return 'view' + tab.charAt(0).toUpperCase() + tab.slice(1);
};

function safeRun(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn('[APP] ' + label + ' gagal (app tetap jalan):', err);
  }
}

/* =========================================================
   1) LOADER MODUL — semua dinamis, satu gagal gak menular.
   init hanya memasang listener (ringan), TIDAK fetch.
   ========================================================= */
async function tryImport(path, label) {
  try {
    return await import(path);
  } catch (err) {
    console.warn('[LOAD] ' + label + ' gagal di-import:', err);
    return null;
  }
}

async function loadAllModules() {
  const t = await tryImport('./transaksi.js', 'transaksi.js');
  if (t && typeof t.initTransaksi === 'function') {
    safeRun('initTransaksi', function () { t.initTransaksi(); });
  }

  const d = await tryImport('./dashboard.js', 'dashboard.js');
  if (d && typeof d.initDashboard === 'function') {
    safeRun('initDashboard', function () { d.initDashboard(); });
  }

  const m = await tryImport('./mutasi.js', 'mutasi.js');
  if (m && typeof m.initMutasi === 'function') {
    safeRun('initMutasi', function () { m.initMutasi(); });
  }

  const r = await tryImport('./receipt.js', 'receipt.js');
  if (r && typeof r.initReceipt === 'function') {
    safeRun('initReceipt', function () { r.initReceipt(); });
  }

  const s = await tryImport('./search.js', 'search.js');
  if (s && typeof s.initSearchModule === 'function') {
    safeRun('initSearchModule', function () { s.initSearchModule(); });
  }

  // MODUL SETUP BUDGET (panel rahasia via long-press kartu Total Aset)
  const u = await tryImport('./setup.js', 'setup.js');
  if (u && typeof u.initSetupModule === 'function') {
    safeRun('initSetupModule', function () { u.initSetupModule(); });
  }
}

/* =========================================================
   2) KALENDER-ONLY — keyboard gak muncul di field Tanggal
   ========================================================= */
const lockedCalendarInputs = new WeakSet();

function lockCalendarInput(el) {
  if (!el || lockedCalendarInputs.has(el)) return;
  lockedCalendarInputs.add(el);

  const lock = function () {
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

  const sweep = function () {
    document.querySelectorAll('input.flatpickr-input, input.alt-input').forEach(lockCalendarInput);
  };
  setTimeout(sweep, 800);
  setTimeout(sweep, 2000);
}

// Input readonly mem-bypass validasi required → guard manual
function guardTanggalWajib() {
  const form = document.getElementById('txForm');
  const tgl = document.getElementById('tanggal');
  if (!form || !tgl) return;

  form.addEventListener('submit', function (e) {
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
   3) GLIDER (perhitungan posisi ada di inline script)
   ========================================================= */
function positionGlider(tab, animate) {
  if (typeof window.__positionGlider === 'function') {
    try { window.__positionGlider(tab, animate); } catch (err) { /* aman */ }
  }
}

function updateGliderDrag(fromTab, toTab, progress) {
  if (typeof window.__updateGliderDrag === 'function') {
    try { window.__updateGliderDrag(fromTab, toTab, progress); } catch (err) { /* aman */ }
  }
}

/* =========================================================
   4) CAROUSEL SWIPE GAYA INSTAGRAM
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
      window.flatpickr.instances.forEach(function (inst) {
        if (inst && typeof inst.close === 'function' && inst.isOpen) inst.close();
      });
    }
  } catch (err) { /* aman */ }
}

function cleanupStage(a, b) {
  [a, b].forEach(function (v) {
    if (!v) return;
    v.style.transition = '';
    v.style.transform = '';
    v.style.position = '';
    v.style.top = '';
    v.style.left = '';
    v.style.width = '';
    v.style.margin = '';
    v.style.willChange = '';
  });
}

function resetSwipeState() {
  swipe.active = false;
  swipe.dir = null;
  swipe.targetTab = null;
  swipe.currentView = null;
  swipe.targetView = null;
  swipe.width = 0;
  swipe.lastD = 0;
  swipe.lastX = 0;
  swipe.lastT = 0;
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

  [currentView, targetView].forEach(function (v) {
    v.classList.remove('module-anim-next', 'module-anim-prev');
  });

  const w = viewport.offsetWidth;
  const dirSign = direction === 'next' ? 1 : -1;

  targetView.classList.remove('hidden');
  targetView.style.position = 'absolute';
  targetView.style.top = '0px';
  targetView.style.left = '0px';
  targetView.style.width = '100%';
  targetView.style.margin = '0px';
  targetView.style.transition = 'none';
  targetView.style.transform = 'translateX(' + (dirSign * w) + 'px)';
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

  let d = dx;
  if (swipe.dir === 'next') d = Math.min(d, 0);
  else d = Math.max(d, 0);
  d = Math.max(Math.min(d, swipe.width), -swipe.width);
  swipe.lastD = d;

  const dirSign = swipe.dir === 'next' ? 1 : -1;
  swipe.currentView.style.transform = 'translateX(' + d + 'px)';
  swipe.targetView.style.transform = 'translateX(' + (d + dirSign * swipe.width) + 'px)';

  const progress = Math.min(Math.abs(d) / swipe.width, 1);
  updateGliderDrag(currentTab, swipe.targetTab, progress);
}

function stageCommit() {
  if (!swipe.active) return;
  const currentView = swipe.currentView;
  const targetView = swipe.targetView;
  const width = swipe.width;
  const dir = swipe.dir;
  const targetTab = swipe.targetTab;
  const dirSign = dir === 'next' ? 1 : -1;
  const D = 300;

  const shell = document.getElementById('appShell');
  const viewport = document.getElementById('pagesViewport');

  let shellCur = 0, viewCur = 0, targetH = 0;
  try {
    shellCur = shell.offsetHeight;
    viewCur = viewport.offsetHeight;
    targetH = targetView.offsetHeight;
    shell.style.height = shellCur + 'px';
    viewport.style.height = viewCur + 'px';
  } catch (err) { /* ukuran opsional */ }

  currentView.style.transition = 'transform ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
  targetView.style.transition = 'transform ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';

  requestAnimationFrame(function () {
    currentView.style.transform = 'translateX(' + (-dirSign * width) + 'px)';
    targetView.style.transform = 'translateX(0px)';

    try {
      shell.style.transition = 'height ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
      viewport.style.transition = 'height ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
      shell.style.height = Math.max(shellCur + (targetH - viewCur), 0) + 'px';
      viewport.style.height = targetH + 'px';
    } catch (err) { /* aman */ }

    positionGlider(targetTab, true);
  });

  setTimeout(function () { finalizeTab(targetTab); }, D + 60);
}

function stageCancel() {
  if (!swipe.active) return;
  const currentView = swipe.currentView;
  const targetView = swipe.targetView;
  const width = swipe.width;
  const dir = swipe.dir;
  const D = 240;

  currentView.style.transition = 'transform ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
  targetView.style.transition = 'transform ' + D + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
  currentView.style.transform = 'translateX(0px)';
  targetView.style.transform = 'translateX(' + (dir === 'next' ? width : -width) + 'px)';

  positionGlider(currentTab, true);

  setTimeout(function () {
    cleanupStage(currentView, targetView);
    targetView.classList.add('hidden');
    const viewport = document.getElementById('pagesViewport');
    if (viewport) viewport.classList.remove('pages-clip');
    resetSwipeState();
  }, D + 60);
}

function finalizeTab(targetTab) {
  const shell = document.getElementById('appShell');
  const viewport = document.getElementById('pagesViewport');
  const prevView = swipe.currentView;
  const newView = swipe.targetView;
  if (!prevView || !newView) { resetSwipeState(); return; }

  cleanupStage(prevView, newView);
  prevView.classList.add('hidden');
  if (viewport) viewport.classList.remove('pages-clip');

  if (shell) { shell.style.transition = ''; shell.style.height = ''; }
  if (viewport) { viewport.style.transition = ''; viewport.style.height = ''; }

  resetSwipeState();
  applyTabState(targetTab);
}

function applyTabState(targetTab) {
  currentTab = targetTab;

  document.querySelectorAll('.nav-btn[data-tab]').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
  });

  TAB_ORDER.forEach(function (tab) {
    const view = document.getElementById(viewId(tab));
    if (view) view.classList.toggle('hidden', tab !== targetTab);
  });

  positionGlider(targetTab, true);
  // CATATAN: TIDAK ada loadTabData — data dimuat manual via tombol
}

function initSwipeNavigation() {
  const shell = document.getElementById('appShell');
  if (!shell) return;

  const INTERACTIVE = 'input, select, textarea, button, a, label, .flatpickr-calendar, .nav-bar, [data-no-swipe]';

  let startX = 0, startY = 0, startT = 0;
  let tracking = false, horizontal = false, boundary = false;
  let activeView = null;

  shell.addEventListener('touchstart', function (e) {
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

  shell.addEventListener('touchmove', function (e) {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!horizontal) {
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        horizontal = true;
        e.preventDefault();
        activeView = document.querySelector('.app-module:not(.hidden)');

        const idx = TAB_ORDER.indexOf(currentTab);
        const nextIdx = dx < 0 ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) {
          boundary = true;
        } else {
          boundary = !stagePrepare(TAB_ORDER[nextIdx], dx < 0 ? 'next' : 'prev');
        }
      } else if (Math.abs(dy) > 12) {
        tracking = false;
      }
      return;
    }

    e.preventDefault();

    if (boundary) {
      if (activeView) {
        activeView.style.transition = 'none';
        activeView.style.transform = 'translateX(' + (dx * 0.3) + 'px)';
      }
      return;
    }

    if (swipe.active) {
      stageUpdate(dx);
      swipe.lastX = t.clientX;
      swipe.lastT = Date.now();
    }
  }, { passive: false });

  function endGesture(e, canceled) {
    if (!tracking) return;
    tracking = false;

    if (boundary && activeView) {
      const av = activeView;
      av.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
      av.style.transform = '';
      setTimeout(function () { av.style.transition = ''; }, 260);
      activeView = null;
      return;
    }

    if (!(swipe.active && swipe.targetView)) { activeView = null; return; }

    const endX = canceled ? (swipe.lastX || startX)
      : ((e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX);
    const dxTotal = endX - startX;
    const d = swipe.lastD || 0;

    const sinceLast = Date.now() - (swipe.lastT || startT);
    const lastDelta = endX - (swipe.lastX || startX);
    const flick = !canceled && sinceLast < 120 && Math.abs(lastDelta) > 16;

    const dirOk = (swipe.dir === 'next' && dxTotal < 0) || (swipe.dir === 'prev' && dxTotal > 0);
    const threshold = swipe.width * 0.2;
    const shouldCommit = dirOk && (Math.abs(d) >= threshold || (flick && Math.abs(dxTotal) > 36));

    if (shouldCommit) stageCommit();
    else stageCancel();

    activeView = null;
  }

  shell.addEventListener('touchend', function (e) { endGesture(e, false); }, { passive: true });
  shell.addEventListener('touchcancel', function (e) { endGesture(e, true); }, { passive: true });
}

/* =========================================================
   5) NAVBAR — sembunyi saat keyboard virtual aktif
   ========================================================= */
function initNavbarKeyboardAwareness() {
  const bar = document.querySelector('.nav-bar');
  if (!bar || !window.visualViewport) return;

  const vv = window.visualViewport;
  const check = function () {
    const keyboardOpen = (window.innerHeight - vv.height) > 120;
    bar.classList.toggle('nav-bar-hidden', keyboardOpen);
  };

  vv.addEventListener('resize', check);
  vv.addEventListener('scroll', check);
  check();
}

/* =========================================================
   6) SWITCH TAB FANCY — klik menu → transisi carousel.
   Pindah tab TIDAK memicu fetch data (mode manual-load).
   ========================================================= */
function fancySwitchTab(targetTab) {
  if (swipe.active) return;
  if (TAB_ORDER.indexOf(targetTab) === -1) return;

  // Klik tab yang sedang aktif = tidak melakukan apa-apa
  if (targetTab === currentTab) return;

  const from = TAB_ORDER.indexOf(currentTab);
  const to = TAB_ORDER.indexOf(targetTab);
  const dir = to > from ? 'next' : 'prev';

  if (stagePrepare(targetTab, dir)) {
    stageCommit();
  } else {
    applyTabState(targetTab);
    const view = document.getElementById(viewId(targetTab));
    if (view) {
      view.classList.remove('module-anim-next', 'module-anim-prev');
      void view.offsetWidth;
      view.classList.add(dir === 'next' ? 'module-anim-next' : 'module-anim-prev');
    }
  }
}

/* =========================================================
   BOOT
   ========================================================= */
function boot() {
  const activeBtn = document.querySelector('.nav-btn.active');
  if (activeBtn) {
    const t = activeBtn.getAttribute('data-tab');
    if (t && TAB_ORDER.indexOf(t) !== -1) currentTab = t;
  }

  safeRun('calendar-lock', enforceCalendarOnlyInput);
  safeRun('tanggal-guard', guardTanggalWajib);
  safeRun('swipe-nav', initSwipeNavigation);
  safeRun('keyboard-awareness', initNavbarKeyboardAwareness);
  safeRun('glider-init', function () { positionGlider(currentTab, false); });

  // Upgrade navigasi dasar (inline) → versi carousel
  window.__switchTab = fancySwitchTab;

  // Muat modul (init ringan — listener saja, tanpa fetch)
  loadAllModules();

  requestAnimationFrame(function () { positionGlider(currentTab, false); });
  setTimeout(function () { positionGlider(currentTab, false); }, 400);
  setTimeout(function () { positionGlider(currentTab, false); }, 900);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      positionGlider(currentTab, false);
    }).catch(function () { /* aman */ });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('load', function () {
  safeRun('glider-load', function () { positionGlider(currentTab, false); });
});
window.addEventListener('resize', function () {
  safeRun('glider-resize', function () { positionGlider(currentTab, false); });
});
window.addEventListener('orientationchange', function () {
  setTimeout(function () {
    safeRun('glider-rotate', function () { positionGlider(currentTab, false); });
  }, 250);
});
