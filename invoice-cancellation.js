// Keep cancelled invoices and their first cancellation actor permanently in the ledger.
window.InvoiceCancellation = (() => {
  const isCancelled = order => order?.status === 'cancelled' || order?.isCancelled === true;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function description(order) {
    if (!isCancelled(order)) return '';
    const date = order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('ar-KW', {timeZone: 'Asia/Kuwait'}) : '';
    return `ملغية — ألغيت بواسطة: ${order.cancelledByName || 'غير معروف'}${date ? ` — ${date}` : ''}`;
  }
  function badge(order) {
    return isCancelled(order) ? `<div style="color:#b91c1c;font-weight:bold;font-size:12px;white-space:normal">${escape(description(order))}</div>` : '';
  }
  async function cancel(db, id, actor) {
    const name = actor?.name || actor?.fullName || actor?.username;
    if (!name) throw new Error('يجب تسجيل الدخول بحساب شخصي لإلغاء الفاتورة');
    const at = Date.now();
    const result = await db.ref(`orders/${id}`).transaction(order => {
      if (!order || isCancelled(order)) return;
      return {...order, status: 'cancelled', isCancelled: true, cancelledAt: at,
        cancelledByName: name, cancelledById: actor.id || actor.code || '',
        cancelledByCode: actor.code || '', updatedAt: at};
    });
    if (!result.committed) throw new Error('الفاتورة ملغية بالفعل أو غير موجودة');
    return result.snapshot.val();
  }
  async function edit(db, id, updates) {
    const result = await db.ref(`orders/${id}`).transaction(order => {
      if (!order || isCancelled(order)) return;
      return {...order, ...updates};
    });
    if (!result.committed) throw new Error('لا يمكن تعديل فاتورة ملغية أو غير موجودة');
    return result.snapshot.val();
  }
  const activeEntries = orders => Object.fromEntries(Object.entries(orders || {}).filter(([,order]) => !isCancelled(order)));
  return {isCancelled, description, badge, cancel, edit, activeEntries};
})();
