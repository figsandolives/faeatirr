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
  customers: {},
  deliveryZones: {},
  deliveryPrices: {},
  orders: {},
  users: {},
  transferRequests: {},
  cashierTransfers: {},
  transferRequestDraft: null,
  transferReceiveDraft: null,
  invoice: null,
  customerSearch: ''
};

const els = {
  branchDisplay: document.getElementById('branchDisplay'),
  branchName: document.getElementById('branchName'),
  cashierDisplay: document.getElementById('cashierDisplay'),
  switchCashier: document.getElementById('switchCashier'),
  ordersSection: document.getElementById('ordersSection'),
  ordersTable: document.getElementById('ordersTable'),
  newInvoiceBtn: document.getElementById('newInvoiceBtn'),
  openTransfersBtn: document.getElementById('openTransfersBtn'),
  transfersSection: document.getElementById('cashierTransfersSection'),
  transferRequestsTable: document.getElementById('transferRequestsTable'),
  incomingTransfersTable: document.getElementById('incomingTransfersTable'),
  newTransferRequestBtn: document.getElementById('newTransferRequestBtn'),
  backToOrdersBtn: document.getElementById('backToOrdersBtn'),
  deviceOverlay: document.getElementById('deviceOverlay'),
  cashierLogin: document.getElementById('cashierLogin'),
  cashierCodeInput: document.getElementById('cashierCodeInput'),
  cashierLoginBtn: document.getElementById('cashierLoginBtn'),
  cashierLoginError: document.getElementById('cashierLoginError'),
  orderDetailsOverlay: document.getElementById('orderDetailsOverlay'),
  orderDetailsBody: document.getElementById('orderDetailsBody'),
  orderDetailsClose: document.getElementById('orderDetailsClose'),
  invoiceOverlay: document.getElementById('invoiceOverlay'),
  invoiceCloseBtn: document.getElementById('invoiceCloseBtn'),
  invoiceStepItems: document.getElementById('invoiceStepItems'),
  invoiceStepDetails: document.getElementById('invoiceStepDetails'),
  invoiceStepCustomer: document.getElementById('invoiceStepCustomer'),
  invoiceStepSummary: document.getElementById('invoiceStepSummary'),
  invoiceNextToDetails: document.getElementById('invoiceNextToDetails'),
  invoiceBackToItems: document.getElementById('invoiceBackToItems'),
  invoiceNextToCustomer: document.getElementById('invoiceNextToCustomer'),
  invoiceBackToDetails: document.getElementById('invoiceBackToDetails'),
  invoiceNextToSummary: document.getElementById('invoiceNextToSummary'),
  invoiceBackToCustomer: document.getElementById('invoiceBackToCustomer'),
  invoiceSubmitBtn: document.getElementById('invoiceSubmitBtn'),
  invoiceSummaryMessage: document.getElementById('invoiceSummaryMessage'),
  invoiceSearchInput: document.getElementById('invoiceSearchInput'),
  invoiceSearchBtn: document.getElementById('invoiceSearchBtn'),
  invoiceCategoryList: document.getElementById('invoiceCategoryList'),
  invoiceProductList: document.getElementById('invoiceProductList'),
  invoiceCategoryBack: document.getElementById('invoiceCategoryBack'),
  invoiceCategoryPath: document.getElementById('invoiceCategoryPath'),
  invoiceCartList: document.getElementById('invoiceCartList'),
  invoiceOrderDate: document.getElementById('invoiceOrderDate'),
  invoiceDeliveryTime: document.getElementById('invoiceDeliveryTime'),
  invoiceOrderType: document.getElementById('invoiceOrderType'),
  invoicePaymentMethod: document.getElementById('invoicePaymentMethod'),
  invoiceSubtotal: document.getElementById('invoiceSubtotal'),
  invoiceDeliveryFee: document.getElementById('invoiceDeliveryFee'),
  invoiceDiscount: document.getElementById('invoiceDiscount'),
  invoiceTotal: document.getElementById('invoiceTotal'),
  applyManagerDiscountBtn: document.getElementById('applyManagerDiscountBtn'),
  customerSearchInput: document.getElementById('customerSearchInput'),
  customerList: document.getElementById('customerList'),
  selectedCustomerPanel: document.getElementById('selectedCustomerPanel'),
  addCustomerBtn: document.getElementById('addCustomerBtn'),
  customerModal: document.getElementById('customerModal'),
  customerNameInput: document.getElementById('customerNameInput'),
  customerPhoneInput: document.getElementById('customerPhoneInput'),
  customerNameOnlyToggle: document.getElementById('customerNameOnlyToggle'),
  customerZoneSearch: document.getElementById('customerZoneSearch'),
  customerZoneSelect: document.getElementById('customerZoneSelect'),
  customerAddressInput: document.getElementById('customerAddressInput'),
  customerAddressFields: document.getElementById('customerAddressFields'),
  customerModalCancel: document.getElementById('customerModalCancel'),
  customerModalSave: document.getElementById('customerModalSave'),
  customerModalError: document.getElementById('customerModalError'),
  qtyModal: document.getElementById('qtyModal'),
  qtyModalTitle: document.getElementById('qtyModalTitle'),
  qtyModalStock: document.getElementById('qtyModalStock'),
  qtyModalDisplay: document.getElementById('qtyModalDisplay'),
  qtyModalCancel: document.getElementById('qtyModalCancel'),
  qtyModalConfirm: document.getElementById('qtyModalConfirm'),
  qtyModalError: document.getElementById('qtyModalError'),
  managerDiscountModal: document.getElementById('managerDiscountModal'),
  managerCodeInput: document.getElementById('managerCodeInput'),
  managerDiscountType: document.getElementById('managerDiscountType'),
  managerDiscountValue: document.getElementById('managerDiscountValue'),
  managerDiscountCancel: document.getElementById('managerDiscountCancel'),
  managerDiscountApply: document.getElementById('managerDiscountApply'),
  managerDiscountError: document.getElementById('managerDiscountError'),
  transferRequestModal: document.getElementById('transferRequestModal'),
  transferRequestClose: document.getElementById('transferRequestCloseBtn'),
  transferRequestCashier: document.getElementById('transferRequestCashier'),
  transferRequestBranch: document.getElementById('transferRequestBranch'),
  transferRequestSearchInput: document.getElementById('transferRequestSearchInput'),
  transferRequestSearchBtn: document.getElementById('transferRequestSearchBtn'),
  transferRequestSearchResults: document.getElementById('transferRequestSearchResults'),
  transferRequestItemsList: document.getElementById('transferRequestItemsList'),
  transferRequestSubmitBtn: document.getElementById('transferRequestSubmitBtn'),
  transferRequestCancelBtn: document.getElementById('transferRequestCancelBtn'),
  transferRequestError: document.getElementById('transferRequestError'),
  transferReceiveModal: document.getElementById('transferReceiveModal'),
  transferReceiveClose: document.getElementById('transferReceiveCloseBtn'),
  transferReceiveCashier: document.getElementById('transferReceiveCashier'),
  transferReceiveBranch: document.getElementById('transferReceiveBranch'),
  transferReceiveNumber: document.getElementById('transferReceiveNumber'),
  transferReceiveItemsList: document.getElementById('transferReceiveItemsList'),
  transferReceiveSubmitBtn: document.getElementById('transferReceiveSubmitBtn'),
  transferReceiveCancelBtn: document.getElementById('transferReceiveCancelBtn'),
  transferReceiveError: document.getElementById('transferReceiveError')
};

const qtyModalState = {
  value: '',
  available: null,
  onConfirm: null
};

const customerModalState = {
  mode: 'new',
  customerId: null,
  addressId: null
};

function init() {
  state.deviceId = getDeviceId();
  initPresence('cashier');
  bindUI();
  ensureSeedData();
  listenData();
  restoreCashierSession();
  resetInvoice();
  renderOrdersTable();
  renderInvoiceUI();

  document.addEventListener('languageChanged', () => {
    renderOrdersTable();
    renderInvoiceUI();
    renderCustomerList();
    renderSelectedCustomerPanel();
    renderZoneOptions();
    renderTransferRequestsTable();
    renderIncomingTransfersTable();
  });
}

function getLocalizedName(item) {
  if (!item) return '-';
  const lang = window.i18n.getLanguage();
  if (lang === 'en') {
    return item.nameEn || item.name || item.nameAr || '-';
  }
  return item.nameAr || item.name || item.nameEn || '-';
}

function normalizeDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
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
    state.branchName = data.branchNameAr || data.branchNameEn || data.branchName || null;
    updateBranchDisplay();
    toggleDeviceOverlay();
  });
}

function ensureSeedData() {
  const usersRef = db.ref('users');
  usersRef.child('manager').once('value').then((snap) => {
    if (!snap.exists()) {
      usersRef.child('manager').set({
        name: 'غير معرف',
        role: 'manager',
        code: '123456',
        active: true
      });
    }
  }).catch(() => {});
}

function bindUI() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => window.i18n.setLanguage(btn.dataset.lang));
  });

  if (els.switchCashier) {
    els.switchCashier.addEventListener('click', () => {
      localStorage.removeItem('cashierId');
      state.cashierId = null;
      state.cashierName = null;
      updateCashierDisplay();
      toggleCashierLogin(true);
    });
  }

  if (els.cashierLoginBtn) {
    els.cashierLoginBtn.addEventListener('click', () => loginCashier());
  }
  if (els.cashierCodeInput) {
    els.cashierCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loginCashier();
    });
  }

  if (els.newInvoiceBtn) {
    els.newInvoiceBtn.addEventListener('click', () => openInvoiceOverlay());
  }
  if (els.invoiceCloseBtn) {
    els.invoiceCloseBtn.addEventListener('click', () => closeInvoiceOverlay());
  }
  if (els.invoiceNextToDetails) {
    els.invoiceNextToDetails.addEventListener('click', () => setInvoiceStep('details'));
  }
  if (els.invoiceBackToItems) {
    els.invoiceBackToItems.addEventListener('click', () => setInvoiceStep('items'));
  }
  if (els.invoiceNextToCustomer) {
    els.invoiceNextToCustomer.addEventListener('click', () => setInvoiceStep('customer'));
  }
  if (els.invoiceBackToDetails) {
    els.invoiceBackToDetails.addEventListener('click', () => setInvoiceStep('details'));
  }
  if (els.invoiceNextToSummary) {
    els.invoiceNextToSummary.addEventListener('click', () => setInvoiceStep('summary'));
  }
  if (els.invoiceBackToCustomer) {
    els.invoiceBackToCustomer.addEventListener('click', () => setInvoiceStep('customer'));
  }
  if (els.invoiceSubmitBtn) {
    els.invoiceSubmitBtn.addEventListener('click', () => submitInvoice());
  }

  if (els.invoiceSearchInput) {
    els.invoiceSearchInput.addEventListener('input', (e) => {
      state.invoice.search = e.target.value.trim();
      renderInvoiceCatalog();
    });
    els.invoiceSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInvoiceBarcodeScan();
      }
    });
  }
  if (els.invoiceSearchBtn) {
    els.invoiceSearchBtn.addEventListener('click', () => renderInvoiceCatalog());
  }

  if (els.invoiceCategoryBack) {
    els.invoiceCategoryBack.addEventListener('click', () => {
      state.invoice.categoryPath.pop();
      renderInvoiceCatalog();
    });
  }

  if (els.invoiceOrderDate) {
    els.invoiceOrderDate.addEventListener('change', (e) => {
      state.invoice.orderDate = e.target.value;
    });
  }
  if (els.invoiceDeliveryTime) {
    els.invoiceDeliveryTime.addEventListener('change', (e) => {
      state.invoice.deliveryTime = e.target.value;
    });
  }
  if (els.invoiceOrderType) {
    els.invoiceOrderType.addEventListener('change', (e) => {
      state.invoice.orderTypeId = e.target.value;
    });
  }
  if (els.invoicePaymentMethod) {
    els.invoicePaymentMethod.addEventListener('change', (e) => {
      state.invoice.paymentMethodId = e.target.value;
    });
  }

  if (els.customerSearchInput) {
    els.customerSearchInput.addEventListener('input', (e) => {
      state.customerSearch = e.target.value.trim().toLowerCase();
      renderCustomerList();
    });
  }

  if (els.addCustomerBtn) {
    els.addCustomerBtn.addEventListener('click', () => openCustomerModal('new'));
  }

  if (els.customerModalCancel) {
    els.customerModalCancel.addEventListener('click', () => closeCustomerModal());
  }
  if (els.customerModalSave) {
    els.customerModalSave.addEventListener('click', () => saveCustomerModal());
  }

  if (els.customerNameOnlyToggle) {
    els.customerNameOnlyToggle.addEventListener('change', () => toggleCustomerAddressFields());
  }
  if (els.customerZoneSearch) {
    els.customerZoneSearch.addEventListener('input', () => renderZoneOptions());
  }

  if (els.qtyModalCancel) {
    els.qtyModalCancel.addEventListener('click', () => closeQtyModal());
  }
  if (els.qtyModalConfirm) {
    els.qtyModalConfirm.addEventListener('click', () => confirmQtyModal());
  }
  if (els.qtyModal) {
    els.qtyModal.querySelectorAll('[data-key]').forEach((btn) => {
      btn.addEventListener('click', () => handleQtyKey(btn.dataset.key));
    });
  }

  if (els.applyManagerDiscountBtn) {
    els.applyManagerDiscountBtn.addEventListener('click', () => openManagerDiscountModal());
  }
  if (els.managerDiscountCancel) {
    els.managerDiscountCancel.addEventListener('click', () => closeManagerDiscountModal());
  }
  if (els.managerDiscountApply) {
    els.managerDiscountApply.addEventListener('click', () => applyManagerDiscount());
  }

  if (els.orderDetailsClose) {
    els.orderDetailsClose.addEventListener('click', () => {
      if (els.orderDetailsOverlay) els.orderDetailsOverlay.classList.add('hidden');
    });
  }

  if (els.openTransfersBtn) {
    els.openTransfersBtn.addEventListener('click', () => showTransfersSection());
  }
  if (els.backToOrdersBtn) {
    els.backToOrdersBtn.addEventListener('click', () => showOrdersSection());
  }

  if (els.newTransferRequestBtn) {
    els.newTransferRequestBtn.addEventListener('click', () => openTransferRequestModal());
  }
  if (els.transferRequestClose) {
    els.transferRequestClose.addEventListener('click', () => closeTransferRequestModal());
  }
  if (els.transferRequestCancelBtn) {
    els.transferRequestCancelBtn.addEventListener('click', () => closeTransferRequestModal());
  }
  if (els.transferRequestSearchInput) {
    els.transferRequestSearchInput.addEventListener('input', () => renderTransferRequestSearchResults());
    els.transferRequestSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTransferRequestBarcodeScan();
      }
    });
  }
  if (els.transferRequestSearchBtn) {
    els.transferRequestSearchBtn.addEventListener('click', () => renderTransferRequestSearchResults());
  }
  if (els.transferRequestSubmitBtn) {
    els.transferRequestSubmitBtn.addEventListener('click', () => submitTransferRequest());
  }

  if (els.transferReceiveClose) {
    els.transferReceiveClose.addEventListener('click', () => closeTransferReceiveModal());
  }
  if (els.transferReceiveCancelBtn) {
    els.transferReceiveCancelBtn.addEventListener('click', () => closeTransferReceiveModal());
  }
  if (els.transferReceiveSubmitBtn) {
    els.transferReceiveSubmitBtn.addEventListener('click', () => submitTransferReceive());
  }
}

function listenData() {
  db.ref('branches').on('value', (snap) => {
    state.branches = snap.val() || {};
    updateBranchDisplay();
    renderInvoiceUI();
  });

  db.ref('productCategories').on('value', (snap) => {
    state.categories = snap.val() || {};
    renderInvoiceCatalog();
  });

  db.ref('products').on('value', (snap) => {
    state.products = snap.val() || {};
    renderInvoiceCatalog();
  });

  db.ref('orderTypes').on('value', (snap) => {
    state.orderTypes = snap.val() || {};
    renderOrderSelectors();
  });

  db.ref('paymentMethods').on('value', (snap) => {
    state.paymentMethods = snap.val() || {};
    renderOrderSelectors();
  });

  db.ref('customers').on('value', (snap) => {
    state.customers = snap.val() || {};
    renderCustomerList();
    renderSelectedCustomerPanel();
  });

  db.ref('deliveryZones').on('value', (snap) => {
    state.deliveryZones = snap.val() || {};
    renderSelectedCustomerPanel();
    renderZoneOptions();
  });

  db.ref('deliveryPrices').on('value', (snap) => {
    state.deliveryPrices = snap.val() || {};
    renderInvoiceSummary();
  });

  db.ref('transferRequests').on('value', (snap) => {
    state.transferRequests = snap.val() || {};
    renderTransferRequestsTable();
  });

  db.ref('cashierTransfers').on('value', (snap) => {
    state.cashierTransfers = snap.val() || {};
    renderIncomingTransfersTable();
  });

  db.ref('orders').on('value', (snap) => {
    state.orders = snap.val() || {};
    renderOrdersTable();
  });

  db.ref('users').on('value', (snap) => {
    state.users = snap.val() || {};
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
  const code = normalizeDigits(els.cashierCodeInput.value).trim();
  if (!code) return;

  findCashierByCode(code)
    .then((cashier) => {
      if (!cashier) {
        els.cashierLoginError.textContent = window.i18n.t('invalid_code');
        return;
      }
      state.cashierId = cashier.id;
      state.cashierName = cashier.name || cashier.code;
      localStorage.setItem('cashierId', cashier.id);
      els.cashierLoginError.textContent = '';
      els.cashierCodeInput.value = '';
      toggleCashierLogin(false);
      updateCashierDisplay();
    })
    .catch(() => {
      els.cashierLoginError.textContent = window.i18n.t('error');
    });
}

function findCashierByCode(code) {
  const codeStr = String(code).trim();
  if (!codeStr) return Promise.resolve(null);
  const queries = [
    db.ref('cashiers').orderByChild('code').equalTo(codeStr).once('value')
  ];
  const codeNum = Number(codeStr);
  if (!Number.isNaN(codeNum)) {
    queries.push(db.ref('cashiers').orderByChild('code').equalTo(codeNum).once('value'));
  }

  return Promise.all(queries).then((snaps) => {
    for (const snap of snaps) {
      if (snap.exists()) {
        const cashierId = Object.keys(snap.val())[0];
        return { id: cashierId, ...snap.val()[cashierId] };
      }
    }
    return null;
  });
}

function updateCashierDisplay() {
  const branchLabel = state.branchName || window.i18n.t('unassigned');
  if (els.branchDisplay) els.branchDisplay.textContent = branchLabel;
  if (els.branchName) els.branchName.textContent = branchLabel;
  if (!els.cashierDisplay) return;
  if (state.cashierName && state.branchName) {
    els.cashierDisplay.textContent = `${state.cashierName} (${state.branchName})`;
  } else {
    els.cashierDisplay.textContent = state.cashierName || window.i18n.t('unassigned');
  }
}

function toggleCashierLogin(show) {
  if (!els.cashierLogin) return;
  if (show) {
    els.cashierLogin.classList.remove('hidden');
  } else {
    els.cashierLogin.classList.add('hidden');
  }
}

function toggleDeviceOverlay() {
  if (!els.deviceOverlay) return;
  if (!state.branchId) {
    els.deviceOverlay.classList.remove('hidden');
  } else {
    els.deviceOverlay.classList.add('hidden');
  }
}

function updateBranchDisplay() {
  const branchData = state.branchId ? state.branches[state.branchId] : null;
  state.branchName = branchData ? getLocalizedName(branchData) : null;
  updateCashierDisplay();
  renderOrdersTable();
  renderTransferRequestsTable();
  renderIncomingTransfersTable();
}

function resetInvoice() {
  state.invoice = {
    step: 'items',
    cart: [],
    categoryPath: [],
    search: '',
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryTime: '',
    orderTypeId: '',
    paymentMethodId: '',
    customerId: '',
    addressId: '',
    manualDiscount: null
  };
}

function renderInvoiceUI() {
  if (!state.invoice) resetInvoice();
  if (els.invoiceOrderDate) {
    els.invoiceOrderDate.value = state.invoice.orderDate || '';
  }
  renderDeliveryTimeOptions();
  renderOrderSelectors();
  renderInvoiceCatalog();
  renderInvoiceCart();
  renderCustomerList();
  renderSelectedCustomerPanel();
  renderInvoiceSummary();
}

function setInvoiceStep(step) {
  state.invoice.step = step;
  if (els.invoiceStepItems) els.invoiceStepItems.classList.toggle('hidden', step !== 'items');
  if (els.invoiceStepDetails) els.invoiceStepDetails.classList.toggle('hidden', step !== 'details');
  if (els.invoiceStepCustomer) els.invoiceStepCustomer.classList.toggle('hidden', step !== 'customer');
  if (els.invoiceStepSummary) els.invoiceStepSummary.classList.toggle('hidden', step !== 'summary');
  if (step === 'summary') renderInvoiceSummary();
}

function openInvoiceOverlay() {
  resetInvoice();
  renderInvoiceUI();
  setInvoiceStep('items');
  if (els.invoiceOverlay) els.invoiceOverlay.classList.remove('hidden');
}

function closeInvoiceOverlay() {
  if (els.invoiceOverlay) els.invoiceOverlay.classList.add('hidden');
}

function getCurrentCategoryId() {
  const path = state.invoice.categoryPath;
  return path.length ? path[path.length - 1] : null;
}

function renderInvoiceCatalog() {
  if (!els.invoiceCategoryList || !els.invoiceProductList) return;
  const query = state.invoice.search.trim().toLowerCase();
  const currentCategory = getCurrentCategoryId();

  if (els.invoiceCategoryBack) {
    els.invoiceCategoryBack.disabled = state.invoice.categoryPath.length === 0;
  }

  if (els.invoiceCategoryPath) {
    const names = state.invoice.categoryPath.map((id) => getLocalizedName(state.categories[id])).filter(Boolean);
    els.invoiceCategoryPath.textContent = names.join(' / ');
  }

  let categories = [];
  let products = [];

  if (query) {
    products = Object.entries(state.products)
      .map(([id, item]) => ({ id, item }))
      .filter(({ item }) => {
        const name = `${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''}`.toLowerCase();
        const code = String(item.code || '').toLowerCase();
        const barcode = String(item.barcode || '').toLowerCase();
        return name.includes(query) || code.includes(query) || barcode.includes(query);
      });
  } else {
    categories = Object.entries(state.categories)
      .filter(([, cat]) => (cat.parentId || null) === currentCategory)
      .map(([id, item]) => ({ id, item }));

    products = Object.entries(state.products)
      .filter(([, prod]) => (prod.categoryId || null) === currentCategory)
      .map(([id, item]) => ({ id, item }));
  }

  els.invoiceCategoryList.innerHTML = '';
  if (!query && categories.length) {
    categories.forEach(({ id, item }) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `<strong>${getLocalizedName(item)}</strong>`;
      card.addEventListener('click', () => {
        state.invoice.categoryPath.push(id);
        renderInvoiceCatalog();
      });
      els.invoiceCategoryList.appendChild(card);
    });
  }

  els.invoiceProductList.innerHTML = '';
  if (products.length === 0) {
    els.invoiceProductList.innerHTML = '';
  } else {
    products.forEach(({ id, item }) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <strong>${getLocalizedName(item)}</strong>
        <div class="helper">${window.i18n.t('price')}: ${formatCurrency(item.price || 0)}</div>
      `;
      card.addEventListener('click', () => openQtyModal({
        title: getLocalizedName(item),
        available: getMainBranchStock(item),
        onConfirm: (qty) => addInvoiceItem({ id, item }, qty)
      }));
      els.invoiceProductList.appendChild(card);
    });
  }
}

function handleInvoiceBarcodeScan() {
  const query = els.invoiceSearchInput?.value.trim();
  if (!query) return;
  const match = findExactProductMatch(query);
  if (match) {
    openQtyModal({
      title: getLocalizedName(match.item),
      available: getMainBranchStock(match.item),
      onConfirm: (qty) => addInvoiceItem(match, qty)
    });
    if (els.invoiceSearchInput) els.invoiceSearchInput.value = '';
    state.invoice.search = '';
    renderInvoiceCatalog();
  }
}

function findExactProductMatch(query) {
  const q = query.toLowerCase();
  const entries = Object.entries(state.products).map(([id, item]) => ({ id, item }));
  const exact = entries.filter(({ item }) => {
    const code = String(item.code || '').toLowerCase();
    const barcode = String(item.barcode || '').toLowerCase();
    return (code && code === q) || (barcode && barcode === q);
  });
  return exact.length === 1 ? exact[0] : null;
}

function getMainBranchId() {
  const entry = Object.entries(state.branches || {}).find(([, branch]) => branch.isMain);
  return entry ? entry[0] : null;
}

function getMainBranchStock(product) {
  const mainBranchId = getMainBranchId();
  if (!mainBranchId) return 0;
  const stockByBranch = product.stockByBranch || {};
  return Number(stockByBranch[mainBranchId] || 0);
}

function addInvoiceItem(entry, qty) {
  const existing = state.invoice.cart.find((item) => item.productId === entry.id);
  const price = Number(entry.item.price || 0);
  if (existing) {
    existing.qty += qty;
  } else {
    state.invoice.cart.push({
      productId: entry.id,
      name: getLocalizedName(entry.item),
      price,
      qty,
      note: ''
    });
  }
  renderInvoiceCart();
}

function renderInvoiceCart() {
  if (!els.invoiceCartList) return;
  els.invoiceCartList.innerHTML = '';
  if (state.invoice.cart.length === 0) {
    els.invoiceCartList.innerHTML = '';
    if (els.invoiceNextToDetails) els.invoiceNextToDetails.disabled = true;
    return;
  }
  state.invoice.cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div style="flex:1;">
        <strong>${item.name}</strong>
        <div class="helper">${window.i18n.t('price')}: ${formatCurrency(item.price)}</div>
        <input class="input" style="margin-top:6px;" placeholder="${window.i18n.t('note')}" value="${item.note || ''}" />
      </div>
      <button class="btn ghost small">${formatNumber(item.qty)}</button>
    `;
    const qtyBtn = row.querySelector('button');
    qtyBtn.addEventListener('click', () => openQtyModal({
      title: item.name,
      available: null,
      onConfirm: (qty) => {
        state.invoice.cart[index].qty = qty;
        renderInvoiceCart();
      }
    }));
    const noteInput = row.querySelector('input');
    noteInput.addEventListener('input', (e) => {
      state.invoice.cart[index].note = e.target.value;
    });
    els.invoiceCartList.appendChild(row);
  });
  if (els.invoiceNextToDetails) els.invoiceNextToDetails.disabled = false;
}

function renderDeliveryTimeOptions() {
  if (!els.invoiceDeliveryTime) return;
  const lang = window.i18n.getLanguage();
  const startHour = 8;
  const endHour = 23;
  els.invoiceDeliveryTime.innerHTML = '';
  for (let h = startHour; h < endHour; h += 1) {
    const label = formatTimeSlot(h, h + 1, lang);
    const value = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    els.invoiceDeliveryTime.appendChild(option);
  }
  if (!state.invoice.deliveryTime) {
    state.invoice.deliveryTime = els.invoiceDeliveryTime.value;
  } else {
    els.invoiceDeliveryTime.value = state.invoice.deliveryTime;
  }
}

function formatTimeSlot(startHour, endHour, lang) {
  const startLabel = formatHourLabel(startHour, lang);
  const endLabel = formatHourLabel(endHour, lang);
  if (lang === 'ar') {
    return `من ${startLabel} إلى ${endLabel}`;
  }
  return `From ${startLabel} to ${endLabel}`;
}

function formatHourLabel(hour, lang) {
  const isPM = hour >= 12;
  const displayHour = hour % 12 || 12;
  const period = lang === 'ar' ? (isPM ? 'مساءً' : 'صباحاً') : (isPM ? 'PM' : 'AM');
  return `${displayHour}:00 ${period}`;
}

function renderOrderSelectors() {
  if (els.invoiceOrderType) {
    renderSelect(els.invoiceOrderType, state.orderTypes, window.i18n.t('order_type'));
    if (state.invoice.orderTypeId) {
      els.invoiceOrderType.value = state.invoice.orderTypeId;
    } else {
      const first = Array.from(els.invoiceOrderType.options).find((opt) => opt.value);
      if (first) {
        els.invoiceOrderType.value = first.value;
        state.invoice.orderTypeId = first.value;
      }
    }
  }
  if (els.invoicePaymentMethod) {
    renderSelect(els.invoicePaymentMethod, state.paymentMethods, window.i18n.t('payment_method'));
    if (state.invoice.paymentMethodId) {
      els.invoicePaymentMethod.value = state.invoice.paymentMethodId;
    } else {
      const first = Array.from(els.invoicePaymentMethod.options).find((opt) => opt.value);
      if (first) {
        els.invoicePaymentMethod.value = first.value;
        state.invoice.paymentMethodId = first.value;
      }
    }
  }
}

function renderSelect(select, data, placeholder) {
  if (!select) return;
  select.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = placeholder;
  select.appendChild(option);
  Object.entries(data || {}).forEach(([id, item]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = getLocalizedName(item) || item.name || '-';
    select.appendChild(opt);
  });
}

function renderCustomerList() {
  if (!els.customerList) return;
  els.customerList.innerHTML = '';
  const query = state.customerSearch || '';
  const entries = Object.entries(state.customers || {}).map(([id, customer]) => ({ id, customer }));
  const filtered = query
    ? entries.filter(({ customer }) => {
      const name = `${getLocalizedName(customer)} ${customer.phone || ''}`.toLowerCase();
      return name.includes(query);
    })
    : entries;

  if (!filtered.length) {
    els.customerList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }

  filtered.forEach(({ id, customer }) => {
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <span>${getLocalizedName(customer)}</span>
        <span class="helper">${customer.phone || '-'}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      state.invoice.customerId = id;
      state.invoice.addressId = '';
      renderSelectedCustomerPanel();
      if (els.invoiceNextToSummary) {
        els.invoiceNextToSummary.disabled = false;
      }
    });
    els.customerList.appendChild(card);
  });
}

function renderSelectedCustomerPanel() {
  if (!els.selectedCustomerPanel) return;
  const customer = state.invoice.customerId ? state.customers[state.invoice.customerId] : null;
  if (!customer) {
    els.selectedCustomerPanel.innerHTML = `<p class="helper">${window.i18n.t('select_customer')}</p>`;
    if (els.invoiceNextToSummary) els.invoiceNextToSummary.disabled = true;
    return;
  }
  const addresses = getCustomerAddresses(customer);
  let selectedAddress = addresses.find((addr) => addr.id === state.invoice.addressId);
  if (!selectedAddress && addresses.length) {
    selectedAddress = addresses[0];
    state.invoice.addressId = selectedAddress.id;
  }
  const addressHtml = addresses.map((addr) => {
    const zone = getZoneLabel(addr.zoneId);
    return `
      <div class="notice" style="margin-top:6px;">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div>${zone || '-'} </div>
            <div class="helper">${addr.details || '-'}</div>
          </div>
          <div class="row" style="gap:6px;">
            <button class="btn ghost small" data-action="select" data-id="${addr.id}">${window.i18n.t('select')}</button>
            <button class="btn ghost small" data-action="edit" data-id="${addr.id}">${window.i18n.t('edit')}</button>
            <button class="btn danger small" data-action="delete" data-id="${addr.id}">${window.i18n.t('delete')}</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  els.selectedCustomerPanel.innerHTML = `
    <div>
      <strong>${getLocalizedName(customer)}</strong>
      <div class="helper">${customer.phone || '-'}</div>
    </div>
    ${selectedAddress ? `
      <div style="margin-top:8px;">
        <div>${window.i18n.t('delivery_zone')}: ${getZoneLabel(selectedAddress.zoneId)}</div>
        <div class="helper">${selectedAddress.details || '-'}</div>
      </div>
    ` : ''}
    <div class="row" style="gap:6px; margin-top:8px;">
      <button class="btn ghost small" data-action="edit-customer">${window.i18n.t('edit')}</button>
      <button class="btn ghost small" data-action="add-address">${window.i18n.t('add_address')}</button>
    </div>
    <div style="margin-top:8px;">${addressHtml || ''}</div>
  `;

  const selectButtons = els.selectedCustomerPanel.querySelectorAll('[data-action="select"]');
  selectButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.invoice.addressId = btn.dataset.id;
      renderSelectedCustomerPanel();
      renderInvoiceSummary();
    });
  });

  const editButtons = els.selectedCustomerPanel.querySelectorAll('[data-action="edit"]');
  editButtons.forEach((btn) => {
    btn.addEventListener('click', () => openCustomerModal('edit', state.invoice.customerId, btn.dataset.id));
  });

  const deleteButtons = els.selectedCustomerPanel.querySelectorAll('[data-action="delete"]');
  deleteButtons.forEach((btn) => {
    btn.addEventListener('click', () => deleteCustomerAddress(btn.dataset.id));
  });

  const editCustomerBtn = els.selectedCustomerPanel.querySelector('[data-action="edit-customer"]');
  if (editCustomerBtn) {
    editCustomerBtn.addEventListener('click', () => openCustomerModal('edit', state.invoice.customerId, state.invoice.addressId));
  }
  const addAddressBtn = els.selectedCustomerPanel.querySelector('[data-action="add-address"]');
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => openCustomerModal('address', state.invoice.customerId));
  }

  if (els.invoiceNextToSummary) els.invoiceNextToSummary.disabled = false;
}

function getCustomerAddresses(customer) {
  if (!customer) return [];
  if (Array.isArray(customer.addresses) && customer.addresses.length) return customer.addresses;
  if (customer.zoneId || customer.address) {
    return [{ id: 'default', zoneId: customer.zoneId || '', details: customer.address || '' }];
  }
  return [];
}

function getZoneLabel(zoneId) {
  if (!zoneId) return '-';
  const zone = state.deliveryZones?.[zoneId];
  if (zone) return getLocalizedName(zone);
  return zoneId;
}

function openCustomerModal(mode, customerId = null, addressId = null) {
  customerModalState.mode = mode;
  customerModalState.customerId = customerId;
  customerModalState.addressId = addressId;
  if (els.customerModalError) els.customerModalError.textContent = '';

  if (els.customerNameInput) els.customerNameInput.value = '';
  if (els.customerPhoneInput) els.customerPhoneInput.value = '';
  if (els.customerAddressInput) els.customerAddressInput.value = '';
  if (els.customerNameOnlyToggle) els.customerNameOnlyToggle.checked = false;

  const customer = customerId ? state.customers[customerId] : null;
  if (customer) {
    if (els.customerNameInput) els.customerNameInput.value = getLocalizedName(customer) || '';
    if (els.customerPhoneInput) els.customerPhoneInput.value = customer.phone || '';
    const addresses = getCustomerAddresses(customer);
    const address = addresses.find((addr) => addr.id === addressId) || addresses[0];
    if (address) {
      if (els.customerAddressInput) els.customerAddressInput.value = address.details || '';
      if (els.customerZoneSelect) {
        renderZoneOptions();
        els.customerZoneSelect.value = address.zoneId || '';
      }
    }
  }

  toggleCustomerAddressFields();
  renderZoneOptions();
  if (els.customerModal) els.customerModal.classList.remove('hidden');
}

function closeCustomerModal() {
  if (els.customerModal) els.customerModal.classList.add('hidden');
}

function toggleCustomerAddressFields() {
  const hide = els.customerNameOnlyToggle?.checked;
  if (els.customerAddressFields) {
    els.customerAddressFields.classList.toggle('hidden', hide);
  }
}

function renderZoneOptions() {
  if (!els.customerZoneSelect) return;
  const query = (els.customerZoneSearch?.value || '').trim().toLowerCase();
  els.customerZoneSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select_zone');
  els.customerZoneSelect.appendChild(placeholder);
  const zones = state.deliveryZones || {};
  Object.entries(zones).forEach(([id, zone]) => {
    const name = getLocalizedName(zone).toLowerCase();
    if (query && !name.includes(query)) return;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = getLocalizedName(zone);
    els.customerZoneSelect.appendChild(opt);
  });
}

function saveCustomerModal() {
  const name = els.customerNameInput?.value.trim() || '';
  const phone = els.customerPhoneInput?.value.trim() || '';
  const nameOnly = els.customerNameOnlyToggle?.checked;
  const zoneId = els.customerZoneSelect?.value || '';
  const addressDetails = els.customerAddressInput?.value.trim() || '';

  if (!name || !phone) {
    if (els.customerModalError) els.customerModalError.textContent = window.i18n.t('error');
    return;
  }

  const payloadBase = {
    nameAr: name,
    nameEn: name,
    phone
  };

  if (customerModalState.mode === 'new') {
    const addresses = nameOnly ? [] : [{ id: generateId(), zoneId, details: addressDetails }];
    const payload = {
      ...payloadBase,
      addresses,
      zoneId: addresses[0]?.zoneId || null,
      address: addresses[0]?.details || null
    };
    db.ref('customers').push(payload).then(() => {
      closeCustomerModal();
    });
    return;
  }

  const customer = state.customers[customerModalState.customerId];
  if (!customer) return;
  const existingAddresses = getCustomerAddresses(customer);
  let addresses = existingAddresses.map((addr) => ({ ...addr }));
  if (!nameOnly && (zoneId || addressDetails)) {
    if (customerModalState.mode === 'address') {
      addresses.push({ id: generateId(), zoneId, details: addressDetails });
    } else {
      const targetId = customerModalState.addressId || (addresses[0] && addresses[0].id);
      addresses = addresses.map((addr) => (addr.id === targetId ? { ...addr, zoneId, details: addressDetails } : addr));
    }
  }
  if (nameOnly) {
    addresses = [];
  }

  const payload = {
    ...payloadBase,
    addresses,
    zoneId: addresses[0]?.zoneId || null,
    address: addresses[0]?.details || null
  };

  db.ref(`customers/${customerModalState.customerId}`).update(payload).then(() => {
    closeCustomerModal();
  });
}

function deleteCustomerAddress(addressId) {
  const customerId = state.invoice.customerId;
  if (!customerId) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const customer = state.customers[customerId];
  const addresses = getCustomerAddresses(customer).filter((addr) => addr.id !== addressId);
  const payload = {
    addresses,
    zoneId: addresses[0]?.zoneId || null,
    address: addresses[0]?.details || null
  };
  db.ref(`customers/${customerId}`).update(payload).then(() => {
    if (state.invoice.addressId === addressId) {
      state.invoice.addressId = addresses[0]?.id || '';
    }
    renderSelectedCustomerPanel();
  });
}

function openQtyModal({ title, available, onConfirm }) {
  qtyModalState.value = '';
  qtyModalState.available = available;
  qtyModalState.onConfirm = onConfirm;
  if (els.qtyModalTitle) els.qtyModalTitle.textContent = title || '';
  if (els.qtyModalStock) {
    els.qtyModalStock.textContent = available !== null && available !== undefined
      ? `${window.i18n.t('available_stock')}: ${formatNumber(available)}`
      : '';
  }
  if (els.qtyModalError) els.qtyModalError.textContent = '';
  updateQtyDisplay();
  if (els.qtyModal) els.qtyModal.classList.remove('hidden');
}

function closeQtyModal() {
  if (els.qtyModal) els.qtyModal.classList.add('hidden');
}

function handleQtyKey(key) {
  let value = qtyModalState.value || '';
  if (key === 'back') {
    value = value.slice(0, -1);
  } else if (key === '.' || key === ',') {
    if (!value.includes('.')) {
      value = value ? `${value}.` : '0.';
    }
  } else {
    value = `${value}${key}`;
  }
  qtyModalState.value = value;
  updateQtyDisplay();
}

function updateQtyDisplay() {
  if (!els.qtyModalDisplay) return;
  els.qtyModalDisplay.textContent = qtyModalState.value || '0';
}

function confirmQtyModal() {
  const value = String(qtyModalState.value || '').replace(',', '.');
  const qty = Number(value || 0);
  if (!qty || Number.isNaN(qty)) {
    if (els.qtyModalError) els.qtyModalError.textContent = window.i18n.t('error');
    return;
  }
  if (qtyModalState.available !== null && qtyModalState.available !== undefined) {
    if (qty > Number(qtyModalState.available || 0)) {
      if (els.qtyModalError) els.qtyModalError.textContent = window.i18n.t('insufficient_stock');
      return;
    }
  }
  closeQtyModal();
  if (typeof qtyModalState.onConfirm === 'function') qtyModalState.onConfirm(qty);
}

function calculateInvoiceTotals() {
  const subtotal = state.invoice.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const selectedCustomer = state.invoice.customerId ? state.customers[state.invoice.customerId] : null;
  const addresses = selectedCustomer ? getCustomerAddresses(selectedCustomer) : [];
  const address = addresses.find((addr) => addr.id === state.invoice.addressId);
  const deliveryFee = address ? getDeliveryFee(address.zoneId) : 0;
  let discount = 0;
  if (state.invoice.manualDiscount) {
    const { type, value } = state.invoice.manualDiscount;
    if (type === 'percent') {
      discount = subtotal * (Number(value || 0) / 100);
    } else {
      discount = Number(value || 0);
    }
    if (discount > subtotal) discount = subtotal;
  }
  const total = subtotal - discount + deliveryFee;
  return { subtotal, discount, deliveryFee, total };
}

function renderInvoiceSummary() {
  const totals = calculateInvoiceTotals();
  if (els.invoiceSubtotal) els.invoiceSubtotal.textContent = formatCurrency(totals.subtotal);
  if (els.invoiceDiscount) els.invoiceDiscount.textContent = formatCurrency(totals.discount);
  if (els.invoiceDeliveryFee) els.invoiceDeliveryFee.textContent = formatCurrency(totals.deliveryFee);
  if (els.invoiceTotal) els.invoiceTotal.textContent = formatCurrency(totals.total);
}

function getDeliveryFee(zoneId) {
  if (!zoneId) return 0;
  const prices = Object.values(state.deliveryPrices || {});
  const match = prices.find((entry) => Array.isArray(entry.zoneIds) && entry.zoneIds.includes(zoneId));
  return match ? Number(match.price || 0) : 0;
}

function openManagerDiscountModal() {
  if (els.managerDiscountError) els.managerDiscountError.textContent = '';
  if (els.managerCodeInput) els.managerCodeInput.value = '';
  if (els.managerDiscountValue) els.managerDiscountValue.value = '';
  if (els.managerDiscountType) els.managerDiscountType.value = 'amount';
  if (els.managerDiscountModal) els.managerDiscountModal.classList.remove('hidden');
}

function closeManagerDiscountModal() {
  if (els.managerDiscountModal) els.managerDiscountModal.classList.add('hidden');
}

function applyManagerDiscount() {
  const code = normalizeDigits(els.managerCodeInput?.value || '').trim();
  if (!isManagerCode(code)) {
    if (els.managerDiscountError) els.managerDiscountError.textContent = window.i18n.t('invalid_code');
    return;
  }
  const type = els.managerDiscountType?.value || 'amount';
  const value = Number(els.managerDiscountValue?.value || 0);
  if (!value || value <= 0) {
    if (els.managerDiscountError) els.managerDiscountError.textContent = window.i18n.t('error');
    return;
  }
  state.invoice.manualDiscount = { type, value };
  closeManagerDiscountModal();
  renderInvoiceSummary();
}

function isManagerCode(code) {
  const users = Object.values(state.users || {});
  return users.some((user) => user.role === 'manager' && String(user.code || '') === String(code));
}

function submitInvoice() {
  if (!state.branchId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('device_not_assigned');
    return;
  }
  if (!state.cashierId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('invalid_code');
    toggleCashierLogin(true);
    return;
  }
  if (!state.invoice.cart.length) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('empty_cart');
    return;
  }
  if (!state.invoice.orderDate) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_order_date');
    return;
  }
  if (!state.invoice.deliveryTime) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_delivery_time');
    return;
  }
  if (!state.invoice.orderTypeId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_order_type');
    return;
  }
  if (!state.invoice.paymentMethodId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_payment_method');
    return;
  }
  if (!state.invoice.customerId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_customer');
    return;
  }

  const totals = calculateInvoiceTotals();
  generateOrderNumber().then((orderNumber) => {
    const customer = state.customers[state.invoice.customerId];
    const addresses = getCustomerAddresses(customer);
    const address = addresses.find((addr) => addr.id === state.invoice.addressId) || addresses[0] || null;
    const cashierDisplayName = state.cashierName && state.branchName
      ? `${state.cashierName} (${state.branchName})`
      : state.cashierName;

    const orderData = {
      orderNumber,
      createdAt: serverTime,
      orderDate: state.invoice.orderDate,
      deliveryTime: state.invoice.deliveryTime,
      items: state.invoice.cart,
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountType: state.invoice.manualDiscount?.type || null,
      netTotal: totals.subtotal - totals.discount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      orderTypeId: state.invoice.orderTypeId,
      paymentMethodId: state.invoice.paymentMethodId,
      customerId: state.invoice.customerId,
      customerName: getLocalizedName(customer),
      customerPhone: customer?.phone || null,
      deliveryZoneId: address?.zoneId || null,
      deliveryAddress: address?.details || null,
      cashierId: state.cashierId,
      cashierName: cashierDisplayName || state.cashierName,
      branchId: state.branchId,
      branchName: state.branchName,
      deviceId: state.deviceId,
      status: 'paid',
      managerDiscount: state.invoice.manualDiscount || null
    };

    const orderRef = db.ref('orders').push();
    orderRef.set(orderData).then(() => {
      printThermalReceipt(orderData);
      resetInvoice();
      closeInvoiceOverlay();
      renderOrdersTable();
    });
  });
}

function generateOrderNumber() {
  const counterRef = db.ref('meta/orderCounter');
  return counterRef.transaction((current) => (current || 0) + 1).then((result) => {
    return result.snapshot.val();
  });
}

function generateCounter(path) {
  const counterRef = db.ref(path);
  return counterRef.transaction((current) => (current || 0) + 1).then((result) => result.snapshot.val());
}

function updateItemStock(itemType, itemId, branchId, delta, mode = 'delta') {
  const basePath = itemType === 'product' ? 'products' : 'stockMaterials';
  const stockRef = db.ref(`${basePath}/${itemId}/stockByBranch/${branchId}`);
  if (mode === 'set') {
    return stockRef.set(delta);
  }
  return stockRef.transaction((current) => (Number(current || 0) + Number(delta || 0)));
}

function normalizeItems(list) {
  if (!list) return [];
  return Array.isArray(list) ? list : Object.values(list);
}

function renderOrdersTable() {
  if (!els.ordersTable) return;
  const orders = Object.entries(state.orders || {})
    .map(([id, order]) => ({ id, ...order }))
    .filter((order) => !state.branchId || order.branchId === state.branchId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  els.ordersTable.innerHTML = '';
  if (!orders.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    els.ordersTable.appendChild(row);
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.orderNumber || '-'}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${order.customerName || '-'}</td>
      <td>${formatCurrency(order.total || 0)}</td>
      <td>
        <div class="row" style="gap:6px;">
          <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="print">${window.i18n.t('print')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="view"]').addEventListener('click', () => openOrderDetails(order));
    row.querySelector('[data-action="print"]').addEventListener('click', () => printThermalReceipt(order));
    els.ordersTable.appendChild(row);
  });
}

function openOrderDetails(order) {
  if (!els.orderDetailsOverlay || !els.orderDetailsBody) return;
  const itemsHtml = (order.items || []).map((item) => {
    const note = item.note ? `<div class="helper">${item.note}</div>` : '';
    return `
      <div class="row" style="justify-content: space-between;">
        <span>${item.name || '-'}</span>
        <span>${formatNumber(item.qty)} x ${formatCurrency(item.price)}</span>
      </div>
      ${note}
    `;
  }).join('');

  els.orderDetailsBody.innerHTML = `
    <div class="notice" style="margin-bottom: 12px;">
      <div>${window.i18n.t('order_number')}: ${order.orderNumber || '-'}</div>
      <div>${window.i18n.t('date_time')}: ${formatDate(order.createdAt)}</div>
      <div>${window.i18n.t('customer_name')}: ${order.customerName || '-'}</div>
      <div>${window.i18n.t('customer_phone')}: ${order.customerPhone || '-'}</div>
      <div>${window.i18n.t('delivery_zone')}: ${getZoneLabel(order.deliveryZoneId)}</div>
      <div>${window.i18n.t('address')}: ${order.deliveryAddress || '-'}</div>
    </div>
    <div class="stack">${itemsHtml || window.i18n.t('no_data')}</div>
  `;
  els.orderDetailsOverlay.classList.remove('hidden');
}

function resetTransferRequestDraft() {
  state.transferRequestDraft = {
    items: []
  };
}

function openTransferRequestModal() {
  if (!state.branchId) {
    if (els.transferRequestError) els.transferRequestError.textContent = window.i18n.t('device_not_assigned');
    return;
  }
  if (!state.cashierId) {
    toggleCashierLogin(true);
    return;
  }
  resetTransferRequestDraft();
  if (els.transferRequestSearchInput) els.transferRequestSearchInput.value = '';
  renderTransferRequestModal();
  if (els.transferRequestModal) els.transferRequestModal.classList.remove('hidden');
}

function closeTransferRequestModal() {
  if (els.transferRequestModal) els.transferRequestModal.classList.add('hidden');
  state.transferRequestDraft = null;
}

function renderTransferRequestModal() {
  if (els.transferRequestCashier) els.transferRequestCashier.value = state.cashierName || '-';
  if (els.transferRequestBranch) els.transferRequestBranch.value = state.branchName || '-';
  if (els.transferRequestError) els.transferRequestError.textContent = '';
  renderTransferRequestSearchResults();
  renderTransferRequestItems();
}

function getTransferRequestEntries() {
  return Object.entries(state.products || {}).map(([id, item]) => ({ id, item }));
}

function filterTransferRequestEntries(entries, query) {
  const q = query.toLowerCase();
  return entries.filter(({ item }) => {
    const name = `${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''}`.toLowerCase();
    const code = String(item.code || '').toLowerCase();
    const barcode = String(item.barcode || '').toLowerCase();
    return name.includes(q) || code.includes(q) || barcode.includes(q);
  });
}

function handleTransferRequestBarcodeScan() {
  const query = els.transferRequestSearchInput?.value.trim();
  if (!query) return;
  const match = findExactProductMatch(query);
  if (match) {
    openTransferRequestQtyModal(match);
    if (els.transferRequestSearchInput) els.transferRequestSearchInput.value = '';
    renderTransferRequestSearchResults();
  } else {
    renderTransferRequestSearchResults();
  }
}

function renderTransferRequestSearchResults() {
  const results = els.transferRequestSearchResults;
  if (!results || !els.transferRequestSearchInput) return;
  const query = els.transferRequestSearchInput.value.trim();
  results.innerHTML = '';
  if (!query) {
    results.innerHTML = `<p class="helper">${window.i18n.t('search_to_show')}</p>`;
    return;
  }
  const entries = filterTransferRequestEntries(getTransferRequestEntries(), query);
  const exact = findExactProductMatch(query);
  if (exact) {
    openTransferRequestQtyModal(exact);
    els.transferRequestSearchInput.value = '';
    results.innerHTML = '';
    return;
  }
  if (!entries.length) {
    results.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <strong>${getLocalizedName(entry.item)}</strong>
      <div class="helper">${window.i18n.t('available_stock')}: ${formatNumber(getMainBranchStock(entry.item))}</div>
    `;
    card.addEventListener('click', () => openTransferRequestQtyModal(entry));
    results.appendChild(card);
  });
}

function openTransferRequestQtyModal(entry) {
  const existing = state.transferRequestDraft.items.find((item) => item.itemId === entry.id);
  const availableBase = getMainBranchStock(entry.item);
  const available = Math.max(Number(availableBase || 0) - Number(existing?.qty || 0), 0);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    onConfirm: (qty) => addTransferRequestItem(entry, qty)
  });
}

function addTransferRequestItem(entry, qty) {
  const existing = state.transferRequestDraft.items.find((item) => item.itemId === entry.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.transferRequestDraft.items.push({
      itemId: entry.id,
      itemType: 'product',
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderTransferRequestItems();
}

function renderTransferRequestItems() {
  if (!els.transferRequestItemsList) return;
  els.transferRequestItemsList.innerHTML = '';
  if (!state.transferRequestDraft.items.length) {
    els.transferRequestItemsList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.transferRequestDraft.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${item.name}</strong>
          <div class="helper">${window.i18n.t('quantity')}: ${formatNumber(item.qty)}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete" data-index="${index}">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editTransferRequestItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.transferRequestDraft.items.splice(index, 1);
      renderTransferRequestItems();
    });
    els.transferRequestItemsList.appendChild(card);
  });
}

function editTransferRequestItemQty(index) {
  const item = state.transferRequestDraft.items[index];
  if (!item) return;
  const product = state.products[item.itemId];
  const availableBase = product ? getMainBranchStock(product) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(product),
    available,
    onConfirm: (qty) => {
      state.transferRequestDraft.items[index].qty = qty;
      renderTransferRequestItems();
    }
  });
}

function submitTransferRequest() {
  if (!state.branchId) {
    if (els.transferRequestError) els.transferRequestError.textContent = window.i18n.t('device_not_assigned');
    return;
  }
  if (!state.cashierId) {
    if (els.transferRequestError) els.transferRequestError.textContent = window.i18n.t('invalid_code');
    return;
  }
  if (!state.transferRequestDraft.items.length) {
    if (els.transferRequestError) els.transferRequestError.textContent = window.i18n.t('error');
    return;
  }

  generateCounter('meta/transferRequestCounter').then((requestNumber) => {
    const payload = {
      requestNumber,
      createdAt: serverTime,
      cashierId: state.cashierId,
      cashierName: state.cashierName || null,
      branchId: state.branchId,
      branchName: state.branchName || null,
      items: state.transferRequestDraft.items,
      status: 'pending'
    };
    db.ref('transferRequests').push(payload).then(() => {
      closeTransferRequestModal();
      resetTransferRequestDraft();
      renderTransferRequestsTable();
    });
  });
}

function renderTransferRequestsTable() {
  if (!els.transferRequestsTable) return;
  const entries = Object.entries(state.transferRequests || {})
    .map(([id, request]) => ({ id, ...request }))
    .filter((req) => !state.branchId || req.branchId === state.branchId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  els.transferRequestsTable.innerHTML = '';
  if (!entries.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    els.transferRequestsTable.appendChild(row);
    return;
  }

  entries.forEach((req) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${req.requestNumber || '-'}</td>
      <td>${formatDate(req.createdAt)}</td>
      <td>${getTransferRequestStatusLabel(req)}</td>
      <td>-</td>
    `;
    els.transferRequestsTable.appendChild(row);
  });
}

function getTransferRequestStatusLabel(request) {
  const status = request?.status || 'pending';
  if (status === 'transferred') return window.i18n.t('transferred');
  if (status === 'received') return window.i18n.t('received');
  if (status === 'partial_received') return window.i18n.t('partial_received');
  if (status === 'rejected') return window.i18n.t('rejected');
  return window.i18n.t('pending');
}

function renderIncomingTransfersTable() {
  if (!els.incomingTransfersTable) return;
  const entries = Object.entries(state.cashierTransfers || {})
    .map(([id, transfer]) => ({ id, ...transfer }))
    .filter((transfer) => !state.branchId || transfer.toBranchId === state.branchId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  els.incomingTransfersTable.innerHTML = '';
  if (!entries.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    els.incomingTransfersTable.appendChild(row);
    return;
  }

  entries.forEach((transfer) => {
    const canReceive = !['received', 'partial_received'].includes(transfer.status);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${transfer.transferNumber || '-'}</td>
      <td>${formatDate(transfer.createdAt)}</td>
      <td>${getTransferStatusLabel(transfer)}</td>
      <td>
        ${canReceive ? `<button class="btn primary small" data-action="receive">${window.i18n.t('receive_action')}</button>` : '-'}
      </td>
    `;
    if (canReceive) {
      const btn = row.querySelector('[data-action="receive"]');
      btn.addEventListener('click', () => openTransferReceiveModal(transfer));
    }
    els.incomingTransfersTable.appendChild(row);
  });
}

function getTransferStatusLabel(transfer) {
  const status = transfer?.status || 'pending';
  if (status === 'received') return window.i18n.t('received');
  if (status === 'partial_received') return window.i18n.t('partial_received');
  if (status === 'in_transit' || status === 'transferred') return window.i18n.t('transferred');
  return window.i18n.t('pending');
}

function openTransferReceiveModal(transfer) {
  if (!transfer) return;
  state.transferReceiveDraft = {
    transferId: transfer.id,
    requestId: transfer.requestId || null,
    fromBranchId: transfer.fromBranchId,
    toBranchId: transfer.toBranchId,
    transferNumber: transfer.transferNumber || '',
    items: normalizeItems(transfer.items).map((item) => {
      const requestedQty = Number(item.requestedQty ?? item.qty ?? 0);
      const transferredQty = Number(item.qty ?? item.transferredQty ?? 0);
      const receivedQty = Number(item.receivedQty ?? transferredQty);
      return {
        itemId: item.itemId,
        itemType: item.itemType || 'product',
        name: item.name || '-',
        unitId: item.unitId || null,
        requestedQty,
        transferredQty,
        receivedQty
      };
    })
  };
  if (els.transferReceiveCashier) els.transferReceiveCashier.value = state.cashierName || '-';
  if (els.transferReceiveBranch) els.transferReceiveBranch.value = state.branchName || '-';
  if (els.transferReceiveNumber) els.transferReceiveNumber.value = state.transferReceiveDraft.transferNumber || '-';
  if (els.transferReceiveError) els.transferReceiveError.textContent = '';
  renderTransferReceiveItems();
  if (els.transferReceiveModal) els.transferReceiveModal.classList.remove('hidden');
}

function closeTransferReceiveModal() {
  if (els.transferReceiveModal) els.transferReceiveModal.classList.add('hidden');
  state.transferReceiveDraft = null;
}

function renderTransferReceiveItems() {
  if (!els.transferReceiveItemsList || !state.transferReceiveDraft) return;
  const items = state.transferReceiveDraft.items || [];
  els.transferReceiveItemsList.innerHTML = '';
  if (!items.length) {
    els.transferReceiveItemsList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${item.name}</strong>
          <div class="helper">${window.i18n.t('requested_qty')}: ${formatNumber(item.requestedQty)}</div>
          <div class="helper">${window.i18n.t('transferred_qty')}: ${formatNumber(item.transferredQty)}</div>
          <div class="helper">${window.i18n.t('received_qty')}: ${formatNumber(item.receivedQty)}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editTransferReceiveItemQty(index));
    els.transferReceiveItemsList.appendChild(card);
  });
}

function editTransferReceiveItemQty(index) {
  const item = state.transferReceiveDraft?.items?.[index];
  if (!item) return;
  openQtyModal({
    title: item.name,
    available: item.transferredQty,
    onConfirm: (qty) => {
      state.transferReceiveDraft.items[index].receivedQty = qty;
      renderTransferReceiveItems();
    }
  });
}

function submitTransferReceive() {
  if (!state.transferReceiveDraft) return;
  const { transferId, requestId, fromBranchId, toBranchId } = state.transferReceiveDraft;
  const items = state.transferReceiveDraft.items || [];
  if (!items.length) {
    if (els.transferReceiveError) els.transferReceiveError.textContent = window.i18n.t('error');
    return;
  }
  const invalid = items.some((item) => Number(item.receivedQty || 0) > Number(item.transferredQty || 0));
  if (invalid) {
    if (els.transferReceiveError) els.transferReceiveError.textContent = window.i18n.t('error');
    return;
  }
  const confirmText = window.i18n.t('transfer_receive_confirm');
  if (confirmText && !confirm(confirmText)) return;

  const updates = [];
  items.forEach((item) => {
    const receivedQty = Number(item.receivedQty || 0);
    const transferredQty = Number(item.transferredQty || 0);
    if (receivedQty > 0) {
      updates.push(updateItemStock(item.itemType, item.itemId, toBranchId, receivedQty));
    }
    const diff = transferredQty - receivedQty;
    if (diff > 0) {
      updates.push(updateItemStock(item.itemType, item.itemId, fromBranchId, diff));
    }
  });

  const allReceived = items.every((item) => Number(item.receivedQty || 0) >= Number(item.transferredQty || 0));
  const status = allReceived ? 'received' : 'partial_received';
  Promise.all(updates).then(() => {
    const updatedItems = items.map((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      name: item.name,
      unitId: item.unitId || null,
      requestedQty: item.requestedQty,
      qty: item.transferredQty,
      receivedQty: item.receivedQty
    }));
    db.ref(`cashierTransfers/${transferId}`).update({
      status,
      receivedAt: serverTime,
      receivedBy: state.cashierId,
      receivedByName: state.cashierName || null,
      items: updatedItems
    }).then(() => {
      if (requestId) {
        db.ref(`transferRequests/${requestId}`).update({
          status,
          receivedAt: serverTime,
          receivedBy: state.cashierId
        });
      }
      closeTransferReceiveModal();
      renderIncomingTransfersTable();
    });
  });
}

function printThermalReceipt(order) {
  if (!order) return;
  const items = order.items || [];
  const itemsHtml = items.map((item) => {
    const note = item.note ? `<div class="note">${item.note}</div>` : '';
    return `
      <div class="row">
        <div>${item.name || '-'}</div>
        <div>${formatNumber(item.qty)} x ${formatCurrency(item.price)}</div>
      </div>
      ${note}
    `;
  }).join('');

  const totals = {
    subtotal: order.subtotal || 0,
    discount: order.discount || 0,
    deliveryFee: order.deliveryFee || 0,
    total: order.total || 0
  };

  const html = `
    <html lang="${document.documentElement.lang}" dir="${document.documentElement.dir}">
      <head>
        <title>${window.i18n.t('invoice_number')} ${order.orderNumber || ''}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { font-family: "Cairo", sans-serif; font-size: 12px; color: #1f1a14; margin: 0; }
          .receipt { width: 80mm; }
          .logo { text-align: center; margin-bottom: 6px; }
          .logo img { width: 50px; height: 50px; }
          .brands { display: flex; justify-content: space-between; gap: 6px; }
          .brand { flex: 1; font-size: 10px; }
          .brand h3 { margin: 0 0 4px; font-size: 12px; }
          .divider { border-top: 1px dashed #444; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .note { font-size: 10px; color: #555; margin-bottom: 4px; }
          .total { font-weight: 700; }
          .footer { text-align: center; margin-top: 10px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="logo"><img src="logo.png" alt="logo" /></div>
          <div class="brands">
            <div class="brand">
              <h3>مخبز التين والزيتون</h3>
              <div>الكويت، اليرموك، ق٢ شارع ٢</div>
              <div>22085889 | 65162277</div>
              <div>@figsolives.kw</div>
            </div>
            <div class="brand">
              <h3>مطعم التين الطبيعي</h3>
              <div>الكويت، أبو الحصانية، مول ٣٠</div>
              <div>22085886 | 99176512</div>
              <div>@natural_figs</div>
            </div>
          </div>
          <div class="divider"></div>
          <div>${window.i18n.t('invoice_number')}: ${order.orderNumber || '-'}</div>
          <div>${window.i18n.t('date_time')}: ${formatDate(order.createdAt)}</div>
          <div>${window.i18n.t('customer_name')}: ${order.customerName || '-'}</div>
          <div>${window.i18n.t('customer_phone')}: ${order.customerPhone || '-'}</div>
          <div>${window.i18n.t('address')}: ${order.deliveryAddress || '-'}</div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="row"><span>${window.i18n.t('subtotal')}</span><span>${formatCurrency(totals.subtotal)}</span></div>
          <div class="row"><span>${window.i18n.t('delivery_fee')}</span><span>${formatCurrency(totals.deliveryFee)}</span></div>
          <div class="row"><span>${window.i18n.t('discount')}</span><span>${formatCurrency(totals.discount)}</span></div>
          <div class="row total"><span>${window.i18n.t('total')}</span><span>${formatCurrency(totals.total)}</span></div>
          <div class="divider"></div>
          <div class="footer">صحتك أغلى ماتملك.. فتناول شيئاً صحياً</div>
        </div>
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `;
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function showTransfersSection() {
  if (els.ordersSection) els.ordersSection.classList.add('hidden');
  if (els.transfersSection) els.transfersSection.classList.remove('hidden');
  renderTransferRequestsTable();
  renderIncomingTransfersTable();
}

function showOrdersSection() {
  if (els.transfersSection) els.transfersSection.classList.add('hidden');
  if (els.ordersSection) els.ordersSection.classList.remove('hidden');
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toFixed(2);
}

function generateId() {
  return `addr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

init();
