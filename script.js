import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';

// PIN Akses Aplikasi
const CORRECT_PIN = "080798";

/* =========================================================
   1) LIVE CLOCK — Jam, Hari & Tanggal Real-Time (WIB)
   Contoh output: 19:12:54 WIB | Selasa, 27 Agustus 2026
   Dipakai di: footer bawah & e-receipt.
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
   2) NAVBAR DINAMIS (APP STORE STYLE)
   Sliding pill indicator yang meluncur ke tab aktif.
   ========================================================= */
function positionNavIndicator(animate = true) {
  const indicator = document.getElementById('navIndicator');
  const activeBtn = document.querySelector('.nav-btn.active');
  if (!indicator || !activeBtn) return;

  const track = indicator.parentElement;
  if (!track) return;

  const trackRect = track.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const inset = 5; // pill dibuat sedikit lebih ramping dari tombolnya

  if (!animate) indicator.style.transition = 'none';

  indicator.style.width = `${Math.max(btnRect.width - inset * 2, 24)}px`;
  indicator.style.transform = `translateX(${btnRect.left - trackRect.left + inset}px)`;

  if (!animate) {
    void indicator.offsetWidth; // paksa reflow biar langsung snap tanpa animasi
    indicator.style.transition = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  // Jalankan live clock (timestamp real-time)
  startLiveClock();

  // Attach PIN Listeners
  pinInput?.addEventListener('input', checkPinAuto);
  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyPin();
  });

  document.getElementById('btnTogglePin')?.addEventListener('click', togglePinVisibility);

  // Attach Navigation Listeners (navbar App Store style)
  document.querySelectorAll('.nav-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Handler Event Listener untuk Dropdown Placeholder Style (Miring & Pudar)
  initPlaceholderDropdowns();

  // Safe Load Modules
  if (typeof initTransaksi === 'function') initTransaksi();
  if (typeof initDashboard === 'function') initDashboard();

  // Load Optional Modules jika sudah tersedia
  loadOptionalModules();

  // Posisikan indikator navbar begitu layout siap (tanpa animasi awal)
  requestAnimationFrame(() => positionNavIndicator(false));
  setTimeout(() => positionNavIndicator(false), 600);
});

// Reposisi indikator navbar saat layar berubah ukuran / dirotasi
window.addEventListener('load', () => positionNavIndicator(false));
window.addEventListener('resize', () => positionNavIndicator(false));
window.addEventListener('orientationchange', () => {
  setTimeout(() => positionNavIndicator(false), 250);
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

// Tab Switcher Controller (dengan animasi modul + indikator dinamis)
function switchTab(targetTab) {
  const tabs = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];

  tabs.forEach(tab => {
    const view = document.getElementById(`view${capitalize(tab)}`);
    const btn = document.getElementById(`nav${capitalize(tab)}Btn`);

    if (tab === targetTab) {
      if (view) {
        view.classList.remove('hidden');
        // Animasi entrance biar perpindahan modul terasa dinamis
        view.classList.remove('module-anim');
        void view.offsetWidth;
        view.classList.add('module-anim');
      }
      if (btn) btn.classList.add('active');
    } else {
      if (view) view.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  });

  // Geser pill indikator ke tab yang baru aktif
  positionNavIndicator();

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
