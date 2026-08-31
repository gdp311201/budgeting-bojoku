/**
 * =========================================================================
 * setup.js — MODUL SETUP BUDGET (SHEET SET_UP)
 * =========================================================================
 * AKSES (tersembunyi, tanpa PIN):
 *   LONG-PRESS (tekan & tahan ±0.7 detik) pada kartu "Total Aset Bersih"
 *   di modul Dashboard → panel Setup muncul sebagai bottom sheet.
 *
 * ALUR:
 *   Buka → mode VIEW (input terkunci, hanya lihat)
 *   ✏️ Edit Data → input terkunci dibuka, total dihitung live
 *   💾 Simpan   → kirim ke GAS (whitelist + verifikasi sub kategori)
 *   Batal       → buang perubahan, kembali ke view
 * =========================================================================
 */

import { GAS_URL, showCuteModal, formatRupiahInput } from './transaksi.js';

const LONG_PRESS_MS = 700;

let setupReady = false;
let editMode = false;
let cachedSetup = null;
let dirtyCount = 0;

/* ============================ INIT ============================ */

export function initSetupModule() {
  if (setupReady) return;
  setupReady = true;

  /* --- 1) Trigger rahasia: long-press kartu Total Aset --- */
  const card = document.getElementById('assetCard');
  if (card) attachLongPress(card);

  /* --- 2) Tombol panel --- */
  document.getElementById('btnCloseSetup')?.addEventListener('click', closeSetup);
  document.getElementById('btnSetupEdit')?.addEventListener('click', enterEditMode);
  document.getElementById('btnSetupCancel')?.addEventListener('click', exitEditMode);
  document.getElementById('btnSetupSave')?.addEventListener('click', saveSetup);

  /* --- 3) Backdrop: tutup hanya saat mode view --- */
  const modal = document.getElementById('setupModal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal && !editMode) closeSetup();
  });
}

/* ==================== LONG-PRESS DETECTION ==================== */

function attachLongPress(card) {
  let timer = null;
  let fired = false;
  let sx = 0, sy = 0;

  const start = (e) => {
    fired = false;
    sx = e.clientX;
    sy = e.clientY;
    card.classList.add('lp-press');
    timer = setTimeout(() => {
      fired = true;
      timer = null;
      card.classList.remove('lp-press');
      try { if (navigator.vibrate) navigator.vibrate(35); } catch (err) { /* aman */ }
      openSetup();
    }, LONG_PRESS_MS);
  };

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    card.classList.remove('lp-press');
  };

  const move = (e) => {
    // Gerakan > 10px = user mau scroll/swipe → batalkan long-press
    if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) {
      cancel();
    }
  };

  card.addEventListener('pointerdown', start);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerup', cancel);
  card.addEventListener('pointerleave', cancel);
  card.addEventListener('pointercancel', cancel);

  // Cegah context menu (klik kanan / long-press iOS) setelah trigger jalan
  card.addEventListener('contextmenu', (e) => {
    if (fired) e.preventDefault();
  });
}

/* ====================== BUKA / TUTUP PANEL ====================== */

function openSetup() {
  editMode = false;
  dirtyCount = 0;
  document.getElementById('setupModal')?.classList.remove('hidden');
  refreshSetup();
}

function closeSetup() {
  if (editMode && dirtyCount > 0) {
    if (!window.confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
  }
  editMode = false;
  dirtyCount = 0;
  document.getElementById('setupModal')?.classList.add('hidden');
}

/* ====================== FETCH & RENDER ====================== */

async function refreshSetup() {
  setSetupLoading(true);
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append('action', 'getSetupData');
    url.searchParams.append('_ts', Date.now()); // anti-cache

    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    const data = await response.json();

    if (data && data.status === 'success') {
      renderSetupView(data);
    } else {
      renderSetupError((data && data.message) || 'Terjadi kesalahan di server.');
    }
  } catch (err) {
    renderSetupError('Koneksi bermasalah: ' + err.message);
  } finally {
    setSetupLoading(false);
  }
}

function setSetupLoading(isLoading) {
  const body = document.getElementById('setupBody');
  if (!body) return;
  if (isLoading) {
    body.innerHTML = `
      <div class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-pink-500 mb-2"></div>
        <p class="text-xs text-pink-800/60 font-medium">Memuat data setup...</p>
      </div>
    `;
  }
}

function renderSetupError(msg) {
  const body = document.getElementById('setupBody');
  if (body) {
    body.innerHTML = `
      <div class="text-center py-10">
        <div class="text-3xl mb-2">⚠️</div>
        <p class="text-xs font-bold text-rose-700">Gagal Memuat Setup</p>
        <p class="text-[10px] text-pink-900/60 mt-1">${escapeHtml(msg)}</p>
        <p class="text-[10px] text-pink-900/50 mt-2">Tutup lalu coba buka lagi (long-press kartu Total Aset).</p>
      </div>
    `;
  }
  // saat error, sembunyikan tombol edit
  document.getElementById('btnSetupEdit')?.classList.add('hidden');
  document.getElementById('setupEditActions')?.classList.add('hidden');
}

function renderSetupView(data) {
  cachedSetup = data;
  editMode = false;
  dirtyCount = 0;

  const body = document.getElementById('setupBody');
  if (!body) return;

  const kategoriHtml = renderKategoriSummary(data.kategori);
  const banksHtml = renderBanks(data.banks);
  const tablesHtml = (data.tables || []).map(renderTableSection).join('');

  body.innerHTML = kategoriHtml + banksHtml + tablesHtml;

  // Listener input (buat total live — aktif saat input di-enable)
  body.querySelectorAll('.setup-input').forEach((inp) => {
    inp.addEventListener('input', onSetupInput);
  });

  // Reset footer ke mode view
  document.getElementById('btnSetupEdit')?.classList.remove('hidden');
  document.getElementById('setupEditActions')?.classList.add('hidden');

  updateSetupStamp();
}

/* ---------- RENDER: REKAP KATEGORI (read-only, hasil formula) ---------- */

function renderKategoriSummary(k) {
  if (!k || !k.rows || !k.rows.length) return '';

  const rows = k.rows.map((r) => `
    <div class="flex justify-between items-center py-1 border-b border-pink-100/70 last:border-0">
      <span class="text-[11px] text-pink-900/80 font-semibold truncate pr-2">${escapeHtml(r.nama)}</span>
      <span class="whitespace-nowrap">
        <span class="text-[11px] font-bold text-pink-950">${formatRupiah(r.nominal)}</span>
        <span class="text-[9px] font-bold text-pink-600 ml-1.5">${pctStr(r.pct)}</span>
      </span>
    </div>
  `).join('');

  return `
  <section class="setup-readonly">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-[11px] font-bold text-pink-950/90 uppercase tracking-wide">🧾 Rekap Alokasi</span>
      <span class="text-[9px] font-bold text-pink-700/70 bg-pink-100/70 border border-pink-200/60 rounded-full px-2 py-0.5">otomatis</span>
    </div>
    ${rows}
    <div class="mt-2 flex justify-between items-center bg-amber-100/70 border border-amber-300/60 rounded-xl px-3 py-2">
      <span class="text-[10px] font-bold text-amber-900 uppercase tracking-wide">Sisa Budget</span>
      <span class="text-[11px] font-extrabold text-amber-950">${formatRupiah(k.sisa.nominal)} · ${pctStr(k.sisa.pct)}</span>
    </div>
  </section>
  `;
}

/* ---------- RENDER: AKUN BANK (permanen, read-only) ---------- */

function renderBanks(b) {
  if (!b || !b.rows || !b.rows.length) return '';

  const rows = b.rows.map((r) => `
    <div class="flex justify-between items-center py-1 border-b border-pink-100/70 last:border-0">
      <span class="text-[11px] text-pink-900/80 font-semibold">${escapeHtml(r.nama)}</span>
      <span class="text-[11px] font-bold text-emerald-700">${formatRupiah(r.saldo)}</span>
    </div>
  `).join('');

  return `
  <section class="setup-readonly">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-[11px] font-bold text-pink-950/90 uppercase tracking-wide">🏦 Akun Bank — Saldo Awal</span>
      <span class="text-[9px] font-bold text-pink-700/70 bg-pink-100/70 border border-pink-200/60 rounded-full px-2 py-0.5">permanen</span>
    </div>
    ${rows}
    <div class="mt-2 flex justify-between items-center bg-emerald-100/60 border border-emerald-300/60 rounded-xl px-3 py-2">
      <span class="text-[10px] font-bold text-emerald-900 uppercase tracking-wide">Total Saldo Awal</span>
      <span class="text-[11px] font-extrabold text-emerald-800">${formatRupiah(b.total)}</span>
    </div>
  </section>
  `;
}

/* ---------- RENDER: TABEL BUDGET (editable) ---------- */

function renderTableSection(t) {
  const rowsHtml = (t.items || []).map((it) => `
    <div class="setup-row">
      <span class="setup-sub" title="${escapeHtml(it.sub)}">${escapeHtml(it.sub)}</span>
      <input type="text" inputmode="numeric" autocomplete="off" placeholder="Rp 0" disabled
        id="setup-${t.id}-${it.row}"
        data-table="${t.id}" data-row="${it.row}"
        value="${it.value > 0 ? 'Rp ' + it.value.toLocaleString('id-ID') : ''}"
        class="setup-input custom-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-right">
    </div>
  `).join('');

  return `
  <section class="setup-section" data-setup-table="${t.id}">
    <div class="flex justify-between items-center mb-1.5">
      <span class="text-[11px] font-bold text-pink-950/90 uppercase tracking-wide">${escapeHtml(t.label)}</span>
      <span id="setup-total-${t.id}" class="text-[11px] font-extrabold text-pink-700">${formatRupiah(t.total)}</span>
    </div>
    <div class="space-y-1.5">${rowsHtml}</div>
  </section>
  `;
}

/* ====================== MODE EDIT / SIMPAN ====================== */

function enterEditMode() {
  if (!cachedSetup) return;
  editMode = true;

  document.getElementById('btnSetupEdit')?.classList.add('hidden');
  document.getElementById('setupEditActions')?.classList.remove('hidden');

  document.querySelectorAll('.setup-input').forEach((inp) => {
    inp.disabled = false;
    inp.classList.add('setup-input-live');
  });
}

function exitEditMode() {
  if (dirtyCount > 0) {
    if (!window.confirm('Buang semua perubahan yang belum disimpan?')) return;
  }
  renderSetupView(cachedSetup); // reset dari cache (buang perubahan)
}

function onSetupInput(e) {
  formatRupiahInput(e.target);
  dirtyCount++;
  const tableId = e.target.getAttribute('data-table');
  if (tableId) updateSectionTotal(tableId);
}

function updateSectionTotal(tableId) {
  const section = document.querySelector(`[data-setup-table="${tableId}"]`);
  if (!section) return;

  let sum = 0;
  section.querySelectorAll('.setup-input').forEach((inp) => {
    sum += parseInt((inp.value || '').replace(/[^0-9]/g, ''), 10) || 0;
  });

  const el = document.getElementById(`setup-total-${tableId}`);
  if (el) el.textContent = formatRupiah(sum);
}

async function saveSetup() {
  if (!cachedSetup) return;

  const btn = document.getElementById('btnSetupSave');
  const btnOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Menyimpan...'; }

  // Susun payload: SEMUA item dikirim, GAS verifikasi nama sub per baris
  const tables = (cachedSetup.tables || []).map((t) => {
    const items = (t.items || []).map((it) => {
      const inp = document.getElementById(`setup-${t.id}-${it.row}`);
      const clean = (inp ? inp.value : '').replace(/[^0-9]/g, '');
      return { row: it.row, sub: it.sub, value: clean || '0' };
    });
    return { id: t.id, items: items };
  });

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveSetupData', tables: tables })
    });
    const result = await response.json();

    if (result.status === 'success') {
      showCuteModal(true, 'Berhasil Disimpan!', 'Setup budget sudah tersimpan ke Google Sheets.');
      await refreshSetup(); // re-fetch: rekap formula & total ikut refresh
    } else {
      showCuteModal(false, 'Gagal Menyimpan!', result.message || 'Terjadi kesalahan di server.');
      if (result.code === 'STALE') await refreshSetup();
    }
  } catch (err) {
    showCuteModal(false, 'Gagal Menyimpan!', 'Koneksi bermasalah: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btnOrig; }
  }
}

/* ====================== HELPER ====================== */

function updateSetupStamp() {
  const stamp = document.getElementById('setupDataStamp');
  if (stamp) {
    let teks;
    try {
      teks = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB';
    } catch (err) {
      teks = new Date().toLocaleTimeString('en-GB', { hour12: false });
    }
    stamp.classList.remove('hidden');
    stamp.textContent = '📅 Data per ' + teks;
  }
}

function formatRupiah(num) {
  const v = Number(num) || 0;
  const s = Math.abs(v).toLocaleString('id-ID');
  return v < 0 ? '-Rp ' + s : 'Rp ' + s;
}

function pctStr(p) {
  const v = Number(p) || 0;
  return (Math.round(v * 1000) / 10) + '%';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
