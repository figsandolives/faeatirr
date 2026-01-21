// وظائف مشتركة بين الصفحات

// تحميل اللغة من localStorage (إذا وجدت)
let globalLang = localStorage.getItem("lang") || "ar";

// تحديث الترجمة في الصفحة
function applyTranslations() {
  document.documentElement.lang = globalLang;
  document.documentElement.dir = globalLang === "ar" ? "rtl" : "ltr";

  const elements = document.querySelectorAll("[data-key]");
  elements.forEach(el => {
    const key = el.dataset.key;
    if (translations[globalLang] && translations[globalLang][key]) {
      el.textContent = translations[globalLang][key];
    }
  });

  const langBtn = document.getElementById("btnLangToggle") || document.getElementById("toggleLang");
  if (langBtn) {
    langBtn.textContent = (globalLang === "ar") ? "English" : "العربية";
  }
}

// تبديل اللغة
function toggleLanguage() {
  globalLang = (globalLang === "ar") ? "en" : "ar";
  localStorage.setItem("lang", globalLang);
  applyTranslations();
}

// عند جاهزية الصفحة
document.addEventListener("DOMContentLoaded", () => {
  applyTranslations();

  const langBtn = document.getElementById("btnLangToggle") || document.getElementById("toggleLang");
  if (langBtn) {
    langBtn.addEventListener("click", toggleLanguage);
  }
});