// URL Google Apps Script Web App Anda
const SCRIPT_URL = "ISI_DENGAN_URL_WEB_APP_APPS_SCRIPT_ANDA";

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
  const akun = document.getElementById('mutasiAkun')?.value || 'SEABANK';
  const bulan = document.getElementById('mutasiBulan')?.value || 'AGUSTUS';
  const tahun = document.getElementById('mutasiTahun')?.value || '2026';

  const container = document.getElementById('mutasiListContainer');
  if (container) {
    container.innerHTML = `<p class="text-center text-xs text-gray-400 py-6 animate-pulse">Sedang sinkronisasi data mutasi...</p>`;
  }

  try {
    // Panggil fungsi Apps Script
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(renderMutasiUI)
        .withFailureHandler(handleMutasiError)
        .getMutasiBankData(akun, bulan, tahun);
    } else {
      // Fallback HTTP Fetch jika menggunakan deployment URL terpisah
      const response = await fetch(`${SCRIPT_URL}?action=getMutasiData&akun=${akun}&bulan=${bulan}&tahun=${tahun}`);
      const resData = await response.json();
      renderMutasiUI(resData);
    }
  } catch (err) {
    handleMutasiError(err);
  }
}

function renderMutasiUI(res) {
  if (!res || res.status !== 'success') {
    handleMutasiError(res?.message || 'Gagal memuat data.');
    return;
  }

  // 1. Render Saldo Awal & Saldo Akhir
  document.getElementById('mutasiSaldoAwal').innerText = formatRupiah(res.saldoAwal);
  document.getElementById('mutasiSaldoAkhir').innerText = formatRupiah(res.saldoAkhir);

  // 2. Render Summary Total
  document.getElementById('sumIncome').innerText = formatRupiah(res.summary.totalIncome);
  document.getElementById('sumExpense').innerText = formatRupiah(res.summary.totalExpense);
  document.getElementById('sumMutasiIn').innerText = formatRupiah(res.summary.totalMutasiIn);
  document.getElementById('sumMutasiOut').innerText = formatRupiah(res.summary.totalMutasiOut);

  // 3. Render Daftar Transaksi
  const container = document.getElementById('mutasiListContainer');
  if (!container) return;

  if (res.transactions.length === 0) {
    container.innerHTML = `<p class="text-center text-xs text-gray-400 py-6">Tidak ada mutasi transaksi pada periode ini.</p>`;
    return;
  }

  let html = '';
  res.transactions.forEach(item => {
    let nominalText = '';
    let nominalClass = '';

    if (item.income !== null) {
      nominalText = `+${formatRupiah(item.income)}`;
      nominalClass = 'text-emerald-600 font-bold';
    } else if (item.expense !== null) {
      nominalText = formatRupiah(item.expense);
      nominalClass = 'text-rose-600 font-bold';
    } else if (item.mutasiIn !== null) {
      nominalText = `+${formatRupiah(item.mutasiIn)}`;
      nominalClass = 'text-blue-600 font-bold';
    } else if (item.mutasiOut !== null) {
      nominalText = formatRupiah(item.mutasiOut);
      nominalClass = 'text-purple-600 font-bold';
    }

    html += `
      <div class="flex items-center justify-between p-2.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-gray-100/50 transition-all">
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-gray-400 font-medium">${item.tgl}</span>
            <span class="text-[10px] bg-gray-200/60 text-gray-600 px-1.5 py-0.2 rounded font-medium">${item.kategori}</span>
          </div>
          <p class="text-xs font-semibold text-gray-800">${item.subKategori}</p>
        </div>
        <div class="text-right">
          <span class="text-xs ${nominalClass}">${nominalText}</span>
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
    container.innerHTML = `<p class="text-center text-xs text-rose-500 py-6">Terjadi kesalahan memuat data mutasi.</p>`;
  }
}

function formatRupiah(val) {
  if (val === null || val === undefined) return "Rp 0";
  const num = Number(val);
  const formatted = Math.abs(num).toLocaleString('id-ID');
  return num < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}
