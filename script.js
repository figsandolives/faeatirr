import { db, ref, onValue } from "./firebase-config.js";
import { translations } from "./translation.js";

// 2. إدارة اللغة
let currentLang = localStorage.getItem("lang") || "ar";

function applyLanguage() {
    document.body.className = currentLang === "en" ? "ltr" : "";
    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });
}

window.toggleLanguage = function() {
    currentLang = currentLang === "ar" ? "en" : "ar";
    localStorage.setItem("lang", currentLang);
    applyLanguage();
};

// 3. التحديث المباشر من فايربيس (Real-time)
function listenToData() {
    // مثال: الاستماع لجدول الطلبات
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        updateUI(data); // هذه الوظيفة تحدث الشاشة تلقائياً
    });
}

function updateUI(data) {
    const display = document.getElementById("data-display");
    if (display && data) {
        display.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
}

// تشغيل النظام
document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    listenToData();
});