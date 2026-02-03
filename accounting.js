/***********************
 * Firebase init
 ***********************/
const firebaseConfig = {
  apiKey: "AIzaSyBdDFbWuByBWsDqEmC18nSlIKG6QZ5s0wA",
  authDomain: "fawatirr-75242.firebaseapp.com",
  databaseURL: "https://fawatirr-75242-default-rtdb.firebaseio.com",
  projectId: "fawatirr-75242",
  storageBucket: "fawatirr-75242.firebasestorage.app",
  messagingSenderId: "1059799456100",
  appId: "1:1059799456100:web:d624eb6f98aaee78950271",
  measurementId: "G-7SQXEJQY6Y",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const TS = firebase.database.ServerValue.TIMESTAMP;

const $ = (id) => document.getElementById(id);
function show(el, yes) { el.style.display = yes ? "" : "none"; }
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function money(n){ const x = Number(n||0); return (Math.round(x*100)/100).toString(); }

const state = {
  deviceId: getOrCreateDeviceId(),
  user: null, // {id,name,role,pin}
  role: null,
  branches: [],
  schemas: {},
  cache: {},
};

function getOrCreateDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

/***********************
 * UI refs
 ***********************/
const loginPage = $("loginPage");
const appShell = $("appShell");
const loginBtn = $("loginBtn");
const loginAlert = $("loginAlert");
const pinInput = $("pinInput");

const userLabel = $("userLabel");
const roleLabel = $("roleLabel");
const toggleLangBtn = $("toggleLangBtn");
const logoutBtn = $("logoutBtn");

const nav = $("nav");
const moduleTitle = $("moduleTitle");
const moduleBody = $("moduleBody");
const deviceIdLabel = $("deviceIdLabel");

/***********************
 * Language
 ***********************/
toggleLangBtn.addEventListener("click", () => {
  const next = window.i18nGetLang() === "ar" ? "en" : "ar";
  window.i18nSetLang(next);
  window.i18nApply();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("adminSession");
  state.user = null;
  state.role = null;
  show(appShell, false);
  show(loginPage, true);
  hideAlert(loginAlert);
});

/***********************
 * Presence + devices listing (Admin online)
 ***********************/
function startPresence() {
  deviceIdLabel.textContent = `${window.i18nT("label_device") || "Device"}: ${state.deviceId}`;

  const ref = db.ref(`devices/${state.deviceId}`);
  ref.update({
    deviceId: state.deviceId,
    type: "admin_client",
    userAgent: navigator.userAgent || "",
    lastSeen: TS,
    online: true,
  });

  ref.onDisconnect().update({ online: false, lastSeen: TS });

  setInterval(() => {
    ref.update({ online: true, lastSeen: TS, userName: state.user?.name || "" });
  }, 10000);
}



/***********************
 * Seed default data (important for "system كامل")
 ***********************/
async function ensureSeed() {
  // Seed default admin user if no users exist
  const uSnap = await db.ref("users").once("value");
  if (!uSnap.exists()) {
    const id = db.ref("users").push().key;
    await db.ref(`users/${id}`).set({
      name: "غير معرف",
      role: "manager",     // manager / cashier / storekeeper
      pin: "123456",
      active: true,
      createdAt: TS,
    });
  }

  // Seed payment methods/order types if missing (so cashier works directly)
  const pmSnap = await db.ref("paymentMethods").once("value");
  if (!pmSnap.exists()) {
    const a = db.ref("paymentMethods").push().key;
    const b = db.ref("paymentMethods").push().key;
    await db.ref().update({
      [`paymentMethods/${a}`]: { name: "كاش", active: true, createdAt: TS },
      [`paymentMethods/${b}`]: { name: "بطاقة", active: true, createdAt: TS },
    });
  }

  const otSnap = await db.ref("orderTypes").once("value");
  if (!otSnap.exists()) {
    const a = db.ref("orderTypes").push().key;
    const b = db.ref("orderTypes").push().key;
    await db.ref().update({
      [`orderTypes/${a}`]: { name: "محلي", active: true, createdAt: TS },
      [`orderTypes/${b}`]: { name: "توصيل", active: true, createdAt: TS },
    });
  }

  // Seed a sample branch if missing (you can edit/delete)
  const brSnap = await db.ref("branches").once("value");
  if (!brSnap.exists()) {
    const id = db.ref("branches").push().key;
    await db.ref(`branches/${id}`).set({
      name: "الفرع الرئيسي",
      active: true,
      createdAt: TS,
    });
  }
}

/***********************
 * Login logic (PIN -> users)
 ***********************/
function setAlert(el, msgKeyOrText, type) {
  el.className = `alert ${type}`;
  el.textContent = window.i18nT(msgKeyOrText) || msgKeyOrText;
  show(el, true);
}
function hideAlert(el){ show(el,false); }

loginBtn.addEventListener("click", () => doLogin());

pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});

async function doLogin() {
  hideAlert(loginAlert);

  const pin = (pinInput.value || "").trim();
  if (!pin) return setAlert(loginAlert, "err_enter_pin", "warn");

  try {
    // -------- 1) Query as string ----------
    let snap = await db.ref("users").orderByChild("pin").equalTo(pin).once("value");

    // -------- 2) Query as number (if digits) ----------
    if (!snap.exists() && /^\d+$/.test(pin)) {
      snap = await db.ref("users").orderByChild("pin").equalTo(Number(pin)).once("value");
    }

    let obj = snap.val();

    // -------- 3) Fallback: client-side search (diagnostic + works even without index) ----------
    if (!obj) {
      const allSnap = await db.ref("users").once("value");
      const allObj = allSnap.val() || {};

      // Console diagnostics (safe summary)
      const count = Object.keys(allObj).length;
      console.warn("[LOGIN] Query returned empty. Falling back to client search.");
      console.warn("[LOGIN] users count:", count);

      // Try to match by different common shapes
      const entries = Object.entries(allObj);

      // find any match where:
      // - u.pin equals pin as string
      // - u.pin equals pin as number
      // - u.pin is stored under u.password (common mistake)
      // - u.pin has spaces
      const pinNum = /^\d+$/.test(pin) ? Number(pin) : null;

      let picked = null;

      for (const [id, u] of entries) {
        if (!u || u.active === false) continue;

        const rawPin = u.pin ?? u.PIN ?? u.password ?? u.pass ?? null;

        // normalize
        const rawPinStr = rawPin !== null && rawPin !== undefined ? String(rawPin).trim() : "";
        const rawPinNum = rawPinStr && /^\d+$/.test(rawPinStr) ? Number(rawPinStr) : null;

        if (rawPinStr === pin || (pinNum !== null && rawPinNum === pinNum)) {
          picked = { id, ...u };
          break;
        }
      }

      if (!picked) {
        // Show extra hint: show first 3 pin samples (masked)
        const samples = entries.slice(0, 3).map(([id, u]) => {
          const v = u?.pin ?? u?.PIN ?? u?.password ?? "";
          const s = String(v ?? "").trim();
          const masked = s ? s.replace(/\d/g, "•") : "(empty)";
          return { id, pinShape: typeof v, masked };
        });
        console.warn("[LOGIN] sample pins (masked):", samples);

        return setAlert(loginAlert, "err_invalid_pin", "warn");
      }

      // matched via fallback
      state.user = picked;
      state.role = picked.role;

      localStorage.setItem(
        "adminSession",
        JSON.stringify({ userId: picked.id, ts: Date.now() })
      );
      enterApp();
      return;
    }

    // -------- Normal path (query matched) ----------
    // pick first active user
    let picked = null;
    for (const [id, u] of Object.entries(obj)) {
      if (!u || u.active === false) continue;
      picked = { id, ...u };
      break;
    }

    if (!picked) return setAlert(loginAlert, "err_user_inactive", "warn");

    state.user = picked;
    state.role = picked.role;

    localStorage.setItem(
      "adminSession",
      JSON.stringify({ userId: picked.id, ts: Date.now() })
    );
    enterApp();
  } catch (err) {
    console.error("doLogin error:", err);
    setAlert(loginAlert, "err_firebase_or_rules", "warn");
  }
}



async function restoreSession() {
  try {
    const raw = localStorage.getItem("adminSession");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (!s.userId) return;

    const snap = await db.ref(`users/${s.userId}`).once("value");
    const u = snap.val();
    if (!u || u.active === false) return;

    state.user = { id: s.userId, ...u };
    state.role = u.role;
    enterApp();
  } catch (_) {}
}

/***********************
 * Role permissions
 ***********************/
function applyRolePermissions() {
  // manager: all
  // cashier: no stores group + no suppliers group
  // storekeeper: no admin group
  const role = state.role;

  // mark restricted items with data-perm
  // We'll hide whole groups with simple rules:
  const storesGroup = nav.querySelector('[data-group-body="stores"]')?.parentElement;
  const suppliersGroup = nav.querySelector('[data-group-body="suppliers"]')?.parentElement;
  const adminGroup = nav.querySelector('[data-group-body="admin"]')?.parentElement;

  if (role === "cashier") {
    if (storesGroup) storesGroup.style.display = "none";
    if (suppliersGroup) suppliersGroup.style.display = "none";
    if (adminGroup) adminGroup.style.display = "";
  } else if (role === "storekeeper") {
    if (storesGroup) storesGroup.style.display = "";
    if (suppliersGroup) suppliersGroup.style.display = "";
    if (adminGroup) adminGroup.style.display = "none";
  } else {
    // manager
    if (storesGroup) storesGroup.style.display = "";
    if (suppliersGroup) suppliersGroup.style.display = "";
    if (adminGroup) adminGroup.style.display = "";
  }
}

/***********************
 * Navigation (router)
 ***********************/
function setupNav() {
  // toggle groups
  document.querySelectorAll(".groupToggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.getAttribute("data-group");
      const body = document.querySelector(`[data-group-body="${group}"]`);
      if (!body) return;
      const open = body.classList.toggle("open");
      btn.querySelector(".chev").textContent = open ? "▴" : "▾";
    });
  });

  // route clicks
  nav.querySelectorAll("button.navItem, button.navSub").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      if (!route) return;
      location.hash = "#" + route;
    });
  });

  window.addEventListener("hashchange", () => {
    const route = (location.hash || "#orders").slice(1);
    openModule(route);
  });
}

/***********************
 * Schemas (CRUD engine)
 * - "نظام كامل" هنا يعني: كل الأقسام موجودة وتعمل CRUD مباشرة على Firebase
 ***********************/
function buildSchemas() {
  const t = (k) => window.i18nT(k) || k;

  // Generic schemas for CRUD modules
  state.schemas = {
    customers: {
      titleKey: "nav_customers",
      path: "customers",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "phone", labelKey: "field_phone", type: "text", required: false },
        { key: "active", labelKey: "field_active", type: "bool", required: false },
      ],
    },
    products: {
      titleKey: "nav_products",
      path: "products",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "sku", labelKey: "field_sku", type: "text", required: false },
        { key: "price", labelKey: "field_price", type: "number", required: true },
        { key: "categoryId", labelKey: "field_category", type: "ref", refPath: "productCategories", refLabel: "name" },
        { key: "unitId", labelKey: "field_unit", type: "ref", refPath: "units", refLabel: "name" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    productCategories: {
      titleKey: "nav_product_categories",
      path: "productCategories",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    units: {
      titleKey: "nav_units",
      path: "units",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    itemCards: {
      titleKey: "nav_item_card",
      path: "itemCards",
      fields: [
        { key: "productId", labelKey: "field_product", type: "ref", refPath: "products", refLabel: "name" },
        { key: "notes", labelKey: "field_notes", type: "text" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },

    // Stores
    stockMaterials: {
      titleKey: "nav_stock_materials",
      path: "stockMaterials",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "categoryId", labelKey: "field_category", type: "ref", refPath: "materialCategories", refLabel: "name" },
        { key: "qty", labelKey: "field_qty", type: "number" },
        { key: "unit", labelKey: "field_unit", type: "text" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    materialCategories: {
      titleKey: "nav_material_categories",
      path: "materialCategories",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    storageLocations: {
      titleKey: "nav_storage_locations",
      path: "storageLocations",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "branchId", labelKey: "field_branch", type: "ref", refPath: "branches", refLabel: "name" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },

    // Suppliers
    suppliers: {
      titleKey: "nav_suppliers",
      path: "suppliers",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "phone", labelKey: "field_phone", type: "text" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    purchases: {
      titleKey: "nav_purchases",
      path: "purchases",
      fields: [
        { key: "supplierId", labelKey: "field_supplier", type: "ref", refPath: "suppliers", refLabel: "name" },
        { key: "total", labelKey: "field_total", type: "number" },
        { key: "notes", labelKey: "field_notes", type: "text" },
        { key: "createdAt", labelKey: "field_created_at", type: "readonly" },
      ],
    },

    // Admin data
    branches: {
      titleKey: "nav_branches",
      path: "branches",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    deliveryZones: {
      titleKey: "nav_delivery_zones",
      path: "deliveryZones",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    deliveryPrices: {
      titleKey: "nav_delivery_prices",
      path: "deliveryPrices",
      fields: [
        { key: "zoneId", labelKey: "field_zone", type: "ref", refPath: "deliveryZones", refLabel: "name" },
        { key: "price", labelKey: "field_price", type: "number", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    discounts: {
      titleKey: "nav_discounts",
      path: "discounts",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "amount", labelKey: "field_amount", type: "number" },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    orderTypes: {
      titleKey: "nav_order_types",
      path: "orderTypes",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    paymentMethods: {
      titleKey: "nav_payment_methods",
      path: "paymentMethods",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },

    // Employees lists (simple)
    warehouseEmployees: {
      titleKey: "nav_warehouse_employees",
      path: "warehouseEmployees",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
    productionEmployees: {
      titleKey: "nav_production_employees",
      path: "productionEmployees",
      fields: [
        { key: "name", labelKey: "field_name", type: "text", required: true },
        { key: "active", labelKey: "field_active", type: "bool" },
      ],
    },
  };
}

/***********************
 * Orders module (special)
 ***********************/
function renderOrdersModule() {
  moduleTitle.textContent = window.i18nT("nav_orders") || "Orders";
  moduleBody.innerHTML = `
    <div class="card">
      <div class="row between">
        <h3 data-i18n="orders_all">كل الطلبات (لحظي)</h3>
        <div class="row">
          <label class="muted small" data-i18n="label_branch">الفرع</label>
          <select id="ordersBranchSelect" class="miniSelect"></select>
        </div>
      </div>
      <div class="list" id="ordersList"></div>
      <div class="muted small mt" data-i18n="orders_note">
        الطلبات محفوظة حسب الفرع + نسخة عامة للإدارة.
      </div>
    </div>
  `;
  window.i18nApplyWithin(moduleBody);

  const sel = moduleBody.querySelector("#ordersBranchSelect");
  const list = moduleBody.querySelector("#ordersList");

  // branches live
  db.ref("branches").on("value", (s) => {
    const obj = s.val() || {};
    const branches = Object.entries(obj).map(([id, b]) => ({ id, ...b }));
    state.branches = branches;

    sel.innerHTML = "";
    const oAll = document.createElement("option");
    oAll.value = "ALL";
    oAll.textContent = window.i18nT("all") || "ALL";
    sel.appendChild(oAll);

    branches.forEach((b) => {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = b.name || "-";
      sel.appendChild(o);
    });
  });

  function renderOrders(obj) {
    const orders = Object.entries(obj || {})
      .map(([id, o]) => ({ id, ...o }))
      .sort((a, b) => (a.createdAt || 0) < (b.createdAt || 0) ? 1 : -1)
      .slice(0, 200);

    list.innerHTML = "";
    orders.forEach((o) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(o.id)}</div>
          <div class="itemSub muted">
            ${escapeHtml(o.branchName || "")} • ${escapeHtml(o.cashierName || "")} • ${window.i18nT("label_total") || "Total"}: ${money(o.total)}
          </div>
        </div>
        <div class="itemRight">
          <span class="tag">${escapeHtml(o.status || "new")}</span>
        </div>
      `;
      list.appendChild(row);
    });
  }

  let currentRef = null;
  function attachRef(mode) {
    if (currentRef) currentRef.off();
    if (mode === "ALL") currentRef = db.ref("ordersAll");
    else currentRef = db.ref(`orders/${mode}`);

    currentRef.limitToLast(300).on("value", (s) => renderOrders(s.val() || {}));
  }

  sel.addEventListener("change", () => attachRef(sel.value));
  attachRef("ALL");
}

/***********************
 * Devices + Cashiers (special)
 * - الأجهزة: تظهر الأجهزة المتصلة وغير المتصلة (online flag + lastSeen)
 * - تعيين فرع للجهاز: branchId
 * - إضافة كاشير: name + code أو إنشاء 4 أرقام
 ***********************/
function renderDevicesModule() {
  moduleTitle.textContent = window.i18nT("nav_devices_cashier") || "Devices & Cashier";
  moduleBody.innerHTML = `
    <div class="grid2">
      <div class="card">
        <div class="row between">
          <h3 data-i18n="devices_title">الأجهزة</h3>
          <button class="btn mini danger" id="cleanupOfflineBtn" data-i18n="btn_cleanup">تنظيف غير متصل</button>
        </div>
        <div class="muted small" data-i18n="devices_note">
          تعيين الفرع للجهاز إلزامي لكي يعمل الكاشير على ذلك الجهاز. يبقى محفوظاً حتى لو أغلق الجهاز وعاد لاحقاً.
        </div>
        <div class="list mt" id="devicesList"></div>
      </div>

      <div class="card">
        <div class="row between">
          <h3 data-i18n="cashiers_title">الكاشير</h3>
          <button class="btn mini" id="newCashierBtn" data-i18n="btn_add">إضافة</button>
        </div>
        <div class="list mt" id="cashiersList"></div>
      </div>
    </div>
  `;
  window.i18nApplyWithin(moduleBody);

  const devicesList = moduleBody.querySelector("#devicesList");
  const cashiersList = moduleBody.querySelector("#cashiersList");
  const newCashierBtn = moduleBody.querySelector("#newCashierBtn");
  const cleanupOfflineBtn = moduleBody.querySelector("#cleanupOfflineBtn");

  // Branches for selects
  let branches = [];
  db.ref("branches").on("value", (s) => {
    const obj = s.val() || {};
    branches = Object.entries(obj).map(([id, b]) => ({ id, ...b }));
  });

  // Devices live
  db.ref("devices").on("value", (s) => {
    const obj = s.val() || {};
    const devices = Object.entries(obj).map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

    devicesList.innerHTML = "";
    devices.forEach((d) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      const online = d.online ? "ok" : "warn";

      const branchName = branches.find((b) => b.id === d.branchId)?.name || "";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(d.id)}</div>
          <div class="itemSub muted">
            <span class="dot ${online}"></span>
            ${d.online ? (window.i18nT("status_online") || "Online") : (window.i18nT("status_offline") || "Offline")}
            • ${window.i18nT("label_branch") || "Branch"}: <b>${escapeHtml(branchName || "-")}</b>
          </div>
        </div>
        <div class="itemRight">
          <div class="row">
            <select class="miniSelect branchSel"></select>
            <button class="btn mini danger unassignBtn" data-i18n="btn_unassign">إلغاء</button>
          </div>
        </div>
      `;

      const sel = row.querySelector(".branchSel");
      const unassignBtn = row.querySelector(".unassignBtn");

      // fill branches
      sel.innerHTML = "";
      const o0 = document.createElement("option");
      o0.value = "";
      o0.textContent = window.i18nT("choose") || "Choose";
      sel.appendChild(o0);
      branches.forEach((b) => {
        const o = document.createElement("option");
        o.value = b.id;
        o.textContent = b.name || "-";
        sel.appendChild(o);
      });
      sel.value = d.branchId || "";

      sel.addEventListener("change", async () => {
        await db.ref(`devices/${d.id}`).update({
          branchId: sel.value || null,
          branchAssignedAt: TS,
        });
      });

      unassignBtn.addEventListener("click", async () => {
        await db.ref(`devices/${d.id}`).update({ branchId: null, branchAssignedAt: TS });
      });

      devicesList.appendChild(row);
      window.i18nApplyWithin(row);
    });
  });

  // Cashiers live
  db.ref("cashiers").on("value", (s) => {
    const obj = s.val() || {};
    const cashiers = Object.entries(obj).map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    cashiersList.innerHTML = "";
    cashiers.forEach((c) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(c.name || "-")}</div>
          <div class="itemSub muted">${window.i18nT("label_cashier_code") || "Code"}: <b>${escapeHtml(c.code || "")}</b> • ${window.i18nT("field_active") || "Active"}: <b>${c.active !== false ? (window.i18nT("yes")||"Yes") : (window.i18nT("no")||"No")}</b></div>
        </div>
        <div class="itemRight">
          <div class="row">
            <button class="btn mini" data-i18n="btn_edit">تعديل</button>
            <button class="btn mini danger" data-i18n="btn_delete">حذف</button>
          </div>
        </div>
      `;

      const [editBtn, delBtn] = row.querySelectorAll("button");

      editBtn.addEventListener("click", async () => {
        const name = prompt(window.i18nT("prompt_cashier_name") || "Cashier name", c.name || "");
        if (name === null) return;
        const code = prompt(window.i18nT("prompt_cashier_code") || "Cashier code", c.code || "");
        if (code === null) return;
        const active = confirm(window.i18nT("prompt_active_confirm") || "Active?");
        await db.ref(`cashiers/${c.id}`).update({
          name: name.trim(),
          code: String(code).trim(),
          active,
          updatedAt: TS,
        });
      });

      delBtn.addEventListener("click", async () => {
        const ok = confirm(window.i18nT("confirm_delete") || "Delete?");
        if (!ok) return;
        await db.ref(`cashiers/${c.id}`).remove();
      });

      cashiersList.appendChild(row);
      window.i18nApplyWithin(row);
    });
  });

  newCashierBtn.addEventListener("click", async () => {
    const name = prompt(window.i18nT("prompt_cashier_name") || "Cashier name");
    if (!name) return;

    let code = prompt(window.i18nT("prompt_cashier_code_or_create") || "Enter code or leave empty to create");
    if (code === null) return;

    code = String(code || "").trim();
    if (!code) code = String(Math.floor(1000 + Math.random() * 9000)); // 4 digits

    const id = db.ref("cashiers").push().key;
    await db.ref(`cashiers/${id}`).set({
      name: name.trim(),
      code,
      active: true,
      createdAt: TS,
    });
  });

  cleanupOfflineBtn.addEventListener("click", async () => {
    // optional: clean devices that are offline and unassigned
    const snap = await db.ref("devices").once("value");
    const obj = snap.val() || {};
    const updates = {};
    for (const [id, d] of Object.entries(obj)) {
      const offline = !d.online;
      const unassigned = !d.branchId;
      if (offline && unassigned) updates[`devices/${id}`] = null;
    }
    await db.ref().update(updates);
    alert(window.i18nT("ok_cleanup_done") || "Done");
  });
}

/***********************
 * Users module (special)
 * - مدير افتراضي: "غير معرف" pin 123456
 * - إضافة مستخدم + دور (manager/cashier/storekeeper)
 * - تعديل الاسم/الرمز/الدور/تفعيل
 ***********************/
function renderUsersModule() {
  moduleTitle.textContent = window.i18nT("nav_users") || "Users";
  moduleBody.innerHTML = `
    <div class="card">
      <div class="row between">
        <h3 data-i18n="users_title">المستخدمين</h3>
        <button class="btn mini" id="newUserBtn" data-i18n="btn_add">إضافة</button>
      </div>
      <div class="muted small" data-i18n="users_note">
        المدير يصل لكل الأقسام. أمين الصندوق لا يدخل المخازن/الموردون. أمين المخازن لا يدخل الإدارة.
      </div>
      <div class="list mt" id="usersList"></div>
    </div>
  `;
  window.i18nApplyWithin(moduleBody);

  const usersList = moduleBody.querySelector("#usersList");
  const newUserBtn = moduleBody.querySelector("#newUserBtn");

  db.ref("users").on("value", (s) => {
    const obj = s.val() || {};
    const users = Object.entries(obj).map(([id, u]) => ({ id, ...u }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    usersList.innerHTML = "";
    users.forEach((u) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(u.name || "-")}</div>
          <div class="itemSub muted">
            ${window.i18nT("label_role") || "Role"}: <b>${escapeHtml(u.role || "")}</b>
            • ${window.i18nT("label_pin") || "PIN"}: <b>${escapeHtml(u.pin || "")}</b>
            • ${window.i18nT("field_active") || "Active"}: <b>${u.active !== false ? (window.i18nT("yes")||"Yes") : (window.i18nT("no")||"No")}</b>
          </div>
        </div>
        <div class="itemRight">
          <div class="row">
            <button class="btn mini" data-i18n="btn_edit">تعديل</button>
            <button class="btn mini danger" data-i18n="btn_delete">حذف</button>
          </div>
        </div>
      `;
      const [editBtn, delBtn] = row.querySelectorAll("button");

      editBtn.addEventListener("click", async () => {
        const name = prompt(window.i18nT("prompt_username") || "Username", u.name || "");
        if (name === null) return;

        const role = prompt(window.i18nT("prompt_role") || "Role: manager / cashier / storekeeper", u.role || "manager");
        if (role === null) return;

        const pin = prompt(window.i18nT("prompt_pin") || "PIN", u.pin || "");
        if (pin === null) return;

        const active = confirm(window.i18nT("prompt_active_confirm") || "Active?");
        await db.ref(`users/${u.id}`).update({
          name: name.trim(),
          role: String(role).trim(),
          pin: String(pin).trim(),
          active,
          updatedAt: TS,
        });

        // if editing myself, refresh state live
        if (state.user?.id === u.id) {
          state.user.name = name.trim();
          state.role = String(role).trim();
          applyRolePermissions();
          refreshUserBadge();
        }
      });

      delBtn.addEventListener("click", async () => {
        if (u.id === state.user?.id) {
          alert(window.i18nT("err_cannot_delete_self") || "Cannot delete yourself");
          return;
        }
        const ok = confirm(window.i18nT("confirm_delete") || "Delete?");
        if (!ok) return;
        await db.ref(`users/${u.id}`).remove();
      });

      usersList.appendChild(row);
      window.i18nApplyWithin(row);
    });
  });

  newUserBtn.addEventListener("click", async () => {
    // 1. تعريف الحقول التي نريدها في النافذة
    const userSchema = {
        titleKey: "users_title",
        fields: [
            { key: "name", labelKey: "label_username", type: "text", required: true },
            { key: "role", labelKey: "label_role", type: "text", required: true },
            { key: "pin", labelKey: "label_pin", type: "text", required: true }
        ]
    };

    // 2. استدعاء النافذة وانتظار المستخدم حتى يضغط "حفظ"
    const payload = await promptForFields(userSchema, null, {});
    
    // إذا أغلق المستخدم النافذة بدون حفظ، نتوقف هنا
    if (!payload) return;

    // 3. حفظ البيانات في فايربيس دفعة واحدة
    const id = db.ref("users").push().key;
    await db.ref(`users/${id}`).set({
      name: payload.name.trim(),
      role: payload.role.trim(),
      pin: payload.pin.trim(),
      active: true,
      createdAt: TS,
    });

  });
}

/***********************
 * Generic CRUD module renderer
 ***********************/
async function renderCrudModule(schemaKey) {
  const schema = state.schemas[schemaKey];
  if (!schema) {
    moduleTitle.textContent = window.i18nT("not_found") || "Not found";
    moduleBody.innerHTML = `<div class="card"><div class="alert warn">${window.i18nT("err_module_not_found") || "Module not found"}</div></div>`;
    return;
  }

  moduleTitle.textContent = window.i18nT(schema.titleKey) || schemaKey;

  moduleBody.innerHTML = `
    <div class="card">
      <div class="row between">
        <h3 data-i18n="${schema.titleKey}"></h3>
        <div class="row">
          <input id="searchBox" class="miniInput" placeholder="${window.i18nT("search") || "Search"}" />
          <button class="btn mini" id="addBtn" data-i18n="btn_add">إضافة</button>
        </div>
      </div>
      <div class="list mt" id="rowsList"></div>
      <div class="muted small mt" data-i18n="crud_live_note">التغييرات تظهر فوراً لكل الأجهزة دون تحديث.</div>
    </div>
  `;
  window.i18nApplyWithin(moduleBody);

  const searchBox = moduleBody.querySelector("#searchBox");
  const addBtn = moduleBody.querySelector("#addBtn");
  const rowsList = moduleBody.querySelector("#rowsList");

  // Preload refs for dropdown fields
  const refData = {};
  const refNeeds = schema.fields.filter((f) => f.type === "ref");
  await Promise.all(refNeeds.map(async (f) => {
    const snap = await db.ref(f.refPath).once("value");
    const obj = snap.val() || {};
    refData[f.refPath] = Object.entries(obj).map(([id, x]) => ({ id, ...x })).filter(x => x.active !== false);
  }));

  // Live list
  const ref = db.ref(schema.path);
  ref.on("value", (s) => {
    const obj = s.val() || {};
    state.cache[schema.path] = obj;
    draw(obj);
  });

  function draw(obj) {
    const q = (searchBox.value || "").trim().toLowerCase();
    const rows = Object.entries(obj || {}).map(([id, x]) => ({ id, ...x }))
      .filter((x) => x.active !== false || schemaKey === "purchases") // keep purchases visible
      .filter((x) => {
        if (!q) return true;
        const txt = JSON.stringify(x).toLowerCase();
        return txt.includes(q);
      })
      .slice(0, 400);

    rowsList.innerHTML = "";
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "itemRow";

      const mainTitle = escapeHtml(r.name || r.id);
      const subParts = [];

      schema.fields.forEach((f) => {
        if (f.key === "name") return;
        if (f.type === "readonly") return;
        let v = r[f.key];

        if (f.type === "ref") {
          const list = refData[f.refPath] || [];
          const item = list.find((x) => x.id === v);
          v = item ? item[f.refLabel] : "";
        }
        if (v === undefined || v === null || v === "") return;
        subParts.push(`${escapeHtml(f.key)}: ${escapeHtml(String(v))}`);
      });

      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${mainTitle}</div>
          <div class="itemSub muted">${subParts.join(" • ")}</div>
        </div>
        <div class="itemRight">
          <div class="row">
            <button class="btn mini" data-i18n="btn_edit">تعديل</button>
            <button class="btn mini danger" data-i18n="btn_delete">حذف</button>
          </div>
        </div>
      `;

      const [editBtn, delBtn] = row.querySelectorAll("button");

      editBtn.addEventListener("click", async () => {
    const userSchema = {
        titleKey: "users_title",
        fields: [
            { key: "name", labelKey: "label_username", type: "text", required: true },
            { key: "role", labelKey: "label_role", type: "text", required: true },
            { key: "pin", labelKey: "label_pin", type: "text", required: true },
            { key: "active", labelKey: "field_active", type: "bool" }
        ]
    };

    // نمرر بيانات المستخدم الحالي (u) لتظهر تلقائياً في الخانات
    const payload = await promptForFields(userSchema, u, {});
    if (!payload) return;

    await db.ref(`users/${u.id}`).update({
        ...payload,
        updatedAt: TS
    });
});

      delBtn.addEventListener("click", async () => {
    if (u.id === state.user?.id) {
        alert(window.i18nT("err_cannot_delete_self"));
        return;
    }
    
    // استخدام نافذة التأكيد الخاصة بالموقع
    const ok = await confirmCustom("confirm_delete"); 
    if (!ok) return;
    
    await db.ref(`users/${u.id}`).remove();
});

      rowsList.appendChild(row);
      window.i18nApplyWithin(row);
    });
  }

  searchBox.addEventListener("input", () => draw(state.cache[schema.path] || {}));

  addBtn.addEventListener("click", async () => {
    const payload = await promptForFields(schema, null, refData);
    if (!payload) return;
    const id = db.ref(schema.path).push().key;
    payload.createdAt = TS;
    await db.ref(`${schema.path}/${id}`).set(payload);
  });
}

// دوال التحكم في النافذة المنبثقة
function closeCustomModal() {
  $('customModal').style.display = 'none';
}

// دالة الحذف المخصصة
async function confirmCustom(msgKey) {
  return new Promise((resolve) => {
    const modal = $('customModal');
    const container = $('modalFieldsContainer');
    const title = $('modalTitle');
    const saveBtn = $('modalConfirmBtn');

    title.textContent = window.i18nT('confirm_delete') || "تأكيد";
    container.innerHTML = `<p style="text-align:center; padding:20px;">${window.i18nT(msgKey) || msgKey}</p>`;
    saveBtn.textContent = window.i18nT('yes');
    saveBtn.className = "btn danger"; // جعل الزر أحمر للحذف
    modal.style.display = "flex";

    saveBtn.onclick = () => {
      modal.style.display = "none";
      resolve(true);
    };

    window.closeCustomModal = () => {
      modal.style.display = "none";
      resolve(false);
    };
  });
}

// دالة الحقول المخصصة (تعديل لتشمل تصميمك)
async function promptForFields(schema, existing, refData) {
  return new Promise((resolve) => {
    const modal = $('customModal');
    const container = $('modalFieldsContainer');
    const title = $('modalTitle');
    const saveBtn = $('modalConfirmBtn');

    title.textContent = window.i18nT(schema.titleKey) || "بيانات";
    saveBtn.textContent = window.i18nT('btn_save') || "حفظ";
    saveBtn.className = "btn primary";
    container.innerHTML = "";
    modal.style.display = "flex";

    const inputsRefs = {};
    schema.fields.forEach(f => {
      if (f.type === "readonly") return;
      const fieldDiv = document.createElement('div');
      fieldDiv.className = "field";
      fieldDiv.innerHTML = `<label>${window.i18nT(f.labelKey) || f.key}</label>`;
      
      let input;
      if (f.type === "bool") {
        input = document.createElement('select');
        input.innerHTML = `<option value="true">${window.i18nT('yes')}</option><option value="false">${window.i18nT('no')}</option>`;
        input.value = existing ? String(existing[f.key]) : "true";
      } else {
        input = document.createElement('input');
        input.type = f.type === "number" ? "number" : "text";
        input.value = existing ? (existing[f.key] ?? "") : "";
      }
      fieldDiv.appendChild(input);
      container.appendChild(fieldDiv);
      inputsRefs[f.key] = { input, field: f };
    });

    saveBtn.onclick = () => {
      const data = {};
      for (const key in inputsRefs) {
        const { input, field } = inputsRefs[key];
        data[key] = field.type === "bool" ? (input.value === "true") : (field.type === "number" ? Number(input.value) : input.value);
      }
      modal.style.display = "none";
      resolve(data);
    };
  });
}

/***********************
 * Other placeholder modules (transactions screens)
 * - للعمليات: صرف/استلام/تحويل... يتم حفظها في RTDB كحركات، ويمكن توسعتها لاحقاً
 ***********************/
function renderPlaceholder(titleKey, path) {
  moduleTitle.textContent = window.i18nT(titleKey) || titleKey;
  moduleBody.innerHTML = `
    <div class="card">
      <h3 data-i18n="${titleKey}"></h3>
      <div class="muted small" data-i18n="placeholder_note">
        هذه شاشة تشغيلية جاهزة للحفظ كحركات. إذا رغبت، أضيف لك تدفق تفصيلي (مستندات/اعتماد/طباعة) فوق نفس البنية.
      </div>
      <div class="row mt">
        <button class="btn mini" id="addMoveBtn" data-i18n="btn_add_move">إضافة حركة</button>
      </div>
      <div class="list mt" id="movesList"></div>
    </div>
  `;
  window.i18nApplyWithin(moduleBody);

  const addBtn = moduleBody.querySelector("#addMoveBtn");
  const list = moduleBody.querySelector("#movesList");

  const ref = db.ref(path);
  ref.limitToLast(200).on("value", (s) => {
    const obj = s.val() || {};
    const rows = Object.entries(obj).map(([id, x]) => ({ id, ...x }))
      .sort((a, b) => (a.createdAt || 0) < (b.createdAt || 0) ? 1 : -1);
    list.innerHTML = "";
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(r.title || r.id)}</div>
          <div class="itemSub muted">${escapeHtml(r.notes || "")}</div>
        </div>
        <div class="itemRight">
          <button class="btn mini danger" data-i18n="btn_delete">حذف</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", async () => {
        const ok = confirm(window.i18nT("confirm_delete") || "Delete?");
        if (!ok) return;
        await db.ref(`${path}/${r.id}`).remove();
      });
      list.appendChild(row);
      window.i18nApplyWithin(row);
    });
  });

  addBtn.addEventListener("click", async () => {
    const title = prompt(window.i18nT("field_name") || "Name");
    if (!title) return;
    const notes = prompt(window.i18nT("field_notes") || "Notes") || "";
    const id = db.ref(path).push().key;
    await db.ref(`${path}/${id}`).set({
      title: title.trim(),
      notes: notes.trim(),
      createdAt: TS,
      createdBy: state.user?.name || "",
    });
  });
}

/***********************
 * Router open module
 ***********************/
function openModule(route) {
  // highlight active
  nav.querySelectorAll("button.navItem, button.navSub").forEach((b) => b.classList.remove("active"));
  nav.querySelectorAll(`[data-route="${route}"]`).forEach((b) => b.classList.add("active"));

  // route mapping
  if (route === "orders") return renderOrdersModule();
  if (route === "devices") return renderDevicesModule();
  if (route === "users") return renderUsersModule();

  // placeholders for operational stock flows
  if (route === "issue") return renderPlaceholder("nav_issue", "moves/issue");
  if (route === "production") return renderPlaceholder("nav_production", "moves/production");
  if (route === "inventory") return renderPlaceholder("nav_inventory", "moves/inventory");
  if (route === "receive") return renderPlaceholder("nav_receive", "moves/receive");
  if (route === "transfers") return renderPlaceholder("nav_transfers", "moves/transfers");
  if (route === "returnStore") return renderPlaceholder("nav_return_store", "moves/returnStore");
  if (route === "returnWaste") return renderPlaceholder("nav_return_waste", "moves/returnWaste");
  if (route === "returnSupplier") return renderPlaceholder("nav_return_supplier", "moves/returnSupplier");
  if (route === "pendingStockMoves") return renderPlaceholder("nav_pending_stock", "moves/pending");

  // else generic CRUD module if exists
  if (state.schemas[route]) return renderCrudModule(route);

  // fallback
  moduleTitle.textContent = window.i18nT("not_found") || "Not found";
  moduleBody.innerHTML = `<div class="card"><div class="alert warn">${window.i18nT("err_module_not_found") || "Module not found"}</div></div>`;
}

/***********************
 * Enter app
 ***********************/
function refreshUserBadge() {
  userLabel.textContent = state.user?.name || "-";
  roleLabel.textContent = state.role || "-";
}

function enterApp() {
  show(loginPage, false);
  show(appShell, true);

  refreshUserBadge();
  startPresence();
  buildSchemas();
  applyRolePermissions();
  setupNav();

  // open initial module
  const route = (location.hash || "#orders").slice(1);
  openModule(route);

  window.i18nApply();
}

/***********************
 * Boot
 ***********************/
(async function boot() {
  window.i18nApply();

  await ensureSeed();
  await restoreSession();
})();
