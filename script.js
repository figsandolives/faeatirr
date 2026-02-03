// index page logic
(function () {
  const langBtn = document.getElementById("langBtn");
  const langLabel = document.getElementById("langLabel");

  const current = window.i18nGetLang();
  langLabel.textContent = current.toUpperCase();

  langBtn.addEventListener("click", () => {
    const next = window.i18nGetLang() === "ar" ? "en" : "ar";
    window.i18nSetLang(next);
    langLabel.textContent = next.toUpperCase();
    window.i18nApply();
  });

  window.i18nApply();
})();
