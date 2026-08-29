import { initTransaksi } from './transaksi.js';
import { initDashboard, loadDashboardData } from './dashboard.js';

const CORRECT_PIN = "080798";

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  // Attach System & Nav Listeners
  document.getElementById('pinInput')?.addEventListener('input', checkPinAuto);
  document.getElementById('btnTogglePin')?.addEventListener('click', togglePinVisibility);
  document.getElementById('tabInputBtn')?.addEventListener('click', () => switchTab('input'));
  document.getElementById('tabDashBtn')?.addEventListener('click', () => switchTab('dashboard'));

  // Initialize Modules
  initTransaksi();
  initDashboard();
});

// Toggle Show/Hide PIN
function togglePinVisibility() {
  const pinInput = document.getElementById('pinInput');
  const eyeIcon = document.getElementById('eyeIcon');
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
  if (pinInput.value.length === 6) {
    verifyPin();
  }
}

// Verifikasi PIN
function verifyPin() {
  const pinInput = document.getElementById('pinInput');
  const pinBox = document.getElementById('pinBox');
  const pinError = document.getElementById('pinError');
  const lockScreen = document.getElementById('lockScreen');

  if (pinInput.value === CORRECT_PIN) {
    pinError.classList.add('hidden');
    lockScreen.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => lockScreen.remove(), 700);
  } else {
    pinError.classList.remove('hidden');
    pinBox.classList.remove('animate-shake');
    void pinBox.offsetWidth; // Trigger reflow animasi shake
    pinBox.classList.add('animate-shake');
    pinInput.value = '';
    pinInput.focus();
  }
}

// Tab Switcher Controller
function switchTab(tab) {
  const inputView = document.getElementById('viewInput');
  const dashView = document.getElementById('viewDashboard');
  const inputBtn = document.getElementById('tabInputBtn');
  const dashBtn = document.getElementById('tabDashBtn');

  if (tab === 'input') {
    inputView.classList.remove('hidden');
    dashView.classList.add('hidden');
    inputBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 bg-white text-pink-950 shadow-sm";
    dashBtn.className = "py-2 px-3 rounded-xl text-xs font-semibold text-pink-800/80 hover:text-pink-950 transition-all duration-200";
  } else {
    inputView.classList.add('hidden');
    dashView.classList.remove('hidden');
    dashBtn.className = "py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 bg-white text-pink-950 shadow-sm";
    inputBtn.className = "py-2 px-3 rounded-xl text-xs font-semibold text-pink-800/80 hover:text-pink-950 transition-all duration-200";
    
    loadDashboardData();
  }
}
