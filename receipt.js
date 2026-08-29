import { GAS_URL } from './transaksi.js';

export function initReceipt() {
  const btnRefresh = document.getElementById('btnRefreshReceipt');
  const btnPrint = document.getElementById('btnPrintReceipt');
  const selBulan = document.getElementById('receiptBulan');
  const selTahun = document.getElementById('receiptTahun');

  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadEReceiptData);
  }

  if (btnPrint) {
    btnPrint.addEventListener('click', printReceipt);
  }

  // Event listener saat ganti bulan / tahun
  if (selBulan) selBulan.addEventListener('change', loadEReceiptData);
  if (selTahun) selTahun.addEventListener('change', loadEReceiptData);

  // Load data awal saat modul pertama kali dibuka
  loadEReceiptData();
}

export async function loadEReceiptData() {
  const bulanEl = document.getElementById('receiptBulan');
  const tahunEl = document.getElementById('receiptTahun');

  const bulan = bulanEl ? bulanEl.value : "AGUSTUS";
  const tahun = tahunEl ? tahunEl.value : "2026";

  // Update Tampilan Periode di Header Struk
  const periodEl = document.getElementById('receiptPeriod');
  if (periodEl) periodEl.innerText = `${bulan} ${tahun}`;

  // Set Loading State
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
  const incomeEl = document.getElementById('receiptIncome');
  const expenseEl = document.getElementById('receiptExpense');
  const savingEl = document.getElementById('receiptSaving');
  const netEl = document.getElementById('receiptNetBalance');

  if (isLoading) {
    if (incomeEl) incomeEl.innerText = "Memuat...";
    if (expenseEl) expenseEl.innerText = "Memuat...";
    if (savingEl) savingEl.innerText = "Memuat...";
    if (netEl) netEl.innerText = "Memuat...";
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

export function renderEReceipt(data) {
  const summary = data.summary || { totalIncome: 0, totalOutcome: 0, totalSaving: 0 };
  const items = data.items || [];

  // Hitung Total Investasi / Tabungan dari items jika tidak disediakan di summary
  let totalSaving = summary.totalSaving || 0;
  if (!totalSaving && items.length > 0) {
    totalSaving = items.reduce((acc, curr) => acc + (curr.investment || 0), 0);
  }

  const incomeEl = document.getElementById('receiptIncome');
  const expenseEl = document.getElementById('receiptExpense');
  const savingEl = document.getElementById('receiptSaving');
  const netEl = document.getElementById('receiptNetBalance');

  if (incomeEl) incomeEl.innerText = formatRupiah(summary.totalIncome);
  if (expenseEl) expenseEl.innerText = formatRupiah(summary.totalOutcome);
  if (savingEl) savingEl.innerText = formatRupiah(totalSaving);

  // Sisa Cashflow (Net) = Pemasukan - Pengeluaran - Tabungan/Investasi
  const netBalance = summary.totalIncome - summary.totalOutcome - totalSaving;
  if (netEl) {
    netEl.innerText = formatRupiah(netBalance);
    if (netBalance < 0) {
      netEl.className = "text-lg font-black text-rose-600 block mt-0.5";
    } else {
      netEl.className = "text-lg font-black text-emerald-700 block mt-0.5";
    }
  }
}

// Fungsi Cetak / Simpan Kuitansi
function printReceipt() {
  const receiptPaper = document.getElementById('receiptPaper');
  if (!receiptPaper) return;

  const printWindow = window.open('', '', 'width=400,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Receipt - Budgeting Master</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: monospace; padding: 20px; background: #fff; }
        </style>
      </head>
      <body>
        <div class="max-w-xs mx-auto border p-4 rounded-xl">
          ${receiptPaper.innerHTML}
        </div>
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
