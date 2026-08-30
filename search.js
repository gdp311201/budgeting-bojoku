<!-- MODUL 5: PENCARIAN BIAYA -->
    <div id="viewSearch" class="app-module hidden transition-all duration-300 space-y-3.5">
      <div class="flex items-center justify-between pb-2 border-b border-pink-200/50">
        <div>
          <h1 class="text-base font-bold text-pink-950/80 tracking-wide">PENCARIAN BIAYA</h1>
          <p class="text-[11px] text-pink-800/60 font-medium">Cari & filter histori riwayat pengeluaran</p>
        </div>
        <button id="btnRefreshSearch" class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-pink-100/80 text-pink-800 border border-pink-200 shadow-sm hover:bg-pink-200 transition">
          🔄 Refresh
        </button>
      </div>

      <!-- FILTER BOX -->
      <div class="glass-mini rounded-2xl p-3 border border-pink-200/60 shadow-sm space-y-2">
        <div class="relative">
          <input 
            type="text" 
            id="searchKeyword" 
            placeholder="Cari transaksi, ketik 'seabank', 'makan', dll..." 
            class="w-full custom-input rounded-xl pl-8 pr-3 py-2 text-xs font-medium"
          >
          <span class="absolute left-2.5 top-2.5 text-xs text-pink-400">🔍</span>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          <div>
            <label class="block text-[9px] font-bold uppercase text-pink-900/70 mb-0.5">Bulan</label>
            <select id="searchBulan" class="w-full custom-input select-compact rounded-xl py-1.5 font-semibold text-xs">
              <option value="ALL" selected>SEMUA</option>
              <option value="JANUARI">JANUARI</option>
              <option value="FEBRUARI">FEBRUARI</option>
              <option value="MARET">MARET</option>
              <option value="APRIL">APRIL</option>
              <option value="MEI">MEI</option>
              <option value="JUNI">JUNI</option>
              <option value="JULI">JULI</option>
              <option value="AGUSTUS">AGUSTUS</option>
              <option value="SEPTEMBER">SEPTEMBER</option>
              <option value="OKTOBER">OKTOBER</option>
              <option value="NOVEMBER">NOVEMBER</option>
              <option value="DESEMBER">DESEMBER</option>
            </select>
          </div>
          <div>
            <label class="block text-[9px] font-bold uppercase text-pink-900/70 mb-0.5">Tahun</label>
            <select id="searchTahun" class="w-full custom-input select-compact rounded-xl py-1.5 font-semibold text-xs">
              <option value="2026" selected>2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="ALL">SEMUA</option>
            </select>
          </div>
          <div>
            <label class="block text-[9px] font-bold uppercase text-pink-900/70 mb-0.5">Urutan</label>
            <select id="searchSort" class="w-full custom-input select-compact rounded-xl py-1.5 font-semibold text-xs">
              <option value="DESC" selected>Terbaru</option>
              <option value="ASC">Terlama</option>
            </select>
          </div>
        </div>
      </div>

      <!-- STAT REKAP RINGKAS HASIL CARI -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-300/60 p-2.5 rounded-2xl text-center">
          <span class="text-[9px] font-bold text-pink-900/70 uppercase block">Total Transaksi</span>
          <span id="searchTotalCount" class="text-sm font-extrabold text-pink-950 block mt-0.5">0 Transaksi</span>
        </div>
        <div class="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-300/60 p-2.5 rounded-2xl text-center">
          <span class="text-[9px] font-bold text-rose-900/70 uppercase block">Total Nominal</span>
          <span id="searchTotalNominal" class="text-sm font-extrabold text-rose-950 block mt-0.5">Rp 0</span>
        </div>
      </div>

      <!-- LIST HASIL PENCARIAN -->
      <div class="glass-mini rounded-2xl p-3 border border-pink-200/60 shadow-sm">
        <div id="searchListContainer" class="max-h-[380px] overflow-y-auto pr-1 space-y-2">
          <p class="text-center text-xs text-pink-800/60 py-6">Memuat data pencarian...</p>
        </div>
      </div>
    </div>
