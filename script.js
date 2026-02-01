import { db, ref, onValue } from "./firebase-config.js";
import { translations } from "./translation.js";


// تعريف هوية فريدة للجهاز وحفظها للأبد في المتصفح
let deviceId = localStorage.getItem("deviceId") || "dev_" + Math.random().toString(36).substr(2, 9);
localStorage.setItem("deviceId", deviceId);

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

window.checkAuth = function() {
    const pin = document.getElementById("pin-input").value;
    
    // فحص رمز المدير الافتراضي أو الموظفين (سنربطها بفايربيس لاحقاً)
    if (pin === "123456") {
        document.getElementById("login-overlay").style.display = "none";
        sessionStorage.setItem("userRole", "manager");
        sessionStorage.setItem("userName", "المدير");
        loadPermissions();
    } else {
        showAlert(translations[currentLang].invalid_pin, 'error');
    }
};

function loadPermissions() {
    const role = sessionStorage.getItem("userRole");
    // إخفاء القوائم بناءً على الدور
    if (role === "cashier") {
        document.querySelector('[data-key="inventory"]').style.display = 'none';
        document.querySelector('[data-key="suppliers"]').style.display = 'none';
    }
    if (role === "storekeeper") {
        document.querySelector('[data-key="management"]').style.display = 'none';
    }
}

import { set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

function syncDevice() {
    const deviceRef = ref(db, 'authorized_devices/' + deviceId);
    // نرسل لفايربيس أن هذا الجهاز نشط الآن
    set(deviceRef, {
        id: deviceId,
        lastSeen: new Date().toISOString(),
        status: "online"
    });
}

window.showAlert = function(message, type = 'info') {
    const container = document.getElementById('custom-alert-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    
    alertDiv.innerHTML = `
        <span>${message}</span>
        <span class="close-alert" onclick="this.parentElement.remove()">×</span>
    `;
    
    container.appendChild(alertDiv);

    // يختفي التنبيه تلقائياً بعد 4 ثوانٍ
    setTimeout(() => {
        if(alertDiv) alertDiv.remove();
    }, 4000);
};
