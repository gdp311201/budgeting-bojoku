import { GAS_URL } from './transaksi.js';

export function initDashboard() {
  const selBulan = document.getElementById('dashBulan');
  const selTahun = document.getElementById('dashTahun');
  const btnRefresh = document.getElementById('btnRefreshDash');

  if (selBulan) selBulan.addEventListener('change', loadDashboardData);
  if (selTahun) selTahun.addEventListener('change', loadDashboardData);
  if (btnRefresh) btnRefresh.addEventListener('click', loadDashboardData);

  loadDashboardData();
}

export async function loadDashboardData() {
  const bulanEl = document.getElementById('dashBulan');
  const tahunEl = document.getElementById('dashTahun');

  const bulan = bulanEl ? bulanEl.value : "AGUSTUS";
  const tahun = tahunEl ? tahunEl.value : "2026";

  setDashLoadingState(true);

  try {
    const res = await fetch(`${GAS_URL}?action=getDashboardData&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const data = await res.json();

    if (data.status === "success") {
      renderDashboardUI(data);
    } else {
      console.error("Gagal memuat dashboard:", data.message);
    }
  } catch (err) {
    console.error("Error fetching Dashboard Data:", err);
  } finally {
    setDashLoadingState(false);
  }
}

function setDashLoadingState(isLoading) {
  const container = document.getElementById('dashboardContainer');
  if (container) {
    container.style.opacity = isLoading ? "0.5" : "1";
    container.style.pointerEvents = isLoading ? "none" : "auto";
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

function renderDashboardUI(data) {
  const s = data.summary;

  // 1. Update Kas & Bank
  document.getElementById('valTotalAset').innerText = formatRupiah(s.totalAset);
  document.getElementById('valSeabank').innerText = formatRupiah(s.seabank);
  document.getElementById('valBCA').innerText = formatRupiah(s.bca);
  document.getElementById('valMandiri').innerText = formatRupiah(s.mandiri);
  document.getElementById('valDana').innerText = formatRupiah(s.dana);
  document.getElementById('valCash').innerText = formatRupiah(s.cash);

  // 2. Update Category Summaries
  document.getElementById('valCashflow').innerText = formatRupiah(s.cashflow);
  document.getElementById('valPemasukan').innerText = formatRupiah(s.pemasukan);
  document.getElementById('valKebutuhanPokok').innerText = formatRupiah(s.kebutuhanPokok);
  document.getElementById('valTempatTinggal').innerText = formatRupiah(s.tempatTinggal);
  document.getElementById('valTransportasi').innerText = formatRupiah(s.transportasi);
  document.getElementById('valKesehatan').innerText = formatRupiah(s.kesehatan);
  document.getElementById('valPerawatanDiri').innerText = formatRupiah(s.perawatanDiri);
  document.getElementById('valPengembanganDiri').innerText = formatRupiah(s.pengembanganDiri);
  document.getElementById('valGayaHidup').innerText = formatRupiah(s.gayaHidup);
  document.getElementById('valLainLain').innerText = formatRupiah(s.lainLain);

  // 3. Update Reminder Text (Quotes Gajah)
  const remEl = document.getElementById('dashReminderText');
  if (remEl) remEl.innerText = s.reminderText || "Keuangan Aman & Terjaga 👍";

  // 4. Render Table TOP 5 Sub-Kategori
  const topSubContainer = document.getElementById('listTopSubKategori');
  if (topSubContainer) {
    if (data.topSubKategori.length === 0) {
      topSubContainer.innerHTML = `<div class="text-center text-xs text-gray-400 py-4">Belum ada transaksi pengeluaran pada bulan ini ✨</div>`;
    } else {
      topSubContainer.innerHTML = data.topSubKategori.map(item => `
        <div class="flex justify-between items-center text-xs py-1.5 border-b border-gray-100">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-rose-500 w-4">${item.no}</span>
            <span class="font-medium text-gray-700">${item.nama}</span>
          </div>
          <div class="text-right">
            <span class="font-mono font-bold text-gray-800">${formatRupiah(item.nominal)}</span>
            <span class="text-[10px] text-gray-400 ml-1">(${(item.persen * 100).toFixed(0)}%)</span>
          </div>
        </div>
      `).join('');
    }
  }

  // 5. Render Table TOP 5 Kategori
  const topKatContainer = document.getElementById('listTopKategori');
  if (topKatContainer) {
    if (data.topKategori.length === 0) {
      topKatContainer.innerHTML = `<div class="text-center text-xs text-gray-400 py-4">Tidak ada data kategori ✨</div>`;
    } else {
      topKatContainer.innerHTML = data.topKategori.map(item => `
        <div class="flex justify-between items-center text-xs py-1.5 border-b border-gray-100">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-rose-500 w-4">${item.no}</span>
            <span class="font-medium text-gray-700">${item.nama}</span>
          </div>
          <div class="text-right">
            <span class="font-mono font-bold text-gray-800">${formatRupiah(item.nominal)}</span>
            <span class="text-[10px] text-gray-400 ml-1">(${(item.persen * 100).toFixed(0)}%)</span>
          </div>
        </div>
      `).join('');
    }
  }
}
