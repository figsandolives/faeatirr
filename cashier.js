const firebaseConfig = {
  apiKey: "AIzaSyBdDFbWuByBWsDqEmC18nSlIKG6QZ5s0wA",
  authDomain: "fawatirr-75242.firebaseapp.com",
  databaseURL: "https://fawatirr-75242-default-rtdb.firebaseio.com",
  projectId: "fawatirr-75242",
  storageBucket: "fawatirr-75242.firebasestorage.app",
  messagingSenderId: "1059799456100",
  appId: "1:1059799456100:web:d624eb6f98aaee78950271",
  measurementId: "G-7SQXEJQY6Y"
};

const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const serverTime = firebase.database.ServerValue.TIMESTAMP;

const state = {
  deviceId: null,
  branchId: null,
  branchName: null,
  cashierId: null,
  cashierName: null,
  products: {},
  categories: {},
  branches: {},
  orderTypes: {},
  paymentMethods: {},
  cart: [],
  search: '',
  categoryFilter: 'all'
};

const els = {
  branchDisplay: document.getElementById('branchDisplay'),
  branchName: document.getElementById('branchName'),
  cashierDisplay: document.getElementById('cashierDisplay'),
  productList: document.getElementById('productList'),
  cartList: document.getElementById('cartList'),
  subtotalValue: document.getElementById('subtotalValue'),
  totalValue: document.getElementById('totalValue'),
  discountType: document.getElementById('discountType'),
  discountValue: document.getElementById('discountValue'),
  orderTypeSelect: document.getElementById('orderTypeSelect'),
  paymentMethodSelect: document.getElementById('paymentMethodSelect'),
  categoryFilter: document.getElementById('categoryFilter'),
  searchProducts: document.getElementById('searchProducts'),
  completeOrder: document.getElementById('completeOrder'),
  orderMessage: document.getElementById('orderMessage'),
  deviceOverlay: document.getElementById('deviceOverlay'),
  cashierLogin: document.getElementById('cashierLogin'),
  cashierCodeInput: document.getElementById('cashierCodeInput'),
  cashierLoginBtn: document.getElementById('cashierLoginBtn'),
  cashierLoginError: document.getElementById('cashierLoginError'),
  switchCashier: document.getElementById('switchCashier')
};

function init() {
  state.deviceId = getDeviceId();
  initPresence('cashier');
  bindUI();
  ensureSeedData();
  listenStaticData();
  listenProducts();
  restoreCashierSession();
  renderCategoryFilter();
  renderProducts();
  renderCart();

  document.addEventListener('languageChanged', () => {
    renderCategoryFilter();
    renderProducts();
    renderCart();
    renderOrderSelectors();
  });
}

function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function initPresence(page) {
  const deviceRef = db.ref(`devices/${state.deviceId}`);
  const statusRef = db.ref(`status/${state.deviceId}`);
  const label = localStorage.getItem('deviceLabel') || `POS-${state.deviceId.slice(-4)}`;

  deviceRef.update({
    label,
    lastSeen: serverTime,
    page,
    deviceId: state.deviceId
  });

  db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
      statusRef.onDisconnect().set({ online: false, lastSeen: serverTime, page });
      statusRef.set({ online: true, lastSeen: serverTime, page });
    }
  });

  setInterval(() => {
    deviceRef.update({ lastSeen: serverTime, page });
  }, 60000);

  deviceRef.on('value', (snap) => {
    const data = snap.val() || {};
    state.branchId = data.branchId || null;
    state.branchName = data.branchName || null;
    updateBranchDisplay();
    toggleDeviceOverlay();
  });
}

function ensureSeedData() {
  const usersRef = db.ref('users');
  usersRef.limitToFirst(1).once('value').then((snap) => {
    if (!snap.exists()) {
      usersRef.child('manager').set({
        name: 'غير معرف',
        role: 'manager',
        code: '123456',
        active: true
      });
    }
  });
}

function bindUI() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => window.i18n.setLanguage(btn.dataset.lang));
  });

  els.searchProducts.addEventListener('input', (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  els.categoryFilter.addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderProducts();
  });

  els.discountType.addEventListener('change', () => renderCart());
  els.discountValue.addEventListener('input', () => renderCart());

  els.completeOrder.addEventListener('click', () => completeOrder());

  els.cashierLoginBtn.addEventListener('click', () => loginCashier());
  els.cashierCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginCashier();
  });

  els.switchCashier.addEventListener('click', () => {
    localStorage.removeItem('cashierId');
    state.cashierId = null;
    state.cashierName = null;
    updateCashierDisplay();
    toggleCashierLogin(true);
  });
}

function listenStaticData() {
  db.ref('branches').on('value', (snap) => {
    state.branches = snap.val() || {};
    updateBranchDisplay();
  });

  db.ref('productCategories').on('value', (snap) => {
    state.categories = snap.val() || {};
    renderCategoryFilter();
    renderProducts();
  });

  db.ref('orderTypes').on('value', (snap) => {
    state.orderTypes = snap.val() || {};
    renderOrderSelectors();
  });

  db.ref('paymentMethods').on('value', (snap) => {
    state.paymentMethods = snap.val() || {};
    renderOrderSelectors();
  });
}

function listenProducts() {
  db.ref('products').on('value', (snap) => {
    state.products = snap.val() || {};
    renderProducts();
  });
}

function restoreCashierSession() {
  const cached = localStorage.getItem('cashierId');
  if (!cached) {
    toggleCashierLogin(true);
    return;
  }

  db.ref(`cashiers/${cached}`).once('value').then((snap) => {
    if (snap.exists()) {
      const data = snap.val();
      state.cashierId = cached;
      state.cashierName = data.name;
      updateCashierDisplay();
      toggleCashierLogin(false);
    } else {
      toggleCashierLogin(true);
    }
  });
}

function loginCashier() {
  const code = els.cashierCodeInput.value.trim();
  if (!code) return;

  db.ref('cashiers')
    .orderByChild('code')
    .equalTo(code)
    .once('value')
    .then((snap) => {
      if (!snap.exists()) {
        els.cashierLoginError.textContent = window.i18n.t('invalid_code');
        return;
      }

      const cashierId = Object.keys(snap.val())[0];
      const cashier = snap.val()[cashierId];
      state.cashierId = cashierId;
      state.cashierName = cashier.name || cashier.code;
      localStorage.setItem('cashierId', cashierId);
      els.cashierLoginError.textContent = '';
      els.cashierCodeInput.value = '';
      toggleCashierLogin(false);
      updateCashierDisplay();
    });
}

function updateCashierDisplay() {
  const branchLabel = state.branchName || window.i18n.t('unassigned');
  els.branchDisplay.textContent = branchLabel;
  els.branchName.textContent = branchLabel;
  if (state.cashierName && state.branchName) {
    els.cashierDisplay.textContent = `${state.cashierName} (${state.branchName})`;
  } else {
    els.cashierDisplay.textContent = state.cashierName || window.i18n.t('unassigned');
  }
}

function toggleCashierLogin(show) {
  if (show) {
    els.cashierLogin.classList.remove('hidden');
  } else {
    els.cashierLogin.classList.add('hidden');
  }
}

function toggleDeviceOverlay() {
  if (!state.branchId) {
    els.deviceOverlay.classList.remove('hidden');
  } else {
    els.deviceOverlay.classList.add('hidden');
  }
}

function updateBranchDisplay() {
  const branchData = state.branchId ? state.branches[state.branchId] : null;
  state.branchName = branchData ? branchData.name : null;
  updateCashierDisplay();
}

function renderCategoryFilter() {
  els.categoryFilter.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = window.i18n.t('all_categories');
  els.categoryFilter.appendChild(allOption);

  Object.entries(state.categories).forEach(([id, cat]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = cat.name;
    els.categoryFilter.appendChild(option);
  });

  els.categoryFilter.value = state.categoryFilter || 'all';
}

function renderProducts() {
  const query = state.search;
  const category = state.categoryFilter;
  els.productList.innerHTML = '';

  const entries = Object.entries(state.products);
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper';
    empty.textContent = window.i18n.t('no_data') || '';
    els.productList.appendChild(empty);
    return;
  }

  entries.forEach(([id, product]) => {
    if (category !== 'all' && product.categoryId !== category) return;
    if (query && !(product.name || '').toLowerCase().includes(query)) return;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <strong>${product.name || '-'}</strong>
      <div class="helper">${formatCurrency(product.price)}</div>
    `;
    card.addEventListener('click', () => addToCart(id));
    els.productList.appendChild(card);
  });
}

function renderOrderSelectors() {
  renderSelect(els.orderTypeSelect, state.orderTypes, window.i18n.t('order_type'));
  renderSelect(els.paymentMethodSelect, state.paymentMethods, window.i18n.t('payment_method'));
}

function renderSelect(selectEl, data, fallback) {
  const current = selectEl.value;
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = fallback;
  selectEl.appendChild(placeholder);

  Object.entries(data).forEach(([id, entry]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = entry.name || id;
    selectEl.appendChild(option);
  });
  selectEl.value = current || '';
}

function addToCart(productId) {
  const product = state.products[productId];
  if (!product) return;
  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      productId,
      name: product.name,
      price: Number(product.price || 0),
      qty: 1
    });
  }
  renderCart();
}

function updateQty(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((entry) => entry.productId !== productId);
  }
  renderCart();
}

function renderCart() {
  els.cartList.innerHTML = '';

  if (state.cart.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper';
    empty.textContent = window.i18n.t('empty_cart');
    els.cartList.appendChild(empty);
    els.subtotalValue.textContent = '0';
    els.totalValue.textContent = '0';
    return;
  }

  state.cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div class="helper">${formatCurrency(item.price)}</div>
      </div>
      <div class="qty">
        <button class="btn ghost small">-</button>
        <span>${item.qty}</span>
        <button class="btn ghost small">+</button>
      </div>
    `;
    const buttons = row.querySelectorAll('button');
    buttons[0].addEventListener('click', () => updateQty(item.productId, -1));
    buttons[1].addEventListener('click', () => updateQty(item.productId, 1));
    els.cartList.appendChild(row);
  });

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountValue = Number(els.discountValue.value || 0);
  const discountType = els.discountType.value;
  let discount = discountValue;
  if (discountType === 'percent') {
    discount = subtotal * (discountValue / 100);
  }
  const total = Math.max(subtotal - discount, 0);

  els.subtotalValue.textContent = formatCurrency(subtotal);
  els.totalValue.textContent = formatCurrency(total);
}

function completeOrder() {
  if (!state.branchId) {
    els.orderMessage.textContent = window.i18n.t('device_not_assigned');
    return;
  }
  if (!state.cashierId) {
    els.orderMessage.textContent = window.i18n.t('invalid_code');
    toggleCashierLogin(true);
    return;
  }
  if (state.cart.length === 0) {
    els.orderMessage.textContent = window.i18n.t('empty_cart');
    return;
  }

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountValue = Number(els.discountValue.value || 0);
  const discountType = els.discountType.value;
  let discount = discountValue;
  if (discountType === 'percent') {
    discount = subtotal * (discountValue / 100);
  }
  const total = Math.max(subtotal - discount, 0);

  const orderTypeId = els.orderTypeSelect.value || null;
  const paymentMethodId = els.paymentMethodSelect.value || null;

  generateOrderNumber().then((orderNumber) => {
    const cashierDisplayName = state.cashierName && state.branchName
      ? `${state.cashierName} (${state.branchName})`
      : state.cashierName;
    const orderData = {
      orderNumber,
      createdAt: serverTime,
      items: state.cart,
      subtotal,
      discount,
      discountType,
      total,
      orderTypeId,
      paymentMethodId,
      cashierId: state.cashierId,
      cashierName: cashierDisplayName || state.cashierName,
      branchId: state.branchId,
      branchName: state.branchName,
      deviceId: state.deviceId,
      status: 'paid'
    };

    db.ref('orders').push(orderData).then(() => {
      state.cart = [];
      els.discountValue.value = 0;
      renderCart();
      els.orderMessage.textContent = `${window.i18n.t('order_success')} - ${window.i18n.t('order_number')} ${orderNumber}`;
    });
  });
}

function generateOrderNumber() {
  const counterRef = db.ref('meta/orderCounter');
  return counterRef.transaction((current) => (current || 0) + 1).then((result) => {
    return result.snapshot.val();
  });
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

init();
