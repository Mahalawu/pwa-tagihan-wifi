// File: db.js - IndexedDB Helper untuk Offline PWA

const DB_NAME = 'WiFiBillingDB';
const DB_VERSION = 2; // Naikkan ke versi 2 untuk mendukung user_admin
let dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      if (!db.objectStoreNames.contains('pelanggan')) {
        db.createObjectStore('pelanggan', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_transaksi')) {
        db.createObjectStore('offline_transaksi', { keyPath: 'idTemp', autoIncrement: true });
      }
      // Store untuk cache User Admin
      if (!db.objectStoreNames.contains('user_admin')) {
        db.createObjectStore('user_admin', { keyPath: 'username' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => reject('IndexedDB Error: ' + e.target.error);
  });
}

// ==========================================
// USER ADMIN OFFLINE FUNCTIONS
// ==========================================

// Simpan Cache User Admin ke HP
async function saveUserAdminToLocal(dataArray) {
  try {
    const db = await initDB();
    const tx = db.transaction('user_admin', 'readwrite');
    const store = tx.objectStore('user_admin');
    dataArray.forEach(u => {
      if (u && u.username) {
        u.username = u.username.toLowerCase().trim();
        store.put(u);
      }
    });
  } catch (err) {
    console.error("Gagal menyimpan cache user admin:", err);
  }
}

// Cek Login Admin Offline dari IndexedDB
async function loginAdminLocal(username, passwordPlain) {
  try {
    const db = await initDB();
    const passwordHash = await sha256(passwordPlain); // Hash input password
    
    return new Promise((resolve) => {
      const tx = db.transaction('user_admin', 'readonly');
      const store = tx.objectStore('user_admin');
      const req = store.get(username.toLowerCase().trim());

      req.onsuccess = () => {
        const u = req.result;
        if (u && u.passwordHash === passwordHash) {
          resolve({
            success: true,
            data: {
              username: u.username,
              nama: u.nama,
              level: u.level
            }
          });
        } else {
          resolve({ success: false, message: "Username atau Password salah (Offline Mode)!" });
        }
      };

      req.onerror = () => resolve({ success: false, message: "Gagal membaca data admin lokal." });
    });
  } catch (err) {
    return { success: false, message: "IndexedDB Error: " + err.message };
  }
}

// ==========================================
// PELANGGAN OFFLINE FUNCTIONS
// ==========================================

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
          resolve({ success: false, message: "Data tidak ditemukan secara offline! Pastikan pernah tersambung internet." });
        }
      };

      req.onerror = () => resolve({ success: false, message: "Gagal membaca database lokal HP." });
    });
  } catch (err) {
    return { success: false, message: "IndexedDB error: " + err.message };
  }
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

// ==========================================
// TRANSAKSI OFFLINE FUNCTIONS
// ==========================================

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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Function untuk enkripsi SHA-256 pada Login Admin Offline
function sha256(input) {
  async function hashMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return hashMessage(input);
}
