import { initTransaksi } from './transaksi.js';

// PIN Akses Aplikasi
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

  // Attach Navigation Listeners
  document.getElementById('navInputBtn')?.addEventListener('click', () => switchTab('input'));
  document.getElementById('navMutasiBtn')?.addEventListener('click', () => switchTab('mutasi'));
  document.getElementById('navDashBtn')?.addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('navReceiptBtn')?.addEventListener('click', () => switchTab('receipt'));
  document.getElementById('navSearchBtn')?.addEventListener('click', () => switchTab('search'));

  // Safe Load Modules
  if (typeof initTransaksi === 'function') initTransaksi();

  // Load Optional Modules jika sudah tersedia
  loadOptionalModules();
});

// Pemuatan Modul Tambahan Secara Aman
let initMutasi, loadMutasiData, initDashboard, loadDashboardData, initReceipt, initSearch;

async function loadOptionalModules() {
  try {
    const mutasiMod = await import('./mutasi.js').catch(() => null);
    if (mutasiMod && mutasiMod.initMutasi) { 
      initMutasi = mutasiMod.initMutasi; 
      loadMutasiData = mutasiMod.loadMutasiData;
      initMutasi();
    }

    const dashMod = await import('./dashboard.js').catch(() => null);
    if (dashMod && dashMod.initDashboard) {
      initDashboard = dashMod.initDashboard;
      loadDashboardData = dashMod.loadDashboardData;
      initDashboard();
    }

    const receiptMod = await import('./receipt.js').catch(() => null);
    if (receiptMod && receiptMod.initReceipt) { 
      initReceipt = receiptMod.initReceipt;
      initReceipt();
    }

    const searchMod = await import('./search.js').catch(() => null);
    if (searchMod && searchMod.initSearch) { 
      initSearch = searchMod.initSearch;
      initSearch();
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
