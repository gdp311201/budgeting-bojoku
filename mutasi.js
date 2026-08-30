// URL Google Apps Script Web App Terbaru
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx61KJ6afKJ0Sluuz5OS0JRshNX3luCwCM8kItacVzsanqMR9BQakhoC8KqjaQliLbeHw/exec";

export function initMutasi() {
  const mutasiAkun = document.getElementById('mutasiAkun');
  const mutasiBulan = document.getElementById('mutasiBulan');
  const mutasiTahun = document.getElementById('mutasiTahun');

  // Trigger reload data saat dropdown berubah
  mutasiAkun?.addEventListener('change', loadMutasiData);
  mutasiBulan?.addEventListener('change', loadMutasiData);
  mutasiTahun?.addEventListener('change', loadMutasiData);
}

export async function loadMutasiData() {
  const akun = document.getElementById('mutasiAkun')?.value || 'BCA';
  const bulan = document.getElementById('mutasiBulan')?.value || 'AGUSTUS';
  const tahun = document.getElementById('mutasiTahun')?.value || '2026';

  const container = document.getElementById('mutasiListContainer');
  if (container) {
    container.innerHTML = `<p class="text-center text-xs text-pink-800/60 py-6 animate-pulse">Sedang sinkronisasi data mutasi...</p>`;
  }

  try {
    // 1. Panggil via google.script.run jika di dalam lingkungan Apps Script HTML Service
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(renderMutasiUI)
        .withFailureHandler(handleMutasiError)
        .getMutasiBankData(akun, bulan, tahun);
    } else {
      // 2. Fallback via HTTP Fetch jika dipanggil dari Web/GitHub Pages
      const queryParams = new URLSearchParams({
        action: 'getMutasiBankData',
        akun: akun,
        bulan: bulan,
        tahun: tahun
      });

      const response = await fetch(`${SCRIPT_URL}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const resData = await response.json();
      renderMutasiUI(resData);
    }
  } catch (err) {
    handleMutasiError(err);
  }
}

function renderMutasiUI(res) {
  if (!res || (res.status && res.status === 'error')) {
    handleMutasiError(new Error(res?.message || 'Gagal memuat data mutasi.'));
    return;
  }

  // Extract data (kompatibel dengan berbagai format return backend)
  const saldoAwal = res.saldoAwal ?? res.data?.saldoAwal ?? 0;
  const saldoAkhir = res.saldoAkhir ?? res.data?.saldoAkhir ?? 0;
  const summary = res.summary ?? res.data?.summary ?? {
    totalIncome: 0,
    totalExpense: 0,
    totalMutasiIn: 0,
    totalMutasiOut: 0
  };
  const transactions = res.transactions ?? res.data?.transactions ?? [];

  // 1. Render Saldo Awal & Saldo Akhir
  const elSaldoAwal = document.getElementById('mutasiSaldoAwal');
  const elSaldoAkhir = document.getElementById('mutasiSaldoAkhir');
  if (elSaldoAwal) elSaldoAwal.innerText = formatRupiah(saldoAwal);
  if (elSaldoAkhir) elSaldoAkhir.innerText = formatRupiah(saldoAkhir);

  // 2. Render Summary Total
  const elIncome = document.getElementById('sumIncome');
  const elExpense = document.getElementById('sumExpense');
  const elMutasiIn = document.getElementById('sumMutasiIn');
  const elMutasiOut = document.getElementById('sumMutasiOut');

  if (elIncome) elIncome.innerText = formatRupiah(summary.totalIncome);
  if (elExpense) elExpense.innerText = formatRupiah(summary.totalExpense);
  if (elMutasiIn) elMutasiIn.innerText = formatRupiah(summary.totalMutasiIn);
  if (elMutasiOut) elMutasiOut.innerText = formatRupiah(summary.totalMutasiOut);

  // 3. Render Daftar Transaksi Mutasi
  const container = document.getElementById('mutasiListContainer');
  if (!container) return;

  if (!Array.isArray(transactions) || transactions.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-pink-800/60 py-6 font-medium">Tidak ada mutasi transaksi pada periode ini.</p>`;
    return;
  }

  let html = '';
  transactions.forEach(item => {
    let nominalText = '';
    let nominalClass = '';

    // Penentuan Kategori Nominal & Warna (Mengandalkan nilai positif dari backend)
    if (item.income) {
      nominalText = `+${formatRupiah(item.income)}`;
      nominalClass = 'text-emerald-600 font-bold';
    } else if (item.expense) {
      nominalText = `-${formatRupiah(item.expense)}`;
      nominalClass = 'text-rose-600 font-bold';
    } else if (item.mutasiIn) {
      nominalText = `+${formatRupiah(item.mutasiIn)}`;
      nominalClass = 'text-blue-600 font-bold';
    } else if (item.mutasiOut) {
      nominalText = `-${formatRupiah(item.mutasiOut)}`;
      nominalClass = 'text-purple-600 font-bold';
    } else {
      nominalText = formatRupiah(0);
      nominalClass = 'text-pink-950 font-bold';
    }

    // Format Tanggal & Kategori Display
    const tglDisplay = item.tgl || item.tanggal || '-';
    const katDisplay = item.kategori || 'TRANSAKSI';
    const subKatDisplay = item.subKategori || item.keterangan || 'Tanpa Sub Kategori';

    // Pengaplikasian Flexbox mutasi-header-row dan mutasi-badge agar Kategori Sejajar Kanan Tanggal
    html += `
      <div class="p-2.5 bg-white/60 rounded-xl border border-pink-100/80 hover:bg-white/80 transition-all shadow-sm flex flex-col gap-1">
        <div class="mutasi-header-row">
          <span class="mutasi-date text-[10px] text-pink-900/60 font-semibold">${tglDisplay}</span>
          <span class="mutasi-badge text-[9px] bg-pink-100/80 text-pink-800 px-2 py-0.5 rounded-full font-medium border border-pink-200/50">${katDisplay}</span>
        </div>
        <div class="flex items-center justify-between mt-0.5">
          <p class="text-xs font-bold text-pink-950 truncate max-w-[60%]">${subKatDisplay}</p>
          <div class="text-right">
            <span class="text-xs ${nominalClass}">${nominalText}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function handleMutasiError(err) {
  console.error("Mutasi Error:", err);
  const container = document.getElementById('mutasiListContainer');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-6 px-2">
        <p class="text-xs font-bold text-rose-700 mb-1">❌ Gagal Memuat Data Mutasi</p>
        <p class="text-[10px] text-pink-800/60">${err?.message || 'Pastikan koneksi internet stabil & Apps Script telah dideploy.'}</p>
      </div>
    `;
  }
}

function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return "Rp 0";
  const num = Number(val);
  const formatted = Math.abs(num).toLocaleString('id-ID');
  return num < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}
