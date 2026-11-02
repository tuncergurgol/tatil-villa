(() => {
  const phrases = {
    en: [
      [
        "Meyvenin canlı aroması ve likörün yumuşak tatlılığı, her servise renkli ve keyifli bir karakter katar. %15 alkol derecesine sahip bu meyve aromalı likör, kokteyl reçetelerinde değerlendirilebilir veya farklı sunumlarla servis edilebilir. 100 cl’lik şişe formatı; otel, restoran ve barların profesyonel içecek portföyü için uygundur.",
        "The bright fruit aroma and the liqueur’s soft sweetness give every serve a colourful, easy character. At 15% ABV, this flavoured fruit liqueur can be used in cocktail recipes or served on its own. The 100 cl bottle suits the professional drinks list of hotels, restaurants and bars.",
      ],
      [
        "Meyvenin canlı aroması ve likörün yumuşak tatlılığı, her servise renkli ve keyifli bir karakter katar. %15 alkol derecesine sahip bu meyve aromalı likör, kokteyl reçetelerinde değerlendirilebilir veya farklı sunumlarla servis edilebilir. 100 cl'lik şişe formatı; otel, restoran ve barların profesyonel içecek portföyü için uygundur.",
        "The bright fruit aroma and the liqueur’s soft sweetness give every serve a colourful, easy character. At 15% ABV, this flavoured fruit liqueur can be used in cocktail recipes or served on its own. The 100 cl bottle suits the professional drinks list of hotels, restaurants and bars.",
      ],
      [
        "Kuzey Kıbrıs Türk Cumhuriyeti’nde üretilen ürün, Havanna Global’in seçilmiş içecek portföyünde yer alır.",
        "Produced in the Turkish Republic of Northern Cyprus, it is part of Havanna Global’s selected beverage portfolio.",
      ],
      [
        "Kuzey Kıbrıs Türk Cumhuriyeti'nde üretilen ürün, Havanna Global'in seçilmiş içecek portföyünde yer alır.",
        "Produced in the Turkish Republic of Northern Cyprus, it is part of Havanna Global’s selected beverage portfolio.",
      ],
      [
        "Üretim yeri: Kuzey Kıbrıs Türk Cumhuriyeti · Alkol derecesi: %15 · Hacim: 100 cl",
        "Origin: Turkish Republic of Northern Cyprus · ABV: 15% · Volume: 100 cl",
      ],
      ["Meyve Aromalı Likör", "Flavoured fruit liqueur"],
      ["Ürün bilgileri", "Product details"],
      ["Kuzey Kıbrıs Türk Cumhuriyeti", "Turkish Republic of Northern Cyprus"],
      ["Alkol derecesi", "ABV"],
      ["Üretim yeri", "Origin"],
      ["Hacim", "Volume"],
      ["Hindistan Cevizi", "Coconut"],
      ["Aromalı Likör", "Flavoured Liqueur"],
      ["Brüt Şampanya", "Brut Champagne"],
      ["dinlendirilmemiş", "unaged"],
      ["Amerikan meşe", "American oak"],
      ["uzun fıçı", "long cask ageing"],
      ["14 ay fıçı", "14 months in cask"],
      ["8 ay fıçı", "8 months in cask"],
      ["Acıbadem", "Amaretto"],
      ["Vişne", "Sour Cherry"],
      ["Şeftali", "Peach"],
      ["Portakal", "Orange"],
      ["Kayısı", "Apricot"],
      ["Çilek", "Strawberry"],
      ["Kavun", "Melon"],
      ["Kahve", "Coffee"],
      ["Nane", "Mint"],
      ["Muz", "Banana"],
      ["İskoçya", "Scotland"],
      ["Meksika", "Mexico"],
      ["Şarap", "Wine"],
      ["Viski", "Whisky"],
      ["Tekila", "Tequila"],
      ["%100", "100%"],
      ["Rom", "Rum"],
    ],
    ar: [
      [
        "Meyvenin canlı aroması ve likörün yumuşak tatlılığı, her servise renkli ve keyifli bir karakter katar. %15 alkol derecesine sahip bu meyve aromalı likör, kokteyl reçetelerinde değerlendirilebilir veya farklı sunumlarla servis edilebilir. 100 cl’lik şişe formatı; otel, restoran ve barların profesyonel içecek portföyü için uygundur.",
        "تمنح رائحة الفاكهة الحية وحلاوة الليكور الناعمة كل تقديم طابعًا ملونًا وممتعًا. هذا الليكور المنكه بنسبة كحول 15٪ يناسب وصفات الكوكتيل أو يُقدَّم وحده. زجاجة 100 سل مناسبة لقائمة المشروبات المهنية في الفنادق والمطاعم والبارات.",
      ],
      [
        "Meyvenin canlı aroması ve likörün yumuşak tatlılığı, her servise renkli ve keyifli bir karakter katar. %15 alkol derecesine sahip bu meyve aromalı likör, kokteyl reçetelerinde değerlendirilebilir veya farklı sunumlarla servis edilebilir. 100 cl'lik şişe formatı; otel, restoran ve barların profesyonel içecek portföyü için uygundur.",
        "تمنح رائحة الفاكهة الحية وحلاوة الليكور الناعمة كل تقديم طابعًا ملونًا وممتعًا. هذا الليكور المنكه بنسبة كحول 15٪ يناسب وصفات الكوكتيل أو يُقدَّم وحده. زجاجة 100 سل مناسبة لقائمة المشروبات المهنية في الفنادق والمطاعم والبارات.",
      ],
      [
        "Kuzey Kıbrıs Türk Cumhuriyeti’nde üretilen ürün, Havanna Global’in seçilmiş içecek portföyünde yer alır.",
        "يُنتَج في جمهورية شمال قبرص التركية، وهو ضمن مجموعة المشروبات المختارة لدى Havanna Global.",
      ],
      [
        "Kuzey Kıbrıs Türk Cumhuriyeti'nde üretilen ürün, Havanna Global'in seçilmiş içecek portföyünde yer alır.",
        "يُنتَج في جمهورية شمال قبرص التركية، وهو ضمن مجموعة المشروبات المختارة لدى Havanna Global.",
      ],
      [
        "Üretim yeri: Kuzey Kıbrıs Türk Cumhuriyeti · Alkol derecesi: %15 · Hacim: 100 cl",
        "المنشأ: جمهورية شمال قبرص التركية · نسبة الكحول: 15٪ · الحجم: 100 سل",
      ],
      ["Meyve Aromalı Likör", "ليكور فواكه منكه"],
      ["Ürün bilgileri", "معلومات المنتج"],
      ["Kuzey Kıbrıs Türk Cumhuriyeti", "جمهورية شمال قبرص التركية"],
      ["Alkol derecesi", "نسبة الكحول"],
      ["Üretim yeri", "المنشأ"],
      ["Hacim", "الحجم"],
      ["Hindistan Cevizi", "جوز الهند"],
      ["Aromalı Likör", "ليكور منكه"],
      ["Brüt Şampanya", "شامبانيا بروت"],
      ["dinlendirilmemiş", "غير معتّق"],
      ["Amerikan meşe", "بلوط أمريكي"],
      ["uzun fıçı", "تعتيق طويل"],
      ["14 ay fıçı", "14 شهراً في البرميل"],
      ["8 ay fıçı", "8 أشهر في البرميل"],
      ["Acıbadem", "أماريتو"],
      ["Vişne", "كرز حامض"],
      ["Şeftali", "خوخ"],
      ["Portakal", "برتقال"],
      ["Kayısı", "مشمش"],
      ["Çilek", "فراولة"],
      ["Kavun", "شمام"],
      ["Kahve", "قهوة"],
      ["Nane", "نعناع"],
      ["Muz", "موز"],
      ["İskoçya", "اسكتلندا"],
      ["Meksika", "المكسيك"],
      ["Şarap", "نبيذ"],
      ["Viski", "ويسكي"],
      ["Tekila", "تيكيلا"],
      ["%100", "100%"],
      ["40% ABV", "40٪ كحول"],
      ["ABV", "كحول"],
      ["100 cl", "100 سل"],
      ["70 cl", "70 سل"],
      ["Blended Scotch", "سكوتش ممزوج"],
      ["Premium vodka", "فودكا فاخرة"],
      ["Premium spirit", "مشروب فاخر"],
      ["Premium red", "نبيذ أحمر فاخر"],
      ["Caribbean rum", "روم كاريبي"],
      ["Museum Collection", "مجموعة المتحف"],
      ["Ukraine", "أوكرانيا"],
      ["Georgia", "جورجيا"],
      ["Tequila", "تيكيلا"],
      ["Rom", "روم"],
    ],
  };

  function localize(lang, text) {
    const list = phrases[lang];
    if (!list || text == null) return text || "";
    let out = String(text);
    for (const [from, to] of list) {
      if (out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  }

  function splitHref(href) {
    const raw = String(href || "/");
    const hashAt = raw.indexOf("#");
    const queryAt = raw.indexOf("?");
    let cut = raw.length;
    if (hashAt >= 0) cut = Math.min(cut, hashAt);
    if (queryAt >= 0) cut = Math.min(cut, queryAt);
    return { path: raw.slice(0, cut) || "/", suffix: raw.slice(cut) };
  }

  function barePath(path) {
    let bare = String(path || "/").replace(/^\/(?:en|ar)(?=\/|$)/i, "") || "/";
    if (!bare.startsWith("/")) bare = `/${bare}`;
    if (bare.length > 1) bare = bare.replace(/\/+$/, "");
    return bare || "/";
  }

  function stripLang(href) {
    const parts = splitHref(href);
    return barePath(parts.path) + parts.suffix;
  }

  function withLang(href, lang) {
    const parts = splitHref(href);
    const bare = barePath(parts.path);
    if (lang === "en" || lang === "ar") {
      const prefixed = bare === "/" ? `/${lang}/` : `/${lang}${bare}`;
      return prefixed + parts.suffix;
    }
    return bare + parts.suffix;
  }

  function langFromPath(pathname) {
    const match = String(pathname || "").match(/^\/(en|ar)(?=\/|$)/i);
    return match ? match[1].toLowerCase() : "tr";
  }

  function goLang(lang) {
    const next = withLang(location.pathname, lang);
    const current = (location.pathname.replace(/\/+$/, "") || "/").toLowerCase();
    const target = (next.replace(/\/+$/, "") || "/").toLowerCase();
    if (current === target) return false;
    location.assign(next + location.search + location.hash);
    return true;
  }

  function rewriteLinks(lang, root) {
    const scope = root || document;
    scope.querySelectorAll("a[href]").forEach((anchor) => {
      const href = anchor.getAttribute("href");
      if (!href || /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) return;
      if (!href.startsWith("/")) return;
      if (
        href.startsWith("/admin") ||
        href.startsWith("/api/") ||
        href.startsWith("/images/")
      ) {
        return;
      }
      if (/\.[a-z0-9]{2,5}(?:\?|#|$)/i.test(href)) return;
      if (!anchor.dataset.langHref) anchor.dataset.langHref = stripLang(href);
      anchor.setAttribute("href", withLang(anchor.dataset.langHref, lang));
    });
  }

  window.HavannaLabels = {
    localize,
    barePath,
    stripLang,
    withLang,
    langFromPath,
    goLang,
    rewriteLinks,
  };
})();
