const CORRECT_PIN = "080798";
const GAS_URL = "https://script.google.com/macros/s/AKfycbxKE6HQJGUPhK8yfcSjRF5LRVbsEhXMn9iuUrZtu-8oT842UohdGdeKtORGhdYBL6Pq8g/exec";

const SUB_DATA = {
  "💸 PINDAH DANA": ["SEABANK", "BCA", "MANDIRI", "DANA", "CASH"],
  "💵 PEMASUKAN": ["Gaji / Salary", "Bonus & Komisi", "Dividen Saham", "Pendapatan Lain-Lain", "Penjualan Aset / Properti", "Hibah / Hadiah Uang", "THR / Tunjangan Tahunan"],
  "🍚 KEBUTUHAN POKOK": ["Makanan", "Minuman", "Snack / Cemilan", "Kebutuhan Rumah Tangga", "Kebutuhan Dapur"],
  "🏠 TEMPAT TINGGAL": ["Sewa / KPR Rumah", "Maintenance Rumah", "Listrik", "Air", "Internet"],
  "🚌 TRANSPORTASI": ["BBM", "Ojek Online", "Transportasi Umum", "Maintenance Kendaraan"],
  "🩺 KESEHATAN": ["Vitamin & Obat", "Asuransi / BPJS", "Periksa ke Dokter"],
  "💇 PERAWATAN DIRI": ["Skincare", "Barbershop / Salon", "Bodycare", "Gym", "IPL", "Pilates", "Treatment"],
  "📚 PENGEMBANGAN DIRI": ["Pendidikan / Pelatihan", "Buku", "Kursus", "Aplikasi Belajar", "Webinar"],
  "💰 TABUNGAN/ INVESTASI": ["Safety Money", "Deposito Bank", "Reksadana", "Arisan", "Logam Mulia", "Saham"],
  "🎉 GAYA HIDUP/ HIBURAN": ["Makan di Luar", "Coffee Shop", "Subs (Nx, Spotify, dll.)", "Liburan / Traveling", "Hobi & Rekreasi", "Cash Out"],
  "💳 HUTANG / CICILAN": ["Pinjaman Modal Usaha", "Cicilan Kredit / Pinjaman", "Sumbangan & Donasi Rutin", "KPR"],
  "⚠️ LAIN-LAIN": ["Admin Bank", "Pengeluaran Tak Terduga", "Bantu Keluarga", "Barang Rusak", "Parkir"]
};

let fpInstance = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pinInput');
  if (pinInput) pinInput.focus();

  fpInstance = flatpickr("#tanggal", {
    dateFormat: "Y-m-d",
    defaultDate: "today",
    allowInput: true,
    clickOpens: true
  });

  // Attach Event Listeners
  document.getElementById('pinInput').addEventListener('input', checkPinAuto);
  document.getElementById('btnTogglePin').addEventListener('click', togglePinVisibility);
  document.getElementById('tabInputBtn').addEventListener('click', () => switchTab('input'));
  document.getElementById('tabDashBtn').addEventListener('click', () => switchTab('dashboard'));
  document.getElementById('kategori').addEventListener('change', handleCategoryChange);
  document.getElementById('nominal').addEventListener('keyup', (e) => formatRupiahInput(e.target));
  document.getElementById('txForm').addEventListener('submit', handleSubmit);
  document.getElementById('modalBtn').addEventListener('click', closeCuteModal);
  document.getElementById('dashBulan').addEventListener('change', onFilterChange);
  document.getElementById('dashTahun').addEventListener('change', onFilterChange);
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
    void pinBox.offsetWidth; // Trigger reflow untuk animasi shake
    pinBox.classList.add('animate-shake');
    pinInput.value = '';
    pinInput.focus();
  }
}

// Tab Switcher
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

function showCuteModal(isSuccess, title, message) {
  const modal = document.getElementById('cuteModal');
  const modalIcon = document.getElementById('modalIcon');
  const modalIconBg = document.getElementById('modalIconBg');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalBtn = document.getElementById('modalBtn');

  if (isSuccess) {
    modalIcon.innerText = "✨";
    modalIconBg.className = "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-pink-100/80 border border-pink-200/80";
    modalTitle.className = "text-sm font-bold text-pink-950 mb-1";
    modalBtn.className = "w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-150 border border-pink-200/60";
  } else {
    modalIcon.innerText = "⚠️";
    modalIconBg.className = "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-rose-100/80 border border-rose-200/80";
    modalTitle.className = "text-sm font-bold text-rose-950 mb-1";
    modalBtn.className = "w-full bg-gradient-to-r from-rose-400 to-red-400 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-150 border border-rose-200/60";
  }

  modalTitle.innerText = title;
  modalMessage.innerText = message;
  modal.classList.remove('hidden');
}

function closeCuteModal() {
  document.getElementById('cuteModal').classList.add('hidden');
}

function formatRupiahInput(el) {
  let value = el.value.replace(/[^0-9]/g, '');
  if (value === '') {
    el.value = '';
    return;
  }
  let formatted = new Intl.NumberFormat('id-ID').format(value);
  el.value = 'Rp ' + formatted;
}

function formatRupiah(val) {
  if (typeof val !== 'number') val = Number(val) || 0;
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
}

function formatCompactRupiah(val) {
  if (typeof val !== 'number') val = Number(val) || 0;
  if (val >= 1000000) {
    return (val / 1000000).toFixed(2) + 'M';
  } else if (val >= 1000) {
    return (val / 1000).toFixed(0) + 'k';
  }
  return val.toString();
}

function formatPercent(val) {
  if (typeof val !== 'number') val = Number(val) || 0;
  return (val * 100).toFixed(0) + '%';
}

function handleCategoryChange() {
  const kat = document.getElementById('kategori').value;
  const subSelect = document.getElementById('subKategori');
  const lblSub = document.getElementById('lblSubKategori');
  const lblAkun = document.getElementById('lblAkun');

  if (kat === "💸 PINDAH DANA") {
    lblSub.innerText = "DARI REKENING (ASAL)";
    lblAkun.innerText = "KE REKENING (TUJUAN)";
  } else {
    lblSub.innerText = "SUB KATEGORI";
    lblAkun.innerText = "AKUN BANK";
  }

  subSelect.innerHTML = '<option value="" disabled selected>-- Pilih Sub Kategori --</option>';
  if (SUB_DATA[kat]) {
    SUB_DATA[kat].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.innerText = sub;
      subSelect.appendChild(opt);
    });
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span>Memproses...</span>';

  const rawNominal = document.getElementById('nominal').value.replace(/[^0-9]/g, '');

  if (!rawNominal || parseInt(rawNominal) <= 0) {
    showCuteModal(false, "Opps!", "Silakan masukkan nominal transaksi yang valid dulu ya!");
    btn.disabled = false;
    btn.innerHTML = '<span>Simpan Transaksi</span>';
    return;
  }

  const payload = {
    kolomA: document.getElementById('tanggal').value,
    kolomB: document.getElementById('kategori').value,
    kolomC: document.getElementById('subKategori').value,
    kolomD: rawNominal,
    kolomE: document.getElementById('akun').value
  };

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    showCuteModal(true, "Berhasil!", "Transaksi kamu berhasil dicatat ke Google Sheets!");
    
    document.getElementById('nominal').value = '';
    document.getElementById('kategori').selectedIndex = 0;
    document.getElementById('subKategori').innerHTML = '<option value="" disabled selected>-- Pilih Kategori Dulu --</option>';
    document.getElementById('akun').selectedIndex = 0;
    
    if (fpInstance) fpInstance.setDate("today");
    handleCategoryChange();

  } catch (err) {
    showCuteModal(false, "Gagal Mencatat!", "Terjadi kesalahan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Simpan Transaksi</span>';
  }
}

async function loadDashboardData() {
  try {
    const response = await fetch(GAS_URL);
    const data = await response.json();
    updateDashboardUI(data);
  } catch (err) {
    console.error("Gagal memuat data dashboard:", err);
  }
}

async function onFilterChange() {
  const selectedBulan = document.getElementById('dashBulan').value;
  const selectedTahun = document.getElementById('dashTahun').value;

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updateFilter',
        bulan: selectedBulan,
        tahun: selectedTahun
      })
    });

    const data = await response.json();
    updateDashboardUI(data);
  } catch (err) {
    console.error("Gagal memperbarui filter dashboard:", err);
  }
}

function updateDashboardUI(data) {
  if (!data) return;

  if (data.selectedFilter) {
    if (data.selectedFilter.bulan) document.getElementById('dashBulan').value = data.selectedFilter.bulan;
    if (data.selectedFilter.tahun) document.getElementById('dashTahun').value = data.selectedFilter.tahun;
  }

  if (data.reminder) {
    document.getElementById('dashReminder').innerText = `"${data.reminder}"`;
  }

  if (data.totalAset !== undefined) {
    document.getElementById('dashTotalAset').innerText = formatRupiah(data.totalAset);
  }

  if (data.bank) {
    document.getElementById('dashSeabank').innerText = formatCompactRupiah(data.bank.seabank);
    document.getElementById('dashBca').innerText = formatCompactRupiah(data.bank.bca);
    document.getElementById('dashMandiri').innerText = formatCompactRupiah(data.bank.mandiri);
    document.getElementById('dashDana').innerText = formatCompactRupiah(data.bank.dana);
    document.getElementById('dashCash').innerText = formatCompactRupiah(data.bank.cash);
  }

  if (data.cashflow) {
    document.getElementById('dashPemasukan').innerText = formatRupiah(data.cashflow.pemasukan || 0);
    document.getElementById('dashPemasukanPct').innerText = formatPercent(data.cashflow.pemasukanPct || 0);
    document.getElementById('dashKebutuhan').innerText = formatRupiah(data.cashflow.kebutuhan || 0);
    document.getElementById('dashKebutuhanPct').innerText = formatPercent(data.cashflow.kebutuhanPct || 0);
  }

  const container = document.getElementById('dashTop5Container');
  if (data.topExpenses && data.topExpenses.length > 0) {
    let html = '';
    data.topExpenses.forEach((item, index) => {
      const pctVal = (item.pct || 0) * 100;
      html += `
        <div>
          <div class="flex justify-between text-[11px] font-semibold text-pink-950 mb-1">
            <span>${index + 1}. ${item.nama}</span>
            <span>${formatRupiah(item.nominal)} (${pctVal.toFixed(0)}%)</span>
          </div>
          <div class="w-full bg-pink-100/80 rounded-full h-2 overflow-hidden border border-pink-200/50">
            <div class="bg-gradient-to-r from-pink-400 to-rose-400 h-2 rounded-full transition-all duration-500" style="width: ${Math.min(pctVal, 100)}%"></div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  } else {
    container.innerHTML = '<p class="text-xs text-center text-pink-800/60 italic py-2">Belum ada transaksi pengeluaran pada bulan ini ✨</p>';
  }
}
