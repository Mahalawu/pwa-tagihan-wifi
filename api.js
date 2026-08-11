// File: api.js - Smart Switch (Online / Offline)

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzWfqD0Cxwsubj36faIwNodMxCwnaI44S5e0C0Ax5W8xmWmlpMVXH4k8fVZWG69Evqk/exec";

async function apiCall(action, payload = {}) {
  // ==========================================
  // 1. CEK STATUS KONEKSI INTERNET BROWSER
  // ==========================================
  if (navigator.onLine) {
    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: payload }),
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`Server GAS Merespon Error: Status ${response.status}`);
      }

      const data = await response.json();

      // Sinkronkan cache pelanggan otomatis jika berhasil
      if (action === "getDaftarPelanggan" && data.success && Array.isArray(data.data)) {
        if (typeof savePelangganToLocal === "function") {
          savePelangganToLocal(data.data);
        }
      }

      // Sinkronkan cache user admin otomatis
      if (action === "getDaftarUser" && data.success && Array.isArray(data.data)) {
        if (typeof saveUserAdminToLocal === "function") {
          saveUserAdminToLocal(data.data);
        }
      }

      return data;

    } catch (err) {
      console.error(`[Fetch Error] Gagal berkomunikasi dengan GAS untuk action '${action}':`, err);
      
      if (!navigator.onLine) {
        console.warn("Koneksi terputus, mengalihkan ke Offline Fallback Engine...");
      } else {
        throw new Error(`Gagal terhubung ke Server GAS (${err.message}). Pastikan URL GAS sudah benar dan dipublikasikan sebagai 'Anyone'.`);
      }
    }
  }

  // ==========================================
  // 2. JIKA DALAM MODE OFFLINE (Sinyal Mati/Airplane Mode)
  // ==========================================
  console.log(`[Offline Engine Active] Memproses action: ${action}`);

  if (action === "getDaftarPelanggan") {
    if (typeof getAllPelangganLocal === "function") {
      const localData = await getAllPelangganLocal();
      return {
        success: true,
        data: localData,
        message: "Data pelanggan dimuat dari penyimpanan lokal HP/Laptop."
      };
    }
  }

  if (action === "loginPelanggan") {
    if (typeof getPelangganLocal === "function") {
      return await getPelangganLocal(payload.idPelanggan, payload.noHp);
    }
  }

  if (action === "loginAdmin") {
    if (typeof loginAdminLocal === "function") {
      return await loginAdminLocal(payload.username, payload.password);
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
        message: "Transaksi tersimpan di perangkat! Akan disinkronkan otomatis saat ada internet."
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
} // <--- FUNGSI apiCall SELESAI DI SINI!

// ==========================================
// 3. AUTO-SYNC ENGINE (DI LUAR FUNGSI apiCall)
// ==========================================
window.addEventListener('online', async () => {
  console.log("🌐 Internet terhubung kembali! Memeriksa antrean transaksi offline...");
  
  try {
    if (typeof getPendingTransaksiFromLocal === "function") {
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
    }
  } catch (err) {
    console.error("Auto-sync error:", err);
  }
});
