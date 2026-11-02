(() => {
  const AGE_KEY = "havanna_age_ok_v1";
  const LANG_KEY = "havanna_lang_v1";

  const dict = {
    tr: {
      "age.eyebrow": "Yaş doğrulama",
      "age.title": "18 yaşında veya üzeri misiniz?",
      "age.text":
        "Bu site alkollü içecek içeriği barındırır. Devam etmek için yasal yaşta olduğunuzu onaylayın.",
      "age.yes": "Evet, 18+",
      "age.no": "Hayır",
      "age.denied": "Üzgünüz; siteye yalnızca 18 yaş ve üzeri ziyaretçiler girebilir.",
      "nav.about": "Hakkımızda",
      "nav.portfolio": "Portföy",
      "nav.moju": "MOJU",
      "nav.references": "Referanslar",
      "nav.process": "Süreç",
      "nav.contact": "İletişim",
      "hero.eyebrow": "HOTEL & HOSPITALITY BEVERAGE SUPPLY",
      "hero.title": "Otel ve Konaklama İçecek Tedariği",
      "hero.lead":
        "Havanna Global, Türkiye’de otel, restoran ve konaklama işletmelerine yönelik kurumsal içecek tedariği sunar. Seçilmiş uluslararası alkollü içecek markalarını ve MOJU aroma koleksiyonunu işletmelerin bar ve menü ihtiyaçlarıyla buluşturur.",
      "hero.cta1": "Ürün portföyü",
      "hero.cta2": "İletişime geçin",
      "hero.cta3": "Dijital katalog",
      "network.eyebrow": "Uluslararası kaynaklar",
      "network.title": "Altı ülkeden Antalya’ya",
      "network.lede":
        "Uluslararası tedarik ağımız; İspanya, Fransa, Meksika, Gürcistan, Ukrayna ve Kıbrıs’tan Antalya merkezimize uzanır.",
      "network.c1": "İspanya · Viski",
      "network.c2": "Fransa · Votka",
      "network.c3": "Meksika · Tekila",
      "network.c4": "Gürcistan · Şarap",
      "network.c5": "Kıbrıs · Likör",
      "network.c6": "Ukrayna · Votka",
      "catalog.cta": "Dijital kataloğu indir",
      "catalog.hint": "PDF sunum",
      "refs.eyebrow": "Otel referansları",
      "refs.title": "Otelcilik sektöründeki deneyimimiz",
      "refs.lede":
        "Türkiye’de ürünlerimizin ulaştığı otel markalarından seçmeler.",
      "refs.note":
        "Antalya–Dubai bağlantısı: Rixos ve Kempinski, her iki destinasyonda da tesisleri bulunan markalardır. Bu ortak marka ağı, Dubai’de yeni iş birliği görüşmeleri için bir temas noktası sunar.",
      "hero.stat1": "yıllık ithalat deneyimi",
      "hero.stat2": "ürün kategorisi",
      "hero.stat3": "MOJU aroma",
      "about.eyebrow": "Hakkımızda",
      "about.title": "Otel sektörüne odaklı ithalat ortağı",
      "about.lede":
        "Havanna Global, İstanbul merkez ve Antalya depo yapısıyla Türkiye genelindeki beş yıldızlı tesislere alkollü içecek tedariki sunar. Portföyümüz votka, likör, tekila, rom, rakı ve seçilmiş şarapları kapsar.",
      "about.v1t": "Kurumsal tedarik",
      "about.v1d":
        "Otel satın alma ekipleriyle çalışan, belgelendirilmiş ithalat ve dağıtım süreci.",
      "about.v2t": "Seçilmiş markalar",
      "about.v2d":
        "Bar menüsüne uyumlu, tadım ve reçete desteğiyle sunulan uluslararası ürünler.",
      "about.v3t": "Saha odaklı hizmet",
      "about.v3d":
        "İstanbul merkez ve Antalya depodan Türkiye genelindeki tesislere uzanan operasyon ağı.",
      "portfolio.eyebrow": "Portföy",
      "portfolio.title": "Ürün vitrini",
      "portfolio.lede":
        "Gerçek ürün fotoğraflarımızdan bir seçki. Detaylı katalog ve stok bilgisi için dijital kataloğu indirin veya bizimle iletişime geçin.",
      "portfolio.loading": "Ürünler yükleniyor…",
      "portfolio.empty": "Henüz ürün eklenmedi.",
      "filter.all": "Tümü",
      "filter.liqueur": "Likör",
      "filter.spirits": "Distile",
      "filter.wine": "Şarap",
      "filter.sub.all": "Tümü",
      "filter.sub.aria": "Distile alt filtreler",
      "cat.liqueur": "Likör",
      "cat.vodka": "Votka",
      "cat.spirits": "Distile",
      "cat.tequila": "Tekila",
      "cat.rum": "Rom",
      "cat.raki": "Rakı",
      "cat.wine": "Şarap",
      "meta.moju": "Aromalı likör · 11 aroma",
      "meta.raki": "Meşe fıçıda dinlendirilmiş",
      "moju.eyebrow": "İş birliği",
      "moju.title": "MOJU aroma koleksiyonu",
      "moju.lede":
        "Akdeniz’in güneşinden ilham alan 11 aromalık likör serisi. Otel barları ve kokteyl menüleri için tadım, reçete ve menü yerleşimi desteği sunuyoruz.",
      "moju.cta": "Tadım talep edin",
      "moju.f1": "Muz",
      "moju.f2": "Vişne",
      "moju.f3": "Kahve",
      "moju.f4": "Şeftali",
      "moju.f5": "Nane",
      "moju.f6": "Acıbadem",
      "moju.f7": "Çilek",
      "moju.f8": "Kavun",
      "moju.f9": "Portakal",
      "moju.f10": "Hindistan Cevizi",
      "moju.f11": "Kayısı",
      "hero.stat1": "yıllık ithalat deneyimi",
      "hero.stat2": "ürün kategorisi",
      "hero.stat3": "MOJU aroma",
      "process.eyebrow": "Çalışma modeli",
      "process.title": "İş birliği süreci",
      "process.lede": "Kısa, net ve kurumsal bir tedarik akışı.",
      "process.s1t": "İhtiyaç analizi",
      "process.s1d": "Menü, sezon ve tesis kapasitesine göre ürün önerisi.",
      "process.s2t": "Tadım & seçim",
      "process.s2d": "Seçili markalarla tadım ve bar ekibi bilgilendirmesi.",
      "process.s3t": "Tedarik",
      "process.s3d": "İthalat, lojistik ve teslimat planının yürütülmesi.",
      "process.s4t": "Süreklilik",
      "process.s4d": "Stok takibi, yeniden sipariş ve menü güncelleme desteği.",
      "contact.eyebrow": "İletişim",
      "contact.title": "Birlikte çalışalım",
      "contact.lede": "Portföy, tadım veya tedarik talepleriniz için bize yazın.",
      "contact.email": "E-posta",
      "contact.kep": "KEP",
      "contact.web": "Web",
      "contact.hq": "Şirket merkezi",
      "contact.hqValue":
        "Mimarsinan Mah. E5 Londra Asfaltı Cad. No: 66 İç Kapı No: 6 Büyükçekmece / İstanbul",
      "contact.warehouse": "Antalya depo",
      "contact.warehouseValue":
        "Yenigöl Mah. Yenigöl Cad. Konut Sitesi No: 80 İç Kapı No: 1 Muratpaşa / Antalya",
      "contact.tax": "Vergi bilgileri",
      "contact.taxValue": "Büyükçekmece Vergi Dairesi — 4601051648",
      "contact.mersis": "MERSİS",
      "contact.asideTitle": "Kurumsal satış",
      "contact.asideText":
        "Otel zincirleri, satın alma departmanları ve F&B ekipleri için özel teklif.",
      "contact.asideCta": "E-posta gönderin",
      "footer.tag": "Alkollü içecek ithalatı",
      "footer.legal":
        "18 yaş altı kişilere alkollü içecek satışı yasaktır. Lütfen sorumlu tüketin.",
      "footer.company": "Büyükçekmece V.D. 4601051648 · MERSİS 0460105164800001",
      "doc.title": "Havanna Global | Otel ve Konaklama İçecek Tedariği",
    },
    en: {
      "age.eyebrow": "Age verification",
      "age.title": "Are you 18 years or older?",
      "age.text":
        "This website contains alcoholic beverage content. Please confirm you are of legal age to continue.",
      "age.yes": "Yes, 18+",
      "age.no": "No",
      "age.denied": "Sorry — only visitors aged 18 and over may enter this site.",
      "nav.about": "About",
      "nav.portfolio": "Portfolio",
      "nav.moju": "MOJU",
      "nav.references": "References",
      "nav.process": "Process",
      "nav.contact": "Contact",
      "hero.eyebrow": "HOTEL & HOSPITALITY BEVERAGE SUPPLY",
      "hero.title": "Hotel & Hospitality Beverage Supply",
      "hero.lead":
        "Havanna Global provides corporate beverage supply for hotels, restaurants and hospitality businesses in Turkey. We connect selected international alcoholic beverage brands and the MOJU flavour collection with bar and menu needs.",
      "hero.cta1": "View portfolio",
      "hero.cta2": "Get in touch",
      "hero.cta3": "Digital catalogue",
      "network.eyebrow": "International sources",
      "network.title": "From six countries to Antalya",
      "network.lede":
        "Our supply network runs from Spain, France, Mexico, Georgia, Ukraine and Cyprus into our Antalya hub.",
      "network.c1": "Spain · Whisky",
      "network.c2": "France · Vodka",
      "network.c3": "Mexico · Tequila",
      "network.c4": "Georgia · Wine",
      "network.c5": "Cyprus · Liqueur",
      "network.c6": "Ukraine · Vodka",
      "catalog.cta": "Download digital catalogue",
      "catalog.hint": "PDF presentation",
      "refs.eyebrow": "Hotel references",
      "refs.title": "Our hospitality experience",
      "refs.lede":
        "A selection of hotel brands in Turkey where our products are present.",
      "refs.note":
        "Antalya–Dubai link: Rixos and Kempinski operate in both destinations. This shared brand footprint opens a contact point for new collaboration talks in Dubai.",
      "hero.stat1": "years of import experience",
      "hero.stat2": "product categories",
      "hero.stat3": "MOJU flavours",
      "about.eyebrow": "About",
      "about.title": "An import partner focused on hospitality",
      "about.lede":
        "With headquarters in Istanbul and a warehouse in Antalya, Havanna Global supplies alcoholic beverages to five-star properties across Turkey. Our portfolio covers vodka, liqueurs, tequila, rum, rakı and selected wines.",
      "about.v1t": "Corporate supply",
      "about.v1d":
        "Documented import and distribution workflows built for hotel purchasing teams.",
      "about.v2t": "Curated brands",
      "about.v2d":
        "International products aligned with bar menus, supported by tastings and recipes.",
      "about.v3t": "On-the-ground service",
      "about.v3d":
        "An operations network from Istanbul HQ and Antalya warehouse to properties nationwide.",
      "portfolio.eyebrow": "Portfolio",
      "portfolio.title": "Product showcase",
      "portfolio.lede":
        "A selection of real product photography. Download the digital catalogue or contact us for availability.",
      "portfolio.loading": "Loading products…",
      "portfolio.empty": "No products yet.",
      "filter.all": "All",
      "filter.liqueur": "Liqueur",
      "filter.spirits": "Spirits",
      "filter.wine": "Wine",
      "filter.sub.all": "All",
      "filter.sub.aria": "Spirits subfilters",
      "cat.liqueur": "Liqueur",
      "cat.vodka": "Vodka",
      "cat.spirits": "Spirits",
      "cat.tequila": "Tequila",
      "cat.rum": "Rum",
      "cat.raki": "Rakı",
      "cat.wine": "Wine",
      "meta.moju": "Flavoured liqueur · 11 aromas",
      "meta.raki": "Oak-barrel rested",
      "moju.eyebrow": "Partnership",
      "moju.title": "MOJU flavour collection",
      "moju.lede":
        "An 11-flavour liqueur range inspired by the Mediterranean sun. We support tastings, recipes and menu placement for hotel bars.",
      "moju.cta": "Request a tasting",
      "moju.f1": "Banana",
      "moju.f2": "Sour Cherry",
      "moju.f3": "Coffee",
      "moju.f4": "Peach",
      "moju.f5": "Mint",
      "moju.f6": "Bitter Almond",
      "moju.f7": "Strawberry",
      "moju.f8": "Melon",
      "moju.f9": "Orange",
      "moju.f10": "Coconut",
      "moju.f11": "Apricot",
      "hero.stat1": "years of import experience",
      "hero.stat2": "product categories",
      "hero.stat3": "MOJU flavours",
      "process.eyebrow": "How we work",
      "process.title": "Collaboration process",
      "process.lede": "A short, clear and corporate supply flow.",
      "process.s1t": "Needs analysis",
      "process.s1d": "Product proposals based on menu, season and property capacity.",
      "process.s2t": "Tasting & selection",
      "process.s2d": "Guided tastings with selected brands and bar-team briefing.",
      "process.s3t": "Supply",
      "process.s3d": "Import, logistics and delivery planning executed end to end.",
      "process.s4t": "Continuity",
      "process.s4d": "Stock follow-up, reorders and ongoing menu support.",
      "contact.eyebrow": "Contact",
      "contact.title": "Let’s work together",
      "contact.lede": "Write to us for portfolio, tasting or supply requests.",
      "contact.email": "Email",
      "contact.kep": "KEP",
      "contact.web": "Web",
      "contact.hq": "Headquarters",
      "contact.hqValue":
        "Mimarsinan Mah. E5 Londra Asfaltı Cad. No: 66 Interior Door No: 6 Büyükçekmece / Istanbul",
      "contact.warehouse": "Antalya warehouse",
      "contact.warehouseValue":
        "Yenigöl Mah. Yenigöl Cad. Konut Sitesi No: 80 Interior Door No: 1 Muratpaşa / Antalya",
      "contact.tax": "Tax details",
      "contact.taxValue": "Büyükçekmece Tax Office — 4601051648",
      "contact.mersis": "MERSIS",
      "contact.asideTitle": "Corporate sales",
      "contact.asideText":
        "Dedicated proposals for hotel groups, purchasing departments and F&B teams.",
      "contact.asideCta": "Send an email",
      "footer.tag": "Alcoholic beverage import",
      "footer.legal":
        "Sale of alcoholic beverages to persons under 18 is prohibited. Please drink responsibly.",
      "footer.company": "Büyükçekmece Tax Office 4601051648 · MERSIS 0460105164800001",
      "doc.title": "Havanna Global | Hotel & Hospitality Beverage Supply",
    },
    ar: {
      "age.eyebrow": "التحقق من العمر",
      "age.title": "هل عمرك 18 سنة أو أكثر؟",
      "age.text":
        "يحتوي هذا الموقع على محتوى مشروبات كحولية. يُرجى تأكيد أنك بلغت السن القانوني للمتابعة.",
      "age.yes": "نعم، 18+",
      "age.no": "لا",
      "age.denied": "عذرًا — يُسمح فقط للزوار بعمر 18 سنة فأكثر بدخول الموقع.",
      "nav.about": "من نحن",
      "nav.portfolio": "المحفظة",
      "nav.moju": "MOJU",
      "nav.references": "المراجع",
      "nav.process": "العملية",
      "nav.contact": "تواصل",
      "hero.eyebrow": "استيراد مؤسسي · فنادق وضيافة",
      "hero.title": "Havanna Global",
      "hero.lead":
        "استيراد مشروبات كحولية من تركيا. علامات دولية مختارة، محفظة لبارات الفنادق، ومجموعة نكهات MOJU.",
      "hero.cta1": "عرض المنتجات",
      "hero.cta2": "تواصل معنا",
      "hero.cta3": "كتالوج رقمي",
      "network.eyebrow": "مصادر دولية",
      "network.title": "من ست دول إلى أنطاليا",
      "network.lede":
        "تمتد شبكة التوريد لدينا من إسبانيا وفرنسا والمكسيك وجورجيا وأوكرانيا وقبرص إلى مركزنا في أنطاليا.",
      "network.c1": "إسبانيا · ويسكي",
      "network.c2": "فرنسا · فودكا",
      "network.c3": "المكسيك · تيكيلا",
      "network.c4": "جورجيا · نبيذ",
      "network.c5": "قبرص · ليكور",
      "network.c6": "أوكرانيا · فودكا",
      "catalog.cta": "تحميل الكتالوج الرقمي",
      "catalog.hint": "عرض PDF",
      "refs.eyebrow": "مراجع الفنادق",
      "refs.title": "خبرتنا في قطاع الفنادق",
      "refs.lede": "اختيارات من علامات الفنادق في تركيا التي تصل إليها منتجاتنا.",
      "refs.note":
        "رابط أنطاليا–دبي: يعمل Rixos وKempinski في الوجهتين. توفر هذه الشبكة نقطة تواصل لشراكات جديدة في دبي.",
      "hero.stat1": "سنوات خبرة في الاستيراد",
      "hero.stat2": "فئات منتجات",
      "hero.stat3": "نكهات MOJU",
      "about.eyebrow": "من نحن",
      "about.title": "شريك استيراد يركز على قطاع الضيافة",
      "about.lede":
        "بمقر في إسطنبول ومستودع في أنطاليا، تزود Havanna Global الفنادق الفاخرة في تركيا بالمشروبات الكحولية. تشمل محفظتنا الفودكا والليكور والتيكيلا والروم والراكي ونبيذًا مختارًا.",
      "about.v1t": "توريد مؤسسي",
      "about.v1d":
        "عمليات استيراد وتوزيع موثقة مصممة لفرق المشتريات في الفنادق.",
      "about.v2t": "علامات مختارة",
      "about.v2d":
        "منتجات دولية متوافقة مع قوائم البار، مدعومة بالتذوق والوصفات.",
      "about.v3t": "خدمة ميدانية",
      "about.v3d":
        "شبكة تشغيل من مقر إسطنبول ومستودع أنطاليا إلى المنشآت في جميع أنحاء تركيا.",
      "portfolio.eyebrow": "المحفظة",
      "portfolio.title": "عرض المنتجات",
      "portfolio.lede":
        "مجموعة من صور المنتجات الحقيقية. تواصل معنا للكتالوج والتوفر.",
      "portfolio.loading": "جاري تحميل المنتجات…",
      "portfolio.empty": "لا توجد منتجات بعد.",
      "filter.all": "الكل",
      "filter.liqueur": "ليكور",
      "filter.spirits": "مشروبات مقطرة",
      "filter.wine": "نبيذ",
      "filter.sub.all": "الكل",
      "filter.sub.aria": "مرشحات المشروبات المقطرة",
      "cat.liqueur": "ليكور",
      "cat.vodka": "فودكا",
      "cat.spirits": "مقطر",
      "cat.tequila": "تيكيلا",
      "cat.rum": "روم",
      "cat.raki": "راكي",
      "cat.wine": "نبيذ",
      "meta.moju": "ليكور منكه · 11 نكهة",
      "meta.raki": "مُعتّق في براميل البلوط",
      "moju.eyebrow": "شراكة",
      "moju.title": "مجموعة نكهات MOJU",
      "moju.lede":
        "سلسلة ليكور بـ 11 نكهة مستوحاة من شمس البحر المتوسط. ندعم التذوق والوصفات ووضع القائمة لبارات الفنادق.",
      "moju.cta": "اطلب تذوقًا",
      "moju.f1": "موز",
      "moju.f2": "كرز حامض",
      "moju.f3": "قهوة",
      "moju.f4": "خوخ",
      "moju.f5": "نعناع",
      "moju.f6": "لوز مر",
      "moju.f7": "فراولة",
      "moju.f8": "شمام",
      "moju.f9": "برتقال",
      "moju.f10": "جوز هند",
      "moju.f11": "مشمش",
      "hero.stat1": "سنوات خبرة في الاستيراد",
      "hero.stat2": "فئات منتجات",
      "hero.stat3": "نكهات MOJU",
      "process.eyebrow": "نموذج العمل",
      "process.title": "عملية التعاون",
      "process.lede": "تدفق توريد قصير وواضح ومؤسسي.",
      "process.s1t": "تحليل الاحتياجات",
      "process.s1d": "اقتراحات منتجات حسب القائمة والموسم وطاقة المنشأة.",
      "process.s2t": "التذوق والاختيار",
      "process.s2d": "تذوق مع العلامات المختارة وإحاطة فريق البار.",
      "process.s3t": "التوريد",
      "process.s3d": "تنفيذ الاستيراد واللوجستيات وخطة التسليم.",
      "process.s4t": "الاستمرارية",
      "process.s4d": "متابعة المخزون وإعادة الطلب ودعم القائمة.",
      "contact.eyebrow": "تواصل",
      "contact.title": "لنعمل معًا",
      "contact.lede": "راسلنا بخصوص المحفظة أو التذوق أو التوريد.",
      "contact.email": "البريد",
      "contact.kep": "KEP",
      "contact.web": "الموقع",
      "contact.hq": "المقر الرئيسي",
      "contact.hqValue":
        "Mimarsinan Mah. E5 Londra Asfaltı Cad. No: 66 İç Kapı No: 6 Büyükçekmece / İstanbul",
      "contact.warehouse": "مستودع أنطاليا",
      "contact.warehouseValue":
        "Yenigöl Mah. Yenigöl Cad. Konut Sitesi No: 80 İç Kapı No: 1 Muratpaşa / Antalya",
      "contact.tax": "المعلومات الضريبية",
      "contact.taxValue": "Büyükçekmece Vergi Dairesi — 4601051648",
      "contact.mersis": "MERSIS",
      "contact.asideTitle": "مبيعات مؤسسية",
      "contact.asideText":
        "عروض مخصصة لسلاسل الفنادق وأقسام المشتريات وفرق الأغذية والمشروبات.",
      "contact.asideCta": "أرسل بريدًا",
      "footer.tag": "استيراد مشروبات كحولية",
      "footer.legal":
        "يُحظر بيع المشروبات الكحولية لمن هم دون 18 عامًا. يُرجى الشرب بمسؤولية.",
      "footer.company": "Büyükçekmece V.D. 4601051648 · MERSIS 0460105164800001",
      "doc.title": "Havanna Global | استيراد مشروبات فاخرة",
    },
  };

  let currentLang = "tr";
  let catalogGroups = [];
  let catalogProducts = [];

  function localeTag() {
    return currentLang === "ar" ? "ar" : currentLang === "en" ? "en" : "tr";
  }

  function compareText(a, b) {
    return String(a || "").localeCompare(String(b || ""), localeTag(), {
      sensitivity: "base",
      numeric: true,
    });
  }

  function productGroupLabel(product) {
    const group = catalogGroups.find((g) => g.id === product.category);
    return (
      groupName(group) ||
      t(product.labelKey || `cat.${product.category}`, product.category) ||
      product.category ||
      ""
    );
  }

  function productSubGroupLabel(product) {
    if (!product) return "";
    if (product.category === "tequila") {
      const spirits = catalogGroups.find((g) => g.id === "spirits");
      const tekila = (spirits?.subGroups || []).find((s) => s.id === "tekila");
      const brand = String(product.subGroup || "").trim();
      // Distile/Tekila altında marka alt grubu da alfabetik olsun
      return [subGroupLabel(tekila) || t("cat.tequila", "Tekila"), brand]
        .filter(Boolean)
        .join(" ");
    }
    const spirits = catalogGroups.find((g) => g.id === "spirits");
    if (product.category === "spirits" && spirits) {
      const sid = spiritSubIdOf(product);
      const sub = (spirits.subGroups || []).find((s) => s.id === sid);
      if (sub) return subGroupLabel(sub);
    }
    const group = catalogGroups.find((g) => g.id === product.category);
    const raw = String(product.subGroup || "").trim();
    if (!raw) return "";
    const hit = (group?.subGroups || []).find((s) => {
      const id = String(s.id || "").toLowerCase();
      const tr = String(s.name?.tr || "").toLowerCase();
      const lower = raw.toLowerCase();
      return id === lower || tr === lower || s.name?.tr === raw;
    });
    return hit ? subGroupLabel(hit) : raw;
  }

  function sortProducts(products) {
    return [...products].sort((a, b) => {
      const byGroup = compareText(productGroupLabel(a), productGroupLabel(b));
      if (byGroup) return byGroup;
      const bySub = compareText(productSubGroupLabel(a), productSubGroupLabel(b));
      if (bySub) return bySub;
      return compareText(a.name, b.name);
    });
  }
  let siteSettings = null;

  function t(key, fallback = "") {
    const pack = dict[currentLang] || dict.tr;
    return pack[key] != null ? pack[key] : fallback;
  }

  function applyLang(lang) {
    currentLang = dict[lang] ? lang : "tr";
    const pack = dict[currentLang];
    const html = document.documentElement;
    html.lang = currentLang;
    html.dir = currentLang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const settingKey = el.getAttribute("data-setting");
      if (settingKey && siteSettings?.[settingKey]) return;
      if (el.hasAttribute("data-setting-tax") && (siteSettings?.taxOffice || siteSettings?.taxNumber))
        return;
      if (
        el.hasAttribute("data-setting-company") &&
        (siteSettings?.taxNumber || siteSettings?.mersis)
      )
        return;
      const key = el.getAttribute("data-i18n");
      if (pack[key] != null) el.textContent = pack[key];
    });

    if (pack["doc.title"]) document.title = pack["doc.title"];

    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.getAttribute("data-lang") === currentLang)
      );
    });

    renderFilters();
    if (catalogProducts.length) {
      renderProducts(catalogProducts);
    }
    applySettings(siteSettings);

    try {
      localStorage.setItem(LANG_KEY, currentLang);
    } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function groupName(group) {
    if (!group) return "";
    return (
      group.name?.[currentLang] ||
      group.name?.tr ||
      group.id ||
      ""
    );
  }

  function subGroupLabel(sub) {
    if (!sub) return "";
    return (
      sub.name?.[currentLang] ||
      sub.name?.tr ||
      sub.name?.en ||
      sub.id ||
      ""
    );
  }

  function getSpiritsSubGroups() {
    const spirits = catalogGroups.find((g) => g.id === "spirits");
    const list = (spirits?.subGroups || []).filter((s) => s && s.active !== false);
    return [...list].sort((a, b) => compareText(subGroupLabel(a), subGroupLabel(b)));
  }

  /** Distile alt tipi: tequila kategorisi → tekila; spirits → eşleşen alt grup. */
  function spiritSubIdOf(product) {
    if (!product) return "";
    if (product.category === "tequila") return "tekila";
    const spirits = catalogGroups.find((g) => g.id === "spirits");
    const subs = spirits?.subGroups || [];
    const raw = String(product.subGroup || "").trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    const hit = subs.find((s) => {
      const id = String(s.id || "").toLowerCase();
      const tr = String(s.name?.tr || "").toLowerCase();
      const en = String(s.name?.en || "").toLowerCase();
      return id === lower || tr === lower || en === lower || s.name?.tr === raw;
    });
    return hit?.id || lower;
  }

  function isDistileProduct(cat) {
    return cat === "spirits" || cat === "tequila";
  }

  function renderFilters() {
    const host = document.getElementById("main-filters") || document.querySelector(".filters");
    if (!host) return;
    const active =
      host.querySelector(".filter-btn[aria-pressed='true']")?.getAttribute(
        "data-filter"
      ) || activeMainFilter || "all";
    activeMainFilter = active;
    const groups = catalogGroups
      .filter((g) => g.active !== false)
      .sort((a, b) => compareText(groupName(a), groupName(b)));
    const buttons = [
      `<button type="button" class="filter-btn" data-filter="all" aria-pressed="${
        active === "all"
      }">${escapeHtml(t("filter.all", "Tümü"))}</button>`,
      ...groups.map(
        (g) =>
          `<button type="button" class="filter-btn" data-filter="${escapeHtml(
            g.id
          )}" aria-pressed="${active === g.id}">${escapeHtml(
            groupName(g)
          )}</button>`
      ),
    ];
    host.innerHTML = buttons.join("");
    renderSpiritSubFilters(active === "spirits");
    initFilters();
  }

  function renderSpiritSubFilters(visible) {
    const host = document.getElementById("sub-filters");
    if (!host) return;
    if (!visible) {
      host.hidden = true;
      host.innerHTML = "";
      activeSpiritSub = "all";
      return;
    }
    host.hidden = false;
    host.setAttribute("aria-label", t("filter.sub.aria", "Distile alt filtreler"));
    const subs = getSpiritsSubGroups();
    if (!subs.some((s) => s.id === activeSpiritSub)) {
      activeSpiritSub = "all";
    }
    const buttons = [
      `<button type="button" class="filter-btn filter-btn--sub" data-spirit-sub="all" aria-pressed="${
        activeSpiritSub === "all"
      }">${escapeHtml(t("filter.sub.all", "Tümü"))}</button>`,
      ...subs.map(
        (s) =>
          `<button type="button" class="filter-btn filter-btn--sub" data-spirit-sub="${escapeHtml(
            s.id
          )}" aria-pressed="${activeSpiritSub === s.id}">${escapeHtml(
            subGroupLabel(s)
          )}</button>`
      ),
    ];
    host.innerHTML = buttons.join("");
  }

  function applySettings(settings) {
    if (!settings) return;
    siteSettings = settings;

    document.querySelectorAll("[data-setting]").forEach((el) => {
      const key = el.getAttribute("data-setting");
      const value = settings[key];
      if (value) el.textContent = value;
    });

    document.querySelectorAll("[data-setting-mail]").forEach((el) => {
      const key = el.getAttribute("data-setting-mail");
      const value = settings[key];
      if (!value) return;
      el.setAttribute("href", `mailto:${value}`);
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
        el.textContent = value;
      }
    });

    const web = document.querySelector("[data-setting-web]");
    if (web && settings.web) {
      web.setAttribute("href", settings.web);
      try {
        web.textContent = new URL(settings.web).host.replace(/^www\./, "www.");
      } catch {
        web.textContent = settings.web.replace(/^https?:\/\//, "");
      }
    }

    const tax = document.querySelector("[data-setting-tax]");
    if (tax && (settings.taxOffice || settings.taxNumber)) {
      tax.textContent = `${settings.taxOffice || ""} — ${
        settings.taxNumber || ""
      }`.replace(/\s—\s$/, "").trim();
    }

    const company = document.querySelector("[data-setting-company]");
    if (company && (settings.taxNumber || settings.mersis)) {
      company.textContent = `${settings.taxOffice ? settings.taxOffice.replace(/Vergi Dairesi.*/, "V.D.") : "V.D."} ${
        settings.taxNumber || ""
      } · MERSİS ${settings.mersis || ""}`.replace(/\s+/g, " ").trim();
    }

    const gsc = document.getElementById("meta-gsc");
    if (gsc && settings.googleSiteVerification) {
      gsc.setAttribute("content", settings.googleSiteVerification);
    }
    const bing = document.getElementById("meta-bing");
    if (bing && settings.bingSiteVerification) {
      bing.setAttribute("content", settings.bingSiteVerification);
    }

    ensureGoogleAnalytics(settings.googleAnalyticsId);
  }

  function ensureGoogleAnalytics(id) {
    const gaId = String(id || "")
      .trim()
      .toUpperCase();
    if (!/^G-[A-Z0-9]+$/.test(gaId)) return;
    if (document.getElementById("ga-gtag-src")) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };

    const src = document.createElement("script");
    src.id = "ga-gtag-src";
    src.async = true;
    src.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(src);

    const init = document.createElement("script");
    init.id = "ga-gtag-init";
    init.textContent =
      "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','" +
      gaId +
      "');";
    document.head.appendChild(init);
  }

  function productUrl(id) {
    return `/urun/${encodeURIComponent(id)}`;
  }

  function renderProducts(products) {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `<p class="product-empty">${escapeHtml(
        t("portfolio.empty", "Henüz ürün eklenmedi.")
      )}</p>`;
      return;
    }

    const ordered = sortProducts(products);

    grid.innerHTML = ordered
      .map((p) => {
        const group = catalogGroups.find((g) => g.id === p.category);
        const label = groupName(group) || t(p.labelKey || `cat.${p.category}`, p.category);
        const meta = p.meta || "";
        const href = productUrl(p.id);
        const spiritSub = spiritSubIdOf(p);
        return `<a class="product" href="${escapeHtml(href)}" data-cat="${escapeHtml(
          p.category
        )}" data-spirit-sub="${escapeHtml(spiritSub)}">
          <div class="product__media">
            <img src="${escapeHtml(
              (Array.isArray(p.images) && p.images[0]) || p.image || ""
            )}" alt="${escapeHtml(p.name)}" loading="lazy" />
          </div>
          <div class="product__body">
            <span class="product__cat">${escapeHtml(label)}</span>
            <h3 class="product__name">${escapeHtml(p.name)}</h3>
            <p class="product__meta">${escapeHtml(meta)}</p>
          </div>
        </a>`;
      })
      .join("");

    refreshProductVisibility();
  }

  async function loadProducts() {
    const grid = document.getElementById("product-grid");
    try {
      const [catalogRes, settingsRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      if (!catalogRes.ok) throw new Error("fail");
      const data = await catalogRes.json();
      catalogGroups = Array.isArray(data.groups) ? data.groups : [];
      catalogProducts = Array.isArray(data.products) ? data.products : [];
      renderFilters();
      renderProducts(catalogProducts);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        applySettings(settingsData.settings || null);
      }
      applyLang(currentLang);
    } catch {
      if (grid) {
        grid.innerHTML = `<p class="product-empty">${escapeHtml(
          t("portfolio.empty", "Henüz ürün eklenmedi.")
        )}</p>`;
      }
    }
  }

  function unlockSite() {
    const gate = document.getElementById("age-gate");
    if (gate) gate.hidden = true;
    document.body.classList.remove("age-locked");
  }

  function initAgeGate() {
    let ok = false;
    try {
      ok = localStorage.getItem(AGE_KEY) === "1";
    } catch (_) {}

    if (ok) {
      unlockSite();
      return;
    }

    const yes = document.getElementById("age-yes");
    const no = document.getElementById("age-no");
    const denied = document.getElementById("age-denied");

    yes?.addEventListener("click", () => {
      try {
        localStorage.setItem(AGE_KEY, "1");
      } catch (_) {}
      unlockSite();
    });

    no?.addEventListener("click", () => {
      if (denied) denied.hidden = false;
    });
  }

  let filtersReady = false;
  let activeMainFilter = "all";
  let activeSpiritSub = "all";
  let refreshProductVisibility = () => {};

  function initFilters() {
    const mainHost =
      document.getElementById("main-filters") || document.querySelector(".filters");
    const subHost = document.getElementById("sub-filters");

    function applyFilters() {
      const filter = activeMainFilter || "all";
      const spiritSub = activeSpiritSub || "all";
      const products = Array.from(
        document.querySelectorAll("#product-grid .product")
      );

      mainHost
        ?.querySelectorAll(".filter-btn[data-filter]")
        .forEach((b) => {
          const active = (b.getAttribute("data-filter") || "all") === filter;
          b.setAttribute("aria-pressed", String(active));
        });

      subHost
        ?.querySelectorAll(".filter-btn[data-spirit-sub]")
        .forEach((b) => {
          const active =
            (b.getAttribute("data-spirit-sub") || "all") === spiritSub;
          b.setAttribute("aria-pressed", String(active));
        });

      products.forEach((p) => {
        const cat = p.getAttribute("data-cat") || "";
        const pSub = p.getAttribute("data-spirit-sub") || "";
        let show = false;
        if (filter === "all") {
          show = true;
        } else if (filter === "spirits") {
          show = isDistileProduct(cat);
          if (show && spiritSub !== "all") {
            show = pSub === spiritSub;
          }
        } else {
          show = cat === filter;
        }
        p.toggleAttribute("hidden", !show);
      });
    }

    refreshProductVisibility = applyFilters;

    if (!filtersReady) {
      mainHost?.addEventListener("click", (event) => {
        const btn = event.target.closest(".filter-btn[data-filter]");
        if (!btn || !mainHost.contains(btn)) return;
        event.preventDefault();
        const next = btn.getAttribute("data-filter") || "all";
        activeMainFilter = next;
        if (next !== "spirits") activeSpiritSub = "all";
        renderSpiritSubFilters(next === "spirits");
        applyFilters();
      });

      subHost?.addEventListener("click", (event) => {
        const btn = event.target.closest(".filter-btn[data-spirit-sub]");
        if (!btn || !subHost.contains(btn)) return;
        event.preventDefault();
        activeSpiritSub = btn.getAttribute("data-spirit-sub") || "all";
        applyFilters();
      });

      filtersReady = true;
    }

    applyFilters();
  }

  function initMenu() {
    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      nav.classList.toggle("is-open");
    });

    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => nav.classList.remove("is-open"));
    });
  }

  function initLang() {
    let lang = "tr";
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && dict[saved]) lang = saved;
    } catch (_) {}

    applyLang(lang);

    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLang(btn.getAttribute("data-lang") || "tr");
      });
    });
  }

  initLang();
  initAgeGate();
  initMenu();
  loadProducts();
})();
