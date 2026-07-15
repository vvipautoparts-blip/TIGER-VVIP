(function (window) {
  "use strict";

  const RAW_ACCOUNT_TYPES = [
    {
      id: "buyer-viewer",
      nameAr: "مشتري مشاهد",
      nameEn: "Buyer Viewer",
      descriptionAr: "للاستعراض والمتابعة دون نشر إعلانات.",
      descriptionEn: "Browse and follow listings without publishing."
    },
    {
      id: "buyer-standard",
      nameAr: "مشتري عادي",
      nameEn: "Buyer Standard",
      descriptionAr: "بحث وتواصل فردي مع البائعين دون نشر.",
      descriptionEn: "Search and one-to-one contact without publishing."
    },
    {
      id: "individual-seller",
      nameAr: "بائع فردي",
      nameEn: "Individual Seller",
      descriptionAr: "حساب فردي لإدارة نشاط بيع شخصي منضبط.",
      descriptionEn: "Individual account for managed personal selling activity."
    },
    {
      id: "parts-shop",
      nameAr: "متجر قطع",
      nameEn: "Parts Shop",
      descriptionAr: "متجر مختص بقطع الغيار والمستلزمات.",
      descriptionEn: "Store focused on spare parts and supplies."
    },
    {
      id: "maintenance-center",
      nameAr: "مركز صيانة",
      nameEn: "Maintenance Center",
      descriptionAr: "مركز يقدم خدمات صيانة وفحص للمركبات.",
      descriptionEn: "Center for vehicle maintenance and inspection services."
    },
    {
      id: "electrical-hybrid-center",
      nameAr: "مركز كهرباء أو هايبرد",
      nameEn: "Electrical or Hybrid Center",
      descriptionAr: "مختص بأعمال كهرباء المركبات وأنظمة الهايبرد.",
      descriptionEn: "Specialized in vehicle electrical and hybrid systems."
    },
    {
      id: "general-service-center",
      nameAr: "مركز خدمات عام",
      nameEn: "General Service Center",
      descriptionAr: "خدمات تشغيلية عامة مرتبطة بقطاع المركبات.",
      descriptionEn: "General operational services related to vehicles."
    },
    {
      id: "distributor",
      nameAr: "موزع",
      nameEn: "Distributor",
      descriptionAr: "توزيع منتجات ضمن شبكة بيع معتمدة.",
      descriptionEn: "Product distribution within a managed sales network."
    },
    {
      id: "importer",
      nameAr: "مستورد",
      nameEn: "Importer",
      descriptionAr: "استيراد منتجات أو قطع وتوفيرها للسوق.",
      descriptionEn: "Importing products or parts for local supply."
    },
    {
      id: "wholesaler",
      nameAr: "تاجر جملة",
      nameEn: "Wholesaler",
      descriptionAr: "بيع كميات جملة للتجار والمنشآت.",
      descriptionEn: "Bulk sales to merchants and organizations."
    },
    {
      id: "supplier",
      nameAr: "مورد",
      nameEn: "Supplier",
      descriptionAr: "توريد مباشر للمواد أو القطع أو المستلزمات.",
      descriptionEn: "Direct supply of materials, parts, or supplies."
    },
    {
      id: "retailer",
      nameAr: "بائع تجزئة",
      nameEn: "Retailer",
      descriptionAr: "بيع مباشر للمستهلك النهائي.",
      descriptionEn: "Direct sales to end customers."
    },
    {
      id: "company-institution",
      nameAr: "شركة أو مؤسسة",
      nameEn: "Company or Institution",
      descriptionAr: "كيان رسمي لإدارة أعمال تجارية أو خدمية.",
      descriptionEn: "Formal entity for commercial or service operations."
    },
    {
      id: "office",
      nameAr: "مكتب",
      nameEn: "Office",
      descriptionAr: "مكتب يمثل نشاطًا مهنيًا أو إداريًا منظمًا.",
      descriptionEn: "Office account for professional or administrative work."
    },
    {
      id: "broker",
      nameAr: "وسيط",
      nameEn: "Broker",
      descriptionAr: "وساطة منظمة بين الأطراف ضمن ضوابط المنصة.",
      descriptionEn: "Structured brokering between parties under platform rules."
    },
    {
      id: "service-provider",
      nameAr: "مزود خدمة",
      nameEn: "Service Provider",
      descriptionAr: "تقديم خدمة متخصصة للمستخدمين أو المنشآت.",
      descriptionEn: "Specialized services for users or organizations."
    },
    {
      id: "personal-vip",
      nameAr: "Personal VIP",
      nameEn: "Personal VIP",
      descriptionAr: "حساب شخصي مميز ضمن تجربة المنصة الموحدة.",
      descriptionEn: "Premium personal account in the unified platform."
    }
  ];

  const ACCOUNT_TYPES = Object.freeze(
    RAW_ACCOUNT_TYPES.map(function (item) {
      return Object.freeze({
        id: String(item.id),
        nameAr: String(item.nameAr),
        nameEn: String(item.nameEn),
        descriptionAr: String(item.descriptionAr),
        descriptionEn: String(item.descriptionEn)
      });
    })
  );

  const byId = new Map();
  ACCOUNT_TYPES.forEach(function (item) {
    if (byId.has(item.id)) {
      throw new Error("PR38_DUPLICATE_ACCOUNT_TYPE_ID: " + item.id);
    }
    byId.set(item.id, item);
  });

  function clone(item) {
    return Object.freeze({
      id: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      descriptionAr: item.descriptionAr,
      descriptionEn: item.descriptionEn
    });
  }

  function getAll() {
    return ACCOUNT_TYPES.map(clone);
  }

  function getById(id) {
    const found = byId.get(String(id || ""));
    return found ? clone(found) : null;
  }

  function isValidId(id) {
    return byId.has(String(id || ""));
  }

  window.VVIP_PR38_ACCOUNT_TYPES = Object.freeze({
    getAll: getAll,
    getById: getById,
    isValidId: isValidId
  });
}(window));
