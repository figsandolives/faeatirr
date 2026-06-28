(function () {
  const REQUEST_PATH = 'labelPrintRequests';
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
  const root = document.getElementById('printOrdersApp');
  const state = {
    requests: {},
    loading: true,
    busyId: ''
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(value) {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleString('ar-KW');
    } catch (_) {
      return '-';
    }
  }

  function pendingRequests() {
    return Object.entries(state.requests || {})
      .filter(([, request]) => request.status === 'pending')
      .sort((a, b) => Number(a[1].createdAt || 0) - Number(b[1].createdAt || 0));
  }

  function requestItems(request) {
    return Array.isArray(request.items) ? request.items : Object.values(request.items || {});
  }

  function render() {
    const rows = pendingRequests();
    root.innerHTML = `
      <header class="orders-header">
        <div>
          <h1>أوامر طباعة</h1>
          <p>أي طلب مرسل من الهاتف يظهر هنا. اضغط قبول للطباعة أو رفض لإلغائه.</p>
        </div>
        <a class="ghost-btn" href="index.html">الرجوع للرئيسية</a>
      </header>
      <section class="orders-list">
        ${rows.length ? rows.map(([id, request]) => renderRequest(id, request)).join('') : '<div class="empty">لا توجد أوامر طباعة حالياً.</div>'}
      </section>
    `;
    root.querySelectorAll('[data-accept]').forEach((button) => {
      button.addEventListener('click', () => acceptRequest(button.dataset.accept));
    });
    root.querySelectorAll('[data-reject]').forEach((button) => {
      button.addEventListener('click', () => rejectRequest(button.dataset.reject));
    });
  }

  function renderRequest(id, request) {
    const items = requestItems(request);
    const total = items.reduce((sum, item) => sum + (Number(item.quantity || 1) || 1), 0);
    return `
      <article class="order-card">
        <div class="order-head">
          <div>
            <div class="order-title">طلب طباعة ${items.length} صنف</div>
            <div class="helper">عدد الستيكرات: ${total} | وقت الطلب: ${escapeHtml(formatTime(request.createdAt))}</div>
          </div>
          <div class="helper" dir="ltr">${escapeHtml(id)}</div>
        </div>
        <div class="items">
          ${items.map((item) => `
            <div class="item-row">
              <strong>${escapeHtml(item.nameAr || item.latinName || item.nameEn || 'صنف')}</strong>
              <span>${escapeHtml(item.nameEn || '')}</span>
              <span>${escapeHtml(item.productionDate || '-')} إلى ${escapeHtml(item.expiryDate || '-')} | ${Number(item.quantity || 1)} ستيكر</span>
            </div>
          `).join('')}
        </div>
        <div class="actions">
          <button class="reject-btn" type="button" data-reject="${id}" ${state.busyId === id ? 'disabled' : ''}>رفض</button>
          <button class="accept-btn" type="button" data-accept="${id}" ${state.busyId === id ? 'disabled' : ''}>قبول وطباعة</button>
        </div>
      </article>
    `;
  }

  async function acceptRequest(id) {
    const request = state.requests[id];
    if (!request || request.status !== 'pending') return;
    if (!window.labelPrintBridge?.printRequest) {
      toast('افتح هذه الصفحة من تطبيق الكمبيوتر حتى تعمل الطباعة.', true);
      return;
    }
    state.busyId = id;
    render();
    try {
      await db.ref(`${REQUEST_PATH}/${id}`).update({
        status: 'printing',
        acceptedAt: firebase.database.ServerValue.TIMESTAMP,
        acceptedByDeviceId: localStorage.getItem('deviceId') || ''
      });
      await window.labelPrintBridge.printRequest(id, request);
      toast('تمت الطباعة');
    } catch (error) {
      console.error(error);
      await db.ref(`${REQUEST_PATH}/${id}`).update({
        status: 'failed',
        error: error?.message || String(error || 'تعذرت الطباعة'),
        failedAt: firebase.database.ServerValue.TIMESTAMP
      });
      toast('تعذرت الطباعة: ' + (error?.message || error), true);
    } finally {
      state.busyId = '';
    }
  }

  async function rejectRequest(id) {
    const request = state.requests[id];
    if (!request || request.status !== 'pending') return;
    await db.ref(`${REQUEST_PATH}/${id}`).update({
      status: 'rejected',
      rejectedAt: firebase.database.ServerValue.TIMESTAMP,
      rejectedByDeviceId: localStorage.getItem('deviceId') || ''
    });
    toast('تم رفض الطلب');
  }

  function toast(message, isError) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = `toast${isError ? ' error' : ''}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  db.ref(REQUEST_PATH).on('value', (snapshot) => {
    state.requests = snapshot.val() || {};
    state.loading = false;
    render();
  });
})();
