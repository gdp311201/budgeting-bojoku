import { GAS_URL } from './transaksi.js';

export function initReceipt() {
  const btnFetch = document.getElementById('btnFilterReceipt');
  const selBulan = document.getElementById('receiptBulan');
  const selTahun = document.getElementById('receiptTahun');

  if (btnFetch) {
    btnFetch.addEventListener('click', loadEReceiptData);
  }

  // Event listener saat ganti bulan / tahun
  if (selBulan) selBulan.addEventListener('change', loadEReceiptData);
  if (selTahun) selTahun.addEventListener('change', loadEReceiptData);

  // Load data awal saat modul pertama kali dibuka
  loadEReceiptData();
}

export async function loadEReceiptData() {
  const container = document.getElementById('receiptContainer');
  const bulanEl = document.getElementById('receiptBulan');
  const tahunEl = document.getElementById('receiptTahun');

  const bulan = bulanEl ? bulanEl.value : "AGUSTUS";
  const tahun = tahunEl ? tahunEl.value : "2026";

  if (container) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10 text-pink-400">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mb-2"></div>
        <p class="text-xs font-semibold">Memuat E-Receipt ${bulan} ${tahun}...</p>
      </div>
    `;
  }

  try {
    const response = await fetch(`${GAS_URL}?action=getEReceipt&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const resData = await response.json();

    if (resData.status === "success" || resData.result === "success") {
      renderEReceipt(resData);
    } else {
      if (container) {
        container.innerHTML = `<p class="text-center text-xs text-rose-500 py-4">Gagal memuat data: ${resData.message}</p>`;
      }
    }
  } catch (err) {
    console.error(err);
    if (container) {
      container.innerHTML = `<p class="text-center text-xs text-rose-500 py-4">Terjadi kesalahan koneksi.</p>`;
    }
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

export function renderEReceipt(data) {
  const container = document.getElementById('receiptContainer');
  if (!container) return;

  const summary = data.summary || { saldoBank: 0, totalAset: 0, totalIncome: 0, totalOutcome: 0 };
  const items = data.items || [];

  // Hitung Total Investment dari Items
  const totalInvestment = items.reduce((acc, curr) => acc + (curr.investment || 0), 0);

  let html = `
    <!-- SUMMARY CARDS -->
    <div class="grid grid-cols-2 gap-2 mb-4">
      <div class="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-pink-100 shadow-sm">
        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">🏦 Saldo Bank & Cash</span>
        <span class="text-xs font-bold ${summary.saldoBank < 0 ? 'text-rose-500' : 'text-gray-800'}">${formatRupiah(summary.saldoBank)}</span>
      </div>
      <div class="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-pink-100 shadow-sm">
        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">📊 Total Aset</span>
        <span class="text-xs font-bold text-emerald-600">${formatRupiah(summary.totalAset)}</span>
      </div>
      <div class="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-pink-100 shadow-sm">
        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">📥 Income</span>
        <span class="text-xs font-bold text-blue-600">${formatRupiah(summary.totalIncome)}</span>
      </div>
      <div class="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-pink-100 shadow-sm">
        <span class="text-[10px] uppercase font-bold text-gray-400 block mb-1">📤 Outcome</span>
        <span class="text-xs font-bold text-rose-500">${formatRupiah(summary.totalOutcome)}</span>
      </div>
    </div>

    <!-- DIGITAL RECEIPT CARD -->
    <div class="bg-white rounded-3xl p-4 shadow-md border border-pink-100 relative overflow-hidden">
      <!-- Decorative Receipt Header -->
      <div class="text-center pb-3 mb-3 border-b border-dashed border-gray-200">
        <h3 class="text-xs font-bold uppercase tracking-wider text-pink-950">🧾 Monthly Cashflow Receipt</h3>
        <p class="text-[10px] text-gray-400 mt-0.5">${data.bulan || ''} ${data.tahun || ''}</p>
      </div>

      <!-- ITEM LISTING -->
      <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
  `;

  if (items.length === 0) {
    html += `<p class="text-center text-xs text-gray-400 py-6">Tidak ada transaksi tercatat untuk periode ini.</p>`;
  } else {
    items.forEach((item) => {
      let badgeColor = "bg-gray-100 text-gray-600";
      let nominalText = "";
      let nominalColor = "text-gray-800";

      if (item.income > 0) {
        badgeColor = "bg-blue-50 text-blue-600";
        nominalText = `+ ${formatRupiah(item.income)}`;
        nominalColor = "text-blue-600";
      } else if (item.investment > 0) {
        badgeColor = "bg-purple-50 text-purple-600";
        nominalText = formatRupiah(item.investment);
        nominalColor = "text-purple-600";
      } else {
        badgeColor = "bg-rose-50 text-rose-600";
        nominalText = `- ${formatRupiah(item.outcome)}`;
        nominalColor = "text-rose-500";
      }

      html += `
        <div class="flex items-center justify-between p-2 rounded-xl hover:bg-pink-50/50 transition duration-150">
          <div class="flex flex-col">
            <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">${item.kategori}</span>
            <span class="text-xs font-bold text-gray-800">${item.subKategori}</span>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold ${nominalColor}">${nominalText}</span>
          </div>
        </div>
      `;
    });
  }

  html += `
      </div>

      <!-- RECEIPT FOOTER SUMMARY -->
      <div class="mt-4 pt-3 border-t border-dashed border-gray-200 text-[11px] space-y-1">
        <div class="flex justify-between font-medium text-gray-500">
          <span>Total Investasi</span>
          <span class="text-purple-600 font-bold">${formatRupiah(totalInvestment)}</span>
        </div>
        <div class="flex justify-between font-bold text-gray-800 text-xs pt-1">
          <span>Net Cashflow</span>
          <span class="${(summary.totalIncome - summary.totalOutcome) >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
            ${formatRupiah(summary.totalIncome - summary.totalOutcome)}
          </span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
