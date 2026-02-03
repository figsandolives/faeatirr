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
    query: ''
  }
};

const listConfigs = [
  {
    sectionId: 'customers',
    path: 'customers',
    titleKey: 'customers',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'phone', labelKey: 'phone', type: 'text' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'phone', 'note']
  },
  {
    sectionId: 'products',
    path: 'products',
    titleKey: 'products',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'price', labelKey: 'price', type: 'number', required: true },
      { key: 'categoryId', labelKey: 'categories', type: 'select', optionsPath: 'productCategories' },
      { key: 'unitId', labelKey: 'units', type: 'select', optionsPath: 'units' },
      { key: 'sku', labelKey: 'sku', type: 'text' },
      { key: 'barcode', labelKey: 'barcode', type: 'text' }
    ],
    columns: [
      { key: 'name' },
      { key: 'price', type: 'number' },
      { key: 'categoryId', labelKey: 'categories', type: 'select', optionsPath: 'productCategories' },
      { key: 'unitId', labelKey: 'units', type: 'select', optionsPath: 'units' },
      { key: 'sku' },
      { key: 'barcode' }
    ]
  },
  {
    sectionId: 'productCategories',
    path: 'productCategories',
    titleKey: 'product_categories',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'units',
    path: 'units',
    titleKey: 'units',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'itemCards',
    path: 'itemCards',
    titleKey: 'item_cards',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'sku', labelKey: 'sku', type: 'text' },
      { key: 'barcode', labelKey: 'barcode', type: 'text' },
      { key: 'cost', labelKey: 'cost', type: 'number' },
      { key: 'price', labelKey: 'price', type: 'number' }
    ],
    columns: ['name', 'sku', 'barcode', { key: 'cost', type: 'number' }, { key: 'price', type: 'number' }]
  },
  {
    sectionId: 'stockMaterials',
    path: 'stockMaterials',
    titleKey: 'stock_materials',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'categoryId', labelKey: 'material_categories', type: 'select', optionsPath: 'materialCategories' },
      { key: 'unitId', labelKey: 'units', type: 'select', optionsPath: 'units' },
      { key: 'stock', labelKey: 'stock', type: 'number' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: [
      { key: 'name' },
      { key: 'categoryId', labelKey: 'material_categories', type: 'select', optionsPath: 'materialCategories' },
      { key: 'unitId', labelKey: 'units', type: 'select', optionsPath: 'units' },
      { key: 'stock', type: 'number' },
      { key: 'note' }
    ]
  },
  {
    sectionId: 'materialCategories',
    path: 'materialCategories',
    titleKey: 'material_categories',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'storageLocations',
    path: 'storageLocations',
    titleKey: 'storage_locations',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'issue',
    path: 'stockIssue',
    titleKey: 'issue',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'production',
    path: 'production',
    titleKey: 'production',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'inventoryCount',
    path: 'inventoryCount',
    titleKey: 'inventory_count',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'receiving',
    path: 'receiving',
    titleKey: 'receiving',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'transfers',
    path: 'transfers',
    titleKey: 'transfers',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'stockReturn',
    path: 'stockReturn',
    titleKey: 'stock_return',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'scrapReturn',
    path: 'scrapReturn',
    titleKey: 'scrap_return',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'suppliers',
    path: 'suppliers',
    titleKey: 'supplier_list',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'phone', labelKey: 'phone', type: 'text' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'phone', 'note']
  },
  {
    sectionId: 'purchase',
    path: 'purchases',
    titleKey: 'purchase',
    fields: [
      { key: 'supplierId', labelKey: 'suppliers', type: 'select', optionsPath: 'suppliers' },
      { key: 'total', labelKey: 'total', type: 'number' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: [
      { key: 'supplierId', labelKey: 'suppliers', type: 'select', optionsPath: 'suppliers' },
      { key: 'total', type: 'number' },
      { key: 'note' }
    ]
  },
  {
    sectionId: 'supplierReturn',
    path: 'supplierReturns',
    titleKey: 'supplier_return',
    fields: [
      { key: 'supplierId', labelKey: 'suppliers', type: 'select', optionsPath: 'suppliers' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: [
      { key: 'supplierId', labelKey: 'suppliers', type: 'select', optionsPath: 'suppliers' },
      { key: 'note' }
    ]
  },
  {
    sectionId: 'pendingStockMoves',
    path: 'pendingStockMoves',
    titleKey: 'pending_stock_moves',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
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
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'phone', labelKey: 'phone', type: 'text' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'phone', 'note']
  },
  {
    sectionId: 'branches',
    path: 'branches',
    titleKey: 'branches',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'address', labelKey: 'address', type: 'text' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'address', 'note']
  },
  {
    sectionId: 'deliveryZones',
    path: 'deliveryZones',
    titleKey: 'delivery_zones',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'deliveryPrices',
    path: 'deliveryPrices',
    titleKey: 'delivery_prices',
    fields: [
      { key: 'zoneId', labelKey: 'delivery_zones', type: 'select', optionsPath: 'deliveryZones' },
      { key: 'price', labelKey: 'price', type: 'number' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: [
      { key: 'zoneId', labelKey: 'delivery_zones', type: 'select', optionsPath: 'deliveryZones' },
      { key: 'price', type: 'number' },
      { key: 'note' }
    ]
  },
  {
    sectionId: 'discounts',
    path: 'discounts',
    titleKey: 'discounts',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'percent', labelKey: 'percent', type: 'number' },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', { key: 'percent', type: 'number' }, 'note']
  },
  {
    sectionId: 'orderTypes',
    path: 'orderTypes',
    titleKey: 'order_types',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  },
  {
    sectionId: 'paymentMethods',
    path: 'paymentMethods',
    titleKey: 'payment_methods',
    fields: [
      { key: 'name', labelKey: 'name', type: 'text', required: true },
      { key: 'note', labelKey: 'note', type: 'text' }
    ],
    columns: ['name', 'note']
  }
];

const sectionGroups = {
  stockMaterials: 'inventory',
  materialCategories: 'inventory',
  storageLocations: 'inventory',
  issue: 'inventory',
  production: 'inventory',
  inventoryCount: 'inventory',
  receiving: 'inventory',
  transfers: 'inventory',
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
  loginOverlay: document.getElementById('loginOverlay'),
  loginCode: document.getElementById('loginCode'),
  loginBtn: document.getElementById('loginBtn'),
  loginError: document.getElementById('loginError'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailBody: document.getElementById('detailBody'),
  detailClose: document.getElementById('detailClose')
};

function init() {
  state.deviceId = getDeviceId();
  initPresence('accounting');
  bindLanguageButtons();
  bindLogin();
  bindNavigation();
  ensureSeedData();
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
}

function handleLogin() {
  const code = els.loginCode.value.trim();
  if (!code) return;

  db.ref('users')
    .orderByChild('code')
    .equalTo(code)
    .once('value')
    .then((snap) => {
      if (!snap.exists()) {
        els.loginError.textContent = window.i18n.t('invalid_code');
        return;
      }

      const userId = Object.keys(snap.val())[0];
      const user = snap.val()[userId];
      state.user = { id: userId, ...user };
      state.role = user.role;
      updateUserBadge();
      applyRoleAccess();
      els.loginOverlay.classList.add('hidden');
      els.loginError.textContent = '';
      selectSection(state.currentSection);
    });
}

function updateUserBadge() {
  els.userName.textContent = state.user?.name || '-';
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
  setupDevicesCashiersSection();
  setupUsersSection();
  initListSections();
  selectSection(state.currentSection);
}

function rebuildSections() {
  setupOrdersSection();
  setupDevicesCashiersSection();
  setupUsersSection();
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
      if (field.type === 'select') {
        return `
          <div>
            <label class="tag" for="${inputId}">${label}</label>
            <select id="${inputId}" name="${field.key}" data-options="${field.optionsPath}"></select>
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

  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t(config.titleKey)}</h2>
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
  if (editId) {
    db.ref(`${config.path}/${editId}`).update(data).then(() => {
      resetListForm(form, cancelBtn);
    });
  } else {
    db.ref(config.path).push(data).then(() => {
      resetListForm(form, cancelBtn);
    });
  }
}

function getFormData(config, form) {
  const payload = {};
  for (const field of config.fields) {
    const input = form.querySelector(`[name="${field.key}"]`);
    if (!input) continue;
    let value = input.value.trim();
    if (field.type === 'number') {
      value = value === '' ? '' : Number(value);
    }
    if (field.required && (value === '' || value === null || value === undefined)) {
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

  config.fields.forEach((field) => {
    if (field.type === 'select') {
      const select = form.querySelector(`[name="${field.key}"]`);
      if (select) {
        const current = select.value;
        renderSelectOptions(select, field.optionsPath);
        select.value = current;
      }
    }
  });

  const data = state.cache[config.path] || {};
  tbody.innerHTML = '';

  const entries = Object.entries(data);
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
        if (col.type === 'number') {
          return `<td>${item[col.key] ?? '-'}</td>`;
        }
        return `<td>${item[col.key] || '-'}</td>`;
      })
      .join('');

    row.innerHTML = `
      ${cells}
      <td>
        <button class="btn ghost small" data-action="edit">${window.i18n.t('edit')}</button>
        <button class="btn danger small" data-action="delete">${window.i18n.t('delete')}</button>
      </td>
    `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      form.dataset.editId = id;
      config.fields.forEach((field) => {
        const input = form.querySelector(`[name="${field.key}"]`);
        if (input) {
          input.value = item[field.key] ?? '';
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

    tbody.appendChild(row);
  });
}

function renderSelectOptions(select, optionsPath) {
  const data = state.cache[optionsPath] || {};
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = window.i18n.t('select');
  select.appendChild(placeholder);

  Object.entries(data).forEach(([id, item]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = item.name || id;
    select.appendChild(option);
  });
}

function getOptionLabel(optionsPath, id) {
  if (!id) return '-';
  const data = state.cache[optionsPath] || {};
  return data[id]?.name || id;
}

function setupOrdersSection() {
  const section = document.getElementById('section-orders');
  if (!section) return;
  section.innerHTML = `
    <div class="card">
      <h2>${window.i18n.t('orders')}</h2>
      <div class="row" style="margin-top: 12px;">
        <select id="orderBranchFilter"></select>
        <input id="orderSearch" class="input" style="max-width: 240px;" placeholder="${window.i18n.t('search_orders')}" />
      </div>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>${window.i18n.t('order_number')}</th>
            <th>${window.i18n.t('date')}</th>
            <th>${window.i18n.t('branch')}</th>
            <th>${window.i18n.t('cashier')}</th>
            <th>${window.i18n.t('total')}</th>
            <th>${window.i18n.t('order_status')}</th>
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

  section.querySelector('#orderSearch').addEventListener('input', (e) => {
    state.orderFilters.query = e.target.value.trim().toLowerCase();
    renderOrders();
  });

  renderOrders();
}

function renderOrders() {
  const table = document.getElementById('ordersTable');
  if (!table) return;
  const orders = state.cache.orders || {};
  const branches = state.cache.branches || {};
  const filterSelect = document.getElementById('orderBranchFilter');

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
      option.textContent = branch.name;
      filterSelect.appendChild(option);
    });
    filterSelect.value = current;
  }

  const entries = Object.entries(orders)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const filtered = entries.filter((order) => {
    if (state.orderFilters.branchId !== 'all' && order.branchId !== state.orderFilters.branchId) {
      return false;
    }
    if (state.orderFilters.query) {
      const target = `${order.orderNumber || ''} ${order.cashierName || ''} ${order.branchName || ''}`.toLowerCase();
      if (!target.includes(state.orderFilters.query)) {
        return false;
      }
    }
    return true;
  });

  table.innerHTML = '';

  if (filtered.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7">${window.i18n.t('no_data')}</td>`;
    table.appendChild(row);
    return;
  }

  filtered.forEach((order) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${order.orderNumber || '-'}</td>
      <td>${formatDate(order.createdAt)}</td>
      <td>${order.branchName || '-'}</td>
      <td>${order.cashierName || '-'}</td>
      <td>${formatNumber(order.total)}</td>
      <td>${window.i18n.t(order.status === 'paid' ? 'paid' : 'pending')}</td>
      <td><button class="btn ghost small" data-action="view">${window.i18n.t('view')}</button></td>
    `;
    row.querySelector('[data-action="view"]').addEventListener('click', () => openOrderDetail(order));
    table.appendChild(row);
  });
}

function openOrderDetail(order) {
  const items = order.items || [];
  const itemsHtml = items
    .map((item) => `<li>${item.name} - ${item.qty} x ${formatNumber(item.price)}</li>`)
    .join('');
  els.detailBody.innerHTML = `
    <p><strong>${window.i18n.t('order_number')}:</strong> ${order.orderNumber || '-'}</p>
    <p><strong>${window.i18n.t('branch')}:</strong> ${order.branchName || '-'}</p>
    <p><strong>${window.i18n.t('cashier')}:</strong> ${order.cashierName || '-'}</p>
    <p><strong>${window.i18n.t('total')}:</strong> ${formatNumber(order.total)}</p>
    <p><strong>${window.i18n.t('date')}:</strong> ${formatDate(order.createdAt)}</p>
    <ul>${itemsHtml}</ul>
  `;
  els.detailOverlay.classList.remove('hidden');
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
      db.ref(`cashiers/${editId}`).update({ name, code });
      delete cashierForm.dataset.editId;
      cashierForm.querySelector('button[type="submit"]').textContent = window.i18n.t('add_cashier');
    } else {
      db.ref('cashiers').push({ name, code, active: true });
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
    renderSelectOptions(branchSelect, 'branches');
    branchSelect.value = device.branchId || '';
    branchSelect.addEventListener('change', () => {
      const branchId = branchSelect.value || null;
      const branchName = branchId ? branches[branchId]?.name : null;
      db.ref(`devices/${id}`).update({ branchId, branchName });
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
      db.ref(`users/${editId}`).update({ name, code, role });
      delete userForm.dataset.editId;
      userForm.querySelector('button[type="submit"]').textContent = window.i18n.t('add_user');
    } else {
      db.ref('users').push({ name, code, role, active: true });
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
    'stockReturn',
    'scrapReturn',
    'suppliers',
    'purchases',
    'supplierReturns',
    'pendingStockMoves',
    'warehouseStaff',
    'productionStaff',
    'branches',
    'deliveryZones',
    'deliveryPrices',
    'discounts',
    'orderTypes',
    'paymentMethods',
    'cashiers',
    'users',
    'devices',
    'status'
  ];

  paths.forEach((path) => {
    db.ref(path).on('value', (snap) => {
      state.cache[path] = snap.val() || {};
      renderListSections();
      renderOrders();
      renderDevicesCashiers();
      renderUsers();
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

init();
