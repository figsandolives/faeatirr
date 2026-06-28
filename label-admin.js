(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyAZ4-dUBSKsHP3sTqRE8G9c2AjeclTlIik",
    authDomain: "fawatir-f5a13.firebaseapp.com",
    databaseURL: "https://fawatir-f5a13-default-rtdb.firebaseio.com",
    projectId: "fawatir-f5a13",
    storageBucket: "fawatir-f5a13.firebasestorage.app",
    messagingSenderId: "334207827614",
    appId: "1:334207827614:web:3c053434b04c1dd3ea858f",
    measurementId: "G-W42ECQR0LW"
  };

  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const db = firebase.database(app);
  const root = document.getElementById('labelAdmin');
  const state = {
    products: {},
    categories: {},
    config: {},
    activeKey: 'hummus',
    query: '',
    loading: true
  };

  const sections = [
    { key: 'hummus', title: 'الحمص', label: 'hummus', categoryRoots: ['المواعين', 'مواعين', 'mawaeen', 'bowls'], match: ['hummus', 'chickpea', 'حمص'] },
    { key: 'foul', title: 'الفول', label: 'foul', categoryRoots: ['المواعين', 'مواعين', 'mawaeen', 'bowls'], match: ['foul', 'fool', 'ful', 'fava', 'فول'] },
    { key: 'mutabbal', title: 'المتبل', label: 'mutabbal', categoryRoots: ['المواعين', 'مواعين', 'mawaeen', 'bowls'], match: ['mutabbal', 'moutabal', 'eggplant dip', 'متبل'] },
    { key: 'dairy:laban', title: 'الألبان / لبن', label: 'laban', categoryRoots: ['الالبان', 'الألبان', 'البان', 'dairy'], match: ['laban', 'لبن'] },
    { key: 'dairy:labnah', title: 'الألبان / لبنة', label: 'labnah', categoryRoots: ['الالبان', 'الألبان', 'البان', 'dairy'], match: ['labnah', 'لبنة'] },
    { key: 'dairy:roba', title: 'الألبان / روبه', label: 'roba', categoryRoots: ['الالبان', 'الألبان', 'البان', 'dairy'], match: ['roba', 'روبة', 'روب'] },
    { key: 'dairy:masl-laban', title: 'الألبان / مصل لبن', label: 'masl laban', categoryRoots: ['الالبان', 'الألبان', 'البان', 'dairy'], match: ['masl laban', 'masel laban', 'مصل'] },
    { key: 'dairy:nabulsi-cheese', title: 'الألبان / جبن نابلسي', label: 'nabulsi cheese', categoryRoots: ['الالبان', 'الألبان', 'البان', 'dairy'], match: ['nabulsi', 'نابلس'] },
    { key: 'ferments', title: 'المخمرات', label: 'ferments', categoryRoots: ['المخمرات', 'مخمرات', 'ferments'], match: ['ferment', 'مخمر', 'المخمرات'] },
    { key: 'zaytoon', title: 'الزيتون', label: 'zaytoon', categoryRoots: ['زيتون فلسطيني', 'زيتون فلسطينى', 'منتجات زيتونة', 'زيتون', 'olives'], match: ['zaytoon', 'olive', 'olives', 'زيتون'] },
    { key: 'baraim', title: 'البراعم', label: 'baraim', categoryRoots: ['البراعم', 'براعم', 'sprouts'], match: ['baraim', 'sprout', 'براعم', 'مبرعم'] }
  ];

  const excludedProductMatchers = [
    'شيبس', 'chips', 'صينية', 'صنيه', 'صواني', 'صوانى', 'tray',
    'فطاير', 'فطائر', 'فطيره', 'فطيرة', 'pie', 'كرواسون', 'croissant',
    'سويت', 'sweet', 'بيض', 'egg', 'سلة', 'سله', 'basket', 'درزن',
    'dozen', 'نصف درزن', 'ربطة خبز', 'خبز هدية', 'باكج', 'package',
    'pack', 'زيت زيتون', 'olive oil'
  ];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function categoryPathText(categoryId) {
    const names = [];
    let id = categoryId || '';
    let guard = 0;
    while (id && state.categories[id] && guard < 8) {
      const category = state.categories[id];
      names.push(category.nameAr || category.nameEn || category.name || '');
      id = category.parentId || '';
      guard += 1;
    }
    return names.join(' / ');
  }

  function productText(product, categoryPath) {
    return normalize([product.nameAr, product.nameEn, product.name, product.code, product.barcode, categoryPath].join(' '));
  }

  function matchesAny(text, matchers) {
    return matchers.some((matcher) => text.includes(normalize(matcher)));
  }

  function getCategoryIdsByName(rootMatchers) {
    const roots = Object.entries(state.categories)
      .filter(([, category]) => {
        const name = normalize(`${category.nameAr || ''} ${category.nameEn || ''} ${category.name || ''}`);
        return rootMatchers.some((matcher) => name.includes(normalize(matcher)));
      })
      .map(([id]) => id);
    const ids = new Set(roots);
    let changed = true;
    while (changed) {
      changed = false;
      Object.entries(state.categories).forEach(([id, category]) => {
        if (category.parentId && ids.has(category.parentId) && !ids.has(id)) {
          ids.add(id);
          changed = true;
        }
      });
    }
    return ids;
  }

  function isExcludedProduct(product) {
    const text = normalize([product.nameAr, product.nameEn, product.name, product.categoryPath].join(' '));
    if (/[0-9٠-٩]/.test(text)) return true;
    return excludedProductMatchers.some((matcher) => text.includes(normalize(matcher)));
  }

  function getBaseProducts(section) {
    const allowedIds = getCategoryIdsByName(section.categoryRoots || []);
    return Object.entries(state.products)
      .map(([id, product]) => {
        const categoryPath = categoryPathText(product.categoryId);
        return { id, ...product, categoryPath, text: productText(product, categoryPath) };
      })
      .filter((product) => allowedIds.size === 0 || allowedIds.has(product.categoryId))
      .filter((product) => !isExcludedProduct(product))
      .filter((product) => matchesAny(product.text, section.match || []));
  }

  function getVisibleProducts(section) {
    const sectionConfig = state.config.sections?.[section.key] || {};
    const hiddenIds = new Set(Object.keys(sectionConfig.hidden || {}).filter((id) => sectionConfig.hidden[id]));
    const extraIds = Object.keys(sectionConfig.extra || {}).filter((id) => sectionConfig.extra[id]);
    const byId = new Map(getBaseProducts(section).map((product) => [product.id, product]));
    extraIds.forEach((id) => {
      if (hiddenIds.has(id) || byId.has(id) || !state.products[id]) return;
      const product = state.products[id];
      const categoryPath = categoryPathText(product.categoryId);
      byId.set(id, { id, ...product, categoryPath, text: productText(product, categoryPath) });
    });
    const orderedIds = sectionConfig.order || [];
    const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));
    return Array.from(byId.values())
      .filter((product) => !hiddenIds.has(product.id))
      .sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return (a.nameAr || a.nameEn || '').localeCompare(b.nameAr || b.nameEn || '', 'ar');
      });
  }

  function getProductNameAr(product) {
    return product.nameAr || product.nameEn || product.name || 'بدون اسم';
  }

  function getProductNameEn(product) {
    return product.nameEn || product.name || '';
  }

  function render() {
    if (state.loading) return;
    const active = sections.find((section) => section.key === state.activeKey) || sections[0];
    const products = getVisibleProducts(active);
    root.innerHTML = `
      <header class="admin-header">
        <div>
          <h1>إدارة أصناف الستيكرات</h1>
          <p>الأسماء هنا بالعربي للتعديل، والتطبيق سيعرضها بالإنجليزي عند الطباعة.</p>
        </div>
        <a class="ghost-btn" href="label-app.html">فتح تطبيق الطباعة</a>
      </header>
      <div class="layout">
        <aside class="panel sections-panel">
          ${sections.map((section) => `
            <button class="section-btn ${section.key === active.key ? 'active' : ''}" data-section="${section.key}" type="button">
              ${escapeHtml(section.title)}
              <small>${getVisibleProducts(section).length} صنف</small>
            </button>
          `).join('')}
        </aside>
        <section class="panel work-panel">
          <div class="work-head">
            <div>
              <h2>${escapeHtml(active.title)}</h2>
              <p>اسحب الصنف للأعلى أو الأسفل لتغيير ترتيبه في التطبيق.</p>
            </div>
            <button class="ghost-btn" type="button" data-action="reset">إلغاء الترتيب اليدوي</button>
          </div>
          <div id="productList" class="product-list">
            ${products.length ? products.map((product) => renderProductRow(product)).join('') : '<div class="empty">لا توجد أصناف ظاهرة في هذا القسم.</div>'}
          </div>
          <div class="add-panel">
            <h3>إضافة صنف لهذا القسم</h3>
            <div class="search-row">
              <input id="productSearch" value="${escapeHtml(state.query)}" placeholder="ابحث باسم المنتج العربي أو الإنجليزي" />
              <button class="primary-btn" type="button" data-action="search">بحث</button>
            </div>
            <div id="searchResults" class="search-results">${renderCandidates(active, products)}</div>
          </div>
        </section>
      </div>
    `;
    bindEvents(active);
  }

  function renderProductRow(product) {
    return `
      <article class="product-row" draggable="true" data-product-id="${product.id}">
        <button class="drag-handle" type="button" title="اسحب للترتيب">☰</button>
        <div>
          <span class="product-name-ar">${escapeHtml(getProductNameAr(product))}</span>
          ${getProductNameEn(product) ? `<span class="product-name-en">${escapeHtml(getProductNameEn(product))}</span>` : ''}
          <span class="product-name-en">${escapeHtml(product.categoryPath || '')}</span>
        </div>
        <button class="danger-btn" type="button" data-remove="${product.id}">حذف من التطبيق</button>
      </article>
    `;
  }

  function renderCandidates(section, visibleProducts) {
    const query = normalize(state.query);
    if (!query) return '<div class="helper">اكتب اسم المنتج لعرض النتائج.</div>';
    const visibleIds = new Set(visibleProducts.map((product) => product.id));
    const rows = Object.entries(state.products)
      .map(([id, product]) => {
        const categoryPath = categoryPathText(product.categoryId);
        return { id, ...product, categoryPath, text: productText(product, categoryPath) };
      })
      .filter((product) => !visibleIds.has(product.id))
      .filter((product) => product.text.includes(query))
      .sort((a, b) => (a.nameAr || a.nameEn || '').localeCompare(b.nameAr || b.nameEn || '', 'ar'))
      .slice(0, 40);
    if (!rows.length) return '<div class="empty">لا توجد نتائج.</div>';
    return rows.map((product) => `
      <article class="candidate-row">
        <div>
          <span class="product-name-ar">${escapeHtml(getProductNameAr(product))}</span>
          ${getProductNameEn(product) ? `<span class="product-name-en">${escapeHtml(getProductNameEn(product))}</span>` : ''}
          <span class="product-name-en">${escapeHtml(product.categoryPath || '')}</span>
        </div>
        <button class="primary-btn" type="button" data-add="${product.id}">إضافة</button>
      </article>
    `).join('');
  }

  function bindEvents(section) {
    root.querySelectorAll('[data-section]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeKey = button.dataset.section;
        state.query = '';
        render();
      });
    });
    root.querySelector('#productSearch')?.addEventListener('input', (event) => {
      state.query = event.target.value || '';
      const active = sections.find((item) => item.key === state.activeKey) || sections[0];
      const products = getVisibleProducts(active);
      const results = document.getElementById('searchResults');
      if (results) results.innerHTML = renderCandidates(active, products);
      bindCandidateButtons(active);
    });
    root.querySelector('[data-action="search"]')?.addEventListener('click', () => {
      const input = document.getElementById('productSearch');
      state.query = input?.value || '';
      render();
    });
    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => resetOrder(section));
    root.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', () => hideProduct(section, button.dataset.remove));
    });
    bindCandidateButtons(section);
    bindDragSorting(section);
  }

  function bindCandidateButtons(section) {
    root.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => addProduct(section, button.dataset.add));
    });
  }

  async function saveOrder(section) {
    const ids = Array.from(document.querySelectorAll('#productList [data-product-id]')).map((row) => row.dataset.productId);
    await db.ref(`labelPrinterConfig/sections/${section.key}/order`).set(ids);
    toast('تم حفظ الترتيب');
  }

  async function hideProduct(section, productId) {
    if (!productId) return;
    const updates = {};
    updates[`labelPrinterConfig/sections/${section.key}/hidden/${productId}`] = true;
    const currentOrder = state.config.sections?.[section.key]?.order || [];
    updates[`labelPrinterConfig/sections/${section.key}/order`] = currentOrder.filter((id) => id !== productId);
    await db.ref().update(updates);
    toast('تم حذف الصنف من التطبيق');
  }

  async function addProduct(section, productId) {
    if (!productId) return;
    const products = getVisibleProducts(section);
    const order = products.map((product) => product.id).filter((id) => id !== productId);
    order.push(productId);
    const updates = {};
    updates[`labelPrinterConfig/sections/${section.key}/extra/${productId}`] = true;
    updates[`labelPrinterConfig/sections/${section.key}/hidden/${productId}`] = null;
    updates[`labelPrinterConfig/sections/${section.key}/order`] = order;
    await db.ref().update(updates);
    state.query = '';
    toast('تمت إضافة الصنف');
  }

  async function resetOrder(section) {
    await db.ref(`labelPrinterConfig/sections/${section.key}/order`).remove();
    toast('تم إلغاء الترتيب اليدوي');
  }

  function bindDragSorting(section) {
    const list = document.getElementById('productList');
    if (!list) return;
    let dragged = null;
    list.querySelectorAll('.product-row').forEach((row) => {
      row.addEventListener('dragstart', () => {
        dragged = row;
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        dragged = null;
        saveOrder(section);
      });
      row.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!dragged || dragged === row) return;
        const rect = row.getBoundingClientRect();
        const after = event.clientY > rect.top + rect.height / 2;
        list.insertBefore(dragged, after ? row.nextSibling : row);
      });
    });
  }

  function toast(message) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  function init() {
    const paths = [
      ['products', 'products'],
      ['productCategories', 'categories'],
      ['labelPrinterConfig', 'config']
    ];
    let seen = 0;
    paths.forEach(([path, key]) => {
      db.ref(path).on('value', (snapshot) => {
        state[key] = snapshot.val() || {};
        seen += 1;
        state.loading = seen < paths.length;
        render();
      });
    });
  }

  init();
})();
