import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';
import { initMutasi, loadMutasiData } from './mutasi.js';
import { initReceipt } from './receipt.js';
import { initSearch } from './search.js';

const CORRECT_PIN = "080798";

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  // Attach PIN Listeners
  document.getElementById('pinInput')?.addEventListener('input', checkPinAuto);
  document.getElementById('btnTogglePin')?.addEventListener('click', togglePinVisibility);

  // Attach Navigation Listeners (5 Navigation Tabs)
  document.getElementById('navInputBtn')?.addEventListener('click', () => switchTab('input'));
  document.getElementById('navMutasiBtn')?.addEventListener('click', () => switchTab('mutasi'));
  document.getElementById('navDashBtn')?.addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('navReceiptBtn')?.addEventListener('click', () => switchTab('receipt'));
  document.getElementById('navSearchBtn')?.addEventListener('click', () => switchTab('search'));

  // Initialize All App Modules
  initTransaksi();
  initDashboard();
  initMutasi();
  initReceipt();
  initSearch();
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

// Tab Switcher Controller (5 Tab Views & Dynamic Active States)
function switchTab(targetTab) {
  const tabs = ['input', 'mutasi', 'dashboard', 'receipt', 'search'];

  tabs.forEach(tab => {
    const view = document.getElementById(`view${capitalize(tab)}`);
    const btn = document.getElementById(`nav${capitalize(tab)}Btn`);

    if (tab === targetTab) {
      // Tampilkan view aktif
      if (view) view.classList.remove('hidden');
      if (btn) btn.classList.add('active');
    } else {
      // Sembunyikan view non-aktif
      if (view) view.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  });

  // Dynamic Trigger ketika Tab Berpindah
  if (targetTab === 'dashboard') {
    loadDashboardData();
  } else if (targetTab === 'mutasi') {
    loadMutasiData();
  }
}

// Helper Function Kapitalisasi String (e.g. input -> Input)
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
