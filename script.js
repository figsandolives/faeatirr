document.addEventListener('DOMContentLoaded', () => {
  const { setLanguage } = window.i18n;

  const cashierBtn = document.getElementById('go-cashier');
  const accountingBtn = document.getElementById('go-accounting');
  const labelAppBtn = document.getElementById('go-label-app');
  const labelAdminBtn = document.getElementById('go-label-admin');

  cashierBtn.addEventListener('click', () => {
    window.location.href = 'cashier.html';
  });

  accountingBtn.addEventListener('click', () => {
    window.location.href = 'accounting.html';
  });

  labelAppBtn?.addEventListener('click', () => {
    window.location.href = 'label-app.html';
  });

  labelAdminBtn?.addEventListener('click', () => {
    window.location.href = 'label-admin.html';
  });

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
});
