// File: api.js

// URL Web App GAS hasil deploy
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzWfqD0Cxwsubj36faIwNodMxCwnaI44S5e0C0Ax5W8xmWmlpMVXH4k8fVZWG69Evqk/exec";

/**
 * Client API serbaguna untuk berkomunikasi dengan Google Apps Script
 * @param {string} action Nama aksi yang terdaftar di doPost GAS
 * @param {object} payload Data yang dikirimkan ke backend
 * @returns {Promise<any>}
 */
async function apiCall(action, payload = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // Mencegah preflight CORS issue pada GAS
      },
      body: JSON.stringify({
        action: action,
        data: payload
      }),
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`API Call Error [${action}]:`, err);
    throw err;
  }
}
