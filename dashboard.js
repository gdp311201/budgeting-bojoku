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
    } else if (res.data && res.status === undefined) {
      renderDashboardUI(res.data);
    } else {
      console.error("Gagal memuat data dashboard:", res.message);
    }
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
  } finally {
    setDashboardLoading(false);
  }
}

function formatRupiah(num) {
  return 'Rp ' + (Number(num) || 0).toLocaleString('id-ID');
}

function renderDashboardUI(data) {
  if (!data) return;

  // 1. Total Aset Bersih
  const totalAsetEl = document.getElementById('dashTotalAset');
  if (totalAsetEl) totalAsetEl.innerText = formatRupiah(data.totalAset || data.totalAsetBersih);

  // 2. Saldo Kas & Bank
  if (data.bank) {
    if (document.getElementById('dashSeabank')) document.getElementById('dashSeabank').innerText = formatRupiah(data.bank.seabank);
    if (document.getElementById('dashBca')) document.getElementById('dashBca').innerText = formatRupiah(data.bank.bca);
    if (document.getElementById('dashMandiri')) document.getElementById('dashMandiri').innerText = formatRupiah(data.bank.mandiri);
    if (document.getElementById('dashDana')) document.getElementById('dashDana').innerText = formatRupiah(data.bank.dana);
    if (document.getElementById('dashCash')) document.getElementById('dashCash').innerText = formatRupiah(data.bank.cash);
  }

  // 3. Saldo Aset Investasi
  if (data.investment) {
    if (document.getElementById('dashTotalInvStatement')) document.getElementById('dashTotalInvStatement').innerText = formatRupiah(data.investment.total);
    if (document.getElementById('dashInvSafety')) document.getElementById('dashInvSafety').innerText = formatRupiah(data.investment.safetyMoney);
    if (document.getElementById('dashInvDeposito')) document.getElementById('dashInvDeposito').innerText = formatRupiah(data.investment.deposito);
    if (document.getElementById('dashInvReksadana')) document.getElementById('dashInvReksadana').innerText = formatRupiah(data.investment.reksadana);
    if (document.getElementById('dashInvArisan')) document.getElementById('dashInvArisan').innerText = formatRupiah(data.investment.arisan);
    if (document.getElementById('dashInvLogam')) document.getElementById('dashInvLogam').innerText = formatRupiah(data.investment.logamMulia);
    if (document.getElementById('dashInvSaham')) document.getElementById('dashInvSaham').innerText = formatRupiah(data.investment.saham);
  }

  // 4. Cash Flow Ringkasan
  if (data.cashflow) {
    // Pemasukan
    if (data.cashflow.pemasukan) {
      if (document.getElementById('dashPemasukan')) document.getElementById('dashPemasukan').innerText = formatRupiah(data.cashflow.pemasukan.nominal);
      if (document.getElementById('dashPemasukanPct')) document.getElementById('dashPemasukanPct').innerText = Math.round((data.cashflow.pemasukan.pct || data.cashflow.pemasukan.percent || 0) * 100) + '%';
    }

    // Hutang
    if (data.cashflow.hutang) {
      if (document.getElementById('dashHutang')) document.getElementById('dashHutang').innerText = formatRupiah(data.cashflow.hutang.nominal);
      if (document.getElementById('dashHutangPct')) document.getElementById('dashHutangPct').innerText = Math.round((data.cashflow.hutang.pct || data.cashflow.hutang.percent || 0) * 100) + '%';
    }

    // Investasi Bulanan
    if (data.cashflow.investasiBulan) {
      if (document.getElementById('dashInvestasiBulan')) document.getElementById('dashInvestasiBulan').innerText = formatRupiah(data.cashflow.investasiBulan.nominal);
      if (document.getElementById('dashInvestasiBulanPct')) document.getElementById('dashInvestasiBulanPct').innerText = Math.round((data.cashflow.investasiBulan.pct || data.cashflow.investasiBulan.percent || 0) * 100) + '%';
    }

    // Total Biaya
    if (document.getElementById('dashTotalBiaya')) document.getElementById('dashTotalBiaya').innerText = formatRupiah(data.cashflow.totalBiaya);

    // 5. Detail Kategori Biaya
    const b = data.cashflow.biayaDetail;
    if (b) {
      setBiayaItem('dashKebPokok', 'dashKebPokokPct', b.kebutuhanPokok);
      setBiayaItem('dashTempatTinggal', 'dashTempatTinggalPct', b.tempatTinggal);
      setBiayaItem('dashTransportasi', 'dashTransportasiPct', b.transportasi);
      setBiayaItem('dashKesehatan', 'dashKesehatanPct', b.kesehatan);
      setBiayaItem('dashPerawatanDiri', 'dashPerawatanDiriPct', b.perawatanDiri);
      setBiayaItem('dashPengembangan', 'dashPengembanganPct', b.pengembanganDiri);
      setBiayaItem('dashHiburan', 'dashHiburanPct', b.hiburan);
      setBiayaItem('dashLainLain', 'dashLainLainPct', b.lainLain);
    }
  }

  // 6. Top 5 Pengeluaran Sub-Kategori
  renderTop5Expenses(data.top5Expenses);
}

function setBiayaItem(nomId, pctId, objData) {
  if (!objData) return;
  const nomEl = document.getElementById(nomId);
  const pctEl = document.getElementById(pctId);

  if (nomEl) nomEl.innerText = formatRupiah(objData.nominal);
  if (pctEl) pctEl.innerText = Math.round((objData.pct || objData.percent || 0) * 100) + '%';
}

function renderTop5Expenses(items) {
  const container = document.getElementById('dashTop5Container');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<p class="text-xs text-center text-pink-800/60">Tidak ada pengeluaran di bulan ini.</p>`;
    return;
  }

  let html = '';
  items.forEach((item, idx) => {
    html += `
      <div class="flex items-center justify-between border-b border-pink-200/40 pb-1.5 last:border-0 last:pb-0">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full bg-pink-200/80 text-pink-900 text-[10px] font-bold flex items-center justify-center">${idx + 1}</span>
          <span class="text-xs font-semibold text-pink-950">${item.subKategori}</span>
        </div>
        <span class="text-xs font-bold text-pink-950">${formatRupiah(item.nominal)}</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function setDashboardLoading(isLoading) {
  const container = document.getElementById('viewDashboard');
  if (container) {
    container.style.opacity = isLoading ? "0.6" : "1";
    container.style.pointerEvents = isLoading ? "none" : "auto";
  }
}
