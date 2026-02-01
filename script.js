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
    
    // 1. فحص إذا كان مدير (123456) - المدير يدخل من أي جهاز
    if (pin === "123456") {
        document.getElementById("login-overlay").style.display = "none";
        sessionStorage.setItem("userRole", "manager");
        return;
    }

    // 2. فحص حالة الجهاز أولاً قبل دخول الكاشير
    onValue(ref(db, 'authorized_devices/' + deviceId), (snapshot) => {
        const deviceData = snapshot.val();
        if (!deviceData || !deviceData.branchId) {
            showAlert("هذا الجهاز غير معرف لفرع! يرجى التواصل مع الإدارة.", "error");
            return;
        }

        // 3. فحص إذا كان الرمز يخص كاشير
        onValue(ref(db, 'cashiers'), (cSnap) => {
            const cashiers = cSnap.val();
            let found = false;
            for (let id in cashiers) {
                if (cashiers[id].pin === pin) {
                    found = true;
                    // جلب اسم الفرع للتمييز
                    onValue(ref(db, 'branches/' + deviceData.branchId), (bSnap) => {
                        const branch = bSnap.val();
                        const fullName = `${cashiers[id].name} (${branch.nameAr})`;
                        
                        document.getElementById("login-overlay").style.display = "none";
                        sessionStorage.setItem("userRole", "cashier");
                        sessionStorage.setItem("userName", fullName);
                        sessionStorage.setItem("branchId", deviceData.branchId);
                        
                        showAlert(`أهلاً بك: ${fullName}`, "success");
                    });
                    break;
                }
            }
            if (!found) showAlert("رمز الدخول غير صحيح", "error");
        }, { onlyOnce: true });
    }, { onlyOnce: true });
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
    // 1. إخفاء كل السكاشن الحالية في منطقة العرض لضمان نظافة الواجهة
    const sections = document.querySelectorAll('#data-display section');
    sections.forEach(s => s.style.display = 'none');
    
    // 2. تحديد السكشن المستهدف بناءً على المعرف (ID) في الـ HTML
    // ملاحظة: تأكد أن الـ ID في HTML يبدأ بـ -section (مثلاً section-devices)
    const targetSection = document.getElementById('section-' + sectionName);
    
    if (targetSection) {
        // إظهار القسم المطلوب
        targetSection.style.display = 'block';
        
        // 3. تشغيل وظائف جلب البيانات الحية (Real-time) من فايربيس بناءً على نوع القسم
        if (sectionName === 'devices') {
            // تشغيل جلب الأجهزة المكتشفة وجلب قائمة الكاشيرية معاً في نفس الصفحة
            if (typeof listenToDevices === 'function') listenToDevices(); 
            if (typeof listenToCashiers === 'function') listenToCashiers();
        } 
        else if (sectionName === 'branches') {
            // جلب قائمة الفروع (مثل فرع أبو الحصانية والفرع الرئيسي)
            if (typeof listenToBranches === 'function') listenToBranches();
        }
        else if (sectionName === 'users') {
            // جلب إدارة المستخدمين وصلاحياتهم
            if (typeof listenToUsers === 'function') listenToUsers();
        }
        
        // يمكنك إضافة شروط (else if) هنا لبقية الأقسام (المنتجات، الطلبات، إلخ) عند برمجتها لاحقاً
        
    } else {
        // رسالة تنبيه لك في "Console" في حال نسيان إنشاء السكشن في ملف الـ HTML
        console.error("تنبيه: السكشن المطلوب 'section-" + sectionName + "' غير موجود في كود الـ HTML.");
    }
};

// 5. تشغيل النظام عند التحميل
document.addEventListener("DOMContentLoaded", () => {
    applyLanguage();
    updateDeviceStatus();
    // اختياري: إذا أردت مراقبة الطلبات فور الدخول
    // listenToData(); 
});

// استخدام النافذة window يمنع خطأ "Identifier already declared"
window.listenToDevices = function() {
    onValue(ref(db, 'authorized_devices'), (snapshot) => {
        const devices = snapshot.val();
        onValue(ref(db, 'branches'), (bSnap) => {
            const branches = bSnap.val() || {};
            const grid = document.getElementById('active-devices-grid');
            if (!grid) return;
            grid.innerHTML = "";

            for (let id in devices) {
                const dev = devices[id];
                let options = `<option value="">-- غير معرف لفرع --</option>`;
                for (let bId in branches) {
                    options += `<option value="${bId}" ${dev.branchId === bId ? 'selected' : ''}>${branches[bId].nameAr}</option>`;
                }

                grid.innerHTML += `
                    <div class="login-card" style="padding:20px; text-align:right; position:relative;">
                        <span style="font-size:12px; color:#999;">ID: ${dev.id}</span>
                        <p><strong>حالة الاتصال:</strong> ${dev.status === 'online' ? '🟢' : '⚪'}</p>
                        <label style="display:block; margin:10px 0 5px;">تخصيص لفرع:</label>
                        <select onchange="window.assignBranchToDevice('${dev.id}', this.value)" style="width:100%; padding:8px; border-radius:5px;">
                            ${options}
                        </select>
                        ${dev.id === deviceId ? '<p style="color:var(--accent-color); font-size:12px; margin-top:5px;">(هذا الجهاز الحالي)</p>' : ''}
                    </div>
                `;
            }
        });
    });
};

// إنشاء رمز عشوائي 4 أرقام
window.generatePin = function() {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// إضافة كاشير جديد
window.saveCashier = function(name, pin) {
    const cashierRef = push(ref(db, 'cashiers'));
    set(cashierRef, { name, pin, createdAt: new Date().toISOString() })
    .then(() => showAlert("تم إضافة الكاشير بنجاح", "success"));
};

// مراقبة قائمة الكاشيرية
function listenToCashiers() {
    onValue(ref(db, 'cashiers'), (snapshot) => {
        const cashiers = snapshot.val();
        const list = document.getElementById('cashiers-list');
        if (!list) return;
        list.innerHTML = "";
        for (let id in cashiers) {
            const c = cashiers[id];
            list.innerHTML += `
                <div class="login-card" style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${c.name}</strong><br>
                        <small>PIN: ${c.pin}</small>
                    </div>
                    <button onclick="window.deleteCashier('${id}')" style="background:none; border:none; cursor:pointer;">❌</button>
                </div>
            `;
        }
    });
}

// فتح وإغلاق النافذة
window.openCashierModal = function() {
    document.getElementById('cashier-modal').style.display = 'flex';
};

window.closeCashierModal = function() {
    document.getElementById('cashier-modal').style.display = 'none';
    document.getElementById('new-cashier-name').value = "";
    document.getElementById('new-cashier-pin').value = "";
};

// إنشاء رمز تلقائي ووضعه في الحقل
window.fillGeneratedPin = function() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    document.getElementById('new-cashier-pin').value = pin;
};

// إرسال البيانات لفايربيس
window.submitCashier = function() {
    const name = document.getElementById('new-cashier-name').value;
    const pin = document.getElementById('new-cashier-pin').value;

    if (!name || pin.length < 4) {
        showAlert(currentLang === 'ar' ? "يرجى إكمال البيانات بشكل صحيح" : "Please complete the data correctly", "error");
        return;
    }

    // حفظ الكاشير في قسم الكاشيرية
    const cashierRef = push(ref(db, 'cashiers'));
    set(cashierRef, {
        name: name,
        pin: pin,
        createdAt: new Date().toISOString()
    }).then(() => {
        showAlert(currentLang === 'ar' ? "تمت إضافة الكاشير بنجاح" : "Cashier added successfully", "success");
        closeCashierModal();
        listenToCashiers(); // تحديث القائمة فوراً
    });
};

// حذف كاشير
window.deleteCashier = function(id) {
    if (confirm(currentLang === 'ar' ? "هل أنت متأكد من الحذف؟" : "Are you sure?")) {
        set(ref(db, 'cashiers/' + id), null).then(() => {
            showAlert("تم الحذف", "success");
        });
    }
};
