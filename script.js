// File: script.js

// ========================================
// GLOBAL VARIABLES
// ========================================
var INITIAL_TAB = "produk";
var LOGGED_IN_ADMIN = "";
var LOGGED_IN_LEVEL = "";
var DATA_LIST_PAKET = []; 
var EDIT_MODE = false;

// ========================================
// DOM READY
// ========================================
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM Ready - Memulai inisialisasi PWA Client...");
    loadRandomQuote();
    loadPaketData();
    loadPaketDropdown();
    if (navigator.onLine) {
        apiCall("getDaftarPelanggan").then(res => {
            console.log("✅ Database pelanggan berhasil di-cache ke HP untuk Login Offline!");
        }).catch(err => {
            console.warn("Gagal pre-cache database pelanggan:", err);
        });
    }

    console.log("Inisialisasi selesai!");
});

// ========================================
// PAKET FUNCTIONS (DEFENSIVE VERSION)
// ========================================
async function loadPaketData() {
    console.log("Loading paket data...");
    try {
        const res = await apiCall("getPaketData");
        console.log("Respon mentah getPaketData:", res);

        // Ekstrak array dari berbagai kemungkinan struktur respon
        let dataList = [];
        if (Array.isArray(res)) {
            dataList = res;
        } else if (res && Array.isArray(res.data)) {
            dataList = res.data;
        } else if (res && typeof res === 'object') {
            // Jika dikembalikan objek berisi nilai lain
            dataList = Object.values(res).find(val => Array.isArray(val)) || [];
        }

        console.log("Paket data berhasil diekstrak:", dataList.length);

        if (dataList.length === 0) {
            document.getElementById('container-paket').innerHTML = 
                `<div class="alert alert-warning w-100 text-center">Belum ada data paket di Spreadsheet 'Paket'.</div>`;
            return;
        }

        let html = '';
        dataList.forEach(p => {
            html += `<div class="col"><div class="card h-100 card-paket"><div class="card-header-custom text-primary"><i class="fa-solid fa-gauge-high me-2 text-info"></i>${p.nama}</div><div class="card-body d-flex flex-column justify-content-between"><div><h2 class="fw-bold my-1 text-dark">${p.kecepatan}</h2><p class="text-muted small bg-light p-1 rounded">Fitur: ${p.fitur}</p></div><h5 class="text-success fw-bold mb-0">Rp ${Number(p.harga).toLocaleString('id-ID')}<span class="fs-6 text-muted fw-normal">/bln</span></h5></div></div></div>`;
        });
        document.getElementById('container-paket').innerHTML = html;

    } catch(err) {
        console.error("Error loading paket:", err);
        document.getElementById('container-paket').innerHTML = 
            `<div class="alert alert-danger w-100 text-center">Gagal memuat paket data: ${err.message}</div>`;
    }
}

async function loadPaketDropdown() {
    console.log("Loading paket dropdown...");
    try {
        const res = await apiCall("getPaketData");
        let paket = [];
        
        if (Array.isArray(res)) {
            paket = res;
        } else if (res && Array.isArray(res.data)) {
            paket = res.data;
        }

        if (!Array.isArray(paket) || paket.length === 0) return;

        DATA_LIST_PAKET = paket;
        let opsi = '<option value="">-- Pilih Paket --</option>';
        paket.forEach(p => { 
            opsi += `<option value="${p.nama}" data-harga="${p.harga}">${p.nama} (${p.kecepatan})</option>`; 
        });
        document.getElementById('crud-plg-paket').innerHTML = opsi;
    } catch(err) {
        console.error("Error loading paket dropdown:", err);
    }
}// ========================================
// NAVIGATION FUNCTIONS
// ========================================
function switchTab(tabName) {
    console.log("Switch tab:", tabName);
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + tabName).classList.remove('d-none');
    if (tabName === 'produk') document.getElementById('btn-produk').classList.add('active');
    if (tabName === 'login-pelanggan') document.getElementById('btn-login').classList.add('active');
    if (tabName === 'login-admin') document.getElementById('btn-admin').classList.add('active');
}

function switchAdminTab(tabName) {
    console.log("Switch admin tab:", tabName);
    
    document.querySelectorAll('.admin-tab-content').forEach(function(el) {
        el.classList.add('d-none');
    });
    
    var targetContent = document.getElementById('konten-' + tabName);
    if (targetContent) {
        targetContent.classList.remove('d-none');
    } else {
        console.error("Konten tidak ditemukan:", tabName);
    }
    
    document.querySelectorAll('#admin-nav-container .btn').forEach(function(btn) {
        btn.classList.remove('active-tab-btn', 'btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    
    var activeButton = document.getElementById('tab-' + tabName + '-btn');
    if (activeButton) {
        activeButton.classList.remove('btn-outline-primary');
        activeButton.classList.add('active-tab-btn', 'btn-primary');
    }
    
    if (tabName === 'dashboard') {
        muatDashboard();
    } else if (tabName === 'laporan') {
        muatLaporanKeuangan();
    } else if (tabName === 'riwayat') {
        muatRiwayatTransaksi();
    } else if (tabName === 'pelanggan') {
        muatTabelKelolaPelanggan();
    } else if (tabName === 'user') {
        muatTabelUser();
    }
    if (tabName === 'laporan') {
        aturAksesPengeluaran();
    }
}

function aturAksesPengeluaran() {
    var userLevel = sessionStorage.getItem('userLevel') || LOGGED_IN_LEVEL;
    var btnTambah = document.getElementById('btn-tambah-pengeluaran');
    var formContainer = document.getElementById('form-pengeluaran-container');
    
    if (!btnTambah || !formContainer) return;
    
    if (userLevel === 'superadmin') {
        btnTambah.style.display = 'inline-block';
        formContainer.style.display = 'block';
    } else {
        btnTambah.style.display = 'none';
        formContainer.style.display = 'none';
    }
}

// ========================================
// LOGIN FUNCTIONS
// ========================================
async function prosesLoginPelanggan() {
    console.log("Login pelanggan...");
    let id = document.getElementById('login-id').value;
    let hp = document.getElementById('login-hp').value;
    
    if(!id || !hp) {
        document.getElementById('login-error').innerText = "Mohon isi ID dan No HP!";
        return;
    }
    
    id = id.toUpperCase().trim();
    document.getElementById('login-error').innerText = "Memverifikasi...";
    
    try {
        const res = await apiCall("loginPelanggan", { idPelanggan: id, noHp: hp });
        console.log("Login pelanggan result:", res);
        
        if(res.success && res.data) {
            document.getElementById('dash-nama').innerText = res.data.nama || "-";
            document.getElementById('dash-paket').innerText = res.data.paket || "-";
            document.getElementById('dash-harga').innerText = res.data.harga ? "Rp " + Number(res.data.harga).toLocaleString('id-ID') : "Rp 0";
            document.getElementById('dash-tempo').innerText = res.data.tgl_tempo || "-";
            
            var tunggakanText = "Rp " + Number(res.data.tunggakan || 0).toLocaleString('id-ID');
            if (res.data.bulanTunggakan > 0) {
                tunggakanText += " (" + res.data.bulanTunggakan + " bulan)";
            }
            document.getElementById('dash-tunggakan').innerText = tunggakanText;
            
            var statusBadge = '';
            if (res.data.status === 'Aktif') {
                statusBadge = '<span class="badge bg-success">● Aktif</span>';
            } else if (res.data.status === 'Isolir') {
                statusBadge = '<span class="badge bg-danger">● Isolir</span>';
            } else {
                statusBadge = '<span class="badge bg-secondary">● Non-Aktif</span>';
            }
            document.getElementById('dash-status').innerHTML = statusBadge;
            
            document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
            document.getElementById('section-dashboard').classList.remove('d-none');
            document.getElementById('login-error').innerText = "";
        } else {
            document.getElementById('login-error').innerText = res.message || "Data tidak ditemukan!";
        }
    } catch(err) {
        console.error("Login error:", err);
        document.getElementById('login-error').innerText = "Error: " + err.message;
    }
}

async function prosesLoginAdmin() {
    console.log("Login admin...");
    let user = document.getElementById('admin-user').value;
    let pass = document.getElementById('admin-pass').value;
    
    if(!user || !pass) {
        document.getElementById('admin-login-error').innerText = "Mohon isi username dan password!";
        return;
    }
    
    document.getElementById('admin-login-error').innerText = "Mengecek otorisasi...";
    
    try {
        const res = await apiCall("loginAdmin", { username: user, password: pass });
        console.log("Login admin result:", res.success);
        
        if(res.success) {
            LOGGED_IN_ADMIN = res.data.nama;
            LOGGED_IN_LEVEL = res.data.level;
            
            document.getElementById('adm-nama-display').innerText = res.data.nama;
            document.getElementById('adm-level-display').innerText = res.data.level;
            
            renderAdminMenu(res.data.level);
            
            document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
            document.getElementById('section-panel-admin').classList.remove('d-none');
            
            var defaultMenu = MENU_CONFIG[res.data.level] ? MENU_CONFIG[res.data.level][0].id : 'kasir';
            switchAdminTab(defaultMenu);
        } else {
            document.getElementById('admin-login-error').innerText = res.message;
        }
    } catch(err) {
        console.error("Login admin error:", err);
        document.getElementById('admin-login-error').innerText = "Error: " + err.message;
    }
}

function logoutAdmin() {
    LOGGED_IN_ADMIN = "";
    LOGGED_IN_LEVEL = "";
    EDIT_MODE = false;
    
    document.getElementById('admin-nav-container').innerHTML = '';
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
    document.getElementById('section-produk').classList.remove('d-none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-produk').classList.add('active');
    document.getElementById('section-panel-admin').classList.add('d-none');
    document.getElementById('admin-user').value = "";
    document.getElementById('admin-pass').value = "";
    document.getElementById('admin-login-error').innerText = "";
    window.scrollTo(0, 0);
}

function logoutPelanggan() {
    if (confirm("Yakin ingin keluar?")) {
        document.querySelectorAll('.app-section').forEach(s => s.classList.add('d-none'));
        document.getElementById('section-produk').classList.remove('d-none');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btn-produk').classList.add('active');
        document.getElementById('login-id').value = "";
        document.getElementById('login-hp').value = "";
        document.getElementById('login-error').innerText = "";
        document.getElementById('dash-nama').innerText = "";
        document.getElementById('dash-paket').innerText = "";
        document.getElementById('dash-harga').innerText = "";
        document.getElementById('dash-tempo').innerText = "";
        document.getElementById('dash-tunggakan').innerText = "Rp 0";
        document.getElementById('dash-status').innerHTML = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ========================================
// QUOTES FUNCTIONS
// ========================================
async function loadRandomQuote() {
    try {
        const res = await apiCall("getRandomQuote");
        var quoteElement = document.getElementById('hero-quote');
        if (quoteElement && res.quote) {
            quoteElement.innerHTML = '<span class="text-amber-400">“</span><i>' + res.quote + '</i><span class="text-amber-400">”</span>';
        }
    } catch(err) {
        console.error("Error loading quote:", err);
    }
}

// ========================================
// KASIR FUNCTIONS
// ========================================
async function prosesCariPelanggan() {
    var keyword = document.getElementById('kasir-cari-id').value.trim();
    if (!keyword) {
        document.getElementById('kasir-notif-cari').innerText = "Masukkan ID atau Nama Pelanggan!";
        document.getElementById('kasir-hasil-pencarian').innerHTML = '';
        return;
    }
    
    document.getElementById('kasir-notif-cari').innerText = "Mencari...";
    
    try {
        const res = await apiCall("getDaftarPelanggan");
        const data = res.data || [];
        
        var keywordLower = keyword.toLowerCase();
        var hasil = data.filter(function(p) {
            var idMatch = (p.id || '').toLowerCase().includes(keywordLower);
            var namaMatch = (p.nama || '').toLowerCase().includes(keywordLower);
            return idMatch || namaMatch;
        });
        
        if (hasil.length === 0) {
            document.getElementById('kasir-notif-cari').innerText = "Tidak ada pelanggan yang cocok!";
            document.getElementById('kasir-hasil-pencarian').innerHTML = '';
            return;
        }
        
        document.getElementById('kasir-notif-cari').innerText = "Menampilkan " + hasil.length + " hasil";
        
        var html = '<div class="list-group list-group-flush">';
        hasil.forEach(function(p) {
            var statusBadge = p.status === 'Aktif' ? 'bg-success' : (p.status === 'Isolir' ? 'bg-danger' : 'bg-secondary');
            html += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                     style="cursor: pointer; padding: 8px 10px;" 
                     onclick="pilihPelanggan('${p.id}', '${p.nama}', '${p.paket}', ${p.harga})">
                    <div>
                        <span class="fw-bold">${p.id}</span>
                        <span class="ms-2">${p.nama}</span>
                        <span class="badge ${statusBadge} ms-2">${p.status}</span>
                        <br>
                        <small class="text-muted">${p.paket} - Rp ${Number(p.harga).toLocaleString('id-ID')}</small>
                    </div>
                    <i class="fa-solid fa-chevron-right text-secondary"></i>
                </div>
            `;
        });
        html += '</div>';
        
        document.getElementById('kasir-hasil-pencarian').innerHTML = html;
    } catch(err) {
        console.error("Error:", err);
        document.getElementById('kasir-notif-cari').innerText = "Error: " + err.message;
    }
}

function pilihPelanggan(id, nama, paket, harga) {
    document.getElementById('kasir-id-plg').value = id;
    document.getElementById('kasir-nama').value = nama;
    document.getElementById('kasir-paket').value = paket;
    document.getElementById('kasir-jumlah').value = harga;
    
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById('kasir-periode').value = yyyy + '-' + mm;
    
    document.getElementById('btn-simpan-tx').removeAttribute('disabled');
    document.getElementById('kasir-notif-cari').innerText = "✅ Pelanggan dipilih: " + nama;
    document.getElementById('kasir-hasil-pencarian').innerHTML = '';
    
    document.querySelector('#konten-kasir .col-md-7').scrollIntoView({ behavior: 'smooth' });
}

async function prosesSimpanTransaksi() {
    var idPlg = document.getElementById('kasir-id-plg').value;
    var nama = document.getElementById('kasir-nama').value;
    var paket = document.getElementById('kasir-paket').value;
    var jumlah = document.getElementById('kasir-jumlah').value;
    var metode = document.getElementById('kasir-metode').value;
    var periodeVal = document.getElementById('kasir-periode').value;
    
    if(!idPlg || !nama || !paket || !jumlah) {
        document.getElementById('kasir-notif-simpan').className = "text-danger text-center mt-2 small";
        document.getElementById('kasir-notif-simpan').innerText = "Data pelanggan belum lengkap!";
        return;
    }

    var periodeBayarFormatted = "";
    if (periodeVal) {
        var parts = periodeVal.split('-');
        var year = parts[0];
        var monthIndex = parseInt(parts[1], 10) - 1;
        var namaBulan = ["January", "February", "March", "April", "May", "June", 
                         "July", "August", "September", "October", "November", "December"];
        periodeBayarFormatted = namaBulan[monthIndex] + " " + year;
    }

    document.getElementById('kasir-notif-simpan').className = "text-warning text-center mt-2 small";
    document.getElementById('kasir-notif-simpan').innerText = "Menyimpan ke database...";

    try {
        const payload = {
            idPelanggan: idPlg,
            nama: nama,
            paket: paket,
            jumlah: jumlah,
            metode: metode,
            petugas: LOGGED_IN_ADMIN,
            periodeBayar: periodeBayarFormatted
        };
        
        const res = await apiCall("simpanTransaksiBaru", payload);
        
        if(res.success) {
            document.getElementById('kasir-notif-simpan').className = "text-success text-center mt-2 small";
            document.getElementById('kasir-notif-simpan').innerText = "Transaksi Berhasil Disimpan!";
            
            document.getElementById('p-idtx').innerText = res.idTransaksi;
            document.getElementById('p-tgl').innerText = res.tglCetak;
            document.getElementById('p-idplg').innerText = idPlg.toUpperCase();
            document.getElementById('p-nama').innerText = nama;
            document.getElementById('p-paket').innerText = paket;
            document.getElementById('p-periode').innerText = formatBulanIndo(periodeBayarFormatted || "-");
            document.getElementById('p-adm').innerText = LOGGED_IN_ADMIN;
            document.getElementById('p-total').innerText = Number(jumlah).toLocaleString('id-ID');
            
            var targetUrl = "https://sites.google.com/view/wifiansolution/billing";
            var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(targetUrl);
            document.getElementById('p-qrcode').src = qrUrl;

            var invoiceEl = document.getElementById('area-cetak-invoice');
            invoiceEl.style.display = 'block';
            invoiceEl.style.position = 'fixed';
            invoiceEl.style.top = '50%';
            invoiceEl.style.left = '50%';
            invoiceEl.style.transform = 'translate(-50%, -50%)';
            invoiceEl.style.zIndex = '9999';
            invoiceEl.style.background = 'white';
            invoiceEl.style.padding = '20px';
            invoiceEl.style.borderRadius = '10px';
            invoiceEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
            invoiceEl.style.width = '350px';
            invoiceEl.style.maxWidth = '95%';
            invoiceEl.style.maxHeight = '90vh';
            invoiceEl.style.overflow = 'auto';
            
            document.querySelectorAll('#area-cetak-invoice .no-print').forEach(el => {
                el.style.display = 'block';
            });
            
            document.getElementById('kasir-cari-id').value = "";
            document.getElementById('kasir-id-plg').value = "";
            document.getElementById('kasir-nama').value = "";
            document.getElementById('kasir-paket').value = "";
            document.getElementById('kasir-jumlah').value = "";
            document.getElementById('kasir-periode').value = "";
            document.getElementById('btn-simpan-tx').setAttribute('disabled', true);
            
            invoiceEl.scrollIntoView({ behavior: 'smooth' });
        } else {
            document.getElementById('kasir-notif-simpan').className = "text-danger text-center mt-2 small";
            document.getElementById('kasir-notif-simpan').innerText = res.message;
        }
    } catch(err) {
        console.error("Simpan transaksi error:", err);
        document.getElementById('kasir-notif-simpan').className = "text-danger text-center mt-2 small";
        document.getElementById('kasir-notif-simpan').innerText = "Error: " + err.message;
    }
}

// ========================================
// GLOBAL VARIABLES UNTUK TRANSAKSI
// ========================================
var semuaDataTransaksi = [];
var dataTransaksiFiltered = [];
var currentPageTransaksi = 1;
var itemsPerPageTransaksi = 10;

// ========================================
// RIWAYAT FUNCTIONS
// ========================================
async function muatRiwayatTransaksi() {
    document.getElementById('tabel-body-riwayat').innerHTML = `
        <tr><td colspan="10" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-secondary"></div> Memuat log...
        </td></tr>
    `;
    
    try {
        const res = await apiCall("getRiwayatTransaksi");
        const data = res.data || [];
        
        semuaDataTransaksi = data;
        document.getElementById('totalTransaksiLabel').innerText = 'Total: ' + data.length + ' transaksi';
        currentPageTransaksi = 1;
        itemsPerPageTransaksi = parseInt(document.getElementById('limitTransaksi').value) || 10;
        
        renderTabelTransaksi();
    } catch(err) {
        console.error("Load riwayat error:", err);
        document.getElementById('tabel-body-riwayat').innerHTML = `
            <tr><td colspan="10" class="text-center text-danger">Error loading data: ${err.message}</td></tr>
        `;
    }
}

function renderTabelTransaksi() {
    var keyword = document.getElementById('searchTransaksi').value.toLowerCase().trim();
    var metodeFilter = document.getElementById('filterMetodeTransaksi').value;
    var sortBy = document.getElementById('sortTransaksi').value;
    itemsPerPageTransaksi = parseInt(document.getElementById('limitTransaksi').value) || 10;
    
    dataTransaksiFiltered = semuaDataTransaksi.filter(function(tx) {
        if (metodeFilter !== 'semua' && tx.metode !== metodeFilter) return false;
        if (keyword) {
            var searchFields = [
                (tx.idTx || '').toLowerCase(),
                (tx.idPlg || '').toLowerCase(),
                (tx.nama || '').toLowerCase(),
                (tx.paket || '').toLowerCase()
            ];
            return searchFields.some(field => field.includes(keyword));
        }
        return true;
    });
    
    var userLevel = sessionStorage.getItem('userLevel') || LOGGED_IN_LEVEL;
    var isSuperadmin = (userLevel === 'superadmin');
    
    dataTransaksiFiltered.sort(function(a, b) {
        switch(sortBy) {
            case 'idTx': return a.idTx.localeCompare(b.idTx);
            case 'idPlg': return a.idPlg.localeCompare(b.idPlg);
            case 'nama': return a.nama.localeCompare(b.nama);
            case 'paket': return a.paket.localeCompare(b.paket);
            case 'tanggal': return parseTanggal(a.tanggal) - parseTanggal(b.tanggal);
            case 'tanggal_desc': return parseTanggal(b.tanggal) - parseTanggal(a.tanggal);
            case 'jumlah': return (Number(a.jumlah) || 0) - (Number(b.jumlah) || 0);
            case 'jumlah_desc': return (Number(b.jumlah) || 0) - (Number(a.jumlah) || 0);
            case 'bulan': return a.bulan.localeCompare(b.bulan);
            case 'metode': return a.metode.localeCompare(b.metode);
            default: return parseTanggal(b.tanggal) - parseTanggal(a.tanggal);
        }
    });
    
    var totalData = dataTransaksiFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPageTransaksi);
    
    if (currentPageTransaksi > totalPages) currentPageTransaksi = totalPages;
    if (currentPageTransaksi < 1) currentPageTransaksi = 1;
    if (totalPages === 0) currentPageTransaksi = 1;
    
    var startIndex = (currentPageTransaksi - 1) * itemsPerPageTransaksi;
    var endIndex = Math.min(startIndex + itemsPerPageTransaksi, totalData);
    var dataPage = dataTransaksiFiltered.slice(startIndex, endIndex);
    
    var tbody = document.getElementById('tabel-body-riwayat');
    
    if (dataPage.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-3 text-muted">
            ${keyword || metodeFilter !== 'semua' ? 'Tidak ada data yang sesuai dengan filter' : 'Belum ada riwayat transaksi.'}
        </td></tr>`;
    } else {
        var html = '';
        dataPage.forEach(function(r) {
            var metodeBadge = '';
            if (r.metode === 'Tunai') metodeBadge = 'bg-success-subtle text-success border border-success';
            else if (r.metode === 'Transfer Bank') metodeBadge = 'bg-primary-subtle text-primary border border-primary';
            else if (r.metode === 'QRIS') metodeBadge = 'bg-info-subtle text-info border border-info';
            else metodeBadge = 'bg-secondary-subtle text-secondary border border-secondary';
            
            var aksiHtml = '';
            if (isSuperadmin) {
                aksiHtml = `
                    <button class="btn btn-info btn-aksi" onclick='cetakUlangInvoice("${r.idTx}")' title="Cetak Ulang Invoice">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    <button class="btn btn-danger btn-aksi" onclick='hapusTransaksi("${r.idTx}", "${r.nama}", "${r.tanggal}")' title="Hapus Transaksi">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            } else {
                aksiHtml = `<span class="text-muted small"><i class="fa-solid fa-lock me-1"></i></span>`;
            }
            
            html += `<tr>
                <td class="fw-bold text-primary">${r.idTx}</td>
                <td><span class="badge bg-light text-dark border">${r.idPlg}</span></td>
                <td>${r.nama}</td>
                <td><span class="badge bg-info-subtle text-info border border-info">${r.paket}</span></td>
                <td>${r.tanggal}</td>
                <td class="text-success fw-bold">Rp ${Number(r.jumlah).toLocaleString('id-ID')}</td>
                <td><span class="badge bg-secondary-subtle text-secondary border border-secondary">${r.bulan}</span></td>
                <td><span class="badge ${metodeBadge}">${r.metode}</span></td>
                <td class="text-muted small">${r.keterangan || '-'}</td>
                <td class="text-center">${aksiHtml}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
    
    document.getElementById('infoTransaksi').innerText = 
        `Menampilkan ${totalData > 0 ? startIndex + 1 : 0} - ${endIndex} dari ${totalData} data`;
    
    renderPaginationTransaksi(totalPages);
}

function parseTanggal(tglStr) {
    if (!tglStr) return new Date(0);
    var parts = tglStr.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(tglStr);
}

function renderPaginationTransaksi(totalPages) {
    var paginationEl = document.getElementById('paginationTransaksi');
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    var html = '';
    html += `<li class="page-item ${currentPageTransaksi === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPageTransaksi(${currentPageTransaksi - 1}); return false;">«</a>
    </li>`;
    
    var startPage = Math.max(1, currentPageTransaksi - 2);
    var endPage = Math.min(totalPages, currentPageTransaksi + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPageTransaksi(1); return false;">1</a></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    
    for (var i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPageTransaksi ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPageTransaksi(${i}); return false;">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPageTransaksi(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${currentPageTransaksi === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPageTransaksi(${currentPageTransaksi + 1}); return false;">»</a>
    </li>`;
    
    paginationEl.innerHTML = html;
}

function goToPageTransaksi(page) {
    var totalData = dataTransaksiFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPageTransaksi);
    
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    currentPageTransaksi = page;
    renderTabelTransaksi();
}

function sortTransaksi(field) {
    var sortMap = {
        'idTx': 'idTx',
        'idPlg': 'idPlg',
        'nama': 'nama',
        'paket': 'paket',
        'tanggal': 'tanggal_desc',
        'jumlah': 'jumlah_desc',
        'bulan': 'bulan',
        'metode': 'metode'
    };
    
    var currentSort = document.getElementById('sortTransaksi').value;
    var newSort = sortMap[field] || 'tanggal_desc';
    
    if (currentSort === newSort) {
        if (newSort.includes('_desc')) {
            document.getElementById('sortTransaksi').value = newSort.replace('_desc', '');
        } else {
            document.getElementById('sortTransaksi').value = newSort + '_desc';
        }
    } else {
        document.getElementById('sortTransaksi').value = newSort;
    }
    
    renderTabelTransaksi();
}

// ========================================
// GLOBAL VARIABLES UNTUK PELANGGAN
// ========================================
var semuaDataPelanggan = [];
var dataPelangganFiltered = [];
var currentPage = 1;
var itemsPerPage = 10;

// ========================================
// KELOLA PELANGGAN FUNCTIONS
// ========================================
async function muatTabelKelolaPelanggan() {
    var userLevel = sessionStorage.getItem('userLevel') || LOGGED_IN_LEVEL;
    var isAdminOrKasir = (userLevel === 'admin' || userLevel === 'kasir');
    
    var tambahBtn = document.querySelector('#konten-pelanggan .d-flex .btn-primary');
    if (tambahBtn) {
        tambahBtn.style.display = isAdminOrKasir ? 'none' : 'inline-block';
    }
    
    document.getElementById('tabel-body-pelanggan').innerHTML = `
        <tr><td colspan="9" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div> Menghubungkan database...
        </td></tr>
    `;
    
    loadPaketDropdown();

    try {
        const res = await apiCall("getDaftarPelanggan");
        const data = res.data || [];
        
        semuaDataPelanggan = data;
        currentPage = 1;
        itemsPerPage = parseInt(document.getElementById('limitPelanggan').value) || 10;
        
        renderTabelPelanggan();
    } catch(err) {
        console.error("Load pelanggan error:", err);
        document.getElementById('tabel-body-pelanggan').innerHTML = `
            <tr><td colspan="9" class="text-center text-danger">Error loading data: ${err.message}</td></tr>
        `;
    }
}

function renderTabelPelanggan() {
    var keyword = document.getElementById('searchPelanggan').value.toLowerCase().trim();
    var statusFilter = document.getElementById('filterStatusPelanggan').value;
    var sortBy = document.getElementById('sortPelanggan').value;
    itemsPerPage = parseInt(document.getElementById('limitPelanggan').value) || 10;
    
    var userLevel = sessionStorage.getItem('userLevel') || LOGGED_IN_LEVEL;
    var isAdminOrKasir = (userLevel === 'admin' || userLevel === 'kasir');
    
    dataPelangganFiltered = semuaDataPelanggan.filter(function(p) {
        if (statusFilter !== 'semua' && p.status !== statusFilter) return false;
        if (keyword) {
            var searchFields = [
                (p.id || '').toLowerCase(),
                (p.nama || '').toLowerCase(),
                (p.alamat || '').toLowerCase(),
                (p.noHp || '').toLowerCase()
            ];
            return searchFields.some(field => field.includes(keyword));
        }
        return true;
    });
    
    dataPelangganFiltered.sort(function(a, b) {
        switch(sortBy) {
            case 'id': return a.id.localeCompare(b.id);
            case 'id_desc': return b.id.localeCompare(a.id);
            case 'nama': return a.nama.localeCompare(b.nama);
            case 'nama_desc': return b.nama.localeCompare(a.nama);
            case 'paket': return a.paket.localeCompare(b.paket);
            case 'status': return a.status.localeCompare(b.status);
            default: return a.id.localeCompare(b.id);
        }
    });
    
    var totalData = dataPelangganFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    if (totalPages === 0) currentPage = 1;
    
    var startIndex = (currentPage - 1) * itemsPerPage;
    var endIndex = Math.min(startIndex + itemsPerPage, totalData);
    var dataPage = dataPelangganFiltered.slice(startIndex, endIndex);
    
    var tbody = document.getElementById('tabel-body-pelanggan');
    
    if (dataPage.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">
            ${keyword ? 'Tidak ada data yang sesuai dengan pencarian' : 'Belum ada data pelanggan.'}
        </td></tr>`;
    } else {
        var html = '';
        dataPage.forEach(function(p) {
            var badgeStatus = p.status === 'Aktif' ? 'bg-success' : (p.status === 'Isolir' ? 'bg-danger' : 'bg-secondary');
            var tglTampil = p.tglTempo;
            if(tglTampil && tglTampil !== "") {
                var d = new Date(tglTampil);
                if(!isNaN(d.getTime())) {
                    tglTampil = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear();
                }
            } else { tglTampil = '-'; }

            var aksiHtml = '';
            if (!isAdminOrKasir) {
                aksiHtml = `
                    <button class="btn btn-warning btn-aksi" onclick='editPelangganAksi("${p.id}")' title="Edit Data">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn btn-danger btn-aksi" onclick='hapusPelangganAksi("${p.id}", "${p.nama}")' title="Hapus Pelanggan">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            } else {
                aksiHtml = `<span class="text-muted small"><i class="fa-solid fa-lock me-1"></i>Read only</span>`;
            }

            html += `<tr>
                <td class="fw-bold">${p.id}</td>
                <td>${p.nama}</td>
                <td><small>${p.alamat || '-'}</small></td>
                <td>${p.noHp}</td>
                <td><span class="badge bg-info-subtle text-info border border-info">${p.paket}</span></td>
                <td class="fw-medium">Rp ${Number(p.harga).toLocaleString('id-ID')}</td>
                <td class="text-danger fw-medium">${tglTampil}</td>
                <td><span class="badge ${badgeStatus}">${p.status}</span></td>
                <td class="text-center" style="min-width: 90px;">${aksiHtml}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
    
    document.getElementById('infoPelanggan').innerText = 
        `Menampilkan ${totalData > 0 ? startIndex + 1 : 0} - ${endIndex} dari ${totalData} data`;
    
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    var paginationEl = document.getElementById('paginationPelanggan');
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    var html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">«</a>
    </li>`;
    
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    
    for (var i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">»</a>
    </li>`;
    
    paginationEl.innerHTML = html;
}

function goToPage(page) {
    var totalData = dataPelangganFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPage);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    renderTabelPelanggan();
}

function sortTable(field) {
    var sortMap = { 'id': 'id', 'nama': 'nama', 'paket': 'paket', 'status': 'status' };
    var currentSort = document.getElementById('sortPelanggan').value;
    var newSort = sortMap[field] || 'id';
    
    if (currentSort === newSort) {
        document.getElementById('sortPelanggan').value = newSort + '_desc';
    } else {
        document.getElementById('sortPelanggan').value = newSort;
    }
    
    renderTabelPelanggan();
}

// ========================================
// CRUD PELANGGAN FUNCTIONS
// ========================================
function bukaModalPelanggan(isEdit) {
    var userLevel = sessionStorage.getItem('userLevel') || LOGGED_IN_LEVEL;
    var isAdminOrKasir = (userLevel === 'admin' || userLevel === 'kasir');
    
    if (isAdminOrKasir) {
        alert("⚠️ Anda tidak memiliki izin untuk menambah atau mengedit data pelanggan!");
        return;
    }
    
    document.getElementById('form-pelanggan-crud').reset();
    document.getElementById('crud-plg-id').removeAttribute('readonly');
    document.getElementById('crud-plg-id').disabled = false;
    document.getElementById('crud-plg-id').style.backgroundColor = "";
    document.getElementById('crud-plg-harga').value = "";
    
    if(!isEdit) {
        EDIT_MODE = false;
        document.getElementById('modalPelangganTitle').innerText = "Tambah Pelanggan Baru";
        document.getElementById('crud-plg-status').value = "Aktif";
        let randomId = "WF-" + String(Math.floor(1000 + Math.random() * 9000));
        document.getElementById('crud-plg-id').value = randomId;
        document.getElementById('crud-plg-id').style.backgroundColor = "#f8f9fa";
    } else {
        EDIT_MODE = true;
        document.getElementById('modalPelangganTitle').innerText = "Edit Data Pelanggan";
        document.getElementById('crud-plg-id').setAttribute('readonly', true);
        document.getElementById('crud-plg-id').style.backgroundColor = "#e9ecef";
    }
    
    document.getElementById('modalFormPelanggan').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function tutupModalPelanggan() {
    document.getElementById('modalFormPelanggan').style.display = 'none';
    document.body.style.overflow = '';
}

function autoFillHargaCRUD() {
    let selectedPaket = document.getElementById('crud-plg-paket').value;
    let temukan = DATA_LIST_PAKET.find(p => p.nama === selectedPaket);
    if(temukan) { 
        document.getElementById('crud-plg-harga').value = temukan.harga; 
    } else {
        document.getElementById('crud-plg-harga').value = "";
    }
}

function editPelangganAksi(id) {
    if(!id) {
        alert("ID Pelanggan tidak valid!");
        return;
    }
    
    let rows = document.querySelectorAll('#tabel-body-pelanggan tr');
    let pelangganData = null;
    
    for(let row of rows) {
        let cells = row.querySelectorAll('td');
        if(cells.length > 0) {
            let rowId = cells[0] ? cells[0].textContent.trim() : "";
            if(rowId === id) {
                pelangganData = {
                    id: rowId,
                    nama: cells[1] ? cells[1].textContent.trim() : "",
                    alamat: cells[2] ? cells[2].textContent.trim() : "",
                    noHp: cells[3] ? cells[3].textContent.trim() : "",
                    paket: cells[4] ? cells[4].textContent.trim() : "",
                    harga: cells[5] ? cells[5].textContent.replace('Rp', '').replace(/\./g, '').trim() : "0",
                    status: cells[7] ? cells[7].textContent.trim() : "Aktif"
                };
                break;
            }
        }
    }
    
    if(!pelangganData) {
        alert("Data pelanggan tidak ditemukan! Silahkan refresh halaman.");
        return;
    }
    
    bukaModalPelanggan(true);
    
    document.getElementById('crud-plg-id').value = pelangganData.id;
    document.getElementById('crud-plg-nama').value = pelangganData.nama;
    document.getElementById('crud-plg-hp').value = pelangganData.noHp;
    document.getElementById('crud-plg-alamat').value = pelangganData.alamat;
    document.getElementById('crud-plg-status').value = pelangganData.status;
    
    setTimeout(function() {
        if(pelangganData.paket) document.getElementById('crud-plg-paket').value = pelangganData.paket;
        if(pelangganData.harga) document.getElementById('crud-plg-harga').value = pelangganData.harga;
    }, 500);
}

async function prosesSimpanCRUDPelanggan() {
    let id = document.getElementById('crud-plg-id').value.trim();
    let nama = document.getElementById('crud-plg-nama').value.trim();
    let noHp = document.getElementById('crud-plg-hp').value.trim();
    let alamat = document.getElementById('crud-plg-alamat').value.trim();
    let paket = document.getElementById('crud-plg-paket').value;
    let harga = document.getElementById('crud-plg-harga').value;
    let status = document.getElementById('crud-plg-status').value;

    if(!id || !nama || !noHp || !paket) {
        alert("Mohon lengkapi semua kolom form wajib!");
        return;
    }

    let confirmMsg = EDIT_MODE ? 
        `Yakin ingin mengubah data pelanggan ${nama} (${id})?` : 
        `Yakin ingin menambahkan pelanggan baru ${nama} (${id})?`;
    
    if(!confirm(confirmMsg)) return;

    let payload = {
        pelanggan: {
            id: id,
            nama: nama,
            noHp: noHp,
            alamat: alamat,
            paket: paket,
            harga: harga || 0,
            status: status
        }
    };

    let notifEl = document.getElementById('plg-notif-crud');
    notifEl.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
    notifEl.classList.add('alert-info');
    notifEl.innerText = "Menyimpan data...";

    try {
        const res = await apiCall("simpanDataPelanggan", payload);
        if(res.success) {
            notifEl.classList.remove('alert-info');
            notifEl.classList.add('alert-success');
            notifEl.innerText = res.message;
            tutupModalPelanggan();
            muatTabelKelolaPelanggan();
            setTimeout(function() { notifEl.classList.add('d-none'); }, 3000);
        } else {
            notifEl.classList.remove('alert-info');
            notifEl.classList.add('alert-danger');
            notifEl.innerText = "Error: " + res.message;
        }
    } catch(err) {
        console.error("Simpan pelanggan error:", err);
        notifEl.classList.remove('alert-info');
        notifEl.classList.add('alert-danger');
        notifEl.innerText = "Error: " + err.message;
    }
}

async function hapusPelangganAksi(id, nama) {
    if(!id) {
        alert("ID Pelanggan tidak valid!");
        return;
    }
    
    if(confirm(`⚠️ Yakin ingin menghapus pelanggan ${nama} (${id})?\n\nData yang dihapus TIDAK dapat dikembalikan!`)) {
        let notifEl = document.getElementById('plg-notif-crud');
        notifEl.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
        notifEl.classList.add('alert-warning');
        notifEl.innerText = "Menghapus data...";
        
        try {
            const res = await apiCall("hapusDataPelanggan", { id: id });
            if(res.success) {
                notifEl.classList.remove('alert-warning');
                notifEl.classList.add('alert-success');
                notifEl.innerText = res.message;
                muatTabelKelolaPelanggan();
                setTimeout(function() { notifEl.classList.add('d-none'); }, 3000);
            } else {
                notifEl.classList.remove('alert-warning');
                notifEl.classList.add('alert-danger');
                notifEl.innerText = "Error: " + res.message;
            }
        } catch(err) {
            console.error("Hapus pelanggan error:", err);
            notifEl.classList.remove('alert-warning');
            notifEl.classList.add('alert-danger');
            notifEl.innerText = "Error: " + err.message;
        }
    }
}

// ========================================
// DASHBOARD FUNCTIONS
// ========================================
async function muatDashboard() {
    document.getElementById('stat-total-pelanggan').innerText = "...";
    document.getElementById('stat-aktif').innerText = "...";
    document.getElementById('stat-pendapatan-bulan').innerText = "Rp ...";
    document.getElementById('stat-transaksi-hari').innerText = "...";
    document.getElementById('stat-total-transaksi').innerText = "...";
    document.getElementById('stat-metode-populer').innerText = "...";
    
    try {
        const res = await apiCall("getDashboardStats");
        if(res.success) {
            var d = res.data;
            
            document.getElementById('stat-total-pelanggan').innerText = d.totalPelanggan || 0;
            document.getElementById('stat-aktif').innerText = d.totalAktif || 0;
            document.getElementById('stat-pendapatan-bulan').innerText = 'Rp ' + Number(d.pendapatanBulanIni || 0).toLocaleString('id-ID');
            document.getElementById('stat-transaksi-hari').innerText = d.transaksiHariIni || 0;
            document.getElementById('stat-total-transaksi').innerText = d.totalTransaksi || 0;
            
            if(d.metodeLabels && d.metodeLabels.length > 0) {
                var maxIndex = 0;
                for(var i = 1; i < d.metodeData.length; i++) {
                    if(d.metodeData[i] > d.metodeData[maxIndex]) maxIndex = i;
                }
                document.getElementById('stat-metode-populer').innerText = d.metodeLabels[maxIndex] + ' (' + d.metodeData[maxIndex] + 'x)';
            } else {
                document.getElementById('stat-metode-populer').innerText = 'Belum ada data';
            }
            
            try {
                if (window.chartPendapatan) { window.chartPendapatan.destroy(); window.chartPendapatan = null; }
                if (window.chartPaket) { window.chartPaket.destroy(); window.chartPaket = null; }
                if (window.chartMetode) { window.chartMetode.destroy(); window.chartMetode = null; }
            } catch(e) {}
            
            var canvasPendapatan = document.getElementById('chartPendapatan');
            var canvasPaket = document.getElementById('chartPaket');
            var canvasMetode = document.getElementById('chartMetode');
            
            setTimeout(function() {
                try {
                    if (canvasPendapatan && d.pendapatanBulanan && d.pendapatanBulanan.length > 0) {
                        var ctx1 = canvasPendapatan.getContext('2d');
                        window.chartPendapatan = new Chart(ctx1, {
                            type: 'bar',
                            data: {
                                labels: d.bulanLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                                datasets: [{
                                    label: 'Pendapatan (Rp)',
                                    data: d.pendapatanBulanan || [0,0,0,0,0,0],
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function(value) {
                                                return value >= 1000 ? 'Rp ' + (value/1000).toFixed(0) + 'K' : 'Rp ' + value.toLocaleString('id-ID');
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                    
                    if (canvasPaket && d.paketLabels && d.paketLabels.length > 0) {
                        var ctx2 = canvasPaket.getContext('2d');
                        window.chartPaket = new Chart(ctx2, {
                            type: 'doughnut',
                            data: {
                                labels: d.paketLabels,
                                datasets: [{
                                    data: d.paketData,
                                    backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796', '#5a5c69']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10 } } }
                            }
                        });
                    }
                    
                    if (canvasMetode && d.metodeLabels && d.metodeLabels.length > 0) {
                        var ctx3 = canvasMetode.getContext('2d');
                        window.chartMetode = new Chart(ctx3, {
                            type: 'pie',
                            data: {
                                labels: d.metodeLabels,
                                datasets: [{
                                    data: d.metodeData,
                                    backgroundColor: ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#858796']
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10 } } }
                            }
                        });
                    }
                } catch(chartError) {
                    console.error("Error creating charts:", chartError);
                }
            }, 300);
        } else {
            document.getElementById('stat-total-pelanggan').innerText = "Error";
        }
    } catch(err) {
        console.error("Dashboard load error:", err);
        document.getElementById('stat-total-pelanggan').innerText = "Error";
    }
}

// ========================================
// CETAK FUNCTIONS
// ========================================
function cetakInvoicePDF() {
    var invoiceEl = document.getElementById('area-cetak-invoice');
    var contentEl = document.getElementById('invoice-content');
    
    invoiceEl.style.display = 'block';
    invoiceEl.style.position = 'relative';
    invoiceEl.style.top = 'auto';
    invoiceEl.style.left = 'auto';
    invoiceEl.style.transform = 'none';
    invoiceEl.style.zIndex = 'auto';
    invoiceEl.style.background = 'white';
    invoiceEl.style.padding = '20px';
    invoiceEl.style.borderRadius = '0';
    invoiceEl.style.boxShadow = 'none';
    invoiceEl.style.width = '400px';
    invoiceEl.style.maxWidth = '100%';
    invoiceEl.style.maxHeight = 'none';
    invoiceEl.style.overflow = 'visible';
    invoiceEl.style.margin = '0 auto';
    
    var buttons = invoiceEl.querySelectorAll('.no-print');
    buttons.forEach(function(btn) { btn.style.display = 'none'; });
    
    html2canvas(contentEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 400,
        height: contentEl.scrollHeight
    }).then(function(canvas) {
        buttons.forEach(function(btn) { btn.style.display = 'block'; });
        
        var imgData = canvas.toDataURL('image/png');
        var imgWidth = 210;
        var pageHeight = 297;
        var imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        var doc = new jspdf.jsPDF('p', 'mm', 'a4');
        doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        doc.save('Invoice_' + document.getElementById('p-idtx').innerText + '.pdf');
    }).catch(function(err) {
        console.error("Error membuat PDF:", err);
        alert("Gagal membuat PDF.");
        buttons.forEach(function(btn) { btn.style.display = 'block'; });
    });
}

function cetakInvoicePrint() {
    var invoiceEl = document.getElementById('area-cetak-invoice');
    var buttons = invoiceEl.querySelectorAll('.no-print');
    
    buttons.forEach(function(btn) { btn.style.display = 'none'; });
    
    invoiceEl.style.display = 'block';
    invoiceEl.style.position = 'fixed';
    invoiceEl.style.top = '50%';
    invoiceEl.style.left = '50%';
    invoiceEl.style.transform = 'translate(-50%, -50%)';
    invoiceEl.style.zIndex = '9999';
    invoiceEl.style.background = 'white';
    invoiceEl.style.padding = '20px';
    invoiceEl.style.borderRadius = '10px';
    invoiceEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
    invoiceEl.style.width = '350px';
    invoiceEl.style.maxWidth = '95%';
    invoiceEl.style.maxHeight = '90vh';
    invoiceEl.style.overflow = 'auto';
    
    setTimeout(function() {
        window.print();
        setTimeout(function() {
            buttons.forEach(function(btn) { btn.style.display = 'block'; });
        }, 1000);
    }, 500);
}

function cetakInvoice() {
    cetakInvoicePDF();
}

function tutupModeCetak() {
    var invoiceEl = document.getElementById('area-cetak-invoice');
    invoiceEl.style.display = 'none';
    invoiceEl.style.position = 'fixed';
    invoiceEl.style.top = '';
    invoiceEl.style.left = '';
    invoiceEl.style.transform = '';
    invoiceEl.style.zIndex = '';
    invoiceEl.style.background = '';
    invoiceEl.style.padding = '';
    invoiceEl.style.borderRadius = '';
    invoiceEl.style.boxShadow = '';
    invoiceEl.style.width = '';
    invoiceEl.style.maxWidth = '';
    invoiceEl.style.maxHeight = '';
    invoiceEl.style.overflow = '';
    invoiceEl.style.margin = '';
    
    document.querySelectorAll('#area-cetak-invoice .no-print').forEach(function(el) {
        el.style.display = 'block';
    });
    
    document.getElementById('kasir-notif-simpan').innerText = "";
}

// ========================================
// LAPORAN KEUANGAN FUNCTIONS
// ========================================
function muatLaporanKeuangan() {
    document.getElementById('filter-periode').value = 'semua';
    muatRingkasan();
    muatDaftarPengeluaran();
}

function ubahPeriode() {
    muatRingkasan();
    muatDaftarPengeluaran();
}

function getFilterDateRange() {
    var periode = document.getElementById('filter-periode').value;
    var now = new Date();
    var start = new Date(now);
    var end = new Date(now);
    
    now.setHours(0, 0, 0, 0);
    
    switch(periode) {
        case 'hari-ini':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'minggu-ini':
            var day = now.getDay();
            var diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(now.getFullYear(), now.getMonth(), diff);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
            break;
        case 'bulan-ini':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case '3-bulan':
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case '6-bulan':
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        case 'semua':
        default:
            start = new Date(2020, 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(2099, 11, 31, 23, 59, 59);
    }
    
    return { start: start, end: end };
}

async function muatRingkasan() {
    var range = getFilterDateRange();
    var start = range.start.getTime();
    var end = range.end.getTime();
    
    try {
        const resTx = await apiCall("getRiwayatTransaksi");
        const dataTx = resTx.data || [];
        
        var totalPendapatan = 0;
        dataTx.forEach(function(tx) {
            var tgl;
            if (tx.tanggal) {
                if (typeof tx.tanggal === 'string') {
                    var parts = tx.tanggal.split('/');
                    if (parts.length === 3) {
                        tgl = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        tgl = new Date(tx.tanggal);
                    }
                } else if (tx.tanggal instanceof Date) {
                    tgl = tx.tanggal;
                }
            }
            if (tgl && !isNaN(tgl.getTime())) {
                var tglTime = tgl.getTime();
                if (tglTime >= start && tglTime <= end) {
                    totalPendapatan += Number(tx.jumlah) || 0;
                }
            }
        });

        const resPengeluaran = await apiCall("getPengeluaran");
        const pengeluaran = resPengeluaran.data || [];
        
        var totalPengeluaran = 0;
        pengeluaran.forEach(function(p) {
            if (p.tanggal) {
                var tgl = new Date(p.tanggal);
                if (!isNaN(tgl.getTime())) {
                    var tglTime = tgl.getTime();
                    if (tglTime >= start && tglTime <= end) {
                        totalPengeluaran += Number(p.jumlah) || 0;
                    }
                }
            }
        });
        
        var saldo = totalPendapatan - totalPengeluaran;
        
        document.getElementById('laporan-pendapatan').innerText = 'Rp ' + totalPendapatan.toLocaleString('id-ID');
        document.getElementById('laporan-pengeluaran').innerText = 'Rp ' + totalPengeluaran.toLocaleString('id-ID');
        document.getElementById('laporan-saldo').innerText = 'Rp ' + saldo.toLocaleString('id-ID');
        document.getElementById('total-pengeluaran-label').innerText = 'Total: Rp ' + totalPengeluaran.toLocaleString('id-ID');

    } catch(err) {
        console.error("Error muat ringkasan:", err);
    }
}

async function tambahPengeluaran() {
    var tanggal = document.getElementById('pengeluaran-tanggal').value;
    var kategori = document.getElementById('pengeluaran-kategori').value;
    var keterangan = document.getElementById('pengeluaran-keterangan').value.trim();
    var jumlah = document.getElementById('pengeluaran-jumlah').value;
    
    if (!tanggal) {
        document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-danger">⚠️ Tanggal harus diisi!</span>';
        return;
    }
    if (!keterangan) {
        document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-danger">⚠️ Keterangan harus diisi!</span>';
        return;
    }
    if (!jumlah || Number(jumlah) <= 0) {
        document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-danger">⚠️ Jumlah harus diisi dan lebih dari 0!</span>';
        return;
    }
    
    var payload = {
        tanggal: tanggal,
        kategori: kategori,
        keterangan: keterangan,
        jumlah: Number(jumlah),
        inputOleh: LOGGED_IN_ADMIN || "Admin"
    };
    
    document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-warning">⏳ Menyimpan...</span>';
    
    try {
        const res = await apiCall("tambahPengeluaran", payload);
        if (res.success) {
            document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-success">✅ ' + res.message + '</span>';
            document.getElementById('pengeluaran-keterangan').value = "";
            document.getElementById('pengeluaran-jumlah').value = "";
            muatRingkasan();
            muatDaftarPengeluaran();
            setTimeout(function() { document.getElementById('pengeluaran-notif').innerHTML = ''; }, 3000);
        } else {
            document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-danger">❌ ' + res.message + '</span>';
        }
    } catch(err) {
        document.getElementById('pengeluaran-notif').innerHTML = '<span class="text-danger">❌ Error: ' + err.message + '</span>';
    }
}

async function hapusPengeluaranAksi(id) {
    if (!confirm("Yakin ingin menghapus data pengeluaran ini?")) return;
    
    try {
        const res = await apiCall("hapusPengeluaran", { id: id });
        if (res.success) {
            muatRingkasan();
            muatDaftarPengeluaran();
        } else {
            alert("Error: " + res.message);
        }
    } catch(err) {
        alert("Error: " + err.message);
    }
}

async function exportCSV() {
    var periodeText = document.getElementById('filter-periode').options[document.getElementById('filter-periode').selectedIndex].text;
    var pendapatanText = document.getElementById('laporan-pendapatan').innerText;
    var pengeluaranText = document.getElementById('laporan-pengeluaran').innerText;
    var saldoText = document.getElementById('laporan-saldo').innerText;
    
    var pendapatan = Number(pendapatanText.replace(/[^0-9]/g, '')) || 0;
    var pengeluaran = Number(pengeluaranText.replace(/[^0-9]/g, '')) || 0;
    var saldo = Number(saldoText.replace(/[^0-9]/g, '')) || 0;
    
    var rows = document.querySelectorAll('#tabel-pengeluaran-body tr');
    var pengeluaranData = [];
    
    rows.forEach(function(row) {
        var cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            var tgl = cells[0] ? cells[0].textContent.trim() : '';
            var kategori = cells[1] ? cells[1].textContent.trim() : '';
            var keterangan = cells[2] ? cells[2].textContent.trim() : '';
            var jumlah = cells[3] ? cells[3].textContent.replace('Rp', '').replace(/\./g, '').trim() : '0';
            pengeluaranData.push({ tanggal: tgl, kategori: kategori, keterangan: keterangan, jumlah: jumlah });
        }
    });
    
    var range = getFilterDateRange();
    var start = range.start;
    var end = range.end;
    
    try {
        const res = await apiCall("getRiwayatTransaksi");
        const transaksi = res.data || [];
        
        var filteredTransaksi = transaksi.filter(function(tx) {
            if (!tx.tanggal) return false;
            var tgl = new Date(tx.tanggal);
            return tgl >= start && tgl <= end;
        });
        
        var csv = 'Laporan Keuangan - ' + periodeText + '\n\n';
        csv += '=== PENDAPATAN ===\nTanggal,ID Transaksi,Pelanggan,Paket,Jumlah\n';
        
        if (filteredTransaksi.length === 0) {
            csv += 'Tidak ada data pendapatan pada periode ini\n';
        } else {
            filteredTransaksi.forEach(function(tx) {
                csv += tx.tanggal + ',' + tx.idTx + ',' + tx.nama + ',' + tx.paket + ',' + tx.jumlah + '\n';
            });
        }
        csv += 'Total Pendapatan: Rp ' + pendapatan.toLocaleString('id-ID') + '\n\n';
        
        csv += '=== PENGELUARAN ===\nTanggal,Kategori,Keterangan,Jumlah\n';
        if (pengeluaranData.length === 0) {
            csv += 'Tidak ada data pengeluaran pada periode ini\n';
        } else {
            pengeluaranData.forEach(function(p) {
                csv += p.tanggal + ',' + p.kategori + ',' + p.keterangan + ',' + p.jumlah + '\n';
            });
        }
        csv += 'Total Pengeluaran: Rp ' + pengeluaran.toLocaleString('id-ID') + '\n\n';
        csv += '=== SALDO AKHIR ===\nSaldo: Rp ' + saldo.toLocaleString('id-ID') + '\n';
        
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'Laporan_Keuangan_' + periodeText + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch(err) {
        alert("Error: " + err.message);
    }
}

var semuaDataPengeluaran = [];
var dataPengeluaranFiltered = [];
var currentPagePengeluaran = 1;
var itemsPerPagePengeluaran = 10;

function renderTabelPengeluaran() {
    var keyword = document.getElementById('searchPengeluaran').value.toLowerCase().trim();
    var kategoriFilter = document.getElementById('filterKategoriPengeluaran').value;
    var sortBy = document.getElementById('sortPengeluaran').value;
    itemsPerPagePengeluaran = parseInt(document.getElementById('limitPengeluaran').value) || 10;
    
    dataPengeluaranFiltered = semuaDataPengeluaran.filter(function(p) {
        if (kategoriFilter !== 'semua' && p.kategori !== kategoriFilter) return false;
        if (keyword) {
            var searchFields = [
                (p.keterangan || '').toLowerCase(),
                (p.kategori || '').toLowerCase(),
                (p.tanggal || '').toLowerCase()
            ];
            return searchFields.some(field => field.includes(keyword));
        }
        return true;
    });
    
    dataPengeluaranFiltered.sort(function(a, b) {
        switch(sortBy) {
            case 'tanggal': return a.tanggal.localeCompare(b.tanggal);
            case 'tanggal_desc': return b.tanggal.localeCompare(a.tanggal);
            case 'kategori': return a.kategori.localeCompare(b.kategori);
            case 'kategori_desc': return b.kategori.localeCompare(a.kategori);
            case 'jumlah': return (Number(a.jumlah) || 0) - (Number(b.jumlah) || 0);
            case 'jumlah_desc': return (Number(b.jumlah) || 0) - (Number(a.jumlah) || 0);
            case 'keterangan': return a.keterangan.localeCompare(b.keterangan);
            default: return b.tanggal.localeCompare(a.tanggal);
        }
    });
    
    var totalData = dataPengeluaranFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPagePengeluaran);
    
    if (currentPagePengeluaran > totalPages) currentPagePengeluaran = totalPages;
    if (currentPagePengeluaran < 1) currentPagePengeluaran = 1;
    if (totalPages === 0) currentPagePengeluaran = 1;
    
    var startIndex = (currentPagePengeluaran - 1) * itemsPerPagePengeluaran;
    var endIndex = Math.min(startIndex + itemsPerPagePengeluaran, totalData);
    var dataPage = dataPengeluaranFiltered.slice(startIndex, endIndex);
    
    var tbody = document.getElementById('tabel-pengeluaran-body');
    
    if (dataPage.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">
            ${keyword || kategoriFilter !== 'semua' ? 'Tidak ada data yang sesuai dengan filter' : 'Belum ada data pengeluaran.'}
        </td></tr>`;
    } else {
        var html = '';
        dataPage.forEach(function(p) {
            var tgl = p.tanggal;
            if (tgl) {
                var d = new Date(tgl);
                if (!isNaN(d.getTime())) {
                    tgl = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear();
                }
            }
            
            var kategoriBadge = '';
            switch(p.kategori) {
                case 'Setoran': kategoriBadge = 'bg-secondary'; break;
                case 'Insentif': kategoriBadge = 'bg-primary'; break;
                case 'Operasional': kategoriBadge = 'bg-warning text-dark'; break;
                case 'Marketing': kategoriBadge = 'bg-info text-dark'; break;
                default: kategoriBadge = 'bg-secondary';
            }
            
            html += `<tr>
                <td>${tgl}</td>
                <td><span class="badge ${kategoriBadge}">${p.kategori}</span></td>
                <td>${p.keterangan}</td>
                <td class="text-end fw-medium text-danger">Rp ${Number(p.jumlah).toLocaleString('id-ID')}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-sm btn-aksi" onclick="hapusPengeluaranAksi(${p.id})" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
    
    document.getElementById('infoPengeluaran').innerText = 
        `Menampilkan ${totalData > 0 ? startIndex + 1 : 0} - ${endIndex} dari ${totalData} data`;
    
    renderPaginationPengeluaran(totalPages);
}

function renderPaginationPengeluaran(totalPages) {
    var paginationEl = document.getElementById('paginationPengeluaran');
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    var html = '';
    html += `<li class="page-item ${currentPagePengeluaran === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPagePengeluaran(${currentPagePengeluaran - 1}); return false;">«</a>
    </li>`;
    
    var startPage = Math.max(1, currentPagePengeluaran - 2);
    var endPage = Math.min(totalPages, currentPagePengeluaran + 2);
    
    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPagePengeluaran(1); return false;">1</a></li>`;
        if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    
    for (var i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${i === currentPagePengeluaran ? 'active' : ''}">
            <a class="page-link" href="#" onclick="goToPagePengeluaran(${i}); return false;">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        html += `<li class="page-item"><a class="page-link" href="#" onclick="goToPagePengeluaran(${totalPages}); return false;">${totalPages}</a></li>`;
    }
    
    html += `<li class="page-item ${currentPagePengeluaran === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPagePengeluaran(${currentPagePengeluaran + 1}); return false;">»</a>
    </li>`;
    
    paginationEl.innerHTML = html;
}

function goToPagePengeluaran(page) {
    var totalData = dataPengeluaranFiltered.length;
    var totalPages = Math.ceil(totalData / itemsPerPagePengeluaran);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPagePengeluaran = page;
    renderTabelPengeluaran();
}

function sortPengeluaranTable(field) {
    var sortMap = { 'tanggal': 'tanggal_desc', 'kategori': 'kategori', 'keterangan': 'keterangan', 'jumlah': 'jumlah_desc' };
    var currentSort = document.getElementById('sortPengeluaran').value;
    var newSort = sortMap[field] || 'tanggal_desc';
    
    if (currentSort === newSort) {
        if (newSort.includes('_desc')) {
            document.getElementById('sortPengeluaran').value = newSort.replace('_desc', '');
        } else {
            document.getElementById('sortPengeluaran').value = newSort + '_desc';
        }
    } else {
        document.getElementById('sortPengeluaran').value = newSort;
    }
    
    renderTabelPengeluaran();
}

async function muatDaftarPengeluaran() {
    document.getElementById('tabel-pengeluaran-body').innerHTML = `
        <tr><td colspan="5" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-secondary"></div> Memuat data...
        </td></tr>
    `;
    
    try {
        const res = await apiCall("getPengeluaran");
        const data = res.data || [];
        
        semuaDataPengeluaran = data;
        currentPagePengeluaran = 1;
        itemsPerPagePengeluaran = parseInt(document.getElementById('limitPengeluaran').value) || 10;
        
        renderTabelPengeluaran();
    } catch(err) {
        console.error("Load pengeluaran error:", err);
        document.getElementById('tabel-pengeluaran-body').innerHTML = `
            <tr><td colspan="5" class="text-center text-danger">Error loading data: ${err.message}</td></tr>
        `;
    }
}

// ========================================
// MENU DEFINITION
// ========================================
var MENU_CONFIG = {
    'superadmin': [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', tab: 'dashboard' },
        { id: 'laporan', label: 'Laporan Keuangan', icon: 'fa-solid fa-file-invoice-dollar', tab: 'laporan' },
        { id: 'kasir', label: 'Kasir Pembayaran', icon: 'fa-solid fa-cash-register', tab: 'kasir' },
        { id: 'riwayat', label: 'Data Transaksi', icon: 'fa-solid fa-history', tab: 'riwayat' },
        { id: 'pelanggan', label: 'Kelola Pelanggan', icon: 'fa-solid fa-users', tab: 'pelanggan' },
        { id: 'user', label: 'Kelola User', icon: 'fa-solid fa-user-gear' }
    ],
    'admin': [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', tab: 'dashboard' },
        { id: 'laporan', label: 'Laporan Keuangan', icon: 'fa-solid fa-file-invoice-dollar', tab: 'laporan' },
        { id: 'kasir', label: 'Kasir Pembayaran', icon: 'fa-solid fa-cash-register', tab: 'kasir' },
        { id: 'riwayat', label: 'Data Transaksi', icon: 'fa-solid fa-history', tab: 'riwayat' },
        { id: 'pelanggan', label: 'Kelola Pelanggan', icon: 'fa-solid fa-users', tab: 'pelanggan' }
    ],
    'kasir': [
        { id: 'kasir', label: 'Kasir Pembayaran', icon: 'fa-solid fa-cash-register', tab: 'kasir' }
    ]
};

function renderAdminMenu(level) {
    var menuItems = MENU_CONFIG[level] || MENU_CONFIG['kasir'];
    var container = document.getElementById('admin-nav-container');
    if (!container) return;
    
    var html = '';
    menuItems.forEach(function(item) {
        html += `
            <button class="btn btn-outline-primary fw-bold" 
                    id="tab-${item.id}-btn" 
                    onclick="switchAdminTab('${item.id}')">
                <i class="${item.icon} me-2"></i>${item.label}
            </button>
        `;
    });
    
    container.innerHTML = html;
    sessionStorage.setItem('userLevel', level);
}

// ========================================
// KELOLA USER FUNCTIONS
// ========================================
var semuaDataUser = [];
var userEditMode = false;

async function muatTabelUser() {
    document.getElementById('tabel-body-user').innerHTML = `
        <tr><td colspan="5" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div> Memuat data...
        </td></tr>
    `;
    
    try {
        const res = await apiCall("getDaftarUser");
        semuaDataUser = res.data || [];
        renderTabelUser();
    } catch(err) {
        document.getElementById('tabel-body-user').innerHTML = `
            <tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>
        `;
    }
}

function renderTabelUser() {
    var tbody = document.getElementById('tabel-body-user');
    if (semuaDataUser.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Belum ada user terdaftar.</td></tr>`;
        return;
    }
    
    var html = '';
    semuaDataUser.forEach(function(u) {
        var levelBadge = '';
        switch(u.level) {
            case 'superadmin': levelBadge = 'bg-danger'; break;
            case 'admin': levelBadge = 'bg-primary'; break;
            case 'kasir': levelBadge = 'bg-success'; break;
            default: levelBadge = 'bg-secondary';
        }
        
        html += `<tr>
            <td class="fw-bold">${u.username}</td>
            <td><code style="font-size: 11px; word-break: break-all;">${u.passwordHash.substring(0, 20)}...</code></td>
            <td>${u.nama}</td>
            <td><span class="badge ${levelBadge}">${u.level}</span></td>
            <td class="text-center">
                <button class="btn btn-warning btn-aksi" onclick='editUser("${u.username}")' title="Edit User">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-danger btn-aksi" onclick='hapusUser("${u.username}", "${u.nama}")' title="Hapus User">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

function bukaModalUser(isEdit) {
    document.getElementById('form-user-crud').reset();
    if (!isEdit) {
        userEditMode = false;
        document.getElementById('modalUserTitle').innerText = "Tambah User Baru";
        document.getElementById('crud-user-username').disabled = false;
        document.getElementById('crud-user-username').style.backgroundColor = "";
    } else {
        userEditMode = true;
        document.getElementById('modalUserTitle').innerText = "Edit User";
        document.getElementById('crud-user-username').disabled = true;
        document.getElementById('crud-user-username').style.backgroundColor = "#e9ecef";
    }
    document.getElementById('modalFormUser').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function tutupModalUser() {
    document.getElementById('modalFormUser').style.display = 'none';
    document.body.style.overflow = '';
}

function editUser(username) {
    var user = semuaDataUser.find(u => u.username === username);
    if (!user) {
        alert("User tidak ditemukan!");
        return;
    }
    bukaModalUser(true);
    document.getElementById('crud-user-username').value = user.username;
    document.getElementById('crud-user-password-plain').value = "";
    document.getElementById('crud-user-nama').value = user.nama;
    document.getElementById('crud-user-level').value = user.level;
}

async function prosesSimpanUser() {
    try {
        var usernameEl = document.getElementById('crud-user-username');
        var passwordEl = document.getElementById('crud-user-password-plain');
        var namaEl = document.getElementById('crud-user-nama');
        var levelEl = document.getElementById('crud-user-level');
        
        if (!usernameEl || !passwordEl || !namaEl || !levelEl) return;
        
        var username = usernameEl.value.trim();
        var passwordPlain = passwordEl.value.trim();
        var nama = namaEl.value.trim();
        var level = levelEl.value;
        
        if (!username || !passwordPlain || !nama) {
            alert("⚠️ Mohon lengkapi semua field!");
            return;
        }
        
        var notifEl = document.getElementById('user-notif');
        if (notifEl) {
            notifEl.classList.remove('d-none', 'alert-success', 'alert-danger');
            notifEl.classList.add('alert-info');
            notifEl.innerText = "⏳ Mengenkripsi password & menyimpan...";
        }
        
        var passwordHash = await sha256(passwordPlain);
        var payload = { username: username, passwordHash: passwordHash, nama: nama, level: level };
        
        const res = await apiCall("simpanUser", payload);
        if (res.success) {
            if (notifEl) {
                notifEl.classList.remove('alert-info');
                notifEl.classList.add('alert-success');
                notifEl.innerText = "✅ " + res.message;
            }
            tutupModalUser();
            muatTabelUser();
            setTimeout(function() { if (notifEl) notifEl.classList.add('d-none'); }, 3000);
        } else {
            if (notifEl) {
                notifEl.classList.remove('alert-info');
                notifEl.classList.add('alert-danger');
                notifEl.innerText = "❌ Error: " + res.message;
            }
        }
    } catch(e) {
        alert("Error: " + e.message);
    }
}

async function hapusUser(username, nama) {
    if (!confirm(`⚠️ Yakin ingin menghapus user ${nama} (${username})?`)) return;
    
    var notifEl = document.getElementById('user-notif');
    notifEl.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
    notifEl.classList.add('alert-warning');
    notifEl.innerText = "Menghapus data...";
    
    try {
        const res = await apiCall("hapusUser", { username: username });
        if (res.success) {
            notifEl.classList.remove('alert-warning');
            notifEl.classList.add('alert-success');
            notifEl.innerText = res.message;
            muatTabelUser();
            setTimeout(function() { notifEl.classList.add('d-none'); }, 3000);
        } else {
            notifEl.classList.remove('alert-warning');
            notifEl.classList.add('alert-danger');
            notifEl.innerText = "Error: " + res.message;
        }
    } catch(err) {
        notifEl.classList.remove('alert-warning');
        notifEl.classList.add('alert-danger');
        notifEl.innerText = "Error: " + err.message;
    }
}

function sha256(input) {
    async function hashMessage(message) {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return hashMessage(input);
}

async function hapusTransaksi(idTx, nama, tanggal) {
    if (!idTx) return;
    
    var confirmMsg = `⚠️ Yakin ingin menghapus transaksi?\n\nID: ${idTx}\nNama: ${nama}\nTanggal: ${tanggal}`;
    if (!confirm(confirmMsg)) return;
    
    var notifEl = document.getElementById('plg-notif-crud');
    if (notifEl) {
        notifEl.classList.remove('d-none', 'alert-success', 'alert-danger', 'alert-info');
        notifEl.classList.add('alert-warning');
        notifEl.innerText = "⏳ Menghapus transaksi...";
    }
    
    try {
        const res = await apiCall("hapusTransaksi", { idTransaksi: idTx });
        if (res.success) {
            if (notifEl) {
                notifEl.classList.remove('alert-warning');
                notifEl.classList.add('alert-success');
                notifEl.innerText = "✅ " + res.message;
            }
            muatRiwayatTransaksi();
            muatDashboard();
            setTimeout(function() { if (notifEl) notifEl.classList.add('d-none'); }, 3000);
        } else {
            if (notifEl) {
                notifEl.classList.remove('alert-warning');
                notifEl.classList.add('alert-danger');
                notifEl.innerText = "❌ Error: " + res.message;
            }
        }
    } catch(err) {
        if (notifEl) {
            notifEl.classList.remove('alert-warning');
            notifEl.classList.add('alert-danger');
            notifEl.innerText = "❌ Error: " + err.message;
        }
    }
}

async function cetakUlangInvoice(idTx) {
    if (!idTx) return;
    
    try {
        const res = await apiCall("getTransaksiById", { idTransaksi: idTx });
        if (res.success) {
            var tx = res.data;
            document.getElementById('p-idtx').innerText = tx.idTx;
            document.getElementById('p-tgl').innerText = tx.tanggal;
            document.getElementById('p-idplg').innerText = tx.idPlg;
            document.getElementById('p-nama').innerText = tx.nama;
            document.getElementById('p-paket').innerText = tx.paket;
            document.getElementById('p-periode').innerText = formatBulanIndo(tx.bulan || "-");
            document.getElementById('p-adm').innerText = tx.keterangan || "Admin";
            document.getElementById('p-total').innerText = Number(tx.jumlah).toLocaleString('id-ID');
            
            var targetUrl = "https://sites.google.com/view/wifiansolution/billing";
            var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(targetUrl);
            document.getElementById('p-qrcode').src = qrUrl;
            
            var invoiceEl = document.getElementById('area-cetak-invoice');
            invoiceEl.style.display = 'block';
            invoiceEl.style.position = 'fixed';
            invoiceEl.style.top = '50%';
            invoiceEl.style.left = '50%';
            invoiceEl.style.transform = 'translate(-50%, -50%)';
            invoiceEl.style.zIndex = '9999';
            invoiceEl.style.background = 'white';
            invoiceEl.style.padding = '20px';
            invoiceEl.style.borderRadius = '10px';
            invoiceEl.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
            invoiceEl.style.width = '350px';
            invoiceEl.style.maxWidth = '95%';
            invoiceEl.style.maxHeight = '90vh';
            invoiceEl.style.overflow = 'auto';
            
            invoiceEl.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert("Gagal mengambil data transaksi: " + res.message);
        }
    } catch(err) {
        alert("Error: " + err.message);
    }
}

function formatBulanIndo(teksBulanTahun) {
  if (!teksBulanTahun) return "";
  var kamusBulan = {
    "January": "Januari", "February": "Februari", "March": "Maret", "April": "April",
    "May": "Mei", "June": "Juni", "July": "Juli", "August": "Agustus",
    "September": "September", "October": "Oktober", "November": "November", "December": "Desember"
  };
  Object.keys(kamusBulan).forEach(function(bulanInggris) {
    if (teksBulanTahun.indexOf(bulanInggris) !== -1) {
      teksBulanTahun = teksBulanTahun.replace(bulanInggris, kamusBulan[bulanInggris]);
    }
  });
  return teksBulanTahun;
}
