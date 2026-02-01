// 1. استيراد المكتبات من مصدر واحد ومنظم
import { db, ref, onValue, set, push, update } from "./firebase-config.js";
import { translations } from "./translation.js";

// 2. إعدادات هوية الجهاز واللغة
let deviceId = localStorage.getItem("deviceId") || "dev_" + Math.random().toString(36).substr(2, 9);
localStorage.setItem("deviceId", deviceId);

let currentLang = localStorage.getItem("lang") || "ar";

// 3. وظائف النظام الأساسية (اللغة، التنبيهات، الدخول)

function applyLanguage() {
    document.body.className = currentLang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (translations[currentLang] && translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });
}

window.toggleLanguage = function() {
    currentLang = currentLang === "ar" ? "en" : "ar";
    localStorage.setItem("lang", currentLang);
    applyLanguage();
};

window.showAlert = function(message, type = 'info') {
    const container = document.getElementById('custom-alert-container');
    if (!container) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <span class="close-alert" onclick="this.parentElement.remove()">×</span>
    `;
    container.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
};

window.checkAuth = function() {
    const pin = document.getElementById("pin-input").value;
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
    if (role === "cashier") {
        const inv = document.querySelector('[data-key="inventory"]');
        const supp = document.querySelector('[data-key="suppliers"]');
        if (inv) inv.style.display = 'none';
        if (supp) supp.style.display = 'none';
    }
    if (role === "storekeeper") {
        const manag = document.querySelector('[data-key="management"]');
        if (manag) manag.style.display = 'none';
    }
}

// 4. وظائف فايربيس (الأجهزة، الفروع، التحديث المباشر)

window.updateDeviceStatus = function() {
    const deviceRef = ref(db, 'authorized_devices/' + deviceId);
    update(deviceRef, {
        id: deviceId,
        lastSeen: new Date().toLocaleString(),
        status: "online"
    }).catch(err => console.error("Firebase Update Error:", err));
};

window.addNewBranch = function(nameAr, nameEn, isPrimary) {
    const branchesRef = ref(db, 'branches');
    const newBranchRef = push(branchesRef);
    set(newBranchRef, {
        nameAr,
        nameEn,
        isPrimary,
        createdAt: new Date().toISOString()
    }).then(() => {
        showAlert(currentLang === 'ar' ? "تمت إضافة الفرع بنجاح" : "Branch added successfully", 'success');
    });
};

function listenToBranches() {
    onValue(ref(db, 'branches'), (snapshot) => {
        const branches = snapshot.val();
        const list = document.getElementById('branches-list');
        if (!list) return;
        list.innerHTML = "";
        for (let id in branches) {
            const b = branches[id];
            list.innerHTML += `
                <tr>
                    <td>${b.nameAr}</td>
                    <td>${b.nameEn}</td>
                    <td>${b.isPrimary ? '✅' : '-'}</td>
                    <td><button onclick="deleteBranch('${id}')">❌</button></td>
                </tr>
            `;
        }
    });
}


window.assignBranchToDevice = function(devId, branchId) {
    update(ref(db, 'authorized_devices/' + devId), { branchId });
    showAlert(currentLang === 'ar' ? "تم ربط الجهاز بالفرع" : "Device linked to branch", 'success');
};

window.showSection = function(sectionName) {
    // إخفاء كل السكاشن الحالية
    const sections = document.querySelectorAll('#data-display section');
    sections.forEach(s => s.style.display = 'none');
    
    // إظهار السكشن المطلوب
    const targetSection = document.getElementById('section-' + sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // تشغيل وظيفة جلب البيانات بناءً على القسم
        if (sectionName === 'devices') {
            listenToDevices(); 
        } else if (sectionName === 'branches') {
            listenToBranches();
        }
    } else {
        console.error("القسم المطلوب غير موجود: section-" + sectionName);
    }
};

// 5. تشغيل النظام عند التحميل
document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    updateDeviceStatus();
    // اختياري: إذا أردت مراقبة الطلبات فور الدخول
    // listenToData(); 
});


function listenToDevices() {
    const devicesRef = ref(db, 'authorized_devices');
    onValue(devicesRef, (snapshot) => {
        const devices = snapshot.val();
        const grid = document.getElementById('active-devices-grid');
        if (!grid) return;
        
        grid.innerHTML = ""; // مسح القائمة الحالية قبل التحديث
        
        if (devices) {
            for (let id in devices) {
                const dev = devices[id];
                grid.innerHTML += `
                    <div class="login-card" style="padding:15px; text-align:right; border:1px solid #eee; margin:10px;">
                        <p><strong>جهاز ID:</strong> ${dev.id}</p>
                        <p><strong>الحالة:</strong> ${dev.status === 'online' ? '🟢 متصل' : '⚪ غير متصل'}</p>
                        <p><strong>آخر ظهور:</strong> ${dev.lastSeen || 'غير معروف'}</p>
                    </div>
                `;
            }
        } else {
            grid.innerHTML = "<p>لا توجد أجهزة متصلة حالياً</p>";
        }
    });
}
