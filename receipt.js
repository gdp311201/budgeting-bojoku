import { GAS_URL } from './transaksi.js';

export function initReceipt() {
  const btnRefresh = document.getElementById('btnRefreshReceipt');
  const btnPrint = document.getElementById('btnPrintReceipt');
  const selBulan = document.getElementById('receiptBulan');
  const selTahun = document.getElementById('receiptTahun');

  if (btnRefresh) btnRefresh.addEventListener('click', loadEReceiptData);
  if (btnPrint) btnPrint.addEventListener('click', printReceipt);
  if (selBulan) selBulan.addEventListener('change', loadEReceiptData);
  if (selTahun) selTahun.addEventListener('change', loadEReceiptData);

  loadEReceiptData();
}

export async function loadEReceiptData() {
  const bulanEl = document.getElementById('receiptBulan');
  const tahunEl = document.getElementById('receiptTahun');

  const bulan = bulanEl ? bulanEl.value : "AGUSTUS";
  const tahun = tahunEl ? tahunEl.value : "2026";

  setReceiptLoadingState(true);

  try {
    const response = await fetch(`${GAS_URL}?action=getEReceipt&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const resData = await response.json();

    if (resData.status === "success" || resData.result === "success") {
      renderEReceipt(resData);
    } else {
      alert("Gagal memuat data E-Receipt: " + (resData.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Error loading E-Receipt:", err);
  } finally {
    setReceiptLoadingState(false);
  }
}

function setReceiptLoadingState(isLoading) {
  const receiptPaper = document.getElementById('receiptPaper');
  if (isLoading && receiptPaper) {
    receiptPaper.style.opacity = "0.5";
  } else if (receiptPaper) {
    receiptPaper.style.opacity = "1";
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

export function renderEReceipt(data) {
  const receiptPaper = document.getElementById('receiptPaper');
  if (!receiptPaper) return;

  const summary = data.summary || {};
  const details = data.details || { income: [], investment: [], outcome: [] };
  const title = data.title || "🖤 ELSA'S MONTHLY CASHFLOW RECEIPT 🖤";

  const saldoBank = summary.saldoBank || 0;
  const totalAset = summary.totalAset || 0;
  const totalIncome = summary.totalIncome || 0;
  const totalOutcome = summary.totalOutcome || 0;
  const totalSaving = summary.totalSaving || 0;

  // Hitung Sisa Cashflow (Net) = Income - Outcome - Saving
  const netBalance = totalIncome - totalOutcome - totalSaving;

  // Helper untuk Render Item Baris
  const renderGroup = (label, items, textClass) => {
    if (!items || items.length === 0) return '';
    let html = `
      <div class="mt-4 mb-1 border-b border-dashed border-gray-300 pb-1">
        <span class="text-[11px] font-black tracking-wider uppercase ${textClass}">${label}</span>
      </div>
    `;
    items.forEach(item => {
      html += `
        <div class="flex justify-between items-start text-xs py-1 hover:bg-gray-50 rounded px-1">
          <div class="pr-2">
            <div class="font-bold text-gray-800">${item.kategori}</div>
            <div class="text-[10px] text-gray-500">${item.subKategori}</div>
          </div>
          <div class="font-mono font-semibold text-gray-700 whitespace-nowrap">
            ${formatRupiah(item.nominal)}
          </div>
        </div>
      `;
    });
    return html;
  };

  receiptPaper.innerHTML = `
    <!-- HEADER TITLE -->
    <div class="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
      <div class="text-xs font-black tracking-wide text-rose-500 uppercase mb-1">${title}</div>
      <div class="text-[11px] font-bold text-gray-400 tracking-widest uppercase">OFFICIAL FINANCIAL STATEMENT</div>
      <div class="mt-2 inline-block bg-rose-50 text-rose-600 px-3 py-0.5 rounded-full text-[11px] font-bold border border-rose-200">
        PERIODE: ${data.bulan} ${data.tahun}
      </div>
    </div>

    <!-- SALDO BANK & TOTAL ASET -->
    <div class="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3 space-y-1.5 text-xs">
      <div class="flex justify-between items-center">
        <span class="text-gray-500 font-medium">🏛️ SALDO BANK & CASH</span>
        <span class="font-mono font-bold ${saldoBank < 0 ? 'text-rose-600' : 'text-gray-800'}">${formatRupiah(saldoBank)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-500 font-medium">📊 TOTAL ASET</span>
        <span class="font-mono font-bold text-emerald-600">${formatRupiah(totalAset)}</span>
      </div>
    </div>

    <!-- RINGKASAN UTAMA -->
    <div class="space-y-1 text-xs border-b border-dashed border-gray-300 pb-3">
      <div class="flex justify-between items-center text-gray-600">
        <span>TOTAL PEMASUKAN</span>
        <span class="font-mono font-bold text-emerald-600">${formatRupiah(totalIncome)}</span>
      </div>
      <div class="flex justify-between items-center text-gray-600">
        <span>TOTAL PENGELUARAN</span>
        <span class="font-mono font-bold text-rose-600">${formatRupiah(totalOutcome)}</span>
      </div>
      <div class="flex justify-between items-center text-gray-600">
        <span>TABUNGAN / INVESTASI</span>
        <span class="font-mono font-bold text-blue-600">${formatRupiah(totalSaving)}</span>
      </div>
    </div>

    <!-- SISA CASHFLOW (NET) -->
    <div class="my-3 p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg text-center">
      <div class="text-[10px] font-extrabold uppercase text-amber-700 tracking-wider">SISA CASHFLOW (NET)</div>
      <div class="text-base font-black font-mono ${netBalance < 0 ? 'text-rose-600' : 'text-emerald-700'} mt-0.5">
        ${formatRupiah(netBalance)}
      </div>
    </div>

    <!-- RINCIAN TABEL BERKATEGORI (INCOME, INVESTMENT, OUTCOME) -->
    <div class="mt-2">
      ${renderGroup('INCOME', details.income, 'text-emerald-600')}
      ${renderGroup('INVESTMENT', details.investment, 'text-blue-600')}
      ${renderGroup('OUTCOME', details.outcome, 'text-rose-600')}
    </div>

    <!-- FOOTER STAMP -->
    <div class="mt-6 pt-3 border-t-2 border-dashed border-gray-300 text-center text-[10px] text-gray-400 space-y-1">
      <div>*** THANK YOU & KEEP SAVING ***</div>
      <div class="font-mono text-[9px]">Verified System Synergy - Elsa & Julyo</div>
    </div>
  `;
}

// Fungsi Cetak
function printReceipt() {
  const receiptPaper = document.getElementById('receiptPaper');
  if (!receiptPaper) return;

  const printWindow = window.open('', '', 'width=420,height=700');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt - Elsa's Monthly Cashflow</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
        </style>
      </head>
      <body>
        <div class="max-w-xs mx-auto border p-4 rounded-xl shadow-none">
          ${receiptPaper.innerHTML}
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 600);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
