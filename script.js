document.addEventListener('DOMContentLoaded', () => {
  const { setLanguage } = window.i18n;

  const cashierBtn = document.getElementById('go-cashier');
  const accountingBtn = document.getElementById('go-accounting');

  cashierBtn.addEventListener('click', () => {
    window.location.href = 'cashier.html';
  });

  accountingBtn.addEventListener('click', () => {
    window.location.href = 'accounting.html';
  });

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
});
