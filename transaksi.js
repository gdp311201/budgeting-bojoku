export const GAS_URL = "https://script.google.com/macros/s/AKfycbzqrpR8qrDH3Mr_qN8j95sJhjwRds2TokRm3SBCnTZmUWw2jW_wf7OMVoAX4h2LcxHKzw/exec";

export const SUB_DATA = {
  "💸 PINDAH DANA": ["SEABANK", "BCA", "MANDIRI", "DANA", "CASH"],
  "💵 PEMASUKAN": ["Gaji / Salary", "Bonus & Komisi", "Dividen Saham", "Pendapatan Lain-Lain", "Penjualan Aset / Properti", "Hibah / Hadiah Uang", "THR / Tunjangan Tahunan"],
  "🍚 KEBUTUHAN POKOK": ["Makanan", "Minuman", "Snack / Cemilan", "Kebutuhan Rumah Tangga", "Kebutuhan Dapur"],
  "🏠 TEMPAT TINGGAL": ["Sewa / KPR Rumah", "Maintenance Rumah", "Listrik", "Air", "Internet"],
  "🚌 TRANSPORTASI": ["BBM", "Ojek Online", "Transportasi Umum", "Maintenance Kendaraan"],
  "🩺 KESEHATAN": ["Vitamin & Obat", "Asuransi / BPJS", "Periksa ke Dokter"],
  "💇 PERAWATAN DIRI": ["Skincare", "Barbershop / Salon", "Bodycare", "Gym", "IPL", "Pilates", "Treatment"],
  "📚 PENGEMBANGAN DIRI": ["Pendidikan / Pelatihan", "Buku", "Kursus", "Aplikasi Belajar", "Webinar"],
  "💰 TABUNGAN/ INVESTASI": ["Safety Money", "Deposito Bank", "Reksadana", "Arisan", "Logam Mulia", "Saham"],
  "🎉 GAYA HIDUP/ HIBURAN": ["Makan di Luar", "Coffee Shop", "Subs (Nx, Spotify, dll.)", "Liburan / Traveling", "Hobi & Rekreasi", "Cash Out"],
  "💳 HUTANG / CICILAN": ["Pinjaman Modal Usaha", "Cicilan Kredit / Pinjaman", "Sumbangan & Donasi Rutin", "KPR"],
  "⚠️ LAIN-LAIN": ["Admin Bank", "Pengeluaran Tak Terduga", "Bantu Keluarga", "Barang Rusak", "Parkir"]
};

let fpInstance = null;

export function initTransaksi() {
  fpInstance = flatpickr("#tanggal", {
    dateFormat: "Y-m-d",
    defaultDate: "today",
    allowInput: true,
    clickOpens: true
  });

  const katEl = document.getElementById('kategori');
  const subEl = document.getElementById('subKategori');
  const akunEl = document.getElementById('akun');
  const nomEl = document.getElementById('nominal');
  const formEl = document.getElementById('txForm');
  const modalBtn = document.getElementById('modalBtn');

  if (katEl) katEl.addEventListener('change', handleCategoryChange);
  if (subEl) subEl.addEventListener('change', () => subEl.classList.remove('is-placeholder'));
  if (akunEl) akunEl.addEventListener('change', () => akunEl.classList.remove('is-placeholder'));
  if (nomEl) nomEl.addEventListener('keyup', (e) => formatRupiahInput(e.target));
  if (formEl) formEl.addEventListener('submit', handleSubmit);
  if (modalBtn) modalBtn.addEventListener('click', closeCuteModal);
}

export function handleCategoryChange() {
  const katEl = document.getElementById('kategori');
  const kat = katEl.value;
  const subSelect = document.getElementById('subKategori');
  const lblSub = document.getElementById('lblSubKategori');
  const lblAkun = document.getElementById('lblAkun');

  katEl.classList.remove('is-placeholder');

  if (kat === "💸 PINDAH DANA") {
    lblSub.innerText = "DARI REKENING (ASAL)";
    lblAkun.innerText = "KE REKENING (TUJUAN)";
  } else {
    lblSub.innerText = "SUB KATEGORI";
    lblAkun.innerText = "AKUN BANK";
  }

  subSelect.innerHTML = '<option value="" disabled selected hidden>-- Pilih Sub Kategori --</option>';
  subSelect.classList.add('is-placeholder');

  if (SUB_DATA[kat]) {
    SUB_DATA[kat].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.innerText = sub;
      subSelect.appendChild(opt);
    });
  }
}

export function formatRupiahInput(el) {
  let value = el.value.replace(/[^0-9]/g, '');
  if (value === '') {
    el.value = '';
    return;
  }
  let formatted = new Intl.NumberFormat('id-ID').format(value);
  el.value = 'Rp ' + formatted;
}

export async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.innerHTML = '<span>Memproses...</span>';

  const rawNominal = document.getElementById('nominal').value.replace(/[^0-9]/g, '');

  if (!rawNominal || parseInt(rawNominal) <= 0) {
    showCuteModal(false, "Opps!", "Silakan masukkan nominal transaksi yang valid dulu ya!");
    btn.disabled = false;
    btn.innerHTML = '<span>Simpan Transaksi</span>';
    return;
  }

  // Menambahkan properti action agar lolos pengecekan di Apps Script versi manapun
  const payload = {
    action: "simpanTransaksi",
    kolomA: document.getElementById('tanggal').value,
    kolomB: document.getElementById('kategori').value,
    kolomC: document.getElementById('subKategori').value,
    kolomD: rawNominal,
    kolomE: document.getElementById('akun').value
  };

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.result === "success" || result.status === "success") {
      showCuteModal(true, "Berhasil!", "Transaksi kamu berhasil dicatat ke Google Sheets!");
      
      document.getElementById('nominal').value = '';
      
      const katEl = document.getElementById('kategori');
      const subSelect = document.getElementById('subKategori');
      const akunEl = document.getElementById('akun');

      katEl.selectedIndex = 0;
      katEl.classList.add('is-placeholder');

      subSelect.innerHTML = '<option value="" disabled selected hidden>-- Pilih Sub Kategori --</option>';
      subSelect.classList.add('is-placeholder');

      akunEl.selectedIndex = 0;
      akunEl.classList.add('is-placeholder');
      
      if (fpInstance) fpInstance.setDate("today");
      handleCategoryChange();
    } else {
      showCuteModal(false, "Gagal Mencatat!", "Pesan dari Server: " + (result.message || "Gagal menyimpan data"));
    }

  } catch (err) {
    showCuteModal(false, "Gagal Mencatat!", "Terjadi kesalahan jaringan/sistem: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Simpan Transaksi</span>';
  }
}

export function showCuteModal(isSuccess, title, message) {
  const modal = document.getElementById('cuteModal');
  const modalIcon = document.getElementById('modalIcon');
  const modalIconBg = document.getElementById('modalIconBg');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalBtn = document.getElementById('modalBtn');

  if (isSuccess) {
    modalIcon.innerText = "✨";
    modalIconBg.className = "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-pink-100/80 border border-pink-200/80";
    modalTitle.className = "text-sm font-bold text-pink-950 mb-1";
    modalBtn.className = "w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-150 border border-pink-200/60";
  } else {
    modalIcon.innerText = "⚠️";
    modalIconBg.className = "w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-rose-100/80 border border-rose-200/80";
    modalTitle.className = "text-sm font-bold text-rose-950 mb-1";
    modalBtn.className = "w-full bg-gradient-to-r from-rose-400 to-red-400 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold py-2 px-4 rounded-xl shadow-sm transition duration-150 border border-rose-200/60";
  }

  modalTitle.innerText = title;
  modalMessage.innerText = message;
  modal.classList.remove('hidden');
}

export function closeCuteModal() {
  document.getElementById('cuteModal').classList.add('hidden');
}
