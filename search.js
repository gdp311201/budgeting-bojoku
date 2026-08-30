/**
 * =========================================================================
 * search.js — MODUL PENCARIAN TRANSACTION HISTORY
 * =========================================================================
 * CATATAN PENTING:
 * File ini di-load lewat dynamic import dari script.js, artinya dia
 * dieksekusi SETELAH event DOMContentLoaded selesai. Makanya listener
 * "DOMContentLoaded" versi lama itu DEAD CODE (gak pernah jalan).
 * Init sekarang dipanggil langsung oleh script.js -> initSearchModule()
 * =========================================================================
 */

const GAS_SEARCH_URL = "https://script.google.com/macros/s/AKfycbwsK7ROvO1TE4EFZVZ9TWiWYPeVzyYc6YwG5qxMWtfqQM2GkeA3iR7e6Ni894q3D2F2Vg/exec";

let searchModuleReady = false;

export function initSearchModule() {
  // Guard: cegah inisialisasi ganda
  if (searchModuleReady) return;
  searchModuleReady = true;

  const btnRefreshSearch = document.getElementById("btnRefreshSearch");
  const searchKeyword = document.getElementById("searchKeyword");
  const searchBulan = document.getElementById("searchBulan");
  const searchTahun = document.getElementById("searchTahun");
  const searchSort = document.getElementById("searchSort");

  if (btnRefreshSearch) {
    btnRefreshSearch.addEventListener("click", () => fetchAndRenderSearchData());
  }

  // Debounce 400ms biar gak spam server tiap ketik huruf
  let debounceTimer;
  if (searchKeyword) {
    searchKeyword.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fetchAndRenderSearchData(), 400);
    });

    // Enter = langsung cari tanpa nunggu debounce
    searchKeyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(debounceTimer);
        fetchAndRenderSearchData();
      }
    });
  }

  if (searchBulan) searchBulan.addEventListener("change", fetchAndRenderSearchData);
  if (searchTahun) searchTahun.addEventListener("change", fetchAndRenderSearchData);
  if (searchSort) searchSort.addEventListener("change", fetchAndRenderSearchData);

  fetchAndRenderSearchData();
}

export async function fetchAndRenderSearchData() {
  const searchListContainer = document.getElementById("searchListContainer");

  const bulan = document.getElementById("searchBulan")?.value || "ALL";
  const tahun = document.getElementById("searchTahun")?.value || "2026";
  const keyword = (document.getElementById("searchKeyword")?.value || "").trim();
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
    url.searchParams.append("action", "getSearchData");
    url.searchParams.append("bulan", bulan);
    url.searchParams.append("tahun", tahun);
    url.searchParams.append("keyword", keyword);
    url.searchParams.append("sort", sort);
    url.searchParams.append("_ts", Date.now()); // anti-cache

    const response = await fetch(url.toString(), { method: "GET", redirect: "follow" });

    // Bedakan: response BUKAN JSON (mis. HTML login page / deployment salah)
    let res;
    try {
      res = await response.json();
    } catch (jsonErr) {
      console.error("[SEARCH] Response bukan JSON. HTTP Status:", response.status, jsonErr);
      renderSearchError(
        "⚠️ Server menjawab bukan JSON.<br>" +
        "Kemungkinan: deployment Apps Script belum di-update " +
        "(buat <b>New Version</b> dulu),<br>atau akses deployment bukan \"Anyone\"."
      );
      return;
    }

    console.log("[SEARCH] Response Apps Script:", res);

    const isSuccess = res && (res.status === "success" || res.result === "success");

    if (isSuccess) {
      renderSearchResults(normalizeResponse(res), keyword);
    } else {
      renderSearchError(
        "⚠️ Gagal memuat: " + escapeHtml(res?.message || res?.error || "Terjadi kesalahan di server")
      );
    }
  } catch (error) {
    console.error("Fetch Search Error:", error);
    renderSearchError("❌ Koneksi Terputus / URL Apps Script Belum Sesuai");
  }
}

/* ================= HELPER NORMALISASI RESPONSE ================= */

function normalizeResponse(res) {
  // Backend bisa balasin { status, transactions } atau { status, data: { transactions } }
  let d = res;
  if (res && res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
    d = res.data;
  }

  let raw = d.transactions || d.results || d.items;
  if (!raw && res && Array.isArray(res.data)) raw = res.data;
  if (!Array.isArray(raw)) raw = [];

  const transactions = raw.map(normalizeTransaction);

  return {
    transactions: transactions,
    totalCount: Number(d.totalCount ?? d.total ?? transactions.length) || transactions.length,
    // Total nominal dihitung ulang di frontend biar selalu akurat
    totalNominal: transactions.reduce((sum, t) => sum + t.nominal, 0)
  };
}

function normalizeTransaction(tx) {
  return {
    tgl: tx.tgl || tx.tanggal || tx.date || "-",
    kategori: tx.kategori || tx.category || "-",
    subKategori: tx.subKategori || tx.sub_kategori || tx.keterangan || "-",
    akun: tx.akun || tx.bank || tx.account || "-",
    nominal: Number(String(tx.nominal ?? tx.amount ?? 0).replace(/[^0-9-]/g, "")) || 0,
    rowIndex: tx.rowIndex ?? tx.row ?? tx.no ?? null
  };
}

/* ================= RENDER UI ================= */

function renderSearchResults(data, keyword) {
  const searchListContainer = document.getElementById("searchListContainer");
  const searchTotalCount = document.getElementById("searchTotalCount");
  const searchTotalNominal = document.getElementById("searchTotalNominal");

  const transactions = data.transactions || [];

  if (searchTotalCount) {
    searchTotalCount.innerText = `${data.totalCount || 0} Transaksi`;
  }
  if (searchTotalNominal) {
    searchTotalNominal.innerText = "Rp " + (data.totalNominal || 0).toLocaleString("id-ID");
  }

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

  let html = "";
  transactions.forEach((tx) => {
    const kategori = String(tx.kategori || "");
    const kategoriUp = kategori.toUpperCase();

    const isIncome = kategoriUp.includes("PEMASUKAN");
    const isPindah = kategoriUp.includes("PINDAH DANA");

    let badgeColor = "bg-rose-100 text-rose-800 border-rose-200/80";
    let sign = "-";

    if (isIncome) {
      badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200/80";
      sign = "+";
    } else if (isPindah) {
      badgeColor = "bg-blue-100 text-blue-800 border-blue-200/80";
      sign = "⇄";
    }

    const nominalFormatted = (tx.nominal || 0).toLocaleString("id-ID");
    const rowIndexHtml = tx.rowIndex
      ? `<span class="text-[9px] text-pink-800/40 block">Baris #${escapeHtml(tx.rowIndex)}</span>`
      : "";

    html += `
      <div class="glass-card p-2.5 rounded-xl border border-white/80 shadow-sm flex items-center justify-between hover:bg-white/90 transition">
        <div class="flex flex-col gap-0.5 max-w-[65%]">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${badgeColor}">
              ${highlightText(kategori, keyword)}
            </span>
            <span class="text-[10px] font-bold text-pink-950/80 truncate">
              ${highlightText(tx.subKategori, keyword)}
            </span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-pink-900/60 font-medium">
            <span>📅 ${escapeHtml(tx.tgl)}</span>
            <span>•</span>
            <span>🏦 ${highlightText(tx.akun, keyword)}</span>
          </div>
        </div>

        <div class="text-right">
          <span class="text-xs font-black ${isIncome ? 'text-emerald-700' : isPindah ? 'text-blue-700' : 'text-rose-700'} block">
            ${sign} Rp ${nominalFormatted}
          </span>
          ${rowIndexHtml}
        </div>
      </div>
    `;
  });

  if (searchListContainer) {
    searchListContainer.innerHTML = html;
  }
}

function renderSearchError(messageHtml) {
  const searchListContainer = document.getElementById("searchListContainer");
  if (searchListContainer) {
    searchListContainer.innerHTML = `
      <p class="text-center text-xs text-rose-600 py-6 font-semibold leading-relaxed">${messageHtml}</p>
    `;
  }
}

/* ================= HELPER KEAMANAN & HIGHLIGHT ================= */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Highlight kata kunci yang dicari biar ketemuannya keliatan jelas
function highlightText(text, keyword) {
  const safe = escapeHtml(text || "");
  const kw = (keyword || "").trim();
  if (!kw) return safe;

  const safeKw = escapeHtml(kw).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!safeKw) return safe;

  try {
    const regex = new RegExp(`(${safeKw})`, "gi");
    return safe.replace(regex, '<mark class="bg-yellow-200/80 text-pink-950 rounded px-0.5">$1</mark>');
  } catch (e) {
    return safe;
  }
}
