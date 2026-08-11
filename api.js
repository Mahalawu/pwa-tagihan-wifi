// File: api.js - Smart Switch (Online / Offline)

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzWfqD0Cxwsubj36faIwNodMxCwnaI44S5e0C0Ax5W8xmWmlpMVXH4k8fVZWG69Evqk/exec";
// File: api.js - Perbaikan Deteksi Online / Offline

async function apiCall(action, payload = {}) {
  // 1. CEK STATUS KONEKSI INTERNET BROWSER
  if (navigator.onLine) {
    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        // Menggunakan text/plain agar tidak memicu preflight request CORS yang diblokir oleh GAS
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: payload }),
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`Server GAS Merespon Error: Status ${response.status}`);
      }

      const data = await response.json();

      // Sinkronkan cache pelanggan otomatis ke HP jika berhasil mengambil daftar pelanggan
      if (action === "getDaftarPelanggan" && data.success && Array.isArray(data.data)) {
        if (typeof savePelangganToLocal === "function") {
          savePelangganToLocal(data.data);
        }
      }

      return data;

    } catch (err) {
      console.error(`[Fetch Error] Gagal berkomunikasi dengan GAS untuk action '${action}':`, err);
      
      // Jika memang benar-benar offline (jaringan terputus di tengah jalan)
      if (!navigator.onLine) {
        console.warn("Koneksi terputus, mengalihkan ke Offline Fallback Engine...");
      } else {
        // Jika internet aktif tapi GAS membalas error, lemparkan pesan error asli agar tidak menyamar jadi 'Mode Offline'
        throw new Error(`Gagal terhubung ke Server GAS (${err.message}). Pastikan URL GAS sudah benar dan dipublikasikan sebagai 'Anyone'.`);
      }
    }
  }

  // 2. JIKA HP MEMANG DALAM MOODE OFFLINE (Sinyal Mati/Airplane Mode)
  console.log(`[Offline Engine Active] Memproses action: ${action}`);

  if (action === "getDaftarPelanggan") {
    if (typeof getAllPelangganLocal === "function") {
      const localData = await getAllPelangganLocal();
      return {
        success: true,
        data: localData,
        message: "Data pelanggan dimuat dari penyimpanan lokal HP."
      };
    }
  }

  if (action === "loginPelanggan") {
    if (typeof getPelangganLocal === "function") {
      return await getPelangganLocal(payload.idPelanggan, payload.noHp);
    }
  }

  if (action === "simpanTransaksiBaru") {
    if (typeof savePendingTransaksi === "function") {
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
  }

  if (action === "getRandomQuote") {
    return {
      success: true,
      quote: "Mode Offline Aktif ⚡ Transaksi Anda akan tersimpan secara lokal dan otomatis tersinkron saat terhubung internet."
    };
  }

  throw new Error("Mode Offline: Fitur ini memerlukan koneksi internet aktif.");
}
