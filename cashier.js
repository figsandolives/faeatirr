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

/***********************
 * Helpers
 ***********************/
const $ = (id) => document.getElementById(id);
const money = (n) => {
  const x = Number(n || 0);
  return (Math.round(x * 100) / 100).toString();
};

function show(el, yes) {
  el.style.display = yes ? "" : "none";
}

function setAlert(el, msgKeyOrText, type) {
  el.className = `alert ${type}`;
  const msg = window.i18nT(msgKeyOrText) || msgKeyOrText;
  el.textContent = msg;
  show(el, true);
}

function hideAlert(el) {
  show(el, false);
}

function getOrCreateDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = "dev_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

const state = {
  deviceId: getOrCreateDeviceId(),
  device: null,
  branchId: null,
  branch: null,
  cashier: null,
  cashierId: null,
  cart: {}, // productId -> {id,name,price,qty}
  products: [],
  customers: [],
  paymentMethods: [],
  orderTypes: [],
};

/***********************
 * UI refs
 ***********************/
const loginCard = $("loginCard");
const posLayout = $("posLayout");
const loginAlert = $("loginAlert");
const posOk = $("posOk");
const posWarn = $("posWarn");

const deviceIdLabel = $("deviceIdLabel");
const branchStatusText = $("branchStatusText");
const branchDot = $("branchDot");

const cashierCodeInput = $("cashierCodeInput");
const loginBtn = $("loginBtn");
const goHomeBtn = $("goHomeBtn");

const toggleLangBtn = $("toggleLangBtn");
const logoutBtn = $("logoutBtn");

const branchNameLabel = $("branchNameLabel");
const branchNameLabel2 = $("branchNameLabel2");
const cashierNameLabel = $("cashierNameLabel");

const productSearch = $("productSearch");
const productsList = $("productsList");
const productsCount = $("productsCount");

const cartList = $("cartList");
const cartCount = $("cartCount");
const subtotalLabel = $("subtotalLabel");
const discountInput = $("discountInput");
const totalLabel = $("totalLabel");

const customerSelect = $("customerSelect");
const addCustomerBtn = $("addCustomerBtn");

const paymentMethodSelect = $("paymentMethodSelect");
const orderTypeSelect = $("orderTypeSelect");

const createOrderBtn = $("createOrderBtn");
const clearCartBtn = $("clearCartBtn");
const lastInvoiceLabel = $("lastInvoiceLabel");

const todayOrdersList = $("todayOrdersList");

/***********************
 * Language
 ***********************/
toggleLangBtn.addEventListener("click", () => {
  const next = window.i18nGetLang() === "ar" ? "en" : "ar";
  window.i18nSetLang(next);
  window.i18nApply();
});

goHomeBtn.addEventListener("click", () => (location.href = "index.html"));

/***********************
 * Device presence + branch assignment
 * - الإدارة تربط deviceId بفرع
 * - الكاشير ممنوع بدون فرع
 ***********************/
deviceIdLabel.textContent = state.deviceId;

function startPresence() {
  const ref = db.ref(`devices/${state.deviceId}`);

  // keep stable data
  const base = {
    deviceId: state.deviceId,
    type: "cashier_client",
    userAgent: navigator.userAgent || "",
    lastSeen: TS,
    online: true,
  };

  ref.update(base);

  // mark offline on disconnect
  ref.onDisconnect().update({
    online: false,
    lastSeen: TS,
  });

  // heartbeat
  setInterval(() => {
    ref.update({ online: true, lastSeen: TS });
  }, 10000);

  // realtime listen for assignment
  ref.on("value", (snap) => {
    const d = snap.val();
    state.device = d || null;
    state.branchId = d?.branchId || null;

    if (state.branchId) {
      branchDot.className = "dot ok";
      branchStatusText.textContent = window.i18nT("status_assigned") || "Assigned";
      loadBranch(state.branchId);
    } else {
      branchDot.className = "dot warn";
      branchStatusText.textContent = window.i18nT("status_not_assigned") || "Not assigned";
      state.branch = null;
      branchNameLabel.textContent = "-";
      branchNameLabel2.textContent = "-";
    }
  });
}



function loadBranch(branchId) {
  db.ref(`branches/${branchId}`).on("value", (s) => {
    state.branch = s.val() || null;
    const name = state.branch?.name || "-";
    branchNameLabel.textContent = name;
    branchNameLabel2.textContent = name;

    // if already logged in, keep session showing (branch name updates live)
    if (state.cashierId) {
      persistSession();
      refreshFooter();
    }
  });
}

/***********************
 * Session
 ***********************/
function persistSession() {
  const session = {
    cashierId: state.cashierId,
    cashierName: state.cashier?.name || "",
    branchId: state.branchId || "",
    branchName: state.branch?.name || "",
    ts: Date.now(),
  };
  localStorage.setItem("cashierSession", JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem("cashierSession");
  state.cashier = null;
  state.cashierId = null;
  state.cart = {};
}

logoutBtn.addEventListener("click", () => {
  clearSession();
  show(posLayout, false);
  show(loginCard, true);
  hideAlert(posOk);
  hideAlert(posWarn);
});

/***********************
 * Login cashier
 ***********************/
async function cashierLoginByCode(code) {
  // require device branch assignment
  if (!state.branchId) {
    setAlert(loginAlert, "err_device_not_assigned", "warn");
    return;
  }

  hideAlert(loginAlert);

  const ref = db.ref("cashiers").orderByChild("code").equalTo(code);
  const snap = await ref.once("value");
  const val = snap.val();

  if (!val) {
    setAlert(loginAlert, "err_invalid_cashier_code", "warn");
    return;
  }

  // pick first match
  const [cashierId, cashier] = Object.entries(val)[0];
  if (!cashier.active) {
    setAlert(loginAlert, "err_cashier_inactive", "warn");
    return;
  }

  state.cashierId = cashierId;
  state.cashier = cashier;

  persistSession();
  enterPOS();
}

loginBtn.addEventListener("click", () => {
  const code = (cashierCodeInput.value || "").trim();
  if (!code) {
    setAlert(loginAlert, "err_enter_code", "warn");
    return;
  }
  cashierLoginByCode(code);
});

function restoreSessionIfAny() {
  try {
    const raw = localStorage.getItem("cashierSession");
    if (!raw) return;
    const s = JSON.parse(raw);
    // restore only if branch still assigned and cashier exists
    state.cashierId = s.cashierId || null;
    if (!state.cashierId) return;

    db.ref(`cashiers/${state.cashierId}`).once("value").then((snap) => {
      const c = snap.val();
      if (!c || !c.active) return;
      state.cashier = c;
      enterPOS();
    });
  } catch (_) {}
}

function refreshFooter() {
  cashierNameLabel.textContent = state.cashier?.name ? state.cashier.name : "-";
}

function enterPOS() {
  show(loginCard, false);
  show(posLayout, true);
  refreshFooter();

  // load live data for POS
  startPOSLive();
  window.i18nApply();
}

/***********************
 * POS live data (Realtime without refresh)
 ***********************/
function startPOSLive() {
  // Products for this branch (or global)
  db.ref("products").on("value", (s) => {
    const obj = s.val() || {};
    // allow active products only
    state.products = Object.entries(obj)
      .map(([id, p]) => ({ id, ...p }))
      .filter((p) => p.active !== false);
    renderProducts();
  });

  // Customers
  db.ref("customers").on("value", (s) => {
    const obj = s.val() || {};
    state.customers = Object.entries(obj).map(([id, c]) => ({ id, ...c }));
    renderCustomers();
  });

  // Payment methods + order types
  db.ref("paymentMethods").on("value", (s) => {
    const obj = s.val() || {};
    state.paymentMethods = Object.entries(obj).map(([id, x]) => ({ id, ...x })).filter((x) => x.active !== false);
    renderPaymentMethods();
  });

  db.ref("orderTypes").on("value", (s) => {
    const obj = s.val() || {};
    state.orderTypes = Object.entries(obj).map(([id, x]) => ({ id, ...x })).filter((x) => x.active !== false);
    renderOrderTypes();
  });

  // Today orders for this branch (live)
  watchTodayOrders();
}

/***********************
 * Renderers
 ***********************/
function renderProducts() {
  const q = (productSearch.value || "").trim().toLowerCase();
  const filtered = state.products.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    return !q || name.includes(q) || sku.includes(q);
  });

  productsCount.textContent = String(filtered.length);
  productsList.innerHTML = "";

  filtered.slice(0, 200).forEach((p) => {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div class="itemMain">
        <div class="itemTitle">${escapeHtml(p.name || "-")}</div>
        <div class="itemSub muted">${escapeHtml(p.sku || "")}</div>
      </div>
      <div class="itemRight">
        <div class="price">${money(p.price)}</div>
        <button class="btn mini" data-i18n="btn_add">إضافة</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", () => addToCart(p));
    productsList.appendChild(row);
  });

  window.i18nApplyWithin(productsList);
}

productSearch.addEventListener("input", renderProducts);

function renderCustomers() {
  customerSelect.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = window.i18nT("customer_none") || "—";
  customerSelect.appendChild(opt0);

  state.customers.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name || "-";
    customerSelect.appendChild(o);
  });
}

function renderPaymentMethods() {
  paymentMethodSelect.innerHTML = "";
  state.paymentMethods.forEach((x) => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = x.name || "-";
    paymentMethodSelect.appendChild(o);
  });
}

function renderOrderTypes() {
  orderTypeSelect.innerHTML = "";
  state.orderTypes.forEach((x) => {
    const o = document.createElement("option");
    o.value = x.id;
    o.textContent = x.name || "-";
    orderTypeSelect.appendChild(o);
  });
}

function renderCart() {
  const items = Object.values(state.cart);
  cartCount.textContent = String(items.reduce((a, x) => a + x.qty, 0));

  cartList.innerHTML = "";
  items.forEach((x) => {
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div class="itemMain">
        <div class="itemTitle">${escapeHtml(x.name)}</div>
        <div class="itemSub muted">${window.i18nT("label_qty") || "Qty"}: ${x.qty} • ${window.i18nT("label_price") || "Price"}: ${money(x.price)}</div>
      </div>
      <div class="itemRight">
        <div class="row">
          <button class="btn mini" data-i18n="btn_minus">-</button>
          <button class="btn mini" data-i18n="btn_plus">+</button>
          <button class="btn mini danger" data-i18n="btn_remove">حذف</button>
        </div>
      </div>
    `;

    const [minusBtn, plusBtn, removeBtn] = row.querySelectorAll("button");
    minusBtn.addEventListener("click", () => changeQty(x.id, -1));
    plusBtn.addEventListener("click", () => changeQty(x.id, +1));
    removeBtn.addEventListener("click", () => removeFromCart(x.id));

    cartList.appendChild(row);
  });

  computeTotals();
  window.i18nApplyWithin(cartList);
}

function computeTotals() {
  const items = Object.values(state.cart);
  const subtotal = items.reduce((a, x) => a + x.price * x.qty, 0);
  const disc = Number(discountInput.value || 0);
  const total = Math.max(0, subtotal - disc);

  subtotalLabel.textContent = money(subtotal);
  totalLabel.textContent = money(total);
}

discountInput.addEventListener("input", computeTotals);

function addToCart(p) {
  const id = p.id;
  if (!state.cart[id]) {
    state.cart[id] = {
      id,
      name: p.name || "-",
      price: Number(p.price || 0),
      qty: 1,
    };
  } else {
    state.cart[id].qty += 1;
  }
  renderCart();
}

function changeQty(id, delta) {
  if (!state.cart[id]) return;
  state.cart[id].qty += delta;
  if (state.cart[id].qty <= 0) delete state.cart[id];
  renderCart();
}

function removeFromCart(id) {
  delete state.cart[id];
  renderCart();
}

clearCartBtn.addEventListener("click", () => {
  state.cart = {};
  renderCart();
});

/***********************
 * Create customer (simple)
 ***********************/
addCustomerBtn.addEventListener("click", async () => {
  const name = prompt(window.i18nT("prompt_customer_name") || "Customer name");
  if (!name) return;

  const id = db.ref("customers").push().key;
  await db.ref(`customers/${id}`).set({
    name: name.trim(),
    phone: "",
    createdAt: TS,
    active: true,
  });
});

/***********************
 * Create order (invoice)
 ***********************/
createOrderBtn.addEventListener("click", async () => {
  hideAlert(posOk);
  hideAlert(posWarn);

  if (!state.branchId) return setAlert(posWarn, "err_device_not_assigned", "warn");
  if (!state.cashierId) return setAlert(posWarn, "err_not_logged_in", "warn");

  const items = Object.values(state.cart);
  if (items.length === 0) return setAlert(posWarn, "err_empty_cart", "warn");

  const subtotal = items.reduce((a, x) => a + x.price * x.qty, 0);
  const discount = Number(discountInput.value || 0);
  const total = Math.max(0, subtotal - discount);

  const customerId = customerSelect.value || "";
  const paymentMethodId = paymentMethodSelect.value || "";
  const orderTypeId = orderTypeSelect.value || "";

  const orderId = db.ref().push().key;
  const order = {
    id: orderId,
    branchId: state.branchId,
    branchName: state.branch?.name || "",
    cashierId: state.cashierId,
    cashierName: state.cashier?.name || "",
    deviceId: state.deviceId,
    customerId,
    paymentMethodId,
    orderTypeId,
    items,
    subtotal,
    discount,
    total,
    status: "new",
    createdAt: TS,
    dayKey: dayKey(new Date()),
  };

  // store under orders/{branchId}/{orderId} + also in ordersAll for quick admin view
  const updates = {};
  updates[`orders/${state.branchId}/${orderId}`] = order;
  updates[`ordersAll/${orderId}`] = order;

  await db.ref().update(updates);

  state.cart = {};
  renderCart();
  lastInvoiceLabel.textContent = orderId;
  setAlert(posOk, "ok_invoice_created", "ok");
});

/***********************
 * Today orders watcher
 ***********************/
function watchTodayOrders() {
  // if branch not set yet, wait
  const interval = setInterval(() => {
    if (state.branchId) {
      clearInterval(interval);
      attachTodayOrders();
    }
  }, 400);
}

function attachTodayOrders() {
  const today = dayKey(new Date());
  const ref = db.ref(`orders/${state.branchId}`).orderByChild("dayKey").equalTo(today);

  ref.on("value", (s) => {
    const obj = s.val() || {};
    const orders = Object.entries(obj)
      .map(([id, o]) => ({ id, ...o }))
      .sort((a, b) => (a.createdAt || 0) < (b.createdAt || 0) ? 1 : -1)
      .slice(0, 50);

    todayOrdersList.innerHTML = "";
    orders.forEach((o) => {
      const row = document.createElement("div");
      row.className = "itemRow";
      row.innerHTML = `
        <div class="itemMain">
          <div class="itemTitle">${escapeHtml(o.id)}</div>
          <div class="itemSub muted">
            ${escapeHtml(o.cashierName || "")} • ${escapeHtml(o.branchName || "")} • ${window.i18nT("label_total") || "Total"}: ${money(o.total)}
          </div>
        </div>
        <div class="itemRight">
          <span class="tag">${escapeHtml(o.status || "new")}</span>
        </div>
      `;
      todayOrdersList.appendChild(row);
    });
  });
}

/***********************
 * Utils
 ***********************/
function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/***********************
 * Boot
 ***********************/
(function boot() {
  window.i18nApply();

  startPresence();
  restoreSessionIfAny();

  // update translated placeholders if needed
  cashierCodeInput.placeholder = "0000";
})();
