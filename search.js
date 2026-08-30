/**
 * =========================================================================
 * search.js — MODUL PENCARIAN TRANSACTION HISTORY
 * =========================================================================
 * Menangani komunikasi AJAX dari web ke Router Apps Script (01_PenerimaanDataFormUI)
 * =========================================================================
 */

// Ganti URL ini dengan Apps Script Web App Deployment URL Anda
const GAS_SEARCH_URL = "https://script.google.com/macros/s/AKfycbyvMao5Rq59c5qG5UuA1VfYN8ifTZGJYHDdoT_OqQASMWhkAgLJsKdGbCa79ygUOZtj1g/exec";

document.addEventListener("DOMContentLoaded", () => {
  initSearchModule();
});

export function initSearchModule() {
  const btnRefreshSearch = document.getElementById("btnRefreshSearch");
  const searchKeyword = document.getElementById("searchKeyword");
  const searchBulan = document.getElementById("searchBulan");
  const searchTahun = document.getElementById("searchTahun");
  const searchSort = document.getElementById("searchSort");

  // Event Listener: Klik Refresh
  if (btnRefreshSearch) {
    btnRefreshSearch.addEventListener("click", () => {
      fetchAndRenderSearchData();
    });
  }

  // Event Listener: Realtime Input Keyword (Debounce 400ms)
  let debounceTimer;
  if (searchKeyword) {
    searchKeyword.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAndRenderSearchData();
      }, 400);
    });
  }

  if (searchBulan) searchBulan.addEventListener("change", fetchAndRenderSearchData);
  if (searchTahun) searchTahun.addEventListener("change", fetchAndRenderSearchData);
  if (searchSort) searchSort.addEventListener("change", fetchAndRenderSearchData);

  // Auto Load pertama kali saat halaman dibuka
  fetchAndRenderSearchData();
}

/**
 * Mengambil data dari Web App Router
 */
export async function fetchAndRenderSearchData() {
  const searchListContainer = document.getElementById("searchListContainer");
  const searchTotalCount = document.getElementById("searchTotalCount");
  const searchTotalNominal = document.getElementById("searchTotalNominal");

  const bulan = document.getElementById("searchBulan")?.value || "ALL";
  const tahun = document.getElementById("searchTahun")?.value || "2026";
  const keyword = document.getElementById("searchKeyword")?.value || "";
  const sort = document.getElementById("searchSort")?.value || "DESC";

  if (searchListContainer) {
    searchListContainer.innerHTML = `
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mb-2"></div>
        <p class="text-xs text-pink-800/60 font-medium">Memuat data pencarian...</p>
      </div>
    `;
  }

  try {
    const url = new URL(GAS_SEARCH_URL);
    // Mengirim action=getSearchData agar ditangkap oleh handleRouter di 01_PenerimaanDataFormUI.gs
    url.searchParams.append("action", "getSearchData");
    url.searchParams.append("bulan", bulan);
    url.searchParams.append("tahun", tahun);
    url.searchParams.append("keyword", keyword);
    url.searchParams.append("sort", sort);

    const response = await fetch(url.toString(), { method: "GET" });
    const res = await response.json();

    if (res.status === "success") {
      renderSearchResults(res);
    } else {
      if (searchListContainer) {
        searchListContainer.innerHTML = `
          <p class="text-center text-xs text-rose-600 py-6 font-semibold">
            ⚠️ Gagal memuat: ${res.message || "Terjadi kesalahan"}
          </p>
        `;
      }
    }
  } catch (error) {
    console.error("Fetch Search Error:", error);
    if (searchListContainer) {
      searchListContainer.innerHTML = `
        <p class="text-center text-xs text-rose-600 py-6 font-semibold">
          ❌ Koneksi Terputus / Script URL Belum Sesuai
        </p>
      `;
    }
  }
}

/**
 * Merender daftar item ke dalam HTML UI
 */
function renderSearchResults(data) {
  const searchListContainer = document.getElementById("searchListContainer");
  const searchTotalCount = document.getElementById("searchTotalCount");
  const searchTotalNominal = document.getElementById("searchTotalNominal");

  const transactions = data.transactions || [];

  // 1. Update Ringkasan Stat
  if (searchTotalCount) {
    searchTotalCount.innerText = `${data.totalCount || 0} Transaksi`;
  }
  if (searchTotalNominal) {
    const formatRp = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(data.totalNominal || 0);
    searchTotalNominal.innerText = formatRp;
  }

  // 2. Jika Tidak Ada Data Ditemukan
  if (transactions.length === 0) {
    if (searchListContainer) {
      searchListContainer.innerHTML = `
        <div class="text-center py-8">
          <span class="text-2xl block mb-1">🔍</span>
          <p class="text-xs font-semibold text-pink-900/70">Tidak Ada Transaksi Ditemukan</p>
          <p class="text-[10px] text-pink-800/50 mt-0.5">Coba ubah kata kunci atau filter Bulan/Tahun</p>
        </div>
      `;
    }
    return;
  }

  // 3. Render Daftar Transaksi
  let html = "";
  transactions.forEach((tx) => {
    const isIncome = tx.kategori.includes("PEMASUKAN");
    const isPindah = tx.kategori.includes("PINDAH DANA");
    
    let badgeColor = "bg-rose-100 text-rose-800 border-rose-200/80";
    let sign = "-";

    if (isIncome) {
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200/80";
      sign = "+";
    } else if (isPindah) {
      badgeColor = "bg-blue-100 text-blue-800 border-blue-200/80";
      sign = "⇄";
    }

    const nominalFormatted = new Intl.NumberFormat("id-ID").format(tx.nominal);

    html += `
      <div class="glass-card p-2.5 rounded-xl border border-white/80 shadow-sm flex items-center justify-between hover:bg-white/90 transition">
        <div class="flex flex-col gap-0.5 max-w-[65%]">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor}">
              ${tx.kategori}
            </span>
            <span class="text-[10px] font-bold text-pink-950/80 truncate">
              ${tx.subKategori}
            </span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-pink-900/60 font-medium">
            <span>📅 ${tx.tgl}</span>
            <span>•</span>
            <span>🏦 ${tx.akun}</span>
          </div>
        </div>

        <div class="text-right">
          <span class="text-xs font-black ${isIncome ? 'text-emerald-700' : isPindah ? 'text-blue-700' : 'text-rose-700'} block">
            ${sign} Rp ${nominalFormatted}
          </span>
          <span class="text-[9px] text-pink-800/40 block">Baris #${tx.rowIndex}</span>
        </div>
      </div>
    `;
  });

  if (searchListContainer) {
    searchListContainer.innerHTML = html;
  }
