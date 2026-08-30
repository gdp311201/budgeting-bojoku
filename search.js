/**
 * =========================================================================
 * search.js — MODUL PENCARIAN + SWIPE EDIT/HAPUS (GAYA GMAIL)
 * =========================================================================
 * - Mode manual-load: data hanya dimuat via tombol "Cari Sekarang" / Enter
 * - Kartu transaksi bisa digeser:
 *     • Geser KIRI  → tombol HAPUS (merah) → konfirmasi → deleteRow di Sheet
 *     • Geser KANAN → tombol EDIT (biru)  → modal edit → overwrite baris
 * - Setelah hapus/edit sukses, daftar otomatis dimuat ulang (rowIndex
 *   selalu fresh — anti salah nembak baris).
 * =========================================================================
 */

import { GAS_URL, SUB_DATA, formatRupiahInput, showCuteModal } from './transaksi.js';

// Opsional: harus SAMA dengan var API_SECRET di 01_PenerimaanDataFormUI.gs.
// Kosong di kedua sisi = proteksi nonaktif (default).
const API_SECRET = "";

const SWIPE_OPEN_W = 84; // lebar tombol aksi (px)

let searchModuleReady = false;
let lastFetchedFilter = null;
let lastTransactions = [];   // hasil pencarian terakhir (referensi swipe)
let openSwipeItem = null;    // kartu yang sedang terbuka aksinya
let editingTx = null;        // transaksi yang sedang diedit
let pendingDeleteTx = null;  // transaksi yang menunggu konfirmasi hapus
let editFp = null;           // instance flatpickr untuk modal edit

/* ================= FILTER & STATE HELPER ================= */

function getSearchFilter() {
  return JSON.stringify({
    keyword: (document.getElementById("searchKeyword")?.value || "").trim(),
    bulan: document.getElementById("searchBulan")?.value || "ALL",
    tahun: document.getElementById("searchTahun")?.value || "2026",
    sort: document.getElementById("searchSort")?.value || "DESC"
  });
}

function nowWIB() {
  try {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB';
  } catch (err) {
    return new Date().toLocaleTimeString('en-GB', { hour12: false });
  }
}

function setDirtyHint(show) {
  const hint = document.getElementById("searchDirtyHint");
  if (hint) hint.classList.toggle("hidden", !show);
}

function updateDataStamp() {
  const stamp = document.getElementById("searchDataStamp");
  if (stamp) {
    stamp.classList.remove("hidden");
    stamp.textContent = '📅 Data per ' + nowWIB();
  }
}

function markSearchDirty() {
  setDirtyHint(lastFetchedFilter !== null && getSearchFilter() !== lastFetchedFilter);
}

function setBtnLoading(isLoading) {
  const btn = document.getElementById("btnDoSearch");
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "⏳ Mencari...";
  } else {
    if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
    btn.disabled = false;
  }
}

function showModal(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

function hideModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

/* ================= INIT ================= */

export function initSearchModule() {
  if (searchModuleReady) return;
  searchModuleReady = true;

  // Tombol utama — satu-satunya pemicu pencarian
  const btnDoSearch = document.getElementById("btnDoSearch");
  if (btnDoSearch) btnDoSearch.addEventListener("click", () => fetchAndRenderSearchData());

  const btnRefreshSearch = document.getElementById("btnRefreshSearch");
  if (btnRefreshSearch) btnRefreshSearch.addEventListener("click", () => fetchAndRenderSearchData());

  // Keyword: hanya menandai "filter berubah", TIDAK auto-fetch
  const searchKeyword = document.getElementById("searchKeyword");
  if (searchKeyword) {
    searchKeyword.addEventListener("input", markSearchDirty);
    searchKeyword.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fetchAndRenderSearchData();
      }
    });
  }

  ["searchBulan", "searchTahun", "searchSort"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", markSearchDirty);
  });

  // ---- Modal konfirmasi HAPUS ----
  document.getElementById("btnCancelDelete")?.addEventListener("click", () => {
    pendingDeleteTx = null;
    hideModal("confirmModal");
  });
  document.getElementById("btnConfirmDelete")?.addEventListener("click", confirmDeleteTransaction);

  // ---- Modal EDIT ----
  document.getElementById("btnCancelEdit")?.addEventListener("click", closeEditModal);
  const editForm = document.getElementById("editForm");
  if (editForm) editForm.addEventListener("submit", submitEditTransaction);

  document.getElementById("editKategori")?.addEventListener("change", () => {
    syncEditLabels();
    populateEditSubs(null);
  });
  document.getElementById("editNominal")?.addEventListener("keyup", (e) => formatRupiahInput(e.target));
  document.getElementById("editSubKategori")?.addEventListener("change", function () {
    this.classList.remove("is-placeholder");
  });
  document.getElementById("editAkun")?.addEventListener("change", function () {
    this.classList.remove("is-placeholder");
  });

  // Tutup modal saat tap area backdrop
  const editModal = document.getElementById("editModal");
  editModal?.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal(); });
  const confirmModal = document.getElementById("confirmModal");
  confirmModal?.addEventListener("click", (e) => {
    if (e.target === confirmModal) { pendingDeleteTx = null; hideModal("confirmModal"); }
  });

  // TIDAK ADA auto-load. Data dimuat manual via tombol.
}

/* ================= FETCH & RENDER ================= */

export async function fetchAndRenderSearchData() {
  const searchListContainer = document.getElementById("searchListContainer");

  const bulan = document.getElementById("searchBulan")?.value || "ALL";
  const tahun = document.getElementById("searchTahun")?.value || "2026";
  const keyword = (document.getElementById("searchKeyword")?.value || "").trim();
  const sort = document.getElementById("searchSort")?.value || "DESC";

  openSwipeItem = null;

  if (searchListContainer) {
    searchListContainer.innerHTML = `
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mb-2"></div>
        <p class="text-xs text-pink-800/60 font-medium">Mencari transaksi...</p>
      </div>
    `;
  }
  setBtnLoading(true);

  try {
    const url = new URL(GAS_URL);
    url.searchParams.append("action", "getSearchData");
    url.searchParams.append("bulan", bulan);
    url.searchParams.append("tahun", tahun);
    url.searchParams.append("keyword", keyword);
    url.searchParams.append("sort", sort);
    url.searchParams.append("_ts", Date.now()); // anti-cache

    const response = await fetch(url.toString(), { method: "GET", redirect: "follow" });

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

    const isSuccess = res && (res.status === "success" || res.result === "success");

    if (isSuccess) {
      renderSearchResults(normalizeResponse(res), keyword);
      lastFetchedFilter = getSearchFilter();
      setDirtyHint(false);
      updateDataStamp();
    } else {
      renderSearchError(
        "⚠️ Gagal memuat: " + escapeHtml(res?.message || res?.error || "Terjadi kesalahan di server")
      );
    }
  } catch (error) {
    console.error("Fetch Search Error:", error);
    renderSearchError("❌ Koneksi Terputus / URL Apps Script Belum Sesuai");
  } finally {
    setBtnLoading(false);
  }
}

/* ================= HELPER NORMALISASI RESPONSE ================= */

function normalizeResponse(res) {
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
    totalCount: Number(d.totalCount ?? d.total ?? transactions.length) || transactions.length
  };
}

function normalizeTransaction(tx) {
  return {
    tgl: tx.tgl || tx.tanggal || tx.date || "-",
    kategori: tx.kategori || tx.category || "-",
    subKategori: tx.subKategori || tx.sub_kategori || tx.keterangan || "-",
    akun: tx.akun || tx.bank || tx.account || "-",
    nominal: Number(String(tx.nominal ?? tx.amount ?? 0).replace(/[^0-9-]/g, "")) || 0,
    rowIndex: tx.rowIndex ?? tx.row ?? tx.no ?? null,
    ts: Number(tx.rawTimestamp) || 0
  };
}

/* ================= RENDER UI (KARTU SWIPEABLE) ================= */

function renderSearchResults(data, keyword) {
  const searchListContainer = document.getElementById("searchListContainer");
  const transactions = data.transactions || [];

  lastTransactions = transactions;
  openSwipeItem = null;

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

    html += `
      <div class="swipe-item" data-no-swipe>
        <div class="swipe-actions swipe-actions-left">
          <button type="button" class="swipe-btn swipe-btn-edit">✏️<span>EDIT</span></button>
        </div>
        <div class="swipe-actions swipe-actions-right">
          <button type="button" class="swipe-btn swipe-btn-delete">🗑️<span>HAPUS</span></button>
        </div>
        <div class="swipe-content glass-card p-2.5 rounded-xl border border-white/80 shadow-sm flex items-center justify-between">
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
              <span>${escapeHtml(tx.tgl)}</span>
              <span>•</span>
              <span>🏦 ${highlightText(tx.akun, keyword)}</span>
            </div>
          </div>

          <div class="text-right">
            <span class="text-xs font-black ${isIncome ? 'text-emerald-700' : isPindah ? 'text-blue-700' : 'text-rose-700'} block">
              ${sign} Rp ${nominalFormatted}
            </span>
          </div>
        </div>
      </div>
    `;
  });

  if (searchListContainer) {
    searchListContainer.innerHTML = html;

    // Pasang perilaku swipe pada tiap kartu
    const items = searchListContainer.querySelectorAll(".swipe-item");
    items.forEach((el, idx) => {
      if (transactions[idx]) attachSwipe(el, transactions[idx]);
    });
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

/* ================= MEKANIK SWIPE (GAYA GMAIL) ================= */

function currentOffset(itemEl) {
  if (itemEl.classList.contains("swipe-open-right")) return -SWIPE_OPEN_W;
  if (itemEl.classList.contains("swipe-open-left")) return SWIPE_OPEN_W;
  return 0;
}

function openSwipe(itemEl, side) {
  closeSwipe(openSwipeItem);
  openSwipeItem = itemEl;
  itemEl.classList.add("swipe-open", side === "right" ? "swipe-open-right" : "swipe-open-left");
  const content = itemEl.querySelector(".swipe-content");
  if (content) {
    content.style.transform = side === "right"
      ? "translateX(" + (-SWIPE_OPEN_W) + "px)"
      : "translateX(" + SWIPE_OPEN_W + "px)";
  }
}

function closeSwipe(itemEl) {
  if (!itemEl) return;
  itemEl.classList.remove("swipe-open", "swipe-open-left", "swipe-open-right");
  const content = itemEl.querySelector(".swipe-content");
  if (content) content.style.transform = "";
  if (openSwipeItem === itemEl) openSwipeItem = null;
}

function attachSwipe(itemEl, tx) {
  const content = itemEl.querySelector(".swipe-content");
  const btnEdit = itemEl.querySelector(".swipe-btn-edit");
  const btnDelete = itemEl.querySelector(".swipe-btn-delete");
  if (!content || !btnEdit || !btnDelete) return;

  let startX = 0, startY = 0, base = 0, cur = 0, mode = "idle", active = false;

  content.addEventListener("pointerdown", (e) => {
    // Tutup kartu lain yang sedang terbuka
    if (openSwipeItem && openSwipeItem !== itemEl) closeSwipe(openSwipeItem);

    startX = e.clientX;
    startY = e.clientY;
    base = currentOffset(itemEl);
    cur = base;
    mode = "idle";
    active = true;
    content.style.transition = "none";
  });

  content.addEventListener("pointermove", (e) => {
    if (!active) return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;

    if (mode === "idle") {
      if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.2) {
        mode = "h"; // gerakan dominan horizontal → mulai seret kartu
      } else if (Math.abs(my) > 12) {
        mode = "v"; // user lagi scroll vertikal → biarkan
        return;
      } else {
        return;
      }
    }
    if (mode !== "h") return;

    cur = Math.max(-SWIPE_OPEN_W, Math.min(SWIPE_OPEN_W, base + mx));
    content.style.transform = "translateX(" + cur + "px)";
  });

  const finish = () => {
    if (!active) return;
    active = false;
    content.style.transition = "";

    if (mode === "h") {
      if (cur <= -SWIPE_OPEN_W * 0.45) openSwipe(itemEl, "right");      // tampil HAPUS
      else if (cur >= SWIPE_OPEN_W * 0.45) openSwipe(itemEl, "left");   // tampil EDIT
      else closeSwipe(itemEl);
    } else if (mode === "idle") {
      // Tap pada kartu yang terbuka → tutup
      if (itemEl.classList.contains("swipe-open")) closeSwipe(itemEl);
    }
    mode = "idle";
  };

  content.addEventListener("pointerup", finish);
  content.addEventListener("pointerleave", finish);
  content.addEventListener("pointercancel", () => {
    if (!active) return;
    active = false;
    content.style.transition = "";
    closeSwipe(itemEl);
    mode = "idle";
  });

  btnEdit.addEventListener("click", () => {
    closeSwipe(itemEl);
    openEditModal(tx);
  });

  btnDelete.addEventListener("click", () => {
    closeSwipe(itemEl);
    askDeleteConfirm(tx);
  });
}

/* ================= ALUR HAPUS ================= */

function askDeleteConfirm(tx) {
  if (!tx.rowIndex) {
    showCuteModal(false, "Tidak Bisa Menghapus", "Data transaksi ini tidak memiliki nomor baris yang valid. Muat ulang daftar lalu coba lagi.");
    return;
  }
  pendingDeleteTx = tx;

  const detail = document.getElementById("confirmDetail");
  if (detail) {
    detail.textContent =
      tx.kategori + " • " + tx.subKategori +
      " • Rp " + (tx.nominal || 0).toLocaleString("id-ID") +
      " • " + tx.akun;
  }

  showModal("confirmModal");
}

async function confirmDeleteTransaction() {
  if (!pendingDeleteTx) return;
  const tx = pendingDeleteTx;

  const btn = document.getElementById("btnConfirmDelete");
  const btnOrig = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = "⏳ Menghapus..."; }

  try {
    const result = await callGasAction({
      action: "deleteTransaction",
      secret: API_SECRET,
      row: tx.rowIndex,
      checkKategori: tx.kategori,
      checkSub: tx.subKategori,
      checkAkun: tx.akun,
      checkNominal: String(tx.nominal || 0)
    });

    hideModal("confirmModal");

    if (result.status === "success") {
      showCuteModal(true, "Terhapus!", "Transaksi berhasil dihapus permanen dari Google Sheets.");
      fetchAndRenderSearchData(); // refresh → rowIndex selalu fresh
    } else {
      showCuteModal(false, "Gagal Menghapus!", result.message || "Terjadi kesalahan di server.");
      if (result.code === "STALE") fetchAndRenderSearchData();
    }
  } catch (err) {
    hideModal("confirmModal");
    showCuteModal(false, "Gagal Menghapus!", "Koneksi bermasalah: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrig; }
    pendingDeleteTx = null;
  }
}

/* ================= ALUR EDIT ================= */

const MONTH_LOOKUP = {
  JANUARI: 1, FEBRUARI: 2, MARET: 3, APRIL: 4, MEI: 5, JUNI: 6, JULI: 7,
  AGUSTUS: 8, SEPTEMBER: 9, OKTOBER: 10, NOVEMBER: 11, DESEMBER: 12,
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7,
  AGT: 8, AGU: 8, AUG: 8, SEP: 9, SEPT: 9, OKT: 10, OCT: 10, NOV: 11, DES: 12, DEC: 12
};

// Parse label tanggal ("30 Agu 2026", "2026-08-30", "30/08/2026") → {y,m,d}
function parseTglToParts(tgl) {
  if (!tgl) return null;
  const s = String(tgl).trim();

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };

  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
    return { y: +m[3], m: mo, d: d };
  }

  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)[\.\s\-]+(\d{4})/);
  if (m) {
    const mo = MONTH_LOOKUP[m[2].toUpperCase()];
    if (mo) return { y: +m[3], m: mo, d: +m[1] };
  }

  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  return null;
}

function ensureOption(sel, value) {
  if (!sel || !value) return;
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === value) return;
  }
  const o = document.createElement("option");
  o.value = value;
  o.textContent = value;
  sel.appendChild(o);
}

function syncEditLabels() {
  const kat = document.getElementById("editKategori")?.value || "";
  const lblSub = document.getElementById("editLblSubKategori");
  const lblAkun = document.getElementById("editLblAkun");

  if (lblSub && lblAkun) {
    if (kat === "💸 PINDAH DANA") {
      lblSub.innerText = "DARI REKENING (ASAL)";
      lblAkun.innerText = "KE REKENING (TUJUAN)";
    } else {
      lblSub.innerText = "SUB KATEGORI";
      lblAkun.innerText = "AKUN BANK";
    }
  }
}

function populateEditSubs(currentValue) {
  const sel = document.getElementById("editSubKategori");
  if (!sel) return;

  const kat = document.getElementById("editKategori")?.value || "";
  const list = SUB_DATA[kat] || [];

  sel.innerHTML = '<option value="" disabled selected hidden>-- Pilih Sub Kategori --</option>';
  list.forEach((s) => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  });

  // Nilai lama yang tidak ada di daftar → tetap ditambahkan biar tidak hilang
  if (currentValue && !list.includes(currentValue)) {
    const o = document.createElement("option");
    o.value = currentValue;
    o.textContent = currentValue;
    sel.appendChild(o);
  }

  if (currentValue) {
    sel.value = currentValue;
    sel.classList.remove("is-placeholder");
  } else {
    sel.classList.add("is-placeholder");
  }
}

function openEditModal(tx) {
  if (!tx.rowIndex) {
    showCuteModal(false, "Tidak Bisa Edit", "Data transaksi ini tidak memiliki nomor baris yang valid. Muat ulang daftar lalu coba lagi.");
    return;
  }
  editingTx = tx;

  // Flatpickr tanggal edit (dibuat sekali saja)
  if (!editFp) {
    editFp = flatpickr("#editTanggal", {
      dateFormat: "Y-m-d",
      disableMobile: true,
      allowInput: false
    });
  }

  // Isi tanggal (parse label dulu, fallback ke timestamp)
  const parsed = parseTglToParts(tx.tgl) || (tx.ts > 0 ? null : null);
  let parts = parsed;
  if (!parts && tx.ts > 0) {
    const dt = new Date(tx.ts);
    if (!isNaN(dt.getTime())) parts = { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  if (parts) {
    editFp.setDate(new Date(parts.y, parts.m - 1, parts.d), false);
  } else {
    editFp.clear();
  }

  // Kategori
  const katSel = document.getElementById("editKategori");
  ensureOption(katSel, tx.kategori);
  if (katSel) {
    katSel.value = tx.kategori;
    katSel.classList.remove("is-placeholder");
  }

  // Sub kategori + label dinamis (PINDAH DANA)
  syncEditLabels();
  populateEditSubs(tx.subKategori);

  // Akun
  const akunSel = document.getElementById("editAkun");
  ensureOption(akunSel, tx.akun);
  if (akunSel) {
    akunSel.value = tx.akun;
    akunSel.classList.remove("is-placeholder");
  }

  // Nominal
  const nomEl = document.getElementById("editNominal");
  if (nomEl) nomEl.value = tx.nominal > 0 ? "Rp " + tx.nominal.toLocaleString("id-ID") : "";

  showModal("editModal");
}

function closeEditModal() {
  hideModal("editModal");
  editingTx = null;
}

async function submitEditTransaction(e) {
  e.preventDefault();
  if (!editingTx) return;
  const tx = editingTx;

  const btn = document.getElementById("btnSaveEdit");
  const btnOrig = btn ? btn.innerHTML : "";
  if (btn) { btn.disabled = true; btn.innerHTML = "⏳ Menyimpan..."; }

  const tglVal = document.getElementById("editTanggal")?.value || "";
  const katVal = document.getElementById("editKategori")?.value || "";
  const subVal = document.getElementById("editSubKategori")?.value || "";
  const nomRaw = document.getElementById("editNominal")?.value || "";
  const akunVal = document.getElementById("editAkun")?.value || "";

  const cleanNominal = nomRaw.replace(/[^0-9]/g, "");

  if (!tglVal || !katVal || !subVal || !akunVal) {
    showCuteModal(false, "Belum Lengkap!", "Tanggal, kategori, sub kategori & akun wajib diisi semua ya!");
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrig; }
    return;
  }
  if (!cleanNominal || parseInt(cleanNominal, 10) <= 0) {
    showCuteModal(false, "Opps!", "Silakan masukkan nominal transaksi yang valid dulu ya!");
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrig; }
    return;
  }

  try {
    const result = await callGasAction({
      action: "updateTransaction",
      secret: API_SECRET,
      row: tx.rowIndex,
      checkKategori: tx.kategori,
      checkSub: tx.subKategori,
      checkAkun: tx.akun,
      checkNominal: String(tx.nominal || 0),
      kolomA: tglVal,
      kolomB: katVal,
      kolomC: subVal,
      kolomD: cleanNominal,
      kolomE: akunVal,
      tanggal: tglVal,
      kategori: katVal,
      subKategori: subVal,
      nominal: cleanNominal,
      akun: akunVal
    });

    if (result.status === "success") {
      closeEditModal();
      showCuteModal(true, "Berhasil Diubah!", "Perubahan transaksi sudah tersimpan ke Google Sheets!");
      fetchAndRenderSearchData(); // refresh list
    } else {
      showCuteModal(false, "Gagal Mengubah!", result.message || "Terjadi kesalahan di server.");
      if (result.code === "STALE") {
        closeEditModal();
        fetchAndRenderSearchData();
      }
    }
  } catch (err) {
    showCuteModal(false, "Gagal Mengubah!", "Koneksi bermasalah: " + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrig; }
  }
}

/* ================= API CALL HELPER ================= */

async function callGasAction(payload) {
  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return response.json();
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
