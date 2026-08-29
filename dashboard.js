import { GAS_URL } from './transaksi.js';

export function initDashboard() {
  const dashBulan = document.getElementById('dashBulan');
  const dashTahun = document.getElementById('dashTahun');

  if (dashBulan) dashBulan.addEventListener('change', onFilterChange);
  if (dashTahun) dashTahun.addEventListener('change', onFilterChange);
}

export async function loadDashboardData() {
  try {
    const response = await fetch(GAS_URL);
    const data = await response.json();
    updateDashboardUI(data);
  } catch (err) {
    console.error("Gagal memuat data dashboard:", err);
  }
}

export async function onFilterChange() {
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

export function updateDashboardUI(data) {
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

// Helper Formatters
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
