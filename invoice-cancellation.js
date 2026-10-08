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
    const original = (await db.ref(`orders/${id}`).once('value')).val();
    if (original?.stockDeducted && original.stockMovements) {
      if (isCancelled(original)) throw new Error('الفاتورة ملغية بالفعل');
      for (let attempt = 0; attempt < 16; attempt++) {
        const currentOrder = (await db.ref(`orders/${id}`).once('value')).val();
        if (!currentOrder || isCancelled(currentOrder)) throw new Error('الفاتورة ملغية بالفعل أو غير موجودة');
        const at = Date.now();
        const cancelledOrder = { ...currentOrder, status: 'cancelled', isCancelled: true, cancelledAt: at,
          cancelledByName: name, cancelledById: actor.id || actor.code || '', cancelledByCode: actor.code || '', updatedAt: at, stockRestored: true };
        const updates = { [`orders/${id}`]: cancelledOrder };
        for (const [productId, move] of Object.entries(currentOrder.stockMovements)) {
          const path = `products/${productId}/stockByBranch/${move.branchId}`;
          const before = Number((await db.ref(path).once('value')).val() || 0);
          const after = Number((before + move.quantity).toFixed(6));
          updates[path] = after;
          updates[`invoiceStockCancellations/${id}/${productId}`] = { branchId: move.branchId, before, after, quantity: move.quantity };
        }
        try { await db.ref().update(updates); return cancelledOrder; }
        catch (error) {
          const winner = (await db.ref(`orders/${id}`).once('value')).val();
          if (isCancelled(winner)) return winner;
          if (attempt === 15) throw error;
        }
      }
    }
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
