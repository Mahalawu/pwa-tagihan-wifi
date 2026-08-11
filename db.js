// File: db.js - IndexedDB Helper untuk Offline PWA

const DB_NAME = 'WiFiBillingDB';
const DB_VERSION = 1;
let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Database untuk cache pelanggan (login & pencarian kasir offline)
      if (!db.objectStoreNames.contains('pelanggan')) {
        db.createObjectStore('pelanggan', { keyPath: 'id' });
      }
      
      // Database untuk antrean transaksi offline
      if (!db.objectStoreNames.contains('offline_transaksi')) {
        db.createObjectStore('offline_transaksi', { keyPath: 'idTemp', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => reject('IndexedDB Error: ' + e.target.error);
  });
}

// Simpan/Cache daftar pelanggan ke IndexedDB saat online
async function savePelangganToLocal(dataArray) {
  try {
    const db = await initDB();
    const tx = db.transaction('pelanggan', 'readwrite');
    const store = tx.objectStore('pelanggan');
    dataArray.forEach(p => {
      if (p && p.id) {
        p.id = p.id.toUpperCase().trim();
        store.put(p);
      }
    });
  } catch (err) {
    console.error("Gagal menyimpan cache pelanggan:", err);
  }
}

// Ambil data login pelanggan dari IndexedDB saat offline
async function getPelangganLocal(id, hp) {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pelanggan', 'readonly');
      const store = tx.objectStore('pelanggan');
      const req = store.get(id.toUpperCase().trim());

      req.onsuccess = () => {
        const p = req.result;
        if (p && p.noHp.trim() === hp.trim()) {
          resolve({
            success: true,
            data: {
              id: p.id,
              nama: p.nama,
              alamat: p.alamat,
              paket: p.paket,
              harga: p.harga,
              tgl_tempo: p.tglTempo || "-",
              status: p.status || "Aktif",
              tunggakan: 0,
              bulanTunggakan: 0,
              pesanTunggakan: "Mode Offline (Data Ter-cache)"
            }
          });
        } else {
          resolve({ success: false, message: "Data tidak ditemukan secara offline! Pastikan pernah login saat online." });
        }
      };

      req.onerror = () => resolve({ success: false, message: "Gagal membaca database lokal HP." });
    });
  } catch (err) {
    return { success: false, message: "IndexedDB error: " + err.message };
  }
}

// Simpan transaksi pending saat offline
async function savePendingTransaksi(payload) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_transaksi', 'readwrite');
    const store = tx.objectStore('offline_transaksi');
    payload.created_at = new Date().toISOString();
    const req = store.add(payload);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject("Gagal menyimpan transaksi offline.");
  });
}

// Ambil semua transaksi pending
async function getPendingTransaksiFromLocal() {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('offline_transaksi', 'readonly');
    const store = tx.objectStore('offline_transaksi');
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// Hapus transaksi offline yang sudah berhasil di-sync ke GAS
async function removePendingTransaksiFromLocal(idTemp) {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('offline_transaksi', 'readwrite');
    const store = tx.objectStore('offline_transaksi');
    const req = store.delete(idTemp);

    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
  });
}
// Ambil seluruh daftar pelanggan dari IndexedDB untuk pencarian Kasir Offline
async function getAllPelangganLocal() {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pelanggan', 'readonly');
      const store = tx.objectStore('pelanggan');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error("Gagal mengambil pelanggan lokal:", err);
    return [];
  }
}
