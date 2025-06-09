// src/utils/auth.ts

/**
 * Mengambil atau membuat ID perangkat unik yang disimpan di localStorage.
 * ID ini digunakan untuk membuat device_name yang lebih persisten dan unik.
 * @returns {string} ID perangkat unik.
 */
function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('appDeviceId');

  if (!deviceId) {
    // Jika tidak ada, generate UUID sederhana
    // Menggunakan pola UUID v4 (meskipun ini bukan UUID standar sepenuhnya, cukup untuk kebutuhan ini)
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem('appDeviceId', deviceId);
  }
  return deviceId;
}

/**
 * Menghasilkan device_name yang unik untuk digunakan dengan Laravel Sanctum.
 * Menggabungkan ID perangkat unik dengan User Agent browser.
 * @returns {string} String device_name yang unik.
 */
export function generateUniqueDeviceName(): string {
  const uniqueDeviceId = getOrCreateDeviceId();
  // Ambil sebagian dari User Agent untuk menambahkan detail browser/OS
  const userAgentSubstring = navigator.userAgent.substring(0, 50); // Ambil 50 karakter pertama

  // Gabungkan ID unik, User Agent, dan platform (opsional tapi bagus)
  // Anda bisa sesuaikan formatnya sesuai keinginan
  return `web_app_${uniqueDeviceId}_${navigator.platform}_${userAgentSubstring}`;
}