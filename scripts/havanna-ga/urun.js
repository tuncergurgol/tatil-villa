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
      "nav.process": "Süreç",
      "nav.contact": "İletişim",
      "product.loading": "Ürün yükleniyor…",
      "product.notFound": "Ürün bulunamadı.",
      "product.back": "Portföye dön",
      "product.contact": "Teklif / tadım talep edin",
      "product.gallery": "Görseller",
      "product.zoom": "Resmi büyük göster",
      "product.zoomClose": "Kapat",
      "product.zoomPrev": "Önceki görsel",
      "product.zoomNext": "Sonraki görsel",
      "product.related": "Diğer Ürünlerimiz",
      "cat.liqueur": "Likör",
      "cat.vodka": "Votka",
      "cat.spirits": "Distile",
      "cat.tequila": "Tekila",
      "cat.rum": "Rom",
      "cat.raki": "Rakı",
      "cat.wine": "Şarap",
      "footer.tag": "Alkollü içecek ithalatı",
      "footer.legal":
        "18 yaş altı kişilere alkollü içecek satışı yasaktır. Lütfen sorumlu tüketin.",
    },
    en: {
      "age.eyebrow": "Age verification",
      "age.title": "Are you 18 or older?",
      "age.text":
        "This site contains alcoholic beverage content. Please confirm you are of legal age.",
      "age.yes": "Yes, 18+",
      "age.no": "No",
      "age.denied": "Sorry; only visitors aged 18+ may enter.",
      "nav.about": "About",
      "nav.portfolio": "Portfolio",
      "nav.moju": "MOJU",
      "nav.process": "Process",
      "nav.contact": "Contact",
      "product.loading": "Loading product…",
      "product.notFound": "Product not found.",
      "product.back": "Back to portfolio",
      "product.contact": "Request a quote / tasting",
      "product.gallery": "Gallery",
      "product.zoom": "View larger",
      "product.zoomClose": "Close",
      "product.zoomPrev": "Previous image",
      "product.zoomNext": "Next image",
      "product.related": "Other Products",
      "cat.liqueur": "Liqueur",
      "cat.vodka": "Vodka",
      "cat.spirits": "Spirits",
      "cat.tequila": "Tequila",
      "cat.rum": "Rum",
      "cat.raki": "Rakı",
      "cat.wine": "Wine",
      "footer.tag": "Alcoholic beverage import",
      "footer.legal":
        "Sale of alcoholic beverages to persons under 18 is prohibited. Please drink responsibly.",
    },
    ar: {
      "age.eyebrow": "التحقق من العمر",
      "age.title": "هل أنت بعمر 18 أو أكثر؟",
      "age.text":
        "يحتوي هذا الموقع على محتوى مشروبات كحولية. يرجى تأكيد أنك بالسن القانوني.",
      "age.yes": "نعم، 18+",
      "age.no": "لا",
      "age.denied": "عذرًا؛ الدخول للزوار بعمر 18 فأكثر فقط.",
      "nav.about": "من نحن",
      "nav.portfolio": "المحفظة",
      "nav.moju": "MOJU",
      "nav.process": "العملية",
      "nav.contact": "اتصل بنا",
      "product.loading": "جاري تحميل المنتج…",
      "product.notFound": "المنتج غير موجود.",
      "product.back": "العودة إلى المحفظة",
      "product.contact": "اطلب عرضًا / تذوقًا",
      "product.gallery": "الصور",
      "product.zoom": "عرض الصورة بحجم أكبر",
      "product.zoomClose": "إغلاق",
      "product.zoomPrev": "الصورة السابقة",
      "product.zoomNext": "الصورة التالية",
      "product.related": "منتجات أخرى",
      "cat.liqueur": "ليكور",
      "cat.vodka": "فودكا",
      "cat.spirits": "مشروبات مقطرة",
      "cat.tequila": "تكيلا",
      "cat.rum": "روم",
      "cat.raki": "راكي",
      "cat.wine": "نبيذ",
      "footer.tag": "استيراد مشروبات كحولية",
      "footer.legal":
        "يُحظر بيع المشروبات الكحولية لمن هم دون 18 عامًا. يرجى الشرب بمسؤولية.",
    },
  };

  let currentLang = "tr";
  let catalogGroups = [];

  function t(key, fallback = "") {
    return (dict[currentLang] && dict[currentLang][key]) || fallback || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function applyLang(lang) {
    if (!dict[lang]) return;
    currentLang = lang;
    document.documentElement.lang = lang === "ar" ? "ar" : lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) {}

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key && dict[lang][key]) el.textContent = dict[lang][key];
    });

    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.getAttribute("data-lang") === lang)
      );
    });
    window.HavannaLabels?.rewriteLinks?.(lang);
  }

  function labelText(text) {
    const localize = window.HavannaLabels?.localize;
    return localize ? localize(currentLang, text) : text || "";
  }

  function copyText(text, id) {
    const localize = window.HavannaCopy?.localize;
    if (localize) return localize(currentLang, id, text || "");
    return text || "";
  }

  function productUrl(id) {
    const path = `/urun/${encodeURIComponent(id)}`;
    return window.HavannaLabels?.withLang?.(path, currentLang) || path;
  }

  function mediaUrl(src) {
    const value = String(src || "").trim();
    if (!value) return "";
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    return value.startsWith("/") ? value : `/${value}`;
  }

  function resolveProductId() {
    const path = window.location.pathname.replace(/\/+$/, "");
    const match = path.match(/\/urun\/([^/?#]+)/i);
    if (match?.[1] && match[1].toLowerCase() !== "index.html") {
      return decodeURIComponent(match[1]);
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || params.get("slug") || "";
  }

  function groupName(group) {
    if (!group) return "";
    if (typeof group.name === "string") return group.name;
    return (
      group.name?.[currentLang] ||
      group.name?.tr ||
      group.nameEn ||
      group.id ||
      ""
    );
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

  function initMenu() {
    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => nav.classList.toggle("is-open"));
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => nav.classList.remove("is-open"));
    });
  }

  function initLang() {
    const fromPath = window.HavannaLabels?.langFromPath?.(location.pathname);
    const lang = fromPath && dict[fromPath] ? fromPath : "tr";
    applyLang(lang);
    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextLang = btn.getAttribute("data-lang") || "tr";
        if (window.HavannaLabels?.goLang?.(nextLang)) return;
        applyLang(nextLang);
        if (window.__lastProductPayload) {
          renderProduct(window.__lastProductPayload);
        }
      });
    });
  }

  const SITE_ORIGIN = "https://havannaglobal.com";

  function upsertMeta(selector, attr, value) {
    if (!value) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      const match = selector.match(/\[([^=\]]+)=["']?([^"'\]]+)["']?\]/);
      if (match) el.setAttribute(match[1], match[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  }

  function setSeo(product) {
    const slug = product.seo?.slug || product.id;
    const url = `${SITE_ORIGIN}${productUrl(slug)}`;
    const title = labelText(
      product.seo?.title || `${product.name} | Havanna Global`
    );
    const plainDesc = (
      copyText(product.description, product.id) ||
      labelText(
        String(product.seo?.description || product.meta || product.name || "")
      )
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    const imagePath =
      (Array.isArray(product.images) && product.images[0]) || product.image || "";
    const image = imagePath
      ? imagePath.startsWith("http")
        ? imagePath
        : `${SITE_ORIGIN}/${String(imagePath).replace(/^\/+/, "")}`
      : `${SITE_ORIGIN}/logo.png`;
    const keywords = labelText(
      product.seo?.keywords ||
        [product.name, product.subGroup, product.meta, "Havanna Global", "otel içecek"]
          .filter(Boolean)
          .join(", ")
    );

    document.title = title;
    upsertMeta('meta[name="description"]', "content", plainDesc);
    upsertMeta('meta[name="keywords"]', "content", keywords);
    upsertMeta('meta[name="robots"]', "content", "index, follow, max-image-preview:large");
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);

    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", plainDesc);
    upsertMeta('meta[property="og:url"]', "content", url);
    upsertMeta('meta[property="og:type"]', "content", "product");
    upsertMeta('meta[property="og:image"]', "content", image);
    upsertMeta('meta[property="og:site_name"]', "content", "Havanna Global");
    const locales = { tr: "tr_TR", en: "en_US", ar: "ar_AR" };
    upsertMeta('meta[property="og:locale"]', "content", locales[currentLang] || "tr_TR");
    const bare = `/urun/${encodeURIComponent(slug)}`;
    ["tr", "en", "ar"].forEach((lang) => {
      const href = `${SITE_ORIGIN}${window.HavannaLabels?.withLang?.(bare, lang) || bare}`;
      let link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = lang;
        document.head.appendChild(link);
      }
      link.href = href;
    });
    let xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]');
    if (!xDefault) {
      xDefault = document.createElement("link");
      xDefault.rel = "alternate";
      xDefault.hreflang = "x-default";
      document.head.appendChild(xDefault);
    }
    xDefault.href = `${SITE_ORIGIN}${bare}`;
    upsertMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", plainDesc);
    upsertMeta('meta[name="twitter:image"]', "content", image);

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: labelText(product.name),
      description: plainDesc,
      image: [image],
      sku: product.id,
      brand: {
        "@type": "Brand",
        name: String(product.name || "").split(" ")[0] || "Havanna Global",
      },
      category: labelText(product.subGroup || product.category || "Beverage"),
      url,
      offers: {
        "@type": "Offer",
        url,
        availability: "https://schema.org/InStock",
        priceCurrency: "TRY",
        seller: {
          "@type": "Organization",
          name: "Havanna Global",
          url: SITE_ORIGIN,
        },
      },
    };
    let script = document.getElementById("product-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "product-jsonld";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  function isBulletLine(line) {
    return /^[•\-\*\u2022]\s+/.test(line.trim());
  }

  function stripBullet(line) {
    return line.trim().replace(/^[•\-\*\u2022]\s+/, "");
  }

  function looksLikeHeading(line, nextNonEmpty) {
    const text = line.trim();
    if (!text || isBulletLine(text)) return false;
    if (text.length > 80) return false;
    if (/[.!?…]$/.test(text)) return false;
    if (nextNonEmpty && isBulletLine(nextNonEmpty)) return true;
    return text.length <= 48 && !text.includes(":");
  }

  function nextNonEmptyLine(lines, fromIndex) {
    for (let i = fromIndex; i < lines.length; i += 1) {
      if (lines[i].trim()) return lines[i];
    }
    return "";
  }

  function formatDescription(raw) {
    const text = String(raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";

    const lines = text.split("\n");
    const parts = [];
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];
      const line = rawLine.trim();
      if (!line) {
        i += 1;
        continue;
      }

      if (isBulletLine(line)) {
        const items = [];
        while (i < lines.length) {
          const current = lines[i].trim();
          if (!current) {
            const peek = nextNonEmptyLine(lines, i + 1);
            if (!peek || !isBulletLine(peek)) break;
            i += 1;
            continue;
          }
          if (isBulletLine(current)) {
            let item = stripBullet(current);
            i += 1;
            while (i < lines.length) {
              const cont = lines[i].trim();
              if (!cont || isBulletLine(cont) || looksLikeHeading(cont, nextNonEmptyLine(lines, i + 1))) {
                break;
              }
              item += ` ${cont}`;
              i += 1;
            }
            items.push(item);
            continue;
          }
          break;
        }
        if (items.length) {
          parts.push(
            `<ul class="product-detail__list">${items
              .map((item) => {
                const colon = item.indexOf(":");
                if (colon > 0 && colon < 48) {
                  const label = item.slice(0, colon).trim();
                  const rest = item.slice(colon + 1).trim();
                  return `<li><strong>${escapeHtml(label)}:</strong>${
                    rest ? ` ${escapeHtml(rest)}` : ""
                  }</li>`;
                }
                return `<li>${escapeHtml(item)}</li>`;
              })
              .join("")}</ul>`
          );
        }
        continue;
      }

      if (looksLikeHeading(line, nextNonEmptyLine(lines, i + 1))) {
        parts.push(`<h3 class="product-detail__heading">${escapeHtml(line)}</h3>`);
        i += 1;
        continue;
      }

      const para = [line];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) break;
        if (isBulletLine(next) || looksLikeHeading(next, nextNonEmptyLine(lines, i + 1))) {
          break;
        }
        para.push(next);
        i += 1;
      }
      parts.push(
        `<p class="product-detail__desc">${escapeHtml(para.join(" "))}</p>`
      );
    }

    return `<div class="product-detail__copy">${parts.join("")}</div>`;
  }

  let gallerySources = [];
  let galleryIndex = 0;

  function setLightboxImage() {
    const img = document.getElementById("lightbox-image");
    const prev = document.querySelector("[data-lightbox-prev]");
    const next = document.querySelector("[data-lightbox-next]");
    const src = gallerySources[galleryIndex] || "";
    if (img) {
      img.src = src;
      img.alt = document.getElementById("product-main-image")?.alt || "";
    }
    const multi = gallerySources.length > 1;
    if (prev) {
      prev.hidden = !multi;
      prev.setAttribute("aria-label", t("product.zoomPrev"));
    }
    if (next) {
      next.hidden = !multi;
      next.setAttribute("aria-label", t("product.zoomNext"));
    }
  }

  function openLightbox(index) {
    if (!gallerySources.length) return;
    const count = gallerySources.length;
    galleryIndex = ((index % count) + count) % count;
    setLightboxImage();
    const box = document.getElementById("image-lightbox");
    if (!box) return;
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    document.querySelector(".lightbox__close")?.focus();
  }

  function closeLightbox() {
    const box = document.getElementById("image-lightbox");
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.classList.remove("lightbox-open");
  }

  function stepLightbox(delta) {
    if (!gallerySources.length) return;
    openLightbox(galleryIndex + delta);
  }

  function initLightbox() {
    const box = document.getElementById("image-lightbox");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    box.addEventListener("click", (event) => {
      if (event.target.closest("[data-lightbox-close]")) closeLightbox();
      else if (event.target.closest("[data-lightbox-prev]")) stepLightbox(-1);
      else if (event.target.closest("[data-lightbox-next]")) stepLightbox(1);
    });
    document.addEventListener("keydown", (event) => {
      if (box.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
    });
  }

  function bindGallery(root, sources) {
    gallerySources = sources;
    galleryIndex = 0;
    document.getElementById("product-zoom")?.addEventListener("click", () => {
      openLightbox(galleryIndex);
    });
    root.querySelectorAll(".product-detail__thumb").forEach((btn, index) => {
      btn.addEventListener("click", () => {
        const src = btn.getAttribute("data-src");
        const main = document.getElementById("product-main-image");
        if (main && src) main.src = src;
        galleryIndex = index;
        root
          .querySelectorAll(".product-detail__thumb")
          .forEach((item) => item.classList.toggle("is-active", item === btn));
      });
    });
  }

  function renderGallery(images, name) {
    if (!images.length) return "";
    const resolved = images.map(mediaUrl).filter(Boolean);
    if (!resolved.length) return "";
    const thumbs =
      resolved.length > 1
        ? `<div class="product-detail__thumbs" role="list">${resolved
            .map(
              (src, i) =>
                `<button type="button" class="product-detail__thumb${
                  i === 0 ? " is-active" : ""
                }" data-src="${escapeHtml(src)}" aria-label="${escapeHtml(
                  name
                )} ${i + 1}">
              <img src="${escapeHtml(src)}" alt="" loading="lazy" />
            </button>`
            )
            .join("")}</div>`
        : "";
    return `<div class="product-detail__media">
      <div class="product-detail__stage">
        <button type="button" class="product-detail__zoom" id="product-zoom">
          <img id="product-main-image" src="${escapeHtml(
            resolved[0]
          )}" alt="${escapeHtml(name)}" />
          <span class="product-detail__zoom-label" data-i18n="product.zoom">${escapeHtml(
            t("product.zoom")
          )}</span>
        </button>
      </div>
      ${thumbs}
    </div>`;
  }

  function renderRelated(related) {
    if (!related?.length) return "";
    return `<section class="product-related">
      <h2 data-i18n="product.related">${escapeHtml(t("product.related"))}</h2>
      <div class="product-related__grid">
        ${related
          .map((p) => {
            const img = mediaUrl(
              (Array.isArray(p.images) && p.images[0]) || p.image || ""
            );
            const relatedName = labelText(p.name);
            return `<a class="product-related__card" href="${productUrl(
              p.id
            )}">
              <img src="${escapeHtml(img)}" alt="${escapeHtml(relatedName)}" loading="lazy" />
              <span>${escapeHtml(relatedName)}</span>
            </a>`;
          })
          .join("")}
      </div>
    </section>`;
  }

  function renderProduct(payload) {
    const root = document.getElementById("product-detail-root");
    const crumb = document.getElementById("product-crumb-name");
    if (!root) return;

    const product = payload?.product;
    if (!product) {
      root.innerHTML = `<p class="product-empty">${escapeHtml(
        t("product.notFound")
      )}</p>
      <p><a class="btn btn-outline" href="/#portfolio">${escapeHtml(
        t("product.back")
      )}</a></p>`;
      if (crumb) crumb.textContent = t("product.notFound");
      return;
    }

    window.__lastProductPayload = payload;
    const name = labelText(product.name);
    setSeo(product);
    if (crumb) crumb.textContent = name;

    const group = catalogGroups.find((g) => g.id === product.category);
    const label =
      groupName(group) ||
      t(product.labelKey || `cat.${product.category}`, product.category);
    const images = Array.isArray(product.images) && product.images.length
      ? product.images
      : product.image
        ? [product.image]
        : [];
    const description = copyText(
      product.description || product.seo?.description || product.meta || "",
      product.id
    );

    root.innerHTML = `
      ${renderGallery(images, name)}
      <div class="product-detail__info">
        <span class="product__cat">${escapeHtml(label)}</span>
        <h1 class="product-detail__title">${escapeHtml(name)}</h1>
        ${
          product.subGroup
            ? `<p class="product-detail__subgroup">${escapeHtml(
                labelText(product.subGroup)
              )}</p>`
            : ""
        }
        ${
          product.meta
            ? `<p class="product__meta">${escapeHtml(labelText(product.meta))}</p>`
            : ""
        }
        ${description ? formatDescription(description) : ""}
        <div class="product-detail__actions">
          <a class="btn btn-primary" href="/#contact">${escapeHtml(
            t("product.contact")
          )}</a>
          <a class="btn btn-outline" href="/#portfolio">${escapeHtml(
            t("product.back")
          )}</a>
        </div>
      </div>
      ${renderRelated(payload.related || [])}
    `;

    const sources = [...root.querySelectorAll(".product-detail__thumb")]
      .map((btn) => btn.getAttribute("data-src"))
      .filter(Boolean);
    const mainSrc = document.getElementById("product-main-image")?.getAttribute("src");
    bindGallery(root, sources.length ? sources : mainSrc ? [mainSrc] : []);
    window.HavannaLabels?.rewriteLinks?.(currentLang);
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

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      ensureGoogleAnalytics(data.settings?.googleAnalyticsId);
    } catch {
      /* ignore */
    }
  }

  async function loadProduct() {
    const id = resolveProductId();
    const root = document.getElementById("product-detail-root");
    if (!id) {
      renderProduct(null);
      return;
    }
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        renderProduct(null);
        return;
      }
      const data = await res.json();
      catalogGroups = Array.isArray(data.groups) ? data.groups : [];
      renderProduct(data);
      applyLang(currentLang);
    } catch {
      if (root) {
        root.innerHTML = `<p class="product-empty">${escapeHtml(
          t("product.notFound")
        )}</p>`;
      }
    }
  }

  initLang();
  initAgeGate();
  initMenu();
  initLightbox();
  loadSettings();
  loadProduct();
})();
