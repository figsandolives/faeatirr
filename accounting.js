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
  user: null,
  role: null,
  cache: {},
  currentSection: 'orders',
  orderFilters: {
    branchId: 'all',
    cashierId: 'all',
    zoneId: 'all',
    dateFrom: '',
    dateTo: '',
    query: ''
  },
  customerFilters: {
    zoneId: 'all',
    level: 'all',
    blockedOnly: false,
    query: ''
  },
  productFilters: {
    branchId: 'all',
    categoryId: 'all',
    storageLocationId: 'all',
    sortBy: 'default',
    query: ''
  },
  materialFilters: {
    branchId: 'all',
    categoryId: 'all',
    storageLocationId: 'all',
    query: ''
  },
  selectedProducts: new Set(),
  selectedStockMaterials: new Set(),
  selectedOrders: new Set(),
  selectedCustomers: new Set(),
  editingOrder: null,
  editingUnitId: null,
  categoryPath: [],
  activeCategoryId: null,
  materialCategoryPath: [],
  activeMaterialCategoryId: null,
  activeStorageLocationId: null,
  issueDraft: null,
  productionDraft: null,
  inventoryDraft: null,
  receivingDraft: null,
  transferDraft: null,
  cashierTransferDraft: null,
  stockReturnDraft: null,
  scrapReturnDraft: null,
  supplierDraft: null,
  supplierDetailId: null,
  supplierPickSelection: new Set(),
  purchaseDraft: null,
  purchaseReceiveDraft: null,
  supplierReturnDraft: null,
  itemCard: {
    item: null,
    branchId: '',
    fromDate: '',
    toDate: '',
    movements: []
  },
  issueFilter: 'all',
  productionFilter: 'all',
  qtyModal: {
    value: '',
    mode: 'add',
    item: null,
    available: null,
    onConfirm: null
  },
  importedProducts: [],
  importedStockMaterials: []
};

function getLocalizedName(item) {
  if (!item) return '-';
  const lang = window.i18n.getLanguage();
  if (lang === 'en') {
    return item.nameEn || item.name || item.nameAr || '-';
  }
  return item.nameAr || item.name || item.nameEn || '-';
}

function getStaffLabel(staff, fallbackId = '-') {
  if (!staff) return fallbackId;
  const localized = getLocalizedName(staff);
  if (localized && localized !== '-') return localized;
  return staff.name || staff.code || fallbackId;
}

function getUnitName(unitId) {
  if (!unitId) return '';
  const unit = state.cache.units?.[unitId];
  const name = getLocalizedName(unit);
  return name && name !== '-' ? name : '';
}

function formatUnitWithDefinition(unitId, definitionQty, definitionUnitId) {
  const baseName = getUnitName(unitId);
  if (!baseName) return '-';
  const qty = String(definitionQty || '').trim();
  const defUnitName = getUnitName(definitionUnitId);
  if (!qty || !defUnitName) return baseName;
  return `${baseName} (${qty} ${defUnitName})`;
}

function formatItemNameWithUnit(name, unitId) {
  const baseName = name || '-';
  const unitName = getUnitName(unitId);
  return unitName ? `${baseName} (${unitName})` : baseName;
}

function getItemDataByType(itemType, itemId) {
  if (!itemId) return null;
  return itemType === 'product'
    ? state.cache.products?.[itemId]
    : state.cache.stockMaterials?.[itemId];
}

function normalizeItemType(item) {
  return item?.itemType || item?.type || 'product';
}

function getItemKey(item) {
  const itemType = normalizeItemType(item);
  const itemId = item?.itemId || item?.id;
  return `${itemType}:${itemId}`;
}

function buildItemMap(items) {
  const map = {};
  normalizeItems(items).forEach((item) => {
    const key = getItemKey(item);
    if (!key.includes('undefined')) {
      map[key] = {
        itemType: normalizeItemType(item),
        itemId: item.itemId || item.id,
        qty: Number(item.qty || 0),
        unitId: item.unitId || null,
        name: item.name || item.itemName || item.itemId || '-'
      };
    }
  });
  return map;
}

function diffItems(oldItems, newItems) {
  const oldMap = buildItemMap(oldItems);
  const newMap = buildItemMap(newItems);
  const keys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
  const diffs = [];
  keys.forEach((key) => {
    const oldItem = oldMap[key];
    const newItem = newMap[key];
    const oldQty = oldItem ? Number(oldItem.qty || 0) : 0;
    const newQty = newItem ? Number(newItem.qty || 0) : 0;
    const qtyDiff = newQty - oldQty;
    if (qtyDiff !== 0) {
      diffs.push({
        itemType: newItem?.itemType || oldItem?.itemType,
        itemId: newItem?.itemId || oldItem?.itemId,
        qtyDiff,
        unitId: newItem?.unitId || oldItem?.unitId,
        name: newItem?.name || oldItem?.name
      });
    }
  });
  return diffs;
}

function getBooleanLabel(value) {
  return value ? window.i18n.t('yes') : window.i18n.t('no');
}

function normalizeDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function normalizeSearchValue(value) {
  return normalizeDigits(value).toLowerCase().trim();
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

function getCustomerLevelLabel(level) {
  if (level === 'vip') return window.i18n.t('level_vip');
  if (level === 'vvip') return window.i18n.t('level_vvip');
  return window.i18n.t('level_regular');
}

function countCustomersByZone(zoneId) {
  const customers = state.cache.customers || {};
  return Object.values(customers).filter((cust) => cust.zoneId === zoneId).length;
}

function renderCustomerZoneFilter(select) {
  const zones = state.cache.deliveryZones || {};
  const current = state.customerFilters.zoneId || 'all';
  select.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = window.i18n.t('all_zones');
  select.appendChild(allOption);
  Object.entries(zones).forEach(([id, zone]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(zone);
    select.appendChild(option);
  });
  select.value = current;
}

const listConfigs = [
  {
    sectionId: 'warehouseStaff',
    path: 'warehouseStaff',
    titleKey: 'warehouse_staff',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'phone', labelKey: 'phone', type: 'text' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'phone', 'note']
  },
  {
    sectionId: 'productionStaff',
    path: 'productionStaff',
    titleKey: 'production_staff',
    fields: [
      { key: 'nameAr', labelKey: 'name_ar', type: 'text', required: true },
      { key: 'nameEn', labelKey: 'name_en', type: 'text', required: true }
    ],
    columns: [
      { key: 'nameAr', labelKey: 'name', type: 'localizedName' }
    ]
  },
  {
    sectionId: 'branches',
    path: 'branches',
    titleKey: 'branches',
    fields: [
      { key: 'nameAr', labelKey: 'name_ar', type: 'text', required: true },
      { key: 'nameEn', labelKey: 'name_en', type: 'text', required: true },
      { key: 'address', labelKey: 'address', type: 'text' },
      { key: 'isMain', labelKey: 'main_branch', type: 'checkbox' }
    ],
    columns: [
      { key: 'nameAr', labelKey: 'name', type: 'localizedName' },
      { key: 'address', labelKey: 'address' },
      { key: 'isMain', labelKey: 'main_branch', type: 'boolean' }
    ]
  },
  {
    sectionId: 'deliveryZones',
    path: 'deliveryZones',
    titleKey: 'delivery_zones',
    fields: [
      { key: 'nameAr', labelKey: 'name_ar', type: 'text', required: true },
      { key: 'nameEn', labelKey: 'name_en', type: 'text', required: true }
    ],
    columns: [
      { key: 'nameAr', labelKey: 'name', type: 'localizedName' },
      { key: 'customerCount', labelKey: 'customers_count', type: 'customerCount' }
    ]
  },
  {
    sectionId: 'deliveryPrices',
    path: 'deliveryPrices',
    titleKey: 'delivery_prices',
    fields: [
      { key: 'price', labelKey: 'delivery_price', type: 'number', required: true },
      { key: 'zoneIds', labelKey: 'delivery_zones', type: 'multi-select', optionsPath: 'deliveryZones', required: true }
    ],
    columns: [
      { key: 'price', labelKey: 'delivery_price', type: 'number' },
      { key: 'zoneIds', labelKey: 'delivery_zones', type: 'multi-select', optionsPath: 'deliveryZones' }
    ]
  },
  {
    sectionId: 'orderTypes',
    path: 'orderTypes',
    titleKey: 'order_types',
    fields: [
      { key: 'nameAr', labelKey: 'name_ar', type: 'text', required: true },
      { key: 'nameEn', labelKey: 'name_en', type: 'text', required: true }
    ],
    columns: [
      { key: 'nameAr', labelKey: 'name', type: 'localizedName' }
    ]
  },
  {
    sectionId: 'paymentMethods',
    path: 'paymentMethods',
    titleKey: 'payment_methods',
    fields: [
      { key: 'nameAr', labelKey: 'name_ar', type: 'text', required: true },
      { key: 'nameEn', labelKey: 'name_en', type: 'text', required: true }
    ],
    columns: [
      { key: 'nameAr', labelKey: 'name', type: 'localizedName' }
    ]
  }
];

let currentDiscountType = 'code';

const sectionGroups = {
  itemCards: 'inventory',
  stockMaterials: 'inventory',
  materialCategories: 'inventory',
  storageLocations: 'inventory',
  issue: 'inventory',
  production: 'inventory',
  inventoryCount: 'inventory',
  receiving: 'inventory',
  transfers: 'inventory',
  cashierTransferRequests: 'inventory',
  stockReturn: 'inventory',
  scrapReturn: 'inventory',
  suppliers: 'suppliers',
  purchase: 'suppliers',
  supplierReturn: 'suppliers',
  pendingStockMoves: 'administration',
  devicesCashiers: 'administration',
  users: 'administration',
  warehouseStaff: 'administration',
  productionStaff: 'administration',
  branches: 'administration',
  deliveryZones: 'administration',
  deliveryPrices: 'administration',
  discounts: 'administration',
  orderTypes: 'administration',
  paymentMethods: 'administration'
};

const navItems = Array.from(document.querySelectorAll('.nav-item')).filter((item) => item.dataset.section);
const navGroups = Array.from(document.querySelectorAll('.nav-group'));

const els = {
  userName: document.getElementById('userName'),
  userRole: document.getElementById('userRole'),
  logoutBtn: document.getElementById('logoutBtn'),
  loginOverlay: document.getElementById('loginOverlay'),
  loginCode: document.getElementById('loginCode'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailBody: document.getElementById('detailBody'),
  detailClose: document.getElementById('detailClose'),
  discountOverlay: document.getElementById('discountOverlay'),
  discountBody: document.getElementById('discountBody'),
  discountClose: document.getElementById('discountClose'),
  productModal: document.getElementById('productModal'),
  productForm: document.getElementById('productForm'),
  productCancel: document.getElementById('productCancel'),
  productError: document.getElementById('productError'),
  categoryModal: document.getElementById('categoryModal'),
  categoryForm: document.getElementById('categoryForm'),
  categoryCancel: document.getElementById('categoryCancel'),
  categoryError: document.getElementById('categoryError'),
  categoryProductsModal: document.getElementById('categoryProductsModal'),
  categoryProductsSave: document.getElementById('categoryProductsSave'),
  categoryProductsCancel: document.getElementById('categoryProductsCancel'),
  categoryProductSearch: document.getElementById('categoryProductSearch'),
  categoryProductList: document.getElementById('categoryProductList'),
  materialModal: document.getElementById('materialModal'),
  materialForm: document.getElementById('materialForm'),
  materialCancel: document.getElementById('materialCancel'),
  materialError: document.getElementById('materialError'),
  materialCategoryModal: document.getElementById('materialCategoryModal'),
  materialCategoryForm: document.getElementById('materialCategoryForm'),
  materialCategoryCancel: document.getElementById('materialCategoryCancel'),
  materialCategoryError: document.getElementById('materialCategoryError'),
  materialCategoryProductsModal: document.getElementById('materialCategoryProductsModal'),
  materialCategoryProductsSave: document.getElementById('materialCategoryProductsSave'),
  materialCategoryProductsCancel: document.getElementById('materialCategoryProductsCancel'),
  materialCategoryProductSearch: document.getElementById('materialCategoryProductSearch'),
  materialCategoryProductList: document.getElementById('materialCategoryProductList'),
  storageLocationModal: document.getElementById('storageLocationModal'),
  storageLocationForm: document.getElementById('storageLocationForm'),
  storageLocationCancel: document.getElementById('storageLocationCancel'),
  storageLocationError: document.getElementById('storageLocationError'),
  storageItemsModal: document.getElementById('storageItemsModal'),
  storageItemsSave: document.getElementById('storageItemsSave'),
  storageItemsCancel: document.getElementById('storageItemsCancel'),
  storageItemsSearch: document.getElementById('storageItemsSearch'),
  storageItemsList: document.getElementById('storageItemsList'),
  qtyModal: document.getElementById('qtyModal'),
  qtyModalTitle: document.getElementById('qtyModalTitle'),
  qtyModalStock: document.getElementById('qtyModalStock'),
  qtyModalDisplay: document.getElementById('qtyModalDisplay'),
  qtyModalConfirm: document.getElementById('qtyModalConfirm'),
  qtyModalCancel: document.getElementById('qtyModalCancel'),
  qtyModalError: document.getElementById('qtyModalError'),
  productionDateModal: document.getElementById('productionDateModal'),
  productionDateInput: document.getElementById('productionDateInput'),
  expiryDateInput: document.getElementById('expiryDateInput'),
  productionDateNext: document.getElementById('productionDateNext'),
  productionDateCancel: document.getElementById('productionDateCancel'),
  productionDateError: document.getElementById('productionDateError'),
  productionLinkModal: document.getElementById('productionLinkModal'),
  productionIssueList: document.getElementById('productionIssueList'),
  productionLinkConfirm: document.getElementById('productionLinkConfirm'),
  productionLinkCancel: document.getElementById('productionLinkCancel'),
  issueDetailOverlay: document.getElementById('issueDetailOverlay'),
  issueDetailBody: document.getElementById('issueDetailBody'),
  issueDetailClose: document.getElementById('issueDetailClose'),
  reorderNotice: document.getElementById('reorderNotice'),
  orderEditOverlay: document.getElementById('orderEditOverlay'),
  orderEditForm: document.getElementById('orderEditForm'),
  orderEditCancel: document.getElementById('orderEditCancel'),
  orderDeleteBtn: document.getElementById('orderDeleteBtn'),
  orderEditError: document.getElementById('orderEditError'),
  orderItemsList: document.getElementById('orderItemsList'),
  orderAddProduct: document.getElementById('orderAddProduct'),
  orderAddQty: document.getElementById('orderAddQty'),
  orderAddBtn: document.getElementById('orderAddBtn'),
  customerOrdersOverlay: document.getElementById('customerOrdersOverlay'),
  customerOrdersList: document.getElementById('customerOrdersList'),
  customerOrdersClose: document.getElementById('customerOrdersClose'),
  unitModal: document.getElementById('unitModal'),
  unitForm: document.getElementById('unitForm'),
  unitCancel: document.getElementById('unitCancel'),
  unitError: document.getElementById('unitError')
};

function init() {
  state.deviceId = getDeviceId();
  initPresence('accounting');
  bindLanguageButtons();
  bindLogin();
  bindOrderEditForm();
  bindUnitForm();
  bindNavigation();
  bindQtyModal();
  bindProductionDateModal();
  bindProductionLinkModal();
  ensureSeedData();
  document.addEventListener('keydown', handleGlobalScan);
  initSections();
  watchData();

  document.addEventListener('languageChanged', () => {
    rebuildSections();
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
  const label = localStorage.getItem('deviceLabel') || `ADM-${state.deviceId.slice(-4)}`;

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

function bindLanguageButtons() {
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => window.i18n.setLanguage(btn.dataset.lang));
  });
}

function bindLogin() {
  els.loginBtn.addEventListener('click', () => handleLogin());
  els.loginCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', () => handleLogout());
  }
}

function bindOrderEditForm() {
  if (els.orderEditForm) {
    els.orderEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveOrderEdits();
    });
  }

  if (els.orderAddBtn) {
    els.orderAddBtn.addEventListener('click', () => {
      if (!state.editingOrder) return;
      const productId = els.orderAddProduct.value;
      const qty = Number(els.orderAddQty.value || 1);
      const product = state.cache.products?.[productId];
      if (!product) return;
      const existing = state.editingOrder.items.find((item) => item.productId === productId);
      if (existing) {
        existing.qty += qty;
      } else {
        state.editingOrder.items.push({
          productId,
          name: getLocalizedName(product),
          price: Number(product.price || 0),
          qty: qty > 0 ? qty : 1
        });
      }
      els.orderAddQty.value = 1;
      renderOrderItemsEditor();
    });
  }

  if (els.orderDeleteBtn) {
    els.orderDeleteBtn.addEventListener('click', () => deleteOrder());
  }
}

function bindUnitForm() {
  if (els.unitForm) {
    els.unitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveUnit();
    });
  }
}

function findUserByCode(code) {
  const codeStr = String(code).trim();
  if (!codeStr) return Promise.resolve(null);
  const queries = [
    db.ref('users').orderByChild('code').equalTo(codeStr).once('value')
  ];
  const codeNum = Number(codeStr);
  if (!Number.isNaN(codeNum)) {
    queries.push(db.ref('users').orderByChild('code').equalTo(codeNum).once('value'));
  }

  return Promise.all(queries).then((snaps) => {
    for (const snap of snaps) {
      if (snap.exists()) {
        const userId = Object.keys(snap.val())[0];
        return { id: userId, ...snap.val()[userId] };
      }
    }
    if (codeStr === '123456') {
      return db.ref('users/manager').once('value').then((snap) => {
        if (snap.exists()) {
          return { id: 'manager', ...snap.val() };
        }
        const managerData = { name: 'غير معرف', role: 'manager', code: '123456', active: true };
        return db.ref('users/manager').set(managerData).then(() => ({ id: 'manager', ...managerData }));
      });
    }
    return null;
  });
}

function handleLogin() {
  const code = normalizeDigits(els.loginCode.value).trim();
  if (!code) return;

  findUserByCode(code)
    .then((user) => {
      if (!user) {
        els.loginError.textContent = window.i18n.t('invalid_code');
        return;
      }
      state.user = user;
      state.role = user.role;
      updateUserBadge();
      applyRoleAccess();
      updateReorderNotice();
      els.loginOverlay.classList.add('hidden');
      els.loginError.textContent = '';
      selectSection(state.currentSection);
    })
    .catch(() => {
      els.loginError.textContent = window.i18n.t('error');
    });
}

function handleLogout() {
  if (!confirm(window.i18n.t('confirm_logout'))) return;
  state.user = null;
  state.role = null;
  updateUserBadge();
  applyRoleAccess();
  if (els.loginCode) els.loginCode.value = '';
  if (els.loginError) els.loginError.textContent = '';
  if (els.loginOverlay) els.loginOverlay.classList.remove('hidden');
  window.location.href = 'index.html';
}

function updateUserBadge() {
  els.userName.textContent = state.user?.name || '-';
  if (!state.role) {
    els.userRole.textContent = '-';
    return;
  }
  const roleKey = state.role === 'manager' ? 'role_manager' : state.role === 'cashier' ? 'role_cashier' : 'role_storekeeper';
  els.userRole.textContent = window.i18n.t(roleKey);
}

function applyRoleAccess() {
  const hideGroups = [];
  if (state.role === 'cashier') {
    hideGroups.push('inventory', 'suppliers');
  }
  if (state.role === 'storekeeper') {
    hideGroups.push('administration');
  }

  navItems.forEach((item) => {
    const group = item.dataset.group || sectionGroups[item.dataset.section];
    if (group && hideGroups.includes(group)) {
      item.classList.add('hidden');
    } else {
      item.classList.remove('hidden');
    }
  });

  navGroups.forEach((groupEl) => {
    const groupName = groupEl.dataset.group;
    if (hideGroups.includes(groupName)) {
      groupEl.classList.add('hidden');
    } else {
      groupEl.classList.remove('hidden');
    }
  });

  Object.entries(sectionGroups).forEach(([sectionId, group]) => {
    const section = document.getElementById(`section-${sectionId}`);
    if (!section) return;
    if (hideGroups.includes(group)) {
      section.classList.add('hidden');
    } else {
      section.classList.remove('hidden');
    }
  });

  const allowed = navItems.find((item) => !item.classList.contains('hidden'));
  if (allowed && document.getElementById(`section-${state.currentSection}`)?.classList.contains('hidden')) {
    state.currentSection = allowed.dataset.section;
  }
}

function bindNavigation() {
  navItems.forEach((item) => {
    item.addEventListener('click', () => selectSection(item.dataset.section));
  });

  navGroups.forEach((groupEl) => {
    const toggle = groupEl.querySelector('.group-toggle');
    toggle.addEventListener('click', () => {
      groupEl.classList.toggle('open');
    });
  });

  els.detailClose.addEventListener('click', () => {
    els.detailOverlay.classList.add('hidden');
  });

  if (els.discountClose) {
    els.discountClose.addEventListener('click', () => {
      els.discountOverlay.classList.add('hidden');
    });
  }

  if (els.productCancel) {
    els.productCancel.addEventListener('click', () => {
      closeProductModal();
    });
  }

  if (els.categoryCancel) {
    els.categoryCancel.addEventListener('click', () => {
      closeCategoryModal();
    });
  }

  if (els.categoryProductsCancel) {
    els.categoryProductsCancel.addEventListener('click', () => {
      closeCategoryProductsModal();
    });
  }

  if (els.materialCancel) {
    els.materialCancel.addEventListener('click', () => {
      closeMaterialModal();
    });
  }

  if (els.materialCategoryCancel) {
    els.materialCategoryCancel.addEventListener('click', () => {
      closeMaterialCategoryModal();
    });
  }

  if (els.materialCategoryProductsCancel) {
    els.materialCategoryProductsCancel.addEventListener('click', () => {
      closeMaterialCategoryProductsModal();
    });
  }

  if (els.storageLocationCancel) {
    els.storageLocationCancel.addEventListener('click', () => {
      closeStorageLocationModal();
    });
  }

  if (els.storageItemsCancel) {
    els.storageItemsCancel.addEventListener('click', () => {
      closeStorageItemsModal();
    });
  }

  if (els.qtyModalCancel) {
    els.qtyModalCancel.addEventListener('click', () => closeQtyModal());
  }

  if (els.productionDateCancel) {
    els.productionDateCancel.addEventListener('click', () => closeProductionDateModal());
  }

  if (els.productionLinkCancel) {
    els.productionLinkCancel.addEventListener('click', () => closeProductionLinkModal());
  }

  if (els.issueDetailClose) {
    els.issueDetailClose.addEventListener('click', () => {
      els.issueDetailOverlay.classList.add('hidden');
    });
  }

  if (els.orderEditCancel) {
    els.orderEditCancel.addEventListener('click', () => {
      closeOrderEditModal();
    });
  }

  if (els.customerOrdersClose) {
    els.customerOrdersClose.addEventListener('click', () => {
      els.customerOrdersOverlay.classList.add('hidden');
    });
  }

  if (els.unitCancel) {
    els.unitCancel.addEventListener('click', () => {
      closeUnitModal();
    });
  }
}

function routeScanValue(value) {
  const applyTo = (inputId, handler) => {
    const input = document.getElementById(inputId);
    if (!input) return false;
    input.value = value;
    if (typeof handler === 'function') handler();
    return true;
  };

  const isOpen = (id) => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  };

  if (isOpen('issueVoucherModal')) {
    return applyTo('issueSearchInput', handleIssueBarcodeScan);
  }
  if (isOpen('productionVoucherModal')) {
    return applyTo('productionSearchInput', handleProductionBarcodeScan);
  }
  if (isOpen('inventoryCountModal')) {
    return applyTo('inventorySearchInput', handleInventoryBarcodeScan);
  }
  if (isOpen('transferVoucherModal')) {
    return applyTo('transferSearchInput', handleTransferBarcodeScan);
  }
  if (isOpen('stockReturnModal')) {
    return applyTo('stockReturnSearchInput', handleStockReturnBarcodeScan);
  }
  if (isOpen('scrapReturnModal')) {
    return applyTo('scrapReturnSearchInput', handleScrapReturnBarcodeScan);
  }
  if (isOpen('purchaseModal')) {
    return applyTo('purchaseSearchInput', handlePurchaseBarcodeScan);
  }
  if (isOpen('purchaseReceiveModal')) {
    return applyTo('purchaseReceiveSearchInput', handlePurchaseReceiveBarcodeScan);
  }
  if (isOpen('supplierReturnModal')) {
    return applyTo('supplierReturnSearchInput', handleSupplierReturnBarcodeScan);
  }
  if (isOpen('itemCardPicker')) {
    return applyTo('itemCardSearchInput', handleItemCardBarcodeScan);
  }

  if (state.currentSection === 'products') {
    const input = document.getElementById('productSearch');
    if (input) {
      input.value = value;
      state.productFilters.query = value.trim();
      renderProductsSection();
      return true;
    }
  }

  if (state.currentSection === 'stockMaterials') {
    const input = document.getElementById('materialSearch');
    if (input) {
      input.value = value;
      state.materialFilters.query = value.trim();
      renderStockMaterialsSection();
      return true;
    }
  }

  return false;
}
function selectSection(sectionId) {
  if (!state.user) return;
  navItems.forEach((item) => item.classList.remove('active'));
  navItems.find((item) => item.dataset.section === sectionId)?.classList.add('active');

  document.querySelectorAll('.section').forEach((section) => {
    section.classList.remove('active');
  });

  const target = document.getElementById(`section-${sectionId}`);
  if (target) {
    target.classList.add('active');
    state.currentSection = sectionId;
  }
}

function initSections() {
  setupOrdersSection();
  setupPendingStockMovesSection();
  setupDevicesCashiersSection();
  setupDiscountsSection();
  setupUsersSection();
  setupProductsSection();
  setupProductCategoriesSection();
  setupItemCardSection();
  setupStockMaterialsSection();
  setupMaterialCategoriesSection();
  setupStorageLocationsSection();
  setupIssueSection();
  setupProductionSection();
  setupInventoryCountSection();
  setupReceivingSection();
  setupTransfersSection();
  setupCashierTransferRequestsSection();
  setupStockReturnSection();
  setupScrapReturnSection();
  setupSuppliersSection();
  setupPurchasesSection();
  setupSupplierReturnSection();
  setupCustomersSection();
  setupUnitsSection();
  initListSections();
  selectSection(state.currentSection);
}

function rebuildSections() {
  setupOrdersSection();
  setupPendingStockMovesSection();
  setupDevicesCashiersSection();
  setupDiscountsSection();
  setupUsersSection();
  setupProductsSection();
  setupProductCategoriesSection();
  setupItemCardSection();
  setupStockMaterialsSection();
  setupMaterialCategoriesSection();
  setupStorageLocationsSection();
  setupIssueSection();
  setupProductionSection();
  setupInventoryCountSection();
  setupReceivingSection();
  setupTransfersSection();
  setupCashierTransferRequestsSection();
  setupStockReturnSection();
  setupScrapReturnSection();
  setupSuppliersSection();
  setupPurchasesSection();
  setupSupplierReturnSection();
  setupCustomersSection();
  setupUnitsSection();
  initListSections();
  applyRoleAccess();
  selectSection(state.currentSection);
}

function initListSections() {
  listConfigs.forEach((config) => {
    buildListSection(config);
  });
}

function buildListSection(config) {
  const section = document.getElementById(`section-${config.sectionId}`);
  if (!section) return;

  const fieldHtml = config.fields
    .map((field) => {
      const inputId = `${config.sectionId}-${field.key}`;
      const label = window.i18n.t(field.labelKey);
      if (field.type === 'select' || field.type === 'multi-select') {
        const multipleAttr = field.type === 'multi-select' ? 'multiple' : '';
        return `
          <div>
            <label class="tag" for="${inputId}">${label}</label>
            <select id="${inputId}" name="${field.key}" class="input" ${multipleAttr}></select>
          </div>
        `;
      }
      if (field.type === 'checkbox') {
        return `
          <div class="row">
            <input id="${inputId}" name="${field.key}" type="checkbox" />
            <label class="tag" for="${inputId}">${label}</label>
          </div>
        `;
      }
      return `
        <div>
          <label class="tag" for="${inputId}">${label}</label>
          <input id="${inputId}" class="input" name="${field.key}" type="${field.type}" />
        </div>
      `;
    })
    .join('');

  const headerHtml = config.columns
    .map((col) => {
      const key = typeof col === 'string' ? col : col.labelKey || col.key;
      return `<th>${window.i18n.t(key)}</th>`;
    })
    .join('');

  const filterHtml = config.sectionId === 'customers'
    ? `
      <div class="row" style="margin-bottom: 12px;">
        <label class="tag">${window.i18n.t('delivery_zones')}</label>
        <select id="customerZoneFilter"></select>
      </div>
    `
    : '';

  const bulkZonesHtml = config.sectionId === 'deliveryZones'
    ? `
      <div class="row" style="justify-content: flex-end; gap: 8px; margin-bottom: 12px;">
        <button type="button" id="zonesTemplateBtn" class="btn ghost small">${window.i18n.t('download_template')}</button>
        <button type="button" id="zonesBulkBtn" class="btn primary">${window.i18n.t('add_zones_bulk')}</button>
        <input type="file" id="zonesBulkInput" class="hidden" accept=".xlsx,.xls" />
      </div>
      <p id="zonesBulkStatus" class="helper"></p>
    `
    : '';

  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t(config.titleKey)}</h2>
      ${bulkZonesHtml}
      <form class="grid two" data-section="${config.sectionId}">
        ${fieldHtml}
        <div class="row">
          <button type="submit" class="btn primary" data-action="submit">${window.i18n.t('add')}</button>
          <button type="button" class="btn ghost hidden" data-action="cancel">${window.i18n.t('cancel')}</button>
        </div>
        <p class="helper form-error"></p>
      </form>
    </div>
    <div class="card">
      ${filterHtml}
      <table class="table">
        <thead>
          <tr>
            ${headerHtml}
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const form = section.querySelector('form');
  const cancelBtn = section.querySelector('[data-action="cancel"]');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleListSubmit(config, form, cancelBtn);
  });

  cancelBtn.addEventListener('click', () => resetListForm(form, cancelBtn));

  if (config.sectionId === 'deliveryZones') {
    const bulkBtn = section.querySelector('#zonesBulkBtn');
    const templateBtn = section.querySelector('#zonesTemplateBtn');
    const fileInput = section.querySelector('#zonesBulkInput');
    if (bulkBtn && fileInput) {
      bulkBtn.addEventListener('click', () => fileInput.click());
    }
    if (templateBtn) {
      templateBtn.addEventListener('click', () => downloadDeliveryZoneTemplate());
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        handleBulkImportZonesFile(file);
        e.target.value = '';
      });
    }
  }

  if (config.sectionId === 'customers') {
    const filterSelect = section.querySelector('#customerZoneFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        state.customerFilters.zoneId = e.target.value;
        renderListSection(config);
      });
      renderCustomerZoneFilter(filterSelect);
    }
  }

  renderListSection(config);
}

function handleListSubmit(config, form, cancelBtn) {
  const data = getFormData(config, form);
  const errorEl = form.querySelector('.form-error');
  if (!data) {
    errorEl.textContent = window.i18n.t('error');
    return;
  }

  errorEl.textContent = '';
  const editId = form.dataset.editId;
  const finalize = () => {
    if (editId) {
      db.ref(`${config.path}/${editId}`).update(data).then(() => {
        resetListForm(form, cancelBtn);
      });
    } else {
      db.ref(config.path).push(data).then(() => {
        resetListForm(form, cancelBtn);
      });
    }
  };

  if (config.sectionId === 'products' && !editId) {
    const branches = state.cache.branches || {};
    const mainBranchEntry = Object.entries(branches).find(([, branch]) => branch.isMain);
    if (mainBranchEntry) {
      const [mainBranchId] = mainBranchEntry;
      data.mainBranchId = mainBranchId;
      data.stockByBranch = { [mainBranchId]: 0 };
    }
  }

  if (config.sectionId === 'branches' && data.isMain) {
    const updates = {};
    const branches = state.cache.branches || {};
    Object.keys(branches).forEach((branchId) => {
      if (!editId || branchId !== editId) {
        updates[`branches/${branchId}/isMain`] = false;
      }
    });
    db.ref().update(updates).then(finalize);
    return;
  }

  finalize();
}

function getFormData(config, form) {
  const payload = {};
  for (const field of config.fields) {
    const input = form.querySelector(`[name="${field.key}"]`);
    if (!input) continue;
    let value = '';
    if (field.type === 'checkbox') {
      value = input.checked;
    } else if (field.type === 'multi-select') {
      value = Array.from(input.selectedOptions)
        .map((opt) => opt.value)
        .filter((val) => val !== '');
    } else {
      value = input.value.trim();
      if (field.type === 'number') {
        value = value === '' ? '' : Number(value);
      }
    }
    if (field.required && (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0))) {
      return null;
    }
    payload[field.key] = value;
  }
  return payload;
}

function resetListForm(form, cancelBtn) {
  form.reset();
  delete form.dataset.editId;
  const submitBtn = form.querySelector('[data-action="submit"]');
  submitBtn.textContent = window.i18n.t('add');
  cancelBtn.classList.add('hidden');
}

function renderListSection(config) {
  const section = document.getElementById(`section-${config.sectionId}`);
  if (!section) return;
  const form = section.querySelector('form');
  const tbody = section.querySelector('tbody');
  const cancelBtn = section.querySelector('[data-action="cancel"]');

  if (config.sectionId === 'customers') {
    const filterSelect = section.querySelector('#customerZoneFilter');
    if (filterSelect) {
      renderCustomerZoneFilter(filterSelect);
    }
  }

  config.fields.forEach((field) => {
    if (field.type === 'select' || field.type === 'multi-select') {
      const select = form.querySelector(`[name="${field.key}"]`);
      if (select) {
        const current = field.type === 'multi-select'
          ? Array.from(select.selectedOptions).map((opt) => opt.value)
          : select.value;
        renderSelectOptions(select, field);
        if (field.type === 'multi-select') {
          Array.from(select.options).forEach((opt) => {
            opt.selected = current.includes(opt.value);
          });
        } else {
          select.value = current;
        }
      }
    }
  });

  const data = state.cache[config.path] || {};
  tbody.innerHTML = '';

  let entries = Object.entries(data);
  if (config.sectionId === 'customers' && state.customerFilters.zoneId !== 'all') {
    entries = entries.filter(([, item]) => item.zoneId === state.customerFilters.zoneId);
  }
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="${config.columns.length + 1}">${window.i18n.t('no_data')}</td>`;
    tbody.appendChild(row);
    return;
  }

  entries.forEach(([id, item]) => {
    const row = document.createElement('tr');
    const cells = config.columns
      .map((col) => {
        if (typeof col === 'string') {
          return `<td>${item[col] || '-'}</td>`;
        }
        if (col.type === 'select') {
          const label = getOptionLabel(col.optionsPath, item[col.key]);
          return `<td>${label}</td>`;
        }
        if (col.type === 'multi-select') {
          const label = getOptionLabels(col.optionsPath, item[col.key]);
          return `<td>${label}</td>`;
        }
        if (col.type === 'localizedName') {
          return `<td>${getLocalizedName(item)}</td>`;
        }
        if (col.type === 'customerLevel') {
          return `<td>${getCustomerLevelLabel(item[col.key])}</td>`;
        }
        if (col.type === 'boolean') {
          return `<td>${getBooleanLabel(!!item[col.key])}</td>`;
        }
        if (col.type === 'date') {
          return `<td>${item[col.key] || '-'}</td>`;
        }
        if (col.type === 'customerCount') {
          const count = countCustomersByZone(id);
          return `<td>${count}</td>`;
        }
        if (col.type === 'number') {
          return `<td>${item[col.key] ?? '-'}</td>`;
        }
        return `<td>${item[col.key] || '-'}</td>`;
      })
      .join('');

    const extraAction = config.sectionId === 'deliveryZones'
      ? `<button class="btn ghost small" data-action="view-customers">${window.i18n.t('view_customers')}</button>`
      : '';
    row.innerHTML = `
      ${cells}
      <td>
        ${extraAction}
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      form.dataset.editId = id;
      config.fields.forEach((field) => {
        const input = form.querySelector(`[name="${field.key}"]`);
        if (input) {
          if (field.type === 'checkbox') {
            input.checked = !!item[field.key];
          } else if (field.type === 'multi-select') {
            const values = Array.isArray(item[field.key]) ? item[field.key] : [];
            Array.from(input.options).forEach((opt) => {
              opt.selected = values.includes(opt.value);
            });
          } else {
            input.value = item[field.key] ?? '';
          }
        }
      });
      const submitBtn = form.querySelector('[data-action="submit"]');
      submitBtn.textContent = window.i18n.t('update');
      cancelBtn.classList.remove('hidden');
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`${config.path}/${id}`).remove();
      }
    });

    if (config.sectionId === 'deliveryZones') {
      row.querySelector('[data-action="view-customers"]').addEventListener('click', () => {
        state.customerFilters.zoneId = id;
        selectSection('customers');
        renderListSection(listConfigs.find((c) => c.sectionId === 'customers'));
      });
    }

    tbody.appendChild(row);
  });
}

function renderSelectOptions(select, field) {
  const optionsPath = field.optionsPath;
  const staticOptions = field.staticOptions;
  const isMulti = field.type === 'multi-select';
  select.innerHTML = '';

  if (!isMulti) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select');
    select.appendChild(placeholder);
  }

  if (staticOptions && staticOptions.length) {
    staticOptions.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = window.i18n.t(opt.labelKey);
      select.appendChild(option);
    });
    return;
  }

  const data = state.cache[optionsPath] || {};
  Object.entries(data).forEach(([id, item]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(item);
    select.appendChild(option);
  });
}

function getOptionLabel(optionsPath, id) {
  if (!id) return '-';
  const data = state.cache[optionsPath] || {};
  return getLocalizedName(data[id]) || id;
}

function getOptionLabels(optionsPath, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return '-';
  return ids.map((id) => getOptionLabel(optionsPath, id)).join(', ');
}

function setupOrdersSection() {
  const section = document.getElementById('section-orders');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t('orders')}</h2>
      <div class="row" style="margin-top: 12px; flex-wrap: wrap;">
        <input id="orderDateFrom" class="input" type="date" style="max-width: 180px;" placeholder="${window.i18n.t('filter_from')}" />
        <input id="orderDateTo" class="input" type="date" style="max-width: 180px;" placeholder="${window.i18n.t('filter_to')}" />
        <select id="orderBranchFilter" class="input" style="max-width: 180px;"></select>
        <select id="orderCashierFilter" class="input" style="max-width: 180px;"></select>
        <select id="orderZoneFilter" class="input" style="max-width: 180px;"></select>
        <input id="orderSearch" class="input" style="max-width: 240px;" placeholder="${window.i18n.t('search_orders')}" />
        <button id="ordersDownloadBtn" class="btn ghost small">${window.i18n.t('orders_download')}</button>
        <button id="ordersPrintBtn" class="btn ghost small">${window.i18n.t('print_invoices')}</button>
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllOrders" /></th>
            <th>${window.i18n.t('invoice_number')}</th>
            <th>${window.i18n.t('customer_name')}</th>
            <th>${window.i18n.t('delivery_zone')}</th>
            <th>${window.i18n.t('customer_phone')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('cashier')}</th>
            <th>${window.i18n.t('branch')}</th>
            <th>${window.i18n.t('net_total')}</th>
            <th>${window.i18n.t('delivery_fee')}</th>
            <th>${window.i18n.t('grand_total')}</th>
            <th>${window.i18n.t('payment_method')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="ordersTable"></tbody>
      </table>
    </div>
  `;

  section.querySelector('#orderBranchFilter').addEventListener('change', (e) => {
    state.orderFilters.branchId = e.target.value;
    renderOrders();
  });
  section.querySelector('#orderCashierFilter').addEventListener('change', (e) => {
    state.orderFilters.cashierId = e.target.value;
    renderOrders();
  });
  section.querySelector('#orderZoneFilter').addEventListener('change', (e) => {
    state.orderFilters.zoneId = e.target.value;
    renderOrders();
  });
  section.querySelector('#orderDateFrom').addEventListener('change', (e) => {
    state.orderFilters.dateFrom = e.target.value;
    renderOrders();
  });
  section.querySelector('#orderDateTo').addEventListener('change', (e) => {
    state.orderFilters.dateTo = e.target.value;
    renderOrders();
  });

  section.querySelector('#orderSearch').addEventListener('input', (e) => {
    state.orderFilters.query = e.target.value.trim().toLowerCase();
    renderOrders();
  });

  section.querySelector('#ordersDownloadBtn').addEventListener('click', () => exportOrders());
  section.querySelector('#ordersPrintBtn').addEventListener('click', () => printOrders());
  section.querySelector('#selectAllOrders').addEventListener('change', (e) => {
    toggleSelectAllOrders(e.target.checked);
  });

  renderOrders();
}

function setupCustomersSection() {
  const section = document.getElementById('section-customers');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('customers')}</h2>
        <button id="customersDownloadBtn" class="btn ghost small">${window.i18n.t('customers_download')}</button>
      </div>
      <div class="row" style="margin-top: 12px; flex-wrap: wrap;">
        <input id="customerSearch" class="input" style="max-width: 220px;" placeholder="${window.i18n.t('search_customer')}" />
        <select id="customerZoneFilter" class="input" style="max-width: 180px;"></select>
        <select id="customerLevelFilter" class="input" style="max-width: 180px;">
          <option value="all">${window.i18n.t('all')}</option>
          <option value="regular">${window.i18n.t('level_regular')}</option>
          <option value="vip">${window.i18n.t('level_vip')}</option>
          <option value="vvip">${window.i18n.t('level_vvip')}</option>
        </select>
        <label class="row" style="gap: 6px;">
          <input type="checkbox" id="customerBlockedOnly" />
          <span>${window.i18n.t('blocked_only')}</span>
        </label>
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllCustomers" /></th>
            <th>${window.i18n.t('customer_name')}</th>
            <th>${window.i18n.t('customer_phone')}</th>
            <th>${window.i18n.t('delivery_zone')}</th>
            <th>${window.i18n.t('last_order')}</th>
            <th>${window.i18n.t('total_orders_label')}</th>
            <th>${window.i18n.t('avg_order_value')}</th>
            <th>${window.i18n.t('avg_order_interval')}</th>
            <th>${window.i18n.t('customer_level')}</th>
            <th>${window.i18n.t('status')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="customersTable"></tbody>
      </table>
    </div>
  `;

  section.querySelector('#customerSearch').addEventListener('input', (e) => {
    state.customerFilters.query = e.target.value.trim().toLowerCase();
    renderCustomersSection();
  });

  section.querySelector('#customerZoneFilter').addEventListener('change', (e) => {
    state.customerFilters.zoneId = e.target.value;
    renderCustomersSection();
  });

  section.querySelector('#customerLevelFilter').addEventListener('change', (e) => {
    state.customerFilters.level = e.target.value;
    renderCustomersSection();
  });

  section.querySelector('#customerBlockedOnly').addEventListener('change', (e) => {
    state.customerFilters.blockedOnly = e.target.checked;
    renderCustomersSection();
  });

  section.querySelector('#customerSearch').value = state.customerFilters.query || '';
  section.querySelector('#customerLevelFilter').value = state.customerFilters.level || 'all';
  section.querySelector('#customerBlockedOnly').checked = state.customerFilters.blockedOnly || false;

  section.querySelector('#customersDownloadBtn').addEventListener('click', () => exportCustomers());
  section.querySelector('#selectAllCustomers').addEventListener('change', (e) => {
    toggleSelectAllCustomers(e.target.checked);
  });

  renderCustomersSection();
}

function setupUnitsSection() {
  const section = document.getElementById('section-units');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('units')}</h2>
        <button id="newUnitBtn" class="btn primary small">${window.i18n.t('new_unit')}</button>
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('name_ar')}</th>
            <th>${window.i18n.t('name_en')}</th>
            <th>${window.i18n.t('products_count')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="unitsTable"></tbody>
      </table>
    </div>
  `;

  section.querySelector('#newUnitBtn').addEventListener('click', () => openUnitModal());
  renderUnitsSection();
}

function setupItemCardSection() {
  const section = document.getElementById('section-itemCards');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h2>${window.i18n.t('item_cards')}</h2>
      </div>
      <div class="grid two" style="margin-top: 12px;">
        <div>
          <label class="tag">${window.i18n.t('selected_item')}</label>
          <div class="row" style="gap: 8px;">
            <input id="itemCardItemName" class="input" readonly />
            <button id="itemCardSelectBtn" class="btn ghost small">${window.i18n.t('select_item')}</button>
          </div>
        </div>
        <div>
          <label class="tag">${window.i18n.t('branch')}</label>
          <select id="itemCardBranch" class="input"></select>
        </div>
        <div>
          <label class="tag">${window.i18n.t('filter_from')}</label>
          <input id="itemCardFrom" class="input" type="date" />
        </div>
        <div>
          <label class="tag">${window.i18n.t('filter_to')}</label>
          <input id="itemCardTo" class="input" type="date" />
        </div>
      </div>
      <div class="row" style="justify-content: flex-end; margin-top: 12px;">
        <button id="itemCardRunBtn" class="btn primary">${window.i18n.t('show_movements')}</button>
      </div>
      <p id="itemCardError" class="helper form-error"></p>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('movement_type')}</th>
            <th>${window.i18n.t('document_number')}</th>
            <th>${window.i18n.t('movement_qty')}</th>
            <th>${window.i18n.t('stock_balance')}</th>
          </tr>
        </thead>
        <tbody id="itemCardMovementsTable"></tbody>
      </table>
    </div>
    <div id="itemCardPicker" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('select_item')}</h3>
          <button id="itemCardPickerClose" class="btn ghost small">×</button>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="itemCardSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_items')}" />
          <button id="itemCardPickerSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="itemCardSearchResults" class="grid two" style="margin-top: 12px;"></div>
      </div>
    </div>
  `;

  bindItemCardSection();
  renderItemCardSection();
}

function bindItemCardSection() {
  const selectBtn = document.getElementById('itemCardSelectBtn');
  const searchBtn = document.getElementById('itemCardRunBtn');
  const branchSelect = document.getElementById('itemCardBranch');
  const fromInput = document.getElementById('itemCardFrom');
  const toInput = document.getElementById('itemCardTo');
  const pickerClose = document.getElementById('itemCardPickerClose');
  const pickerSearchInput = document.getElementById('itemCardSearchInput');
  const pickerSearchBtn = document.getElementById('itemCardPickerSearchBtn');

  if (selectBtn) selectBtn.addEventListener('click', () => openItemCardPicker());
  if (searchBtn) searchBtn.addEventListener('click', () => handleItemCardSearch());
  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      state.itemCard.branchId = branchSelect.value;
    });
  }
  if (fromInput) {
    fromInput.addEventListener('change', () => {
      state.itemCard.fromDate = fromInput.value;
    });
  }
  if (toInput) {
    toInput.addEventListener('change', () => {
      state.itemCard.toDate = toInput.value;
    });
  }
  if (pickerClose) pickerClose.addEventListener('click', () => closeItemCardPicker());
  if (pickerSearchInput) {
    pickerSearchInput.addEventListener('input', () => renderItemCardSearchResults());
    pickerSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleItemCardBarcodeScan();
      }
    });
  }
  if (pickerSearchBtn) pickerSearchBtn.addEventListener('click', () => renderItemCardSearchResults());
}

function renderItemCardSection() {
  if (!state.itemCard) {
    state.itemCard = { item: null, branchId: '', fromDate: '', toDate: '', movements: [] };
  }
  const nameInput = document.getElementById('itemCardItemName');
  const branchSelect = document.getElementById('itemCardBranch');
  const fromInput = document.getElementById('itemCardFrom');
  const toInput = document.getElementById('itemCardTo');

  if (branchSelect) {
    renderBranchOptions(branchSelect);
    if (!state.itemCard.branchId) {
      const mainBranchId = getMainBranchId();
      if (mainBranchId) {
        state.itemCard.branchId = mainBranchId;
      }
    }
    branchSelect.value = state.itemCard.branchId || '';
  }

  if (nameInput) {
    const entry = state.itemCard.item;
    if (entry) {
      const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
      nameInput.value = `${getLocalizedName(entry.item)} (${typeLabel})`;
    } else {
      nameInput.value = '';
    }
  }

  if (fromInput) fromInput.value = state.itemCard.fromDate || '';
  if (toInput) toInput.value = state.itemCard.toDate || '';

  renderItemCardMovements();
}

function openItemCardPicker() {
  const overlay = document.getElementById('itemCardPicker');
  if (!overlay) return;
  const searchInput = document.getElementById('itemCardSearchInput');
  if (searchInput) searchInput.value = '';
  renderItemCardSearchResults();
  overlay.classList.remove('hidden');
}

function closeItemCardPicker() {
  const overlay = document.getElementById('itemCardPicker');
  if (overlay) overlay.classList.add('hidden');
}

function getItemCardEntries() {
  return getAllItems();
}

function handleItemCardBarcodeScan() {
  const searchInput = document.getElementById('itemCardSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getItemCardEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    selectItemCardEntry(match);
    searchInput.value = '';
    renderItemCardSearchResults();
  }
}

function renderItemCardSearchResults() {
  const searchInput = document.getElementById('itemCardSearchInput');
  const results = document.getElementById('itemCardSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = `<p class="helper">${window.i18n.t('search_to_show')}</p>`;
    return;
  }
  const entries = filterItemEntries(getItemCardEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    selectItemCardEntry(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => selectItemCardEntry(entry));
}

function selectItemCardEntry(entry) {
  state.itemCard.item = entry;
  renderItemCardSection();
  closeItemCardPicker();
}

function handleItemCardSearch() {
  const errorEl = document.getElementById('itemCardError');
  if (errorEl) errorEl.textContent = '';
  if (!state.itemCard.item) {
    if (errorEl) errorEl.textContent = window.i18n.t('select_item_prompt');
    return;
  }
  if (!state.itemCard.branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('select_branch_prompt');
    return;
  }
  if (!state.itemCard.fromDate || !state.itemCard.toDate) {
    if (errorEl) errorEl.textContent = window.i18n.t('select_period_prompt');
    return;
  }
  const movements = buildItemCardMovements(
    state.itemCard.item,
    state.itemCard.branchId,
    state.itemCard.fromDate,
    state.itemCard.toDate
  );
  state.itemCard.movements = movements;
  renderItemCardMovements();
}

function buildItemCardMovements(entry, branchId, fromDate, toDate) {
  if (!entry || !branchId) return [];
  const itemId = entry.id;
  const itemType = entry.type;
  const mainBranchId = getMainBranchId();
  const moves = [];

  const addMove = (record, docType, qtyChange, docNumber, typeLabel, date) => {
    moves.push({
      record,
      docType,
      qtyChange: Number(qtyChange || 0),
      docNumber: docNumber || '-',
      typeLabel: typeLabel || '-',
      date: Number(date || 0),
      balance: null
    });
  };

  const isSameItem = (item) => {
    const currentType = normalizeItemType(item);
    const currentId = item?.itemId || item?.id;
    return currentType === itemType && currentId === itemId;
  };

  const issues = state.cache.stockIssue || {};
  Object.entries(issues).forEach(([id, issue]) => {
    const issueBranch = issue.branchId || mainBranchId;
    if (issueBranch !== branchId) return;
    normalizeItems(issue.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...issue };
      const typeLabel = issue.issueType === 'production'
        ? window.i18n.t('issue_production')
        : window.i18n.t('issue_order');
      addMove(record, 'issue', -Number(item.qty || 0), issue.issueNumber, typeLabel, issue.createdAt);
    });
  });

  const transfers = state.cache.transfers || {};
  Object.entries(transfers).forEach(([id, transfer]) => {
    const isFrom = transfer.fromBranchId === branchId;
    const isTo = transfer.toBranchId === branchId;
    if (!isFrom && !isTo) return;
    const direction = isTo ? 1 : -1;
    normalizeItems(transfer.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...transfer };
      addMove(record, 'transfer', direction * Number(item.qty || 0), transfer.transferNumber, window.i18n.t('transfer_action'), transfer.createdAt);
    });
  });

  const cashierTransfers = state.cache.cashierTransfers || {};
  Object.entries(cashierTransfers).forEach(([id, transfer]) => {
    const isFrom = transfer.fromBranchId === branchId;
    const isTo = transfer.toBranchId === branchId;
    if (!isFrom && !isTo) return;
    normalizeItems(transfer.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...transfer };
      if (isFrom) {
        const netQty = ['received', 'partial_received'].includes(transfer.status)
          ? Number(item.receivedQty ?? item.qty ?? 0)
          : Number(item.qty || 0);
        addMove(record, 'cashierTransfer', -Number(netQty || 0), transfer.transferNumber, window.i18n.t('transfer_action'), transfer.createdAt);
      }
      if (isTo && ['received', 'partial_received'].includes(transfer.status)) {
        const receivedQty = Number(item.receivedQty ?? item.qty ?? 0);
        addMove(record, 'cashierTransfer', receivedQty, transfer.transferNumber, window.i18n.t('receive_action'), transfer.receivedAt || transfer.createdAt);
      }
    });
  });

  const stockReturns = state.cache.stockReturn || {};
  Object.entries(stockReturns).forEach(([id, ret]) => {
    const isFrom = ret.fromBranchId === branchId;
    const isTo = ret.toBranchId === branchId;
    if (!isFrom && !isTo) return;
    const direction = isTo ? 1 : -1;
    normalizeItems(ret.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...ret };
      addMove(record, 'stockReturn', direction * Number(item.qty || 0), ret.stockReturnNumber, window.i18n.t('stock_return_voucher'), ret.createdAt);
    });
  });

  const scrapReturns = state.cache.scrapReturn || {};
  Object.entries(scrapReturns).forEach(([id, ret]) => {
    if (ret.branchId !== branchId) return;
    normalizeItems(ret.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...ret };
      addMove(record, 'scrapReturn', -Number(item.qty || 0), ret.scrapReturnNumber, window.i18n.t('scrap_return_voucher'), ret.createdAt);
    });
  });

  const productions = state.cache.production || {};
  Object.entries(productions).forEach(([id, prod]) => {
    if (prod.branchId !== branchId) return;
    if (prod.itemId !== itemId || normalizeItemType(prod) !== itemType) return;
    const record = { id, ...prod };
    addMove(record, 'production', Number(prod.qty || 0), prod.productionNumber, window.i18n.t('production_voucher'), prod.createdAt);
  });

  const inventories = state.cache.inventoryCount || {};
  Object.entries(inventories).forEach(([id, inv]) => {
    if (inv.branchId !== branchId) return;
    normalizeItems(inv.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const previousQty = item.previousQty;
      const qtyChange = previousQty === undefined || previousQty === null
        ? 0
        : Number(item.qty || 0) - Number(previousQty || 0);
      const record = { id, ...inv };
      addMove(record, 'inventory', qtyChange, inv.countNumber, window.i18n.t('inventory_count'), inv.createdAt);
    });
  });

  const receipts = state.cache.purchaseReceipts || {};
  Object.entries(receipts).forEach(([id, receipt]) => {
    if (branchId !== mainBranchId) return;
    const purchase = state.cache.purchases?.[receipt.purchaseId];
    const purchaseNumber = purchase?.purchaseNumber || receipt.purchaseNumber || receipt.purchaseId || id;
    normalizeItems(receipt.items).forEach((item) => {
      if (!isSameItem(item)) return;
      const record = { id, ...receipt, purchaseNumber, receiptNumber: id };
      addMove(record, 'purchaseReceipt', Number(item.qty || 0), purchaseNumber, window.i18n.t('receive_purchases'), receipt.createdAt);
    });
  });

  const itemData = entry.item || getItemDataByType(itemType, itemId);
  let running = itemData ? getItemStock(itemData, branchId) : 0;
  moves.sort((a, b) => (b.date || 0) - (a.date || 0));
  moves.forEach((move) => {
    move.balance = running;
    running -= move.qtyChange;
  });

  const start = fromDate ? new Date(fromDate) : null;
  const end = toDate ? new Date(toDate) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);
  const filtered = moves.filter((move) => {
    if (!start || !end) return true;
    return move.date >= start.getTime() && move.date <= end.getTime();
  });
  return filtered.reverse();
}

function renderItemCardMovements() {
  const table = document.getElementById('itemCardMovementsTable');
  if (!table) return;
  const movements = state.itemCard?.movements || [];
  table.innerHTML = '';
  if (!movements.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  movements.forEach((move, index) => {
    const row = document.createElement('tr');
    const docButton = move.docNumber && move.docNumber !== '-'
      ? `<button class="btn ghost small" data-action="open" data-index="${index}">${move.docNumber}</button>`
      : '-';
    row.innerHTML = `
      <td>${formatDate(move.date)}</td>
      <td>${move.typeLabel || '-'}</td>
      <td>${docButton}</td>
      <td>${formatNumber(move.qtyChange)}</td>
      <td>${formatNumber(move.balance)}</td>
    `;
    row.addEventListener('click', () => openItemCardDocument(move));
    const openBtn = row.querySelector('[data-action="open"]');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openItemCardDocument(move);
      });
    }
    table.appendChild(row);
  });
}

function openItemCardDocument(move) {
  if (!move?.record) return;
  const record = move.record;
  switch (move.docType) {
    case 'issue':
      printIssueReport(record);
      break;
    case 'transfer':
      printTransferReport(record);
      break;
    case 'cashierTransfer':
      printTransferReport(record);
      break;
    case 'stockReturn':
      printStockReturnReport(record);
      break;
    case 'scrapReturn':
      printScrapReturnReport(record);
      break;
    case 'inventory':
      printInventoryReport(record);
      break;
    case 'production':
      printProductionReport(record);
      break;
    case 'purchaseReceipt':
      printPurchaseReceiptReport(record);
      break;
    default:
      break;
  }
}

function setupPendingStockMovesSection() {
  const section = document.getElementById('section-pendingStockMoves');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t('pending_stock_moves')}</h2>
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('name')}</th>
            <th>${window.i18n.t('note')}</th>
            <th>${window.i18n.t('date')}</th>
            <th>${window.i18n.t('status')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="pendingMovesTable"></tbody>
      </table>
    </div>
  `;

  renderPendingStockMoves();
}

function renderPendingStockMoves() {
  const table = document.getElementById('pendingMovesTable');
  if (!table) return;
  const moves = state.cache.pendingStockMoves || {};
  const entries = Object.entries(moves)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach((move) => {
    const status = move.status || 'pending';
    const statusLabel = status === 'approved'
      ? window.i18n.t('approved')
      : status === 'rejected'
        ? window.i18n.t('rejected')
        : window.i18n.t('pending');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${move.name || '-'}</td>
      <td>${move.note || '-'}</td>
      <td>${formatDate(move.createdAt)}</td>
      <td>${statusLabel}</td>
      <td></td>
    `;

    const actionsCell = row.children[4];
    if (status === 'pending') {
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn ghost small';
      approveBtn.textContent = window.i18n.t('approve');
      approveBtn.addEventListener('click', () => handlePendingStockMoveDecision(move, 'approved'));
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn danger small';
      rejectBtn.textContent = window.i18n.t('reject');
      rejectBtn.addEventListener('click', () => handlePendingStockMoveDecision(move, 'rejected'));
      actionsCell.appendChild(approveBtn);
      actionsCell.appendChild(rejectBtn);
    } else {
      actionsCell.textContent = '-';
    }

    table.appendChild(row);
  });
}

function handlePendingStockMoveDecision(move, status) {
  if (!move?.id) return;
  db.ref(`pendingStockMoves/${move.id}`).update({ status, decidedAt: serverTime }).then(() => {
    if (move.type === 'purchase' && move.purchaseId) {
      const purchaseStatus = status === 'approved' ? 'approved' : 'rejected';
      db.ref(`purchases/${move.purchaseId}`).update({ status: purchaseStatus, decidedAt: serverTime });
    }
  });
}

function setupDiscountsSection() {
  const section = document.getElementById('section-discounts');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('discounts')}</h2>
        <div class="row">
          <button id="discountTypeCode" class="btn ghost small">${window.i18n.t('discount_type_code')}</button>
          <button id="discountTypeProduct" class="btn ghost small">${window.i18n.t('discount_type_product')}</button>
        </div>
      </div>
      <form id="discountForm" class="grid two" style="margin-top: 16px;">
        <div id="discountCodeFields" class="grid two" style="grid-column: 1 / -1;">
          <div>
            <label class="tag" for="discountCode">${window.i18n.t('discount_code')}</label>
            <input id="discountCode" class="input" />
          </div>
          <div>
            <label class="tag" for="discountAudience">${window.i18n.t('audience')}</label>
            <select id="discountAudience" class="input"></select>
          </div>
          <div>
            <label class="tag" for="discountStart">${window.i18n.t('start_date')}</label>
            <input id="discountStart" class="input" type="date" />
          </div>
          <div>
            <label class="tag" for="discountEnd">${window.i18n.t('end_date')}</label>
            <input id="discountEnd" class="input" type="date" />
          </div>
          <div>
            <label class="tag" for="discountValueType">${window.i18n.t('value_type')}</label>
            <select id="discountValueType" class="input"></select>
          </div>
          <div>
            <label class="tag" for="discountValue">${window.i18n.t('discount')}</label>
            <input id="discountValue" class="input" type="number" />
          </div>
        </div>

        <div id="discountProductFields" class="grid two hidden" style="grid-column: 1 / -1;">
          <div>
            <label class="tag" for="discountProduct">${window.i18n.t('products')}</label>
            <select id="discountProduct" class="input"></select>
          </div>
          <div>
            <label class="tag" for="discountBatch">${window.i18n.t('production_batch')}</label>
            <select id="discountBatch" class="input"></select>
          </div>
          <div>
            <label class="tag" for="discountDays">${window.i18n.t('days_before_expiry')}</label>
            <input id="discountDays" class="input" type="number" />
          </div>
          <div class="helper" id="discountProductHint"></div>
        </div>

        <div class="row" style="grid-column: 1 / -1; justify-content: space-between;">
          <div class="row">
            <input id="discountActive" type="checkbox" />
            <label class="tag" for="discountActive">${window.i18n.t('active')}</label>
          </div>
          <div class="row">
            <button type="submit" class="btn primary" data-action="submit">${window.i18n.t('save')}</button>
            <button type="button" id="discountCancel" class="btn ghost hidden">${window.i18n.t('cancel')}</button>
          </div>
        </div>
        <p class="helper form-error" id="discountError"></p>
      </form>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('discount')}</th>
            <th>${window.i18n.t('status')}</th>
            <th>${window.i18n.t('usage_count')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="discountsTable"></tbody>
      </table>
    </div>
  `;

  bindDiscountForm();
  renderDiscounts();
}

function setupProductsSection() {
  const section = document.getElementById('section-products');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('products')}</h2>
        <div class="row">
          <button id="newProductBtn" class="btn primary">${window.i18n.t('new_product')}</button>
          <button id="downloadProductsBtn" class="btn ghost">${window.i18n.t('download')}</button>
          <button id="bulkImportBtn" class="btn ghost">${window.i18n.t('bulk_import')}</button>
          <button id="downloadBarcodesBtn" class="btn ghost">${window.i18n.t('download_barcodes')}</button>
          <input id="bulkImportInput" type="file" accept=".xlsx,.xls" class="hidden" />
        </div>
      </div>
      <div class="row" style="margin-top: 12px; flex-wrap: wrap;">
        <select id="productBranchFilter" class="input" style="max-width: 180px;"></select>
        <select id="productCategoryFilter" class="input" style="max-width: 180px;"></select>
        <select id="productStorageFilter" class="input" style="max-width: 180px;"></select>
        <select id="productSort" class="input" style="max-width: 200px;">
          <option value="default">${window.i18n.t('sort_default')}</option>
          <option value="salesDesc">${window.i18n.t('sort_sales_desc')}</option>
          <option value="salesAsc">${window.i18n.t('sort_sales_asc')}</option>
        </select>
        <input id="productSearch" class="input" style="max-width: 220px;" placeholder="${window.i18n.t('search')}" />
      </div>
      <div id="importStatus" class="helper" style="margin-top: 8px;"></div>
      <div class="row" style="margin-top: 8px;">
        <button id="downloadTemplateBtn" class="btn ghost small">${window.i18n.t('download_template')}</button>
        <button id="importConfirmBtn" class="btn ghost small hidden">${window.i18n.t('import_products')}</button>
        <span id="importCounter" class="helper"></span>
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllProducts" /></th>
            <th>${window.i18n.t('product_code')}</th>
            <th>${window.i18n.t('name')}</th>
            <th>${window.i18n.t('price')}</th>
            <th>${window.i18n.t('cost')}</th>
            <th>${window.i18n.t('units')}</th>
            <th>${window.i18n.t('stock_balance')}</th>
            <th>${window.i18n.t('product_categories')}</th>
            <th>${window.i18n.t('storage_locations')}</th>
            <th>${window.i18n.t('min_stock')}</th>
            <th>${window.i18n.t('reorder_point')}</th>
            <th>${window.i18n.t('max_stock')}</th>
            <th>${window.i18n.t('barcode')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="productsTable"></tbody>
      </table>
    </div>
  `;

  bindProductsSection();
  renderProductsSection();
}

function bindProductsSection() {
  const newBtn = document.getElementById('newProductBtn');
  const downloadBtn = document.getElementById('downloadProductsBtn');
  const bulkBtn = document.getElementById('bulkImportBtn');
  const bulkInput = document.getElementById('bulkImportInput');
  const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
  const importConfirmBtn = document.getElementById('importConfirmBtn');
  const selectAll = document.getElementById('selectAllProducts');
  const downloadBarcodesBtn = document.getElementById('downloadBarcodesBtn');

  newBtn.addEventListener('click', () => openProductModal());

  downloadBtn.addEventListener('click', () => exportSelectedProducts());

  bulkBtn.addEventListener('click', () => bulkInput.click());

  bulkInput.addEventListener('change', (e) => handleBulkImportFile(e.target.files[0]));

  downloadTemplateBtn.addEventListener('click', () => downloadProductTemplate());

  importConfirmBtn.addEventListener('click', () => importBulkProducts());

  downloadBarcodesBtn.addEventListener('click', () => downloadBarcodesZip());

  selectAll.addEventListener('change', (e) => toggleSelectAllProducts(e.target.checked));

  document.getElementById('productBranchFilter').addEventListener('change', (e) => {
    state.productFilters.branchId = e.target.value;
    renderProductsSection();
  });
  document.getElementById('productCategoryFilter').addEventListener('change', (e) => {
    state.productFilters.categoryId = e.target.value;
    renderProductsSection();
  });
  document.getElementById('productStorageFilter').addEventListener('change', (e) => {
    state.productFilters.storageLocationId = e.target.value;
    renderProductsSection();
  });
  document.getElementById('productSort').addEventListener('change', (e) => {
    state.productFilters.sortBy = e.target.value;
    renderProductsSection();
  });
  document.getElementById('productSearch').addEventListener('input', (e) => {
    state.productFilters.query = e.target.value.trim();
    renderProductsSection();
  });
}

function renderProductsSection() {
  const table = document.getElementById('productsTable');
  if (!table) return;

  renderProductFilters();
  const products = state.cache.products || {};
  const categories = state.cache.productCategories || {};
  const storageLocations = state.cache.storageLocations || {};
  const branchId = state.productFilters.branchId;
  const salesMap = getSalesMap();

  let entries = Object.entries(products).map(([id, product]) => ({ id, ...product }));
  if (state.productFilters.categoryId !== 'all') {
    entries = entries.filter((item) => item.categoryId === state.productFilters.categoryId);
  }
  if (state.productFilters.storageLocationId !== 'all') {
    entries = entries.filter((item) => item.storageLocationId === state.productFilters.storageLocationId);
  }
  if (state.productFilters.query) {
    entries = entries.filter((item) => {
      const name = `${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''}`.toLowerCase();
      const code = normalizeSearchValue(item.code || '');
      const barcode = normalizeSearchValue(item.barcode || '');
      const queryRaw = state.productFilters.query;
      const query = normalizeSearchValue(queryRaw);
      return name.includes(String(queryRaw || '').toLowerCase()) || code.includes(query) || barcode.includes(query);
    });
  }

  if (state.productFilters.sortBy === 'salesDesc') {
    entries.sort((a, b) => (salesMap[b.id] || 0) - (salesMap[a.id] || 0));
  } else if (state.productFilters.sortBy === 'salesAsc') {
    entries.sort((a, b) => (salesMap[a.id] || 0) - (salesMap[b.id] || 0));
  }

  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="14">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach((product) => {
    const stock = getProductStock(product, branchId);
    const reorderPoint = Number(product.reorderPoint || 0);
    const warningClass = getReorderClass(stock, reorderPoint);
    const row = document.createElement('tr');
    row.className = warningClass;
    row.innerHTML = `
      <td><input type="checkbox" data-id="${product.id}" ${state.selectedProducts.has(product.id) ? 'checked' : ''} /></td>
      <td>${product.code || '-'}</td>
      <td>${getLocalizedName(product)}</td>
      <td>${formatNumber(product.price)}</td>
      <td>${formatNumber(product.cost)}</td>
      <td>${formatUnitWithDefinition(product.unitId, product.unitDefinitionQty, product.unitDefinitionUnitId)}</td>
      <td>${formatNumber(stock)}</td>
      <td>${getLocalizedName(categories[product.categoryId]) || '-'}</td>
      <td>${getLocalizedName(storageLocations[product.storageLocationId]) || '-'}</td>
      <td>${formatNumber(product.minStock)}</td>
      <td>${formatNumber(product.reorderPoint)}</td>
      <td>${formatNumber(product.maxStock)}</td>
      <td>
        <div class="row">
          <canvas class="barcode-canvas" data-barcode="${product.barcode || ''}" height="40"></canvas>
          <button class="btn ghost small" data-action="download-barcode">${window.i18n.t('download')}</button>
        </div>
      </td>
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedProducts.add(product.id);
      } else {
        state.selectedProducts.delete(product.id);
      }
    });

    row.querySelector('[data-action="edit"]').addEventListener('click', () => openProductModal(product));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`products/${product.id}`).remove();
      }
    });

    const barcodeCanvas = row.querySelector('.barcode-canvas');
    if (barcodeCanvas && product.barcode && typeof JsBarcode !== 'undefined') {
      JsBarcode(barcodeCanvas, product.barcode, { format: 'CODE128', displayValue: false, height: 30, width: 1.2 });
    }

    row.querySelector('[data-action="download-barcode"]').addEventListener('click', () => {
      if (typeof JsBarcode === 'undefined') return;
      const value = product.barcode || '';
      if (!value) return;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
      canvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${product.nameAr || product.nameEn || product.code || value}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      });
    });

    table.appendChild(row);
  });

  const selectAll = document.getElementById('selectAllProducts');
  if (selectAll) {
    const allSelected = entries.every((product) => state.selectedProducts.has(product.id));
    selectAll.checked = allSelected && entries.length > 0;
  }
}

function renderProductFilters() {
  const branchSelect = document.getElementById('productBranchFilter');
  const categorySelect = document.getElementById('productCategoryFilter');
  const storageSelect = document.getElementById('productStorageFilter');
  if (!branchSelect || !categorySelect || !storageSelect) return;

  const branches = state.cache.branches || {};
  const categories = state.cache.productCategories || {};
  const storageLocations = state.cache.storageLocations || {};

  branchSelect.innerHTML = '';
  const branchAll = document.createElement('option');
  branchAll.value = 'all';
  branchAll.textContent = window.i18n.t('all_branches');
  branchSelect.appendChild(branchAll);
  Object.entries(branches).forEach(([id, branch]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(branch);
    branchSelect.appendChild(option);
  });
  branchSelect.value = state.productFilters.branchId;

  categorySelect.innerHTML = '';
  const categoryAll = document.createElement('option');
  categoryAll.value = 'all';
  categoryAll.textContent = window.i18n.t('all_categories');
  categorySelect.appendChild(categoryAll);
  Object.entries(categories).forEach(([id, category]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(category);
    categorySelect.appendChild(option);
  });
  categorySelect.value = state.productFilters.categoryId;

  storageSelect.innerHTML = '';
  const storageAll = document.createElement('option');
  storageAll.value = 'all';
  storageAll.textContent = window.i18n.t('all_storage_locations');
  storageSelect.appendChild(storageAll);
  Object.entries(storageLocations).forEach(([id, location]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(location);
    storageSelect.appendChild(option);
  });
  storageSelect.value = state.productFilters.storageLocationId;
}

function setupStockMaterialsSection() {
  const section = document.getElementById('section-stockMaterials');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('stock_materials')}</h2>
        <div class="row">
          <button id="newMaterialBtn" class="btn primary">${window.i18n.t('new_product')}</button>
          <button id="downloadMaterialsBtn" class="btn ghost">${window.i18n.t('download')}</button>
          <button id="bulkImportMaterialsBtn" class="btn ghost">${window.i18n.t('bulk_import')}</button>
          <button id="downloadMaterialBarcodesBtn" class="btn ghost">${window.i18n.t('download_barcodes')}</button>
          <input id="materialBulkInput" type="file" accept=".xlsx,.xls" class="hidden" />
        </div>
      </div>
      <div class="row" style="margin-top: 12px; flex-wrap: wrap;">
        <select id="materialBranchFilter" class="input" style="max-width: 180px;"></select>
        <select id="materialCategoryFilter" class="input" style="max-width: 200px;"></select>
        <select id="materialStorageFilter" class="input" style="max-width: 200px;"></select>
        <input id="materialSearch" class="input" style="max-width: 220px;" placeholder="${window.i18n.t('search')}" />
      </div>
      <div id="materialImportStatus" class="helper" style="margin-top: 8px;"></div>
      <div class="row" style="margin-top: 8px;">
        <button id="materialDownloadTemplateBtn" class="btn ghost small">${window.i18n.t('download_template')}</button>
        <button id="materialImportConfirmBtn" class="btn ghost small hidden">${window.i18n.t('import_products')}</button>
        <span id="materialImportCounter" class="helper"></span>
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllMaterials" /></th>
            <th>${window.i18n.t('product_code')}</th>
            <th>${window.i18n.t('name')}</th>
            <th>${window.i18n.t('cost')}</th>
            <th>${window.i18n.t('units')}</th>
            <th>${window.i18n.t('stock_balance')}</th>
            <th>${window.i18n.t('material_categories')}</th>
            <th>${window.i18n.t('storage_locations')}</th>
            <th>${window.i18n.t('min_stock')}</th>
            <th>${window.i18n.t('reorder_point')}</th>
            <th>${window.i18n.t('max_stock')}</th>
            <th>${window.i18n.t('barcode')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="stockMaterialsTable"></tbody>
      </table>
    </div>
  `;

  bindStockMaterialsSection();
  renderStockMaterialsSection();
}

function bindStockMaterialsSection() {
  const newBtn = document.getElementById('newMaterialBtn');
  const downloadBtn = document.getElementById('downloadMaterialsBtn');
  const bulkBtn = document.getElementById('bulkImportMaterialsBtn');
  const bulkInput = document.getElementById('materialBulkInput');
  const downloadTemplateBtn = document.getElementById('materialDownloadTemplateBtn');
  const importConfirmBtn = document.getElementById('materialImportConfirmBtn');
  const selectAll = document.getElementById('selectAllMaterials');
  const downloadBarcodesBtn = document.getElementById('downloadMaterialBarcodesBtn');

  newBtn.addEventListener('click', () => openMaterialModal());
  downloadBtn.addEventListener('click', () => exportSelectedStockMaterials());
  bulkBtn.addEventListener('click', () => bulkInput.click());
  bulkInput.addEventListener('change', (e) => handleBulkImportMaterialsFile(e.target.files[0]));
  downloadTemplateBtn.addEventListener('click', () => downloadMaterialTemplate());
  importConfirmBtn.addEventListener('click', () => importBulkStockMaterials());
  downloadBarcodesBtn.addEventListener('click', () => downloadMaterialBarcodesZip());
  selectAll.addEventListener('change', (e) => toggleSelectAllStockMaterials(e.target.checked));

  document.getElementById('materialBranchFilter').addEventListener('change', (e) => {
    state.materialFilters.branchId = e.target.value;
    renderStockMaterialsSection();
  });
  document.getElementById('materialCategoryFilter').addEventListener('change', (e) => {
    state.materialFilters.categoryId = e.target.value;
    renderStockMaterialsSection();
  });
  document.getElementById('materialStorageFilter').addEventListener('change', (e) => {
    state.materialFilters.storageLocationId = e.target.value;
    renderStockMaterialsSection();
  });
  document.getElementById('materialSearch').addEventListener('input', (e) => {
    state.materialFilters.query = e.target.value.trim();
    renderStockMaterialsSection();
  });
}

function renderStockMaterialsSection() {
  const table = document.getElementById('stockMaterialsTable');
  if (!table) return;

  renderMaterialFilters();
  const materials = state.cache.stockMaterials || {};
  const categories = state.cache.materialCategories || {};
  const storageLocations = state.cache.storageLocations || {};
  const branchId = state.materialFilters.branchId;

  let entries = Object.entries(materials).map(([id, material]) => ({ id, ...material }));
  if (state.materialFilters.categoryId !== 'all') {
    entries = entries.filter((item) => item.categoryId === state.materialFilters.categoryId);
  }
  if (state.materialFilters.storageLocationId !== 'all') {
    entries = entries.filter((item) => item.storageLocationId === state.materialFilters.storageLocationId);
  }
  if (state.materialFilters.query) {
    entries = entries.filter((item) => {
      const name = `${item.nameAr || ''} ${item.nameEn || ''} ${item.name || ''}`.toLowerCase();
      const code = normalizeSearchValue(item.code || '');
      const barcode = normalizeSearchValue(item.barcode || '');
      const queryRaw = state.materialFilters.query;
      const query = normalizeSearchValue(queryRaw);
      return name.includes(String(queryRaw || '').toLowerCase()) || code.includes(query) || barcode.includes(query);
    });
  }

  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="13">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach((material) => {
    const stock = getItemStock(material, branchId);
    const reorderPoint = Number(material.reorderPoint || 0);
    const warningClass = getReorderClass(stock, reorderPoint);
    const row = document.createElement('tr');
    row.className = warningClass;
    row.innerHTML = `
      <td><input type="checkbox" data-id="${material.id}" ${state.selectedStockMaterials.has(material.id) ? 'checked' : ''} /></td>
      <td>${material.code || '-'}</td>
      <td>${getLocalizedName(material)}</td>
      <td>${formatNumber(material.cost)}</td>
      <td>${formatUnitWithDefinition(material.unitId, material.unitDefinitionQty, material.unitDefinitionUnitId)}</td>
      <td>${formatNumber(stock)}</td>
      <td>${getLocalizedName(categories[material.categoryId]) || '-'}</td>
      <td>${getLocalizedName(storageLocations[material.storageLocationId]) || '-'}</td>
      <td>${formatNumber(material.minStock)}</td>
      <td>${formatNumber(material.reorderPoint)}</td>
      <td>${formatNumber(material.maxStock)}</td>
      <td>
        <div class="row">
          <canvas class="barcode-canvas" data-barcode="${material.barcode || ''}" height="40"></canvas>
          <button class="btn ghost small" data-action="download-barcode">${window.i18n.t('download')}</button>
        </div>
      </td>
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedStockMaterials.add(material.id);
      } else {
        state.selectedStockMaterials.delete(material.id);
      }
    });

    row.querySelector('[data-action="edit"]').addEventListener('click', () => openMaterialModal(material));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`stockMaterials/${material.id}`).remove();
      }
    });

    const barcodeCanvas = row.querySelector('.barcode-canvas');
    if (barcodeCanvas && material.barcode && typeof JsBarcode !== 'undefined') {
      JsBarcode(barcodeCanvas, material.barcode, { format: 'CODE128', displayValue: false, height: 30, width: 1.2 });
    }

    row.querySelector('[data-action="download-barcode"]').addEventListener('click', () => {
      if (typeof JsBarcode === 'undefined') return;
      const value = material.barcode || '';
      if (!value) return;
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
      canvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${material.nameAr || material.nameEn || material.code || value}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      });
    });

    table.appendChild(row);
  });

  const selectAll = document.getElementById('selectAllMaterials');
  if (selectAll) {
    const allSelected = entries.every((material) => state.selectedStockMaterials.has(material.id));
    selectAll.checked = allSelected && entries.length > 0;
  }
}

function renderMaterialFilters() {
  const branchSelect = document.getElementById('materialBranchFilter');
  const categorySelect = document.getElementById('materialCategoryFilter');
  const storageSelect = document.getElementById('materialStorageFilter');
  if (!branchSelect || !categorySelect || !storageSelect) return;

  const branches = state.cache.branches || {};
  const categories = state.cache.materialCategories || {};
  const storageLocations = state.cache.storageLocations || {};

  branchSelect.innerHTML = '';
  const branchAll = document.createElement('option');
  branchAll.value = 'all';
  branchAll.textContent = window.i18n.t('all_branches');
  branchSelect.appendChild(branchAll);
  Object.entries(branches).forEach(([id, branch]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(branch);
    branchSelect.appendChild(option);
  });
  branchSelect.value = state.materialFilters.branchId;

  categorySelect.innerHTML = '';
  const categoryAll = document.createElement('option');
  categoryAll.value = 'all';
  categoryAll.textContent = window.i18n.t('all_categories');
  categorySelect.appendChild(categoryAll);
  Object.entries(categories).forEach(([id, category]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(category);
    categorySelect.appendChild(option);
  });
  categorySelect.value = state.materialFilters.categoryId;

  storageSelect.innerHTML = '';
  const storageAll = document.createElement('option');
  storageAll.value = 'all';
  storageAll.textContent = window.i18n.t('all_storage_locations');
  storageSelect.appendChild(storageAll);
  Object.entries(storageLocations).forEach(([id, location]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(location);
    storageSelect.appendChild(option);
  });
  storageSelect.value = state.materialFilters.storageLocationId;
}

function openMaterialModal(material = null) {
  if (!els.materialModal) return;
  const form = els.materialForm;
  form.reset();
  delete form.dataset.editId;
  els.materialError.textContent = '';

  const codeInput = document.getElementById('materialCode');
  const barcodeInput = document.getElementById('materialBarcode');
  const unitSelect = document.getElementById('materialUnit');

  renderSelectOptions(unitSelect, { type: 'select', optionsPath: 'units' });

  if (material) {
    form.dataset.editId = material.id;
    codeInput.value = material.code || '';
    barcodeInput.value = material.barcode || '';
    document.getElementById('materialNameAr').value = material.nameAr || material.name || '';
    document.getElementById('materialNameEn').value = material.nameEn || '';
    document.getElementById('materialCost').value = material.cost ?? '';
    unitSelect.value = material.unitId || '';
    document.getElementById('materialOpeningQty').value = material.openingQty ?? '';
    document.getElementById('materialMinStock').value = material.minStock ?? '';
    document.getElementById('materialReorderPoint').value = material.reorderPoint ?? '';
    document.getElementById('materialMaxStock').value = material.maxStock ?? '';
  } else {
    codeInput.value = generateMaterialCode();
    barcodeInput.value = generateBarcodeValue();
  }

  setupUnitDefinitionControls('material', material);

  renderMaterialBarcodePreview();
  els.materialModal.classList.remove('hidden');

  document.getElementById('generateMaterialBarcode').onclick = () => {
    barcodeInput.value = generateBarcodeValue();
    renderMaterialBarcodePreview();
  };

  barcodeInput.oninput = () => renderMaterialBarcodePreview();

  document.getElementById('downloadMaterialBarcode').onclick = () => downloadMaterialBarcodeImage(barcodeInput.value, codeInput.value);

  form.onsubmit = (e) => {
    e.preventDefault();
    saveMaterial();
  };
}

function closeMaterialModal() {
  if (els.materialModal) {
    els.materialModal.classList.add('hidden');
  }
}

function saveMaterial() {
  const form = els.materialForm;
  const editId = form.dataset.editId;
  const rawCode = document.getElementById('materialCode').value.trim();
  const barcode = document.getElementById('materialBarcode').value.trim();
  const nameAr = document.getElementById('materialNameAr').value.trim();
  const nameEn = document.getElementById('materialNameEn').value.trim();
  const cost = Number(document.getElementById('materialCost').value || 0);
  const unitId = document.getElementById('materialUnit').value;
  const unitDefinitionQtyRaw = document.getElementById('materialUnitDefinitionQty')?.value.trim() || '';
  const unitDefinitionUnitId = document.getElementById('materialUnitDefinitionUnit')?.value || '';
  const openingQty = Number(document.getElementById('materialOpeningQty').value || 0);
  const minStock = Number(document.getElementById('materialMinStock').value || 0);
  const reorderPoint = Number(document.getElementById('materialReorderPoint').value || 0);
  const maxStock = Number(document.getElementById('materialMaxStock').value || 0);

  if (!nameAr || !nameEn || !unitId) {
    els.materialError.textContent = window.i18n.t('error');
    return;
  }
  if ((unitDefinitionQtyRaw && !unitDefinitionUnitId) || (!unitDefinitionQtyRaw && unitDefinitionUnitId)) {
    els.materialError.textContent = window.i18n.t('error');
    return;
  }
  const unitDefinitionQty = unitDefinitionQtyRaw && unitDefinitionUnitId ? unitDefinitionQtyRaw : null;
  const unitDefinitionUnitIdFinal = unitDefinitionQtyRaw && unitDefinitionUnitId ? unitDefinitionUnitId : null;

  const payload = {
    code: editId ? rawCode : normalizeCode(rawCode, 'SK'),
    barcode,
    nameAr,
    nameEn,
    cost,
    unitId,
    unitDefinitionQty,
    unitDefinitionUnitId: unitDefinitionUnitIdFinal,
    openingQty,
    minStock,
    reorderPoint,
    maxStock
  };

  if (editId) {
    db.ref(`stockMaterials/${editId}`).update(payload).then(() => {
      closeMaterialModal();
    });
  } else {
    const mainBranchId = getMainBranchId();
    payload.mainBranchId = mainBranchId;
    payload.stockByBranch = mainBranchId ? { [mainBranchId]: openingQty } : {};
    db.ref('stockMaterials').push(payload).then(() => {
      closeMaterialModal();
    });
  }
}

function renderMaterialBarcodePreview() {
  const value = document.getElementById('materialBarcode').value.trim();
  const canvas = document.getElementById('materialBarcodePreview');
  if (!canvas || !value || typeof JsBarcode === 'undefined') return;
  JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
}

function downloadMaterialBarcodeImage(value, code) {
  const canvas = document.getElementById('materialBarcodePreview');
  if (!canvas) return;
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${code || value}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function toggleSelectAllStockMaterials(checked) {
  const table = document.getElementById('stockMaterialsTable');
  if (!table) return;
  table.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = checked;
    const id = checkbox.dataset.id;
    if (checked) {
      state.selectedStockMaterials.add(id);
    } else {
      state.selectedStockMaterials.delete(id);
    }
  });
}

function exportSelectedStockMaterials() {
  const materials = state.cache.stockMaterials || {};
  const selected = Array.from(state.selectedStockMaterials).map((id) => materials[id]).filter(Boolean);
  if (selected.length === 0) return;
  if (typeof XLSX === 'undefined') return;

  const data = selected.map((material) => ({
    code: material.code,
    nameAr: material.nameAr,
    nameEn: material.nameEn,
    cost: material.cost,
    unitId: material.unitId,
    openingQty: material.openingQty,
    minStock: material.minStock,
    reorderPoint: material.reorderPoint,
    maxStock: material.maxStock,
    barcode: material.barcode,
    categoryId: material.categoryId || '',
    storageLocationId: material.storageLocationId || ''
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'StockMaterials');
  XLSX.writeFile(workbook, 'stock-materials.xlsx');
}

const productImportMap = {
  'الاسم بالعربي': 'nameAr',
  'الاسم بالانجليزي': 'nameEn',
  'التكلفة': 'cost',
  'سعر البيع': 'price',
  'الوحدة': 'unitId',
  'الرصيد الافتتاحي': 'openingQty',
  'الحد الادنى للطلب': 'minStock',
  'نقطة اعادة الطلب': 'reorderPoint',
  'الحد الأعلى للطلب': 'maxStock',
  'الباركود': 'barcode',
  'رمز المنتج': 'code'
};

const materialImportMap = {
  'الاسم بالعربي': 'nameAr',
  'الاسم بالانجليزي': 'nameEn',
  'التكلفة': 'cost',
  'الوحدة': 'unitId',
  'الرصيد الافتتاحي': 'openingQty',
  'الحد الادنى للطلب': 'minStock',
  'نقطة اعادة الطلب': 'reorderPoint',
  'الحد الأعلى للطلب': 'maxStock',
  'الباركود': 'barcode',
  'معرف التصنيف': 'categoryId',
  'التصنيف': 'categoryId'
};

const deliveryZoneImportMap = {
  'الاسم بالعربي': 'nameAr',
  'الاسم بالانجليزي': 'nameEn'
};

function mapImportRow(row, mapping) {
  const mapped = {};
  let usedMapping = false;
  Object.entries(mapping).forEach(([label, key]) => {
    if (Object.prototype.hasOwnProperty.call(row, label)) {
      mapped[key] = row[label];
      usedMapping = true;
    }
  });
  if (!usedMapping) return row;
  Object.entries(row).forEach(([key, value]) => {
    if (!mapping[key]) {
      mapped[key] = value;
    }
  });
  return mapped;
}

function downloadDeliveryZoneTemplate() {
  if (typeof XLSX === 'undefined') return;
  const useArabic = window.i18n.getLanguage() === 'ar';
  const template = [
    {
      [useArabic ? 'الاسم بالعربي' : 'nameAr']: '',
      [useArabic ? 'الاسم بالانجليزي' : 'nameEn']: ''
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'delivery-zones-template.xlsx');
}

function handleBulkImportZonesFile(file) {
  const statusEl = document.getElementById('zonesBulkStatus');
  if (statusEl) statusEl.textContent = '';
  if (!file || typeof XLSX === 'undefined') return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const mapped = rows.map((row) => mapImportRow(row, deliveryZoneImportMap));
    const filtered = mapped.filter((row) => row.nameAr || row.nameEn);
    if (statusEl) statusEl.textContent = `${window.i18n.t('import_loaded')} ${filtered.length}`;
    importBulkDeliveryZones(filtered).then(() => {
      if (statusEl) statusEl.textContent = window.i18n.t('success');
    });
  };
  reader.readAsArrayBuffer(file);
}

function importBulkDeliveryZones(rows) {
  if (!rows || rows.length === 0) return Promise.resolve();
  const tasks = rows.map((row) => {
    const nameAr = String(row.nameAr || '').trim();
    const nameEn = String(row.nameEn || '').trim();
    if (!nameAr && !nameEn) return Promise.resolve();
    return db.ref('deliveryZones').push({ nameAr, nameEn });
  });
  return Promise.all(tasks);
}

function downloadMaterialTemplate() {
  if (typeof XLSX === 'undefined') return;
  const useArabic = window.i18n.getLanguage() === 'ar';
  const template = [
    {
      [useArabic ? 'الاسم بالعربي' : 'nameAr']: '',
      [useArabic ? 'الاسم بالانجليزي' : 'nameEn']: '',
      [useArabic ? 'التكلفة' : 'cost']: '',
      [useArabic ? 'الوحدة' : 'unitId']: '',
      [useArabic ? 'الرصيد الافتتاحي' : 'openingQty']: '',
      [useArabic ? 'الحد الادنى للطلب' : 'minStock']: '',
      [useArabic ? 'نقطة اعادة الطلب' : 'reorderPoint']: '',
      [useArabic ? 'الحد الأعلى للطلب' : 'maxStock']: '',
      [useArabic ? 'الباركود' : 'barcode']: '',
      [useArabic ? 'معرف التصنيف' : 'categoryId']: ''
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'stock-materials-template.xlsx');
}

function handleBulkImportMaterialsFile(file) {
  if (!file || typeof XLSX === 'undefined') return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    state.importedStockMaterials = rows.map((row) => mapImportRow(row, materialImportMap));
    document.getElementById('materialImportStatus').textContent = `${window.i18n.t('import_loaded')} ${rows.length}`;
    document.getElementById('materialImportConfirmBtn').classList.remove('hidden');
    document.getElementById('materialImportCounter').textContent = '';
  };
  reader.readAsArrayBuffer(file);
}

function importBulkStockMaterials() {
  const rows = state.importedStockMaterials;
  if (!rows || rows.length === 0) return;
  const mainBranchId = getMainBranchId();
  let imported = 0;
  rows.forEach((row) => {
    const payload = {
      code: normalizeCode(row.code, 'SK'),
      barcode: row.barcode || generateBarcodeValue(),
      nameAr: row.nameAr || '',
      nameEn: row.nameEn || '',
      cost: Number(row.cost || 0),
      unitId: row.unitId || '',
      openingQty: Number(row.openingQty || 0),
      minStock: Number(row.minStock || 0),
      reorderPoint: Number(row.reorderPoint || 0),
      maxStock: Number(row.maxStock || 0),
      categoryId: row.categoryId || null,
      mainBranchId,
      stockByBranch: mainBranchId ? { [mainBranchId]: Number(row.openingQty || 0) } : {}
    };
    db.ref('stockMaterials').push(payload).then(() => {
      imported += 1;
      document.getElementById('materialImportCounter').textContent = `${imported} / ${rows.length}`;
      if (imported === rows.length) {
        document.getElementById('materialImportStatus').textContent = `${window.i18n.t('success')}`;
        document.getElementById('materialImportConfirmBtn').classList.add('hidden');
      }
    });
  });
}

async function downloadMaterialBarcodesZip() {
  if (typeof JSZip === 'undefined' || typeof JsBarcode === 'undefined') return;
  const materials = state.cache.stockMaterials || {};
  const selected = Array.from(state.selectedStockMaterials).map((id) => materials[id]).filter(Boolean);
  if (selected.length === 0) return;

  const zip = new JSZip();
  for (const material of selected) {
    const value = material.barcode || generateBarcodeValue();
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const name = (material.nameAr || material.nameEn || material.code || value).replace(/[\\/:*?\"<>|]/g, '-');
    zip.file(`${name}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = 'material-barcodes.zip';
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupUnitDefinitionControls(prefix, item) {
  const unitSelect = document.getElementById(`${prefix}Unit`);
  const wrap = document.getElementById(`${prefix}UnitDefinitionWrap`);
  const toggle = document.getElementById(`${prefix}UnitDefinitionToggle`);
  const fields = document.getElementById(`${prefix}UnitDefinitionFields`);
  const qtyInput = document.getElementById(`${prefix}UnitDefinitionQty`);
  const unitSelectDef = document.getElementById(`${prefix}UnitDefinitionUnit`);
  if (!unitSelect || !wrap || !toggle || !fields || !qtyInput || !unitSelectDef) return;

  renderSelectOptions(unitSelectDef, { type: 'select', optionsPath: 'units' });

  const definitionQty = item?.unitDefinitionQty ?? '';
  const definitionUnitId = item?.unitDefinitionUnitId ?? '';

  qtyInput.value = definitionQty || '';
  unitSelectDef.value = definitionUnitId || '';

  if (unitSelect.value) {
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }

  if (definitionQty || definitionUnitId) {
    fields.classList.remove('hidden');
  } else {
    fields.classList.add('hidden');
  }

  unitSelect.onchange = () => {
    if (!unitSelect.value) {
      wrap.classList.add('hidden');
      fields.classList.add('hidden');
      qtyInput.value = '';
      unitSelectDef.value = '';
      return;
    }
    wrap.classList.remove('hidden');
  };

  toggle.onclick = () => {
    const isHidden = fields.classList.contains('hidden');
    if (isHidden) {
      fields.classList.remove('hidden');
      qtyInput.focus();
    } else {
      fields.classList.add('hidden');
      qtyInput.value = '';
      unitSelectDef.value = '';
    }
  };
}

function openProductModal(product = null) {
  if (!els.productModal) return;
  const form = els.productForm;
  form.reset();
  delete form.dataset.editId;
  els.productError.textContent = '';

  const codeInput = document.getElementById('productCode');
  const barcodeInput = document.getElementById('productBarcode');
  const unitSelect = document.getElementById('productUnit');

  renderSelectOptions(unitSelect, { type: 'select', optionsPath: 'units' });

  if (product) {
    form.dataset.editId = product.id;
    codeInput.value = product.code || '';
    barcodeInput.value = product.barcode || '';
    document.getElementById('productNameAr').value = product.nameAr || '';
    document.getElementById('productNameEn').value = product.nameEn || '';
    document.getElementById('productCost').value = product.cost ?? '';
    document.getElementById('productPrice').value = product.price ?? '';
    unitSelect.value = product.unitId || '';
    document.getElementById('productOpeningQty').value = product.openingQty ?? '';
    document.getElementById('productMinStock').value = product.minStock ?? '';
    document.getElementById('productReorderPoint').value = product.reorderPoint ?? '';
    document.getElementById('productMaxStock').value = product.maxStock ?? '';
  } else {
    codeInput.value = generateProductCode();
    barcodeInput.value = generateBarcodeValue();
  }

  setupUnitDefinitionControls('product', product);

  renderBarcodePreview();
  els.productModal.classList.remove('hidden');

  document.getElementById('generateBarcode').onclick = () => {
    barcodeInput.value = generateBarcodeValue();
    renderBarcodePreview();
  };

  barcodeInput.oninput = () => renderBarcodePreview();

  document.getElementById('downloadBarcode').onclick = () => downloadBarcodeImage(barcodeInput.value, codeInput.value);

  form.onsubmit = (e) => {
    e.preventDefault();
    saveProduct();
  };
}

function closeProductModal() {
  if (els.productModal) {
    els.productModal.classList.add('hidden');
  }
}

function saveProduct() {
  const form = els.productForm;
  const editId = form.dataset.editId;
  const rawCode = document.getElementById('productCode').value.trim();
  const barcode = document.getElementById('productBarcode').value.trim();
  const nameAr = document.getElementById('productNameAr').value.trim();
  const nameEn = document.getElementById('productNameEn').value.trim();
  const cost = Number(document.getElementById('productCost').value || 0);
  const price = Number(document.getElementById('productPrice').value || 0);
  const unitId = document.getElementById('productUnit').value;
  const unitDefinitionQtyRaw = document.getElementById('productUnitDefinitionQty')?.value.trim() || '';
  const unitDefinitionUnitId = document.getElementById('productUnitDefinitionUnit')?.value || '';
  const openingQty = Number(document.getElementById('productOpeningQty').value || 0);
  const minStock = Number(document.getElementById('productMinStock').value || 0);
  const reorderPoint = Number(document.getElementById('productReorderPoint').value || 0);
  const maxStock = Number(document.getElementById('productMaxStock').value || 0);

  if (!nameAr || !nameEn || !unitId) {
    els.productError.textContent = window.i18n.t('error');
    return;
  }
  if ((unitDefinitionQtyRaw && !unitDefinitionUnitId) || (!unitDefinitionQtyRaw && unitDefinitionUnitId)) {
    els.productError.textContent = window.i18n.t('error');
    return;
  }
  const unitDefinitionQty = unitDefinitionQtyRaw && unitDefinitionUnitId ? unitDefinitionQtyRaw : null;
  const unitDefinitionUnitIdFinal = unitDefinitionQtyRaw && unitDefinitionUnitId ? unitDefinitionUnitId : null;

  const payload = {
    code: editId ? rawCode : normalizeCode(rawCode, 'FG'),
    barcode,
    nameAr,
    nameEn,
    cost,
    price,
    unitId,
    unitDefinitionQty,
    unitDefinitionUnitId: unitDefinitionUnitIdFinal,
    openingQty,
    minStock,
    reorderPoint,
    maxStock
  };

  if (editId) {
    db.ref(`products/${editId}`).update(payload).then(() => {
      closeProductModal();
    });
  } else {
    const mainBranchId = getMainBranchId();
    payload.mainBranchId = mainBranchId;
    payload.stockByBranch = mainBranchId ? { [mainBranchId]: openingQty } : {};
    db.ref('products').push(payload).then(() => {
      closeProductModal();
    });
  }
}

function generateFixedCode(prefix) {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${digits}`;
}

function normalizeCode(value, prefix) {
  const text = String(value || '').trim().toUpperCase();
  if (text && text.startsWith(`${prefix}-`) && /\d{4}$/.test(text)) {
    return text;
  }
  if (text && text.startsWith(prefix)) {
    const digits = text.replace(/\D/g, '').slice(-4);
    if (digits) {
      return `${prefix}-${digits.padStart(4, '0')}`;
    }
  }
  return generateFixedCode(prefix);
}

function generateProductCode() {
  return generateFixedCode('FG');
}

function generateMaterialCode() {
  return generateFixedCode('SK');
}

function generateBarcodeValue() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

function renderBarcodePreview() {
  const value = document.getElementById('productBarcode').value.trim();
  const canvas = document.getElementById('barcodePreview');
  if (!canvas || !value || typeof JsBarcode === 'undefined') return;
  JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
}

function downloadBarcodeImage(value, code) {
  const canvas = document.getElementById('barcodePreview');
  if (!canvas) return;
  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${code || value}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

async function downloadBarcodesZip() {
  if (typeof JSZip === 'undefined' || typeof JsBarcode === 'undefined') return;
  const products = state.cache.products || {};
  const selected = Array.from(state.selectedProducts).map((id) => products[id]).filter(Boolean);
  if (selected.length === 0) return;

  const zip = new JSZip();
  for (const product of selected) {
    const value = product.barcode || generateBarcodeValue();
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', displayValue: true, height: 60 });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const name = (product.nameAr || product.nameEn || product.code || value).replace(/[\\/:*?\"<>|]/g, '-');
    zip.file(`${name}.png`, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = 'barcodes.zip';
  link.click();
  URL.revokeObjectURL(link.href);
}

function toggleSelectAllProducts(checked) {
  const table = document.getElementById('productsTable');
  if (!table) return;
  table.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = checked;
    const id = checkbox.dataset.id;
    if (checked) {
      state.selectedProducts.add(id);
    } else {
      state.selectedProducts.delete(id);
    }
  });
}

function exportSelectedProducts() {
  const products = state.cache.products || {};
  const selected = Array.from(state.selectedProducts).map((id) => products[id]).filter(Boolean);
  if (selected.length === 0) return;
  if (typeof XLSX === 'undefined') return;

  const data = selected.map((product) => ({
    code: product.code,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    cost: product.cost,
    price: product.price,
    unitId: product.unitId,
    openingQty: product.openingQty,
    minStock: product.minStock,
    reorderPoint: product.reorderPoint,
    maxStock: product.maxStock,
    barcode: product.barcode
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  XLSX.writeFile(workbook, 'products.xlsx');
}

function downloadProductTemplate() {
  if (typeof XLSX === 'undefined') return;
  const useArabic = window.i18n.getLanguage() === 'ar';
  const template = [
    {
      [useArabic ? 'الاسم بالعربي' : 'nameAr']: '',
      [useArabic ? 'الاسم بالانجليزي' : 'nameEn']: '',
      [useArabic ? 'التكلفة' : 'cost']: '',
      [useArabic ? 'سعر البيع' : 'price']: '',
      [useArabic ? 'الوحدة' : 'unitId']: '',
      [useArabic ? 'الرصيد الافتتاحي' : 'openingQty']: '',
      [useArabic ? 'الحد الادنى للطلب' : 'minStock']: '',
      [useArabic ? 'نقطة اعادة الطلب' : 'reorderPoint']: '',
      [useArabic ? 'الحد الأعلى للطلب' : 'maxStock']: '',
      [useArabic ? 'الباركود' : 'barcode']: ''
    }
  ];
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  XLSX.writeFile(workbook, 'product-template.xlsx');
}

function handleBulkImportFile(file) {
  if (!file || typeof XLSX === 'undefined') return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    state.importedProducts = rows.map((row) => mapImportRow(row, productImportMap));
    document.getElementById('importStatus').textContent = `${window.i18n.t('import_loaded')} ${rows.length}`;
    document.getElementById('importConfirmBtn').classList.remove('hidden');
    document.getElementById('importCounter').textContent = '';
  };
  reader.readAsArrayBuffer(file);
}

function importBulkProducts() {
  const rows = state.importedProducts;
  if (!rows || rows.length === 0) return;
  const mainBranchId = getMainBranchId();
  let imported = 0;
  rows.forEach((row) => {
    const payload = {
      code: normalizeCode(row.code, 'FG'),
      barcode: row.barcode || generateBarcodeValue(),
      nameAr: row.nameAr || '',
      nameEn: row.nameEn || '',
      cost: Number(row.cost || 0),
      price: Number(row.price || 0),
      unitId: row.unitId || '',
      openingQty: Number(row.openingQty || 0),
      minStock: Number(row.minStock || 0),
      reorderPoint: Number(row.reorderPoint || 0),
      maxStock: Number(row.maxStock || 0),
      mainBranchId,
      stockByBranch: mainBranchId ? { [mainBranchId]: Number(row.openingQty || 0) } : {}
    };
    db.ref('products').push(payload).then(() => {
      imported += 1;
      document.getElementById('importCounter').textContent = `${imported} / ${rows.length}`;
      if (imported === rows.length) {
        document.getElementById('importStatus').textContent = `${window.i18n.t('success')}`;
        document.getElementById('importConfirmBtn').classList.add('hidden');
      }
    });
  });
}

function getMainBranchId() {
  const branches = state.cache.branches || {};
  const entry = Object.entries(branches).find(([, branch]) => branch.isMain);
  return entry ? entry[0] : null;
}

function getItemStock(item, branchId) {
  const stockByBranch = item.stockByBranch || {};
  if (!branchId || branchId === 'all') {
    const value = stockByBranch[item.mainBranchId] ?? item.openingQty ?? item.stock ?? 0;
    return Number(value || 0);
  }
  return Number(stockByBranch[branchId] || 0);
}

function getProductStock(product, branchId) {
  return getItemStock(product, branchId);
}

function getSalesMap() {
  const orders = state.cache.orders || {};
  const map = {};
  Object.values(orders).forEach((order) => {
    if (!order.items) return;
    order.items.forEach((item) => {
      map[item.productId] = (map[item.productId] || 0) + Number(item.qty || 0);
    });
  });
  return map;
}

function getReorderClass(stock, reorderPoint) {
  if (!reorderPoint || reorderPoint <= 0) return '';
  if (stock <= reorderPoint) return 'reorder-critical';
  if (stock <= reorderPoint * 1.2) return 'reorder-warning';
  return '';
}

function updateReorderNotice() {
  if (!els.reorderNotice) return;
  const role = state.role;
  if (role !== 'storekeeper') {
    els.reorderNotice.classList.add('hidden');
    return;
  }
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const mainBranchId = getMainBranchId();
  const productNeeds = Object.values(products).filter((product) => {
    const stock = getProductStock(product, mainBranchId);
    const reorderPoint = Number(product.reorderPoint || 0);
    return reorderPoint > 0 && stock <= reorderPoint;
  });
  const materialNeeds = Object.values(materials).filter((material) => {
    const stock = getItemStock(material, mainBranchId);
    const reorderPoint = Number(material.reorderPoint || 0);
    return reorderPoint > 0 && stock <= reorderPoint;
  });
  const needsCount = productNeeds.length + materialNeeds.length;
  if (needsCount === 0) {
    els.reorderNotice.classList.add('hidden');
    return;
  }
  els.reorderNotice.classList.remove('hidden');
  els.reorderNotice.innerHTML = `${needsCount} ${window.i18n.t('products')} ${window.i18n.t('needs_reorder')}. <button class="btn ghost small" id="reorderGo">${window.i18n.t('view')}</button>`;
  const targetSection = productNeeds.length > 0 ? 'products' : 'stockMaterials';
  document.getElementById('reorderGo').addEventListener('click', () => selectSection(targetSection));
}

function setupProductCategoriesSection() {
  const section = document.getElementById('section-productCategories');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('product_categories')}</h2>
        <div class="row">
          <button id="addCategoryBtn" class="btn primary">${window.i18n.t('add')}</button>
          <button id="addSubCategoryBtn" class="btn ghost">${window.i18n.t('add_subcategory')}</button>
          <button id="assignProductsBtn" class="btn ghost">${window.i18n.t('add_product_to_category')}</button>
          <button id="categoryBackBtn" class="btn ghost">${window.i18n.t('back')}</button>
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <input id="categorySearch" class="input" placeholder="${window.i18n.t('search')}" />
      </div>
      <div id="categoryBreadcrumb" class="helper" style="margin-top: 8px;"></div>
      <div id="categoryList" class="grid two" style="margin-top: 12px;"></div>
      <div id="categoryProductsArea" style="margin-top: 16px;">
        <h4>${window.i18n.t('products')}</h4>
        <div id="categoryProductsList" class="grid two"></div>
      </div>
    </div>
  `;

  bindCategorySection();
  renderProductCategoriesSection();
}

function bindCategorySection() {
  document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
  document.getElementById('addSubCategoryBtn').addEventListener('click', () => openCategoryModal(state.activeCategoryId));
  document.getElementById('assignProductsBtn').addEventListener('click', () => openCategoryProductsModal());
  document.getElementById('categoryBackBtn').addEventListener('click', () => goCategoryBack());
  document.getElementById('categorySearch').addEventListener('input', () => renderProductCategoriesSection());

  els.categoryForm.onsubmit = (e) => {
    e.preventDefault();
    saveCategory();
  };

  if (els.categoryProductsSave) {
    els.categoryProductsSave.addEventListener('click', () => saveCategoryProducts());
  }
}

function renderProductCategoriesSection() {
  const list = document.getElementById('categoryList');
  if (!list) return;
  const categories = state.cache.productCategories || {};
  const search = document.getElementById('categorySearch')?.value.trim().toLowerCase() || '';
  const parentId = state.activeCategoryId || null;
  const addSubBtn = document.getElementById('addSubCategoryBtn');
  const assignBtn = document.getElementById('assignProductsBtn');
  const backBtn = document.getElementById('categoryBackBtn');
  if (addSubBtn) addSubBtn.disabled = !parentId;
  if (assignBtn) assignBtn.disabled = !parentId;
  if (backBtn) backBtn.disabled = !parentId;

  const entries = Object.entries(categories)
    .filter(([, cat]) => (cat.parentId || null) === parentId)
    .filter(([, cat]) => {
      if (!search) return true;
      const name = `${cat.nameAr || ''} ${cat.nameEn || ''} ${cat.name || ''}`.toLowerCase();
      return name.includes(search);
    });

  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
  }

  entries.forEach(([id, cat]) => {
    const count = countProductsByCategory(id);
    const card = document.createElement('div');
    card.className = 'card light';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${getLocalizedName(cat)}</strong>
          <div class="helper">${count} ${window.i18n.t('products')}</div>
        </div>
        <div class="row">
          <button class="btn ghost small" data-action="open">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="open"]').addEventListener('click', () => {
      state.categoryPath.push(id);
      state.activeCategoryId = id;
      renderProductCategoriesSection();
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openCategoryModal(cat.parentId || null, id);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCategory(id));
    list.appendChild(card);
  });

  renderCategoryBreadcrumb();
  renderCategoryProductsList();
}

function renderCategoryBreadcrumb() {
  const breadcrumb = document.getElementById('categoryBreadcrumb');
  if (!breadcrumb) return;
  const categories = state.cache.productCategories || {};
  if (!state.activeCategoryId) {
    breadcrumb.textContent = window.i18n.t('main');
    return;
  }
  const names = state.categoryPath.map((id) => getLocalizedName(categories[id]));
  breadcrumb.textContent = names.join(' / ');
}

function renderCategoryProductsList() {
  const container = document.getElementById('categoryProductsList');
  if (!container) return;
  const products = state.cache.products || {};
  const currentCategoryId = state.activeCategoryId;
  const entries = Object.entries(products).filter(([, product]) => product.categoryId === currentCategoryId);
  container.innerHTML = '';
  if (!currentCategoryId) {
    container.innerHTML = `<p class="helper">${window.i18n.t('select')}</p>`;
    return;
  }
  if (entries.length === 0) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach(([id, product]) => {
    const item = document.createElement('div');
    item.className = 'notice';
    item.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <span>${getLocalizedName(product)}</span>
        <button class="btn danger small" data-action="remove">${window.i18n.t('delete')}</button>
      </div>
    `;
    item.querySelector('[data-action="remove"]').addEventListener('click', () => {
      db.ref(`products/${id}/categoryId`).set(null);
    });
    container.appendChild(item);
  });
}

function openCategoryModal(parentId = null, editId = null) {
  if (!els.categoryModal) return;
  els.categoryForm.reset();
  els.categoryError.textContent = '';
  els.categoryForm.dataset.parentId = parentId || '';
  if (editId) {
    const category = state.cache.productCategories?.[editId];
    els.categoryForm.dataset.editId = editId;
    document.getElementById('categoryNameAr').value = category?.nameAr || '';
    document.getElementById('categoryNameEn').value = category?.nameEn || '';
  } else {
    delete els.categoryForm.dataset.editId;
  }
  els.categoryModal.classList.remove('hidden');
}

function closeCategoryModal() {
  if (els.categoryModal) {
    els.categoryModal.classList.add('hidden');
  }
}

function saveCategory() {
  const nameAr = document.getElementById('categoryNameAr').value.trim();
  const nameEn = document.getElementById('categoryNameEn').value.trim();
  if (!nameAr || !nameEn) {
    els.categoryError.textContent = window.i18n.t('error');
    return;
  }
  const parentId = els.categoryForm.dataset.parentId || null;
  const editId = els.categoryForm.dataset.editId;
  const payload = { nameAr, nameEn, parentId };
  if (editId) {
    db.ref(`productCategories/${editId}`).update(payload).then(() => closeCategoryModal());
  } else {
    db.ref('productCategories').push(payload).then(() => closeCategoryModal());
  }
}

function goCategoryBack() {
  state.categoryPath.pop();
  state.activeCategoryId = state.categoryPath[state.categoryPath.length - 1] || null;
  renderProductCategoriesSection();
}

function deleteCategory(categoryId) {
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const categories = state.cache.productCategories || {};
  const products = state.cache.products || {};
  const toDelete = collectCategoryTree(categoryId, categories);
  const updates = {};
  Object.keys(products).forEach((productId) => {
    if (toDelete.includes(products[productId].categoryId)) {
      updates[`products/${productId}/categoryId`] = null;
    }
  });
  toDelete.forEach((id) => {
    updates[`productCategories/${id}`] = null;
  });
  db.ref().update(updates);
}

function collectCategoryTree(rootId, categories) {
  const ids = [rootId];
  Object.entries(categories).forEach(([id, cat]) => {
    if (cat.parentId === rootId) {
      ids.push(...collectCategoryTree(id, categories));
    }
  });
  return ids;
}

function countProductsByCategory(categoryId) {
  const products = state.cache.products || {};
  return Object.values(products).filter((product) => product.categoryId === categoryId).length;
}

function openCategoryProductsModal() {
  if (!state.activeCategoryId) return;
  if (!els.categoryProductsModal) return;
  renderCategoryProductList();
  els.categoryProductsModal.classList.remove('hidden');
}

function closeCategoryProductsModal() {
  if (els.categoryProductsModal) {
    els.categoryProductsModal.classList.add('hidden');
  }
}

function renderCategoryProductList() {
  const list = els.categoryProductList;
  const search = (els.categoryProductSearch?.value || '').trim().toLowerCase();
  if (!list) return;
  list.innerHTML = '';
  const products = state.cache.products || {};
  const entries = Object.entries(products).filter(([, product]) => !product.categoryId || product.categoryId === state.activeCategoryId);
  entries
    .filter(([, product]) => {
      if (!search) return true;
      const name = `${product.nameAr || ''} ${product.nameEn || ''}`.toLowerCase();
      return name.includes(search);
    })
    .forEach(([id, product]) => {
      const item = document.createElement('div');
      item.className = 'notice';
      item.innerHTML = `
        <label class="row" style="justify-content: space-between; width: 100%;">
          <span>${getLocalizedName(product)}</span>
          <input type="checkbox" data-id="${id}" />
        </label>
      `;
      list.appendChild(item);
    });

  els.categoryProductSearch.oninput = () => renderCategoryProductList();
}

function saveCategoryProducts() {
  const checkboxes = els.categoryProductList.querySelectorAll('input[type="checkbox"]:checked');
  const updates = {};
  checkboxes.forEach((checkbox) => {
    updates[`products/${checkbox.dataset.id}/categoryId`] = state.activeCategoryId;
  });
  db.ref().update(updates).then(() => {
    closeCategoryProductsModal();
  });
}

function setupMaterialCategoriesSection() {
  const section = document.getElementById('section-materialCategories');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('material_categories')}</h2>
        <div class="row">
          <button id="addMaterialCategoryBtn" class="btn primary">${window.i18n.t('add')}</button>
          <button id="addMaterialSubCategoryBtn" class="btn ghost">${window.i18n.t('add_subcategory')}</button>
          <button id="assignMaterialBtn" class="btn ghost">${window.i18n.t('add_product_to_category')}</button>
          <button id="materialCategoryBackBtn" class="btn ghost">${window.i18n.t('back')}</button>
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <input id="materialCategorySearch" class="input" placeholder="${window.i18n.t('search')}" />
      </div>
      <div id="materialCategoryBreadcrumb" class="helper" style="margin-top: 8px;"></div>
      <div id="materialCategoryList" class="grid two" style="margin-top: 12px;"></div>
      <div id="materialCategoryProductsArea" style="margin-top: 16px;">
        <h4>${window.i18n.t('stock_materials')}</h4>
        <div id="materialCategoryProductsList" class="grid two"></div>
      </div>
    </div>
  `;

  bindMaterialCategorySection();
  renderMaterialCategoriesSection();
}

function bindMaterialCategorySection() {
  document.getElementById('addMaterialCategoryBtn').addEventListener('click', () => openMaterialCategoryModal());
  document.getElementById('addMaterialSubCategoryBtn').addEventListener('click', () => openMaterialCategoryModal(state.activeMaterialCategoryId));
  document.getElementById('assignMaterialBtn').addEventListener('click', () => openMaterialCategoryProductsModal());
  document.getElementById('materialCategoryBackBtn').addEventListener('click', () => goMaterialCategoryBack());
  document.getElementById('materialCategorySearch').addEventListener('input', () => renderMaterialCategoriesSection());

  if (els.materialCategoryForm) {
    els.materialCategoryForm.onsubmit = (e) => {
      e.preventDefault();
      saveMaterialCategory();
    };
  }

  if (els.materialCategoryProductsSave) {
    els.materialCategoryProductsSave.addEventListener('click', () => saveMaterialCategoryProducts());
  }
}

function renderMaterialCategoriesSection() {
  const list = document.getElementById('materialCategoryList');
  if (!list) return;
  const categories = state.cache.materialCategories || {};
  const search = document.getElementById('materialCategorySearch')?.value.trim().toLowerCase() || '';
  const parentId = state.activeMaterialCategoryId || null;
  const addSubBtn = document.getElementById('addMaterialSubCategoryBtn');
  const assignBtn = document.getElementById('assignMaterialBtn');
  const backBtn = document.getElementById('materialCategoryBackBtn');
  if (addSubBtn) addSubBtn.disabled = !parentId;
  if (assignBtn) assignBtn.disabled = !parentId;
  if (backBtn) backBtn.disabled = !parentId;

  const entries = Object.entries(categories)
    .filter(([, cat]) => (cat.parentId || null) === parentId)
    .filter(([, cat]) => {
      if (!search) return true;
      const name = `${cat.nameAr || ''} ${cat.nameEn || ''}`.toLowerCase();
      return name.includes(search);
    });

  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
  }

  entries.forEach(([id, cat]) => {
    const count = countMaterialsByCategory(id);
    const card = document.createElement('div');
    card.className = 'card light';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${getLocalizedName(cat)}</strong>
          <div class="helper">${count} ${window.i18n.t('stock_materials')}</div>
        </div>
        <div class="row">
          <button class="btn ghost small" data-action="open">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="open"]').addEventListener('click', () => {
      state.materialCategoryPath.push(id);
      state.activeMaterialCategoryId = id;
      renderMaterialCategoriesSection();
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openMaterialCategoryModal(cat.parentId || null, id);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteMaterialCategory(id));
    list.appendChild(card);
  });

  renderMaterialCategoryBreadcrumb();
  renderMaterialCategoryProductsList();
}

function renderMaterialCategoryBreadcrumb() {
  const breadcrumb = document.getElementById('materialCategoryBreadcrumb');
  if (!breadcrumb) return;
  const categories = state.cache.materialCategories || {};
  if (!state.activeMaterialCategoryId) {
    breadcrumb.textContent = window.i18n.t('main');
    return;
  }
  const names = state.materialCategoryPath.map((id) => getLocalizedName(categories[id]));
  breadcrumb.textContent = names.join(' / ');
}

function renderMaterialCategoryProductsList() {
  const container = document.getElementById('materialCategoryProductsList');
  if (!container) return;
  const materials = state.cache.stockMaterials || {};
  const currentCategoryId = state.activeMaterialCategoryId;
  const entries = Object.entries(materials).filter(([, material]) => material.categoryId === currentCategoryId);
  container.innerHTML = '';
  if (!currentCategoryId) {
    container.innerHTML = `<p class="helper">${window.i18n.t('select')}</p>`;
    return;
  }
  if (entries.length === 0) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach(([id, material]) => {
    const item = document.createElement('div');
    item.className = 'notice';
    item.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <span>${getLocalizedName(material)}</span>
        <button class="btn danger small" data-action="remove">${window.i18n.t('delete')}</button>
      </div>
    `;
    item.querySelector('[data-action="remove"]').addEventListener('click', () => {
      db.ref(`stockMaterials/${id}/categoryId`).set(null);
    });
    container.appendChild(item);
  });
}

function openMaterialCategoryModal(parentId = null, editId = null) {
  if (!els.materialCategoryModal) return;
  els.materialCategoryForm.reset();
  els.materialCategoryError.textContent = '';
  els.materialCategoryForm.dataset.parentId = parentId || '';
  if (editId) {
    const category = state.cache.materialCategories?.[editId];
    els.materialCategoryForm.dataset.editId = editId;
    document.getElementById('materialCategoryNameAr').value = category?.nameAr || category?.name || '';
    document.getElementById('materialCategoryNameEn').value = category?.nameEn || '';
  } else {
    delete els.materialCategoryForm.dataset.editId;
  }
  els.materialCategoryModal.classList.remove('hidden');
}

function closeMaterialCategoryModal() {
  if (els.materialCategoryModal) {
    els.materialCategoryModal.classList.add('hidden');
  }
}

function saveMaterialCategory() {
  const nameAr = document.getElementById('materialCategoryNameAr').value.trim();
  const nameEn = document.getElementById('materialCategoryNameEn').value.trim();
  if (!nameAr || !nameEn) {
    els.materialCategoryError.textContent = window.i18n.t('error');
    return;
  }
  const parentId = els.materialCategoryForm.dataset.parentId || null;
  const editId = els.materialCategoryForm.dataset.editId;
  const payload = { nameAr, nameEn, parentId };
  if (editId) {
    db.ref(`materialCategories/${editId}`).update(payload).then(() => closeMaterialCategoryModal());
  } else {
    db.ref('materialCategories').push(payload).then(() => closeMaterialCategoryModal());
  }
}

function goMaterialCategoryBack() {
  state.materialCategoryPath.pop();
  state.activeMaterialCategoryId = state.materialCategoryPath[state.materialCategoryPath.length - 1] || null;
  renderMaterialCategoriesSection();
}

function deleteMaterialCategory(categoryId) {
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const categories = state.cache.materialCategories || {};
  const materials = state.cache.stockMaterials || {};
  const toDelete = collectMaterialCategoryTree(categoryId, categories);
  const updates = {};
  Object.keys(materials).forEach((materialId) => {
    if (toDelete.includes(materials[materialId].categoryId)) {
      updates[`stockMaterials/${materialId}/categoryId`] = null;
    }
  });
  toDelete.forEach((id) => {
    updates[`materialCategories/${id}`] = null;
  });
  db.ref().update(updates);
}

function collectMaterialCategoryTree(rootId, categories) {
  const ids = [rootId];
  Object.entries(categories).forEach(([id, cat]) => {
    if (cat.parentId === rootId) {
      ids.push(...collectMaterialCategoryTree(id, categories));
    }
  });
  return ids;
}

function countMaterialsByCategory(categoryId) {
  const materials = state.cache.stockMaterials || {};
  return Object.values(materials).filter((material) => material.categoryId === categoryId).length;
}

function openMaterialCategoryProductsModal() {
  if (!state.activeMaterialCategoryId) return;
  if (!els.materialCategoryProductsModal) return;
  renderMaterialCategoryProductList();
  els.materialCategoryProductsModal.classList.remove('hidden');
}

function closeMaterialCategoryProductsModal() {
  if (els.materialCategoryProductsModal) {
    els.materialCategoryProductsModal.classList.add('hidden');
  }
}

function renderMaterialCategoryProductList() {
  const list = els.materialCategoryProductList;
  const search = (els.materialCategoryProductSearch?.value || '').trim().toLowerCase();
  if (!list) return;
  list.innerHTML = '';
  const materials = state.cache.stockMaterials || {};
  const entries = Object.entries(materials).filter(([, material]) => !material.categoryId || material.categoryId === state.activeMaterialCategoryId);
  const filtered = entries.filter(([, material]) => {
    if (!search) return true;
    const name = `${material.nameAr || ''} ${material.nameEn || ''} ${material.name || ''}`.toLowerCase();
    return name.includes(search);
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
  }

  filtered.forEach(([id, material]) => {
      const item = document.createElement('div');
      item.className = 'notice';
      item.innerHTML = `
        <label class="row" style="justify-content: space-between; width: 100%;">
          <span>${getLocalizedName(material)}</span>
          <input type="checkbox" data-id="${id}" />
        </label>
      `;
      list.appendChild(item);
    });

  if (els.materialCategoryProductSearch) {
    els.materialCategoryProductSearch.oninput = () => renderMaterialCategoryProductList();
  }
}

function saveMaterialCategoryProducts() {
  const checkboxes = els.materialCategoryProductList.querySelectorAll('input[type="checkbox"]:checked');
  const updates = {};
  checkboxes.forEach((checkbox) => {
    updates[`stockMaterials/${checkbox.dataset.id}/categoryId`] = state.activeMaterialCategoryId;
  });
  db.ref().update(updates).then(() => {
    closeMaterialCategoryProductsModal();
  });
}

function setupStorageLocationsSection() {
  const section = document.getElementById('section-storageLocations');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <h2>${window.i18n.t('storage_locations')}</h2>
        <div class="row">
          <button id="addStorageLocationBtn" class="btn primary">${window.i18n.t('add')}</button>
          <button id="assignStorageItemsBtn" class="btn ghost">${window.i18n.t('add_product_to_category')}</button>
          <button id="storageLocationBackBtn" class="btn ghost">${window.i18n.t('back')}</button>
        </div>
      </div>
      <div class="row" style="margin-top: 12px;">
        <input id="storageLocationSearch" class="input" placeholder="${window.i18n.t('search')}" />
      </div>
      <div id="storageLocationBreadcrumb" class="helper" style="margin-top: 8px;"></div>
      <div id="storageLocationList" class="grid two" style="margin-top: 12px;"></div>
      <div id="storageItemsArea" style="margin-top: 16px;">
        <h4>${window.i18n.t('items')}</h4>
        <div id="storageLocationItemsList" class="grid two"></div>
      </div>
    </div>
  `;

  bindStorageLocationsSection();
  renderStorageLocationsSection();
}

function bindStorageLocationsSection() {
  document.getElementById('addStorageLocationBtn').addEventListener('click', () => openStorageLocationModal());
  document.getElementById('assignStorageItemsBtn').addEventListener('click', () => openStorageItemsModal());
  document.getElementById('storageLocationBackBtn').addEventListener('click', () => goStorageLocationBack());
  document.getElementById('storageLocationSearch').addEventListener('input', () => renderStorageLocationsSection());

  if (els.storageLocationForm) {
    els.storageLocationForm.onsubmit = (e) => {
      e.preventDefault();
      saveStorageLocation();
    };
  }

  if (els.storageItemsSave) {
    els.storageItemsSave.addEventListener('click', () => saveStorageItems());
  }
}

function renderStorageLocationsSection() {
  const list = document.getElementById('storageLocationList');
  if (!list) return;
  const locations = state.cache.storageLocations || {};
  if (state.activeStorageLocationId && !locations[state.activeStorageLocationId]) {
    state.activeStorageLocationId = null;
  }
  const search = document.getElementById('storageLocationSearch')?.value.trim().toLowerCase() || '';
  const assignBtn = document.getElementById('assignStorageItemsBtn');
  const backBtn = document.getElementById('storageLocationBackBtn');
  if (assignBtn) assignBtn.disabled = !state.activeStorageLocationId;
  if (backBtn) backBtn.disabled = !state.activeStorageLocationId;

  const entries = Object.entries(locations)
    .filter(([, loc]) => {
      if (!search) return true;
      const name = `${loc.nameAr || ''} ${loc.nameEn || ''} ${loc.name || ''}`.toLowerCase();
      return name.includes(search);
    });

  list.innerHTML = '';
  if (entries.length === 0) {
    list.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
  }

  entries.forEach(([id, loc]) => {
    const count = countItemsByStorageLocation(id);
    const card = document.createElement('div');
    card.className = 'card light';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${getLocalizedName(loc)}</strong>
          <div class="helper">${count} ${window.i18n.t('items')}</div>
        </div>
        <div class="row">
          <button class="btn ghost small" data-action="open">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="open"]').addEventListener('click', () => {
      state.activeStorageLocationId = id;
      renderStorageLocationsSection();
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openStorageLocationModal(id);
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteStorageLocation(id));
    list.appendChild(card);
  });

  renderStorageLocationBreadcrumb();
  renderStorageItemsList();
}

function renderStorageLocationBreadcrumb() {
  const breadcrumb = document.getElementById('storageLocationBreadcrumb');
  if (!breadcrumb) return;
  if (!state.activeStorageLocationId) {
    breadcrumb.textContent = window.i18n.t('main');
    return;
  }
  const location = state.cache.storageLocations?.[state.activeStorageLocationId];
  breadcrumb.textContent = getLocalizedName(location);
}

function renderStorageItemsList() {
  const container = document.getElementById('storageLocationItemsList');
  if (!container) return;
  const currentId = state.activeStorageLocationId;
  container.innerHTML = '';
  if (!currentId) {
    container.innerHTML = `<p class="helper">${window.i18n.t('select')}</p>`;
    return;
  }

  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const entries = [];
  Object.entries(products).forEach(([id, product]) => {
    if (product.storageLocationId === currentId) {
      entries.push({ id, type: 'product', item: product });
    }
  });
  Object.entries(materials).forEach(([id, material]) => {
    if (material.storageLocationId === currentId) {
      entries.push({ id, type: 'material', item: material });
    }
  });

  if (entries.length === 0) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('div');
    const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    item.className = 'notice';
    item.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div class="row" style="gap: 8px;">
          <span>${getLocalizedName(entry.item)}</span>
          <span class="tag">${typeLabel}</span>
        </div>
        <button class="btn danger small" data-action="remove">${window.i18n.t('delete')}</button>
      </div>
    `;
    item.querySelector('[data-action="remove"]').addEventListener('click', () => {
      const path = entry.type === 'product' ? `products/${entry.id}/storageLocationId` : `stockMaterials/${entry.id}/storageLocationId`;
      db.ref(path).set(null);
    });
    container.appendChild(item);
  });
}

function openStorageLocationModal(editId = null) {
  if (!els.storageLocationModal) return;
  els.storageLocationForm.reset();
  els.storageLocationError.textContent = '';
  if (editId) {
    const location = state.cache.storageLocations?.[editId];
    els.storageLocationForm.dataset.editId = editId;
    document.getElementById('storageLocationNameAr').value = location?.nameAr || location?.name || '';
    document.getElementById('storageLocationNameEn').value = location?.nameEn || '';
  } else {
    delete els.storageLocationForm.dataset.editId;
  }
  els.storageLocationModal.classList.remove('hidden');
}

function closeStorageLocationModal() {
  if (els.storageLocationModal) {
    els.storageLocationModal.classList.add('hidden');
  }
}

function saveStorageLocation() {
  const nameAr = document.getElementById('storageLocationNameAr').value.trim();
  const nameEn = document.getElementById('storageLocationNameEn').value.trim();
  if (!nameAr || !nameEn) {
    els.storageLocationError.textContent = window.i18n.t('error');
    return;
  }
  const editId = els.storageLocationForm.dataset.editId;
  const payload = { nameAr, nameEn };
  if (editId) {
    db.ref(`storageLocations/${editId}`).update(payload).then(() => closeStorageLocationModal());
  } else {
    db.ref('storageLocations').push(payload).then(() => closeStorageLocationModal());
  }
}

function deleteStorageLocation(locationId) {
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const updates = {};
  Object.entries(products).forEach(([id, product]) => {
    if (product.storageLocationId === locationId) {
      updates[`products/${id}/storageLocationId`] = null;
    }
  });
  Object.entries(materials).forEach(([id, material]) => {
    if (material.storageLocationId === locationId) {
      updates[`stockMaterials/${id}/storageLocationId`] = null;
    }
  });
  updates[`storageLocations/${locationId}`] = null;
  db.ref().update(updates).then(() => {
    if (state.activeStorageLocationId === locationId) {
      state.activeStorageLocationId = null;
      renderStorageLocationsSection();
    }
  });
}

function countItemsByStorageLocation(locationId) {
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const productCount = Object.values(products).filter((product) => product.storageLocationId === locationId).length;
  const materialCount = Object.values(materials).filter((material) => material.storageLocationId === locationId).length;
  return productCount + materialCount;
}

function goStorageLocationBack() {
  state.activeStorageLocationId = null;
  renderStorageLocationsSection();
}

function openStorageItemsModal() {
  if (!state.activeStorageLocationId) return;
  if (!els.storageItemsModal) return;
  renderStorageItemsPickerList();
  els.storageItemsModal.classList.remove('hidden');
}

function closeStorageItemsModal() {
  if (els.storageItemsModal) {
    els.storageItemsModal.classList.add('hidden');
  }
}

function renderStorageItemsPickerList() {
  const list = els.storageItemsList;
  const search = (els.storageItemsSearch?.value || '').trim().toLowerCase();
  if (!list) return;
  list.innerHTML = '';
  const currentId = state.activeStorageLocationId;
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};

  const entries = [];
  Object.entries(products).forEach(([id, product]) => {
    if (!product.storageLocationId || product.storageLocationId === currentId) {
      entries.push({ id, type: 'product', item: product });
    }
  });
  Object.entries(materials).forEach(([id, material]) => {
    if (!material.storageLocationId || material.storageLocationId === currentId) {
      entries.push({ id, type: 'material', item: material });
    }
  });

  const filtered = entries
    .filter((entry) => {
      if (!search) return true;
      const name = `${entry.item.nameAr || ''} ${entry.item.nameEn || ''} ${entry.item.name || ''}`.toLowerCase();
      return name.includes(search);
    });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }

  filtered.forEach((entry) => {
      const item = document.createElement('div');
      const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
      item.className = 'notice';
      item.innerHTML = `
        <label class="row" style="justify-content: space-between; width: 100%;">
          <span>${getLocalizedName(entry.item)} <span class="tag">${typeLabel}</span></span>
          <input type="checkbox" data-id="${entry.id}" data-type="${entry.type}" />
        </label>
      `;
      list.appendChild(item);
    });

  if (els.storageItemsSearch) {
    els.storageItemsSearch.oninput = () => renderStorageItemsPickerList();
  }
}

function saveStorageItems() {
  const checkboxes = els.storageItemsList.querySelectorAll('input[type="checkbox"]:checked');
  const updates = {};
  checkboxes.forEach((checkbox) => {
    const id = checkbox.dataset.id;
    const type = checkbox.dataset.type;
    const path = type === 'product' ? `products/${id}/storageLocationId` : `stockMaterials/${id}/storageLocationId`;
    updates[path] = state.activeStorageLocationId;
  });
  db.ref().update(updates).then(() => {
    closeStorageItemsModal();
  });
}

function bindQtyModal() {
  if (!els.qtyModal) return;
  const buttons = els.qtyModal.querySelectorAll('[data-key]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => handleQtyKey(btn.dataset.key));
  });
  if (els.qtyModalConfirm) {
    els.qtyModalConfirm.addEventListener('click', () => handleQtyConfirm());
  }
}

function handleQtyKey(key) {
  let value = state.qtyModal.value || '';
  if (key === 'back') {
    value = value.slice(0, -1);
  } else if (key === '.' || key === ',') {
    if (!value.includes('.')) {
      value = value ? `${value}.` : '0.';
    }
  } else {
    value = `${value}${key}`;
  }
  state.qtyModal.value = value;
  updateQtyDisplay();
}

function updateQtyDisplay() {
  if (!els.qtyModalDisplay) return;
  els.qtyModalDisplay.textContent = state.qtyModal.value || '0';
}

function openQtyModal({ title, available, onConfirm, mode = 'add', confirmLabel }) {
  if (!els.qtyModal) return;
  state.qtyModal.value = '';
  state.qtyModal.mode = mode;
  state.qtyModal.available = available;
  state.qtyModal.onConfirm = onConfirm;
  els.qtyModalTitle.textContent = title || '';
  if (available !== null && available !== undefined) {
    els.qtyModalStock.textContent = `${window.i18n.t('available_stock')}: ${formatNumber(available)}`;
  } else {
    els.qtyModalStock.textContent = '';
  }
  if (confirmLabel && els.qtyModalConfirm) {
    els.qtyModalConfirm.textContent = confirmLabel;
  } else if (els.qtyModalConfirm) {
    els.qtyModalConfirm.textContent = window.i18n.t('add');
  }
  if (els.qtyModalError) {
    els.qtyModalError.textContent = '';
  }
  updateQtyDisplay();
  els.qtyModal.classList.remove('hidden');
}

function closeQtyModal() {
  if (els.qtyModal) {
    els.qtyModal.classList.add('hidden');
  }
}

function handleQtyConfirm() {
  const value = String(state.qtyModal.value || '').replace(',', '.');
  const qty = Number(value || 0);
  if (!qty || Number.isNaN(qty)) {
    if (els.qtyModalError) {
      els.qtyModalError.textContent = window.i18n.t('error');
    }
    return;
  }
  if (state.qtyModal.mode === 'deduct' && state.qtyModal.available !== null && state.qtyModal.available !== undefined) {
    if (qty > Number(state.qtyModal.available || 0)) {
      if (els.qtyModalError) {
        els.qtyModalError.textContent = window.i18n.t('insufficient_stock');
      }
      return;
    }
  }
  const cb = state.qtyModal.onConfirm;
  closeQtyModal();
  if (typeof cb === 'function') {
    cb(qty);
  }
}

function bindProductionDateModal() {
  if (els.productionDateNext) {
    els.productionDateNext.addEventListener('click', () => {
      const productionDate = els.productionDateInput.value;
      const expiryDate = els.expiryDateInput.value;
      if (!productionDate || !expiryDate) {
        if (els.productionDateError) {
          els.productionDateError.textContent = window.i18n.t('error');
        }
        return;
      }
      if (els.productionDateError) {
        els.productionDateError.textContent = '';
      }
      closeProductionDateModal();
      if (state.productionDraft) {
        state.productionDraft.productionDate = productionDate;
        state.productionDraft.expiryDate = expiryDate;
      }
      if (state.productionDraft && state.productionDraft.onDatesSelected) {
        state.productionDraft.onDatesSelected();
      }
    });
  }
}

function openProductionDateModal() {
  if (!els.productionDateModal) return;
  if (els.productionDateError) {
    els.productionDateError.textContent = '';
  }
  if (els.productionDateInput && state.productionDraft?.productionDate) {
    els.productionDateInput.value = state.productionDraft.productionDate;
  }
  if (els.expiryDateInput && state.productionDraft?.expiryDate) {
    els.expiryDateInput.value = state.productionDraft.expiryDate;
  }
  els.productionDateModal.classList.remove('hidden');
}

function closeProductionDateModal() {
  if (els.productionDateModal) {
    els.productionDateModal.classList.add('hidden');
  }
}

function bindProductionLinkModal() {
  if (els.productionLinkConfirm) {
    els.productionLinkConfirm.addEventListener('click', () => {
      const selected = els.productionIssueList?.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      if (state.productionDraft) {
        state.productionDraft.issueId = selected.value;
      }
      closeProductionLinkModal();
      renderProductionDraft();
    });
  }
}

function openProductionLinkModal() {
  if (!els.productionLinkModal) return;
  renderProductionIssueList();
  els.productionLinkModal.classList.remove('hidden');
}

function closeProductionLinkModal() {
  if (els.productionLinkModal) {
    els.productionLinkModal.classList.add('hidden');
  }
}

function getAllItems() {
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const entries = [];
  Object.entries(products).forEach(([id, item]) => {
    entries.push({ id, type: 'product', item });
  });
  Object.entries(materials).forEach(([id, item]) => {
    entries.push({ id, type: 'material', item });
  });
  return entries;
}

function getProductEntries() {
  const products = state.cache.products || {};
  return Object.entries(products).map(([id, item]) => ({ id, type: 'product', item }));
}

function getBranchLabel(branchId) {
  if (!branchId) return '-';
  const branch = state.cache.branches?.[branchId];
  return getLocalizedName(branch) || '-';
}

function renderBranchOptions(select, { excludeMain = false } = {}) {
  if (!select) return;
  const branches = state.cache.branches || {};
  const mainBranchId = getMainBranchId();
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select_branch');
  select.appendChild(placeholder);
  Object.entries(branches).forEach(([id, branch]) => {
    if (excludeMain && mainBranchId && id === mainBranchId) return;
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(branch);
    select.appendChild(option);
  });
}

function renderStorageLocationOptions(select) {
  if (!select) return;
  const locations = state.cache.storageLocations || {};
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select');
  select.appendChild(placeholder);
  Object.entries(locations).forEach(([id, location]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(location);
    select.appendChild(option);
  });
}

function getSupplierItems(supplierId) {
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const entries = [];
  Object.entries(products).forEach(([id, item]) => {
    if (item.supplierId === supplierId) entries.push({ id, type: 'product', item });
  });
  Object.entries(materials).forEach(([id, item]) => {
    if (item.supplierId === supplierId) entries.push({ id, type: 'material', item });
  });
  return entries;
}

function getUnassignedSupplierItems() {
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const entries = [];
  Object.entries(products).forEach(([id, item]) => {
    if (!item.supplierId) entries.push({ id, type: 'product', item });
  });
  Object.entries(materials).forEach(([id, item]) => {
    if (!item.supplierId) entries.push({ id, type: 'material', item });
  });
  return entries;
}

function filterItemEntries(entries, query) {
  const q = normalizeSearchValue(query);
  const nameQuery = String(query || '').toLowerCase();
  return entries.filter((entry) => {
    const name = `${entry.item.nameAr || ''} ${entry.item.nameEn || ''} ${entry.item.name || ''}`.toLowerCase();
    const code = normalizeSearchValue(entry.item.code || '');
    const barcode = normalizeSearchValue(entry.item.barcode || '');
    return name.includes(nameQuery) || code.includes(q) || barcode.includes(q);
  });
}

function findExactItemMatch(entries, query) {
  const q = normalizeSearchValue(query);
  const exact = entries.filter((entry) => {
    const code = normalizeSearchValue(entry.item.code || '');
    const barcode = normalizeSearchValue(entry.item.barcode || '');
    return (code && code === q) || (barcode && barcode === q);
  });
  return exact.length === 1 ? exact[0] : null;
}

function renderItemSearchResults(container, entries, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  if (entries.length === 0) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'notice';
    const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    const code = entry.item.code || '-';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <span>${getLocalizedName(entry.item)}</span>
        <span class="tag">${typeLabel}</span>
      </div>
      <div class="helper">${window.i18n.t('product_code')}: ${code}</div>
    `;
    card.addEventListener('click', () => onSelect(entry));
    container.appendChild(card);
  });
}

function normalizeItems(list) {
  if (!list) return [];
  return Array.isArray(list) ? list : Object.values(list);
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

function setupIssueSection() {
  const section = document.getElementById('section-issue');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('issue')}</h3>
        <div class="row" style="gap: 8px;">
          <button id="openIssueModalBtn" class="btn primary">${window.i18n.t('new_issue')}</button>
          <select id="issueFilterType" class="input" style="max-width: 200px;">
            <option value="all">${window.i18n.t('all_types')}</option>
            <option value="order">${window.i18n.t('issue_order')}</option>
            <option value="production">${window.i18n.t('issue_production')}</option>
          </select>
        </div>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('issue_number')}</th>
            <th>${window.i18n.t('issue_type')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('cashiers')}</th>
            <th>${window.i18n.t('production_staff')}</th>
            <th>${window.i18n.t('invoice_number')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="issueTable"></tbody>
      </table>
    </div>
    <div id="issueVoucherModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('new_issue')}</h3>
          <button id="issueModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="issueStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('issue_type')}</label>
            <select id="issueType" class="input">
              <option value="order">${window.i18n.t('issue_order')}</option>
              <option value="production">${window.i18n.t('issue_production')}</option>
            </select>
          </div>
        </div>
        <div id="issueOrderFields" class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('cashiers')}</label>
            <select id="issueCashier" class="input"></select>
          </div>
          <div>
            <label class="tag">${window.i18n.t('invoice_number')}</label>
            <input id="issueInvoice" class="input" />
          </div>
        </div>
        <div id="issueProductionFields" class="grid two hidden" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('production_staff')}</label>
            <select id="issueProductionStaff" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="issueSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_items')}" />
          <button id="issueSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="issueSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="issueItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="issueCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="issueSubmitBtn" class="btn primary">${window.i18n.t('issue')}</button>
        </div>
        <p id="issueError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetIssueDraft();
  bindIssueSection();
  renderIssueSection();
}

function resetIssueDraft() {
  state.issueDraft = {
    type: 'order',
    cashierId: '',
    invoiceNumber: '',
    productionStaffId: '',
    items: [],
    editingId: null,
    originalItems: []
  };
}

function bindIssueSection() {
  const openBtn = document.getElementById('openIssueModalBtn');
  const closeBtn = document.getElementById('issueModalCloseBtn');
  const cancelBtn = document.getElementById('issueCancelBtn');
  const typeSelect = document.getElementById('issueType');
  const orderFields = document.getElementById('issueOrderFields');
  const productionFields = document.getElementById('issueProductionFields');
  const cashierSelect = document.getElementById('issueCashier');
  const invoiceInput = document.getElementById('issueInvoice');
  const productionStaffSelect = document.getElementById('issueProductionStaff');
  const searchInput = document.getElementById('issueSearchInput');
  const searchBtn = document.getElementById('issueSearchBtn');
  const submitBtn = document.getElementById('issueSubmitBtn');
  const filterSelect = document.getElementById('issueFilterType');

  if (openBtn) {
    openBtn.addEventListener('click', () => openIssueModal());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeIssueModal());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeIssueModal());
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      state.issueDraft.type = typeSelect.value;
      orderFields.classList.toggle('hidden', state.issueDraft.type !== 'order');
      productionFields.classList.toggle('hidden', state.issueDraft.type !== 'production');
    });
  }

  if (cashierSelect) {
    cashierSelect.addEventListener('change', () => {
      state.issueDraft.cashierId = cashierSelect.value;
    });
  }

  if (invoiceInput) {
    invoiceInput.addEventListener('input', () => {
      state.issueDraft.invoiceNumber = invoiceInput.value.trim();
    });
  }

  if (productionStaffSelect) {
    productionStaffSelect.addEventListener('change', () => {
      state.issueDraft.productionStaffId = productionStaffSelect.value;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderIssueSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleIssueBarcodeScan();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => renderIssueSearchResults());
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => submitIssueVoucher());
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      state.issueFilter = filterSelect.value;
      renderIssueTable();
    });
  }
}

function openIssueModal() {
  const overlay = document.getElementById('issueVoucherModal');
  if (!overlay) return;
  resetIssueDraft();
  renderIssueSection();
  const errorEl = document.getElementById('issueError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('issueSearchInput');
  if (searchInput) searchInput.value = '';
  renderIssueSearchResults();
  overlay.classList.remove('hidden');
}

function openIssueEditModal(issue) {
  const overlay = document.getElementById('issueVoucherModal');
  if (!overlay || !issue) return;
  resetIssueDraft();
  state.issueDraft.editingId = issue.id || null;
  state.issueDraft.type = issue.issueType || 'order';
  state.issueDraft.cashierId = issue.cashierId || '';
  state.issueDraft.invoiceNumber = issue.invoiceNumber || '';
  state.issueDraft.productionStaffId = issue.productionStaffId || '';
  state.issueDraft.items = normalizeItems(issue.items).map((item) => ({ ...item }));
  state.issueDraft.originalItems = normalizeItems(issue.items).map((item) => ({ ...item }));
  renderIssueSection();
  const errorEl = document.getElementById('issueError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('issueSearchInput');
  if (searchInput) searchInput.value = '';
  renderIssueSearchResults();
  overlay.classList.remove('hidden');
}

function closeIssueModal() {
  const overlay = document.getElementById('issueVoucherModal');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function renderIssueSection() {
  if (!state.issueDraft) {
    resetIssueDraft();
  }
  const storekeeperInput = document.getElementById('issueStorekeeper');
  const typeSelect = document.getElementById('issueType');
  const orderFields = document.getElementById('issueOrderFields');
  const productionFields = document.getElementById('issueProductionFields');
  if (storekeeperInput) {
    storekeeperInput.value = state.user?.name || '-';
  }
  if (typeSelect) {
    typeSelect.value = state.issueDraft.type || 'order';
  }
  if (orderFields && productionFields) {
    orderFields.classList.toggle('hidden', state.issueDraft.type !== 'order');
    productionFields.classList.toggle('hidden', state.issueDraft.type !== 'production');
  }
  renderIssueSelects();
  renderIssueSearchResults();
  renderIssueDraftItems();
  const filterSelect = document.getElementById('issueFilterType');
  if (filterSelect) {
    filterSelect.value = state.issueFilter || 'all';
  }
  renderIssueTable();
}

function renderIssueSelects() {
  const cashierSelect = document.getElementById('issueCashier');
  const productionStaffSelect = document.getElementById('issueProductionStaff');
  const cashiers = state.cache.cashiers || {};
  const productionStaff = state.cache.productionStaff || {};

  if (cashierSelect) {
    cashierSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select');
    cashierSelect.appendChild(placeholder);
    Object.entries(cashiers).forEach(([id, cashier]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = cashier.name || cashier.code || id;
      cashierSelect.appendChild(option);
    });
    cashierSelect.value = state.issueDraft.cashierId || '';
  }

  if (productionStaffSelect) {
    productionStaffSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select');
    productionStaffSelect.appendChild(placeholder);
    Object.entries(productionStaff).forEach(([id, staff]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getStaffLabel(staff, id);
      productionStaffSelect.appendChild(option);
    });
    productionStaffSelect.value = state.issueDraft.productionStaffId || '';
  }
}

function getIssueSearchEntries() {
  return getAllItems();
}

function handleIssueBarcodeScan() {
  const searchInput = document.getElementById('issueSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getIssueSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openIssueQtyModal(match);
    searchInput.value = '';
    renderIssueSearchResults();
  }
}

function renderIssueSearchResults() {
  const searchInput = document.getElementById('issueSearchInput');
  const results = document.getElementById('issueSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getIssueSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openIssueQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openIssueQtyModal(entry));
}

function openIssueQtyModal(entry) {
  const mainBranchId = getMainBranchId();
  const available = getItemStock(entry.item, mainBranchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      addIssueItem(entry, qty);
    }
  });
}

function addIssueItem(entry, qty) {
  const existing = state.issueDraft.items.find((item) => item.itemId === entry.id && item.itemType === entry.type);
  if (existing) {
    existing.qty += qty;
  } else {
    state.issueDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderIssueDraftItems();
}

function renderIssueDraftItems() {
  const container = document.getElementById('issueItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.issueDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.issueDraft.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'notice';
    const typeLabel = item.itemType === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${item.name}</strong>
          <div class="helper">${typeLabel} - ${window.i18n.t('quantity')}: ${formatNumber(item.qty)}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete" data-index="${index}">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editIssueItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.issueDraft.items.splice(index, 1);
      renderIssueDraftItems();
    });
    container.appendChild(card);
  });
}

function editIssueItemQty(index) {
  const item = state.issueDraft.items[index];
  if (!item) return;
  const branchId = getMainBranchId();
  const itemData = getItemDataByType(item.itemType, item.itemId);
  const availableBase = itemData ? getItemStock(itemData, branchId) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(itemData),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.issueDraft.items[index].qty = qty;
      renderIssueDraftItems();
    }
  });
}

function submitIssueVoucher() {
  const errorEl = document.getElementById('issueError');
  if (errorEl) errorEl.textContent = '';
  if (!state.issueDraft.items.length) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  if (state.issueDraft.type === 'order') {
    if (!state.issueDraft.cashierId || !state.issueDraft.invoiceNumber) {
      if (errorEl) errorEl.textContent = window.i18n.t('error');
      return;
    }
  }
  if (state.issueDraft.type === 'production') {
    if (!state.issueDraft.productionStaffId) {
      if (errorEl) errorEl.textContent = window.i18n.t('error');
      return;
    }
  }

  const cashiers = state.cache.cashiers || {};
  const productionStaff = state.cache.productionStaff || {};
  const cashier = cashiers[state.issueDraft.cashierId] || null;
  const staff = productionStaff[state.issueDraft.productionStaffId] || null;
  const productionStaffName = getStaffLabel(staff, null);
  const mainBranchId = getMainBranchId();
  if (!mainBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const issueType = state.issueDraft.type;

  if (state.issueDraft.editingId) {
    const editingId = state.issueDraft.editingId;
    const existing = state.cache.stockIssue?.[editingId];
    const branchId = existing?.branchId || mainBranchId;
    const payload = {
      issueType,
      cashierId: issueType === 'order' ? state.issueDraft.cashierId : null,
      cashierName: issueType === 'order' ? (cashier?.name || cashier?.code || null) : null,
      invoiceNumber: issueType === 'order' ? state.issueDraft.invoiceNumber : null,
      productionStaffId: issueType === 'production' ? state.issueDraft.productionStaffId : null,
      productionStaffName: issueType === 'production' ? productionStaffName : null,
      items: state.issueDraft.items
    };
    db.ref(`stockIssue/${editingId}`).update(payload).then(() => {
      const diffs = diffItems(state.issueDraft.originalItems, state.issueDraft.items);
      const updates = diffs.map((diff) => updateItemStock(diff.itemType, diff.itemId, branchId, -Number(diff.qtyDiff || 0)));
      Promise.all(updates).then(() => {
        resetIssueDraft();
        renderIssueSection();
        closeIssueModal();
      });
    });
    return;
  }

  generateCounter('meta/issueCounter').then((issueNumber) => {
    const payload = {
      issueNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      issueType,
      cashierId: issueType === 'order' ? state.issueDraft.cashierId : null,
      cashierName: issueType === 'order' ? (cashier?.name || cashier?.code || null) : null,
      invoiceNumber: issueType === 'order' ? state.issueDraft.invoiceNumber : null,
      productionStaffId: issueType === 'production' ? state.issueDraft.productionStaffId : null,
      productionStaffName: issueType === 'production' ? productionStaffName : null,
      items: state.issueDraft.items,
      branchId: mainBranchId
    };
    const issueRef = db.ref('stockIssue').push();
    issueRef.set(payload).then(() => {
      const updates = state.issueDraft.items.map((item) => updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
      Promise.all(updates).then(() => {
        resetIssueDraft();
        renderIssueSection();
        closeIssueModal();
      });
    });
  });
}

function renderIssueTable() {
  const table = document.getElementById('issueTable');
  if (!table) return;
  const issues = state.cache.stockIssue || {};
  let entries = Object.entries(issues).map(([id, issue]) => ({ id, ...issue }));
  if (state.issueFilter !== 'all') {
    entries = entries.filter((issue) => issue.issueType === state.issueFilter);
  }
  entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="9">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((issue) => {
    const items = normalizeItems(issue.items);
    const row = document.createElement('tr');
    const staffLabel = issue.productionStaffName || getStaffLabel(state.cache.productionStaff?.[issue.productionStaffId], '-') || '-';
    row.innerHTML = `
      <td>${issue.issueNumber || '-'}</td>
      <td>${issue.issueType === 'production' ? window.i18n.t('issue_production') : window.i18n.t('issue_order')}</td>
      <td>${formatDate(issue.createdAt)}</td>
      <td>${issue.storekeeperName || '-'}</td>
      <td>${issue.cashierName || '-'}</td>
      <td>${staffLabel}</td>
      <td>${issue.invoiceNumber || '-'}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="view"]').addEventListener('click', () => openIssueDetails(issue));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openIssueEditModal(issue));
    row.querySelector('[data-action="print"]').addEventListener('click', () => printIssueReport(issue));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteIssue(issue));
    table.appendChild(row);
  });
}

function isIssueLinked(issueId) {
  if (!issueId) return false;
  const productions = state.cache.production || {};
  return Object.values(productions).some((prod) => prod.issueId === issueId);
}

function deleteIssue(issue) {
  if (!issue?.id) return;
  if (isIssueLinked(issue.id)) {
    alert(window.i18n.t('cannot_delete_linked_issue'));
    return;
  }
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const branchId = issue.branchId || getMainBranchId();
  const items = normalizeItems(issue.items);
  const updates = items.map((item) => updateItemStock(item.itemType, item.itemId, branchId, Number(item.qty || 0)));
  Promise.all(updates).then(() => {
    db.ref(`stockIssue/${issue.id}`).remove();
  });
}

function openIssueDetails(issue) {
  if (!els.issueDetailOverlay || !els.issueDetailBody) return;
  const items = normalizeItems(issue.items);
  const itemsHtml = items.map((item) => {
    const typeLabel = item.itemType === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    return `<div class="row" style="justify-content: space-between;">
      <span>${item.name}</span>
      <span>${typeLabel} - ${window.i18n.t('quantity')}: ${formatNumber(item.qty)}</span>
    </div>`;
  }).join('');
  els.issueDetailBody.innerHTML = `
    <div class="notice" style="margin-bottom: 12px;">
      <div>${window.i18n.t('issue_number')}: ${issue.issueNumber || '-'}</div>
      <div>${window.i18n.t('issue_type')}: ${issue.issueType === 'production' ? window.i18n.t('issue_production') : window.i18n.t('issue_order')}</div>
      <div>${window.i18n.t('date_time')}: ${formatDate(issue.createdAt)}</div>
      <div>${window.i18n.t('storekeeper_name')}: ${issue.storekeeperName || '-'}</div>
      <div>${window.i18n.t('invoice_number')}: ${issue.invoiceNumber || '-'}</div>
    </div>
    <div class="stack">${itemsHtml || window.i18n.t('no_data')}</div>
  `;
  els.issueDetailOverlay.classList.remove('hidden');
}

function setupProductionSection() {
  const section = document.getElementById('section-production');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('production')}</h3>
        <button id="openProductionModalBtn" class="btn primary">${window.i18n.t('new_production')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('production_voucher')}</th>
            <th>${window.i18n.t('products')}</th>
            <th>${window.i18n.t('quantity')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('production_date')}</th>
            <th>${window.i18n.t('expiry_date')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('production_staff')}</th>
            <th>${window.i18n.t('issue_number')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="productionTable"></tbody>
      </table>
    </div>
    <div id="productionVoucherModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('new_production')}</h3>
          <button id="productionModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="productionStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('production_staff')}</label>
            <select id="productionStaffSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="productionSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_items')}" />
          <button id="productionSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="productionSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div id="productionDraftSummary" style="margin-top: 16px;"></div>
        <div class="row" style="justify-content: flex-end; margin-top: 12px;">
          <button id="productionCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="productionLinkBtn" class="btn ghost">${window.i18n.t('next')}</button>
          <button id="productionPrintBtn" class="btn primary">${window.i18n.t('print_label')}</button>
        </div>
        <p id="productionError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetProductionDraft();
  bindProductionSection();
  renderProductionSection();
}

function resetProductionDraft() {
  state.productionDraft = {
    item: null,
    itemType: null,
    qty: null,
    productionDate: '',
    expiryDate: '',
    issueId: null,
    productionStaffId: '',
    editingId: null,
    originalRecord: null
  };
}

function bindProductionSection() {
  const openBtn = document.getElementById('openProductionModalBtn');
  const closeBtn = document.getElementById('productionModalCloseBtn');
  const cancelBtn = document.getElementById('productionCancelBtn');
  const staffSelect = document.getElementById('productionStaffSelect');
  const searchInput = document.getElementById('productionSearchInput');
  const searchBtn = document.getElementById('productionSearchBtn');
  const linkBtn = document.getElementById('productionLinkBtn');
  const printBtn = document.getElementById('productionPrintBtn');

  if (openBtn) {
    openBtn.addEventListener('click', () => openProductionModal());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeProductionModal());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeProductionModal());
  }

  if (staffSelect) {
    staffSelect.addEventListener('change', () => {
      state.productionDraft.productionStaffId = staffSelect.value;
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderProductionSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleProductionBarcodeScan();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => renderProductionSearchResults());
  }

  if (linkBtn) {
    linkBtn.addEventListener('click', () => openProductionLinkModal());
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => submitProductionVoucher());
  }
}

function openProductionModal() {
  const overlay = document.getElementById('productionVoucherModal');
  if (!overlay) return;
  resetProductionDraft();
  renderProductionSection();
  const errorEl = document.getElementById('productionError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('productionSearchInput');
  if (searchInput) searchInput.value = '';
  renderProductionSearchResults();
  overlay.classList.remove('hidden');
}

function openProductionEditModal(record) {
  const overlay = document.getElementById('productionVoucherModal');
  if (!overlay || !record) return;
  resetProductionDraft();
  const itemData = record.itemType === 'product'
    ? state.cache.products?.[record.itemId]
    : state.cache.stockMaterials?.[record.itemId];
  if (itemData) {
    state.productionDraft.item = { id: record.itemId, type: record.itemType || 'product', item: itemData };
    state.productionDraft.itemType = record.itemType || 'product';
  }
  state.productionDraft.qty = record.qty || null;
  state.productionDraft.productionDate = record.productionDate || '';
  state.productionDraft.expiryDate = record.expiryDate || '';
  state.productionDraft.issueId = record.issueId || null;
  state.productionDraft.productionStaffId = record.productionStaffId || '';
  state.productionDraft.editingId = record.id || null;
  state.productionDraft.originalRecord = { ...record };
  renderProductionSection();
  const errorEl = document.getElementById('productionError');
  if (errorEl) errorEl.textContent = '';
  overlay.classList.remove('hidden');
}

function closeProductionModal() {
  const overlay = document.getElementById('productionVoucherModal');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function renderProductionSection() {
  if (!state.productionDraft) {
    resetProductionDraft();
  }
  const storekeeperInput = document.getElementById('productionStorekeeper');
  if (storekeeperInput) {
    storekeeperInput.value = state.user?.name || '-';
  }
  renderProductionStaffSelect();
  renderProductionSearchResults();
  renderProductionDraft();
  renderProductionTable();
}

function renderProductionStaffSelect() {
  const staffSelect = document.getElementById('productionStaffSelect');
  const staff = state.cache.productionStaff || {};
  if (!staffSelect) return;
  staffSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select');
  staffSelect.appendChild(placeholder);
  Object.entries(staff).forEach(([id, person]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getStaffLabel(person, id);
    staffSelect.appendChild(option);
  });
  staffSelect.value = state.productionDraft.productionStaffId || '';
}

function getProductionSearchEntries() {
  return getAllItems();
}

function handleProductionBarcodeScan() {
  const searchInput = document.getElementById('productionSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getProductionSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openProductionItem(match);
    searchInput.value = '';
    renderProductionSearchResults();
  }
}

function renderProductionSearchResults() {
  const searchInput = document.getElementById('productionSearchInput');
  const results = document.getElementById('productionSearchResults');
  if (!searchInput || !results) return;
  if (state.productionDraft?.item) {
    results.innerHTML = '';
    return;
  }
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getProductionSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openProductionItem(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openProductionItem(entry));
}

function openProductionItem(entry) {
  const errorEl = document.getElementById('productionError');
  if (state.productionDraft.item) {
    if (state.productionDraft.item.id !== entry.id) {
      if (errorEl) errorEl.textContent = window.i18n.t('single_product_only');
    }
    return;
  }
  if (errorEl) errorEl.textContent = '';
  state.productionDraft.item = entry;
  state.productionDraft.itemType = entry.type;
  state.productionDraft.qty = null;
  state.productionDraft.productionDate = '';
  state.productionDraft.expiryDate = '';
  state.productionDraft.issueId = null;
  state.productionDraft.onDatesSelected = () => {
    openQtyModal({
      title: getLocalizedName(entry.item),
      available: null,
      mode: 'add',
      onConfirm: (qty) => {
        state.productionDraft.qty = qty;
        renderProductionDraft();
      }
    });
  };
  openProductionDateModal();
  renderProductionDraft();
}

function clearProductionItem() {
  state.productionDraft.item = null;
  state.productionDraft.itemType = null;
  state.productionDraft.qty = null;
  state.productionDraft.productionDate = '';
  state.productionDraft.expiryDate = '';
  state.productionDraft.issueId = null;
  const errorEl = document.getElementById('productionError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('productionSearchInput');
  if (searchInput) searchInput.value = '';
}

function renderProductionDraft() {
  const container = document.getElementById('productionDraftSummary');
  const linkBtn = document.getElementById('productionLinkBtn');
  const printBtn = document.getElementById('productionPrintBtn');
  const searchInput = document.getElementById('productionSearchInput');
  const searchBtn = document.getElementById('productionSearchBtn');
  if (!container) return;
  if (printBtn) {
    printBtn.textContent = state.productionDraft?.editingId ? window.i18n.t('update') : window.i18n.t('print_label');
  }
  if (!state.productionDraft.item) {
    container.innerHTML = `<p class="helper">${window.i18n.t('select')}</p>`;
    if (linkBtn) linkBtn.disabled = true;
    if (printBtn) printBtn.disabled = true;
    if (searchInput) searchInput.disabled = false;
    if (searchBtn) searchBtn.disabled = false;
    return;
  }
  const item = state.productionDraft.item;
  const issue = state.cache.stockIssue?.[state.productionDraft.issueId];
  container.innerHTML = `
    <div class="notice">
      <div><strong>${getLocalizedName(item.item)}</strong></div>
      <div class="helper">${window.i18n.t('quantity')}: ${state.productionDraft.qty ?? '-'}</div>
      <button id="productionEditQty" class="btn ghost small" style="margin-top: 6px;">${window.i18n.t('edit')}</button>
      <div class="helper">${window.i18n.t('production_date')}: ${state.productionDraft.productionDate || '-'}</div>
      <div class="helper">${window.i18n.t('expiry_date')}: ${state.productionDraft.expiryDate || '-'}</div>
      <div class="helper">${window.i18n.t('issue_number')}: ${issue?.issueNumber || '-'}</div>
      <button id="productionChangeItem" class="btn ghost small" style="margin-top: 8px;">${window.i18n.t('change_product')}</button>
    </div>
  `;
  if (searchInput) searchInput.disabled = true;
  if (searchBtn) searchBtn.disabled = true;
  const changeBtn = document.getElementById('productionChangeItem');
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      clearProductionItem();
      renderProductionDraft();
      renderProductionSearchResults();
    });
  }
  const editQtyBtn = document.getElementById('productionEditQty');
  if (editQtyBtn) {
    editQtyBtn.addEventListener('click', () => {
      openQtyModal({
        title: getLocalizedName(item.item),
        available: null,
        mode: 'add',
        onConfirm: (qty) => {
          state.productionDraft.qty = qty;
          renderProductionDraft();
        }
      });
    });
  }
  const readyForLink = Boolean(state.productionDraft.productionDate && state.productionDraft.expiryDate && state.productionDraft.qty);
  if (linkBtn) linkBtn.disabled = !readyForLink;
  const readyForPrint = readyForLink && Boolean(state.productionDraft.issueId) && Boolean(state.productionDraft.productionStaffId);
  if (printBtn) printBtn.disabled = !readyForPrint;
}

function renderProductionIssueList() {
  if (!els.productionIssueList) return;
  const issues = state.cache.stockIssue || {};
  const entries = Object.entries(issues)
    .map(([id, issue]) => ({ id, ...issue }))
    .filter((issue) => issue.issueType === 'production')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  els.productionIssueList.innerHTML = '';
  if (entries.length === 0) {
    els.productionIssueList.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach((issue) => {
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <label class="row" style="justify-content: space-between; width: 100%;">
        <span>${window.i18n.t('issue_number')}: ${issue.issueNumber || '-'}</span>
        <input type="radio" name="productionIssue" value="${issue.id}" ${state.productionDraft.issueId === issue.id ? 'checked' : ''} />
      </label>
    `;
    els.productionIssueList.appendChild(card);
  });
}

function submitProductionVoucher() {
  const errorEl = document.getElementById('productionError');
  if (errorEl) errorEl.textContent = '';
  if (!state.productionDraft.item || !state.productionDraft.qty || !state.productionDraft.productionDate || !state.productionDraft.expiryDate) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  if (!state.productionDraft.productionStaffId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  if (!state.productionDraft.issueId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const staff = state.cache.productionStaff?.[state.productionDraft.productionStaffId];
  const productionStaffName = getStaffLabel(staff, null);
  const issue = state.cache.stockIssue?.[state.productionDraft.issueId];
  const mainBranchId = getMainBranchId();
  if (!mainBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  if (state.productionDraft.editingId) {
    const editingId = state.productionDraft.editingId;
    const original = state.productionDraft.originalRecord || {};
    const itemData = state.productionDraft.item?.item || {};
    const payload = {
      productionStaffId: state.productionDraft.productionStaffId,
      productionStaffName: productionStaffName,
      issueId: state.productionDraft.issueId,
      issueNumber: issue?.issueNumber || null,
      itemId: state.productionDraft.item?.id || original.itemId,
      itemType: state.productionDraft.itemType || original.itemType,
      itemName: getLocalizedName(itemData) || original.itemName || '-',
      itemNameAr: itemData.nameAr || itemData.name || original.itemNameAr || null,
      itemNameEn: itemData.nameEn || itemData.name || original.itemNameEn || null,
      qty: state.productionDraft.qty,
      productionDate: state.productionDraft.productionDate,
      expiryDate: state.productionDraft.expiryDate
    };
    db.ref(`production/${editingId}`).update(payload).then(() => {
      const branchId = original.branchId || mainBranchId;
      const oldItemType = original.itemType;
      const oldItemId = original.itemId;
      const oldQty = Number(original.qty || 0);
      const newItemType = state.productionDraft.itemType || oldItemType;
      const newItemId = state.productionDraft.item?.id || oldItemId;
      const newQty = Number(state.productionDraft.qty || 0);
      const updates = [];
      if (oldItemType === newItemType && oldItemId === newItemId) {
        const diff = newQty - oldQty;
        if (diff !== 0) {
          updates.push(updateItemStock(newItemType, newItemId, branchId, diff));
        }
      } else {
        updates.push(updateItemStock(oldItemType, oldItemId, branchId, -oldQty));
        updates.push(updateItemStock(newItemType, newItemId, branchId, newQty));
      }
      Promise.all(updates).then(() => {
        resetProductionDraft();
        renderProductionSection();
        closeProductionModal();
      });
    });
    return;
  }

  generateCounter('meta/productionCounter').then((productionNumber) => {
    const productionBarcode = generateBarcodeValue();
    const itemData = state.productionDraft.item?.item || {};
    const payload = {
      productionNumber,
      productionBarcode,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      productionStaffId: state.productionDraft.productionStaffId,
      productionStaffName: productionStaffName,
      issueId: state.productionDraft.issueId,
      issueNumber: issue?.issueNumber || null,
      itemId: state.productionDraft.item.id,
      itemType: state.productionDraft.itemType,
      itemName: getLocalizedName(itemData),
      itemNameAr: itemData.nameAr || itemData.name || null,
      itemNameEn: itemData.nameEn || itemData.name || null,
      qty: state.productionDraft.qty,
      productionDate: state.productionDraft.productionDate,
      expiryDate: state.productionDraft.expiryDate,
      branchId: mainBranchId
    };
    const productionRef = db.ref('production').push();
    productionRef.set(payload).then(() => {
      updateItemStock(state.productionDraft.itemType, state.productionDraft.item.id, mainBranchId, Number(state.productionDraft.qty || 0)).then(() => {
        printProductionLabel(payload);
        resetProductionDraft();
        renderProductionSection();
        closeProductionModal();
      });
    });
  });
}

function renderProductionTable() {
  const table = document.getElementById('productionTable');
  if (!table) return;
  const records = state.cache.production || {};
  const entries = Object.entries(records).map(([id, rec]) => ({ id, ...rec })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="10">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const row = document.createElement('tr');
    const staffLabel = rec.productionStaffName || getStaffLabel(state.cache.productionStaff?.[rec.productionStaffId], '-') || '-';
    row.innerHTML = `
      <td>${rec.productionNumber || '-'}</td>
      <td>${rec.itemName || '-'}</td>
      <td>${formatNumber(rec.qty)}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${rec.productionDate || '-'}</td>
      <td>${rec.expiryDate || '-'}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${staffLabel}</td>
      <td><button class="btn ghost small" data-action="issue">${rec.issueNumber || '-'}</button></td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="report">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_label')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printProductionLabel(rec));
    row.querySelector('[data-action="report"]').addEventListener('click', () => printProductionReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openProductionEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProduction(rec));
    row.querySelector('[data-action="issue"]').addEventListener('click', () => {
      const issue = state.cache.stockIssue?.[rec.issueId];
      if (issue) openIssueDetails(issue);
    });
    table.appendChild(row);
  });
}

function deleteProduction(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const branchId = record.branchId || getMainBranchId();
  updateItemStock(record.itemType, record.itemId, branchId, -Number(record.qty || 0)).then(() => {
    db.ref(`production/${record.id}`).remove();
  });
}

function getProductionLabelNames(record) {
  if (!record) return { nameAr: '', nameEn: '' };
  const nameAr = record.itemNameAr || record.itemName || '';
  const nameEn = record.itemNameEn || '';
  if (nameAr && nameEn) return { nameAr, nameEn };
  const cache = record.itemType === 'product' ? state.cache.products : state.cache.stockMaterials;
  const item = cache?.[record.itemId];
  if (!item) return { nameAr, nameEn };
  return {
    nameAr: nameAr || item.nameAr || item.name || record.itemName || '',
    nameEn: nameEn || item.nameEn || item.name || record.itemName || ''
  };
}

function printProductionLabel(record) {
  if (!record) return;
  const names = getProductionLabelNames(record);
  const barcodeValue = record.productionBarcode || generateBarcodeValue();
  const labelWidthMm = 50;
  const labelHeightMm = 30;
  const offsetXmm = 0;
  const offsetYmm = -15;
  const contentShiftYmm = 4;
  const paddingXmm = 4;
  const paddingYmm = 3;
  const html = `
    <html>
      <head>
        <title>${names.nameAr || names.nameEn || record.itemName || ''}</title>
        <style>
          @page { size: ${labelWidthMm}mm ${labelHeightMm}mm; margin: 0; }
          html, body { width: ${labelWidthMm}mm; height: ${labelHeightMm}mm; margin: 0; padding: 0; }
          body { font-family: "Cairo", sans-serif; overflow: hidden; }
          .sheet { width: ${labelWidthMm}mm; height: ${labelHeightMm}mm; overflow: hidden; }
          .label {
            width: ${labelWidthMm}mm;
            height: ${labelHeightMm}mm;
            padding: ${paddingYmm}mm ${paddingXmm}mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            transform: translate(${offsetXmm}mm, ${offsetYmm}mm);
          }
          .label-content {
            display: flex;
            flex-direction: column;
            gap: 1mm;
            height: 100%;
            transform: translateY(${contentShiftYmm}mm);
          }
          .title { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.2; }
          .title.en { font-size: 9.5px; font-weight: 600; direction: ltr; }
          .dates { font-size: 9px; font-weight: 700; text-align: center; line-height: 1.2; white-space: nowrap; }
          .barcode { margin-top: auto; text-align: center; }
          #labelBarcode { width: 100%; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="sheet">
          <div class="label">
            <div class="label-content">
              <div class="title">${names.nameAr || record.itemName || ''}</div>
              <div class="title en">${names.nameEn || record.itemName || ''}</div>
              <div class="dates">انتاج: ${record.productionDate || '-'} / انتهاء: ${record.expiryDate || '-'}</div>
              <div class="barcode">
                <svg id="labelBarcode"></svg>
              </div>
            </div>
          </div>
        </div>
        <script>
          JsBarcode("#labelBarcode", "${barcodeValue}", { format: "CODE128", displayValue: true, height: 24, width: 1.1, margin: 0, fontSize: 8, textMargin: 1 });
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `;
  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function setupInventoryCountSection() {
  const section = document.getElementById('section-inventoryCount');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('inventory_count')}</h3>
        <button id="openInventoryModalBtn" class="btn primary">${window.i18n.t('new_inventory')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('count_number')}</th>
            <th>${window.i18n.t('branches')}</th>
            <th>${window.i18n.t('storage_locations')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="inventoryTable"></tbody>
      </table>
    </div>
    <div id="inventoryVoucherModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('new_inventory')}</h3>
          <button id="inventoryModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="inventoryStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('branches')}</label>
            <select id="inventoryBranchSelect" class="input"></select>
          </div>
        </div>
        <div id="inventoryStorageWrap" class="grid two hidden" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storage_locations')}</label>
            <select id="inventoryStorageSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="inventorySearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_items')}" />
          <button id="inventorySearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="inventorySearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="inventoryItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="inventoryCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="inventoryConfirmBtn" class="btn primary">${window.i18n.t('confirm')}</button>
        </div>
        <p id="inventoryError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetInventoryDraft();
  bindInventorySection();
  renderInventorySection();
}

function resetInventoryDraft() {
  state.inventoryDraft = {
    branchId: '',
    storageLocationId: '',
    items: [],
    editingId: null,
    originalItems: []
  };
}

function bindInventorySection() {
  const openBtn = document.getElementById('openInventoryModalBtn');
  const closeBtn = document.getElementById('inventoryModalCloseBtn');
  const cancelBtn = document.getElementById('inventoryCancelBtn');
  const branchSelect = document.getElementById('inventoryBranchSelect');
  const storageSelect = document.getElementById('inventoryStorageSelect');
  const searchInput = document.getElementById('inventorySearchInput');
  const searchBtn = document.getElementById('inventorySearchBtn');
  const confirmBtn = document.getElementById('inventoryConfirmBtn');

  if (openBtn) {
    openBtn.addEventListener('click', () => openInventoryModal());
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeInventoryModal());
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeInventoryModal());
  }

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      state.inventoryDraft.branchId = branchSelect.value;
      updateInventoryStorageVisibility();
      renderInventorySearchResults();
    });
  }

  if (storageSelect) {
    storageSelect.addEventListener('change', () => {
      state.inventoryDraft.storageLocationId = storageSelect.value;
      renderInventorySearchResults();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderInventorySearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInventoryBarcodeScan();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => renderInventorySearchResults());
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => submitInventoryCount());
  }
}

function openInventoryModal() {
  const overlay = document.getElementById('inventoryVoucherModal');
  if (!overlay) return;
  resetInventoryDraft();
  renderInventorySection();
  const errorEl = document.getElementById('inventoryError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('inventorySearchInput');
  if (searchInput) searchInput.value = '';
  renderInventorySearchResults();
  overlay.classList.remove('hidden');
}

function openInventoryEditModal(record) {
  const overlay = document.getElementById('inventoryVoucherModal');
  if (!overlay || !record) return;
  resetInventoryDraft();
  state.inventoryDraft.editingId = record.id || null;
  state.inventoryDraft.branchId = record.branchId || '';
  state.inventoryDraft.storageLocationId = record.storageLocationId || '';
  state.inventoryDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
  state.inventoryDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
  renderInventorySection();
  const errorEl = document.getElementById('inventoryError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('inventorySearchInput');
  if (searchInput) searchInput.value = '';
  renderInventorySearchResults();
  overlay.classList.remove('hidden');
}

function closeInventoryModal() {
  const overlay = document.getElementById('inventoryVoucherModal');
  if (!overlay) return;
  overlay.classList.add('hidden');
}

function renderInventorySection() {
  if (!state.inventoryDraft) {
    resetInventoryDraft();
  }
  const storekeeperInput = document.getElementById('inventoryStorekeeper');
  if (storekeeperInput) {
    storekeeperInput.value = state.user?.name || '-';
  }
  renderInventorySelects();
  updateInventoryStorageVisibility();
  renderInventorySearchResults();
  renderInventoryItems();
  renderInventoryTable();
}

function renderInventorySelects() {
  const branchSelect = document.getElementById('inventoryBranchSelect');
  const storageSelect = document.getElementById('inventoryStorageSelect');
  const branches = state.cache.branches || {};
  const storageLocations = state.cache.storageLocations || {};

  if (branchSelect) {
    branchSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select_branch');
    branchSelect.appendChild(placeholder);
    Object.entries(branches).forEach(([id, branch]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(branch);
      branchSelect.appendChild(option);
    });
    branchSelect.value = state.inventoryDraft.branchId || '';
  }

  if (storageSelect) {
    storageSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select');
    storageSelect.appendChild(placeholder);
    Object.entries(storageLocations).forEach(([id, location]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(location);
      storageSelect.appendChild(option);
    });
    storageSelect.value = state.inventoryDraft.storageLocationId || '';
  }
}

function updateInventoryStorageVisibility() {
  const wrap = document.getElementById('inventoryStorageWrap');
  const branchId = state.inventoryDraft.branchId;
  const branches = state.cache.branches || {};
  const isMain = branchId && branches[branchId]?.isMain;
  if (wrap) {
    wrap.classList.toggle('hidden', !isMain);
  }
  if (!isMain) {
    state.inventoryDraft.storageLocationId = '';
    const storageSelect = document.getElementById('inventoryStorageSelect');
    if (storageSelect) storageSelect.value = '';
  }
}

function getInventorySearchEntries() {
  const entries = getAllItems();
  const branchId = state.inventoryDraft.branchId;
  const branches = state.cache.branches || {};
  const isMain = branchId && branches[branchId]?.isMain;
  const storageId = state.inventoryDraft.storageLocationId;
  if (isMain && storageId) {
    return entries.filter((entry) => entry.item.storageLocationId === storageId);
  }
  return entries;
}

function handleInventoryBarcodeScan() {
  const searchInput = document.getElementById('inventorySearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getInventorySearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openInventoryQtyModal(match);
    searchInput.value = '';
    renderInventorySearchResults();
  }
}

function renderInventorySearchResults() {
  const searchInput = document.getElementById('inventorySearchInput');
  const results = document.getElementById('inventorySearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getInventorySearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openInventoryQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openInventoryQtyModal(entry));
}

function openInventoryQtyModal(entry) {
  const branchId = state.inventoryDraft.branchId || getMainBranchId();
  const available = getItemStock(entry.item, branchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'set',
    onConfirm: (qty) => {
      addInventoryItem(entry, qty);
    }
  });
}

function addInventoryItem(entry, qty) {
  const existing = state.inventoryDraft.items.find((item) => item.itemId === entry.id && item.itemType === entry.type);
  if (existing) {
    existing.qty = qty;
  } else {
    state.inventoryDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderInventoryItems();
}

function renderInventoryItems() {
  const container = document.getElementById('inventoryItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.inventoryDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.inventoryDraft.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'notice';
    const typeLabel = item.itemType === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${item.name}</strong>
          <div class="helper">${typeLabel} - ${window.i18n.t('quantity')}: ${formatNumber(item.qty)}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete" data-index="${index}">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editInventoryItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.inventoryDraft.items.splice(index, 1);
      renderInventoryItems();
    });
    container.appendChild(card);
  });
}

function editInventoryItemQty(index) {
  const item = state.inventoryDraft.items[index];
  if (!item) return;
  openQtyModal({
    title: item.name,
    available: null,
    mode: 'set',
    onConfirm: (qty) => {
      state.inventoryDraft.items[index].qty = qty;
      renderInventoryItems();
    }
  });
}

function submitInventoryCount() {
  const errorEl = document.getElementById('inventoryError');
  if (errorEl) errorEl.textContent = '';
  if (!state.inventoryDraft.branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  if (!state.inventoryDraft.items.length) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const branchId = state.inventoryDraft.branchId;
  const storageLocationId = state.inventoryDraft.storageLocationId || null;
  const branches = state.cache.branches || {};
  const isMain = branchId && branches[branchId]?.isMain;
  if (isMain && !storageLocationId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  const itemsWithPrevious = state.inventoryDraft.items.map((item) => {
    const itemData = item.itemType === 'product'
      ? state.cache.products?.[item.itemId]
      : state.cache.stockMaterials?.[item.itemId];
    const previousQty = itemData ? getItemStock(itemData, branchId) : 0;
    return { ...item, previousQty };
  });

  if (state.inventoryDraft.editingId) {
    const editingId = state.inventoryDraft.editingId;
    const existing = state.cache.inventoryCount?.[editingId];
    const payload = {
      branchId,
      storageLocationId,
      items: itemsWithPrevious
    };
    db.ref(`inventoryCount/${editingId}`).update(payload).then(() => {
      const updates = [];
      itemsWithPrevious.forEach((item) => {
        updates.push(updateItemStock(item.itemType, item.itemId, branchId, Number(item.qty || 0), 'set'));
      });
      const oldMap = buildItemMap(existing?.items || []);
      const newMap = buildItemMap(state.inventoryDraft.items);
      Object.keys(oldMap).forEach((key) => {
        if (!newMap[key]) {
          const oldItem = oldMap[key];
          const previousQty = normalizeItems(existing?.items || []).find((it) => getItemKey(it) === key)?.previousQty;
          if (previousQty !== undefined && previousQty !== null) {
            updates.push(updateItemStock(oldItem.itemType, oldItem.itemId, branchId, Number(previousQty || 0), 'set'));
          }
        }
      });
      Promise.all(updates).then(() => {
        resetInventoryDraft();
        renderInventorySection();
        closeInventoryModal();
      });
    });
    return;
  }

  generateCounter('meta/inventoryCounter').then((countNumber) => {
    const payload = {
      countNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      branchId,
      storageLocationId,
      items: itemsWithPrevious
    };
    const countRef = db.ref('inventoryCount').push();
    countRef.set(payload).then(() => {
      const updates = itemsWithPrevious.map((item) => updateItemStock(item.itemType, item.itemId, branchId, Number(item.qty || 0), 'set'));
      Promise.all(updates).then(() => {
        resetInventoryDraft();
        renderInventorySection();
        closeInventoryModal();
      });
    });
  });
}

function renderInventoryTable() {
  const table = document.getElementById('inventoryTable');
  if (!table) return;
  const records = state.cache.inventoryCount || {};
  const branches = state.cache.branches || {};
  const storageLocations = state.cache.storageLocations || {};
  const entries = Object.entries(records).map(([id, rec]) => ({ id, ...rec })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.countNumber || '-'}</td>
      <td>${getLocalizedName(branches[rec.branchId]) || '-'}</td>
      <td>${getLocalizedName(storageLocations[rec.storageLocationId]) || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printInventoryReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openInventoryEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteInventoryCount(rec));
    table.appendChild(row);
  });
}

function deleteInventoryCount(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const branchId = record.branchId;
  const items = normalizeItems(record.items);
  if (!items.length) {
    db.ref(`inventoryCount/${record.id}`).remove();
    return;
  }
  const hasMissingPrevious = items.some((item) => item.previousQty === undefined || item.previousQty === null);
  if (hasMissingPrevious) {
    alert(window.i18n.t('cannot_revert_inventory'));
    return;
  }
  const updates = items.map((item) => updateItemStock(item.itemType, item.itemId, branchId, Number(item.previousQty || 0), 'set'));
  Promise.all(updates).then(() => {
    db.ref(`inventoryCount/${record.id}`).remove();
  });
}

function setupReceivingSection() {
  const section = document.getElementById('section-receiving');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('receiving')}</h3>
        <button id="openReceivingModalBtn" class="btn primary">${window.i18n.t('new_receiving')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('receiving_number')}</th>
            <th>${window.i18n.t('source_name')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('storage_locations')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="receivingTable"></tbody>
      </table>
    </div>
    <div id="receivingVoucherModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('receiving_voucher')}</h3>
          <button id="receivingModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('source_name')}</label>
            <input id="receivingSourceName" class="input" />
          </div>
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="receivingStorekeeper" class="input" readonly />
          </div>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('item_name_ar')}</label>
            <input id="receivingItemNameAr" class="input" />
          </div>
          <div>
            <label class="tag">${window.i18n.t('item_name_en')}</label>
            <input id="receivingItemNameEn" class="input" />
          </div>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('quantity')}</label>
            <input id="receivingItemQty" class="input" type="number" step="0.01" />
          </div>
          <div>
            <label class="tag">${window.i18n.t('storage_location')}</label>
            <select id="receivingItemStorage" class="input"></select>
          </div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 12px;">
          <button id="receivingAddItemBtn" class="btn ghost small">${window.i18n.t('add')}</button>
        </div>
        <div style="margin-top: 12px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="receivingItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="receivingCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="receivingSubmitBtn" class="btn primary">${window.i18n.t('receive_action')}</button>
        </div>
        <p id="receivingError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetReceivingDraft();
  bindReceivingSection();
  renderReceivingSection();
}

function resetReceivingDraft() {
  state.receivingDraft = {
    sourceName: '',
    items: [],
    editingId: null
  };
}

function bindReceivingSection() {
  const openBtn = document.getElementById('openReceivingModalBtn');
  const closeBtn = document.getElementById('receivingModalCloseBtn');
  const cancelBtn = document.getElementById('receivingCancelBtn');
  const sourceInput = document.getElementById('receivingSourceName');
  const nameArInput = document.getElementById('receivingItemNameAr');
  const nameEnInput = document.getElementById('receivingItemNameEn');
  const qtyInput = document.getElementById('receivingItemQty');
  const storageSelect = document.getElementById('receivingItemStorage');
  const addBtn = document.getElementById('receivingAddItemBtn');
  const submitBtn = document.getElementById('receivingSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openReceivingModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeReceivingModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeReceivingModal());

  if (sourceInput) {
    sourceInput.addEventListener('input', () => {
      state.receivingDraft.sourceName = sourceInput.value.trim();
      const errorEl = document.getElementById('receivingError');
      if (errorEl) errorEl.textContent = '';
    });
  }

  const handleAdd = () => {
    const errorEl = document.getElementById('receivingError');
    if (errorEl) errorEl.textContent = '';
    const nameAr = nameArInput?.value.trim() || '';
    const nameEn = nameEnInput?.value.trim() || '';
    const qtyValue = qtyInput?.value.trim() || '';
    const qty = Number(String(qtyValue).replace(',', '.'));
    const storageLocationId = storageSelect?.value || '';
    if (!nameAr || !nameEn || !qty || Number.isNaN(qty) || !storageLocationId) {
      if (errorEl) errorEl.textContent = window.i18n.t('error');
      return;
    }
    state.receivingDraft.items.push({ nameAr, nameEn, qty, storageLocationId });
    if (nameArInput) nameArInput.value = '';
    if (nameEnInput) nameEnInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (storageSelect) storageSelect.value = '';
    renderReceivingItems();
  };

  if (addBtn) addBtn.addEventListener('click', handleAdd);
  if (qtyInput) {
    qtyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    });
  }

  if (submitBtn) submitBtn.addEventListener('click', () => submitReceivingVoucher());
}

function openReceivingModal() {
  const overlay = document.getElementById('receivingVoucherModal');
  if (!overlay) return;
  resetReceivingDraft();
  renderReceivingSection();
  const errorEl = document.getElementById('receivingError');
  if (errorEl) errorEl.textContent = '';
  const nameArInput = document.getElementById('receivingItemNameAr');
  const nameEnInput = document.getElementById('receivingItemNameEn');
  const qtyInput = document.getElementById('receivingItemQty');
  if (nameArInput) nameArInput.value = '';
  if (nameEnInput) nameEnInput.value = '';
  if (qtyInput) qtyInput.value = '';
  overlay.classList.remove('hidden');
}

function openReceivingEditModal(record) {
  const overlay = document.getElementById('receivingVoucherModal');
  if (!overlay || !record) return;
  resetReceivingDraft();
  state.receivingDraft.editingId = record.id || null;
  state.receivingDraft.sourceName = record.sourceName || '';
  state.receivingDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
  renderReceivingSection();
  const errorEl = document.getElementById('receivingError');
  if (errorEl) errorEl.textContent = '';
  overlay.classList.remove('hidden');
}

function closeReceivingModal() {
  const overlay = document.getElementById('receivingVoucherModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderReceivingSection() {
  if (!state.receivingDraft) resetReceivingDraft();
  const storekeeperInput = document.getElementById('receivingStorekeeper');
  const sourceInput = document.getElementById('receivingSourceName');
  const storageSelect = document.getElementById('receivingItemStorage');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (sourceInput) sourceInput.value = state.receivingDraft.sourceName || '';
  if (storageSelect) {
    renderStorageLocationOptions(storageSelect);
    storageSelect.value = '';
  }
  renderReceivingItems();
  renderReceivingTable();
}

function renderReceivingItems() {
  const container = document.getElementById('receivingItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.receivingDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.receivingDraft.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'notice';
    const nameLine = `${item.nameAr || '-'} / ${item.nameEn || '-'}`;
    const locationName = getLocalizedName(state.cache.storageLocations?.[item.storageLocationId]) || '-';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${nameLine}</strong>
          <div class="helper">${window.i18n.t('quantity')}: ${formatNumber(item.qty)} | ${window.i18n.t('storage_location')}: ${locationName}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete" data-index="${index}">${window.i18n.t('delete')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editReceivingItem(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.receivingDraft.items.splice(index, 1);
      renderReceivingItems();
    });
    container.appendChild(card);
  });
}

function editReceivingItem(index) {
  const item = state.receivingDraft.items[index];
  if (!item) return;
  const nameArInput = document.getElementById('receivingItemNameAr');
  const nameEnInput = document.getElementById('receivingItemNameEn');
  const qtyInput = document.getElementById('receivingItemQty');
  const storageSelect = document.getElementById('receivingItemStorage');
  if (nameArInput) nameArInput.value = item.nameAr || '';
  if (nameEnInput) nameEnInput.value = item.nameEn || '';
  if (qtyInput) qtyInput.value = item.qty || '';
  if (storageSelect) storageSelect.value = item.storageLocationId || '';
  state.receivingDraft.items.splice(index, 1);
  renderReceivingItems();
}

function submitReceivingVoucher() {
  const errorEl = document.getElementById('receivingError');
  if (errorEl) errorEl.textContent = '';
  if (!state.receivingDraft.sourceName || !state.receivingDraft.items.length) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  if (state.receivingDraft.editingId) {
    const editingId = state.receivingDraft.editingId;
    const payload = {
      sourceName: state.receivingDraft.sourceName,
      items: state.receivingDraft.items
    };
    db.ref(`receiving/${editingId}`).update(payload).then(() => {
      resetReceivingDraft();
      renderReceivingSection();
      closeReceivingModal();
    });
    return;
  }
  generateCounter('meta/receivingCounter').then((receivingNumber) => {
    const payload = {
      receivingNumber,
      createdAt: serverTime,
      sourceName: state.receivingDraft.sourceName,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      items: state.receivingDraft.items
    };
    db.ref('receiving').push(payload).then(() => {
      resetReceivingDraft();
      renderReceivingSection();
      closeReceivingModal();
    });
  });
}

function renderReceivingTable() {
  const table = document.getElementById('receivingTable');
  if (!table) return;
  const records = state.cache.receiving || {};
  const storageLocations = state.cache.storageLocations || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    const locationNames = Array.from(new Set(items.map((item) => getLocalizedName(storageLocations[item.storageLocationId]) || '-')))
      .filter((name) => name && name !== '-');
    const locationsText = locationNames.length ? locationNames.join('، ') : '-';
    row.innerHTML = `
      <td>${rec.receivingNumber || '-'}</td>
      <td>${rec.sourceName || '-'}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>${locationsText}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printReceivingReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openReceivingEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteReceiving(rec));
    table.appendChild(row);
  });
}

function deleteReceiving(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  db.ref(`receiving/${record.id}`).remove();
}

function setupSuppliersSection() {
  const section = document.getElementById('section-suppliers');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('suppliers')}</h3>
        <button id="openSupplierModalBtn" class="btn primary">${window.i18n.t('new_supplier')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('supplier_name')}</th>
            <th>${window.i18n.t('phone')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="suppliersTable"></tbody>
      </table>
    </div>
    <div id="supplierModal" class="overlay hidden">
      <div class="modal card" style="max-width: 520px; text-align: start;">
        <h3 id="supplierModalTitle">${window.i18n.t('new_supplier')}</h3>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('name_ar')}</label>
            <input id="supplierNameAr" class="input" />
          </div>
          <div>
            <label class="tag">${window.i18n.t('name_en')}</label>
            <input id="supplierNameEn" class="input" />
          </div>
        </div>
        <div style="margin-top: 12px;">
          <label class="tag">${window.i18n.t('phone')}</label>
          <input id="supplierPhone" class="input" />
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="supplierCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="supplierSaveBtn" class="btn primary">${window.i18n.t('add')}</button>
        </div>
        <p id="supplierError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
    <div id="supplierDetailOverlay" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3 id="supplierDetailTitle"></h3>
          <div class="row" style="gap: 8px;">
            <button id="supplierAddProductBtn" class="btn primary">${window.i18n.t('add_supplier_product')}</button>
            <button id="supplierDetailBackBtn" class="btn ghost">${window.i18n.t('back')}</button>
          </div>
        </div>
        <div id="supplierDetailItems" class="grid two" style="margin-top: 12px;"></div>
      </div>
    </div>
    <div id="supplierPickerOverlay" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('select_products')}</h3>
          <button id="supplierPickerCloseBtn" class="btn ghost">×</button>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="supplierPickerSearch" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
        </div>
        <div id="supplierPickerList" class="grid two" style="margin-top: 12px;"></div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="supplierPickerCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="supplierPickerAddBtn" class="btn primary">${window.i18n.t('add')}</button>
        </div>
      </div>
    </div>
  `;

  resetSupplierDraft();
  bindSuppliersSection();
  renderSuppliersSection();
}

function resetSupplierDraft() {
  state.supplierDraft = {
    editingId: null,
    nameAr: '',
    nameEn: '',
    phone: ''
  };
  state.supplierPickSelection = new Set();
}

function bindSuppliersSection() {
  const openBtn = document.getElementById('openSupplierModalBtn');
  const cancelBtn = document.getElementById('supplierCancelBtn');
  const saveBtn = document.getElementById('supplierSaveBtn');
  const pickerCloseBtn = document.getElementById('supplierPickerCloseBtn');
  const pickerCancelBtn = document.getElementById('supplierPickerCancelBtn');
  const pickerAddBtn = document.getElementById('supplierPickerAddBtn');
  const pickerSearch = document.getElementById('supplierPickerSearch');
  const detailBackBtn = document.getElementById('supplierDetailBackBtn');
  const addProductBtn = document.getElementById('supplierAddProductBtn');

  if (openBtn) openBtn.addEventListener('click', () => openSupplierModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeSupplierModal());
  if (saveBtn) saveBtn.addEventListener('click', () => saveSupplier());
  if (pickerCloseBtn) pickerCloseBtn.addEventListener('click', () => closeSupplierPicker());
  if (pickerCancelBtn) pickerCancelBtn.addEventListener('click', () => closeSupplierPicker());
  if (pickerAddBtn) pickerAddBtn.addEventListener('click', () => applySupplierPickerSelection());
  if (pickerSearch) pickerSearch.addEventListener('input', () => renderSupplierPickerList());
  if (detailBackBtn) detailBackBtn.addEventListener('click', () => closeSupplierDetail());
  if (addProductBtn) addProductBtn.addEventListener('click', () => openSupplierPicker());
}

function openSupplierModal(supplier = null) {
  const overlay = document.getElementById('supplierModal');
  if (!overlay) return;
  resetSupplierDraft();
  const title = document.getElementById('supplierModalTitle');
  const nameArInput = document.getElementById('supplierNameAr');
  const nameEnInput = document.getElementById('supplierNameEn');
  const phoneInput = document.getElementById('supplierPhone');
  const errorEl = document.getElementById('supplierError');
  if (errorEl) errorEl.textContent = '';
  if (supplier) {
    state.supplierDraft.editingId = supplier.id;
    state.supplierDraft.nameAr = supplier.nameAr || '';
    state.supplierDraft.nameEn = supplier.nameEn || '';
    state.supplierDraft.phone = supplier.phone || '';
    if (title) title.textContent = window.i18n.t('edit');
  } else {
    if (title) title.textContent = window.i18n.t('new_supplier');
  }
  if (nameArInput) nameArInput.value = state.supplierDraft.nameAr;
  if (nameEnInput) nameEnInput.value = state.supplierDraft.nameEn;
  if (phoneInput) phoneInput.value = state.supplierDraft.phone;
  overlay.classList.remove('hidden');
}

function closeSupplierModal() {
  const overlay = document.getElementById('supplierModal');
  if (overlay) overlay.classList.add('hidden');
}

function saveSupplier() {
  const nameArInput = document.getElementById('supplierNameAr');
  const nameEnInput = document.getElementById('supplierNameEn');
  const phoneInput = document.getElementById('supplierPhone');
  const errorEl = document.getElementById('supplierError');
  if (errorEl) errorEl.textContent = '';
  const nameAr = nameArInput?.value.trim() || '';
  const nameEn = nameEnInput?.value.trim() || '';
  const phone = phoneInput?.value.trim() || '';
  if (!nameAr || !nameEn) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const payload = { nameAr, nameEn, phone };
  if (state.supplierDraft.editingId) {
    db.ref(`suppliers/${state.supplierDraft.editingId}`).update(payload).then(() => {
      closeSupplierModal();
    });
    return;
  }
  db.ref('suppliers').push({ ...payload, createdAt: serverTime }).then(() => {
    closeSupplierModal();
  });
}

function renderSuppliersSection() {
  renderSuppliersTable();
  renderSupplierDetail();
}

function renderSuppliersTable() {
  const table = document.getElementById('suppliersTable');
  if (!table) return;
  const suppliers = state.cache.suppliers || {};
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  const counts = {};
  Object.values(products).forEach((item) => {
    if (item.supplierId) counts[item.supplierId] = (counts[item.supplierId] || 0) + 1;
  });
  Object.values(materials).forEach((item) => {
    if (item.supplierId) counts[item.supplierId] = (counts[item.supplierId] || 0) + 1;
  });
  const entries = Object.entries(suppliers).map(([id, supplier]) => ({ id, ...supplier }));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((supplier) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${getLocalizedName(supplier) || '-'}</td>
      <td>${supplier.phone || '-'}</td>
      <td>${counts[supplier.id] || 0}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="view"]').addEventListener('click', () => openSupplierDetail(supplier.id));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openSupplierModal(supplier));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSupplier(supplier.id));
    table.appendChild(row);
  });
}

function openSupplierDetail(supplierId) {
  state.supplierDetailId = supplierId;
  renderSupplierDetail();
  const overlay = document.getElementById('supplierDetailOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeSupplierDetail() {
  const overlay = document.getElementById('supplierDetailOverlay');
  if (overlay) overlay.classList.add('hidden');
  state.supplierDetailId = null;
}

function renderSupplierDetail() {
  const overlay = document.getElementById('supplierDetailOverlay');
  if (!overlay) return;
  if (!state.supplierDetailId) return;
  const supplier = state.cache.suppliers?.[state.supplierDetailId];
  const title = document.getElementById('supplierDetailTitle');
  const container = document.getElementById('supplierDetailItems');
  if (title) title.textContent = getLocalizedName(supplier) || '-';
  if (!container) return;
  const items = getSupplierItems(state.supplierDetailId);
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  items.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'notice';
    const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${getLocalizedName(entry.item)}</strong>
          <div class="helper">${typeLabel}</div>
        </div>
        <button class="btn danger small" data-action="remove">${window.i18n.t('delete')}</button>
      </div>
    `;
    card.querySelector('[data-action="remove"]').addEventListener('click', () => unassignSupplierItem(entry));
    container.appendChild(card);
  });
}

function openSupplierPicker() {
  state.supplierPickSelection = new Set();
  renderSupplierPickerList();
  const overlay = document.getElementById('supplierPickerOverlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeSupplierPicker() {
  const overlay = document.getElementById('supplierPickerOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function renderSupplierPickerList() {
  const container = document.getElementById('supplierPickerList');
  const searchInput = document.getElementById('supplierPickerSearch');
  if (!container) return;
  const query = (searchInput?.value || '').trim().toLowerCase();
  if (!query) {
    container.innerHTML = `<p class="helper">${window.i18n.t('search_to_show')}</p>`;
    return;
  }
  let entries = getUnassignedSupplierItems().filter((entry) => {
    const name = `${entry.item.nameAr || ''} ${entry.item.nameEn || ''} ${entry.item.name || ''}`.toLowerCase();
    const code = String(entry.item.code || '').toLowerCase();
    const barcode = String(entry.item.barcode || '').toLowerCase();
    return name.includes(query) || code.includes(query) || barcode.includes(query);
  });
  container.innerHTML = '';
  if (!entries.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  entries.forEach((entry) => {
    const key = `${entry.type}:${entry.id}`;
    const card = document.createElement('div');
    const isSelected = state.supplierPickSelection.has(key);
    card.className = `notice supplier-pick ${isSelected ? 'selected' : ''}`;
    const typeLabel = entry.type === 'product' ? window.i18n.t('products') : window.i18n.t('stock_materials');
    card.innerHTML = `
      <span class="pick-check ${isSelected ? 'on' : ''}">✓</span>
      <div class="row" style="justify-content: space-between;">
        <span>${getLocalizedName(entry.item)}</span>
        <span class="tag">${typeLabel}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      if (state.supplierPickSelection.has(key)) {
        state.supplierPickSelection.delete(key);
      } else {
        state.supplierPickSelection.add(key);
      }
      renderSupplierPickerList();
    });
    container.appendChild(card);
  });
}

function applySupplierPickerSelection() {
  if (!state.supplierDetailId) return;
  const updates = {};
  state.supplierPickSelection.forEach((key) => {
    const [type, id] = key.split(':');
    const path = type === 'product' ? `products/${id}/supplierId` : `stockMaterials/${id}/supplierId`;
    updates[path] = state.supplierDetailId;
  });
  if (!Object.keys(updates).length) {
    closeSupplierPicker();
    return;
  }
  db.ref().update(updates).then(() => {
    closeSupplierPicker();
    renderSupplierDetail();
  });
}

function unassignSupplierItem(entry) {
  const path = entry.type === 'product' ? `products/${entry.id}/supplierId` : `stockMaterials/${entry.id}/supplierId`;
  db.ref(path).set(null).then(() => {
    renderSupplierDetail();
  });
}

function deleteSupplier(supplierId) {
  if (!supplierId) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const updates = {};
  const products = state.cache.products || {};
  const materials = state.cache.stockMaterials || {};
  Object.entries(products).forEach(([id, item]) => {
    if (item.supplierId === supplierId) updates[`products/${id}/supplierId`] = null;
  });
  Object.entries(materials).forEach(([id, item]) => {
    if (item.supplierId === supplierId) updates[`stockMaterials/${id}/supplierId`] = null;
  });
  db.ref().update(updates).then(() => {
    db.ref(`suppliers/${supplierId}`).remove();
  });
}

function setupPurchasesSection() {
  const section = document.getElementById('section-purchase');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('purchase')}</h3>
        <button id="openPurchaseModalBtn" class="btn primary">${window.i18n.t('purchase_request')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('purchase_number')}</th>
            <th>${window.i18n.t('supplier')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('status')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="purchasesTable"></tbody>
      </table>
    </div>
    <div id="purchaseModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3 id="purchaseModalTitle">${window.i18n.t('purchase_request')}</h3>
          <button id="purchaseModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="purchaseStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('supplier')}</label>
            <select id="purchaseSupplierSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="purchaseSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="purchaseSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="purchaseSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="purchaseItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="purchaseCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="purchaseSubmitBtn" class="btn primary">${window.i18n.t('purchase_request')}</button>
        </div>
        <p id="purchaseError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
    <div id="purchaseReceiveModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('receive_purchases')}</h3>
          <button id="purchaseReceiveCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="purchaseReceiveStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('supplier')}</label>
            <input id="purchaseReceiveSupplier" class="input" readonly />
          </div>
        </div>
        <div style="margin-top: 12px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="purchaseComparisonList"></div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="purchaseReceiveSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="purchaseReceiveSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="purchaseReceiveSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('received_items')}</h4>
          <div id="purchaseReceiveItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="purchaseReceiveCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="purchaseReceiveSubmitBtn" class="btn primary">${window.i18n.t('receive_action')}</button>
        </div>
        <p id="purchaseReceiveError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetPurchaseDraft();
  resetPurchaseReceiveDraft();
  bindPurchasesSection();
  renderPurchasesSection();
}

function resetPurchaseDraft() {
  state.purchaseDraft = {
    supplierId: '',
    items: [],
    editingId: null,
    originalItems: [],
    originalSupplierId: null,
    pendingMoveId: null
  };
}

function resetPurchaseReceiveDraft() {
  state.purchaseReceiveDraft = {
    purchaseId: null,
    supplierId: '',
    items: [],
    orderItems: [],
    receivedItems: []
  };
}

function bindPurchasesSection() {
  const openBtn = document.getElementById('openPurchaseModalBtn');
  const closeBtn = document.getElementById('purchaseModalCloseBtn');
  const cancelBtn = document.getElementById('purchaseCancelBtn');
  const supplierSelect = document.getElementById('purchaseSupplierSelect');
  const searchInput = document.getElementById('purchaseSearchInput');
  const searchBtn = document.getElementById('purchaseSearchBtn');
  const submitBtn = document.getElementById('purchaseSubmitBtn');

  const receiveCloseBtn = document.getElementById('purchaseReceiveCloseBtn');
  const receiveCancelBtn = document.getElementById('purchaseReceiveCancelBtn');
  const receiveSearchInput = document.getElementById('purchaseReceiveSearchInput');
  const receiveSearchBtn = document.getElementById('purchaseReceiveSearchBtn');
  const receiveSubmitBtn = document.getElementById('purchaseReceiveSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openPurchaseModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closePurchaseModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closePurchaseModal());
  if (supplierSelect) {
    supplierSelect.addEventListener('change', () => {
      state.purchaseDraft.supplierId = supplierSelect.value;
      renderPurchaseSearchResults();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => renderPurchaseSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePurchaseBarcodeScan();
      }
    });
  }
  if (searchBtn) searchBtn.addEventListener('click', () => renderPurchaseSearchResults());
  if (submitBtn) submitBtn.addEventListener('click', () => submitPurchaseOrder());

  if (receiveCloseBtn) receiveCloseBtn.addEventListener('click', () => closePurchaseReceiveModal());
  if (receiveCancelBtn) receiveCancelBtn.addEventListener('click', () => closePurchaseReceiveModal());
  if (receiveSearchInput) {
    receiveSearchInput.addEventListener('input', () => renderPurchaseReceiveSearchResults());
    receiveSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePurchaseReceiveBarcodeScan();
      }
    });
  }
  if (receiveSearchBtn) receiveSearchBtn.addEventListener('click', () => renderPurchaseReceiveSearchResults());
  if (receiveSubmitBtn) receiveSubmitBtn.addEventListener('click', () => submitPurchaseReceive());
}

function openPurchaseModal(record = null) {
  const overlay = document.getElementById('purchaseModal');
  if (!overlay) return;
  resetPurchaseDraft();
  if (record) {
    state.purchaseDraft.editingId = record.id;
    state.purchaseDraft.supplierId = record.supplierId || '';
    state.purchaseDraft.originalSupplierId = record.supplierId || '';
    state.purchaseDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
    state.purchaseDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
    state.purchaseDraft.pendingMoveId = record.pendingMoveId || null;
  }
  renderPurchasesSection();
  const errorEl = document.getElementById('purchaseError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('purchaseSearchInput');
  if (searchInput) searchInput.value = '';
  renderPurchaseSearchResults();
  overlay.classList.remove('hidden');
}

function closePurchaseModal() {
  const overlay = document.getElementById('purchaseModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderPurchasesSection() {
  if (!state.purchaseDraft) resetPurchaseDraft();
  const storekeeperInput = document.getElementById('purchaseStorekeeper');
  const supplierSelect = document.getElementById('purchaseSupplierSelect');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (supplierSelect) {
    supplierSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select_supplier');
    supplierSelect.appendChild(placeholder);
    Object.entries(state.cache.suppliers || {}).forEach(([id, supplier]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(supplier);
      supplierSelect.appendChild(option);
    });
    supplierSelect.value = state.purchaseDraft.supplierId || '';
  }
  renderPurchaseSearchResults();
  renderPurchaseItems();
  renderPurchasesTable();
}

function getPurchaseSearchEntries() {
  const supplierId = state.purchaseDraft.supplierId;
  if (!supplierId) return [];
  return getSupplierItems(supplierId);
}

function handlePurchaseBarcodeScan() {
  const searchInput = document.getElementById('purchaseSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getPurchaseSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openPurchaseQtyModal(match);
    searchInput.value = '';
    renderPurchaseSearchResults();
  }
}

function renderPurchaseSearchResults() {
  const searchInput = document.getElementById('purchaseSearchInput');
  const results = document.getElementById('purchaseSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getPurchaseSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openPurchaseQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openPurchaseQtyModal(entry));
}

function openPurchaseQtyModal(entry) {
  const mainBranchId = getMainBranchId();
  const available = getItemStock(entry.item, mainBranchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'add',
    onConfirm: (qty) => addPurchaseItem(entry, qty)
  });
}

function addPurchaseItem(entry, qty) {
  const existing = state.purchaseDraft.items.find((item) => item.itemId === entry.id && item.itemType === entry.type);
  if (existing) {
    existing.qty += qty;
  } else {
    state.purchaseDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderPurchaseItems();
}

function renderPurchaseItems() {
  const container = document.getElementById('purchaseItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.purchaseDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.purchaseDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editPurchaseItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.purchaseDraft.items.splice(index, 1);
      renderPurchaseItems();
    });
    container.appendChild(card);
  });
}

function editPurchaseItemQty(index) {
  const item = state.purchaseDraft.items[index];
  if (!item) return;
  openQtyModal({
    title: item.name,
    available: null,
    mode: 'add',
    onConfirm: (qty) => {
      state.purchaseDraft.items[index].qty = qty;
      renderPurchaseItems();
    }
  });
}

function submitPurchaseOrder() {
  const errorEl = document.getElementById('purchaseError');
  if (errorEl) errorEl.textContent = '';
  if (!state.purchaseDraft.supplierId || !state.purchaseDraft.items.length) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const supplier = state.cache.suppliers?.[state.purchaseDraft.supplierId];
  const supplierName = getLocalizedName(supplier) || '-';

  if (state.purchaseDraft.editingId) {
    const editingId = state.purchaseDraft.editingId;
    const payload = {
      supplierId: state.purchaseDraft.supplierId,
      supplierName,
      items: state.purchaseDraft.items,
      status: 'pending'
    };
    db.ref(`purchases/${editingId}`).update(payload).then(() => {
      if (state.purchaseDraft.pendingMoveId) {
        const moveUpdate = {
          name: `${window.i18n.t('purchase_request')} ${state.purchaseDraft.editingId}`,
          note: supplierName
        };
        db.ref(`pendingStockMoves/${state.purchaseDraft.pendingMoveId}`).update(moveUpdate);
      }
      resetPurchaseDraft();
      renderPurchasesSection();
      closePurchaseModal();
    });
    return;
  }

  generateCounter('meta/purchaseCounter').then((purchaseNumber) => {
    const purchaseRef = db.ref('purchases').push();
    const purchaseId = purchaseRef.key;
    const payload = {
      purchaseNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      supplierId: state.purchaseDraft.supplierId,
      supplierName,
      status: 'pending',
      items: state.purchaseDraft.items,
      receivedItems: []
    };
    purchaseRef.set(payload).then(() => {
      const moveRef = db.ref('pendingStockMoves').push();
      const movePayload = {
        name: `${window.i18n.t('purchase_request')} ${purchaseNumber}`,
        note: supplierName,
        createdAt: serverTime,
        status: 'pending',
        type: 'purchase',
        purchaseId
      };
      moveRef.set(movePayload).then(() => {
        db.ref(`purchases/${purchaseId}`).update({ pendingMoveId: moveRef.key });
        resetPurchaseDraft();
        renderPurchasesSection();
        closePurchaseModal();
      });
    });
  });
}

function renderPurchasesTable() {
  const table = document.getElementById('purchasesTable');
  if (!table) return;
  const records = state.cache.purchases || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const status = rec.status || 'pending';
    const statusLabel = status === 'approved'
      ? window.i18n.t('approved')
      : status === 'rejected'
        ? window.i18n.t('rejected')
        : status === 'received'
          ? window.i18n.t('received')
          : status === 'partial'
            ? window.i18n.t('partial_received')
            : window.i18n.t('pending');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.purchaseNumber || '-'}</td>
      <td>${rec.supplierName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${statusLabel}</td>
      <td>
        <div class="row" style="gap: 6px;">
          ${status === 'pending' ? `<button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>` : ''}
          ${(status === 'approved' || status === 'partial') ? `<button class="btn primary small" data-action="receive">${window.i18n.t('receive_purchases')}</button>` : ''}
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    const editBtn = row.querySelector('[data-action="edit"]');
    if (editBtn) editBtn.addEventListener('click', () => openPurchaseModal(rec));
    const receiveBtn = row.querySelector('[data-action="receive"]');
    if (receiveBtn) receiveBtn.addEventListener('click', () => openPurchaseReceiveModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deletePurchase(rec));
    table.appendChild(row);
  });
}

function deletePurchase(record) {
  if (!record?.id) return;
  if (record.status === 'received') {
    alert(window.i18n.t('cannot_delete_received'));
    return;
  }
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const updates = {};
  if (record.pendingMoveId) {
    updates[`pendingStockMoves/${record.pendingMoveId}`] = null;
  }
  updates[`purchases/${record.id}`] = null;
  db.ref().update(updates);
}

function openPurchaseReceiveModal(record) {
  const overlay = document.getElementById('purchaseReceiveModal');
  if (!overlay || !record) return;
  resetPurchaseReceiveDraft();
  state.purchaseReceiveDraft.purchaseId = record.id;
  state.purchaseReceiveDraft.supplierId = record.supplierId;
  state.purchaseReceiveDraft.orderItems = normalizeItems(record.items).map((item) => ({ ...item }));
  state.purchaseReceiveDraft.receivedItems = normalizeItems(record.receivedItems).map((item) => ({ ...item }));
  renderPurchaseReceiveSection();
  const errorEl = document.getElementById('purchaseReceiveError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('purchaseReceiveSearchInput');
  if (searchInput) searchInput.value = '';
  renderPurchaseReceiveSearchResults();
  overlay.classList.remove('hidden');
}

function closePurchaseReceiveModal() {
  const overlay = document.getElementById('purchaseReceiveModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderPurchaseReceiveSection() {
  const storekeeperInput = document.getElementById('purchaseReceiveStorekeeper');
  const supplierInput = document.getElementById('purchaseReceiveSupplier');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  const supplier = state.cache.suppliers?.[state.purchaseReceiveDraft.supplierId];
  if (supplierInput) supplierInput.value = getLocalizedName(supplier) || '-';
  renderPurchaseComparison();
  renderPurchaseReceiveItems();
}

function renderPurchaseComparison() {
  const container = document.getElementById('purchaseComparisonList');
  if (!container) return;
  const orderItems = state.purchaseReceiveDraft.orderItems || [];
  const receivedMap = buildItemMap(state.purchaseReceiveDraft.receivedItems || []);
  if (!orderItems.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  const rows = orderItems.map((item) => {
    const key = getItemKey(item);
    const receivedQty = receivedMap[key]?.qty || 0;
    const remaining = Number(item.qty || 0) - Number(receivedQty || 0);
    return `
      <tr>
        <td>${formatItemNameWithUnit(item.name || '-', item.unitId)}</td>
        <td>${formatNumber(item.qty)}</td>
        <td>${formatNumber(receivedQty)}</td>
        <td>${formatNumber(Math.max(remaining, 0))}</td>
      </tr>
    `;
  }).join('');
  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${window.i18n.t('name')}</th>
          <th>${window.i18n.t('requested_qty')}</th>
          <th>${window.i18n.t('received_qty')}</th>
          <th>${window.i18n.t('remaining_qty')}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function getPurchaseReceiveEntries() {
  return (state.purchaseReceiveDraft.orderItems || []).map((item) => {
    const data = getItemDataByType(item.itemType, item.itemId);
    return { id: item.itemId, type: item.itemType, item: data || { name: item.name || '' } };
  });
}

function handlePurchaseReceiveBarcodeScan() {
  const searchInput = document.getElementById('purchaseReceiveSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getPurchaseReceiveEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openPurchaseReceiveQtyModal(match);
    searchInput.value = '';
    renderPurchaseReceiveSearchResults();
  }
}

function renderPurchaseReceiveSearchResults() {
  const searchInput = document.getElementById('purchaseReceiveSearchInput');
  const results = document.getElementById('purchaseReceiveSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getPurchaseReceiveEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openPurchaseReceiveQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openPurchaseReceiveQtyModal(entry));
}

function openPurchaseReceiveQtyModal(entry) {
  const mainBranchId = getMainBranchId();
  const available = getItemStock(entry.item, mainBranchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'add',
    onConfirm: (qty) => addPurchaseReceiveItem(entry, qty)
  });
}

function addPurchaseReceiveItem(entry, qty) {
  const existing = state.purchaseReceiveDraft.items.find((item) => item.itemId === entry.id && item.itemType === entry.type);
  if (existing) {
    existing.qty += qty;
    if (existing.cost === undefined || existing.cost === null) {
      existing.cost = Number(entry.item?.cost || 0);
    }
  } else {
    state.purchaseReceiveDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null,
      cost: Number(entry.item?.cost || 0)
    });
  }
  renderPurchaseReceiveItems();
}

function renderPurchaseReceiveItems() {
  const container = document.getElementById('purchaseReceiveItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.purchaseReceiveDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.purchaseReceiveDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editPurchaseReceiveItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.purchaseReceiveDraft.items.splice(index, 1);
      renderPurchaseReceiveItems();
    });
    container.appendChild(card);
  });
}

function editPurchaseReceiveItemQty(index) {
  const item = state.purchaseReceiveDraft.items[index];
  if (!item) return;
  openQtyModal({
    title: item.name,
    available: null,
    mode: 'add',
    onConfirm: (qty) => {
      state.purchaseReceiveDraft.items[index].qty = qty;
      renderPurchaseReceiveItems();
    }
  });
}

function submitPurchaseReceive() {
  const errorEl = document.getElementById('purchaseReceiveError');
  if (errorEl) errorEl.textContent = '';
  if (!state.purchaseReceiveDraft.items.length || !state.purchaseReceiveDraft.purchaseId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const purchaseId = state.purchaseReceiveDraft.purchaseId;
  const purchase = state.cache.purchases?.[purchaseId];
  if (!purchase) return;
  const mainBranchId = getMainBranchId();
  const updates = [];
  state.purchaseReceiveDraft.items.forEach((item) => {
    updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, Number(item.qty || 0)));
  });
  Promise.all(updates).then(() => {
    const receivedMap = buildItemMap(purchase.receivedItems || []);
    state.purchaseReceiveDraft.items.forEach((item) => {
      const key = getItemKey(item);
      const prev = receivedMap[key]?.qty || 0;
      receivedMap[key] = {
        itemType: item.itemType,
        itemId: item.itemId,
        qty: Number(prev) + Number(item.qty || 0),
        unitId: item.unitId,
        name: item.name
      };
    });
    const receivedItems = Object.values(receivedMap);
    const orderMap = buildItemMap(purchase.items || []);
    let fullyReceived = true;
    Object.keys(orderMap).forEach((key) => {
      const ordered = Number(orderMap[key]?.qty || 0);
      const got = Number(receivedMap[key]?.qty || 0);
      if (got < ordered) fullyReceived = false;
    });
    const newStatus = fullyReceived ? 'received' : 'partial';
    const receiptRef = db.ref('purchaseReceipts').push();
    const receiptPayload = {
      purchaseId,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      items: state.purchaseReceiveDraft.items
    };
    receiptRef.set(receiptPayload).then(() => {
      db.ref(`purchases/${purchaseId}`).update({ receivedItems, status: newStatus }).then(() => {
        printPurchaseReceiptReport({ ...receiptPayload, receiptNumber: receiptRef.key, purchaseNumber: purchase.purchaseNumber });
        resetPurchaseReceiveDraft();
        renderPurchasesSection();
        closePurchaseReceiveModal();
      });
    });
  });
}

function setupSupplierReturnSection() {
  const section = document.getElementById('section-supplierReturn');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('supplier_return')}</h3>
        <button id="openSupplierReturnModalBtn" class="btn primary">${window.i18n.t('new_supplier_return')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('supplier_return_number')}</th>
            <th>${window.i18n.t('supplier')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="supplierReturnTable"></tbody>
      </table>
    </div>
    <div id="supplierReturnModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('supplier_return_voucher')}</h3>
          <button id="supplierReturnCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="supplierReturnStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('supplier')}</label>
            <select id="supplierReturnSupplierSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="supplierReturnSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="supplierReturnSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="supplierReturnSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="supplierReturnItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="supplierReturnCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="supplierReturnSubmitBtn" class="btn primary">${window.i18n.t('add')}</button>
        </div>
        <p id="supplierReturnError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetSupplierReturnDraft();
  bindSupplierReturnSection();
  renderSupplierReturnSection();
}

function resetSupplierReturnDraft() {
  state.supplierReturnDraft = {
    supplierId: '',
    items: [],
    editingId: null,
    originalItems: []
  };
}

function bindSupplierReturnSection() {
  const openBtn = document.getElementById('openSupplierReturnModalBtn');
  const closeBtn = document.getElementById('supplierReturnCloseBtn');
  const cancelBtn = document.getElementById('supplierReturnCancelBtn');
  const supplierSelect = document.getElementById('supplierReturnSupplierSelect');
  const searchInput = document.getElementById('supplierReturnSearchInput');
  const searchBtn = document.getElementById('supplierReturnSearchBtn');
  const submitBtn = document.getElementById('supplierReturnSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openSupplierReturnModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeSupplierReturnModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeSupplierReturnModal());
  if (supplierSelect) {
    supplierSelect.addEventListener('change', () => {
      state.supplierReturnDraft.supplierId = supplierSelect.value;
      renderSupplierReturnSearchResults();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => renderSupplierReturnSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSupplierReturnBarcodeScan();
      }
    });
  }
  if (searchBtn) searchBtn.addEventListener('click', () => renderSupplierReturnSearchResults());
  if (submitBtn) submitBtn.addEventListener('click', () => submitSupplierReturn());
}

function openSupplierReturnModal(record = null) {
  const overlay = document.getElementById('supplierReturnModal');
  if (!overlay) return;
  resetSupplierReturnDraft();
  if (record) {
    state.supplierReturnDraft.editingId = record.id;
    state.supplierReturnDraft.supplierId = record.supplierId;
    state.supplierReturnDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
    state.supplierReturnDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
  }
  renderSupplierReturnSection();
  const errorEl = document.getElementById('supplierReturnError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('supplierReturnSearchInput');
  if (searchInput) searchInput.value = '';
  renderSupplierReturnSearchResults();
  overlay.classList.remove('hidden');
}

function closeSupplierReturnModal() {
  const overlay = document.getElementById('supplierReturnModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderSupplierReturnSection() {
  if (!state.supplierReturnDraft) resetSupplierReturnDraft();
  const storekeeperInput = document.getElementById('supplierReturnStorekeeper');
  const supplierSelect = document.getElementById('supplierReturnSupplierSelect');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (supplierSelect) {
    supplierSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select_supplier');
    supplierSelect.appendChild(placeholder);
    Object.entries(state.cache.suppliers || {}).forEach(([id, supplier]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(supplier);
      supplierSelect.appendChild(option);
    });
    supplierSelect.value = state.supplierReturnDraft.supplierId || '';
  }
  renderSupplierReturnSearchResults();
  renderSupplierReturnItems();
  renderSupplierReturnTable();
}

function getSupplierReturnEntries() {
  const supplierId = state.supplierReturnDraft.supplierId;
  if (!supplierId) return [];
  return getSupplierItems(supplierId);
}

function handleSupplierReturnBarcodeScan() {
  const searchInput = document.getElementById('supplierReturnSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getSupplierReturnEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openSupplierReturnQtyModal(match);
    searchInput.value = '';
    renderSupplierReturnSearchResults();
  }
}

function renderSupplierReturnSearchResults() {
  const searchInput = document.getElementById('supplierReturnSearchInput');
  const results = document.getElementById('supplierReturnSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getSupplierReturnEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openSupplierReturnQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openSupplierReturnQtyModal(entry));
}

function openSupplierReturnQtyModal(entry) {
  const mainBranchId = getMainBranchId();
  const available = getItemStock(entry.item, mainBranchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'deduct',
    onConfirm: (qty) => addSupplierReturnItem(entry, qty)
  });
}

function addSupplierReturnItem(entry, qty) {
  const existing = state.supplierReturnDraft.items.find((item) => item.itemId === entry.id && item.itemType === entry.type);
  if (existing) {
    existing.qty += qty;
  } else {
    state.supplierReturnDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderSupplierReturnItems();
}

function renderSupplierReturnItems() {
  const container = document.getElementById('supplierReturnItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.supplierReturnDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.supplierReturnDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editSupplierReturnItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.supplierReturnDraft.items.splice(index, 1);
      renderSupplierReturnItems();
    });
    container.appendChild(card);
  });
}

function editSupplierReturnItemQty(index) {
  const item = state.supplierReturnDraft.items[index];
  if (!item) return;
  openQtyModal({
    title: item.name,
    available: null,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.supplierReturnDraft.items[index].qty = qty;
      renderSupplierReturnItems();
    }
  });
}

function submitSupplierReturn() {
  const errorEl = document.getElementById('supplierReturnError');
  if (errorEl) errorEl.textContent = '';
  if (!state.supplierReturnDraft.items.length || !state.supplierReturnDraft.supplierId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const mainBranchId = getMainBranchId();
  if (!mainBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  if (state.supplierReturnDraft.editingId) {
    const editingId = state.supplierReturnDraft.editingId;
    const diffs = diffItems(state.supplierReturnDraft.originalItems, state.supplierReturnDraft.items);
    const updates = diffs.map((diff) => updateItemStock(diff.itemType, diff.itemId, mainBranchId, -Number(diff.qtyDiff || 0)));
    db.ref(`supplierReturns/${editingId}`).update({
      supplierId: state.supplierReturnDraft.supplierId,
      items: state.supplierReturnDraft.items
    }).then(() => {
      Promise.all(updates).then(() => {
        resetSupplierReturnDraft();
        renderSupplierReturnSection();
        closeSupplierReturnModal();
      });
    });
    return;
  }

  generateCounter('meta/supplierReturnCounter').then((returnNumber) => {
    const payload = {
      returnNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      supplierId: state.supplierReturnDraft.supplierId,
      supplierName: getLocalizedName(state.cache.suppliers?.[state.supplierReturnDraft.supplierId]) || '-',
      items: state.supplierReturnDraft.items
    };
    const ref = db.ref('supplierReturns').push();
    ref.set(payload).then(() => {
      const updates = state.supplierReturnDraft.items.map((item) => updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
      Promise.all(updates).then(() => {
        printSupplierReturnReport(payload);
        resetSupplierReturnDraft();
        renderSupplierReturnSection();
        closeSupplierReturnModal();
      });
    });
  });
}

function renderSupplierReturnTable() {
  const table = document.getElementById('supplierReturnTable');
  if (!table) return;
  const records = state.cache.supplierReturns || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.returnNumber || '-'}</td>
      <td>${rec.supplierName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printSupplierReturnReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openSupplierReturnModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSupplierReturn(rec));
    table.appendChild(row);
  });
}

function deleteSupplierReturn(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const mainBranchId = getMainBranchId();
  const items = normalizeItems(record.items);
  const updates = items.map((item) => updateItemStock(item.itemType, item.itemId, mainBranchId, Number(item.qty || 0)));
  Promise.all(updates).then(() => {
    db.ref(`supplierReturns/${record.id}`).remove();
  });
}

function setupTransfersSection() {
  const section = document.getElementById('section-transfers');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('transfers')}</h3>
        <button id="openTransferModalBtn" class="btn primary">${window.i18n.t('new_transfer')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('transfer_number')}</th>
            <th>${window.i18n.t('from_branch')}</th>
            <th>${window.i18n.t('to_branch')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="transfersTable"></tbody>
      </table>
    </div>
    <div id="transferVoucherModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('transfer_voucher')}</h3>
          <button id="transferModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="transferStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('to_branch')}</label>
            <select id="transferBranchSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="transferSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="transferSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="transferSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="transferItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="transferCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="transferSubmitBtn" class="btn primary">${window.i18n.t('transfer_action')}</button>
        </div>
        <p id="transferError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetTransferDraft();
  bindTransfersSection();
  renderTransfersSection();
}

function resetTransferDraft() {
  state.transferDraft = {
    toBranchId: '',
    items: [],
    editingId: null,
    originalItems: [],
    originalToBranchId: null
  };
}

function bindTransfersSection() {
  const openBtn = document.getElementById('openTransferModalBtn');
  const closeBtn = document.getElementById('transferModalCloseBtn');
  const cancelBtn = document.getElementById('transferCancelBtn');
  const branchSelect = document.getElementById('transferBranchSelect');
  const searchInput = document.getElementById('transferSearchInput');
  const searchBtn = document.getElementById('transferSearchBtn');
  const submitBtn = document.getElementById('transferSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openTransferModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeTransferModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeTransferModal());

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      state.transferDraft.toBranchId = branchSelect.value;
      const errorEl = document.getElementById('transferError');
      if (errorEl) errorEl.textContent = '';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderTransferSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTransferBarcodeScan();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => renderTransferSearchResults());
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => submitTransferVoucher());
  }
}

function openTransferModal() {
  const overlay = document.getElementById('transferVoucherModal');
  if (!overlay) return;
  resetTransferDraft();
  renderTransfersSection();
  const errorEl = document.getElementById('transferError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('transferSearchInput');
  if (searchInput) searchInput.value = '';
  renderTransferSearchResults();
  overlay.classList.remove('hidden');
}

function openTransferEditModal(record) {
  const overlay = document.getElementById('transferVoucherModal');
  if (!overlay || !record) return;
  resetTransferDraft();
  state.transferDraft.editingId = record.id || null;
  state.transferDraft.toBranchId = record.toBranchId || '';
  state.transferDraft.originalToBranchId = record.toBranchId || '';
  state.transferDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
  state.transferDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
  renderTransfersSection();
  const errorEl = document.getElementById('transferError');
  if (errorEl) errorEl.textContent = '';
  overlay.classList.remove('hidden');
}

function closeTransferModal() {
  const overlay = document.getElementById('transferVoucherModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderTransfersSection() {
  if (!state.transferDraft) resetTransferDraft();
  const storekeeperInput = document.getElementById('transferStorekeeper');
  const branchSelect = document.getElementById('transferBranchSelect');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (branchSelect) {
    renderBranchOptions(branchSelect, { excludeMain: true });
    branchSelect.value = state.transferDraft.toBranchId || '';
  }
  renderTransferSearchResults();
  renderTransferItems();
  renderTransfersTable();
}

function getTransferSearchEntries() {
  return getProductEntries();
}

function handleTransferBarcodeScan() {
  const searchInput = document.getElementById('transferSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getTransferSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openTransferQtyModal(match);
    searchInput.value = '';
    renderTransferSearchResults();
  }
}

function renderTransferSearchResults() {
  const searchInput = document.getElementById('transferSearchInput');
  const results = document.getElementById('transferSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getTransferSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openTransferQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openTransferQtyModal(entry));
}

function openTransferQtyModal(entry) {
  const mainBranchId = getMainBranchId();
  const available = getItemStock(entry.item, mainBranchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'deduct',
    onConfirm: (qty) => addTransferItem(entry, qty)
  });
}

function addTransferItem(entry, qty) {
  const existing = state.transferDraft.items.find((item) => item.itemId === entry.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.transferDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderTransferItems();
}

function renderTransferItems() {
  const container = document.getElementById('transferItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.transferDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.transferDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editTransferItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.transferDraft.items.splice(index, 1);
      renderTransferItems();
    });
    container.appendChild(card);
  });
}

function editTransferItemQty(index) {
  const item = state.transferDraft.items[index];
  if (!item) return;
  const branchId = getMainBranchId();
  const itemData = getItemDataByType(item.itemType, item.itemId);
  const availableBase = itemData ? getItemStock(itemData, branchId) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(itemData),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.transferDraft.items[index].qty = qty;
      renderTransferItems();
    }
  });
}

function submitTransferVoucher() {
  const errorEl = document.getElementById('transferError');
  if (errorEl) errorEl.textContent = '';
  if (!state.transferDraft.items.length || !state.transferDraft.toBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const mainBranchId = getMainBranchId();
  if (!mainBranchId || state.transferDraft.toBranchId === mainBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  if (state.transferDraft.editingId) {
    const editingId = state.transferDraft.editingId;
    const newToBranchId = state.transferDraft.toBranchId;
    const oldToBranchId = state.transferDraft.originalToBranchId || newToBranchId;
    const payload = {
      toBranchId: newToBranchId,
      items: state.transferDraft.items
    };
    db.ref(`transfers/${editingId}`).update(payload).then(() => {
      const updates = [];
      if (oldToBranchId !== newToBranchId) {
        state.transferDraft.originalItems.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, Number(item.qty || 0)));
          updates.push(updateItemStock(item.itemType, item.itemId, oldToBranchId, -Number(item.qty || 0)));
        });
        state.transferDraft.items.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
          updates.push(updateItemStock(item.itemType, item.itemId, newToBranchId, Number(item.qty || 0)));
        });
      } else {
        const diffs = diffItems(state.transferDraft.originalItems, state.transferDraft.items);
        diffs.forEach((diff) => {
          updates.push(updateItemStock(diff.itemType, diff.itemId, mainBranchId, -Number(diff.qtyDiff || 0)));
          updates.push(updateItemStock(diff.itemType, diff.itemId, newToBranchId, Number(diff.qtyDiff || 0)));
        });
      }
      Promise.all(updates).then(() => {
        resetTransferDraft();
        renderTransfersSection();
        closeTransferModal();
      });
    });
    return;
  }

  generateCounter('meta/transferCounter').then((transferNumber) => {
    const payload = {
      transferNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      fromBranchId: mainBranchId,
      toBranchId: state.transferDraft.toBranchId,
      items: state.transferDraft.items
    };
    db.ref('transfers').push(payload).then(() => {
      const updates = [];
      state.transferDraft.items.forEach((item) => {
        updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
        updates.push(updateItemStock(item.itemType, item.itemId, state.transferDraft.toBranchId, Number(item.qty || 0)));
      });
      Promise.all(updates).then(() => {
        resetTransferDraft();
        renderTransfersSection();
        closeTransferModal();
      });
    });
  });
}

function renderTransfersTable() {
  const table = document.getElementById('transfersTable');
  if (!table) return;
  const records = state.cache.transfers || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.transferNumber || '-'}</td>
      <td>${getBranchLabel(rec.fromBranchId)}</td>
      <td>${getBranchLabel(rec.toBranchId)}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printTransferReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openTransferEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTransfer(rec));
    table.appendChild(row);
  });
}

function deleteTransfer(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const fromBranchId = record.fromBranchId || getMainBranchId();
  const toBranchId = record.toBranchId;
  const items = normalizeItems(record.items);
  const updates = [];
  items.forEach((item) => {
    updates.push(updateItemStock(item.itemType, item.itemId, fromBranchId, Number(item.qty || 0)));
    updates.push(updateItemStock(item.itemType, item.itemId, toBranchId, -Number(item.qty || 0)));
  });
  Promise.all(updates).then(() => {
    db.ref(`transfers/${record.id}`).remove();
  });
}

function setupCashierTransferRequestsSection() {
  const section = document.getElementById('section-cashierTransferRequests');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('cashier_transfer_requests')}</h3>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('transfer_request_number')}</th>
            <th>${window.i18n.t('branch')}</th>
            <th>${window.i18n.t('cashier_name')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('status')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="cashierTransferRequestsTable"></tbody>
      </table>
    </div>
    <div id="cashierTransferModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('transfer_request')}</h3>
          <button id="cashierTransferCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="cashierTransferStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('branch')}</label>
            <input id="cashierTransferBranch" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('cashier_name')}</label>
            <input id="cashierTransferCashier" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('transfer_request_number')}</label>
            <input id="cashierTransferRequestNumber" class="input" readonly />
          </div>
        </div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="cashierTransferItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="cashierTransferCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="cashierTransferSubmitBtn" class="btn primary">${window.i18n.t('transfer_action')}</button>
        </div>
        <p id="cashierTransferError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetCashierTransferDraft();
  bindCashierTransferRequestsSection();
  renderCashierTransferRequestsSection();
}

function resetCashierTransferDraft() {
  state.cashierTransferDraft = {
    requestId: null,
    requestNumber: '',
    branchId: '',
    cashierId: '',
    cashierName: '',
    items: []
  };
}

function bindCashierTransferRequestsSection() {
  const closeBtn = document.getElementById('cashierTransferCloseBtn');
  const cancelBtn = document.getElementById('cashierTransferCancelBtn');
  const submitBtn = document.getElementById('cashierTransferSubmitBtn');

  if (closeBtn) closeBtn.addEventListener('click', () => closeCashierTransferModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeCashierTransferModal());
  if (submitBtn) submitBtn.addEventListener('click', () => submitCashierTransfer());
}

function openCashierTransferModal(request) {
  if (!request) return;
  resetCashierTransferDraft();
  const mainBranchId = getMainBranchId();
  state.cashierTransferDraft.requestId = request.id;
  state.cashierTransferDraft.requestNumber = request.requestNumber || '';
  state.cashierTransferDraft.branchId = request.branchId || '';
  state.cashierTransferDraft.cashierId = request.cashierId || '';
  state.cashierTransferDraft.cashierName = request.cashierName || '';
  state.cashierTransferDraft.items = normalizeItems(request.items).map((item) => {
    const itemData = getItemDataByType(item.itemType, item.itemId);
    const available = itemData ? getItemStock(itemData, mainBranchId) : 0;
    const requestedQty = Number(item.qty || 0);
    const qty = Math.min(requestedQty, Number(available || 0));
    return {
      itemId: item.itemId,
      itemType: item.itemType || 'product',
      name: item.name || getLocalizedName(itemData),
      unitId: item.unitId || itemData?.unitId || null,
      requestedQty,
      qty
    };
  });
  renderCashierTransferRequestsSection();
  const overlay = document.getElementById('cashierTransferModal');
  if (overlay) overlay.classList.remove('hidden');
}

function closeCashierTransferModal() {
  const overlay = document.getElementById('cashierTransferModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderCashierTransferRequestsSection() {
  renderCashierTransferRequestsTable();
  renderCashierTransferItems();
  const storekeeperInput = document.getElementById('cashierTransferStorekeeper');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  const branchInput = document.getElementById('cashierTransferBranch');
  if (branchInput) branchInput.value = getBranchLabel(state.cashierTransferDraft?.branchId) || '-';
  const cashierInput = document.getElementById('cashierTransferCashier');
  if (cashierInput) cashierInput.value = state.cashierTransferDraft?.cashierName || '-';
  const numberInput = document.getElementById('cashierTransferRequestNumber');
  if (numberInput) numberInput.value = state.cashierTransferDraft?.requestNumber || '-';
}

function renderCashierTransferRequestsTable() {
  const table = document.getElementById('cashierTransferRequestsTable');
  if (!table) return;
  const records = state.cache.transferRequests || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (!entries.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    const statusLabel = getCashierTransferRequestStatusLabel(rec);
    row.innerHTML = `
      <td>${rec.requestNumber || '-'}</td>
      <td>${getBranchLabel(rec.branchId)}</td>
      <td>${rec.cashierName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>${statusLabel}</td>
      <td>
        ${rec.status === 'pending' ? `<button class="btn primary small" data-action="transfer">${window.i18n.t('transfer_action')}</button>` : '-'}
      </td>
    `;
    const transferBtn = row.querySelector('[data-action="transfer"]');
    if (transferBtn) transferBtn.addEventListener('click', () => openCashierTransferModal(rec));
    table.appendChild(row);
  });
}

function getCashierTransferRequestStatusLabel(rec) {
  const status = rec?.status || 'pending';
  if (status === 'transferred') return window.i18n.t('transferred');
  if (status === 'received') return window.i18n.t('received');
  if (status === 'partial_received') return window.i18n.t('partial_received');
  if (status === 'rejected') return window.i18n.t('rejected');
  return window.i18n.t('pending');
}

function renderCashierTransferItems() {
  const container = document.getElementById('cashierTransferItemsList');
  if (!container || !state.cashierTransferDraft) return;
  container.innerHTML = '';
  if (!state.cashierTransferDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  const mainBranchId = getMainBranchId();
  state.cashierTransferDraft.items.forEach((item, index) => {
    const itemData = getItemDataByType(item.itemType, item.itemId);
    const available = itemData ? getItemStock(itemData, mainBranchId) : 0;
    const card = document.createElement('div');
    card.className = 'notice';
    card.innerHTML = `
      <div class="row" style="justify-content: space-between;">
        <div>
          <strong>${formatItemNameWithUnit(item.name || '-', item.unitId)}</strong>
          <div class="helper">${window.i18n.t('requested_qty')}: ${formatNumber(item.requestedQty)}</div>
          <div class="helper">${window.i18n.t('available_stock')}: ${formatNumber(available)}</div>
          <div class="helper">${window.i18n.t('transferred_qty')}: ${formatNumber(item.qty)}</div>
        </div>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="edit" data-index="${index}">${window.i18n.t('edit')}</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editCashierTransferItemQty(index));
    container.appendChild(card);
  });
}

function editCashierTransferItemQty(index) {
  const item = state.cashierTransferDraft?.items?.[index];
  if (!item) return;
  const mainBranchId = getMainBranchId();
  const itemData = getItemDataByType(item.itemType, item.itemId);
  const availableBase = itemData ? getItemStock(itemData, mainBranchId) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(itemData),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.cashierTransferDraft.items[index].qty = qty;
      renderCashierTransferItems();
    }
  });
}

function submitCashierTransfer() {
  if (!state.cashierTransferDraft) return;
  const errorEl = document.getElementById('cashierTransferError');
  if (errorEl) errorEl.textContent = '';
  const mainBranchId = getMainBranchId();
  if (!mainBranchId || !state.cashierTransferDraft.branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const items = state.cashierTransferDraft.items.filter((item) => Number(item.qty || 0) > 0);
  if (!items.length) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  generateCounter('meta/cashierTransferCounter').then((transferNumber) => {
    const payload = {
      transferNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      fromBranchId: mainBranchId,
      toBranchId: state.cashierTransferDraft.branchId,
      cashierId: state.cashierTransferDraft.cashierId || null,
      cashierName: state.cashierTransferDraft.cashierName || null,
      requestId: state.cashierTransferDraft.requestId || null,
      requestNumber: state.cashierTransferDraft.requestNumber || null,
      status: 'in_transit',
      items: items.map((item) => ({
        itemId: item.itemId,
        itemType: item.itemType,
        name: item.name,
        unitId: item.unitId || null,
        requestedQty: item.requestedQty,
        qty: item.qty
      }))
    };
    db.ref('cashierTransfers').push(payload).then((ref) => {
      const updates = items.map((item) => updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
      Promise.all(updates).then(() => {
        if (state.cashierTransferDraft.requestId) {
          db.ref(`transferRequests/${state.cashierTransferDraft.requestId}`).update({
            status: 'transferred',
            transferId: ref.key,
            transferNumber,
            processedAt: serverTime,
            processedBy: state.user?.name || null
          });
        }
        closeCashierTransferModal();
        resetCashierTransferDraft();
        renderCashierTransferRequestsSection();
      });
    });
  });
}

function setupStockReturnSection() {
  const section = document.getElementById('section-stockReturn');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('stock_return')}</h3>
        <button id="openStockReturnModalBtn" class="btn primary">${window.i18n.t('new_stock_return')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('stock_return_number')}</th>
            <th>${window.i18n.t('from_branch')}</th>
            <th>${window.i18n.t('to_branch')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="stockReturnTable"></tbody>
      </table>
    </div>
    <div id="stockReturnModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('stock_return_voucher')}</h3>
          <button id="stockReturnModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="stockReturnStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('from_branch')}</label>
            <select id="stockReturnBranchSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="stockReturnSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="stockReturnSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="stockReturnSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="stockReturnItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="stockReturnCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="stockReturnSubmitBtn" class="btn primary">${window.i18n.t('add')}</button>
        </div>
        <p id="stockReturnError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetStockReturnDraft();
  bindStockReturnSection();
  renderStockReturnSection();
}

function resetStockReturnDraft() {
  state.stockReturnDraft = {
    branchId: '',
    items: [],
    editingId: null,
    originalItems: [],
    originalBranchId: null
  };
}

function bindStockReturnSection() {
  const openBtn = document.getElementById('openStockReturnModalBtn');
  const closeBtn = document.getElementById('stockReturnModalCloseBtn');
  const cancelBtn = document.getElementById('stockReturnCancelBtn');
  const branchSelect = document.getElementById('stockReturnBranchSelect');
  const searchInput = document.getElementById('stockReturnSearchInput');
  const searchBtn = document.getElementById('stockReturnSearchBtn');
  const submitBtn = document.getElementById('stockReturnSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openStockReturnModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeStockReturnModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeStockReturnModal());

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      state.stockReturnDraft.branchId = branchSelect.value;
      const errorEl = document.getElementById('stockReturnError');
      if (errorEl) errorEl.textContent = '';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderStockReturnSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStockReturnBarcodeScan();
      }
    });
  }

  if (searchBtn) searchBtn.addEventListener('click', () => renderStockReturnSearchResults());
  if (submitBtn) submitBtn.addEventListener('click', () => submitStockReturnVoucher());
}

function openStockReturnModal() {
  const overlay = document.getElementById('stockReturnModal');
  if (!overlay) return;
  resetStockReturnDraft();
  renderStockReturnSection();
  const errorEl = document.getElementById('stockReturnError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('stockReturnSearchInput');
  if (searchInput) searchInput.value = '';
  renderStockReturnSearchResults();
  overlay.classList.remove('hidden');
}

function openStockReturnEditModal(record) {
  const overlay = document.getElementById('stockReturnModal');
  if (!overlay || !record) return;
  resetStockReturnDraft();
  state.stockReturnDraft.editingId = record.id || null;
  state.stockReturnDraft.branchId = record.fromBranchId || '';
  state.stockReturnDraft.originalBranchId = record.fromBranchId || '';
  state.stockReturnDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
  state.stockReturnDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
  renderStockReturnSection();
  const errorEl = document.getElementById('stockReturnError');
  if (errorEl) errorEl.textContent = '';
  overlay.classList.remove('hidden');
}

function closeStockReturnModal() {
  const overlay = document.getElementById('stockReturnModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderStockReturnSection() {
  if (!state.stockReturnDraft) resetStockReturnDraft();
  const storekeeperInput = document.getElementById('stockReturnStorekeeper');
  const branchSelect = document.getElementById('stockReturnBranchSelect');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (branchSelect) {
    renderBranchOptions(branchSelect, { excludeMain: true });
    branchSelect.value = state.stockReturnDraft.branchId || '';
  }
  renderStockReturnSearchResults();
  renderStockReturnItems();
  renderStockReturnTable();
}

function getStockReturnSearchEntries() {
  return getProductEntries();
}

function handleStockReturnBarcodeScan() {
  const searchInput = document.getElementById('stockReturnSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getStockReturnSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openStockReturnQtyModal(match);
    searchInput.value = '';
    renderStockReturnSearchResults();
  }
}

function renderStockReturnSearchResults() {
  const searchInput = document.getElementById('stockReturnSearchInput');
  const results = document.getElementById('stockReturnSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getStockReturnSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openStockReturnQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openStockReturnQtyModal(entry));
}

function openStockReturnQtyModal(entry) {
  const errorEl = document.getElementById('stockReturnError');
  if (errorEl) errorEl.textContent = '';
  const branchId = state.stockReturnDraft.branchId;
  if (!branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const available = getItemStock(entry.item, branchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'deduct',
    onConfirm: (qty) => addStockReturnItem(entry, qty)
  });
}

function addStockReturnItem(entry, qty) {
  const existing = state.stockReturnDraft.items.find((item) => item.itemId === entry.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.stockReturnDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderStockReturnItems();
}

function renderStockReturnItems() {
  const container = document.getElementById('stockReturnItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.stockReturnDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.stockReturnDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editStockReturnItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.stockReturnDraft.items.splice(index, 1);
      renderStockReturnItems();
    });
    container.appendChild(card);
  });
}

function editStockReturnItemQty(index) {
  const item = state.stockReturnDraft.items[index];
  if (!item) return;
  const branchId = state.stockReturnDraft.branchId;
  if (!branchId) return;
  const itemData = getItemDataByType(item.itemType, item.itemId);
  const availableBase = itemData ? getItemStock(itemData, branchId) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(itemData),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.stockReturnDraft.items[index].qty = qty;
      renderStockReturnItems();
    }
  });
}

function submitStockReturnVoucher() {
  const errorEl = document.getElementById('stockReturnError');
  if (errorEl) errorEl.textContent = '';
  if (!state.stockReturnDraft.items.length || !state.stockReturnDraft.branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const mainBranchId = getMainBranchId();
  if (!mainBranchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  if (state.stockReturnDraft.editingId) {
    const editingId = state.stockReturnDraft.editingId;
    const newBranchId = state.stockReturnDraft.branchId;
    const oldBranchId = state.stockReturnDraft.originalBranchId || newBranchId;
    const payload = {
      fromBranchId: newBranchId,
      toBranchId: mainBranchId,
      items: state.stockReturnDraft.items
    };
    db.ref(`stockReturn/${editingId}`).update(payload).then(() => {
      const updates = [];
      if (oldBranchId !== newBranchId) {
        state.stockReturnDraft.originalItems.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
          updates.push(updateItemStock(item.itemType, item.itemId, oldBranchId, Number(item.qty || 0)));
        });
        state.stockReturnDraft.items.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, Number(item.qty || 0)));
          updates.push(updateItemStock(item.itemType, item.itemId, newBranchId, -Number(item.qty || 0)));
        });
      } else {
        const diffs = diffItems(state.stockReturnDraft.originalItems, state.stockReturnDraft.items);
        diffs.forEach((diff) => {
          updates.push(updateItemStock(diff.itemType, diff.itemId, mainBranchId, Number(diff.qtyDiff || 0)));
          updates.push(updateItemStock(diff.itemType, diff.itemId, newBranchId, -Number(diff.qtyDiff || 0)));
        });
      }
      Promise.all(updates).then(() => {
        resetStockReturnDraft();
        renderStockReturnSection();
        closeStockReturnModal();
      });
    });
    return;
  }

  generateCounter('meta/stockReturnCounter').then((stockReturnNumber) => {
    const payload = {
      stockReturnNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      fromBranchId: state.stockReturnDraft.branchId,
      toBranchId: mainBranchId,
      items: state.stockReturnDraft.items
    };
    db.ref('stockReturn').push(payload).then(() => {
      const updates = [];
      state.stockReturnDraft.items.forEach((item) => {
        updates.push(updateItemStock(item.itemType, item.itemId, state.stockReturnDraft.branchId, -Number(item.qty || 0)));
        updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, Number(item.qty || 0)));
      });
      Promise.all(updates).then(() => {
        resetStockReturnDraft();
        renderStockReturnSection();
        closeStockReturnModal();
      });
    });
  });
}

function renderStockReturnTable() {
  const table = document.getElementById('stockReturnTable');
  if (!table) return;
  const records = state.cache.stockReturn || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.stockReturnNumber || '-'}</td>
      <td>${getBranchLabel(rec.fromBranchId)}</td>
      <td>${getBranchLabel(rec.toBranchId)}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printStockReturnReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openStockReturnEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteStockReturn(rec));
    table.appendChild(row);
  });
}

function deleteStockReturn(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const mainBranchId = record.toBranchId || getMainBranchId();
  const fromBranchId = record.fromBranchId;
  const items = normalizeItems(record.items);
  const updates = [];
  items.forEach((item) => {
    updates.push(updateItemStock(item.itemType, item.itemId, mainBranchId, -Number(item.qty || 0)));
    updates.push(updateItemStock(item.itemType, item.itemId, fromBranchId, Number(item.qty || 0)));
  });
  Promise.all(updates).then(() => {
    db.ref(`stockReturn/${record.id}`).remove();
  });
}

function setupScrapReturnSection() {
  const section = document.getElementById('section-scrapReturn');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content: space-between; align-items: center;">
        <h3>${window.i18n.t('scrap_return')}</h3>
        <button id="openScrapReturnModalBtn" class="btn primary">${window.i18n.t('new_scrap_return')}</button>
      </div>
      <table class="table" style="margin-top: 12px;">
        <thead>
          <tr>
            <th>${window.i18n.t('scrap_return_number')}</th>
            <th>${window.i18n.t('from_branch')}</th>
            <th>${window.i18n.t('storekeeper_name')}</th>
            <th>${window.i18n.t('date_time')}</th>
            <th>${window.i18n.t('items')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="scrapReturnTable"></tbody>
      </table>
    </div>
    <div id="scrapReturnModal" class="overlay hidden">
      <div class="modal lg" style="text-align: start; max-height: 90vh; overflow: auto; max-width: 900px; width: 100%;">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <h3>${window.i18n.t('scrap_return_voucher')}</h3>
          <button id="scrapReturnModalCloseBtn" class="btn ghost small">×</button>
        </div>
        <div class="grid two" style="margin-top: 12px;">
          <div>
            <label class="tag">${window.i18n.t('storekeeper_name')}</label>
            <input id="scrapReturnStorekeeper" class="input" readonly />
          </div>
          <div>
            <label class="tag">${window.i18n.t('from_branch')}</label>
            <select id="scrapReturnBranchSelect" class="input"></select>
          </div>
        </div>
        <div class="row" style="margin-top: 12px;">
          <input id="scrapReturnSearchInput" class="input" style="max-width: 320px;" placeholder="${window.i18n.t('search_products')}" />
          <button id="scrapReturnSearchBtn" class="btn ghost small">${window.i18n.t('search')}</button>
        </div>
        <div id="scrapReturnSearchResults" class="grid two" style="margin-top: 12px;"></div>
        <div style="margin-top: 16px;">
          <h4>${window.i18n.t('items')}</h4>
          <div id="scrapReturnItemsList" class="grid two"></div>
        </div>
        <div class="row" style="justify-content: flex-end; margin-top: 16px;">
          <button id="scrapReturnCancelBtn" class="btn ghost">${window.i18n.t('cancel')}</button>
          <button id="scrapReturnSubmitBtn" class="btn primary">${window.i18n.t('scrap_action')}</button>
        </div>
        <p id="scrapReturnError" class="helper form-error" style="margin-top: 8px;"></p>
      </div>
    </div>
  `;

  resetScrapReturnDraft();
  bindScrapReturnSection();
  renderScrapReturnSection();
}

function resetScrapReturnDraft() {
  state.scrapReturnDraft = {
    branchId: '',
    items: [],
    editingId: null,
    originalItems: [],
    originalBranchId: null
  };
}

function bindScrapReturnSection() {
  const openBtn = document.getElementById('openScrapReturnModalBtn');
  const closeBtn = document.getElementById('scrapReturnModalCloseBtn');
  const cancelBtn = document.getElementById('scrapReturnCancelBtn');
  const branchSelect = document.getElementById('scrapReturnBranchSelect');
  const searchInput = document.getElementById('scrapReturnSearchInput');
  const searchBtn = document.getElementById('scrapReturnSearchBtn');
  const submitBtn = document.getElementById('scrapReturnSubmitBtn');

  if (openBtn) openBtn.addEventListener('click', () => openScrapReturnModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeScrapReturnModal());
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeScrapReturnModal());

  if (branchSelect) {
    branchSelect.addEventListener('change', () => {
      state.scrapReturnDraft.branchId = branchSelect.value;
      const errorEl = document.getElementById('scrapReturnError');
      if (errorEl) errorEl.textContent = '';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => renderScrapReturnSearchResults());
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleScrapReturnBarcodeScan();
      }
    });
  }

  if (searchBtn) searchBtn.addEventListener('click', () => renderScrapReturnSearchResults());
  if (submitBtn) submitBtn.addEventListener('click', () => submitScrapReturnVoucher());
}

function openScrapReturnModal() {
  const overlay = document.getElementById('scrapReturnModal');
  if (!overlay) return;
  resetScrapReturnDraft();
  renderScrapReturnSection();
  const errorEl = document.getElementById('scrapReturnError');
  if (errorEl) errorEl.textContent = '';
  const searchInput = document.getElementById('scrapReturnSearchInput');
  if (searchInput) searchInput.value = '';
  renderScrapReturnSearchResults();
  overlay.classList.remove('hidden');
}

function openScrapReturnEditModal(record) {
  const overlay = document.getElementById('scrapReturnModal');
  if (!overlay || !record) return;
  resetScrapReturnDraft();
  state.scrapReturnDraft.editingId = record.id || null;
  state.scrapReturnDraft.branchId = record.branchId || '';
  state.scrapReturnDraft.originalBranchId = record.branchId || '';
  state.scrapReturnDraft.items = normalizeItems(record.items).map((item) => ({ ...item }));
  state.scrapReturnDraft.originalItems = normalizeItems(record.items).map((item) => ({ ...item }));
  renderScrapReturnSection();
  const errorEl = document.getElementById('scrapReturnError');
  if (errorEl) errorEl.textContent = '';
  overlay.classList.remove('hidden');
}

function closeScrapReturnModal() {
  const overlay = document.getElementById('scrapReturnModal');
  if (overlay) overlay.classList.add('hidden');
}

function renderScrapReturnSection() {
  if (!state.scrapReturnDraft) resetScrapReturnDraft();
  const storekeeperInput = document.getElementById('scrapReturnStorekeeper');
  const branchSelect = document.getElementById('scrapReturnBranchSelect');
  if (storekeeperInput) storekeeperInput.value = state.user?.name || '-';
  if (branchSelect) {
    renderBranchOptions(branchSelect, { excludeMain: true });
    branchSelect.value = state.scrapReturnDraft.branchId || '';
  }
  renderScrapReturnSearchResults();
  renderScrapReturnItems();
  renderScrapReturnTable();
}

function getScrapReturnSearchEntries() {
  return getProductEntries();
}

function handleScrapReturnBarcodeScan() {
  const searchInput = document.getElementById('scrapReturnSearchInput');
  if (!searchInput) return;
  const query = searchInput.value.trim();
  if (!query) return;
  const entries = getScrapReturnSearchEntries();
  const match = findExactItemMatch(entries, query);
  if (match) {
    openScrapReturnQtyModal(match);
    searchInput.value = '';
    renderScrapReturnSearchResults();
  }
}

function renderScrapReturnSearchResults() {
  const searchInput = document.getElementById('scrapReturnSearchInput');
  const results = document.getElementById('scrapReturnSearchResults');
  if (!searchInput || !results) return;
  const query = searchInput.value.trim();
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const entries = filterItemEntries(getScrapReturnSearchEntries(), query);
  const exact = findExactItemMatch(entries, query);
  if (exact) {
    openScrapReturnQtyModal(exact);
    searchInput.value = '';
    results.innerHTML = '';
    return;
  }
  renderItemSearchResults(results, entries, (entry) => openScrapReturnQtyModal(entry));
}

function openScrapReturnQtyModal(entry) {
  const errorEl = document.getElementById('scrapReturnError');
  if (errorEl) errorEl.textContent = '';
  const branchId = state.scrapReturnDraft.branchId;
  if (!branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }
  const available = getItemStock(entry.item, branchId);
  openQtyModal({
    title: getLocalizedName(entry.item),
    available,
    mode: 'deduct',
    onConfirm: (qty) => addScrapReturnItem(entry, qty)
  });
}

function addScrapReturnItem(entry, qty) {
  const existing = state.scrapReturnDraft.items.find((item) => item.itemId === entry.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.scrapReturnDraft.items.push({
      itemId: entry.id,
      itemType: entry.type,
      name: getLocalizedName(entry.item),
      qty,
      unitId: entry.item.unitId || null
    });
  }
  renderScrapReturnItems();
}

function renderScrapReturnItems() {
  const container = document.getElementById('scrapReturnItemsList');
  if (!container) return;
  container.innerHTML = '';
  if (!state.scrapReturnDraft.items.length) {
    container.innerHTML = `<p class="helper">${window.i18n.t('no_data')}</p>`;
    return;
  }
  state.scrapReturnDraft.items.forEach((item, index) => {
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
    card.querySelector('[data-action="edit"]').addEventListener('click', () => editScrapReturnItemQty(index));
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.scrapReturnDraft.items.splice(index, 1);
      renderScrapReturnItems();
    });
    container.appendChild(card);
  });
}

function editScrapReturnItemQty(index) {
  const item = state.scrapReturnDraft.items[index];
  if (!item) return;
  const branchId = state.scrapReturnDraft.branchId;
  if (!branchId) return;
  const itemData = getItemDataByType(item.itemType, item.itemId);
  const availableBase = itemData ? getItemStock(itemData, branchId) : 0;
  const available = Number(availableBase || 0) + Number(item.qty || 0);
  openQtyModal({
    title: item.name || getLocalizedName(itemData),
    available,
    mode: 'deduct',
    onConfirm: (qty) => {
      state.scrapReturnDraft.items[index].qty = qty;
      renderScrapReturnItems();
    }
  });
}

function submitScrapReturnVoucher() {
  const errorEl = document.getElementById('scrapReturnError');
  if (errorEl) errorEl.textContent = '';
  if (!state.scrapReturnDraft.items.length || !state.scrapReturnDraft.branchId) {
    if (errorEl) errorEl.textContent = window.i18n.t('error');
    return;
  }

  if (state.scrapReturnDraft.editingId) {
    const editingId = state.scrapReturnDraft.editingId;
    const newBranchId = state.scrapReturnDraft.branchId;
    const oldBranchId = state.scrapReturnDraft.originalBranchId || newBranchId;
    const payload = {
      branchId: newBranchId,
      items: state.scrapReturnDraft.items
    };
    db.ref(`scrapReturn/${editingId}`).update(payload).then(() => {
      const updates = [];
      if (oldBranchId !== newBranchId) {
        state.scrapReturnDraft.originalItems.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, oldBranchId, Number(item.qty || 0)));
        });
        state.scrapReturnDraft.items.forEach((item) => {
          updates.push(updateItemStock(item.itemType, item.itemId, newBranchId, -Number(item.qty || 0)));
        });
      } else {
        const diffs = diffItems(state.scrapReturnDraft.originalItems, state.scrapReturnDraft.items);
        diffs.forEach((diff) => {
          updates.push(updateItemStock(diff.itemType, diff.itemId, newBranchId, -Number(diff.qtyDiff || 0)));
        });
      }
      Promise.all(updates).then(() => {
        resetScrapReturnDraft();
        renderScrapReturnSection();
        closeScrapReturnModal();
      });
    });
    return;
  }

  generateCounter('meta/scrapReturnCounter').then((scrapReturnNumber) => {
    const payload = {
      scrapReturnNumber,
      createdAt: serverTime,
      storekeeperId: state.user?.id || null,
      storekeeperName: state.user?.name || null,
      branchId: state.scrapReturnDraft.branchId,
      items: state.scrapReturnDraft.items
    };
    db.ref('scrapReturn').push(payload).then(() => {
      const updates = [];
      state.scrapReturnDraft.items.forEach((item) => {
        updates.push(updateItemStock(item.itemType, item.itemId, state.scrapReturnDraft.branchId, -Number(item.qty || 0)));
      });
      Promise.all(updates).then(() => {
        resetScrapReturnDraft();
        renderScrapReturnSection();
        closeScrapReturnModal();
      });
    });
  });
}

function renderScrapReturnTable() {
  const table = document.getElementById('scrapReturnTable');
  if (!table) return;
  const records = state.cache.scrapReturn || {};
  const entries = Object.entries(records)
    .map(([id, rec]) => ({ id, ...rec }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="6">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }
  entries.forEach((rec) => {
    const items = normalizeItems(rec.items);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rec.scrapReturnNumber || '-'}</td>
      <td>${getBranchLabel(rec.branchId)}</td>
      <td>${rec.storekeeperName || '-'}</td>
      <td>${formatDate(rec.createdAt)}</td>
      <td>${items.length}</td>
      <td>
        <div class="row" style="gap: 6px;">
          <button class="btn ghost small" data-action="print">${window.i18n.t('print_report')}</button>
          <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
          <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
        </div>
      </td>
    `;
    row.querySelector('[data-action="print"]').addEventListener('click', () => printScrapReturnReport(rec));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openScrapReturnEditModal(rec));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteScrapReturn(rec));
    table.appendChild(row);
  });
}

function deleteScrapReturn(record) {
  if (!record?.id) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  const branchId = record.branchId;
  const items = normalizeItems(record.items);
  const updates = items.map((item) => updateItemStock(item.itemType, item.itemId, branchId, Number(item.qty || 0)));
  Promise.all(updates).then(() => {
    db.ref(`scrapReturn/${record.id}`).remove();
  });
}

function buildReportHtml({ title, meta, columns, rows, footerNote, barcodeValue, docNumberLabel, docNumberValue, tableTitle, extraTableTitle, extraColumns, extraRows, showRowNumbers = true }) {
  const dir = document.documentElement.dir || 'rtl';
  const lang = document.documentElement.lang || 'ar';
  const metaHtml = meta.map((item) => `
    <div class="meta-item">
      <div class="meta-label">${item.label}</div>
      <div class="meta-value">${item.value}</div>
    </div>
  `).join('');
  const headerHtml = columns.map((label) => `<th>${label}</th>`).join('');
  const numberHeader = showRowNumbers ? `<th>${window.i18n.t('row_number')}</th>` : '';
  const rowsHtml = rows.map((row, index) => `
    <tr>
      ${showRowNumbers ? `<td>${index + 1}</td>` : ''}
      ${row.map((cell) => `<td>${cell}</td>`).join('')}
    </tr>
  `).join('');
  const tableTitleText = tableTitle || window.i18n.t('items_table');
  const extraHeaderHtml = (extraColumns || []).map((label) => `<th>${label}</th>`).join('');
  const extraRowsHtml = (extraRows || []).map((row, index) => `
    <tr>
      ${showRowNumbers ? `<td>${index + 1}</td>` : ''}
      ${row.map((cell) => `<td>${cell}</td>`).join('')}
    </tr>
  `).join('');
  const barcodeHtml = barcodeValue ? `<div class="barcode"><svg id="reportBarcode"></svg></div>` : '';
  const barcodeScript = barcodeValue
    ? `
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        window.addEventListener('load', () => {
          try { JsBarcode("#reportBarcode", "${barcodeValue}", { format: "CODE128", displayValue: true, height: 46 }); } catch (e) {}
          setTimeout(() => window.print(), 120);
        });
      </script>
    `
    : `
      <script>
        window.addEventListener('load', () => { window.print(); });
      </script>
    `;
  const appTitle = window.i18n.t('app_title');
  const brandName = 'مخبز التين والزيتون';
  const docNumberText = docNumberLabel ? `${docNumberLabel}: ${docNumberValue || '-'}` : '';
  const docNumberHtml = docNumberText ? `<div class="doc-number">${docNumberText}</div>` : '';
  return `
    <html lang="${lang}" dir="${dir}">
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { font-family: "Cairo", sans-serif; color: #1f1a14; margin: 0; }
          .report { padding: 8mm; border: 1px solid #cfc5bb; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3a2f26; padding-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand img { width: 70px; height: 70px; object-fit: contain; }
          .brand-name { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.2px; }
          .brand-subtitle { font-size: 11px; color: #6b5c4f; margin-top: 2px; }
          .doc-box { min-width: 190px; text-align: end; border: 1px solid #3a2f26; padding: 8px 10px; }
          .doc-title { margin: 0 0 4px; font-size: 18px; font-weight: 700; }
          .doc-number { font-size: 12px; font-weight: 600; }
          .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
          .meta-item { border: 1px solid #d8cfc5; padding: 6px 8px; }
          .meta-label { font-size: 10px; color: #6b5c4f; margin-bottom: 3px; }
          .meta-value { font-size: 12px; font-weight: 700; color: #1f1a14; }
          .table-title { margin-top: 16px; font-size: 13px; font-weight: 700; color: #3a2f26; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; border: 1.4px solid #c3b9af; }
          th, td { border: 1.4px solid #c3b9af; padding: 7px; text-align: start; font-size: 12px; }
          th { background: #f1ece6; font-weight: 700; }
          tr { page-break-inside: avoid; }
          .footer { display: flex; justify-content: space-between; margin-top: 16px; font-size: 11px; color: #6b5c4f; }
          .barcode { margin-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="header">
            <div class="brand">
              <img src="logo.png" alt="logo" />
              <div>
                <div class="brand-name">${brandName}</div>
                <div class="brand-subtitle">${appTitle}</div>
              </div>
            </div>
            <div class="doc-box">
              <div class="doc-title">${title}</div>
              ${docNumberHtml}
          </div>
        </div>
        <div class="meta">${metaHtml}</div>
        <div class="table-title">${tableTitleText}</div>
        <table>
          <thead>
            <tr>${numberHeader}${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${extraColumns && extraColumns.length ? `
          <div class="table-title">${extraTableTitle || ''}</div>
          <table>
            <thead>
              <tr>${numberHeader}${extraHeaderHtml}</tr>
            </thead>
            <tbody>
              ${extraRowsHtml}
            </tbody>
          </table>
        ` : ''}
        ${barcodeHtml}
        ${footerNote ? `<div class="footer">${footerNote}</div>` : ''}
      </div>
        ${barcodeScript}
      </body>
    </html>
  `;
}

function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function printReceivingReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const meta = [
    { label: window.i18n.t('source_name'), value: record.sourceName || '-' },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name_ar'),
    window.i18n.t('name_en'),
    window.i18n.t('quantity'),
    window.i18n.t('storage_location')
  ];
  const rows = items.map((item) => [
    item.nameAr || '-',
    item.nameEn || '-',
    formatNumber(item.qty),
    getLocalizedName(state.cache.storageLocations?.[item.storageLocationId]) || '-'
  ]);
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('receiving_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('receiving_number'),
    docNumberValue: record.receivingNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printTransferReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const meta = [
    { label: window.i18n.t('from_branch'), value: getBranchLabel(record.fromBranchId) },
    { label: window.i18n.t('to_branch'), value: getBranchLabel(record.toBranchId) },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => [
    formatItemNameWithUnit(item.name || '-', item.unitId),
    formatNumber(item.qty)
  ]);
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('transfer_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('transfer_number'),
    docNumberValue: record.transferNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printStockReturnReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const meta = [
    { label: window.i18n.t('from_branch'), value: getBranchLabel(record.fromBranchId) },
    { label: window.i18n.t('to_branch'), value: getBranchLabel(record.toBranchId) },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => [
    formatItemNameWithUnit(item.name || '-', item.unitId),
    formatNumber(item.qty)
  ]);
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('stock_return_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('stock_return_number'),
    docNumberValue: record.stockReturnNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printScrapReturnReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const meta = [
    { label: window.i18n.t('from_branch'), value: getBranchLabel(record.branchId) },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => [
    formatItemNameWithUnit(item.name || '-', item.unitId),
    formatNumber(item.qty)
  ]);
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('scrap_return_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('scrap_return_number'),
    docNumberValue: record.scrapReturnNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printPurchaseReceiptReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const supplierName = record.supplierName
    || getLocalizedName(state.cache.suppliers?.[record.supplierId])
    || '-';
  const meta = [
    { label: window.i18n.t('supplier'), value: supplierName },
    { label: window.i18n.t('purchase_number'), value: record.purchaseNumber || '-' },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => {
    const data = getItemDataByType(item.itemType, item.itemId);
    const name = item.name || getLocalizedName(data) || '-';
    const unitId = item.unitId || data?.unitId || null;
    return [formatItemNameWithUnit(name, unitId), formatNumber(item.qty)];
  });
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const docNumber = record.receiptNumber || record.id || '';
  const html = buildReportHtml({
    title: window.i18n.t('receive_purchases'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('receiving_number'),
    docNumberValue: docNumber,
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printSupplierReturnReport(record) {
  if (!record) return;
  const items = normalizeItems(record.items);
  const supplierName = record.supplierName
    || getLocalizedName(state.cache.suppliers?.[record.supplierId])
    || '-';
  const meta = [
    { label: window.i18n.t('supplier'), value: supplierName },
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => {
    const data = getItemDataByType(item.itemType, item.itemId);
    const name = item.name || getLocalizedName(data) || '-';
    const unitId = item.unitId || data?.unitId || null;
    return [formatItemNameWithUnit(name, unitId), formatNumber(item.qty)];
  });
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('supplier_return_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('supplier_return_number'),
    docNumberValue: record.returnNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printIssueReport(issue) {
  if (!issue) return;
  const branches = state.cache.branches || {};
  const items = normalizeItems(issue.items);
  const issueTypeLabel = issue.issueType === 'production' ? window.i18n.t('issue_production') : window.i18n.t('issue_order');
  const staffLabel = issue.productionStaffName || getStaffLabel(state.cache.productionStaff?.[issue.productionStaffId], '-') || '-';
  const meta = [
    { label: window.i18n.t('issue_type'), value: issueTypeLabel },
    { label: window.i18n.t('date_time'), value: formatDate(issue.createdAt) },
    { label: window.i18n.t('branch'), value: getLocalizedName(branches[issue.branchId]) || '-' },
    { label: window.i18n.t('storekeeper_name'), value: issue.storekeeperName || '-' },
    { label: window.i18n.t('cashiers'), value: issue.cashierName || '-' },
    { label: window.i18n.t('production_staff_single'), value: staffLabel },
    { label: window.i18n.t('invoice_number'), value: issue.invoiceNumber || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => {
    const nameWithUnit = formatItemNameWithUnit(item.name, item.unitId);
    return [nameWithUnit, formatNumber(item.qty)];
  });
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('issue_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('issue_number'),
    docNumberValue: issue.issueNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function printProductionReport(record) {
  if (!record) return;
  const branches = state.cache.branches || {};
  const staffLabel = record.productionStaffName || getStaffLabel(state.cache.productionStaff?.[record.productionStaffId], '-') || '-';
  const meta = [
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('branch'), value: getLocalizedName(branches[record.branchId]) || '-' },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('production_staff_single'), value: staffLabel },
    { label: window.i18n.t('linked_issue_number'), value: record.issueNumber || '-' }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity'),
    window.i18n.t('production_date'),
    window.i18n.t('expiry_date')
  ];
  const itemData = record.itemType === 'product'
    ? state.cache.products?.[record.itemId]
    : state.cache.stockMaterials?.[record.itemId];
  const nameWithUnit = formatItemNameWithUnit(record.itemName || '-', itemData?.unitId || null);
  const rows = [[nameWithUnit, formatNumber(record.qty), record.productionDate || '-', record.expiryDate || '-']];
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const issue = state.cache.stockIssue?.[record.issueId];
  const issueItems = normalizeItems(issue?.items);
  const usedRows = issueItems.length
    ? issueItems.map((item) => [
      formatItemNameWithUnit(item.name || item.itemId || '-', item.unitId),
      formatNumber(item.qty)
    ])
    : [[window.i18n.t('no_data'), '-']];
  const html = buildReportHtml({
    title: window.i18n.t('production_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    barcodeValue: record.productionBarcode || null,
    docNumberLabel: window.i18n.t('issue_number'),
    docNumberValue: record.productionNumber || '',
    tableTitle: window.i18n.t('items_table'),
    extraTableTitle: window.i18n.t('materials_used'),
    extraColumns: [window.i18n.t('name'), window.i18n.t('quantity')],
    extraRows: usedRows
  });
  openPrintWindow(html);
}

function printInventoryReport(record) {
  if (!record) return;
  const branches = state.cache.branches || {};
  const storageLocations = state.cache.storageLocations || {};
  const items = normalizeItems(record.items);
  const meta = [
    { label: window.i18n.t('date_time'), value: formatDate(record.createdAt) },
    { label: window.i18n.t('branch'), value: getLocalizedName(branches[record.branchId]) || '-' },
    { label: window.i18n.t('storage_locations'), value: getLocalizedName(storageLocations[record.storageLocationId]) || '-' },
    { label: window.i18n.t('storekeeper_name'), value: record.storekeeperName || '-' },
    { label: window.i18n.t('items'), value: items.length }
  ];
  const columns = [
    window.i18n.t('name'),
    window.i18n.t('quantity')
  ];
  const rows = items.map((item) => {
    const nameWithUnit = formatItemNameWithUnit(item.name, item.unitId);
    return [nameWithUnit, formatNumber(item.qty)];
  });
  const printedAt = `${window.i18n.t('printed_at')}: ${formatDate(Date.now())}`;
  const html = buildReportHtml({
    title: window.i18n.t('inventory_voucher'),
    meta,
    columns,
    rows,
    footerNote: printedAt,
    docNumberLabel: window.i18n.t('count_number'),
    docNumberValue: record.countNumber || '',
    tableTitle: window.i18n.t('items_table')
  });
  openPrintWindow(html);
}

function bindDiscountForm() {
  const codeBtn = document.getElementById('discountTypeCode');
  const productBtn = document.getElementById('discountTypeProduct');
  const codeFields = document.getElementById('discountCodeFields');
  const productFields = document.getElementById('discountProductFields');
  const form = document.getElementById('discountForm');
  const cancelBtn = document.getElementById('discountCancel');
  const audienceSelect = document.getElementById('discountAudience');
  const valueTypeSelect = document.getElementById('discountValueType');
  const productSelect = document.getElementById('discountProduct');
  const batchSelect = document.getElementById('discountBatch');

  if (!form) return;

  const setType = (type) => {
    currentDiscountType = type;
    codeFields.classList.toggle('hidden', type !== 'code');
    productFields.classList.toggle('hidden', type !== 'product');
    codeBtn.classList.toggle('active', type === 'code');
    productBtn.classList.toggle('active', type === 'product');
  };

  codeBtn.addEventListener('click', () => setType('code'));
  productBtn.addEventListener('click', () => setType('product'));

  audienceSelect.innerHTML = '';
  [
    { value: 'all', labelKey: 'audience_all' },
    { value: 'vip', labelKey: 'audience_vip' },
    { value: 'vvip', labelKey: 'audience_vvip' }
  ].forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = window.i18n.t(opt.labelKey);
    audienceSelect.appendChild(option);
  });

  valueTypeSelect.innerHTML = '';
  [
    { value: 'percent', labelKey: 'discount_percent' },
    { value: 'amount', labelKey: 'discount_amount' }
  ].forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = window.i18n.t(opt.labelKey);
    valueTypeSelect.appendChild(option);
  });

  productSelect.addEventListener('change', () => {
    updateBatchOptions(productSelect.value);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitDiscountForm();
  });

  cancelBtn.addEventListener('click', () => resetDiscountForm());

  setType(currentDiscountType);
  renderDiscountProductOptions();
}

function renderDiscountProductOptions() {
  const productSelect = document.getElementById('discountProduct');
  if (!productSelect) return;
  productSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select');
  productSelect.appendChild(placeholder);
  const products = state.cache.products || {};
  Object.entries(products).forEach(([id, product]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getLocalizedName(product);
    productSelect.appendChild(option);
  });
  updateBatchOptions(productSelect.value);
}

function updateBatchOptions(productId) {
  const batchSelect = document.getElementById('discountBatch');
  const hint = document.getElementById('discountProductHint');
  if (!batchSelect || !hint) return;
  const batches = state.cache.production || {};
  batchSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select');
  batchSelect.appendChild(placeholder);

  const productBatches = Object.entries(batches)
    .filter(([, batch]) => batch.productId === productId && batch.expiryDate)
    .map(([id, batch]) => ({ id, ...batch }));

  if (productId && productBatches.length === 0) {
    hint.textContent = window.i18n.t('product_not_eligible');
  } else {
    hint.textContent = '';
  }

  productBatches.forEach((batch) => {
    const option = document.createElement('option');
    option.value = batch.id;
    option.textContent = `${batch.batchCode || '-'} (${batch.expiryDate || '-'})`;
    batchSelect.appendChild(option);
  });
}

function resetDiscountForm() {
  const form = document.getElementById('discountForm');
  if (!form) return;
  form.reset();
  delete form.dataset.editId;
  delete form.dataset.editType;
  const cancelBtn = document.getElementById('discountCancel');
  cancelBtn.classList.add('hidden');
  const submitBtn = form.querySelector('[data-action="submit"]');
  submitBtn.textContent = window.i18n.t('save');
}

function submitDiscountForm() {
  const form = document.getElementById('discountForm');
  const errorEl = document.getElementById('discountError');
  if (!form) return;
  const active = document.getElementById('discountActive').checked;
  let payload = { active };

  if (currentDiscountType === 'code') {
    const code = document.getElementById('discountCode').value.trim();
    const audience = document.getElementById('discountAudience').value;
    const startDate = document.getElementById('discountStart').value;
    const endDate = document.getElementById('discountEnd').value;
    const valueType = document.getElementById('discountValueType').value;
    const value = Number(document.getElementById('discountValue').value || 0);
    if (!code || !startDate || !endDate || !valueType) {
      errorEl.textContent = window.i18n.t('error');
      return;
    }
    payload = {
      ...payload,
      type: 'code',
      code,
      audience,
      startDate,
      endDate,
      valueType,
      value,
      createdAt: serverTime
    };
  } else {
    const productId = document.getElementById('discountProduct').value;
    const batchId = document.getElementById('discountBatch').value;
    const daysBeforeExpiry = Number(document.getElementById('discountDays').value || 0);
    if (!productId || !batchId || !daysBeforeExpiry) {
      errorEl.textContent = window.i18n.t('error');
      return;
    }
    payload = {
      ...payload,
      type: 'product',
      productId,
      batchId,
      daysBeforeExpiry,
      createdAt: serverTime
    };
  }

  errorEl.textContent = '';
  const editId = form.dataset.editId;
  if (editId) {
    db.ref(`discounts/${editId}`).update(payload).then(() => {
      resetDiscountForm();
    });
  } else {
    db.ref('discounts').push(payload).then(() => {
      resetDiscountForm();
    });
  }
}

function renderDiscounts() {
  const table = document.getElementById('discountsTable');
  if (!table) return;
  const discounts = state.cache.discounts || {};
  const usage = state.cache.discountUsage || {};
  const products = state.cache.products || {};
  const batches = state.cache.production || {};
  const entries = Object.entries(discounts);

  renderDiscountProductOptions();
  table.innerHTML = '';

  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach(([id, discount]) => {
    const usageCount = usage[id] ? Object.keys(usage[id]).length : 0;
    const statusLabel = discount.active ? window.i18n.t('active') : window.i18n.t('inactive');
    let label = '';
    if (discount.type === 'code') {
      label = `${window.i18n.t('discount_type_code')}: ${discount.code || '-'}`;
    } else {
      const productName = products[discount.productId]?.name || '-';
      const batchLabel = batches[discount.batchId]?.batchCode || '-';
      label = `${window.i18n.t('discount_type_product')}: ${productName} (${batchLabel})`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${label}</td>
      <td>${statusLabel}</td>
      <td>
        <button class="btn ghost small" data-action="usage">${usageCount}</button>
      </td>
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn ghost small" data-action="toggle">${discount.active ? window.i18n.t('deactivate') : window.i18n.t('activate')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      populateDiscountForm(id, discount);
    });

    row.querySelector('[data-action="toggle"]').addEventListener('click', () => {
      db.ref(`discounts/${id}`).update({ active: !discount.active });
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`discounts/${id}`).remove();
      }
    });

    row.querySelector('[data-action="usage"]').addEventListener('click', () => {
      openDiscountUsage(id);
    });

    table.appendChild(row);
  });
}

function populateDiscountForm(id, discount) {
  const form = document.getElementById('discountForm');
  const cancelBtn = document.getElementById('discountCancel');
  if (!form) return;
  form.dataset.editId = id;
  currentDiscountType = discount.type || 'code';
  document.getElementById('discountTypeCode').classList.toggle('active', currentDiscountType === 'code');
  document.getElementById('discountTypeProduct').classList.toggle('active', currentDiscountType === 'product');
  document.getElementById('discountCodeFields').classList.toggle('hidden', currentDiscountType !== 'code');
  document.getElementById('discountProductFields').classList.toggle('hidden', currentDiscountType !== 'product');
  document.getElementById('discountActive').checked = !!discount.active;
  cancelBtn.classList.remove('hidden');
  form.querySelector('[data-action="submit"]').textContent = window.i18n.t('update');

  if (currentDiscountType === 'code') {
    document.getElementById('discountCode').value = discount.code || '';
    document.getElementById('discountAudience').value = discount.audience || 'all';
    document.getElementById('discountStart').value = discount.startDate || '';
    document.getElementById('discountEnd').value = discount.endDate || '';
    document.getElementById('discountValueType').value = discount.valueType || 'percent';
    document.getElementById('discountValue').value = discount.value || 0;
  } else {
    document.getElementById('discountProduct').value = discount.productId || '';
    updateBatchOptions(discount.productId);
    document.getElementById('discountBatch').value = discount.batchId || '';
    document.getElementById('discountDays').value = discount.daysBeforeExpiry || '';
  }
}

function openDiscountUsage(discountId) {
  const usage = state.cache.discountUsage?.[discountId] || {};
  const entries = Object.entries(usage).map(([id, order]) => ({ id, ...order }));
  if (!els.discountBody) return;
  if (entries.length === 0) {
    els.discountBody.innerHTML = `<p>${window.i18n.t('no_data')}</p>`;
  } else {
    els.discountBody.innerHTML = `
      <ul>
        ${entries
          .map((order) => `<li>#${order.orderNumber || '-'} - ${order.branchName || '-'} - ${formatNumber(order.total)} - ${formatDate(order.createdAt)}</li>`)
          .join('')}
      </ul>
    `;
  }
  els.discountOverlay.classList.remove('hidden');
}

function renderOrders() {
  const table = document.getElementById('ordersTable');
  if (!table) return;
  const orders = state.cache.orders || {};
  const branches = state.cache.branches || {};
  const cashiers = state.cache.cashiers || {};
  const zones = state.cache.deliveryZones || {};
  const paymentMethods = state.cache.paymentMethods || {};
  const customers = state.cache.customers || {};
  const filterSelect = document.getElementById('orderBranchFilter');
  const cashierSelect = document.getElementById('orderCashierFilter');
  const zoneSelect = document.getElementById('orderZoneFilter');

  if (filterSelect) {
    const current = filterSelect.value || 'all';
    filterSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = window.i18n.t('all_branches');
    filterSelect.appendChild(allOption);
    Object.entries(branches).forEach(([id, branch]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(branch);
      filterSelect.appendChild(option);
    });
    filterSelect.value = current;
  }

  if (cashierSelect) {
    const current = cashierSelect.value || 'all';
    cashierSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = window.i18n.t('cashiers');
    cashierSelect.appendChild(allOption);
    Object.entries(cashiers).forEach(([id, cashier]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = cashier.name || cashier.code || id;
      cashierSelect.appendChild(option);
    });
    cashierSelect.value = current;
  }

  if (zoneSelect) {
    const current = zoneSelect.value || 'all';
    zoneSelect.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = window.i18n.t('all_zones');
    zoneSelect.appendChild(allOption);
    Object.entries(zones).forEach(([id, zone]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(zone);
      zoneSelect.appendChild(option);
    });
    zoneSelect.value = current;
  }

  const entries = Object.entries(orders)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filtered = entries.filter((order) => {
    if (state.orderFilters.branchId !== 'all' && order.branchId !== state.orderFilters.branchId) {
      return false;
    }
    if (state.orderFilters.cashierId !== 'all' && order.cashierId !== state.orderFilters.cashierId) {
      return false;
    }
    if (state.orderFilters.zoneId !== 'all' && order.deliveryZoneId !== state.orderFilters.zoneId) {
      return false;
    }
    if (state.orderFilters.dateFrom) {
      const start = new Date(`${state.orderFilters.dateFrom}T00:00:00`).getTime();
      if ((order.createdAt || 0) < start) return false;
    }
    if (state.orderFilters.dateTo) {
      const end = new Date(`${state.orderFilters.dateTo}T23:59:59`).getTime();
      if ((order.createdAt || 0) > end) return false;
    }
    if (state.orderFilters.query) {
      const customerName = order.customerName || customers[order.customerId]?.nameAr || '';
      const target = `${order.orderNumber || ''} ${order.cashierName || ''} ${order.branchName || ''} ${customerName}`.toLowerCase();
      if (!target.includes(state.orderFilters.query)) {
        return false;
      }
    }
    return true;
  });

  table.innerHTML = '';

  if (filtered.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="13">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  filtered.forEach((order) => {
    const row = document.createElement('tr');
    const customer = customers[order.customerId];
    const customerName = order.customerName || getLocalizedName(customer);
    const zoneName = getLocalizedName(zones[order.deliveryZoneId]);
    const paymentName = getLocalizedName(paymentMethods[order.paymentMethodId]) || order.paymentMethodId || '-';
    const netTotal = order.netTotal ?? (order.total ?? 0) - (order.deliveryFee || 0);
    row.innerHTML = `
      <td><input type="checkbox" data-id="${order.id}" ${state.selectedOrders.has(order.id) ? 'checked' : ''} /></td>
      <td>${order.orderNumber || '-'}</td>
      <td><button class="btn ghost small" data-action="customer">${customerName || '-'}</button></td>
      <td>${zoneName || '-'}</td>
      <td>${order.customerPhone || customer?.phone || '-'}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${order.cashierName || cashiers[order.cashierId]?.name || '-'}</td>
      <td>${getLocalizedName(branches[order.branchId]) || order.branchName || '-'}</td>
      <td>${formatNumber(netTotal)}</td>
      <td>${formatNumber(order.deliveryFee || 0)}</td>
      <td>${formatNumber(order.total)}</td>
      <td>${paymentName}</td>
      <td><button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button></td>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedOrders.add(order.id);
      } else {
        state.selectedOrders.delete(order.id);
      }
    });
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openOrderEditModal(order));
    row.querySelector('[data-action="customer"]').addEventListener('click', () => openCustomerOrders(order.customerId));
    table.appendChild(row);
  });

  const selectAll = document.getElementById('selectAllOrders');
  if (selectAll) {
    selectAll.checked = filtered.every((order) => state.selectedOrders.has(order.id));
  }
}

function getFilteredOrders() {
  const orders = state.cache.orders || {};
  const customers = state.cache.customers || {};
  const entries = Object.entries(orders)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return entries.filter((order) => {
    if (state.orderFilters.branchId !== 'all' && order.branchId !== state.orderFilters.branchId) {
      return false;
    }
    if (state.orderFilters.cashierId !== 'all' && order.cashierId !== state.orderFilters.cashierId) {
      return false;
    }
    if (state.orderFilters.zoneId !== 'all' && order.deliveryZoneId !== state.orderFilters.zoneId) {
      return false;
    }
    if (state.orderFilters.dateFrom) {
      const start = new Date(`${state.orderFilters.dateFrom}T00:00:00`).getTime();
      if ((order.createdAt || 0) < start) return false;
    }
    if (state.orderFilters.dateTo) {
      const end = new Date(`${state.orderFilters.dateTo}T23:59:59`).getTime();
      if ((order.createdAt || 0) > end) return false;
    }
    if (state.orderFilters.query) {
      const customerName = order.customerName || customers[order.customerId]?.nameAr || '';
      const target = `${order.orderNumber || ''} ${order.cashierName || ''} ${order.branchName || ''} ${customerName}`.toLowerCase();
      if (!target.includes(state.orderFilters.query)) {
        return false;
      }
    }
    return true;
  });
}

function getSelectedOrders() {
  const filtered = getFilteredOrders();
  if (state.selectedOrders.size === 0) return filtered;
  return filtered.filter((order) => state.selectedOrders.has(order.id));
}

function toggleSelectAllOrders(checked) {
  const orders = getFilteredOrders();
  if (checked) {
    orders.forEach((order) => state.selectedOrders.add(order.id));
  } else {
    orders.forEach((order) => state.selectedOrders.delete(order.id));
  }
  renderOrders();
}

function exportOrders() {
  const orders = getSelectedOrders();
  if (orders.length === 0) return;
  const branches = state.cache.branches || {};
  const cashiers = state.cache.cashiers || {};
  const zones = state.cache.deliveryZones || {};
  const paymentMethods = state.cache.paymentMethods || {};
  const customers = state.cache.customers || {};

  const rows = orders.map((order) => {
    const customer = customers[order.customerId];
    const customerName = order.customerName || getLocalizedName(customer);
    const zoneName = getLocalizedName(zones[order.deliveryZoneId]);
    const paymentName = getLocalizedName(paymentMethods[order.paymentMethodId]) || order.paymentMethodId || '-';
    const netTotal = order.netTotal ?? (order.total ?? 0) - (order.deliveryFee || 0);
    return {
      [window.i18n.t('invoice_number')]: order.orderNumber || '',
      [window.i18n.t('customer_name')]: customerName || '',
      [window.i18n.t('delivery_zone')]: zoneName || '',
      [window.i18n.t('customer_phone')]: order.customerPhone || customer?.phone || '',
      [window.i18n.t('date_time')]: formatDate(order.createdAt),
      [window.i18n.t('cashier')]: order.cashierName || cashiers[order.cashierId]?.name || '',
      [window.i18n.t('branch')]: getLocalizedName(branches[order.branchId]) || order.branchName || '',
      [window.i18n.t('net_total')]: netTotal,
      [window.i18n.t('delivery_fee')]: order.deliveryFee || 0,
      [window.i18n.t('grand_total')]: order.total || 0,
      [window.i18n.t('payment_method')]: paymentName
    };
  });

  exportToExcel(rows, 'orders-report.xlsx');
}

function printOrders() {
  const orders = getSelectedOrders();
  if (orders.length === 0) return;
  const branches = state.cache.branches || {};
  const customers = state.cache.customers || {};
  const zones = state.cache.deliveryZones || {};
  const paymentMethods = state.cache.paymentMethods || {};
  const lang = window.i18n.getLanguage();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const html = orders.map((order) => {
    const customer = customers[order.customerId];
    const zoneName = getLocalizedName(zones[order.deliveryZoneId]);
    const paymentName = getLocalizedName(paymentMethods[order.paymentMethodId]) || order.paymentMethodId || '-';
    const itemsHtml = (order.items || []).map((item) => `
      <tr>
        <td>${item.name || item.productId || '-'}</td>
        <td>${item.qty || 0}</td>
        <td>${formatNumber(item.price || 0)}</td>
        <td>${formatNumber((item.price || 0) * (item.qty || 0))}</td>
      </tr>
    `).join('');
    return `
      <div class="invoice">
        <h2>${window.i18n.t('invoice_number')} ${order.orderNumber || ''}</h2>
        <p>${window.i18n.t('customer_name')}: ${order.customerName || getLocalizedName(customer) || '-'}</p>
        <p>${window.i18n.t('customer_phone')}: ${order.customerPhone || customer?.phone || '-'}</p>
        <p>${window.i18n.t('delivery_zone')}: ${zoneName || '-'}</p>
        <p>${window.i18n.t('date_time')}: ${formatDate(order.createdAt)}</p>
        <p>${window.i18n.t('branch')}: ${getLocalizedName(branches[order.branchId]) || order.branchName || '-'}</p>
        <p>${window.i18n.t('cashier')}: ${order.cashierName || '-'}</p>
        <table>
          <thead>
            <tr>
              <th>${window.i18n.t('products')}</th>
              <th>${window.i18n.t('quantity')}</th>
              <th>${window.i18n.t('price')}</th>
              <th>${window.i18n.t('total')}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || `<tr><td colspan="4">${window.i18n.t('no_data')}</td></tr>`}
          </tbody>
        </table>
        <p>${window.i18n.t('net_total')}: ${formatNumber(order.netTotal ?? (order.total ?? 0) - (order.deliveryFee || 0))}</p>
        <p>${window.i18n.t('delivery_fee')}: ${formatNumber(order.deliveryFee || 0)}</p>
        <p>${window.i18n.t('grand_total')}: ${formatNumber(order.total || 0)}</p>
        <p>${window.i18n.t('payment_method')}: ${paymentName}</p>
      </div>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${lang}" dir="${dir}">
      <head>
        <title>${window.i18n.t('print_invoices')}</title>
        <style>
          body { font-family: 'Cairo', sans-serif; direction: ${dir}; padding: 24px; color: #1e1b16; }
          h2 { margin: 0 0 10px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: start; font-size: 12px; }
          .invoice { page-break-after: always; margin-bottom: 24px; }
          @media print {
            .invoice { page-break-after: always; }
          }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function openOrderEditModal(order) {
  if (!els.orderEditOverlay) return;
  state.editingOrder = {
    ...order,
    items: Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : []
  };

  const customers = state.cache.customers || {};
  const zones = state.cache.deliveryZones || {};
  const paymentMethods = state.cache.paymentMethods || {};
  const branches = state.cache.branches || {};
  const products = state.cache.products || {};

  const customerSelect = document.getElementById('orderCustomer');
  const zoneSelect = document.getElementById('orderZone');
  const paymentSelect = document.getElementById('orderPayment');
  const branchSelect = document.getElementById('orderBranch');
  const addProductSelect = document.getElementById('orderAddProduct');

  if (customerSelect) {
    customerSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.i18n.t('select_customer');
    customerSelect.appendChild(placeholder);
    Object.entries(customers).forEach(([id, customer]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(customer);
      customerSelect.appendChild(option);
    });
    customerSelect.value = order.customerId || '';
    customerSelect.onchange = () => {
      const selected = customers[customerSelect.value];
      if (selected) {
        document.getElementById('orderCustomerPhone').value = selected.phone || '';
        if (selected.zoneId && zoneSelect) {
          zoneSelect.value = selected.zoneId;
        }
      }
    };
  }

  if (zoneSelect) {
    zoneSelect.innerHTML = '';
    Object.entries(zones).forEach(([id, zone]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(zone);
      zoneSelect.appendChild(option);
    });
    zoneSelect.value = order.deliveryZoneId || '';
  }

  if (paymentSelect) {
    paymentSelect.innerHTML = '';
    Object.entries(paymentMethods).forEach(([id, method]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(method);
      paymentSelect.appendChild(option);
    });
    paymentSelect.value = order.paymentMethodId || '';
  }

  if (branchSelect) {
    branchSelect.innerHTML = '';
    Object.entries(branches).forEach(([id, branch]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(branch);
      branchSelect.appendChild(option);
    });
    branchSelect.value = order.branchId || '';
  }

  if (addProductSelect) {
    addProductSelect.innerHTML = '';
    Object.entries(products).forEach(([id, product]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(product);
      addProductSelect.appendChild(option);
    });
  }

  document.getElementById('orderCustomerPhone').value = order.customerPhone || '';
  document.getElementById('orderDeliveryFee').value = order.deliveryFee || 0;

  renderOrderItemsEditor();
  els.orderEditError.textContent = '';
  els.orderEditOverlay.classList.remove('hidden');
}

function renderOrderItemsEditor() {
  if (!els.orderItemsList) return;
  els.orderItemsList.innerHTML = '';
  const items = state.editingOrder?.items || [];
  items.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'card light';
    wrapper.style.padding = '12px';
    wrapper.innerHTML = `
      <strong>${item.name || item.productId || '-'}</strong>
      <div class="row" style="margin-top: 6px;">
        <label class="tag">${window.i18n.t('quantity')}</label>
        <input class="input" type="number" min="1" value="${item.qty || 1}" style="max-width: 90px;" data-field="qty" />
        <label class="tag">${window.i18n.t('price')}</label>
        <input class="input" type="number" min="0" value="${item.price || 0}" style="max-width: 110px;" data-field="price" />
        <button type="button" class="btn danger small" data-action="remove">${window.i18n.t('remove_item')}</button>
      </div>
    `;
    wrapper.querySelector('[data-field="qty"]').addEventListener('input', (e) => {
      const value = Number(e.target.value || 1);
      state.editingOrder.items[index].qty = value < 1 ? 1 : value;
    });
    wrapper.querySelector('[data-field="price"]').addEventListener('input', (e) => {
      const value = Number(e.target.value || 0);
      state.editingOrder.items[index].price = value < 0 ? 0 : value;
    });
    wrapper.querySelector('[data-action="remove"]').addEventListener('click', () => {
      state.editingOrder.items.splice(index, 1);
      renderOrderItemsEditor();
    });
    els.orderItemsList.appendChild(wrapper);
  });
}

function closeOrderEditModal() {
  if (!els.orderEditOverlay) return;
  els.orderEditOverlay.classList.add('hidden');
  state.editingOrder = null;
}

function saveOrderEdits() {
  if (!state.editingOrder) return;
  const customerId = document.getElementById('orderCustomer').value || null;
  const customerPhone = document.getElementById('orderCustomerPhone').value.trim();
  const deliveryZoneId = document.getElementById('orderZone').value || null;
  const deliveryFee = Number(document.getElementById('orderDeliveryFee').value || 0);
  const paymentMethodId = document.getElementById('orderPayment').value || null;
  const branchId = document.getElementById('orderBranch').value || null;
  const customers = state.cache.customers || {};
  const branches = state.cache.branches || {};

  const items = (state.editingOrder.items || []).filter((item) => item.qty > 0);
  if (items.length === 0) {
    els.orderEditError.textContent = window.i18n.t('empty_cart');
    return;
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.qty || 0)), 0);
  const discount = Number(state.editingOrder.discount || 0);
  const netTotal = Math.max(subtotal - discount, 0);
  const total = netTotal + deliveryFee;

  const selectedCustomer = customerId ? customers[customerId] : null;
  const customerName = selectedCustomer ? getLocalizedName(selectedCustomer) : state.editingOrder.customerName || null;
  const branchName = branchId ? getLocalizedName(branches[branchId]) : state.editingOrder.branchName || null;

  const updatePayload = {
    items,
    subtotal,
    discount,
    netTotal,
    deliveryFee,
    total,
    customerId,
    customerName,
    customerPhone: customerPhone || null,
    deliveryZoneId,
    paymentMethodId,
    branchId,
    branchName
  };

  db.ref(`orders/${state.editingOrder.id}`).update(updatePayload)
    .then(() => {
      closeOrderEditModal();
    })
    .catch(() => {
      els.orderEditError.textContent = window.i18n.t('error');
    });
}

function deleteOrder() {
  if (!state.editingOrder) return;
  if (!confirm(window.i18n.t('confirm_delete'))) return;
  db.ref(`orders/${state.editingOrder.id}`).remove()
    .then(() => closeOrderEditModal())
    .catch(() => {
      els.orderEditError.textContent = window.i18n.t('error');
    });
}

function openCustomerOrders(customerId) {
  if (!els.customerOrdersOverlay) return;
  const orders = Object.entries(state.cache.orders || {})
    .map(([id, data]) => ({ id, ...data }))
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const rows = orders.map((order) => `
    <tr>
      <td>${order.orderNumber || '-'}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${formatNumber(order.total || 0)}</td>
      <td>${order.branchName || '-'}</td>
      <td>${order.cashierName || '-'}</td>
    </tr>
  `).join('');

  els.customerOrdersList.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>${window.i18n.t('invoice_number')}</th>
          <th>${window.i18n.t('date_time')}</th>
          <th>${window.i18n.t('grand_total')}</th>
          <th>${window.i18n.t('branch')}</th>
          <th>${window.i18n.t('cashier')}</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">${window.i18n.t('no_data')}</td></tr>`}
      </tbody>
    </table>
  `;
  els.customerOrdersOverlay.classList.remove('hidden');
}

function openOrderDetail(order) {
  const items = order.items || [];
  const itemsHtml = items
    .map((item) => `<li>${item.name} - ${item.qty} x ${formatNumber(item.price)}</li>`)
    .join('');
  els.detailBody.innerHTML = `
    <p><strong>${window.i18n.t('order_number')}:</strong> ${order.orderNumber || '-'}</p>
    <p><strong>${window.i18n.t('branch')}:</strong> ${getLocalizedName(state.cache.branches?.[order.branchId]) || order.branchName || '-'}</p>
    <p><strong>${window.i18n.t('cashier')}:</strong> ${order.cashierName || '-'}</p>
    <p><strong>${window.i18n.t('total')}:</strong> ${formatNumber(order.total)}</p>
    <p><strong>${window.i18n.t('date')}:</strong> ${formatDate(order.createdAt)}</p>
    <ul>${itemsHtml}</ul>
  `;
  els.detailOverlay.classList.remove('hidden');
}

function renderCustomersSection() {
  const table = document.getElementById('customersTable');
  if (!table) return;
  const customers = state.cache.customers || {};
  const orders = state.cache.orders || {};
  const zones = state.cache.deliveryZones || {};

  const stats = {};
  Object.entries(orders).forEach(([id, order]) => {
    if (!order.customerId) return;
    if (!stats[order.customerId]) {
      stats[order.customerId] = { total: 0, count: 0, first: null, last: null };
    }
    const entry = stats[order.customerId];
    const createdAt = order.createdAt || 0;
    entry.total += Number(order.total || 0);
    entry.count += 1;
    entry.first = entry.first === null ? createdAt : Math.min(entry.first, createdAt);
    entry.last = entry.last === null ? createdAt : Math.max(entry.last, createdAt);
  });

  const zoneFilter = document.getElementById('customerZoneFilter');
  if (zoneFilter) {
    const current = zoneFilter.value || 'all';
    zoneFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = window.i18n.t('all_zones');
    zoneFilter.appendChild(allOption);
    Object.entries(zones).forEach(([id, zone]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = getLocalizedName(zone);
      zoneFilter.appendChild(option);
    });
    zoneFilter.value = current || 'all';
  }

  const entries = Object.entries(customers).map(([id, customer]) => {
    const stat = stats[id] || { total: 0, count: 0, first: null, last: null };
    const avgValue = stat.count ? stat.total / stat.count : 0;
    const avgInterval = stat.count > 1 ? (stat.last - stat.first) / (stat.count - 1) / (1000 * 60 * 60 * 24) : null;
    let level = 'regular';
    if (avgValue >= 20 && (avgInterval !== null && avgInterval <= 2)) {
      level = 'vvip';
    } else if (avgValue >= 10 && (avgInterval !== null && avgInterval <= 3)) {
      level = 'vip';
    }

    if (customer.level !== level) {
      db.ref(`customers/${id}/level`).set(level);
    }

    return {
      id,
      customer,
      lastOrder: stat.last,
      count: stat.count,
      avgValue,
      avgInterval,
      level
    };
  });

  const filtered = entries.filter((entry) => {
    const { customer, level } = entry;
    if (state.customerFilters.zoneId !== 'all' && customer.zoneId !== state.customerFilters.zoneId) {
      return false;
    }
    if (state.customerFilters.level !== 'all' && level !== state.customerFilters.level) {
      return false;
    }
    if (state.customerFilters.blockedOnly && !customer.isBlocked) {
      return false;
    }
    if (state.customerFilters.query) {
      const target = `${getLocalizedName(customer)} ${customer.phone || ''}`.toLowerCase();
      if (!target.includes(state.customerFilters.query)) return false;
    }
    return true;
  });

  table.innerHTML = '';

  if (filtered.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="11">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  filtered.forEach((entry) => {
    const { id, customer, lastOrder, count, avgValue, avgInterval, level } = entry;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="checkbox" data-id="${id}" ${state.selectedCustomers.has(id) ? 'checked' : ''} /></td>
      <td><button class="btn ghost small" data-action="orders">${getLocalizedName(customer)}</button></td>
      <td>${customer.phone || '-'}</td>
      <td>${getLocalizedName(zones[customer.zoneId]) || '-'}</td>
      <td>${lastOrder ? formatDate(lastOrder) : '-'}</td>
      <td>${count}</td>
      <td>${formatNumber(avgValue)}</td>
      <td>${avgInterval === null ? '-' : avgInterval.toFixed(1)}</td>
      <td>${getCustomerLevelLabel(level)}</td>
      <td>${customer.isBlocked ? window.i18n.t('blocked') : window.i18n.t('active')}</td>
      <td>
        <button class="btn ghost small" data-action="toggle">${customer.isBlocked ? window.i18n.t('unblock_customer') : window.i18n.t('block_customer')}</button>
      </td>
    `;
    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedCustomers.add(id);
      } else {
        state.selectedCustomers.delete(id);
      }
    });
    row.querySelector('[data-action="orders"]').addEventListener('click', () => openCustomerOrders(id));
    row.querySelector('[data-action="toggle"]').addEventListener('click', () => {
      if (customer.isBlocked) {
        db.ref(`customers/${id}`).update({ isBlocked: false, blockReason: '' });
      } else {
        const reason = prompt(window.i18n.t('block_reason'));
        if (!reason) return;
        db.ref(`customers/${id}`).update({ isBlocked: true, blockReason: reason });
      }
    });
    table.appendChild(row);
  });

  const selectAll = document.getElementById('selectAllCustomers');
  if (selectAll) {
    selectAll.checked = filtered.every((entry) => state.selectedCustomers.has(entry.id));
  }
}

function toggleSelectAllCustomers(checked) {
  const customers = document.querySelectorAll('#customersTable input[type="checkbox"]');
  customers.forEach((input) => {
    input.checked = checked;
    const id = input.dataset.id;
    if (checked) {
      state.selectedCustomers.add(id);
    } else {
      state.selectedCustomers.delete(id);
    }
  });
}

function exportCustomers() {
  const customers = state.cache.customers || {};
  const orders = state.cache.orders || {};
  const zones = state.cache.deliveryZones || {};
  const entries = Object.entries(customers).map(([id, customer]) => ({ id, customer }));

  const stats = {};
  Object.entries(orders).forEach(([id, order]) => {
    if (!order.customerId) return;
    if (!stats[order.customerId]) {
      stats[order.customerId] = { total: 0, count: 0, first: null, last: null };
    }
    const entry = stats[order.customerId];
    const createdAt = order.createdAt || 0;
    entry.total += Number(order.total || 0);
    entry.count += 1;
    entry.first = entry.first === null ? createdAt : Math.min(entry.first, createdAt);
    entry.last = entry.last === null ? createdAt : Math.max(entry.last, createdAt);
  });

  const filtered = entries.filter((entry) => {
    const { customer } = entry;
    if (state.customerFilters.zoneId !== 'all' && customer.zoneId !== state.customerFilters.zoneId) {
      return false;
    }
    if (state.customerFilters.level !== 'all' && (customer.level || 'regular') !== state.customerFilters.level) {
      return false;
    }
    if (state.customerFilters.blockedOnly && !customer.isBlocked) {
      return false;
    }
    if (state.customerFilters.query) {
      const target = `${getLocalizedName(customer)} ${customer.phone || ''}`.toLowerCase();
      if (!target.includes(state.customerFilters.query)) return false;
    }
    return true;
  });

  const selected = state.selectedCustomers.size
    ? filtered.filter((entry) => state.selectedCustomers.has(entry.id))
    : filtered;

  const rows = selected.map((entry) => {
    const stat = stats[entry.id] || { total: 0, count: 0, first: null, last: null };
    const avgValue = stat.count ? stat.total / stat.count : 0;
    const avgInterval = stat.count > 1 ? (stat.last - stat.first) / (stat.count - 1) / (1000 * 60 * 60 * 24) : null;
    const customer = entry.customer;
    return {
      [window.i18n.t('customer_name')]: getLocalizedName(customer),
      [window.i18n.t('customer_phone')]: customer.phone || '',
      [window.i18n.t('delivery_zone')]: getLocalizedName(zones[customer.zoneId]) || '',
      [window.i18n.t('last_order')]: stat.last ? formatDate(stat.last) : '',
      [window.i18n.t('total_orders_label')]: stat.count || 0,
      [window.i18n.t('avg_order_value')]: avgValue,
      [window.i18n.t('avg_order_interval')]: avgInterval === null ? '' : avgInterval.toFixed(1),
      [window.i18n.t('customer_level')]: getCustomerLevelLabel(customer.level || 'regular'),
      [window.i18n.t('status')]: customer.isBlocked ? window.i18n.t('blocked') : window.i18n.t('active')
    };
  });

  if (rows.length === 0) return;
  exportToExcel(rows, 'customers-report.xlsx');
}

function renderUnitsSection() {
  const table = document.getElementById('unitsTable');
  if (!table) return;
  const units = state.cache.units || {};
  const products = state.cache.products || {};
  const entries = Object.entries(units);
  table.innerHTML = '';
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach(([id, unit]) => {
    const productCount = Object.values(products).filter((product) => product.unitId === id).length;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${unit.nameAr || '-'}</td>
      <td>${unit.nameEn || '-'}</td>
      <td>${productCount}</td>
      <td>
        <button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;
    row.querySelector('[data-action="view"]').addEventListener('click', () => {
      const list = Object.entries(products)
        .filter(([, product]) => product.unitId === id)
        .map(([, product]) => `<li>${getLocalizedName(product)}</li>`)
        .join('');
      els.detailBody.innerHTML = `
        <h4>${getLocalizedName(unit)}</h4>
        <ul>${list || `<li>${window.i18n.t('no_data')}</li>`}</ul>
      `;
      els.detailOverlay.classList.remove('hidden');
    });
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openUnitModal({ id, ...unit }));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`units/${id}`).remove();
      }
    });
    table.appendChild(row);
  });
}

function openUnitModal(unit = null) {
  state.editingUnitId = unit ? unit.id : null;
  if (!els.unitModal) return;
  document.getElementById('unitNameAr').value = unit?.nameAr || '';
  document.getElementById('unitNameEn').value = unit?.nameEn || '';
  els.unitError.textContent = '';
  els.unitModal.classList.remove('hidden');
}

function closeUnitModal() {
  if (!els.unitModal) return;
  els.unitModal.classList.add('hidden');
  state.editingUnitId = null;
}

function saveUnit() {
  const nameAr = document.getElementById('unitNameAr').value.trim();
  const nameEn = document.getElementById('unitNameEn').value.trim();
  if (!nameAr && !nameEn) {
    els.unitError.textContent = window.i18n.t('error');
    return;
  }

  const payload = { nameAr: nameAr || null, nameEn: nameEn || null };
  const request = state.editingUnitId
    ? db.ref(`units/${state.editingUnitId}`).update(payload)
    : db.ref('units').push({ ...payload, createdAt: serverTime });

  request.then(() => {
    closeUnitModal();
  }).catch(() => {
    els.unitError.textContent = window.i18n.t('error');
  });
}

function setupDevicesCashiersSection() {
  const section = document.getElementById('section-devicesCashiers');
  if (!section) return;
  section.innerHTML = `
    <div class="grid two">
      <div class="card">
        <h2>${window.i18n.t('devices_open')}</h2>
        <table class="table">
          <thead>
            <tr>
              <th>${window.i18n.t('device_id')}</th>
              <th>${window.i18n.t('device_label')}</th>
              <th>${window.i18n.t('status')}</th>
              <th>${window.i18n.t('branch')}</th>
              <th>${window.i18n.t('actions')}</th>
            </tr>
          </thead>
          <tbody id="devicesTable"></tbody>
        </table>
      </div>
      <div class="card">
        <h2>${window.i18n.t('cashiers')}</h2>
        <form id="cashierForm" class="grid two">
          <div>
            <label class="tag" for="cashierName">${window.i18n.t('cashier_name')}</label>
            <input id="cashierName" class="input" />
          </div>
          <div>
            <label class="tag" for="cashierCode">${window.i18n.t('cashier_code')}</label>
            <div class="row">
              <input id="cashierCode" class="input" />
              <button id="generateCashierCode" type="button" class="btn ghost small">${window.i18n.t('generate_code')}</button>
            </div>
          </div>
          <div class="row">
            <button type="submit" class="btn primary">${window.i18n.t('add_cashier')}</button>
          </div>
        </form>
        <table class="table" style="margin-top: 12px;">
          <thead>
            <tr>
              <th>${window.i18n.t('cashier_name')}</th>
              <th>${window.i18n.t('cashier_code')}</th>
              <th>${window.i18n.t('actions')}</th>
            </tr>
          </thead>
          <tbody id="cashiersTable"></tbody>
        </table>
      </div>
    </div>
  `;

  const cashierForm = section.querySelector('#cashierForm');
  const cashierName = section.querySelector('#cashierName');
  const cashierCode = section.querySelector('#cashierCode');
  const generateBtn = section.querySelector('#generateCashierCode');

  generateBtn.addEventListener('click', () => {
    cashierCode.value = Math.floor(1000 + Math.random() * 9000).toString();
  });

  cashierForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cashierName.value.trim();
    const code = cashierCode.value.trim();
    if (!name || !code) return;
    const editId = cashierForm.dataset.editId;
    if (editId) {
      db.ref(`cashiers/${editId}`).update({ name, code: String(code) });
      delete cashierForm.dataset.editId;
      cashierForm.querySelector('button[type="submit"]').textContent = window.i18n.t('add_cashier');
    } else {
      db.ref('cashiers').push({ name, code: String(code), active: true });
    }
    cashierName.value = '';
    cashierCode.value = '';
  });

  renderDevicesCashiers();
}

function renderDevicesCashiers() {
  const devicesTable = document.getElementById('devicesTable');
  const cashiersTable = document.getElementById('cashiersTable');
  if (!devicesTable || !cashiersTable) return;

  const devices = state.cache.devices || {};
  const statuses = state.cache.status || {};
  const branches = state.cache.branches || {};

  devicesTable.innerHTML = '';
  const deviceEntries = Object.entries(devices);
  if (deviceEntries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="5">${window.i18n.t('no_data')}</td>`;
    devicesTable.appendChild(row);
  }
  deviceEntries.forEach(([id, device]) => {
    const status = statuses[id];
    const isOnline = status?.online;
    const row = document.createElement('tr');
    const branchSelect = document.createElement('select');
    renderSelectOptions(branchSelect, { type: 'select', optionsPath: 'branches' });
    branchSelect.value = device.branchId || '';
    branchSelect.addEventListener('change', () => {
      const branchId = branchSelect.value || null;
      const branchNameAr = branchId ? branches[branchId]?.nameAr || branches[branchId]?.name : null;
      const branchNameEn = branchId ? branches[branchId]?.nameEn || branches[branchId]?.name : null;
      db.ref(`devices/${id}`).update({ branchId, branchNameAr, branchNameEn });
    });

    const labelInput = document.createElement('input');
    labelInput.className = 'input';
    labelInput.value = device.label || '';
    labelInput.addEventListener('change', () => {
      db.ref(`devices/${id}`).update({ label: labelInput.value });
    });

    const unassignBtn = document.createElement('button');
    unassignBtn.className = 'btn danger small';
    unassignBtn.textContent = window.i18n.t('unassign');
    unassignBtn.addEventListener('click', () => {
      db.ref(`devices/${id}`).update({ branchId: null, branchName: null });
    });

    row.innerHTML = `
      <td>${id.slice(-6)}</td>
      <td></td>
      <td><span class="badge ${isOnline ? 'online' : 'offline'}">${window.i18n.t(isOnline ? 'online' : 'offline')}</span></td>
      <td></td>
      <td></td>
    `;
    row.children[1].appendChild(labelInput);
    row.children[3].appendChild(branchSelect);
    row.children[4].appendChild(unassignBtn);

    devicesTable.appendChild(row);
  });

  cashiersTable.innerHTML = '';
  const cashiers = state.cache.cashiers || {};
  const entries = Object.entries(cashiers);
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="3">${window.i18n.t('no_data')}</td>`;
    cashiersTable.appendChild(row);
    return;
  }

  entries.forEach(([id, cashier]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cashier.name || '-'}</td>
      <td>${cashier.code || '-'}</td>
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      const nameInput = document.getElementById('cashierName');
      const codeInput = document.getElementById('cashierCode');
      nameInput.value = cashier.name || '';
      codeInput.value = cashier.code || '';
      const form = document.getElementById('cashierForm');
      form.dataset.editId = id;
      form.querySelector('button[type="submit"]').textContent = window.i18n.t('update');
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`cashiers/${id}`).remove();
      }
    });

    cashiersTable.appendChild(row);
  });
}

function setupUsersSection() {
  const section = document.getElementById('section-users');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t('users')}</h2>
      <form id="userForm" class="grid two">
        <div>
          <label class="tag" for="userNameInput">${window.i18n.t('user_name')}</label>
          <input id="userNameInput" class="input" />
        </div>
        <div>
          <label class="tag" for="userCodeInput">${window.i18n.t('user_code')}</label>
          <input id="userCodeInput" class="input" />
        </div>
        <div>
          <label class="tag" for="userRoleInput">${window.i18n.t('role')}</label>
          <select id="userRoleInput">
            <option value="manager">${window.i18n.t('role_manager')}</option>
            <option value="cashier">${window.i18n.t('role_cashier')}</option>
            <option value="storekeeper">${window.i18n.t('role_storekeeper')}</option>
          </select>
        </div>
        <div class="row">
          <button type="submit" class="btn primary">${window.i18n.t('add_user')}</button>
        </div>
      </form>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('user_name')}</th>
            <th>${window.i18n.t('role')}</th>
            <th>${window.i18n.t('user_code')}</th>
            <th>${window.i18n.t('actions')}</th>
          </tr>
        </thead>
        <tbody id="usersTable"></tbody>
      </table>
    </div>
  `;

  const userForm = section.querySelector('#userForm');
  const nameInput = section.querySelector('#userNameInput');
  const codeInput = section.querySelector('#userCodeInput');
  const roleInput = section.querySelector('#userRoleInput');

  userForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const code = codeInput.value.trim();
    const role = roleInput.value;
    if (!name || !code) return;

    const editId = userForm.dataset.editId;
    if (editId) {
      db.ref(`users/${editId}`).update({ name, code: String(code), role });
      delete userForm.dataset.editId;
      userForm.querySelector('button[type="submit"]').textContent = window.i18n.t('add_user');
    } else {
      db.ref('users').push({ name, code: String(code), role, active: true });
    }

    nameInput.value = '';
    codeInput.value = '';
  });

  renderUsers();
}

function renderUsers() {
  const table = document.getElementById('usersTable');
  if (!table) return;
  table.innerHTML = '';

  const users = state.cache.users || {};
  const entries = Object.entries(users);
  if (entries.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="4">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  entries.forEach(([id, user]) => {
    const row = document.createElement('tr');
    const roleKey = user.role === 'manager' ? 'role_manager' : user.role === 'cashier' ? 'role_cashier' : 'role_storekeeper';
    row.innerHTML = `
      <td>${user.name || '-'}</td>
      <td>${window.i18n.t(roleKey)}</td>
      <td>${user.code || '-'}</td>
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      const form = document.getElementById('userForm');
      form.dataset.editId = id;
      document.getElementById('userNameInput').value = user.name || '';
      document.getElementById('userCodeInput').value = user.code || '';
      document.getElementById('userRoleInput').value = user.role || 'cashier';
      form.querySelector('button[type="submit"]').textContent = window.i18n.t('update');
    });

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (user.role === 'manager' && entries.length === 1) return;
      if (confirm(window.i18n.t('confirm_delete'))) {
        db.ref(`users/${id}`).remove();
      }
    });

    table.appendChild(row);
  });
}

function watchData() {
  const paths = [
    'orders',
    'customers',
    'products',
    'productCategories',
    'units',
    'itemCards',
    'stockMaterials',
    'materialCategories',
    'storageLocations',
    'stockIssue',
    'production',
    'inventoryCount',
    'receiving',
    'transfers',
    'transferRequests',
    'cashierTransfers',
    'stockReturn',
    'scrapReturn',
    'suppliers',
    'purchases',
    'supplierReturns',
    'purchaseReceipts',
    'pendingStockMoves',
    'warehouseStaff',
    'productionStaff',
    'branches',
    'deliveryZones',
    'deliveryPrices',
    'orderTypes',
    'paymentMethods',
    'cashiers',
    'users',
    'devices',
    'status',
    'discounts',
    'discountUsage'
  ];

  paths.forEach((path) => {
    db.ref(path).on('value', (snap) => {
      state.cache[path] = snap.val() || {};
      renderListSections();
      renderOrders();
      renderDevicesCashiers();
      renderUsers();
      renderPendingStockMoves();
      renderDiscounts();
      renderProductsSection();
      renderProductCategoriesSection();
      renderItemCardSection();
      renderStockMaterialsSection();
      renderMaterialCategoriesSection();
      renderStorageLocationsSection();
      renderIssueSection();
      renderProductionSection();
      renderInventorySection();
      renderReceivingSection();
      renderTransfersSection();
      renderCashierTransferRequestsSection();
      renderStockReturnSection();
      renderScrapReturnSection();
      renderSuppliersSection();
      renderPurchasesSection();
      renderSupplierReturnSection();
      renderCustomersSection();
      renderUnitsSection();
      updateReorderNotice();
    });
  });
}

function renderListSections() {
  listConfigs.forEach((config) => {
    renderListSection(config);
  });
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toFixed(2);
}

function exportToExcel(rows, filename) {
  if (!rows || rows.length === 0) return;
  if (typeof XLSX === 'undefined') return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, filename);
}

init();
