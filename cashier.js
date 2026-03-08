const firebaseConfig = {
  supabaseUrl: window.__SUPABASE_CONFIG__?.url || '',
  supabaseAnonKey: window.__SUPABASE_CONFIG__?.anonKey || ''
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
  stockMaterials: {},
  categories: {},
  production: {},
  branches: {},
  orderTypes: {},
  paymentMethods: {},
  customers: {},
  deliveryZones: {},
  deliveryPrices: {},
  discounts: {},
  orders: {},
  tables: {},
  users: {},
  transferRequests: {},
  cashierTransfers: {},
  tableDrafts: {},
  transferRequestDraft: null,
  transferReceiveDraft: null,
  transferDetailsDraft: null,
  transferRequestDragIndex: null,
  invoice: null,
  customerSearch: '',
  ordersSearch: '',
  currentView: 'orders'
};

const els = {
  branchDisplay: document.getElementById('branchDisplay'),
  branchName: document.getElementById('branchName'),
  cashierDisplay: document.getElementById('cashierDisplay'),
  deviceIdDisplay: document.getElementById('deviceIdDisplay'),
  logoutBtn: document.getElementById('logoutBtn'),
  ordersSection: document.getElementById('ordersSection'),
  ordersTable: document.getElementById('ordersTable'),
  orderSearchInput: document.getElementById('orderSearchInput'),
  newInvoiceBtn: document.getElementById('newInvoiceBtn'),
  openTablesBtn: document.getElementById('openTablesBtn'),
  openTransfersBtn: document.getElementById('openTransfersBtn'),
  transfersSection: document.getElementById('cashierTransfersSection'),
  tablesSection: document.getElementById('cashierTablesSection'),
  tablesList: document.getElementById('tablesList'),
  newTableBtn: document.getElementById('newTableBtn'),
  backToOrdersFromTablesBtn: document.getElementById('backToOrdersFromTablesBtn'),
  transferRequestsTable: document.getElementById('transferRequestsTable'),
  incomingTransfersTable: document.getElementById('incomingTransfersTable'),
  newTransferRequestBtn: document.getElementById('newTransferRequestBtn'),
  backToOrdersBtn: document.getElementById('backToOrdersBtn'),
  deviceOverlay: document.getElementById('deviceOverlay'),
  deviceOverlayDeviceId: document.getElementById('deviceOverlayDeviceId'),
  cashierLogin: document.getElementById('cashierLogin'),
  cashierCodeInput: document.getElementById('cashierCodeInput'),
  cashierLoginBtn: document.getElementById('cashierLoginBtn'),
  cashierLoginError: document.getElementById('cashierLoginError'),
  orderDetailsOverlay: document.getElementById('orderDetailsOverlay'),
  orderDetailsBody: document.getElementById('orderDetailsBody'),
  orderDetailsClose: document.getElementById('orderDetailsClose'),
  tableSelectModal: document.getElementById('tableSelectModal'),
  tableSelectList: document.getElementById('tableSelectList'),
  tableSelectCancelBtn: document.getElementById('tableSelectCancelBtn'),
  tableCustomerTimingModal: document.getElementById('tableCustomerTimingModal'),
  tableCustomerNowBtn: document.getElementById('tableCustomerNowBtn'),
  tableCustomerLaterBtn: document.getElementById('tableCustomerLaterBtn'),
  tableCustomerTimingCancelBtn: document.getElementById('tableCustomerTimingCancelBtn'),
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
  invoicePickupBranchRow: document.getElementById('invoicePickupBranchRow'),
  invoicePickupBranchSelect: document.getElementById('invoicePickupBranchSelect'),
  invoicePaymentMethod: document.getElementById('invoicePaymentMethod'),
  invoiceSubtotal: document.getElementById('invoiceSubtotal'),
  invoiceDeliveryFee: document.getElementById('invoiceDeliveryFee'),
  invoiceDiscount: document.getElementById('invoiceDiscount'),
  invoiceTotal: document.getElementById('invoiceTotal'),
  invoiceSummaryPaymentRow: document.getElementById('invoiceSummaryPaymentRow'),
  invoiceSummaryPaymentMethod: document.getElementById('invoiceSummaryPaymentMethod'),
  applyManagerDiscountBtn: document.getElementById('applyManagerDiscountBtn'),
  customerSearchInput: document.getElementById('customerSearchInput'),
  customerList: document.getElementById('customerList'),
  selectedCustomerPanel: document.getElementById('selectedCustomerPanel'),
  addCustomerBtn: document.getElementById('addCustomerBtn'),
  customerModal: document.getElementById('customerModal'),
  customerNameInput: document.getElementById('customerNameInput'),
  customerPhoneInput: document.getElementById('customerPhoneInput'),
  customerNameOnlyToggle: document.getElementById('customerNameOnlyToggle'),
  customerZonePicker: document.getElementById('customerZonePicker'),
  customerZonePickerSummary: document.getElementById('customerZonePickerSummary'),
  customerZonePickerSearch: document.getElementById('customerZonePickerSearch'),
  customerZonePickerOptions: document.getElementById('customerZonePickerOptions'),
  customerZoneInput: document.getElementById('customerZoneInput'),
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
  transferRequestUnassignedCount: document.getElementById('transferRequestUnassignedCount'),
  transferRequestGroupSweets: document.getElementById('transferRequestGroup-sweets'),
  transferRequestGroupTableware: document.getElementById('transferRequestGroup-tableware'),
  transferRequestGroupSupplies: document.getElementById('transferRequestGroup-supplies'),
  transferRequestGroupOther: document.getElementById('transferRequestGroup-other'),
  transferRequestSubmitBtn: document.getElementById('transferRequestSubmitBtn'),
  transferRequestCancelBtn: document.getElementById('transferRequestCancelBtn'),
  transferRequestError: document.getElementById('transferRequestError'),
  transferDetailsModal: document.getElementById('transferDetailsModal'),
  transferDetailsCloseBtn: document.getElementById('transferDetailsCloseBtn'),
  transferDetailsMeta: document.getElementById('transferDetailsMeta'),
  transferDetailsColumns: document.getElementById('transferDetailsColumns'),
  transferDetailsPrintFullBtn: document.getElementById('transferDetailsPrintFullBtn'),
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
  addressId: null,
  basicOnly: false
};

const tableFlowState = {
  selectedTableNumber: ''
};

function init() {
  state.deviceId = getDeviceId();
  updateDeviceInfoUI();
  initPresence('cashier');
  bindUI();
  document.addEventListener('keydown', handleGlobalScan);
  ensureSeedData();
  initNumericInputEnhancer();
  listenData();
  restoreCashierSession();
  resetInvoice();
  renderOrdersTable();
  renderInvoiceUI();

  document.addEventListener('languageChanged', () => {
    updateDeviceInfoUI();
    renderOrdersTable();
    renderInvoiceUI();
    renderCustomerList();
    renderSelectedCustomerPanel();
    renderZoneOptions();
    renderTransferRequestsTable();
    renderIncomingTransfersTable();
    renderTablesSection();
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

function normalizeArabicSearchText(value) {
  return String(value || '')
    .replace(/[\u0640]/g, '')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

function normalizeSearchValue(value) {
  return normalizeArabicSearchText(normalizeDigits(value))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function debounce(fn, wait = 280) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function bindDebouncedInput(input, handler, wait = 280) {
  if (!input || typeof handler !== 'function') return;
  const run = debounce(() => handler(input.value || ''), wait);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handler(input.value || '');
  });
}

function normalizeNumericInputValue(value) {
  let text = normalizeDigits(value);
  text = text.replace(/[٫٬،]/g, '.').replace(/,/g, '.').replace(/[−]/g, '-');
  text = text.replace(/[^0-9.\-]/g, '');
  text = text.replace(/(?!^)-/g, '');
  const firstDot = text.indexOf('.');
  if (firstDot !== -1) {
    text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '');
  }
  return text;
}

function normalizeInputDigitsInPlace(input) {
  if (!input || typeof input.value !== 'string') return;
  if (input.type === 'number') {
    const normalized = normalizeNumericInputValue(input.value);
    if (normalized !== input.value) input.value = normalized;
    return;
  }
  const normalized = normalizeDigits(input.value);
  if (normalized !== input.value) input.value = normalized;
}

function prepareNumericInput(input) {
  if (!input || input.dataset.numericReady === '1') return;
  input.dataset.numericReady = '1';
  if (input.type === 'number') {
    input.step = 'any';
    input.setAttribute('inputmode', 'decimal');
  }
  input.addEventListener('input', () => normalizeInputDigitsInPlace(input));
  input.addEventListener('change', () => normalizeInputDigitsInPlace(input));
  normalizeInputDigitsInPlace(input);
}

function initNumericInputEnhancer() {
  const applyOnRoot = (root) => {
    if (!root || !(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll?.('input, textarea').forEach((input) => prepareNumericInput(input));
  };

  applyOnRoot(document);
  if (!document.body || document.body.dataset.numericObserverReady === '1') return;
  document.body.dataset.numericObserverReady = '1';
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('input, textarea')) prepareNumericInput(node);
        applyOnRoot(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

const scanState = {
  buffer: '',
  lastTime: 0,
  timer: null
};

function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function handleGlobalScan(event) {
  if (isEditableTarget(event.target)) return;
  const key = event.key;
  if (key === 'Enter' || key === 'Tab') {
    if (scanState.buffer) {
      const value = scanState.buffer;
      scanState.buffer = '';
      routeScanValue(value);
    }
    return;
  }
  if (key.length !== 1) return;
  const now = Date.now();
  if (now - scanState.lastTime > 80) {
    scanState.buffer = '';
  }
  scanState.buffer += key;
  scanState.lastTime = now;
  clearTimeout(scanState.timer);
  scanState.timer = setTimeout(() => {
    if (scanState.buffer.length >= 4) {
      const value = scanState.buffer;
      scanState.buffer = '';
      routeScanValue(value);
    } else {
      scanState.buffer = '';
    }
  }, 120);
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

  deviceRef.update({
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
    updateDeviceInfoUI(data);
    state.branchId = data.branchId || null;
    state.branchName = data.branchNameAr || data.branchNameEn || data.branchName || null;
    updateBranchDisplay();
    toggleDeviceOverlay();
  });
}

function updateDeviceInfoUI() {
  if (els.deviceIdDisplay) {
    els.deviceIdDisplay.textContent = state.deviceId || '-';
  }
  if (els.deviceOverlayDeviceId) {
    els.deviceOverlayDeviceId.textContent = `${window.i18n.t('device_id')}: ${state.deviceId || '-'}`;
  }
}

function ensureSeedData() {
  const defaultManager = {
    name: 'غير معرف',
    role: 'manager',
    code: '123456',
    active: true
  };
  const usersRef = db.ref('users');
  usersRef.child('manager').once('value').then((snap) => {
    if (!snap.exists()) {
      usersRef.child('manager').set({ ...defaultManager });
      return;
    }
    const current = snap.val() || {};
    const updates = {};
    if (current.role !== 'manager') updates.role = 'manager';
    if (current.active !== true) updates.active = true;
    if (!String(current.name || '').trim()) updates.name = defaultManager.name;
    if (!String(current.code || '').trim()) updates.code = defaultManager.code;
    if (Object.keys(updates).length) {
      usersRef.child('manager').update(updates);
    }
  }).catch(() => {});
}

function bindUI() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => window.i18n.setLanguage(btn.dataset.lang));
  });

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => {
      if (!confirm(window.i18n.t('confirm_logout'))) return;
      localStorage.removeItem('cashierId');
      state.cashierId = null;
      state.cashierName = null;
      updateCashierDisplay();
      window.location.href = 'index.html';
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
  if (els.orderSearchInput) {
    bindDebouncedInput(els.orderSearchInput, (value) => {
      state.ordersSearch = String(value || '').trim();
      renderOrdersTable();
    });
  }
  if (els.invoiceCloseBtn) {
    els.invoiceCloseBtn.addEventListener('click', () => closeInvoiceOverlay());
  }
  if (els.invoiceNextToDetails) {
    els.invoiceNextToDetails.addEventListener('click', () => goNextFromItems());
  }
  if (els.invoiceBackToItems) {
    els.invoiceBackToItems.addEventListener('click', () => setInvoiceStep('items'));
  }
  if (els.invoiceNextToCustomer) {
    els.invoiceNextToCustomer.addEventListener('click', () => goNextFromDetails());
  }
  if (els.invoiceBackToDetails) {
    els.invoiceBackToDetails.addEventListener('click', () => goBackFromCustomer());
  }
  if (els.invoiceNextToSummary) {
    els.invoiceNextToSummary.addEventListener('click', () => goNextFromCustomer());
  }
  if (els.invoiceBackToCustomer) {
    els.invoiceBackToCustomer.addEventListener('click', () => goBackFromSummary());
  }
  if (els.invoiceSubmitBtn) {
    els.invoiceSubmitBtn.addEventListener('click', () => submitInvoice());
  }

  if (els.invoiceSearchInput) {
    bindDebouncedInput(els.invoiceSearchInput, (value) => {
      state.invoice.search = String(value || '').trim();
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
      persistOpenTableDraft();
    });
  }
  if (els.invoiceDeliveryTime) {
    els.invoiceDeliveryTime.addEventListener('change', (e) => {
      state.invoice.deliveryTime = e.target.value;
      persistOpenTableDraft();
    });
  }
  if (els.invoiceOrderType) {
    els.invoiceOrderType.addEventListener('change', (e) => {
      state.invoice.orderTypeId = e.target.value;
      renderPickupBranchSelector();
      if (!isAddressRequiredForCurrentInvoice()) {
        state.invoice.addressId = '';
      }
      renderSelectedCustomerPanel();
      renderInvoiceSummary();
      persistOpenTableDraft();
    });
  }
  if (els.invoicePickupBranchSelect) {
    els.invoicePickupBranchSelect.addEventListener('change', (e) => {
      state.invoice.pickupBranchId = e.target.value || '';
      persistOpenTableDraft();
    });
  }
  if (els.invoicePaymentMethod) {
    els.invoicePaymentMethod.addEventListener('change', (e) => {
      state.invoice.paymentMethodId = e.target.value;
      syncSummaryPaymentMethod();
      persistOpenTableDraft();
    });
  }
  if (els.invoiceSummaryPaymentMethod) {
    els.invoiceSummaryPaymentMethod.addEventListener('change', (e) => {
      state.invoice.paymentMethodId = e.target.value;
      if (els.invoicePaymentMethod) {
        els.invoicePaymentMethod.value = e.target.value;
      }
      persistOpenTableDraft();
    });
  }

  if (els.customerSearchInput) {
    bindDebouncedInput(els.customerSearchInput, (value) => {
      state.customerSearch = normalizeSearchValue(value || '');
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
  if (els.customerZonePickerSearch) {
    bindDebouncedInput(els.customerZonePickerSearch, () => renderZoneOptions());
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
  if (els.openTablesBtn) {
    els.openTablesBtn.addEventListener('click', () => showTablesSection());
  }
  if (els.backToOrdersBtn) {
    els.backToOrdersBtn.addEventListener('click', () => showOrdersSection());
  }
  if (els.backToOrdersFromTablesBtn) {
    els.backToOrdersFromTablesBtn.addEventListener('click', () => showOrdersSection());
  }
  if (els.newTableBtn) {
    els.newTableBtn.addEventListener('click', () => openTableSelectModal());
  }
  if (els.tableSelectCancelBtn) {
    els.tableSelectCancelBtn.addEventListener('click', () => closeTableSelectModal());
  }
  if (els.tableCustomerNowBtn) {
    els.tableCustomerNowBtn.addEventListener('click', () => startSelectedTableInvoice('now'));
  }
  if (els.tableCustomerLaterBtn) {
    els.tableCustomerLaterBtn.addEventListener('click', () => startSelectedTableInvoice('later'));
  }
  if (els.tableCustomerTimingCancelBtn) {
    els.tableCustomerTimingCancelBtn.addEventListener('click', () => closeTableCustomerTimingModal());
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
    bindDebouncedInput(els.transferRequestSearchInput, () => renderTransferRequestSearchResults());
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
  if (els.transferDetailsCloseBtn) {
    els.transferDetailsCloseBtn.addEventListener('click', () => closeTransferDetailsModal());
  }
  if (els.transferDetailsPrintFullBtn) {
    els.transferDetailsPrintFullBtn.addEventListener('click', () => printTransferDetailsFullReport());
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
    renderInvoiceCart();
    renderInvoiceSummary();
  });

  db.ref('stockMaterials').on('value', (snap) => {
    state.stockMaterials = snap.val() || {};
    renderTransferRequestSearchResults();
  });

  db.ref('production').on('value', (snap) => {
    state.production = snap.val() || {};
    renderInvoiceCart();
    renderInvoiceSummary();
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

  db.ref('discounts').on('value', (snap) => {
    state.discounts = snap.val() || {};
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

  db.ref('tables').on('value', (snap) => {
    state.tables = snap.val() || {};
    renderTablesSection();
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
  els.cashierDisplay.textContent = state.cashierName || window.i18n.t('unassigned');
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
  loadTableDrafts();
  updateCashierDisplay();
  renderOrdersTable();
  renderTransferRequestsTable();
  renderIncomingTransfersTable();
  renderTablesSection();
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
    pickupBranchId: '',
    paymentMethodId: '',
    customerId: '',
    addressId: '',
    manualDiscount: null,
    isTableOrder: false,
    tableNumber: '',
    tableOpenedAt: null,
    tableCustomerChoice: 'later',
    customerCapturedFirst: true
  };
}

function getDefaultTableOrderTypeId() {
  const entries = Object.entries(state.orderTypes || {});
  if (!entries.length) return '';
  const exactKeywords = ['طاولة', 'محلي', 'صالة', 'داخلي', 'table', 'dine in', 'dine-in', 'dinein'];
  const fallbackKeywords = ['داخل', 'hall'];
  const normalizedEntries = entries.map(([id, type]) => {
    const name = normalizeSearchValue(`${type?.nameAr || ''} ${type?.nameEn || ''} ${type?.name || ''}`);
    return { id, name };
  });
  const exact = normalizedEntries.find((entry) => exactKeywords.some((kw) => entry.name.includes(normalizeSearchValue(kw))));
  if (exact) return exact.id;
  const fallback = normalizedEntries.find((entry) => fallbackKeywords.some((kw) => entry.name.includes(normalizeSearchValue(kw))));
  if (fallback) return fallback.id;
  return normalizedEntries[0]?.id || '';
}

function applyTableInvoiceDefaults() {
  if (!state.invoice?.isTableOrder) return;
  if (!state.invoice.orderDate) {
    state.invoice.orderDate = new Date().toISOString().slice(0, 10);
  }
  const tableOrderTypeId = getDefaultTableOrderTypeId();
  if (tableOrderTypeId && !state.invoice.orderTypeId) {
    state.invoice.orderTypeId = tableOrderTypeId;
  }
  state.invoice.addressId = '';
  state.invoice.pickupBranchId = '';
}

function ensureTableFlowDefaults() {
  if (!state.invoice?.isTableOrder) return;
  if (!state.invoice.tableCustomerChoice) state.invoice.tableCustomerChoice = 'later';
  if (typeof state.invoice.customerCapturedFirst !== 'boolean') {
    state.invoice.customerCapturedFirst = state.invoice.tableCustomerChoice !== 'now';
  }
}

function getOrderTypeName(orderTypeId) {
  const type = state.orderTypes?.[orderTypeId];
  return `${type?.nameAr || ''} ${type?.nameEn || ''} ${type?.name || ''}`.trim();
}

function isPickupOrderType(orderTypeId = state.invoice?.orderTypeId) {
  const name = normalizeSearchValue(getOrderTypeName(orderTypeId));
  if (!name) return false;
  return ['استلام', 'pickup', 'pick up', 'self pickup', 'takeaway', 'take away']
    .some((keyword) => name.includes(normalizeSearchValue(keyword)));
}

function isTableOrderType(orderTypeId = state.invoice?.orderTypeId) {
  if (state.invoice?.isTableOrder) return true;
  const name = normalizeSearchValue(getOrderTypeName(orderTypeId));
  if (!name) return false;
  return ['طاولة', 'table', 'dine in', 'dine-in', 'dinein', 'محلي', 'داخلي']
    .some((keyword) => name.includes(normalizeSearchValue(keyword)));
}

function isAddressRequiredForCurrentInvoice() {
  if (!state.invoice) return true;
  if (state.invoice.isTableOrder || isTableOrderType()) return false;
  if (isPickupOrderType()) return false;
  return true;
}

function isDeliveryFeeApplicable() {
  return isAddressRequiredForCurrentInvoice();
}

function getTablesStorageKey() {
  const branchKey = state.branchId || 'unassigned';
  return `cashierTables:${branchKey}`;
}

function loadTableDrafts() {
  const key = getTablesStorageKey();
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    state.tableDrafts = parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    state.tableDrafts = {};
  }
}

function saveTableDrafts() {
  const key = getTablesStorageKey();
  localStorage.setItem(key, JSON.stringify(state.tableDrafts || {}));
}

function isTableInvoiceOpen() {
  return Boolean(state.invoice?.isTableOrder && state.invoice?.tableNumber);
}

function persistOpenTableDraft() {
  if (!isTableInvoiceOpen()) return;
  const tableNumber = String(state.invoice.tableNumber);
  state.tableDrafts[tableNumber] = {
    tableNumber,
    updatedAt: Date.now(),
    cashierId: state.cashierId || null,
    cashierName: state.cashierName || null,
    invoice: JSON.parse(JSON.stringify(state.invoice))
  };
  saveTableDrafts();
  renderTablesSection();
}

function removeTableDraft(tableNumber) {
  const key = String(tableNumber || '');
  if (!key) return;
  delete state.tableDrafts[key];
  saveTableDrafts();
  renderTablesSection();
}

function getBranchTablesConfig() {
  const configuredTables = Object.values(state.tables || {})
    .filter((table) => table && table.active !== false)
    .map((table) => ({
      tableNumber: String(table.tableNumber || table.number || '').trim(),
      branchId: String(table.branchId || '').trim(),
      location: String(table.location || '').trim()
    }))
    .filter((table) => table.tableNumber && table.branchId && table.branchId === String(state.branchId || ''))
    .sort((a, b) => Number(a.tableNumber || 0) - Number(b.tableNumber || 0));
  return configuredTables;
}

function renderInvoiceUI() {
  if (!state.invoice) resetInvoice();
  ensureTableFlowDefaults();
  applyTableInvoiceDefaults();
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
  ensureTableFlowDefaults();
  if (state.invoice?.isTableOrder && step === 'details') {
    step = 'items';
  }
  state.invoice.step = step;
  if (els.invoiceStepItems) els.invoiceStepItems.classList.toggle('hidden', step !== 'items');
  if (els.invoiceStepDetails) els.invoiceStepDetails.classList.toggle('hidden', step !== 'details');
  if (els.invoiceStepCustomer) els.invoiceStepCustomer.classList.toggle('hidden', step !== 'customer');
  if (els.invoiceStepSummary) els.invoiceStepSummary.classList.toggle('hidden', step !== 'summary');
  if (step === 'summary') renderInvoiceSummary();
  persistOpenTableDraft();
}

function openInvoiceOverlay() {
  resetInvoice();
  state.invoice.isTableOrder = false;
  state.invoice.tableNumber = '';
  state.invoice.tableCustomerChoice = 'later';
  state.invoice.customerCapturedFirst = true;
  renderInvoiceUI();
  setInvoiceStep('items');
  if (els.invoiceOverlay) els.invoiceOverlay.classList.remove('hidden');
}

function closeInvoiceOverlay() {
  persistOpenTableDraft();
  if (els.invoiceOverlay) els.invoiceOverlay.classList.add('hidden');
}

function goNextFromItems() {
  if (!state.invoice?.cart?.length) return;
  if (state.invoice.isTableOrder) {
    if (state.invoice.customerId) {
      setInvoiceStep('summary');
      return;
    }
    setInvoiceStep('customer');
    return;
  }
  setInvoiceStep('details');
}

function goNextFromDetails() {
  if (!state.invoice.orderDate) return;
  if (!state.invoice.deliveryTime) return;
  if (!state.invoice.orderTypeId) return;
  if (isPickupOrderType() && !state.invoice.pickupBranchId) return;
  setInvoiceStep('customer');
}

function goBackFromCustomer() {
  if (state.invoice?.isTableOrder) {
    setInvoiceStep('items');
    return;
  }
  setInvoiceStep('details');
}

function goNextFromCustomer() {
  if (!state.invoice?.customerId) return;
  if (state.invoice.isTableOrder && state.invoice.tableCustomerChoice === 'now' && !state.invoice.customerCapturedFirst) {
    state.invoice.customerCapturedFirst = true;
    setInvoiceStep('items');
    return;
  }
  setInvoiceStep('summary');
}

function goBackFromSummary() {
  setInvoiceStep('customer');
}

function getCurrentCategoryId() {
  const path = state.invoice.categoryPath;
  return path.length ? path[path.length - 1] : null;
}

function renderInvoiceCatalog() {
  if (!els.invoiceCategoryList || !els.invoiceProductList) return;
  const rawQuery = state.invoice.search.trim();
  const query = normalizeSearchValue(rawQuery);
  const nameQuery = rawQuery.toLowerCase();
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
        const code = normalizeSearchValue(item.code || '');
        const barcode = normalizeSearchValue(item.barcode || '');
        return name.includes(nameQuery) || code.includes(query) || barcode.includes(query);
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
      card.addEventListener('click', () => openInvoiceQtyFlow({ id, item }, { fromScan: false }));
      els.invoiceProductList.appendChild(card);
    });
  }
}

function handleInvoiceBarcodeScan(value) {
  const query = (value ?? els.invoiceSearchInput?.value ?? '').trim();
  if (!query) return;
  const match = findExactProductMatch(query);
  if (match) {
    openInvoiceQtyFlow(match, { fromScan: true, scanValue: query });
    if (els.invoiceSearchInput) els.invoiceSearchInput.value = '';
    state.invoice.search = '';
    renderInvoiceCatalog();
  }
}

function findExactProductMatch(query, options = {}) {
  const q = normalizeSearchValue(query);
  const entries = Object.entries(state.products).map(([id, item]) => ({ id, item }));
  const exact = entries.filter(({ item }) => {
    const code = normalizeSearchValue(item.code || '');
    const barcode = normalizeSearchValue(item.barcode || '');
    return (code && code === q) || (barcode && barcode === q);
  });
  if (exact.length === 1) return exact[0];
  const batchMatch = findProductionBatchByBarcode(query);
  if (!batchMatch) return null;
  const product = state.products?.[batchMatch.itemId];
  if (!product) return null;
  if (options.ignoreProductionBarcode || options.productionBarcodeAsGeneric) {
    return { id: batchMatch.itemId, item: product };
  }
  return {
    id: batchMatch.itemId,
    item: product,
    productionRecord: batchMatch
  };
}

function findProductionBatchByBarcode(value) {
  const q = normalizeSearchValue(value);
  if (!q) return null;
  const matches = Object.entries(state.production || {})
    .map(([id, record]) => ({ id, ...record }))
    .filter((record) => normalizeSearchValue(record.productionBarcode || '') === q);
  if (matches.length !== 1) return null;
  return matches[0];
}

function isProductionRecordActive(record) {
  if (!record) return false;
  if ((record.itemType || 'product') !== 'product') return false;
  const expiry = String(record.expiryDate || '').trim();
  if (!expiry) return true;
  const expiryDate = new Date(`${expiry}T23:59:59`);
  if (Number.isNaN(expiryDate.getTime())) return true;
  return expiryDate.getTime() >= Date.now();
}

function getProductProductionBatches(productId) {
  return Object.entries(state.production || {})
    .map(([id, record]) => ({ id, ...record }))
    .filter((record) => String(record.itemId || '') === String(productId || ''))
    .filter((record) => isProductionRecordActive(record))
    .sort((a, b) => {
      const ad = new Date(`${a.productionDate || '1970-01-01'}T00:00:00`).getTime() || Number(a.createdAt || 0);
      const bd = new Date(`${b.productionDate || '1970-01-01'}T00:00:00`).getTime() || Number(b.createdAt || 0);
      return bd - ad;
    });
}

function attachProductionToEntry(entry, record) {
  if (!record) return { ...entry, productionRecord: null };
  return {
    ...entry,
    productionRecord: {
      id: record.id,
      productionNumber: record.productionNumber || null,
      productionDate: record.productionDate || null,
      expiryDate: record.expiryDate || null,
      productionBarcode: record.productionBarcode || null
    }
  };
}

function chooseProductionBatchForEntry(entry, records) {
  return new Promise((resolve) => {
    const old = document.getElementById('cashierProductionBatchOverlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'cashierProductionBatchOverlay';
    overlay.innerHTML = `
      <div class="modal card" style="max-width: 540px; text-align: start;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('production_dates')}</h3>
          <button class="btn ghost small" data-action="close">×</button>
        </div>
        <div class="helper">${window.i18n.t('product_single')}: ${entry?.item ? getLocalizedName(entry.item) : '-'}</div>
        <div style="display:grid; gap:8px; max-height: 320px; overflow:auto; margin-top: 10px;">
          ${records.map((record) => `
            <button class="btn ghost" data-batch-id="${record.id}" style="justify-content: space-between; text-align: start;">
              <span>${window.i18n.t('production_date')}: ${record.productionDate || '-'}</span>
              <span class="helper">${record.productionNumber || '-'}</span>
            </button>
          `).join('')}
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 10px;">
          <button class="btn ghost" data-action="cancel">${window.i18n.t('cancel')}</button>
        </div>
      </div>
    `;
    const done = (value) => {
      overlay.remove();
      resolve(value || null);
    };
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', () => done(null));
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => done(null));
    overlay.querySelectorAll('[data-batch-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-batch-id') || '';
        const record = records.find((r) => String(r.id) === String(id));
        done(record || null);
      });
    });
    document.body.appendChild(overlay);
  });
}

function resolveInvoiceEntryProduction(entry, { fromScan = false } = {}) {
  if (!entry?.id) return Promise.resolve(null);
  if (entry.productionRecord?.id) {
    return Promise.resolve(attachProductionToEntry(entry, entry.productionRecord));
  }
  const batches = getProductProductionBatches(entry.id);
  if (!batches.length) return Promise.resolve(attachProductionToEntry(entry, null));
  if (batches.length === 1) return Promise.resolve(attachProductionToEntry(entry, batches[0]));
  if (fromScan) {
    return chooseProductionBatchForEntry(entry, batches).then((selected) => {
      return selected ? attachProductionToEntry(entry, selected) : null;
    });
  }
  return chooseProductionBatchForEntry(entry, batches).then((selected) => {
    return selected ? attachProductionToEntry(entry, selected) : null;
  });
}

function openInvoiceQtyFlow(entry, options = {}) {
  resolveInvoiceEntryProduction(entry, options).then((resolvedEntry) => {
    if (!resolvedEntry) return;
    openQtyModal({
      title: getLocalizedName(resolvedEntry.item),
      available: getMainBranchStock(resolvedEntry.item),
      onConfirm: (qty) => addInvoiceItem(resolvedEntry, qty)
    });
  });
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
  const productionId = entry.productionRecord?.id || null;
  const productionDate = entry.productionRecord?.productionDate || null;
  const productionNumber = entry.productionRecord?.productionNumber || null;
  const existing = state.invoice.cart.find((item) => (
    item.productId === entry.id
    && String(item.productionId || '') === String(productionId || '')
  ));
  const price = Number(entry.item.price || 0);
  const nameAr = entry.item.nameAr || entry.item.name || '';
  const nameEn = entry.item.nameEn || '';
  const displayName = getLocalizedName(entry.item);
  if (existing) {
    existing.qty += qty;
    if (!existing.nameAr && nameAr) existing.nameAr = nameAr;
    if (!existing.nameEn && nameEn) existing.nameEn = nameEn;
  } else {
    state.invoice.cart.push({
      productId: entry.id,
      name: displayName,
      nameAr,
      nameEn,
      price,
      qty,
      note: '',
      productionId,
      productionDate,
      productionNumber
    });
  }
  renderInvoiceCart();
  renderInvoiceSummary();
  persistOpenTableDraft();
}

function getInvoiceReferenceDate() {
  const orderDate = state.invoice?.orderDate;
  if (orderDate) {
    const parsed = new Date(`${orderDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isDateWithinRange(targetDate, startDate, endDate) {
  if (!targetDate) return false;
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return false;
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (target.getTime() < start.getTime()) return false;
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (target.getTime() > end.getTime()) return false;
  }
  return true;
}

function getCategoryChain(categoryId) {
  const chain = [];
  const categories = state.categories || {};
  let current = categoryId;
  const visited = new Set();
  while (current && categories[current] && !visited.has(current)) {
    chain.push(current);
    visited.add(current);
    current = categories[current].parentId || '';
  }
  return chain;
}

function doesProductMatchDiscount(product, discount) {
  if (!product || !discount) return false;
  const targetType = discount.targetType || (discount.categoryId ? 'category' : 'product');
  if (targetType === 'product') {
    return String(discount.productId || '') === String(product.id || product.productId || '');
  }
  if (targetType === 'category') {
    const targetCategory = discount.categoryId || discount.subCategoryId || discount.mainCategoryId || '';
    if (!targetCategory) return false;
    const chain = getCategoryChain(product.categoryId || '');
    return chain.includes(targetCategory);
  }
  return false;
}

function isBeforeExpiryDiscountActive(productId, discount, refDate) {
  const days = Number(discount.daysBeforeExpiry || 0);
  if (!days || days < 0) return false;
  const targetTime = refDate.getTime();
  const maxWindow = days * 24 * 60 * 60 * 1000;
  return Object.values(state.production || {}).some((record) => {
    if ((record.itemType || 'product') !== 'product') return false;
    if (String(record.itemId || '') !== String(productId || '')) return false;
    if (!record.expiryDate) return false;
    const expiry = new Date(`${record.expiryDate}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return false;
    const diff = expiry.getTime() - targetTime;
    return diff >= 0 && diff <= maxWindow;
  });
}

function getBestAutoDiscountForCartItem(cartItem) {
  const product = state.products?.[cartItem.productId];
  const basePrice = Number(cartItem.price || 0);
  if (!product) {
    return {
      unitPrice: basePrice,
      originalPrice: basePrice,
      autoDiscountPerUnit: 0,
      discountId: null
    };
  }
  const refDate = getInvoiceReferenceDate();
  let bestPrice = basePrice;
  let bestDiscountId = null;
  Object.entries(state.discounts || {}).forEach(([discountId, discount]) => {
    if (!discount || discount.active === false || discount.type !== 'product') return;
    if (!isDateWithinRange(refDate, discount.startDate, discount.endDate)) return;
    if (!doesProductMatchDiscount({ ...product, id: cartItem.productId }, discount)) return;
    const applyTiming = discount.applyTiming || (discount.daysBeforeExpiry ? 'before_expiry' : 'start_date');
    if (applyTiming === 'before_expiry' && !isBeforeExpiryDiscountActive(cartItem.productId, discount, refDate)) {
      return;
    }
    const valueType = discount.valueType || 'amount';
    const value = Number(discount.value || 0);
    if (!value || value <= 0) return;
    let candidate = basePrice;
    if (valueType === 'percent') {
      candidate = basePrice - ((basePrice * value) / 100);
    } else {
      candidate = basePrice - value;
    }
    if (candidate < 0) candidate = 0;
    if (candidate < bestPrice) {
      bestPrice = candidate;
      bestDiscountId = discountId;
    }
  });
  return {
    unitPrice: bestPrice,
    originalPrice: basePrice,
    autoDiscountPerUnit: Math.max(basePrice - bestPrice, 0),
    discountId: bestDiscountId
  };
}

function getPricedCartItems() {
  return (state.invoice?.cart || []).map((item) => {
    const discountInfo = getBestAutoDiscountForCartItem(item);
    const qty = Number(item.qty || 0);
    const unitPrice = Number(discountInfo.unitPrice || item.price || 0);
    const lineTotal = unitPrice * qty;
    return {
      ...item,
      price: unitPrice,
      originalPrice: discountInfo.originalPrice,
      autoDiscountPerUnit: discountInfo.autoDiscountPerUnit,
      discountId: discountInfo.discountId || null,
      lineTotal
    };
  });
}

function renderInvoiceCart() {
  if (!els.invoiceCartList) return;
  els.invoiceCartList.innerHTML = '';
  if (state.invoice.cart.length === 0) {
    els.invoiceCartList.innerHTML = '';
    if (els.invoiceNextToDetails) els.invoiceNextToDetails.disabled = true;
    return;
  }
  const pricedItems = getPricedCartItems();
  state.invoice.cart.forEach((item, index) => {
    const priced = pricedItems[index] || item;
    const hasAutoDiscount = Number(priced.autoDiscountPerUnit || 0) > 0.0001;
    const priceHtml = hasAutoDiscount
      ? `${window.i18n.t('price')}: <span style="text-decoration: line-through; opacity:0.75;">${formatCurrency(priced.originalPrice)}</span> <strong>${formatCurrency(priced.price)}</strong>`
      : `${window.i18n.t('price')}: ${formatCurrency(priced.price)}`;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div style="flex:1;">
        <strong>${item.name}</strong>
        ${item.productionDate ? `<div class="helper">${window.i18n.t('production_date')}: ${item.productionDate}</div>` : ''}
        <div class="helper">${priceHtml}</div>
        <input class="input" style="margin-top:6px;" placeholder="${window.i18n.t('note')}" value="${item.note || ''}" />
      </div>
      <div class="row" style="gap: 6px;">
        <button class="btn ghost small" data-action="qty">${formatNumber(item.qty)}</button>
        <button class="btn danger small" data-action="remove">×</button>
      </div>
    `;
    const qtyBtn = row.querySelector('[data-action="qty"]');
    qtyBtn.addEventListener('click', () => openQtyModal({
      title: item.name,
      available: null,
      onConfirm: (qty) => {
        state.invoice.cart[index].qty = qty;
        renderInvoiceCart();
        renderInvoiceSummary();
        persistOpenTableDraft();
      }
    }));
    const removeBtn = row.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        state.invoice.cart.splice(index, 1);
        renderInvoiceCart();
        renderInvoiceSummary();
        persistOpenTableDraft();
      });
    }
    const noteInput = row.querySelector('input');
    noteInput.addEventListener('input', (e) => {
      state.invoice.cart[index].note = e.target.value;
      persistOpenTableDraft();
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
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('choose_delivery_time');
  els.invoiceDeliveryTime.appendChild(placeholder);
  for (let h = startHour; h < endHour; h += 1) {
    const label = formatTimeSlot(h, h + 1, lang);
    const value = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    els.invoiceDeliveryTime.appendChild(option);
  }
  if (state.invoice.deliveryTime) {
    els.invoiceDeliveryTime.value = state.invoice.deliveryTime;
  } else {
    els.invoiceDeliveryTime.value = '';
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
  applyTableInvoiceDefaults();
  if (els.invoiceOrderType) {
    renderSelect(els.invoiceOrderType, state.orderTypes, window.i18n.t('choose_order_type'));
    if (state.invoice.orderTypeId) {
      els.invoiceOrderType.value = state.invoice.orderTypeId;
    } else {
      els.invoiceOrderType.value = '';
    }
  }
  renderPickupBranchSelector();
  if (els.invoicePaymentMethod) {
    renderSelect(els.invoicePaymentMethod, state.paymentMethods, window.i18n.t('choose_payment_method'));
    els.invoicePaymentMethod.value = state.invoice.paymentMethodId || '';
  }
  if (els.invoiceSummaryPaymentMethod) {
    renderSelect(els.invoiceSummaryPaymentMethod, state.paymentMethods, window.i18n.t('choose_payment_method'));
    if (state.invoice.paymentMethodId) {
      els.invoiceSummaryPaymentMethod.value = state.invoice.paymentMethodId;
      if (els.invoicePaymentMethod) {
        els.invoicePaymentMethod.value = state.invoice.paymentMethodId;
      }
    } else {
      els.invoiceSummaryPaymentMethod.value = '';
      if (els.invoicePaymentMethod) els.invoicePaymentMethod.value = '';
    }
  }
  syncSummaryPaymentMethod();
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

function syncSummaryPaymentMethod() {
  if (!els.invoiceSummaryPaymentRow || !els.invoiceSummaryPaymentMethod) return;
  els.invoiceSummaryPaymentRow.classList.remove('hidden');
  renderSelect(els.invoiceSummaryPaymentMethod, state.paymentMethods, window.i18n.t('choose_payment_method'));
  if (state.invoice?.paymentMethodId) {
    els.invoiceSummaryPaymentMethod.value = state.invoice.paymentMethodId;
  } else {
    els.invoiceSummaryPaymentMethod.value = '';
  }
}

function renderPickupBranchSelector() {
  const row = els.invoicePickupBranchRow;
  const select = els.invoicePickupBranchSelect;
  if (!row || !select) return;
  const pickupMode = isPickupOrderType();
  row.classList.toggle('hidden', !pickupMode);
  if (!pickupMode) {
    state.invoice.pickupBranchId = '';
    select.innerHTML = '';
    return;
  }
  renderSelect(select, state.branches || {}, window.i18n.t('choose_branch'));
  if (state.invoice.pickupBranchId) {
    select.value = state.invoice.pickupBranchId;
  } else {
    state.invoice.pickupBranchId = '';
    select.value = '';
  }
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
    const level = customer.level || 'regular';
    const levelLabel = level === 'vvip'
      ? window.i18n.t('level_vvip')
      : level === 'vip'
        ? window.i18n.t('level_vip')
        : window.i18n.t('level_regular');
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <span>
          ${getLocalizedName(customer)}
          <span class="customer-level-badge ${level}">${levelLabel}</span>
        </span>
        <span class="helper">${customer.phone || '-'}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      state.invoice.customerId = id;
      state.invoice.addressId = '';
      renderSelectedCustomerPanel();
      renderInvoiceSummary();
      persistOpenTableDraft();
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
  const addressRequired = isAddressRequiredForCurrentInvoice();
  const addresses = getCustomerAddresses(customer);
  let selectedAddress = null;
  if (addressRequired) {
    selectedAddress = addresses.find((addr) => addr.id === state.invoice.addressId);
    if (!selectedAddress && addresses.length) {
      selectedAddress = addresses[0];
      state.invoice.addressId = selectedAddress.id;
    }
  } else {
    state.invoice.addressId = '';
  }
  const addressHtml = addressRequired
    ? addresses.map((addr) => {
      const zone = getZoneLabel(addr.zoneId);
      const isSelected = String(addr.id || '') === String(selectedAddress?.id || '');
      return `
        <div class="notice" style="margin-top:6px; ${isSelected ? 'border-color: rgba(31,138,68,0.45); background: rgba(31,138,68,0.07);' : ''}">
          <div class="row" style="justify-content: space-between;">
            <div>
              <div>${zone || '-'} ${isSelected ? '<strong style="color:#1f8a44;">✓</strong>' : ''}</div>
              <div class="helper">${addr.details || '-'}</div>
            </div>
            <div class="row" style="gap:6px;">
              <button class="btn ghost small" data-action="select" data-id="${addr.id}">${isSelected ? window.i18n.t('selected') : window.i18n.t('select')}</button>
              <button class="btn ghost small" data-action="edit" data-id="${addr.id}">${window.i18n.t('edit')}</button>
              <button class="btn danger small" data-action="delete" data-id="${addr.id}">${window.i18n.t('delete')}</button>
            </div>
          </div>
        </div>
      `;
    }).join('')
    : '';
  const actionsHtml = addressRequired
    ? `
      <button class="btn ghost small" data-action="edit-customer">${window.i18n.t('edit')}</button>
      <button class="btn ghost small" data-action="add-address">${window.i18n.t('add_address')}</button>
    `
    : `
      <button class="btn ghost small" data-action="edit-customer">${window.i18n.t('edit')}</button>
    `;

  els.selectedCustomerPanel.innerHTML = `
    <div>
      <strong>${getLocalizedName(customer)}</strong>
      <span class="customer-level-badge ${customer.level || 'regular'}" style="margin-inline-start: 6px;">
        ${customer.level === 'vvip'
          ? window.i18n.t('level_vvip')
          : customer.level === 'vip'
            ? window.i18n.t('level_vip')
            : window.i18n.t('level_regular')}
      </span>
      <div class="helper">${customer.phone || '-'}</div>
    </div>
    ${addressRequired && selectedAddress ? `
      <div style="margin-top:8px;">
        <div>${window.i18n.t('delivery_zone')}: ${getZoneLabel(selectedAddress.zoneId)}</div>
        <div class="helper">${selectedAddress.details || '-'}</div>
      </div>
    ` : ''}
    <div class="row" style="gap:6px; margin-top:8px;">
      ${actionsHtml}
    </div>
    <div style="margin-top:8px;">${addressHtml || ''}</div>
  `;

  if (addressRequired) {
    const selectButtons = els.selectedCustomerPanel.querySelectorAll('[data-action="select"]');
    selectButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.invoice.addressId = btn.dataset.id;
        renderSelectedCustomerPanel();
        renderInvoiceSummary();
        persistOpenTableDraft();
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
  }

  const editCustomerBtn = els.selectedCustomerPanel.querySelector('[data-action="edit-customer"]');
  if (editCustomerBtn) {
    editCustomerBtn.addEventListener('click', () => openCustomerModal('edit', state.invoice.customerId, state.invoice.addressId));
  }
  const addAddressBtn = els.selectedCustomerPanel.querySelector('[data-action="add-address"]');
  if (addAddressBtn && addressRequired) {
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
  customerModalState.basicOnly = !isAddressRequiredForCurrentInvoice();
  if (els.customerModalError) els.customerModalError.textContent = '';

  if (els.customerNameInput) els.customerNameInput.value = '';
  if (els.customerPhoneInput) els.customerPhoneInput.value = '';
  if (els.customerAddressInput) els.customerAddressInput.value = '';
  if (els.customerZoneInput) els.customerZoneInput.value = '';
  if (els.customerZonePickerSearch) els.customerZonePickerSearch.value = '';
  if (els.customerNameOnlyToggle) els.customerNameOnlyToggle.checked = false;
  if (els.customerNameOnlyToggle) els.customerNameOnlyToggle.disabled = customerModalState.basicOnly;

  const customer = customerId ? state.customers[customerId] : null;
  if (customer) {
    if (els.customerNameInput) els.customerNameInput.value = getLocalizedName(customer) || '';
    if (els.customerPhoneInput) els.customerPhoneInput.value = customer.phone || '';
    const addresses = getCustomerAddresses(customer);
    const address = addresses.find((addr) => addr.id === addressId) || addresses[0];
    if (address) {
      if (els.customerAddressInput) els.customerAddressInput.value = address.details || '';
      if (els.customerZoneInput) els.customerZoneInput.value = address.zoneId || '';
    }
  }

  if (customerModalState.basicOnly && els.customerNameOnlyToggle) {
    els.customerNameOnlyToggle.checked = true;
  }

  toggleCustomerAddressFields();
  renderZoneOptions();
  if (els.customerModal) els.customerModal.classList.remove('hidden');
}

function closeCustomerModal() {
  customerModalState.basicOnly = false;
  if (els.customerModal) els.customerModal.classList.add('hidden');
}

function toggleCustomerAddressFields() {
  const hide = els.customerNameOnlyToggle?.checked;
  if (els.customerAddressFields) {
    els.customerAddressFields.classList.toggle('hidden', hide);
  }
}

function renderZoneOptions() {
  if (!els.customerZonePickerOptions || !els.customerZonePickerSummary || !els.customerZoneInput) return;
  const query = normalizeSearchValue(els.customerZonePickerSearch?.value || '');
  const selectedZoneId = String(els.customerZoneInput.value || '');
  const zones = state.deliveryZones || {};
  const selectedZone = zones[selectedZoneId];
  if (selectedZone) {
    const fee = getDeliveryFee(selectedZoneId);
    els.customerZonePickerSummary.textContent = fee > 0
      ? `${getLocalizedName(selectedZone)} (${formatCurrency(fee)})`
      : getLocalizedName(selectedZone);
  } else {
    els.customerZonePickerSummary.textContent = window.i18n.t('select_zone');
  }

  const entries = Object.entries(zones)
    .map(([id, zone]) => ({ id, zone }))
    .filter(({ zone }) => !query || normalizeSearchValue(getLocalizedName(zone)).includes(query))
    .sort((a, b) => getLocalizedName(a.zone).localeCompare(getLocalizedName(b.zone)));

  els.customerZonePickerOptions.innerHTML = '';
  if (!entries.length) {
    els.customerZonePickerOptions.innerHTML = `<div class="helper">${window.i18n.t('no_data')}</div>`;
    return;
  }

  entries.forEach(({ id, zone }) => {
    const fee = getDeliveryFee(id);
    const label = document.createElement('label');
    label.className = 'multi-select-option';
    label.innerHTML = `
      <input type="radio" name="customerZoneOption" value="${id}" ${String(id) === selectedZoneId ? 'checked' : ''} />
      <span>${fee > 0 ? `${getLocalizedName(zone)} (${formatCurrency(fee)})` : getLocalizedName(zone)}</span>
    `;
    label.querySelector('input')?.addEventListener('change', () => {
      if (els.customerZoneInput) els.customerZoneInput.value = id;
      renderZoneOptions();
      if (els.customerZonePicker) els.customerZonePicker.open = false;
    });
    els.customerZonePickerOptions.appendChild(label);
  });
}

function saveCustomerModal() {
  const name = els.customerNameInput?.value.trim() || '';
  const phone = els.customerPhoneInput?.value.trim() || '';
  const nameOnly = Boolean(els.customerNameOnlyToggle?.checked);
  const basicOnly = Boolean(customerModalState.basicOnly);
  const useNameOnly = nameOnly || basicOnly;
  const zoneId = els.customerZoneInput?.value || '';
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
    const addresses = useNameOnly ? [] : [{ id: generateId(), zoneId, details: addressDetails }];
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
  if (!useNameOnly && (zoneId || addressDetails)) {
    if (customerModalState.mode === 'address') {
      addresses.push({ id: generateId(), zoneId, details: addressDetails });
    } else {
      const targetId = customerModalState.addressId || (addresses[0] && addresses[0].id);
      addresses = addresses.map((addr) => (addr.id === targetId ? { ...addr, zoneId, details: addressDetails } : addr));
    }
  }
  if (nameOnly && !basicOnly) {
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
    renderInvoiceSummary();
    persistOpenTableDraft();
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
  const pricedItems = getPricedCartItems();
  const subtotalOriginal = pricedItems.reduce((sum, item) => sum + Number(item.originalPrice || item.price || 0) * Number(item.qty || 0), 0);
  const subtotal = pricedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const autoDiscount = Math.max(subtotalOriginal - subtotal, 0);
  let deliveryFee = 0;
  if (isDeliveryFeeApplicable()) {
    const selectedCustomer = state.invoice.customerId ? state.customers[state.invoice.customerId] : null;
    const addresses = selectedCustomer ? getCustomerAddresses(selectedCustomer) : [];
    const address = addresses.find((addr) => addr.id === state.invoice.addressId);
    deliveryFee = address ? getDeliveryFee(address.zoneId) : 0;
  }
  let manualDiscount = 0;
  if (state.invoice.manualDiscount) {
    const { type, value } = state.invoice.manualDiscount;
    if (type === 'percent') {
      manualDiscount = subtotal * (Number(value || 0) / 100);
    } else {
      manualDiscount = Number(value || 0);
    }
    if (manualDiscount > subtotal) manualDiscount = subtotal;
  }
  const netTotal = subtotal - manualDiscount;
  const discountTotal = autoDiscount + manualDiscount;
  const total = netTotal + deliveryFee;
  return {
    subtotal,
    subtotalOriginal,
    autoDiscount,
    manualDiscount,
    discount: discountTotal,
    netTotal,
    deliveryFee,
    total
  };
}

function renderInvoiceSummary() {
  syncSummaryPaymentMethod();
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
  const managerDiscountConfig = state.discounts?.managerDiscount;
  if (managerDiscountConfig && managerDiscountConfig.active === false) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('inactive');
    return;
  }
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
  const managerDiscountConfig = state.discounts?.managerDiscount;
  if (managerDiscountConfig && managerDiscountConfig.active === false) {
    if (els.managerDiscountError) els.managerDiscountError.textContent = window.i18n.t('inactive');
    return;
  }
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
  persistOpenTableDraft();
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
  if (isPickupOrderType() && !state.invoice.pickupBranchId) {
    if (els.invoiceSummaryMessage) els.invoiceSummaryMessage.textContent = window.i18n.t('select_branch');
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
  const pricedItems = getPricedCartItems();
  const orderItems = pricedItems.map((item) => ({
    productId: item.productId,
    name: item.name,
    nameAr: item.nameAr || item.name || '',
    nameEn: item.nameEn || '',
    productionId: item.productionId || null,
    productionDate: item.productionDate || null,
    productionNumber: item.productionNumber || null,
    price: Number(item.price || 0),
    qty: Number(item.qty || 0),
    note: item.note || '',
    originalPrice: Number(item.originalPrice || item.price || 0),
    autoDiscountPerUnit: Number(item.autoDiscountPerUnit || 0),
    discountId: item.discountId || null
  }));
  const completedTableNumber = state.invoice.isTableOrder ? String(state.invoice.tableNumber || '') : '';
  generateOrderNumber().then((orderNumber) => {
    const customer = state.customers[state.invoice.customerId];
    const addresses = getCustomerAddresses(customer);
    const selectedAddress = addresses.find((addr) => addr.id === state.invoice.addressId) || addresses[0] || null;
    const address = isAddressRequiredForCurrentInvoice() ? selectedAddress : null;
    const pickupBranch = state.branches?.[state.invoice.pickupBranchId] || null;
    const createdAt = Date.now();
    const tableOpenedAt = state.invoice.isTableOrder
      ? Number(state.invoice.tableOpenedAt || createdAt)
      : null;

    const orderData = {
      orderNumber,
      createdAt,
      orderDate: state.invoice.orderDate,
      deliveryTime: state.invoice.deliveryTime,
      items: orderItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      discountType: state.invoice.manualDiscount?.type || null,
      netTotal: totals.netTotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      autoDiscount: totals.autoDiscount,
      manualDiscountAmount: totals.manualDiscount,
      orderTypeId: state.invoice.orderTypeId,
      paymentMethodId: state.invoice.paymentMethodId,
      customerId: state.invoice.customerId,
      customerName: getLocalizedName(customer),
      customerPhone: customer?.phone || null,
      deliveryZoneId: address?.zoneId || null,
      deliveryAddress: address?.details || null,
      pickupBranchId: isPickupOrderType() ? (state.invoice.pickupBranchId || null) : null,
      pickupBranchName: isPickupOrderType() ? (getLocalizedName(pickupBranch) || null) : null,
      cashierId: state.cashierId,
      cashierName: state.cashierName || null,
      branchId: state.branchId,
      branchName: state.branchName,
      deviceId: state.deviceId,
      tableNumber: completedTableNumber || null,
      tableOpenedAt,
      tableClosedAt: completedTableNumber ? createdAt : null,
      status: 'paid',
      managerDiscount: state.invoice.manualDiscount || null
    };

    const orderRef = db.ref('orders').push();
    orderRef.set(orderData).then(() => {
      const stockBranchId = getMainBranchId() || state.branchId;
      const stockUpdates = stockBranchId
        ? orderItems
          .filter((item) => item.productId && Number(item.qty || 0) > 0)
          .map((item) => updateItemStock('product', item.productId, stockBranchId, -Number(item.qty || 0)))
        : [];
      const usageUpdates = {};
      const uniqueDiscountIds = Array.from(new Set(orderItems.map((item) => item.discountId).filter(Boolean)));
      uniqueDiscountIds.forEach((discountId) => {
        usageUpdates[`discountUsage/${discountId}/${orderRef.key}`] = {
          orderId: orderRef.key,
          orderNumber,
          createdAt: Date.now(),
          cashierId: state.cashierId,
          branchId: state.branchId
        };
      });
      const finalize = () => {
        printThermalReceipt(orderData);
        if (completedTableNumber) {
          removeTableDraft(completedTableNumber);
        }
        resetInvoice();
        closeInvoiceOverlay();
        renderOrdersTable();
      };
      if (Object.keys(usageUpdates).length) {
        Promise.all([
          stockUpdates.length ? Promise.all(stockUpdates) : Promise.resolve(),
          db.ref().update(usageUpdates)
        ]).then(finalize).catch(finalize);
      } else {
        (stockUpdates.length ? Promise.all(stockUpdates) : Promise.resolve()).then(finalize).catch(finalize);
      }
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
  const query = normalizeSearchValue(state.ordersSearch || '');
  const orders = Object.entries(state.orders || {})
    .map(([id, order]) => ({ id, ...order }))
    .filter((order) => !state.branchId || order.branchId === state.branchId)
    .filter((order) => {
      if (!query) return true;
      const haystack = normalizeSearchValue(`${order.orderNumber || ''} ${order.customerName || ''} ${order.customerPhone || ''}`);
      return haystack.includes(query);
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  els.ordersTable.innerHTML = '';
  if (!orders.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    els.ordersTable.appendChild(row);
    return;
  }

  orders.forEach((order) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.orderNumber || '-'}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${order.customerName || '-'}</td>
      <td>${order.customerPhone || '-'}</td>
      <td>${order.cashierName || '-'}</td>
      <td>${formatCurrency(order.total || 0)}</td>
      <td>
        <div class="row" style="gap:6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print')}</button>
        </div>
      </td>
    `;
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

const TRANSFER_GROUPS = [
  { key: 'sweets', titleKey: 'transfer_group_sweets' },
  { key: 'tableware', titleKey: 'transfer_group_tableware' },
  { key: 'supplies', titleKey: 'transfer_group_supplies' },
  { key: 'other', titleKey: 'transfer_group_other' }
];

function normalizeTransferGroupKey(value) {
  const key = String(value || '').trim().toLowerCase();
  if (TRANSFER_GROUPS.some((group) => group.key === key)) return key;
  return '';
}

function getTransferGroupLabel(value) {
  const key = normalizeTransferGroupKey(value);
  const found = TRANSFER_GROUPS.find((group) => group.key === key);
  return found ? window.i18n.t(found.titleKey) : '-';
}

function getTransferDropListElement(groupKey) {
  const key = normalizeTransferGroupKey(groupKey);
  if (!key) return els.transferRequestItemsList;
  if (key === 'sweets') return els.transferRequestGroupSweets;
  if (key === 'tableware') return els.transferRequestGroupTableware;
  if (key === 'supplies') return els.transferRequestGroupSupplies;
  if (key === 'other') return els.transferRequestGroupOther;
  return els.transferRequestItemsList;
}

function resetTransferRequestDraft() {
  state.transferRequestDraft = {
    items: []
  };
  state.transferRequestDragIndex = null;
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
  state.transferRequestDragIndex = null;
}

function renderTransferRequestModal() {
  if (els.transferRequestCashier) els.transferRequestCashier.value = state.cashierName || '-';
  if (els.transferRequestBranch) els.transferRequestBranch.value = state.branchName || '-';
  if (els.transferRequestError) els.transferRequestError.textContent = '';
  renderTransferRequestSearchResults();
  renderTransferRequestItems();
}

function getTransferRequestEntries() {
  const products = Object.entries(state.products || {}).map(([id, item]) => ({ id, item, type: 'product' }));
  const materials = Object.entries(state.stockMaterials || {}).map(([id, item]) => ({ id, item, type: 'material' }));
  return [...products, ...materials];
}

function filterTransferRequestEntries(entries, query) {
  const q = normalizeSearchValue(query);
  const nameQuery = String(query || '').toLowerCase();
  return entries.filter(({ item }) => {
    const name = `${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''}`.toLowerCase();
    const code = normalizeSearchValue(item.code || '');
    const barcode = normalizeSearchValue(item.barcode || '');
    return name.includes(nameQuery) || code.includes(q) || barcode.includes(q);
  });
}

function findExactTransferRequestMatch(query) {
  const q = normalizeSearchValue(query);
  const entries = getTransferRequestEntries();
  const exact = entries.filter((entry) => {
    const code = normalizeSearchValue(entry.item?.code || '');
    const barcode = normalizeSearchValue(entry.item?.barcode || '');
    return (code && code === q) || (barcode && barcode === q);
  });
  if (exact.length === 1) return exact[0];
  const productionMatch = findProductionBatchByBarcode(query);
  if (productionMatch) {
    const entry = entries.find((item) => item.type === 'product' && String(item.id) === String(productionMatch.itemId || ''));
    if (entry) return entry;
  }
  return null;
}

function handleTransferRequestBarcodeScan() {
  const query = els.transferRequestSearchInput?.value.trim();
  if (!query) return;
  const match = findExactTransferRequestMatch(query);
  if (match) {
    openTransferRequestQtyModal(match);
    if (els.transferRequestSearchInput) els.transferRequestSearchInput.value = '';
    renderTransferRequestSearchResults();
  } else {
    renderTransferRequestSearchResults();
  }
}

function handleTransferRequestBarcodeScanValue(value) {
  const query = String(value || '').trim();
  if (!query) return;
  const match = findExactTransferRequestMatch(query);
  if (match) {
    openTransferRequestQtyModal(match);
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
  const exact = findExactTransferRequestMatch(query);
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
    const typeLabel = entry.type === 'material' ? window.i18n.t('stock_materials') : window.i18n.t('products');
    card.innerHTML = `
      <strong>${getLocalizedName(entry.item)}</strong>
      <div class="helper">${typeLabel}</div>
      <div class="helper">${window.i18n.t('available_stock')}: ${formatNumber(getMainBranchStock(entry.item))}</div>
    `;
    card.addEventListener('click', () => openTransferRequestQtyModal(entry));
    results.appendChild(card);
  });
}

function openTransferRequestQtyModal(entry) {
  const existing = state.transferRequestDraft.items.find((item) => item.itemId === entry.id && item.itemType === (entry.type || 'product'));
  const availableBase = getMainBranchStock(entry.item);
  const available = Math.max(Number(availableBase || 0) - Number(existing?.qty || 0), 0);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    onConfirm: (qty) => addTransferRequestItem(entry, qty)
  });
}

function addTransferRequestItem(entry, qty) {
  const itemType = entry.type || 'product';
  const existing = state.transferRequestDraft.items.find((item) => item.itemId === entry.id && item.itemType === itemType);
  const nameAr = entry.item?.nameAr || entry.item?.name || '';
  const nameEn = entry.item?.nameEn || '';
  if (existing) {
    existing.qty += qty;
    if (!existing.nameAr && nameAr) existing.nameAr = nameAr;
    if (!existing.nameEn && nameEn) existing.nameEn = nameEn;
  } else {
    state.transferRequestDraft.items.push({
      itemId: entry.id,
      itemType,
      name: getLocalizedName(entry.item),
      nameAr,
      nameEn,
      qty,
      unitId: entry.item.unitId || null,
      groupKey: ''
    });
  }
  renderTransferRequestItems();
}

function renderTransferRequestItems() {
  if (!els.transferRequestItemsList) return;
  const targets = [
    els.transferRequestItemsList,
    els.transferRequestGroupSweets,
    els.transferRequestGroupTableware,
    els.transferRequestGroupSupplies,
    els.transferRequestGroupOther
  ];
  targets.forEach((node) => {
    if (node) node.innerHTML = '';
  });
  if (!state.transferRequestDraft?.items?.length) {
    if (els.transferRequestItemsList) {
      els.transferRequestItemsList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    }
    if (els.transferRequestUnassignedCount) els.transferRequestUnassignedCount.textContent = '0';
    return;
  }
  let unassignedCount = 0;
  state.transferRequestDraft.items.forEach((item, index) => {
    const groupKey = normalizeTransferGroupKey(item.groupKey);
    if (!groupKey) unassignedCount += 1;
    const card = document.createElement('div');
    card.className = 'notice transfer-drag-item';
    card.draggable = true;
    card.dataset.index = String(index);
    card.dataset.group = groupKey || 'unassigned';
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', String(index));
      event.dataTransfer.effectAllowed = 'move';
      state.transferRequestDragIndex = index;
    });
    if (state.transferRequestDragIndex === index) {
      card.style.borderColor = 'rgba(58, 47, 38, 0.45)';
      card.style.background = 'rgba(214, 188, 140, 0.2)';
    }
    card.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-action]')) return;
      event.stopPropagation();
      state.transferRequestDragIndex = index;
      renderTransferRequestItems();
    });
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${item.name}</strong>
          <div class="helper">${window.i18n.t('quantity')}: ${formatNumber(item.qty)}</div>
          ${groupKey ? `<div class="helper">${window.i18n.t('category')}: ${getTransferGroupLabel(groupKey)}</div>` : `<div class="helper" style="color:#b45309;">${window.i18n.t('unassigned_items')}</div>`}
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
    const target = getTransferDropListElement(groupKey);
    target?.appendChild(card);
  });
  if (els.transferRequestUnassignedCount) {
    els.transferRequestUnassignedCount.textContent = String(unassignedCount);
  }

  bindTransferDropZones();
}

function bindTransferDropZones() {
  const dropZones = [
    els.transferRequestItemsList,
    els.transferRequestGroupSweets,
    els.transferRequestGroupTableware,
    els.transferRequestGroupSupplies,
    els.transferRequestGroupOther
  ].filter(Boolean);
  dropZones.forEach((zone) => {
    zone.ondragover = (event) => {
      event.preventDefault();
      zone.classList.add('drag-target');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    };
    zone.ondragleave = () => zone.classList.remove('drag-target');
    zone.ondrop = (event) => {
      event.preventDefault();
      zone.classList.remove('drag-target');
      const indexRaw = event.dataTransfer?.getData('text/plain');
      const index = Number(indexRaw);
      applyTransferItemGroup(index, zone.dataset.group || 'unassigned');
    };
    zone.onclick = (event) => {
      if (event.target?.closest?.('.transfer-drag-item')) return;
      if (state.transferRequestDragIndex === null || state.transferRequestDragIndex === undefined) return;
      applyTransferItemGroup(Number(state.transferRequestDragIndex), zone.dataset.group || 'unassigned');
    };
  });
}

function applyTransferItemGroup(index, targetGroup) {
  if (!state.transferRequestDraft?.items?.length) return;
  const safeIndex = Number(index);
  if (!Number.isFinite(safeIndex) || safeIndex < 0 || safeIndex >= state.transferRequestDraft.items.length) {
    state.transferRequestDragIndex = null;
    return;
  }
  const groupKey = normalizeTransferGroupKey(targetGroup);
  state.transferRequestDraft.items[safeIndex].groupKey = groupKey || '';
  state.transferRequestDragIndex = null;
  renderTransferRequestItems();
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
  const unassignedCount = state.transferRequestDraft.items
    .filter((item) => !normalizeTransferGroupKey(item.groupKey))
    .length;
  if (unassignedCount > 0) {
    if (els.transferRequestError) {
      els.transferRequestError.textContent = `${window.i18n.t('unassigned_items')}: ${unassignedCount}`;
    }
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
      items: state.transferRequestDraft.items.map((item) => ({
        ...item,
        groupKey: normalizeTransferGroupKey(item.groupKey)
      })),
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
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="view"]')?.addEventListener('click', () => {
      openTransferDetailsModal(req, 'request');
    });
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
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
          ${canReceive ? `<button class="btn primary small" data-action="receive">${window.i18n.t('receive_action')}</button>` : ''}
        </div>
      </td>
    `;
    const viewBtn = row.querySelector('[data-action="view"]');
    if (viewBtn) viewBtn.addEventListener('click', () => openTransferDetailsModal(transfer, 'transfer'));
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

function getTransferItemLocalizedName(item) {
  const ar = item?.nameAr || item?.name || '-';
  const enRaw = item?.nameEn || '';
  const en = normalizeSearchValue(enRaw) === normalizeSearchValue(ar) ? '' : enRaw;
  return { ar, en };
}

function getTransferItemsByGroup(items) {
  const grouped = { sweets: [], tableware: [], supplies: [], other: [] };
  normalizeItems(items).forEach((item) => {
    const key = normalizeTransferGroupKey(item.groupKey) || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  return grouped;
}

function openTransferDetailsModal(record, mode = 'request') {
  if (!record || !els.transferDetailsModal) return;
  state.transferDetailsDraft = { mode, record };
  renderTransferDetailsModal();
  els.transferDetailsModal.classList.remove('hidden');
}

function closeTransferDetailsModal() {
  if (els.transferDetailsModal) els.transferDetailsModal.classList.add('hidden');
  state.transferDetailsDraft = null;
}

function renderTransferDetailsModal() {
  if (!state.transferDetailsDraft || !els.transferDetailsMeta || !els.transferDetailsColumns) return;
  const { mode, record } = state.transferDetailsDraft;
  const metaRows = mode === 'transfer'
    ? [
      `${window.i18n.t('transfer_number')}: ${record.transferNumber || '-'}`,
      `${window.i18n.t('date_time')}: ${formatDate(record.createdAt)}`,
      `${window.i18n.t('status')}: ${getTransferStatusLabel(record)}`,
      `${window.i18n.t('from_branch')}: ${getLocalizedName(state.branches?.[record.fromBranchId]) || '-'}`,
      `${window.i18n.t('to_branch')}: ${getLocalizedName(state.branches?.[record.toBranchId]) || '-'}`,
      `${window.i18n.t('cashier_name')}: ${record.cashierName || '-'}`
    ]
    : [
      `${window.i18n.t('transfer_request_number')}: ${record.requestNumber || '-'}`,
      `${window.i18n.t('date_time')}: ${formatDate(record.createdAt)}`,
      `${window.i18n.t('status')}: ${getTransferRequestStatusLabel(record)}`,
      `${window.i18n.t('branch')}: ${getLocalizedName(state.branches?.[record.branchId]) || record.branchName || '-'}`,
      `${window.i18n.t('cashier_name')}: ${record.cashierName || '-'}`,
      `${window.i18n.t('items')}: ${normalizeItems(record.items).length}`
    ];
  els.transferDetailsMeta.innerHTML = metaRows.map((text) => `<div class="notice">${text}</div>`).join('');

  const grouped = getTransferItemsByGroup(record.items);
  els.transferDetailsColumns.innerHTML = TRANSFER_GROUPS.map((group) => {
    const rows = grouped[group.key] || [];
    const rowsHtml = rows.length
      ? rows.map((item) => {
        const names = getTransferItemLocalizedName(item);
        return `
          <div class="notice" style="padding: 8px;">
            <div><strong>${names.ar}</strong></div>
            ${names.en ? `<div class="helper">${names.en}</div>` : ''}
            <div class="helper">${window.i18n.t('quantity')}: ${formatNumber(item.receivedQty ?? item.qty ?? 0)}</div>
          </div>
        `;
      }).join('')
      : `<div class="helper">${window.i18n.t('no_data')}</div>`;
    return `
      <div class="transfer-column">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h5>${window.i18n.t(group.titleKey)}</h5>
        </div>
        <div class="transfer-drop-list">${rowsHtml}</div>
        <button class="btn ghost small transfer-details-print-btn" data-group-print="${group.key}">${window.i18n.t('print_report')}</button>
      </div>
    `;
  }).join('');

  els.transferDetailsColumns.querySelectorAll('[data-group-print]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.getAttribute('data-group-print') || '';
      printTransferDetailsGroupReport(group);
    });
  });
}

function getTransferDetailsContext() {
  const draft = state.transferDetailsDraft;
  if (!draft?.record) return null;
  const { mode, record } = draft;
  const title = mode === 'transfer' ? window.i18n.t('transfer_voucher') : window.i18n.t('transfer_request');
  const numberLabel = mode === 'transfer' ? window.i18n.t('transfer_number') : window.i18n.t('transfer_request_number');
  const numberValue = mode === 'transfer' ? (record.transferNumber || '-') : (record.requestNumber || '-');
  return { mode, record, title, numberLabel, numberValue };
}

function buildTransferA4Html({ title, subtitle, metadata = [], headers = [], rows = [] }) {
  const lang = window.i18n.getLanguage();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const headCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  const metaHtml = metadata.map((row) => `<p><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</p>`).join('');
  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: "Cairo", sans-serif; color: #1e1b16; margin: 0; }
          .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 10px; }
          .brand img { width: 62px; height: 62px; object-fit: contain; }
          h2 { margin: 0; font-size: 21px; }
          .subtitle { margin-top: 4px; font-size: 12px; color: #5f5348; }
          .meta { border: 1px solid #ddd; border-radius: 10px; padding: 8px 10px; margin-bottom: 10px; }
          .meta p { margin: 4px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 7px; text-align: start; font-size: 11px; }
          th { background: #f1ece6; }
        </style>
      </head>
      <body>
        <div class="head">
          <div class="brand">
            <img src="logo.png" alt="logo" />
            <div>
              <h2>${escapeHtml(title)}</h2>
              <div class="subtitle">${escapeHtml(subtitle || '')}</div>
            </div>
          </div>
          <div>${escapeHtml(formatDate(Date.now()))}</div>
        </div>
        ${metaHtml ? `<div class="meta">${metaHtml}</div>` : ''}
        <table>
          <thead><tr>${headCells}</tr></thead>
          <tbody>${bodyRows || `<tr><td colspan="${headers.length || 1}">${escapeHtml(window.i18n.t('no_data'))}</td></tr>`}</tbody>
        </table>
        <script>
          window.print();
          window.onafterprint = function() { window.close(); };
        <\/script>
      </body>
    </html>
  `;
}

function openTransferA4PrintWindow(html) {
  const printWindow = window.open('', '_blank', 'width=980,height=720');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

function printTransferDetailsGroupReport(groupKey) {
  const ctx = getTransferDetailsContext();
  const normalizedGroup = normalizeTransferGroupKey(groupKey);
  if (!ctx || !normalizedGroup) return;
  const grouped = getTransferItemsByGroup(ctx.record.items);
  const rows = (grouped[normalizedGroup] || []).map((item, index) => {
    const names = getTransferItemLocalizedName(item);
    return [
      String(index + 1),
      names.ar || '-',
      names.en || '-',
      formatNumber(item.receivedQty ?? item.qty ?? 0)
    ];
  });
  const html = buildTransferA4Html({
    title: ctx.title,
    subtitle: `${ctx.numberLabel}: ${ctx.numberValue} - ${window.i18n.t('category')}: ${getTransferGroupLabel(normalizedGroup)}`,
    metadata: [
      { label: window.i18n.t('date_time'), value: formatDate(ctx.record.createdAt) },
      { label: window.i18n.t('status'), value: ctx.mode === 'transfer' ? getTransferStatusLabel(ctx.record) : getTransferRequestStatusLabel(ctx.record) }
    ],
    headers: [
      window.i18n.t('row_number'),
      window.i18n.t('item_name_ar'),
      window.i18n.t('item_name_en'),
      window.i18n.t('quantity')
    ],
    rows
  });
  openTransferA4PrintWindow(html);
}

function printTransferDetailsFullReport() {
  const ctx = getTransferDetailsContext();
  if (!ctx) return;
  const items = normalizeItems(ctx.record.items);
  const rows = items.map((item, index) => {
    const names = getTransferItemLocalizedName(item);
    return [
      String(index + 1),
      names.ar || '-',
      names.en || '-',
      getTransferGroupLabel(item.groupKey),
      formatNumber(item.receivedQty ?? item.qty ?? 0)
    ];
  });
  const metadata = [
    { label: ctx.numberLabel, value: ctx.numberValue },
    { label: window.i18n.t('date_time'), value: formatDate(ctx.record.createdAt) },
    { label: window.i18n.t('status'), value: ctx.mode === 'transfer' ? getTransferStatusLabel(ctx.record) : getTransferRequestStatusLabel(ctx.record) }
  ];
  if (ctx.mode === 'transfer') {
    metadata.push({ label: window.i18n.t('from_branch'), value: getLocalizedName(state.branches?.[ctx.record.fromBranchId]) || '-' });
    metadata.push({ label: window.i18n.t('to_branch'), value: getLocalizedName(state.branches?.[ctx.record.toBranchId]) || '-' });
  } else {
    metadata.push({ label: window.i18n.t('branch'), value: getLocalizedName(state.branches?.[ctx.record.branchId]) || ctx.record.branchName || '-' });
  }
  const html = buildTransferA4Html({
    title: ctx.title,
    subtitle: `${ctx.numberLabel}: ${ctx.numberValue}`,
    metadata,
    headers: [
      window.i18n.t('row_number'),
      window.i18n.t('item_name_ar'),
      window.i18n.t('item_name_en'),
      window.i18n.t('category'),
      window.i18n.t('quantity')
    ],
    rows
  });
  openTransferA4PrintWindow(html);
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
        nameAr: item.nameAr || item.name || '-',
        nameEn: item.nameEn || '',
        unitId: item.unitId || null,
        groupKey: normalizeTransferGroupKey(item.groupKey) || '',
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
      nameAr: item.nameAr || item.name || '-',
      nameEn: item.nameEn || '',
      unitId: item.unitId || null,
      groupKey: normalizeTransferGroupKey(item.groupKey) || '',
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showThermalInvoice(order) {
  printThermalReceipt(order);
}

function printThermalInvoice(button) {
  const invoiceContent = button?.closest('.modal-content')?.querySelector('.thermal-invoice')?.innerHTML || '';
  if (!invoiceContent) return;
  printThermalInvoiceHtml(invoiceContent);
}

function reprintInvoice(orderId) {
  const order = Object.entries(state.orders || {})
    .map(([id, item]) => ({ id, ...item }))
    .find((item) => String(item.id) === String(orderId));
  if (order) {
    showThermalInvoice(order);
  }
}

function formatOrderTypeForInvoice(order) {
  const baseLabel = getLocalizedName(state.orderTypes?.[order.orderTypeId]) || order.orderTypeName || '-';
  const tableNumber = String(order.tableNumber || '').trim();
  if (!tableNumber) return baseLabel;
  const tableWord = window.i18n.getLanguage() === 'ar' ? 'طاولة' : 'Table';
  const tableLabel = `${tableWord} (${tableNumber})`;
  return tableLabel;
}

function printThermalReceipt(order) {
  if (!order) return;
  const existing = document.getElementById('thermalInvoiceOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'thermalInvoiceOverlay';
  const orderTypeLabel = formatOrderTypeForInvoice(order);
  const paymentLabel = getLocalizedName(state.paymentMethods?.[order.paymentMethodId]) || order.paymentMethodName || '-';
  const items = normalizeItems(order.items || []);
  const subtotal = Number(order.subtotal ?? order.netTotal ?? ((order.total || 0) - (order.deliveryFee || 0)));
  const deliveryFee = Number(order.deliveryFee || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || 0);
  const unitHeader = window.i18n.getLanguage() === 'ar' ? 'الوحدة' : 'Unit';
  overlay.innerHTML = `
    <div class="modal-content p-4" style="background:#f3f4f6; width:min(92vw,820px); max-height:92vh; overflow:auto; border-radius:10px;">
      <div class="thermal-invoice" style="width:72mm; margin:0 auto; padding:10px; background:#fff; border-radius:8px;">
        <div style="text-align:center; border-bottom:2px dashed #000; padding-bottom:10px; margin-bottom:10px;">
          <img src="logo.png" alt="logo" style="width:92px; height:92px; margin:0 auto 8px; display:block; object-fit:contain;" onerror="this.style.display='none';">
          <div style="font-size:18px; font-weight:700; margin-bottom:5px;">مخبز التين والزيتون</div>
          <div style="font-size:9px; line-height:1.45;">
            الكويت، اليرموك، ق٢ شارع ٢<br>
            22085889 | 65162277<br>
            @figsolives.kw
          </div>
          <div style="margin:10px 0; border-top:1px solid #ccc; padding:6px 0 0;">
            <div style="font-size:16px; font-weight:700; margin-bottom:3px;">مطعم التين الطبيعي</div>
            <div style="font-size:9px; line-height:1.45;">
              الكويت، أبو الحصانية، مول ٣٠<br>
              22085886 | 99176512<br>
              @natural_figs
            </div>
          </div>
        </div>

        <div style="margin-bottom:8px; border-bottom:1px dashed #ccc; padding-bottom:6px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>${window.i18n.t('invoice_number')}: <strong>#${escapeHtml(order.orderNumber || '-')}</strong></span>
            <span>${window.i18n.t('date')}: ${escapeHtml(formatDate(order.createdAt))}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>${window.i18n.t('cashier')}: ${escapeHtml(order.cashierName || '-')}</span>
            <span>${window.i18n.t('order_type')}: ${escapeHtml(orderTypeLabel)}</span>
          </div>
          <div style="margin-top:2px;">
            <span>${window.i18n.t('branch')}: ${escapeHtml(order.branchName || '-')}</span>
          </div>
        </div>

        <div style="background:#f9f9f9; padding:6px; border-radius:4px; margin-bottom:8px; font-size:11px;">
          <div style="font-weight:700; border-bottom:1px solid #eee; margin-bottom:4px;">${window.i18n.t('customer_name')}: ${escapeHtml(order.customerName || '-')}</div>
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>${window.i18n.t('customer_phone')}: ${escapeHtml(String(order.customerPhone || '').replace(/^\+?965\s?/, ''))}</span>
            <span style="background:#000; color:#fff; padding:0 5px; border-radius:2px;">${escapeHtml(paymentLabel)}</span>
          </div>
          ${order.pickupBranchName ? `<div>${window.i18n.t('pickup_branch')}: ${escapeHtml(order.pickupBranchName)}</div>` : ''}
          <div>${window.i18n.t('address')}: ${escapeHtml(order.deliveryAddress || '-')}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr>
              <th style="text-align:right; border-bottom:1px solid #000; padding:4px 0;">${window.i18n.t('product_single')}</th>
              <th style="text-align:center; width:42px; border-bottom:1px solid #000; padding:4px 0;">${window.i18n.t('quantity')}</th>
              <th style="text-align:center; width:70px; border-bottom:1px solid #000; padding:4px 0;">${unitHeader}</th>
              <th style="text-align:left; width:70px; border-bottom:1px solid #000; padding:4px 0;">${window.i18n.t('total')}</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td style="padding:4px 0; border-bottom:1px dotted #eee;">
                  <div style="font-weight:700;">${escapeHtml(item.nameAr || item.name || '-')}</div>
                  ${(item.nameEn && normalizeSearchValue(item.nameEn) !== normalizeSearchValue(item.nameAr || item.name || ''))
                    ? `<div style="font-size:10px; color:#444;">${escapeHtml(item.nameEn)}</div>`
                    : ''}
                  ${item.note ? `<div style="font-size:10px; color:#0066cc; margin-top:2px; font-weight:600;">${escapeHtml(item.note)}</div>` : ''}
                </td>
                <td style="text-align:center; font-weight:700; padding:4px 0; border-bottom:1px dotted #eee;">${escapeHtml(formatNumber(item.qty))}</td>
                <td style="text-align:center; padding:4px 0; border-bottom:1px dotted #eee;">${escapeHtml(formatCurrency(Number(item.price || 0)))}</td>
                <td style="text-align:left; padding:4px 0; border-bottom:1px dotted #eee;">${escapeHtml(formatCurrency(Number(item.price || 0) * Number(item.qty || 0)))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top:10px; border-top:1px solid #000; padding-top:6px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
            <span>${window.i18n.t('subtotal')}:</span>
            <span>${escapeHtml(formatCurrency(subtotal))}</span>
          </div>
          ${deliveryFee > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
              <span>${window.i18n.t('delivery_fee')}:</span>
              <span>${escapeHtml(formatCurrency(deliveryFee))}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
              <span>${window.i18n.t('discount')}:</span>
              <span>${escapeHtml(formatCurrency(discount))}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:900; margin-top:5px; border-top:2px double #000; padding-top:5px;">
            <span>${window.i18n.t('total')}:</span>
            <span>${escapeHtml(formatCurrency(total))}</span>
          </div>
        </div>

        <div style="text-align:center; margin-top:14px; border-top:1px dashed #ccc; padding-top:10px;">
          <img src="qr.png" alt="QR" style="width:84px; height:84px; object-fit:contain; margin:0 auto 6px; display:block;" onerror="this.style.display='none';">
          <div style="font-size:11px; font-weight:700;">شكراً لزيارتكم</div>
          <div style="font-size:9px; color:#666; margin-top:3px;">صحتك أغلى ما تملك،، فتناول شيئاً صحياً.</div>
        </div>
      </div>
      <div class="mt-4 flex gap-2" style="display:flex; gap:8px; margin-top:12px;">
        <button id="thermalPrintBtn" class="btn primary" style="flex:2;">${window.i18n.t('print')}</button>
        <button id="thermalCancelBtn" class="btn ghost" style="flex:1;">${window.i18n.t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const cancelBtn = overlay.querySelector('#thermalCancelBtn');
  const printBtn = overlay.querySelector('#thermalPrintBtn');
  cancelBtn?.addEventListener('click', () => overlay.remove());
  printBtn?.addEventListener('click', () => {
    const invoiceContent = overlay.querySelector('.thermal-invoice')?.innerHTML || '';
    printThermalInvoiceHtml(invoiceContent);
  });
}

function printThermalInvoiceHtml(invoiceContent) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${window.i18n.t('print')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 80mm auto; margin: 0; }
        html, body { margin: 0; padding: 0; width: 80mm; height: auto; }
        body { font-family: 'Cairo', sans-serif; background: #fff; padding: 3mm 2mm; font-size: 13px; }
        .thermal-invoice { width: 100%; max-width: 72mm; margin: 0 auto; padding: 0; }
        .thermal-invoice * { line-height: 1.42; }
        @media print {
          html, body { height: auto; overflow: visible; }
          body { padding: 2mm; }
        }
      </style>
    </head>
    <body>
      <div class="thermal-invoice">${invoiceContent}</div>
      <script>
        window.print();
        window.onafterprint = function() { window.close(); };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function renderTablesSection() {
  if (!els.tablesList) return;
  if (!state.branchId) {
    els.tablesList.innerHTML = `<p class="helper">${window.i18n.t('device_not_assigned')}</p>`;
    return;
  }
  const tableConfigs = getBranchTablesConfig();
  if (!tableConfigs.length) {
    els.tablesList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  els.tablesList.innerHTML = '';
  tableConfigs.forEach((tableConfig) => {
    const tableNumber = tableConfig.tableNumber;
    const draft = state.tableDrafts?.[tableNumber];
    const invoice = draft?.invoice || null;
    const itemsCount = Array.isArray(invoice?.cart) ? invoice.cart.length : 0;
    const statusLabel = draft ? window.i18n.t('active') : window.i18n.t('available');
    const locationLabel = tableConfig.location ? `<div class="helper">${window.i18n.t('table_location')}: ${tableConfig.location}</div>` : '';
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between; align-items: center;">
        <strong>${window.i18n.t('table_number')} #${tableNumber}</strong>
        <span class="helper">${statusLabel}</span>
      </div>
      ${locationLabel}
      <div class="helper" style="margin-top: 6px;">${window.i18n.t('items')}: ${itemsCount}</div>
      <div class="row" style="margin-top: 8px; gap: 6px;">
        <button class="btn ghost small" data-action="open">${draft ? window.i18n.t('continue') : window.i18n.t('open_table')}</button>
        ${draft ? `<button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>` : ''}
      </div>
    `;
    const openBtn = card.querySelector('[data-action="open"]');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (draft) {
          openTableSession(tableNumber, 'continue');
          return;
        }
        tableFlowState.selectedTableNumber = tableNumber;
        openTableCustomerTimingModal();
      });
    }
    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!confirm(window.i18n.t('confirm_delete'))) return;
        removeTableDraft(tableNumber);
      });
    }
    els.tablesList.appendChild(card);
  });
}

function openTableSelectModal() {
  if (!state.branchId) {
    alert(window.i18n.t('device_not_assigned'));
    return;
  }
  if (!els.tableSelectList || !els.tableSelectModal) return;
  const tableConfigs = getBranchTablesConfig();
  if (!tableConfigs.length) {
    alert(window.i18n.t('no_data'));
    return;
  }
  els.tableSelectList.innerHTML = '';
  tableFlowState.selectedTableNumber = '';
  tableConfigs.forEach((tableConfig) => {
    const tableNumber = tableConfig.tableNumber;
    const hasDraft = Boolean(state.tableDrafts?.[tableNumber]?.invoice);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${hasDraft ? 'primary' : 'ghost'}`;
    button.style.width = '100%';
    button.style.marginBottom = '8px';
    button.innerHTML = `
      ${window.i18n.t('table_number')} #${escapeHtml(tableNumber)}
      ${hasDraft ? ` - ${window.i18n.t('continue')}` : ''}
    `;
    button.addEventListener('click', () => {
      if (hasDraft) {
        closeTableSelectModal();
        openTableSession(tableNumber, 'continue');
      } else {
        tableFlowState.selectedTableNumber = tableNumber;
        closeTableSelectModal();
        openTableCustomerTimingModal();
      }
    });
    els.tableSelectList.appendChild(button);
  });
  els.tableSelectModal.classList.remove('hidden');
}

function closeTableSelectModal() {
  if (els.tableSelectModal) els.tableSelectModal.classList.add('hidden');
}

function openTableCustomerTimingModal() {
  if (els.tableCustomerTimingModal) els.tableCustomerTimingModal.classList.remove('hidden');
}

function closeTableCustomerTimingModal() {
  if (els.tableCustomerTimingModal) els.tableCustomerTimingModal.classList.add('hidden');
  tableFlowState.selectedTableNumber = '';
}

function startSelectedTableInvoice(customerChoice) {
  const tableNumber = tableFlowState.selectedTableNumber;
  if (!tableNumber) {
    closeTableCustomerTimingModal();
    return;
  }
  closeTableCustomerTimingModal();
  openTableSession(tableNumber, customerChoice);
  tableFlowState.selectedTableNumber = '';
}

function openTableSession(tableNumber, customerChoice = 'continue') {
  const key = String(tableNumber || '').trim();
  if (!key) return;
  const existingDraft = state.tableDrafts?.[key];
  if (existingDraft?.invoice) {
    state.invoice = JSON.parse(JSON.stringify(existingDraft.invoice));
    state.invoice.isTableOrder = true;
    state.invoice.tableNumber = key;
    if (!state.invoice.tableOpenedAt) {
      state.invoice.tableOpenedAt = Number(existingDraft.updatedAt || Date.now());
    }
    ensureTableFlowDefaults();
    applyTableInvoiceDefaults();
    renderInvoiceUI();
    setInvoiceStep(state.invoice.step || 'items');
    if (els.invoiceOverlay) els.invoiceOverlay.classList.remove('hidden');
    showOrdersSection();
    return;
  }

  resetInvoice();
  state.invoice.isTableOrder = true;
  state.invoice.tableNumber = key;
  state.invoice.tableOpenedAt = Date.now();
  state.invoice.tableCustomerChoice = customerChoice === 'now' ? 'now' : 'later';
  state.invoice.customerCapturedFirst = customerChoice !== 'now';
  applyTableInvoiceDefaults();
  renderInvoiceUI();
  persistOpenTableDraft();
  setInvoiceStep(customerChoice === 'now' ? 'customer' : 'items');
  if (els.invoiceOverlay) els.invoiceOverlay.classList.remove('hidden');
  showOrdersSection();
}

function showTransfersSection() {
  if (els.ordersSection) els.ordersSection.classList.add('hidden');
  if (els.tablesSection) els.tablesSection.classList.add('hidden');
  if (els.transfersSection) els.transfersSection.classList.remove('hidden');
  state.currentView = 'transfers';
  renderTransferRequestsTable();
  renderIncomingTransfersTable();
}

function routeScanValue(value) {
  const invoiceOpen = els.invoiceOverlay && !els.invoiceOverlay.classList.contains('hidden');
  if (invoiceOpen && els.invoiceStepItems && !els.invoiceStepItems.classList.contains('hidden')) {
    handleInvoiceBarcodeScan(value);
    return;
  }
  const transferRequestOpen = els.transferRequestModal && !els.transferRequestModal.classList.contains('hidden');
  if (transferRequestOpen) {
    handleTransferRequestBarcodeScanValue(value);
  }
}

function showOrdersSection() {
  if (els.transfersSection) els.transfersSection.classList.add('hidden');
  if (els.tablesSection) els.tablesSection.classList.add('hidden');
  if (els.ordersSection) els.ordersSection.classList.remove('hidden');
  state.currentView = 'orders';
}

function showTablesSection() {
  if (els.transfersSection) els.transfersSection.classList.add('hidden');
  if (els.ordersSection) els.ordersSection.classList.add('hidden');
  if (els.tablesSection) els.tablesSection.classList.remove('hidden');
  state.currentView = 'tables';
  renderTablesSection();
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  let date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '-';
  }
  if (Number.isNaN(date.getTime())) return '-';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${year}/${month}/${day} ${time}`;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  const suffix = window.i18n.getLanguage() === 'ar' ? ' د.ك' : ' KWD';
  return `${number.toFixed(2)}${suffix}`;
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toFixed(2);
}

function generateId() {
  return `addr-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

init();
