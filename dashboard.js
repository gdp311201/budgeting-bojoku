import { GAS_URL } from './transaksi.js';

export function initDashboard() {
  const selBulan = document.getElementById('dashBulan');
  const selTahun = document.getElementById('dashTahun');

  if (selBulan) selBulan.addEventListener('change', loadDashboardData);
  if (selTahun) selTahun.addEventListener('change', loadDashboardData);

  // Auto load saat pertama kali diinisialisasi
  loadDashboardData();
}

export async function loadDashboardData() {
  const bulanEl = document.getElementById('dashBulan');
  const tahunEl = document.getElementById('dashTahun');

  const bulan = bulanEl ? bulanEl.value : 'AGUSTUS';
  const tahun = tahunEl ? tahunEl.value : '2026';

  setDashboardLoading(true);

  try {
    const response = await fetch(`${GAS_URL}?action=getDashboard&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const res = await response.json();

    if (res.status === 'success') {
      renderDashboardUI(res);
    } else {
      console.error("Gagal memuat data dashboard:", res.message);
    }
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
  } finally { // <--- SUDAH DIPERBAIKI DARI "font-medium" KE "finally"
    setDashboardLoading(false);
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

function renderDashboardUI(data) {
  // 1. Total Aset
  const totalAsetEl = document.getElementById('dashTotalAset');
  if (totalAsetEl) totalAsetEl.innerText = formatRupiah(data.totalAset);

  // 2. Reminder Elephant
  const reminderEl = document.getElementById('dashReminder');
  if (reminderEl) reminderEl.innerText = data.reminder || '🌸 Finansial Sehat dan Terjaga!';

  // 3. Bank Balances
  if (data.bank) {
    if (document.getElementById('dashSeabank')) document.getElementById('dashSeabank').innerText = formatRupiah(data.bank.seabank);
    if (document.getElementById('dashBca')) document.getElementById('dashBca').innerText = formatRupiah(data.bank.bca);
    if (document.getElementById('dashMandiri')) document.getElementById('dashMandiri').innerText = formatRupiah(data.bank.mandiri);
    if (document.getElementById('dashDana')) document.getElementById('dashDana').innerText = formatRupiah(data.bank.dana);
    if (document.getElementById('dashCash')) document.getElementById('dashCash').innerText = formatRupiah(data.bank.cash);
  }

  // 4. Cashflow (Pemasukan & Kebutuhan Pokok)
  if (data.cashflow) {
    if (document.getElementById('dashPemasukan')) document.getElementById('dashPemasukan').innerText = formatRupiah(data.cashflow.pemasukan);
    if (document.getElementById('dashPemasukanPct')) document.getElementById('dashPemasukanPct').innerText = Math.round((data.cashflow.pemasukanPct || 0) * 100) + '%';
    
    if (document.getElementById('dashKebutuhan')) document.getElementById('dashKebutuhan').innerText = formatRupiah(data.cashflow.kebutuhanPokok);
    if (document.getElementById('dashKebutuhanPct')) document.getElementById('dashKebutuhanPct').innerText = Math.round((data.cashflow.kebutuhanPokokPct || 0) * 100) + '%';
  }

  // 5. Render Top 5 Sub Kategori
  const top5Container = document.getElementById('dashTop5Container');
  if (top5Container) {
    if (data.topSubCategory && data.topSubCategory.length > 0) {
      top5Container.innerHTML = data.topSubCategory.map(item => `
        <div class="flex justify-between items-center border-b border-pink-100/60 pb-1.5 last:border-b-0">
          <div>
            <span class="font-bold text-pink-900/50 text-[11px] mr-1">${item.no}.</span>
            <span class="font-semibold text-pink-950 text-xs">${item.name}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-pink-950 text-xs block">${formatRupiah(item.total)}</span>
            <span class="text-[9px] font-bold text-rose-600 block">(${Math.round((item.percent || 0) * 100)}%)</span>
          </div>
        </div>
      `).join('');
    } else {
      top5Container.innerHTML = `<p class="text-xs text-center text-pink-800/60 py-2">Tidak ada transaksi pada periode ini.</p>`;
    }
  }
}

function setDashboardLoading(isLoading) {
  const container = document.getElementById('viewDashboard');
  if (container) {
    container.style.opacity = isLoading ? "0.6" : "1";
    container.style.pointerEvents = isLoading ? "none" : "auto";
  }
}
