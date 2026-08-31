/**
 * =========================================================================
 * setup.js — MODUL SETUP BUDGET (SHEET SET_UP) · v3 RENDER
 * =========================================================================
 * v3 — rendering "gaya sheet asli" dengan grid rata:
 *  - Zona nilai pakai .val-grid: [Rp | nominal | %] kolom sejajar sempurna
 *  - Rp rata KIRI · nominal & % rata KANAN (semua tabel + input editable)
 *  - Rekap Alokasi: nominal & % bersebelahan tanpa garis pemisah
 *  - Tipografi seimbang dengan input (16px global anti-zoom iOS)
 *  - Semua styling via class CSS (style.css) — bukan Tailwind di string JS
 * =========================================================================
 */

import { GAS_URL, showCuteModal } from './transaksi.js';

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
  setStamp('📅 Memuat data setup...');
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
  setStamp('⚠ Gagal memuat data');
  const body = document.getElementById('setupBody');
  if (body) {
    body.innerHTML = `
      <div class="text-center py-10">
        <div class="text-3xl mb-2">⚠️</div>
        <p class="text-xs font-bold text-rose-700">Gagal Memuat Setup</p>
        <p class="text-[11px] text-pink-900/60 mt-1">${escapeHtml(msg)}</p>
        <p class="text-[11px] text-pink-900/50 mt-2">Tutup lalu coba buka lagi (long-press kartu Total Aset).</p>
      </div>
    `;
  }
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

  // Listener input (total live — aktif saat input di-enable)
  body.querySelectorAll('.setup-input').forEach((inp) => {
    inp.addEventListener('input', onSetupInput);
  });

  // Reset footer ke mode view
  document.getElementById('btnSetupEdit')?.classList.remove('hidden');
  document.getElementById('setupEditActions')?.classList.add('hidden');

  updateSetupStamp();
}

/* ============ KOMPONEN NILAI v3 — GRID [Rp | nominal | %] ============ */

function valGrid(num, pctVal) {
  const v = Number(num) || 0;
  const s = Math.abs(v).toLocaleString('id-ID');
  const sign = v < 0 ? '-' : '';
  const pctCell = (pctVal === null || pctVal === undefined) ? '' : pctCellHtml(pctVal);
  return `
    <span class="val-grid">
      <span class="cur">Rp</span>
      <span class="amt">${sign}${s}</span>
      ${pctCell}
    </span>`;
}

function pctCellHtml(p) {
  const v = Number(p) || 0;
  const val = Math.round(v * 1000) / 10;
  return `<span class="pct">${val}%</span>`;
}

/* ---------- RENDER: REKAP ALOKASI (read-only, hasil formula) ---------- */

function renderKategoriSummary(k) {
  if (!k || !k.rows || !k.rows.length) return '';

  const rows = k.rows.map((r) => `
    <div class="alloc-row">
      <span class="alloc-name">${escapeHtml(r.nama)}</span>
      ${valGrid(r.nominal, r.pct)}
    </div>
  `).join('');

  return `
  <section class="setup-readonly">
    <div class="setup-sec-head">
      <span class="setup-sec-title">🧾 Rekap Alokasi</span>
      <span class="setup-sec-badge">otomatis</span>
    </div>
    <div>${rows}</div>
    <div class="alloc-sisa">
      <span class="alloc-sisa-label">Sisa Budget</span>
      ${valGrid(k.sisa.nominal, k.sisa.pct)}
    </div>
  </section>
  `;
}

/* ---------- RENDER: AKUN BANK (permanen, read-only) ---------- */

function renderBanks(b) {
  if (!b || !b.rows || !b.rows.length) return '';

  const rows = b.rows.map((r) => `
    <div class="alloc-row">
      <span class="alloc-name">${escapeHtml(r.nama)}</span>
      ${valGrid(r.saldo, null)}
    </div>
  `).join('');

  return `
  <section class="setup-readonly">
    <div class="setup-sec-head">
      <span class="setup-sec-title">🏦 Akun Bank — Saldo Awal</span>
      <span class="setup-sec-badge">permanen</span>
    </div>
    <div>${rows}</div>
    <div class="bank-total">
      <span class="alloc-sisa-label">Total Saldo Awal</span>
      ${valGrid(b.total, null)}
    </div>
  </section>
  `;
}

/* ---------- RENDER: TABEL BUDGET (editable) ---------- */

function renderTableSection(t) {
  const rowsHtml = (t.items || []).map((it) => `
    <div class="setup-row">
      <span class="setup-sub" title="${escapeHtml(it.sub)}">${escapeHtml(it.sub)}</span>
      <div class="setup-input-wrap">
        <span class="setup-input-rp">Rp</span>
        <input type="text" inputmode="numeric" autocomplete="off" placeholder="0" disabled
          id="setup-${t.id}-${it.row}"
          data-table="${t.id}" data-row="${it.row}"
          value="${it.value > 0 ? it.value.toLocaleString('id-ID') : ''}"
          class="setup-input custom-input">
      </div>
    </div>
  `).join('');

  return `
  <section class="setup-section" data-setup-table="${t.id}">
    <div class="setup-sec-head">
      <span class="setup-sec-title">${escapeHtml(t.label)}</span>
      ${valGrid(t.total, null)}
    </div>
    <div class="setup-rows">${rowsHtml}</div>
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

/* Formatter khusus setup: digit murni + titik ribuan, TANPA prefix "Rp"
   (prefix "Rp" sudah jadi label statis di kiri input) */
function formatSetupInput(el) {
  let digits = (el.value || '').replace(/[^0-9]/g, '');
  if (digits === '') { el.value = ''; return; }
  digits = digits.replace(/^0+(?=\d)/, '');
  el.value = Number(digits).toLocaleString('id-ID');
}

function onSetupInput(e) {
  formatSetupInput(e.target);
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

  // v3: angka total berada di .val-grid .amt pada header section
  const amt = section.querySelector('.setup-sec-head .val-grid .amt');
  if (amt) amt.textContent = sum.toLocaleString('id-ID');
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

function setStamp(text) {
  const stamp = document.getElementById('setupDataStamp');
  if (stamp) stamp.textContent = text;
}

function updateSetupStamp() {
  let teks;
  try {
    teks = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }) + ' WIB';
  } catch (err) {
    teks = new Date().toLocaleTimeString('en-GB', { hour12: false });
  }
  setStamp('📅 Data per ' + teks);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
