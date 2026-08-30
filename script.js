import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';

// PIN Akses Aplikasi
const CORRECT_PIN = "080798";

// Urutan tab — dipakai untuk navigasi swipe (kiri = maju, kanan = mundur)
const TAB_ORDER = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];
let currentTab = 'input';

/* =========================================================
   1) LIVE CLOCK — Jam, Hari & Tanggal Real-Time (WIB)
   Contoh output: 19:12:54 WIB | Selasa, 27 Agustus 2026
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
    // Fallback manual (kalau Intl tidak tersedia di browser lama)
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

  // Flatpickr bisa menghapus atribut readonly saat init,
  // jadi atributnya dipantau terus & dikunci ulang otomatis.
  new MutationObserver(lock).observe(el, {
    attributes: true,
    attributeFilter: ['readonly', 'inputmode']
  });
}

function enforceCalendarOnlyInput() {
  lockCalendarInput(document.getElementById('tanggal'));

  // Sapu juga input kalender lain (mis. alt-input flatpickr) setelah modul dimuat
  const sweep = () => {
    document.querySelectorAll('input.flatpickr-input, input.alt-input').forEach(lockCalendarInput);
  };
  setTimeout(sweep, 800);
  setTimeout(sweep, 2000);
}

// Guard: form gak bisa dikirim kalau tanggal masih kosong
// (input readonly mem-bypass validasi required bawaan browser)
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

      // Langsung buka kalendernya biar user tinggal pilih tanggal
      if (tgl._flatpickr && typeof tgl._flatpickr.open === 'function') {
        tgl._flatpickr.open();
      }
    }
  });
}

/* =========================================================
   3) SWIPE NAVIGATION ANTAR HALAMAN
   - Swipe KIRI  : pindah ke menu berikutnya
   - Swipe KANAN : pindah ke menu sebelumnya
   - Halaman ikut terseret pelan pas di-swipe (preview),
     lalu slide-in dari arah yang sesuai setelah pindah.
   - Aman: scroll vertikal, input form, tombol & kalender
     tidak terganggu (deteksi hanya gerakan dominan horizontal).
   ========================================================= */
function initSwipeNavigation() {
  const shell = document.getElementById('appShell');
  if (!shell) return;

  const INTERACTIVE = 'input, select, textarea, button, a, .flatpickr-calendar, .nav-bar, [data-no-swipe]';

  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;
  let horizontal = false;
  let previewEl = null;

  const resetPreview = () => {
    if (!previewEl) return;
    const el = previewEl;
    previewEl = null;
    el.style.transition = 'transform 0.25s ease';
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 260);
  };

  shell.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) {
      tracking = false;
      resetPreview();
      return;
    }
    // Abaikan swipe yang dimulai dari elemen interaktif
    if (e.target.closest && e.target.closest(INTERACTIVE)) {
      tracking = false;
      return;
    }

    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startT = Date.now();
    tracking = true;
    horizontal = false;
  }, { passive: true });

  shell.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!horizontal) {
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        // Gerakan jelas horizontal → mulai preview seret halaman
        horizontal = true;
        previewEl = document.querySelector('.app-module:not(.hidden)');
      } else if (Math.abs(dy) > 14) {
        // User lagi scroll vertikal → stop tracking
        tracking = false;
        resetPreview();
        return;
      }
    }

    if (horizontal && previewEl) {
      // Halaman terseret pelan mengikuti jari (dibatasi biar gak lebay)
      const drag = Math.max(Math.min(dx * 0.14, 48), -48);
      previewEl.style.transition = 'none';
      previewEl.style.transform = `translateX(${drag}px)`;
    }
  }, { passive: true });

  shell.addEventListener('touchend', (e) => {
    if (!tracking) {
      resetPreview();
      return;
    }
    tracking = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = Date.now() - startT;

    resetPreview();

    // Validasi swipe: cukup jauh, dominan horizontal, & cukup cepat
    if (dt > 800) return;
    if (Math.abs(dx) < 55) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

    const idx = TAB_ORDER.indexOf(currentTab);
    const nextIdx = dx < 0 ? idx + 1 : idx - 1;

    // Sudah mentok di ujung → diam di tempat (rubber band balik)
    if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return;

    switchTab(TAB_ORDER[nextIdx], dx < 0 ? 'next' : 'prev');
  }, { passive: true });

  shell.addEventListener('touchcancel', () => {
    tracking = false;
    resetPreview();
  }, { passive: true });
}

/* =========================================================
   4) NAVBAR — sembunyi saat keyboard virtual aktif
   ========================================================= */
function initNavbarKeyboardAwareness() {
  const bar = document.querySelector('.nav-bar');
  if (!bar || !window.visualViewport) return;

  const vv = window.visualViewport;
  const check = () => {
    const keyboardOpen = (window.innerHeight - vv.height) > 120;
    bar.classList.toggle('nav-bar-hidden', keyboardOpen);
  };

  vv.addEventListener('resize', check);
  vv.addEventListener('scroll', check);
  check();
}

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  // Jalankan live clock (timestamp real-time)
  startLiveClock();

  // Kunci field Tanggal: kalender only, tanpa keyboard
  enforceCalendarOnlyInput();

  // Guard tanggal wajib (dipasang SEBELUM initTransaksi biar jalan duluan)
  guardTanggalWajib();

  // Attach PIN Listeners
  pinInput?.addEventListener('input', checkPinAuto);
  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyPin();
  });

  document.getElementById('btnTogglePin')?.addEventListener('click', togglePinVisibility);

  // Attach Navigation Listeners (klik menu)
  document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Navigasi swipe antar halaman
  initSwipeNavigation();

  // Handler Event Listener untuk Dropdown Placeholder Style (Miring & Pudar)
  initPlaceholderDropdowns();

  // Safe Load Modules
  if (typeof initTransaksi === 'function') initTransaksi();
  if (typeof initDashboard === 'function') initDashboard();

  // Load Optional Modules jika sudah tersedia
  loadOptionalModules();

  // Navbar: sembunyi saat keyboard aktif
  initNavbarKeyboardAwareness();
});

// Mengelola Tampilan Dropdown Placeholder
function initPlaceholderDropdowns() {
  const dropdowns = document.querySelectorAll('select.is-placeholder');
  dropdowns.forEach((select) => {
    if (select.value !== "") {
      select.classList.remove('is-placeholder');
    }

    select.addEventListener('change', function () {
      if (this.value === "" || this.value === null) {
        this.classList.add('is-placeholder');
      } else {
        this.classList.remove('is-placeholder');
      }
    });
  });
}

// Pemuatan Modul Tambahan Secara Aman
let initMutasi, loadMutasiData, initReceipt, loadEReceiptData, initSearchModule, loadSearchData;

async function loadOptionalModules() {
  try {
    const mutasiMod = await import('./mutasi.js').catch(() => null);
    if (mutasiMod && mutasiMod.initMutasi) {
      initMutasi = mutasiMod.initMutasi;
      loadMutasiData = mutasiMod.loadMutasiData;
      initMutasi();
    }

    const receiptMod = await import('./receipt.js').catch(() => null);
    if (receiptMod && receiptMod.initReceipt) {
      initReceipt = receiptMod.initReceipt;
      loadEReceiptData = receiptMod.loadEReceiptData;
      initReceipt();
    }

    const searchMod = await import('./search.js').catch((err) => {
      console.warn('[LOAD] search.js gagal di-import (cek syntax error):', err);
      return null;
    });

    // FIX: nama fungsi yang di-export search.js adalah "initSearchModule"
    if (searchMod && searchMod.initSearchModule) {
      initSearchModule = searchMod.initSearchModule;
      loadSearchData = searchMod.fetchAndRenderSearchData;
      initSearchModule();
    } else {
      console.warn('[LOAD] search.js dimuat, tapi fungsi initSearchModule tidak ditemukan.');
    }
  } catch (e) {
    console.warn("Modul belum lengkap/masih kosong, dikondisikan aman:", e);
  }
}

// Toggle Show/Hide PIN
function togglePinVisibility() {
  const pinInput = document.getElementById('pinInput');
  const eyeIcon = document.getElementById('eyeIcon');
  if (!pinInput || !eyeIcon) return;

  if (pinInput.type === 'password') {
    pinInput.type = 'text';
    eyeIcon.innerText = '🙈';
  } else {
    pinInput.type = 'password';
    eyeIcon.innerText = '👁️';
  }
}

// Auto check PIN saat 6 digit
function checkPinAuto() {
  const pinInput = document.getElementById('pinInput');
  if (pinInput && pinInput.value.length === 6) {
    verifyPin();
  }
}

// Verifikasi PIN Login
function verifyPin() {
  const pinInput = document.getElementById('pinInput');
  const pinBox = document.getElementById('pinBox');
  const pinError = document.getElementById('pinError');
  const lockScreen = document.getElementById('lockScreen');

  if (!pinInput) return;

  if (pinInput.value === CORRECT_PIN) {
    if (pinError) pinError.classList.add('hidden');
    if (lockScreen) {
      lockScreen.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => lockScreen.remove(), 700);
    }
  } else {
    if (pinError) pinError.classList.remove('hidden');
    if (pinBox) {
      pinBox.classList.remove('animate-shake');
      void pinBox.offsetWidth;
      pinBox.classList.add('animate-shake');
    }
    pinInput.value = '';
    pinInput.focus();
  }
}

/* =========================================================
   Tab Switcher Controller
   - direction 'next' : halaman baru slide-in dari kanan
   - direction 'prev' : halaman baru slide-in dari kiri
   - Klik menu juga pakai arah sesuai urutan tab,
     biar rasanya konsisten dengan swipe.
   ========================================================= */
function switchTab(targetTab, direction = null) {
  if (!TAB_ORDER.includes(targetTab)) return;

  if (!direction) {
    const from = TAB_ORDER.indexOf(currentTab);
    const to = TAB_ORDER.indexOf(targetTab);
    direction = to > from ? 'next' : 'prev';
  }

  TAB_ORDER.forEach(tab => {
    const view = document.getElementById(`view${capitalize(tab)}`);
    const btn = document.getElementById(`nav${capitalize(tab)}Btn`);

    if (tab === targetTab) {
      if (view) {
        view.classList.remove('hidden');
        // Reset & trigger ulang animasi entrance sesuai arah
        view.classList.remove('module-anim', 'module-anim-next', 'module-anim-prev');
        void view.offsetWidth;
        view.classList.add(direction === 'next' ? 'module-anim-next' : 'module-anim-prev');
      }
      if (btn) btn.classList.add('active');
    } else {
      if (view) view.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  });

  currentTab = targetTab;

  if (targetTab === 'dashboard' && typeof loadDashboardData === 'function') {
    loadDashboardData();
  } else if (targetTab === 'mutasi' && typeof loadMutasiData === 'function') {
    loadMutasiData();
  } else if (targetTab === 'receipt' && typeof loadEReceiptData === 'function') {
    loadEReceiptData();
  } else if (targetTab === 'search' && typeof loadSearchData === 'function') {
    // Refresh hasil pencarian tiap kali tab "Cari" dibuka
    loadSearchData();
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
