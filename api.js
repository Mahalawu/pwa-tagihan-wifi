// File: api.js - Smart Switch (Online / Offline)

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbx...MASUKKAN_URL_WEB_APP_ANDA_DISINI.../exec";

async function apiCall(action, payload = {}) {
  // ==========================================
  // 1. JIKA TERHUBUNG KE INTERNET
  // ==========================================
  if (navigator.onLine) {
    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: payload }),
        redirect: "follow"
      });

      if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

      const data = await response.json();

      // Cache otomatis daftar pelanggan ke HP setiap kali sukses fetch
      if (action === "getDaftarPelanggan" && data.success && Array.isArray(data.data)) {
        savePelangganToLocal(data.data);
      }

      return data;
    } catch (err) {
      console.warn(`[Network Fetch Failed] Mengalihkan aksi '${action}' ke Offline Mode...`);
    }
  }

  // ==========================================
  // 2. JIKA TERPUTUS DARI INTERNET (OFFLINE FALLBACK)
  // ==========================================
  console.log(`[Offline Engine] Memproses action: ${action}`);

  // A. Ambil semua pelanggan dari IndexedDB (Dapat digunakan oleh Kasir Offline)
  if (action === "getDaftarPelanggan") {
    const localData = await getAllPelangganLocal();
    return {
      success: true,
      data: localData,
      message: "Data pelanggan dimuat dari penyimpanan lokal HP."
    };
  }

  // B. Login Pelanggan Offline
  if (action === "loginPelanggan") {
    return await getPelangganLocal(payload.idPelanggan, payload.noHp);
  }

  // C. Simpan Transaksi Offline
  if (action === "simpanTransaksiBaru") {
    await savePendingTransaksi(payload);
    const now = new Date();
    const stringTgl = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    
    return {
      success: true,
      idTransaksi: "OFFLINE-" + stringTgl + "-" + Math.floor(1000 + Math.random() * 9000),
      tglCetak: now.toLocaleDateString('id-ID') + " " + now.toLocaleTimeString('id-ID'),
      message: "Transaksi tersimpan di HP! Akan disinkronkan otomatis saat ada internet."
    };
  }

  // D. Random Quote Offline
  if (action === "getRandomQuote") {
    return {
      success: true,
      quote: "Mode Offline Aktif ⚡ Transaksi Anda akan tersimpan secara lokal dan otomatis tersinkron saat terhubung internet."
    };
  }

  throw new Error("Mode Offline: Fitur ini memerlukan koneksi internet aktif.");
}

// ==========================================
// 3. AUTO-SYNC ENGINE Saat Internet Menyala Kembali
// ==========================================
window.addEventListener('online', async () => {
  console.log("🌐 Internet terhubung kembali! Memeriksa antrean transaksi offline...");
  
  try {
    const pendingList = await getPendingTransaksiFromLocal();
    
    if (pendingList && pendingList.length > 0) {
      console.log(`Menemukan ${pendingList.length} transaksi offline. Mengunggah ke Google Sheets...`);
      let successCount = 0;

      for (const tx of pendingList) {
        const idTemp = tx.idTemp;
        delete tx.idTemp;
        delete tx.created_at;

        const res = await fetch(GAS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "simpanTransaksiBaru", data: tx }),
          redirect: "follow"
        });

        const result = await res.json();
        if (result.success) {
          await removePendingTransaksiFromLocal(idTemp);
          successCount++;
        }
      }

      if (successCount > 0) {
        alert(`✅ ${successCount} Transaksi Offline berhasil disinkronkan ke Google Sheets!`);
        if (typeof muatRiwayatTransaksi === 'function') muatRiwayatTransaksi();
        if (typeof muatDashboard === 'function') muatDashboard();
      }
    }
  } catch (err) {
    console.error("Auto-sync error:", err);
  }
});
