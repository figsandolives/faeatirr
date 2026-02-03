(function () {
  const dict = {
    ar: {
      app_title: "نظام كاشير وإدارة",
      home_subtitle: "اختر القسم للدخول",
      btn_cashier: "الكاشير",
      btn_accounting: "المحاسبة والمخازن",
      btn_language: "تغيير اللغة",
      label_current_lang: "اللغة",
      footer_note: "واجهة احترافية + تحديث لحظي عبر Firebase",

      // Common
      btn_logout: "خروج",
      btn_back_home: "رجوع للرئيسية",
      btn_login: "دخول",
      btn_add: "إضافة",
      btn_edit: "تعديل",
      btn_delete: "حذف",
      btn_remove: "حذف",
      btn_plus: "+",
      btn_minus: "-",
      btn_clear: "مسح",
      btn_create_invoice: "إنشاء فاتورة",
      btn_unassign: "إلغاء",
      btn_cleanup: "تنظيف غير متصل",
      btn_add_move: "إضافة حركة",

      yes: "نعم",
      no: "لا",
      all: "الكل",
      choose: "اختر",
      search: "بحث",

      label_device: "الجهاز",
      hint_device: "معرّف الجهاز ثابت ويُستخدم للربط مع الفرع",
      label_user: "المستخدم",
      label_role: "الدور",
      label_pin: "رمز الدخول",
      label_username: "اسم المستخدم",
      label_branch: "الفرع",
      label_cashier: "الكاشير",

      status_checking: "جارٍ التحقق...",
      status_assigned: "تم تعيين فرع للجهاز",
      status_not_assigned: "الجهاز غير معيّن لفرع",
      status_online: "متصل",
      status_offline: "غير متصل",

      // Cashier
      cashier_title: "الكاشير",
      cashier_login_title: "دخول الكاشير",
      cashier_login_note: "أدخل رمز الكاشير. الجهاز يجب أن يكون معرفاً لفرع من الإدارة.",
      label_cashier_code: "رمز الكاشير",
      hint_cashier_code: "يمكن أن يكون 4 أرقام (أو أكثر حسب إعدادك)",
      label_branch_status: "حالة الفرع للجهاز",

      pos_title: "نقطة البيع",
      label_product_search: "بحث المنتجات",
      hint_product_search: "اكتب الاسم أو جزء منه",
      products_list: "قائمة المنتجات",
      cart: "السلة",
      label_qty: "الكمية",
      label_price: "السعر",
      label_subtotal: "الإجمالي",
      label_discount: "خصم",
      label_total: "المجموع",
      label_customer: "العميل",
      hint_customer_optional: "اختياري",
      customer_none: "— بدون —",
      prompt_customer_name: "اسم العميل",
      label_payment_method: "طريقة الدفع",
      label_order_type: "نوع الطلب",
      label_last_invoice: "آخر فاتورة",
      label_live: "تحديث لحظي",
      today_orders: "طلبات اليوم (لحظي)",

      ok_invoice_created: "تم إنشاء الفاتورة بنجاح ✅",
      err_enter_code: "يرجى إدخال الرمز",
      err_invalid_cashier_code: "رمز الكاشير غير صحيح",
      err_cashier_inactive: "الكاشير غير مفعل",
      err_device_not_assigned: "هذا الجهاز غير معرّف لفرع. يرجى ربطه من الإدارة.",
      err_not_logged_in: "غير مسجل دخول",
      err_empty_cart: "السلة فارغة",

      // Admin
      admin_title: "المحاسبة والمخازن",
      admin_login_title: "دخول الإدارة",
      admin_login_note: "الدخول يتطلب رمز. رمز المدير الافتراضي 123456 (يمكن تغييره من المستخدمين).",
      hint_username_optional: "اختياري للتصفية فقط",
      hint_pin: "أدخل رمز المستخدم",

      admin_menu: "القائمة",

      nav_orders: "الطلبات",
      nav_customers: "العملاء",
      nav_products: "المنتجات",
      nav_product_categories: "تصنيفات المنتجات",
      nav_units: "الوحدات",
      nav_item_card: "بطاقة الصنف",

      nav_stores: "المخازن",
      nav_stock_materials: "مواد المخزون",
      nav_material_categories: "تصنيفات المواد",
      nav_storage_locations: "أماكن التخزين",
      nav_issue: "صرف",
      nav_production: "انتاج",
      nav_inventory: "جرد",
      nav_receive: "استلام",
      nav_transfers: "تحويلات",
      nav_return_store: "مرتجع للمخزن",
      nav_return_waste: "مرتجع توالف",

      nav_suppliers_group: "الموردون",
      nav_suppliers: "الموردون",
      nav_purchases: "الشراء",
      nav_return_supplier: "مرتجع للمورد",

      nav_admin_group: "الإدارة",
      nav_pending_stock: "حركات مخزون معلقة",
      nav_devices_cashier: "الأجهزة والكاشير",
      nav_users: "المستخدمين",
      nav_warehouse_employees: "موظفي المخازن",
      nav_production_employees: "موظفي الانتاج",
      nav_branches: "الفروع",
      nav_delivery_zones: "مناطق التوصيل",
      nav_delivery_prices: "أسعار التوصيل",
      nav_discounts: "خصومات",
      nav_order_types: "انوع الطلب",
      nav_payment_methods: "طرق الدفع",

      orders_all: "كل الطلبات (لحظي)",
      orders_note: "الطلبات محفوظة حسب الفرع + نسخة عامة للإدارة.",
      crud_live_note: "التغييرات تظهر فوراً لكل الأجهزة دون تحديث.",
      placeholder_note: "هذه شاشة تشغيلية جاهزة للحفظ كحركات. إذا رغبت، أضيف لك تدفق تفصيلي (مستندات/اعتماد/طباعة) فوق نفس البنية.",

      devices_title: "الأجهزة",
      devices_note: "تعيين الفرع للجهاز إلزامي لكي يعمل الكاشير على ذلك الجهاز. يبقى محفوظاً حتى لو أغلق الجهاز وعاد لاحقاً.",
      cashiers_title: "الكاشير",
      users_title: "المستخدمين",
      users_note: "المدير يصل لكل الأقسام. أمين الصندوق لا يدخل المخازن/الموردون. أمين المخازن لا يدخل الإدارة.",

      // Fields
      field_name: "الاسم",
      field_phone: "الهاتف",
      field_sku: "SKU",
      field_price: "السعر",
      field_category: "التصنيف",
      field_unit: "الوحدة",
      field_active: "مفعل",
      field_notes: "ملاحظات",
      field_qty: "الكمية",
      field_branch: "الفرع",
      field_supplier: "المورد",
      field_total: "الإجمالي",
      field_zone: "المنطقة",
      field_amount: "القيمة",
      field_created_at: "تاريخ الإنشاء",

      // Prompts
      prompt_username: "اسم المستخدم",
      prompt_role: "الدور: manager / cashier / storekeeper",
      prompt_pin: "رمز الدخول",
      prompt_active_confirm: "هل تريد تفعيل السجل؟",
      prompt_cashier_name: "اسم الكاشير",
      prompt_cashier_code: "رمز الكاشير",
      prompt_cashier_code_or_create: "اكتب رمز الكاشير أو اتركه فارغاً للإنشاء تلقائياً",
      prompt_enter_id: "أدخل المعرف",

      // Errors
      err_enter_pin: "يرجى إدخال رمز الدخول",
      err_invalid_pin: "رمز الدخول غير صحيح",
      err_user_inactive: "المستخدم غير مفعل",
      err_cannot_delete_self: "لا يمكنك حذف نفسك",
      confirm_delete: "تأكيد الحذف؟",
      ok_cleanup_done: "تم",
      not_found: "غير موجود",
      err_module_not_found: "القسم غير موجود",
    },

    en: {
      app_title: "Cashier & Management System",
      home_subtitle: "Choose a section to enter",
      btn_cashier: "Cashier",
      btn_accounting: "Accounting & Inventory",
      btn_language: "Switch Language",
      label_current_lang: "Language",
      footer_note: "Professional UI + Realtime updates via Firebase",

      btn_logout: "Logout",
      btn_back_home: "Back to Home",
      btn_login: "Login",
      btn_add: "Add",
      btn_edit: "Edit",
      btn_delete: "Delete",
      btn_remove: "Remove",
      btn_plus: "+",
      btn_minus: "-",
      btn_clear: "Clear",
      btn_create_invoice: "Create Invoice",
      btn_unassign: "Unassign",
      btn_cleanup: "Cleanup Offline",
      btn_add_move: "Add Movement",

      yes: "Yes",
      no: "No",
      all: "ALL",
      choose: "Choose",
      search: "Search",

      label_device: "Device",
      hint_device: "Device ID is persistent and used for branch assignment",
      label_user: "User",
      label_role: "Role",
      label_pin: "PIN",
      label_username: "Username",
      label_branch: "Branch",
      label_cashier: "Cashier",

      status_checking: "Checking...",
      status_assigned: "Branch assigned to device",
      status_not_assigned: "Device not assigned",
      status_online: "Online",
      status_offline: "Offline",

      cashier_title: "Cashier",
      cashier_login_title: "Cashier Login",
      cashier_login_note: "Enter cashier code. Device must be assigned to a branch by admin.",
      label_cashier_code: "Cashier Code",
      hint_cashier_code: "Usually 4 digits (or more if you want)",
      label_branch_status: "Device Branch Status",

      pos_title: "Point of Sale",
      label_product_search: "Search products",
      hint_product_search: "Type a name or part of it",
      products_list: "Products",
      cart: "Cart",
      label_qty: "Qty",
      label_price: "Price",
      label_subtotal: "Subtotal",
      label_discount: "Discount",
      label_total: "Total",
      label_customer: "Customer",
      hint_customer_optional: "Optional",
      customer_none: "— None —",
      prompt_customer_name: "Customer name",
      label_payment_method: "Payment Method",
      label_order_type: "Order Type",
      label_last_invoice: "Last invoice",
      label_live: "Realtime",
      today_orders: "Today's orders (live)",

      ok_invoice_created: "Invoice created ✅",
      err_enter_code: "Please enter the code",
      err_invalid_cashier_code: "Invalid cashier code",
      err_cashier_inactive: "Cashier is inactive",
      err_device_not_assigned: "This device is not assigned to a branch. Assign it from Admin.",
      err_not_logged_in: "Not logged in",
      err_empty_cart: "Cart is empty",

      admin_title: "Accounting & Inventory",
      admin_login_title: "Admin Login",
      admin_login_note: "Login requires a PIN. Default manager PIN is 123456 (change it in Users).",
      hint_username_optional: "Optional (used only to prefer matching user)",
      hint_pin: "Enter user PIN",

      admin_menu: "Menu",

      nav_orders: "Orders",
      nav_customers: "Customers",
      nav_products: "Products",
      nav_product_categories: "Product Categories",
      nav_units: "Units",
      nav_item_card: "Item Card",

      nav_stores: "Inventory",
      nav_stock_materials: "Stock Materials",
      nav_material_categories: "Material Categories",
      nav_storage_locations: "Storage Locations",
      nav_issue: "Issue",
      nav_production: "Production",
      nav_inventory: "Inventory Count",
      nav_receive: "Receive",
      nav_transfers: "Transfers",
      nav_return_store: "Return to Store",
      nav_return_waste: "Waste Return",

      nav_suppliers_group: "Suppliers",
      nav_suppliers: "Suppliers",
      nav_purchases: "Purchases",
      nav_return_supplier: "Return to Supplier",

      nav_admin_group: "Administration",
      nav_pending_stock: "Pending Stock Movements",
      nav_devices_cashier: "Devices & Cashier",
      nav_users: "Users",
      nav_warehouse_employees: "Warehouse Employees",
      nav_production_employees: "Production Employees",
      nav_branches: "Branches",
      nav_delivery_zones: "Delivery Zones",
      nav_delivery_prices: "Delivery Prices",
      nav_discounts: "Discounts",
      nav_order_types: "Order Types",
      nav_payment_methods: "Payment Methods",

      orders_all: "All Orders (Live)",
      orders_note: "Orders are saved per-branch + a global admin copy.",
      crud_live_note: "Changes appear instantly on all devices (no refresh).",
      placeholder_note: "Operational screen ready to store movements. If you want, I can extend it to full workflow (approval/printing/docs) on same structure.",

      devices_title: "Devices",
      devices_note: "Assigning a branch is required for a cashier device. Assignment persists across days until changed.",
      cashiers_title: "Cashiers",
      users_title: "Users",
      users_note: "Manager sees everything. Cashier cannot access Inventory/Suppliers. Storekeeper cannot access Administration.",

      field_name: "Name",
      field_phone: "Phone",
      field_sku: "SKU",
      field_price: "Price",
      field_category: "Category",
      field_unit: "Unit",
      field_active: "Active",
      field_notes: "Notes",
      field_qty: "Qty",
      field_branch: "Branch",
      field_supplier: "Supplier",
      field_total: "Total",
      field_zone: "Zone",
      field_amount: "Amount",
      field_created_at: "Created at",

      prompt_username: "Username",
      prompt_role: "Role: manager / cashier / storekeeper",
      prompt_pin: "PIN",
      prompt_active_confirm: "Set active?",
      prompt_cashier_name: "Cashier name",
      prompt_cashier_code: "Cashier code",
      prompt_cashier_code_or_create: "Enter cashier code or leave empty to auto-generate",
      prompt_enter_id: "Enter ID",

      err_enter_pin: "Please enter PIN",
      err_invalid_pin: "Invalid PIN",
      err_user_inactive: "User is inactive",
      err_cannot_delete_self: "You cannot delete yourself",
      confirm_delete: "Confirm delete?",
      ok_cleanup_done: "Done",
      not_found: "Not found",
      err_module_not_found: "Module not found",
    },
  };

  function setDirAndLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }

  function getLang() {
    return localStorage.getItem("lang") || "ar";
  }

  function setLang(lang) {
    localStorage.setItem("lang", lang);
    setDirAndLang(lang);
  }

  function t(key) {
    const lang = getLang();
    return dict[lang]?.[key] ?? "";
  }

  function apply(root = document) {
    const lang = getLang();
    setDirAndLang(lang);

    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val) el.textContent = val;
    });

    // optional title translation
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const val = t(key);
      if (val) el.setAttribute("title", val);
    });
  }

  // expose globally
  window.i18nT = t;
  window.i18nApply = () => apply(document);
  window.i18nApplyWithin = (el) => apply(el);
  window.i18nGetLang = getLang;
  window.i18nSetLang = setLang;

  // initial apply
  document.addEventListener("DOMContentLoaded", () => apply(document));
})();
