// Number, invoice and assignment are committed together. Rules check the read
// versions so simultaneous cashiers cannot both commit the same next number.
window.InvoiceSave = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const cancelled = order => order?.status === 'cancelled' || order?.isCancelled === true;
  const number = value => Number(value) || 0;
  const padding = branch => branch === 'اليرموك' ? 4 : branch === 'أبو الحصانية' ? 5 : branch === 'المخزن الرئيسي' ? 6 : 3;
  const get = async (db, path) => (await db.ref(path).once('value')).val();

  function prepare(order, id, draft) {
    if (!id || /[.#$\[\]/]/.test(id)) throw new Error('معرّف محاولة البيع غير صالح');
    if (!order?.branch || !order?.cashier || !Array.isArray(order.items) || !order.items.length) throw new Error('بيانات الفاتورة غير مكتملة');
    if (!Number.isFinite(order.total) || order.total < 0 || order.items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.total) || item.total < 0)) throw new Error('مبالغ أو كميات الفاتورة غير صالحة');
    return clone({id, order, draft, preparedAt: Date.now()});
  }

  function pendingKey(branch, cashierCode) {
    return `invoiceSavePendingV3:${encodeURIComponent(branch)}:${encodeURIComponent(cashierCode)}`;
  }
  function remember(storage, key, pending) {
    // One durable record per attempt also survives simultaneous browser tabs.
    // Failing durable storage stops the save before consuming a number.
    storage.setItem(`${key}:${pending.id}`, JSON.stringify(pending));
  }
  function recall(storage, key, id = '') {
    const records = [];
    if (id) {
      const raw = storage.getItem(`${key}:${id}`);
      if (raw) records.push(raw);
    } else {
      for (let i = 0; i < storage.length; i++) {
        const itemKey = storage.key(i);
        if (itemKey?.startsWith(`${key}:`)) records.push(storage.getItem(itemKey));
      }
    }
    const attempts = records.map(raw => {
      const pending = JSON.parse(raw);
      if (!pending?.id || !pending.order?.branch || !pending.draft) throw new Error('تعذر قراءة محاولة البيع المحفوظة؛ لا تبدأ فاتورة بديلة قبل التحقق منها');
      return pending;
    });
    return attempts.sort((a, b) => a.preparedAt - b.preparedAt)[0] || null;
  }
  function forget(storage, key, id) {
    storage.removeItem(`${key}:${id}`);
  }

  async function log(db, id, order, event, error = '') {
    try {
      await db.ref(`invoiceSaveAttempts/${id}/events`).push().set({
        event, timestamp: Date.now(), branch: order.branch || '',
        cashier: order.cashier || '', cashierCode: order.cashierCode || '',
        error: String(error).slice(0, 500)
      });
    } catch (_) { /* An audit outage must not turn a committed sale into failure. */ }
  }

  async function state(db, branch, id) {
    const key = encodeURIComponent(branch);
    const paths = [`invoiceCounters/${key}`, `invoiceSequenceV2/${key}/counter`,
      `invoiceSequenceV2/${branch}/counter`, `invoiceSequenceV2/${key}/assignments/${id}`,
      `invoiceSequenceV2/${branch}/assignments/${id}`];
    const values = await Promise.all(paths.map(path => get(db, path)));
    return {key, counter: number(values[0]), sequence: number(values[1]), rawSequence: number(values[2]), assignment: number(values[3]) || number(values[4])};
  }

  async function commit(db, pending, {normalize = false, maxRetries = 32} = {}) {
    const id = pending.id;
    const payload = clone(pending.order);
    if (!id || !payload.branch) throw new Error('بيانات محاولة البيع غير مكتملة');
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const existing = await get(db, `orders/${id}`);
      if (existing && !normalize) {
        if (existing.branch !== payload.branch || existing.cashierCode !== payload.cashierCode || !existing.invoiceNumber) throw new Error('معرّف محاولة البيع مرتبط بفاتورة أخرى؛ يلزم مراجعتها');
        // Never overwrite or resurrect an invoice on retry, even after cancellation.
        return existing;
      }
      if (normalize && (!existing || cancelled(existing))) throw new Error('لا يمكن ترقيم فاتورة ملغية أو غير موجودة');
      const before = await state(db, payload.branch, id);
      if (normalize && before.assignment && Number(existing.invoiceNumber) === before.assignment) return existing;
      if (before.assignment) {
        // A legacy reservation already exists. Reuse it without moving the counter.
        const saved = {...(existing || payload), id, invoiceNumber: String(before.assignment).padStart(padding(payload.branch), '0'), invoiceSequenceVersion: 'v2'};
        const result = await db.ref(`orders/${id}`).transaction(current => {
          if (cancelled(current)) return;
          if (current && !normalize) return;
          return current ? {...current, invoiceNumber: saved.invoiceNumber, invoiceSequenceVersion: 'v2'} : saved;
        });
        if (result.committed) return result.snapshot.val();
        const winner = await get(db, `orders/${id}`);
        if (winner && !normalize) return winner;
        throw new Error('تعذر استكمال الرقم المحجوز');
      }
      const allocated = Math.max(before.counter, before.sequence, before.rawSequence) + 1;
      const saved = {...(normalize ? existing : payload), id,
        invoiceNumber: String(allocated).padStart(padding(payload.branch), '0'),
        invoiceSequenceVersion: 'v3-atomic', invoiceAllocationNumber: allocated,
        invoiceBranchKey: before.key, invoiceCommittedAt: Date.now()};
      if (normalize) {
        saved.invoiceNumberBeforeNormalization = String(existing.invoiceNumber || '');
        saved.invoiceNumberNormalizedAt = Date.now();
      }
      const updates = {
        [`orders/${id}`]: saved,
        [`invoiceCounters/${before.key}`]: allocated,
        [`invoiceSequenceV2/${before.key}/counter`]: allocated,
        [`invoiceSequenceV2/${before.key}/assignments/${id}`]: allocated,
        [`invoiceSequenceV2/${before.key}/updatedAt`]: Date.now(),
        [`invoiceCommits/${before.key}`]: {orderId: id, number: allocated,
          baseCounter: before.counter, baseSequence: before.sequence,
          baseRawSequence: before.rawSequence, branch: payload.branch,
          mode: normalize ? 'normalize' : 'create', timestamp: Date.now()}
      };
      // Carry the durable local history into the successful atomic write too,
      // including failures recorded before an offline browser was restarted.
      const audit = (event, timestamp, error = '') => ({event, timestamp,
        branch: payload.branch || '', cashier: payload.cashier || '',
        cashierCode: payload.cashierCode || '', error: String(error).slice(0, 500)});
      (pending.history || []).slice(-30).forEach((event, index) => {
        updates[`invoiceSaveAttempts/${id}/events/local_${event.timestamp}_${index}`] = audit(event.event, event.timestamp, event.error);
      });
      updates[`invoiceSaveAttempts/${id}/events/committed`] = audit('confirmed', Date.now());
      // Close a table in the same commit, so a cleanup failure cannot leave
      // its paid draft available as another sale. Retries never clear a new draft.
      if (!normalize && pending.draft?.tableNumber && pending.draft?.tableBranchId) {
        const safe = value => String(value).replace(/[.#$\[\]/]/g, '_');
        updates[`tableDrafts/${safe(pending.draft.tableBranchId)}_${safe(pending.draft.tableNumber)}`] = null;
      }
      try {
        await db.ref().update(updates);
        return saved;
      } catch (error) {
        const winner = await get(db, `orders/${id}`);
        if (winner?.invoiceNumber && winner.branch === payload.branch && (!normalize || winner.invoiceSequenceVersion === 'v3-atomic')) return winner;
        if (cancelled(winner)) throw new Error('الفاتورة ملغية');
        const after = await state(db, payload.branch, id);
        const raced = before.counter !== after.counter || before.sequence !== after.sequence || before.rawSequence !== after.rawSequence || before.assignment !== after.assignment;
        if (!raced) throw error;
        await new Promise(resolve => setTimeout(resolve, 15 + Math.floor(Math.random() * 35)));
      }
    }
    throw new Error('ازدحام في حفظ الفواتير؛ أعد المحاولة وسيبقى نفس معرّف البيع');
  }
  return {prepare, pendingKey, remember, recall, forget, commit, log};
})();
