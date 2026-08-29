// Import modul (pastikan file-file ini sudah ada di repo GitHub)
import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';

// Opsional: Import modul baru dengan safety check
let initMutasi, loadMutasiData, initReceipt, initSearch;
try {
  const mutasiMod = await import('./mutasi.js').catch(() => null);
  if (mutasiMod) { initMutasi = mutasiMod.initMutasi; loadMutasiData = mutasiMod.loadMutasiData; }
  
  const receiptMod = await import('./receipt.js').catch(() => null);
  if (receiptMod) initReceipt = receiptMod.initReceipt;

  const searchMod = await import('./search.js').catch(() => null);
  if (searchMod) initSearch = searchMod.initSearch;
} catch (e) {
  console.warn("Modul tambahan belum sepenuhnya dimuat:", e);
}

const CORRECT_PIN = "080798";

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  // Attach PIN Listeners
  pinInput?.addEventListener('input', checkPinAuto);
  pinInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyPin();
  });
  
  document.getElementById('btnTogglePin')?.addEventListener('click', togglePinVisibility);

  // Attach Navigation Listeners (Safety with optional chaining)
  document.getElementById('navInputBtn')?.addEventListener('click', () => switchTab('input'));
  document.getElementById('navMutasiBtn')?.addEventListener('click', () => switchTab('mutasi'));
  document.getElementById('navDashBtn')?.addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('navReceiptBtn')?.addEventListener('click', () => switchTab('receipt'));
  document.getElementById('navSearchBtn')?.addEventListener('click', () => switchTab('search'));

  // Initialize Modules safely
  if (typeof initTransaksi === 'function') initTransaksi();
  if (typeof initDashboard === 'function') initDashboard();
  if (typeof initMutasi === 'function') initMutasi();
  if (typeof initReceipt === 'function') initReceipt();
  if (typeof initSearch === 'function') initSearch();
});

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

// Auto check PIN
function checkPinAuto() {
  const pinInput = document.getElementById('pinInput');
  if (pinInput && pinInput.value.length === 6) {
    verifyPin();
  }
}

// Verifikasi PIN
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
      void pinBox.offsetWidth; // Trigger reflow animasi shake
      pinBox.classList.add('animate-shake');
    }
    pinInput.value = '';
    pinInput.focus();
  }
}

// Tab Switcher Controller
function switchTab(targetTab) {
  const tabs = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];

  tabs.forEach(tab => {
    const view = document.getElementById(`view${capitalize(tab)}`);
    const btn = document.getElementById(`nav${capitalize(tab)}Btn`);

    if (tab === targetTab) {
      if (view) view.classList.remove('hidden');
      if (btn) btn.classList.add('active');
    } else {
      if (view) view.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  });

  if (targetTab === 'dashboard' && typeof loadDashboardData === 'function') {
    loadDashboardData();
  } else if (targetTab === 'mutasi' && typeof loadMutasiData === 'function') {
    loadMutasiData();
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
