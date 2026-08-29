import { GAS_URL } from './transaksi.js';

export function initDashboard() {
  const selBulan = document.getElementById('dashBulan');
  const selTahun = document.getElementById('dashTahun');

  selBulan?.addEventListener('change', loadDashboardData);
  selTahun?.addEventListener('change', loadDashboardData);

  loadDashboardData();
}

export async function loadDashboardData() {
  const bulan = document.getElementById('dashBulan')?.value || "AGUSTUS";
  const tahun = document.getElementById('dashTahun')?.value || "2026";

  try {
    const res = await fetch(`${GAS_URL}?action=getDashboardData&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const data = await res.json();

    if (data.status === "success" || data.result === "success") {
      renderDashboardUI(data);
    } else {
      console.error("Gagal memuat dashboard:", data.message);
    }
  } catch (err) {
    console.error("Error fetching Dashboard Data:", err);
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

function renderDashboardUI(data) {
  const s = data.summary || {};

  const elTotalAset = document.getElementById('dashTotalAset');
  const elSeabank = document.getElementById('dashSeabank');
  const elBca = document.getElementById('dashBca');
  const elMandiri = document.getElementById('dashMandiri');
  const elDana = document.getElementById('dashDana');
  const elCash = document.getElementById('dashCash');

  if (elTotalAset) elTotalAset.innerText = formatRupiah(s.totalAset || 0);
  if (elSeabank) elSeabank.innerText = formatRupiah(s.seabank || 0);
  if (elBca) elBca.innerText = formatRupiah(s.bca || 0);
  if (elMandiri) elMandiri.innerText = formatRupiah(s.mandiri || 0);
  if (elDana) elDana.innerText = formatRupiah(s.dana || 0);
  if (elCash) elCash.innerText = formatRupiah(s.cash || 0);

  const elPemasukan = document.getElementById('dashPemasukan');
  const elKebutuhan = document.getElementById('dashKebutuhan');
  if (elPemasukan) elPemasukan.innerText = formatRupiah(s.pemasukan || 0);
  if (elKebutuhan) elKebutuhan.innerText = formatRupiah(s.kebutuhanPokok || 0);

  const remEl = document.getElementById('dashReminder');
  if (remEl) remEl.innerText = s.reminderText || "Keuangan Aman & Terjaga 🌸";

  const topContainer = document.getElementById('dashTop5Container');
  const listTop = data.topSubKategori || [];
  
  if (topContainer) {
    if (!listTop || listTop.length === 0) {
      topContainer.innerHTML = `<p class="text-xs text-center text-pink-800/60 py-2">Belum ada pengeluaran pada periode ini ✨</p>`;
    } else {
      topContainer.innerHTML = listTop.map((item, idx) => `
        <div class="flex justify-between items-center text-xs py-1 border-b border-pink-100/60 last:border-0">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-rose-500 w-4">${item.no || idx + 1}</span>
            <span class="font-medium text-pink-950">${item.nama}</span>
          </div>
          <div class="text-right font-mono font-bold text-pink-900">
            ${formatRupiah(item.nominal)}
          </div>
        </div>
      `).join('');
    }
  }
}
