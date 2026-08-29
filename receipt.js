import { GAS_URL } from './transaksi.js';

export function initReceipt() {
  const btnRefresh = document.getElementById('btnRefreshReceipt');
  const btnPrint = document.getElementById('btnPrintReceipt');
  const selBulan = document.getElementById('receiptBulan');
  const selTahun = document.getElementById('receiptTahun');

  if (btnRefresh) btnRefresh.addEventListener('click', loadEReceiptData);
  if (btnPrint) btnPrint.addEventListener('click', downloadReceiptAsImage);
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
      <div class="mt-4 mb-2 border-b border-dashed border-gray-400/50 pb-1">
        <span class="text-[11px] font-black tracking-wider uppercase ${textClass}">${label}</span>
      </div>
    `;
    items.forEach(item => {
      html += `
        <div class="flex justify-between items-start text-xs py-1.5 border-b border-gray-100/60">
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
      <div class="text-[10px] font-bold text-gray-400 tracking-widest uppercase">OFFICIAL FINANCIAL STATEMENT</div>
      <div class="mt-2 inline-block bg-rose-50 text-rose-600 px-3 py-0.5 rounded-full text-[11px] font-bold border border-rose-200">
        PERIODE: ${data.bulan} ${data.tahun}
      </div>
    </div>

    <!-- SALDO BANK & TOTAL ASET -->
    <div class="bg-amber-100/40 p-2.5 rounded-lg border border-amber-200/60 mb-3 space-y-1.5 text-xs">
      <div class="flex justify-between items-center">
        <span class="text-gray-600 font-medium">🏛️ SALDO BANK & CASH</span>
        <span class="font-mono font-bold ${saldoBank < 0 ? 'text-rose-600' : 'text-gray-800'}">${formatRupiah(saldoBank)}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600 font-medium">📊 TOTAL ASET</span>
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
    <div class="my-3 p-2.5 bg-amber-100/70 border border-amber-300/80 rounded-lg text-center">
      <div class="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">SISA CASHFLOW (NET)</div>
      <div class="text-base font-black font-mono ${netBalance < 0 ? 'text-rose-600' : 'text-emerald-700'} mt-0.5">
        ${formatRupiah(netBalance)}
      </div>
    </div>

    <!-- RINCIAN TABEL BERKATEGORI -->
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

/**
 * FUNGSI DOWNLOAD STRUK DALAM BENTUK GAMBAR (AMAN DI HP & LAPTOP)
 */
async function downloadReceiptAsImage() {
  const receiptPaper = document.getElementById('receiptPaper');
  const btnPrint = document.getElementById('btnPrintReceipt');

  if (!receiptPaper) return;
  if (typeof html2canvas === 'undefined') {
    alert("Library html2canvas belum dimuat! Pastikan CDN sudah dipasang di index.html");
    return;
  }

  const originalBtnText = btnPrint ? btnPrint.innerHTML : '';
  if (btnPrint) {
    btnPrint.disabled = true;
    btnPrint.innerHTML = '⏳ Memproses Gambar...';
  }

  try {
    const bulanEl = document.getElementById('receiptBulan');
    const tahunEl = document.getElementById('receiptTahun');
    const bulan = bulanEl ? bulanEl.value : 'E-Receipt';
    const tahun = tahunEl ? tahunEl.value : '2026';
    const fileName = `E-Receipt_${bulan}_${tahun}.png`;

    const originalMaxHeight = receiptPaper.style.maxHeight;
    const originalOverflow = receiptPaper.style.overflowY;

    receiptPaper.style.maxHeight = 'none';
    receiptPaper.style.overflowY = 'visible';

    // Menggunakan scale 1.5 agar memori HP tidak crash saat merender struk panjang
    const canvas = await html2canvas(receiptPaper, {
      scale: 1.5, 
      useCORS: true,
      backgroundColor: '#FEF9E7',
      logging: false
    });

    receiptPaper.style.maxHeight = originalMaxHeight;
    receiptPaper.style.overflowY = originalOverflow;

    const imageURI = canvas.toDataURL('image/png');

    // Deteksi perangkat mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // Coba gunakan Web Share API jika didukung perangkat
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(imageURI)).blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: fileName,
              text: 'E-Receipt Keuangan Bulanan'
            });
            return;
          }
        } catch (shareErr) {
          console.log("Web share dibatalkan/tidak diizinkan, membuka tab baru.");
        }
      }

      // Fallback Mobile: Buka di jendela baru agar user bisa long-press -> simpan gambar
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>${fileName}</title></head>
            <body style="margin:0;background:#333;text-align:center;padding:20px;">
              <p style="color:#fff;font-family:sans-serif;font-size:14px;margin-bottom:15px;">👉 Tekan lama (long-press) gambar di bawah ini, lalu pilih <b>"Simpan ke Foto"</b></p>
              <img src="${imageURI}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.5);" />
            </body>
          </html>
        `);
      } else {
        alert("Pop-up diblokir browser. Silakan buka lewat browser utama (Chrome/Safari).");
      }

    } else {
      // Untuk Laptop / Desktop
      const link = document.createElement('a');
      link.download = fileName;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

  } catch (err) {
    console.error("Gagal mengunduh gambar:", err);
    alert("Terjadi kesalahan atau memori HP tidak cukup untuk merender struk yang panjang.");
  } finally {
    if (btnPrint) {
      btnPrint.disabled = false;
      btnPrint.innerHTML = originalBtnText;
    }
  }
}
