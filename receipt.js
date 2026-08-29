import { GAS_URL } from './transaksi.js';

export function initReceipt() {
  const btnRefresh = document.getElementById('btnRefreshReceipt');
  const btnPrint = document.getElementById('btnPrintReceipt');
  const selBulan = document.getElementById('receiptBulan');
  const selTahun = document.getElementById('receiptTahun');

  btnRefresh?.addEventListener('click', loadEReceiptData);
  btnPrint?.addEventListener('click', downloadReceiptAsImage);
  selBulan?.addEventListener('change', loadEReceiptData);
  selTahun?.addEventListener('change', loadEReceiptData);

  loadEReceiptData();
}

export async function loadEReceiptData() {
  const bulan = document.getElementById('receiptBulan')?.value || "AGUSTUS";
  const tahun = document.getElementById('receiptTahun')?.value || "2026";

  setReceiptLoadingState(true);

  try {
    const response = await fetch(`${GAS_URL}?action=getEReceipt&bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`);
    const resData = await response.json();

    if (resData.status === "success" || resData.result === "success") {
      renderEReceipt(resData, bulan, tahun);
    } else {
      console.error("Gagal memuat E-Receipt:", resData.message);
    }
  } catch (err) {
    console.error("Error loading E-Receipt:", err);
  } finally {
    setReceiptLoadingState(false);
  }
}

function setReceiptLoadingState(isLoading) {
  const receiptPaper = document.getElementById('receiptPaper');
  if (receiptPaper) receiptPaper.style.opacity = isLoading ? "0.5" : "1";
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

export function renderEReceipt(data, bulan, tahun) {
  const summary = data.summary || {};

  const totalIncome = summary.totalIncome || 0;
  const totalExpense = summary.totalOutcome || summary.totalExpense || 0;
  const totalSaving = summary.totalSaving || 0;
  const netBalance = summary.netBalance ?? (totalIncome - totalExpense - totalSaving);

  const elPeriod = document.getElementById('receiptPeriod');
  const elIncome = document.getElementById('receiptIncome');
  const elExpense = document.getElementById('receiptExpense');
  const elSaving = document.getElementById('receiptSaving');
  const elNet = document.getElementById('receiptNetBalance');

  if (elPeriod) elPeriod.innerText = `${bulan} ${tahun}`;
  if (elIncome) elIncome.innerText = formatRupiah(totalIncome);
  if (elExpense) elExpense.innerText = formatRupiah(totalExpense);
  if (elSaving) elSaving.innerText = formatRupiah(totalSaving);
  if (elNet) elNet.innerText = formatRupiah(netBalance);
}

async function downloadReceiptAsImage() {
  const receiptPaper = document.getElementById('receiptPaper');
  const btnPrint = document.getElementById('btnPrintReceipt');

  if (!receiptPaper || typeof html2canvas === 'undefined') return;

  const originalText = btnPrint ? btnPrint.innerHTML : '';
  if (btnPrint) {
    btnPrint.disabled = true;
    btnPrint.innerHTML = '⌛ Memproses...';
  }

  try {
    const bulan = document.getElementById('receiptBulan')?.value || 'E-Receipt';
    const tahun = document.getElementById('receiptTahun')?.value || '2026';

    const canvas = await html2canvas(receiptPaper, { scale: 2, useCORS: true, backgroundColor: null });
    const link = document.createElement('a');
    link.download = `E-Receipt_${bulan}_${tahun}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Gagal mengunduh gambar:", err);
  } finally {
    if (btnPrint) {
      btnPrint.disabled = false;
      btnPrint.innerHTML = originalText;
    }
  }
}
