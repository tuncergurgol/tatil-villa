(() => {
  const appView = document.getElementById("app-view");
  const logoutBtn = document.getElementById("logout-btn");
  const statusMsg = document.getElementById("status-msg");
  const pageTitle = document.getElementById("page-title");
  const pageDesc = document.getElementById("page-desc");

  const productDialog = document.getElementById("product-dialog");
  const productForm = document.getElementById("product-form");
  const productList = document.getElementById("product-list");
  const productCount = document.getElementById("product-count");
  const productCategory = document.getElementById("product-category");
  const productDialogTitle = document.getElementById("product-dialog-title");
  const productImagesInput = document.getElementById("product-images");
  const productImageHint = document.getElementById("product-image-hint");
  const productMediaList = document.getElementById("product-media-list");
  const productActive = document.getElementById("product-active");
  const productError = document.getElementById("product-error");
  const productSeoAiBtn = document.getElementById("product-seo-ai");

  const groupDialog = document.getElementById("group-dialog");
  const groupForm = document.getElementById("group-form");
  const groupList = document.getElementById("group-list");
  const groupCount = document.getElementById("group-count");
  const groupDialogTitle = document.getElementById("group-dialog-title");
  const groupError = document.getElementById("group-error");
  const groupSubgroupsEl = document.getElementById("group-subgroups");
  const productSubgroup = document.getElementById("product-subgroup");

  const userDialog = document.getElementById("user-dialog");
  const userForm = document.getElementById("user-form");
  const userList = document.getElementById("user-list");
  const userCount = document.getElementById("user-count");
  const userDialogTitle = document.getElementById("user-dialog-title");
  const userPassword = document.getElementById("user-password");
  const userPasswordHint = document.getElementById("user-password-hint");
  const userError = document.getElementById("user-error");

  const settingsForm = document.getElementById("settings-form");

  const pageMeta = {
    products: {
      title: "Ürünler",
      desc: "Portföydeki ürünleri ekleyin, düzenleyin veya silin.",
    },
    groups: {
      title: "Ürün grupları",
      desc: "Ürün gruplarını ve alt gruplarını yönetin.",
    },
    settings: {
      title: "Site Ayarları",
      desc: "İletişim ve kurumsal bilgileri güncelleyin.",
    },
    inquiries: {
      title: "İletişim formları",
      desc: "Sitedeki iletişim formundan gelen talepler.",
    },
    users: {
      title: "Kullanıcılar",
      desc: "Panel giriş hesaplarını yönetin.",
    },
  };

  let products = [];
  let groups = [];
  let users = [];
  let editingProductId = null;
  let editingGroupId = null;
  let editingUserId = null;
  let productKeepImages = [];
  let productSearchQuery = "";
  let editingSubGroups = [];
  const filters = { products: "active", groups: "active", users: "active" };
  const productSearch = document.getElementById("product-search");

  async function api(url, options = {}) {
    const res = await fetch(url, {
      credentials: "same-origin",
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      location.replace("/admin/");
      throw new Error("Oturum gerekli.");
    }
    if (!res.ok) throw new Error(data.error || "İşlem başarısız.");
    return data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function isActiveRecord(item) {
    return item?.active !== false;
  }

  function filterItems(items, filter) {
    if (filter === "passive") return items.filter((item) => !isActiveRecord(item));
    if (filter === "all") return items;
    return items.filter((item) => isActiveRecord(item));
  }

  function normalizeSearch(value) {
    return String(value || "")
      .toLocaleLowerCase("tr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function filterProductsBySearch(items) {
    const q = normalizeSearch(productSearchQuery);
    if (!q) return items;
    return items.filter((p) => {
      const name = normalizeSearch(p.name);
      const group = normalizeSearch(groupLabel(p.category));
      const sub = normalizeSearch(p.subGroup);
      const meta = normalizeSearch(p.meta);
      return (
        name.includes(q) ||
        group.includes(q) ||
        sub.includes(q) ||
        meta.includes(q)
      );
    });
  }

  function flash(message, isError = false) {
    statusMsg.textContent = message;
    statusMsg.classList.toggle("is-error", isError);
    statusMsg.hidden = false;
    window.clearTimeout(flash._t);
    flash._t = window.setTimeout(() => {
      statusMsg.hidden = true;
    }, 3200);
  }

  function groupLabel(id) {
    const g = groups.find((x) => x.id === id);
    return g?.name?.tr || id;
  }

  function fillCategorySelect(selected) {
    const activeGroups = groups.filter((g) => isActiveRecord(g));
    const source = activeGroups.length ? activeGroups : groups;
    productCategory.innerHTML = source
      .map(
        (g) =>
          `<option value="${escapeAttr(g.id)}"${
            g.id === selected ? " selected" : ""
          }>${escapeHtml(g.name.tr)}</option>`
      )
      .join("");
  }

  function groupSubGroups(groupId) {
    const group = groups.find((g) => g.id === groupId);
    return Array.isArray(group?.subGroups) ? group.subGroups : [];
  }

  function fillSubGroupSelect(categoryId, selected) {
    if (!productSubgroup) return;
    const subs = groupSubGroups(categoryId).filter((sg) => isActiveRecord(sg));
    const selectedValue = selected || "";
    const options = [
      `<option value="">— Seçilmedi —</option>`,
      ...subs.map(
        (sg) =>
          `<option value="${escapeAttr(sg.name.tr)}"${
            sg.name.tr === selectedValue ? " selected" : ""
          }>${escapeHtml(sg.name.tr)}</option>`
      ),
    ];
    if (
      selectedValue &&
      !subs.some((sg) => sg.name.tr === selectedValue)
    ) {
      options.push(
        `<option value="${escapeAttr(selectedValue)}" selected>${escapeHtml(
          selectedValue
        )} (eski)</option>`
      );
    }
    productSubgroup.innerHTML = options.join("");
  }

  function renderSubGroupsEditor() {
    if (!groupSubgroupsEl) return;
    if (!editingSubGroups.length) {
      groupSubgroupsEl.innerHTML = `<p class="muted">Henüz alt grup yok.</p>`;
      return;
    }
    groupSubgroupsEl.innerHTML = editingSubGroups
      .map(
        (sg, index) => `
      <div class="subgroup-row" data-subgroup-index="${index}">
        <label>
          Türkçe
          <input type="text" data-sg-field="tr" value="${escapeAttr(
            sg.name?.tr || ""
          )}" maxlength="80" required />
        </label>
        <label>
          English
          <input type="text" data-sg-field="en" value="${escapeAttr(
            sg.name?.en || ""
          )}" maxlength="80" />
        </label>
        <label>
          العربية
          <input type="text" data-sg-field="ar" value="${escapeAttr(
            sg.name?.ar || ""
          )}" maxlength="80" dir="rtl" />
        </label>
        <label class="check">
          <input type="checkbox" data-sg-field="active"${
            sg.active !== false ? " checked" : ""
          } />
          Aktif
        </label>
        <button type="button" class="btn btn-danger sm" data-remove-subgroup="${index}">Sil</button>
      </div>`
      )
      .join("");
  }

  function syncSubGroupsFromEditor() {
    if (!groupSubgroupsEl) return editingSubGroups;
    editingSubGroups = [...groupSubgroupsEl.querySelectorAll(".subgroup-row")].map(
      (row, index) => {
        const tr = row.querySelector('[data-sg-field="tr"]')?.value.trim() || "";
        const en = row.querySelector('[data-sg-field="en"]')?.value.trim() || "";
        const ar = row.querySelector('[data-sg-field="ar"]')?.value.trim() || "";
        const active = Boolean(
          row.querySelector('[data-sg-field="active"]')?.checked
        );
        const prev = editingSubGroups[index] || {};
        return {
          id: prev.id || "",
          sort: Number.isFinite(Number(prev.sort)) ? Number(prev.sort) : index + 1,
          active,
          name: { tr, en: en || tr, ar: ar || tr },
        };
      }
    );
    return editingSubGroups;
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function productCover(product) {
    if (Array.isArray(product?.images) && product.images[0]) return product.images[0];
    return product?.image || "";
  }

  function productImagesOf(product) {
    if (Array.isArray(product?.images) && product.images.length) return [...product.images];
    if (product?.image) return [product.image];
    return [];
  }

  function setProductTab(tab) {
    document.querySelectorAll("[data-product-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-product-tab") === tab);
    });
    document.querySelectorAll("[data-product-panel]").forEach((panel) => {
      const on = panel.getAttribute("data-product-panel") === tab;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
  }

  function renderProductMedia() {
    if (!productKeepImages.length) {
      productMediaList.innerHTML = `<p class="muted">Henüz görsel yok.</p>`;
      return;
    }
    productMediaList.innerHTML = productKeepImages
      .map(
        (src, index) => `
      <div class="media-item">
        <img src="/${escapeAttr(src)}" alt="" />
        <button type="button" class="btn btn-ghost sm" data-remove-image="${index}">Kaldır</button>
      </div>`
      )
      .join("");
  }

  function openProductDialog(product) {
    productError.hidden = true;
    productForm.reset();
    editingProductId = product?.id || null;
    document.getElementById("product-id").value = product?.id || "";
    document.getElementById("product-name").value = product?.name || "";
    document.getElementById("product-meta").value = product?.meta || "";
    document.getElementById("product-description").value =
      product?.description || "";
    document.getElementById("product-seo-title").value =
      product?.seo?.title || "";
    document.getElementById("product-seo-description").value =
      product?.seo?.description || "";
    document.getElementById("product-seo-keywords").value =
      product?.seo?.keywords || "";
    document.getElementById("product-seo-slug").value = product?.seo?.slug || "";
    productActive.checked = product ? isActiveRecord(product) : true;
    const categoryId =
      product?.category || groups.find((g) => isActiveRecord(g))?.id;
    fillCategorySelect(categoryId);
    fillSubGroupSelect(categoryId, product?.subGroup || "");
    productKeepImages = productImagesOf(product);
    renderProductMedia();
    productDialogTitle.textContent = product ? "Düzenleme" : "Yeni kayıt ekle";
    productImagesInput.required = !product;
    productImageHint.textContent = product
      ? "Yeni dosya eklerseniz mevcutlara eklenir. İstemediğiniz mevcut görselleri kaldırın."
      : "En az 1 görsel zorunlu. Birden fazla seçebilirsiniz.";
    setProductTab("general");
    productDialog.showModal();
  }

  function openGroupDialog(group) {
    groupError.hidden = true;
    groupForm.reset();
    editingGroupId = group?.id || null;
    document.getElementById("group-original-id").value = group?.id || "";
    document.getElementById("group-id").value = group?.id || "";
    document.getElementById("group-id").disabled = Boolean(group);
    document.getElementById("group-sort").value = String(
      group?.sort || groups.length + 1
    );
    document.getElementById("group-name-tr").value = group?.name?.tr || "";
    document.getElementById("group-name-en").value = group?.name?.en || "";
    document.getElementById("group-name-ar").value = group?.name?.ar || "";
    document.getElementById("group-active").checked = group
      ? isActiveRecord(group)
      : true;
    editingSubGroups = Array.isArray(group?.subGroups)
      ? group.subGroups.map((sg, index) => ({
          id: sg.id || "",
          sort: Number.isFinite(Number(sg.sort)) ? Number(sg.sort) : index + 1,
          active: sg.active !== false,
          name: {
            tr: sg.name?.tr || "",
            en: sg.name?.en || "",
            ar: sg.name?.ar || "",
          },
        }))
      : [];
    renderSubGroupsEditor();
    groupDialogTitle.textContent = group ? "Düzenleme" : "Yeni kayıt ekle";
    groupDialog.showModal();
  }

  function openUserDialog(user) {
    userError.hidden = true;
    userForm.reset();
    editingUserId = user?.id || null;
    document.getElementById("user-id").value = user?.id || "";
    document.getElementById("user-name").value = user?.name || "";
    document.getElementById("user-email").value = user?.email || "";
    document.getElementById("user-role").value = user?.role || "admin";
    document.getElementById("user-active").checked = user
      ? isActiveRecord(user)
      : true;
    userPassword.value = "";
    userPassword.required = !user;
    userPasswordHint.textContent = user
      ? "Boş bırakılırsa şifre değişmez."
      : "En az 8 karakter.";
    userDialogTitle.textContent = user ? "Düzenleme" : "Yeni kayıt ekle";
    userDialog.showModal();
  }

  function renderProducts() {
    const visible = filterProductsBySearch(
      filterItems(products, filters.products)
    );
    productCount.textContent = `${visible.length} / ${products.length} ürün`;
    if (!visible.length) {
      productList.innerHTML = `<p class="empty">Bu filtrede / aramada kayıt yok.</p>`;
      return;
    }
    productList.innerHTML = visible
      .map((p) => {
        const cover = productCover(p);
        return `
      <article class="row" data-id="${escapeAttr(p.id)}">
        <img src="/${escapeAttr(cover)}" alt="${escapeAttr(p.name)}" />
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(groupLabel(p.category))}${
            p.subGroup ? " · " + escapeHtml(p.subGroup) : ""
          }${p.meta ? " · " + escapeHtml(p.meta) : ""}</p>
          <span class="badge${isActiveRecord(p) ? "" : " is-off"}">${
            isActiveRecord(p) ? "Aktif" : "Pasif"
          }</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost" data-edit-product="${escapeAttr(p.id)}">Düzenle</button>
          <button type="button" class="btn btn-danger" data-delete-product="${escapeAttr(p.id)}">Sil</button>
        </div>
      </article>`;
      })
      .join("");
  }

  function renderGroups() {
    const visible = filterItems(groups, filters.groups);
    groupCount.textContent = `${visible.length} / ${groups.length} grup`;
    if (!visible.length) {
      groupList.innerHTML = `<p class="empty">Bu filtrede kayıt yok.</p>`;
      return;
    }
    groupList.innerHTML = visible
      .map((g) => {
        const subs = Array.isArray(g.subGroups) ? g.subGroups : [];
        const subHtml = subs.length
          ? `<ul class="group-tree-item__subs">${subs
              .map(
                (sg) => `
            <li class="${isActiveRecord(sg) ? "" : "is-off"}">
              <span>${escapeHtml(sg.name?.tr || sg.id)}</span>
              <span class="muted">${isActiveRecord(sg) ? "" : "Pasif"}</span>
            </li>`
              )
              .join("")}</ul>`
          : `<p class="group-tree-item__meta">Alt grup yok</p>`;
        return `
      <article class="group-tree-item" data-id="${escapeAttr(g.id)}">
        <div class="group-tree-item__head">
          <div>
            <h3>${escapeHtml(g.name.tr)}</h3>
            <p class="group-tree-item__meta">${escapeHtml(g.id)} · sıra ${escapeHtml(
              String(g.sort)
            )} · ${subs.length} alt grup</p>
            <span class="badge${isActiveRecord(g) ? "" : " is-off"}">${
              isActiveRecord(g) ? "Aktif" : "Pasif"
            }</span>
          </div>
          <div class="row-actions">
            <button type="button" class="btn btn-ghost sm" data-edit-group="${escapeAttr(
              g.id
            )}">Düzenle</button>
            <button type="button" class="btn btn-danger sm" data-delete-group="${escapeAttr(
              g.id
            )}">Sil</button>
          </div>
        </div>
        ${subHtml}
      </article>`;
      })
      .join("");
  }

  function renderUsers() {
    const visible = filterItems(users, filters.users);
    userCount.textContent = `${visible.length} / ${users.length} kullanıcı`;
    if (!visible.length) {
      userList.innerHTML = `<p class="empty">Bu filtrede kayıt yok.</p>`;
      return;
    }
    userList.innerHTML = visible
      .map(
        (u) => `
      <article class="row row--plain" data-id="${escapeAttr(u.id)}">
        <div>
          <h3>${escapeHtml(u.name || u.email)}</h3>
          <p>${escapeHtml(u.email)} · ${escapeHtml(u.role || "admin")}</p>
          <span class="badge${isActiveRecord(u) ? "" : " is-off"}">${
            isActiveRecord(u) ? "Aktif" : "Pasif"
          }</span>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost" data-edit-user="${escapeAttr(u.id)}">Düzenle</button>
          <button type="button" class="btn btn-danger" data-delete-user="${escapeAttr(u.id)}">Sil</button>
        </div>
      </article>`
      )
      .join("");
  }

  function fillSettings(settings) {
    document.getElementById("settings-email").value = settings.email || "";
    document.getElementById("settings-phone").value = settings.phone || "";
    document.getElementById("settings-kep").value = settings.kep || "";
    document.getElementById("settings-web").value = settings.web || "";
    document.getElementById("settings-hq").value = settings.hq || "";
    document.getElementById("settings-warehouse").value = settings.warehouse || "";
    document.getElementById("settings-tax-office").value = settings.taxOffice || "";
    document.getElementById("settings-tax-number").value = settings.taxNumber || "";
    document.getElementById("settings-mersis").value = settings.mersis || "";
    document.getElementById("settings-footer-tag").value = settings.footerTagTr || "";
    document.getElementById("settings-hero-lead").value = settings.heroLeadTr || "";
    const ga = document.getElementById("settings-ga");
    if (ga) ga.value = settings.googleAnalyticsId || "";
    const gsc = document.getElementById("settings-gsc");
    if (gsc) gsc.value = settings.googleSiteVerification || "";
    const bing = document.getElementById("settings-bing");
    if (bing) bing.value = settings.bingSiteVerification || "";
  }

  async function loadCatalog() {
    const data = await api("/api/admin/products");
    products = data.products || [];
    groups = data.groups || [];
    renderProducts();
    renderGroups();
    fillCategorySelect();
  }

  async function loadSettings() {
    const data = await api("/api/admin/settings");
    fillSettings(data.settings || {});
  }

  async function loadInquiries() {
    const listEl = document.getElementById("inquiry-list");
    const countEl = document.getElementById("inquiry-count");
    if (!listEl) return;
    const data = await api("/api/admin/inquiries");
    const list = data.inquiries || [];
    if (countEl) countEl.textContent = list.length ? `${list.length} kayıt` : "";
    if (!list.length) {
      listEl.innerHTML = `<p class="muted">Henüz form gönderilmedi.</p>`;
      return;
    }
    listEl.innerHTML = list
      .map((item) => {
        const when = item.createdAt
          ? new Date(item.createdAt).toLocaleString("tr-TR")
          : "";
        const meta = [item.company, item.email, item.phone].filter(Boolean).join(" · ");
        return `<article class="inquiry">
          <div class="inquiry__head">
            <strong>${escapeHtml(item.name || "")}</strong>
            <time>${escapeHtml(when)}</time>
          </div>
          <p class="inquiry__meta">${escapeHtml(meta)}</p>
          <p class="inquiry__message">${escapeHtml(item.message || "")}</p>
        </article>`;
      })
      .join("");
  }

  async function loadUsers() {
    const data = await api("/api/admin/users");
    users = data.users || [];
    renderUsers();
  }

  function setView(view) {
    document.querySelectorAll(".nav__link").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-view") === view);
    });
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-view-panel") !== view;
    });
    const meta = pageMeta[view] || pageMeta.products;
    pageTitle.textContent = meta.title;
    pageDesc.textContent = meta.desc;
    const gotoGroups = document.getElementById("goto-groups");
    const gotoProducts = document.getElementById("goto-products");
    if (gotoGroups) gotoGroups.hidden = view !== "products";
    if (gotoProducts) gotoProducts.hidden = view !== "groups";
    if (view === "inquiries") {
      loadInquiries().catch((err) => flash(err.message, true));
    }
  }

  async function boot() {
    try {
      const session = await api("/api/admin/session");
      if (!session.ok) {
        location.replace("/admin/");
        return;
      }
      appView.hidden = false;
      await loadCatalog();
      await loadSettings();
      await loadUsers();
      setView("products");
    } catch (_) {
      location.replace("/admin/");
    }
  }

  logoutBtn.addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch (_) {}
    location.replace("/admin/");
  });

  document.querySelectorAll(".nav__link").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.getAttribute("data-view")));
  });

  document.getElementById("goto-groups")?.addEventListener("click", () => {
    setView("groups");
  });
  document.getElementById("goto-products")?.addEventListener("click", () => {
    setView("products");
  });

  function productsUsingGroup(id) {
    const group = groups.find((g) => g.id === id);
    const subIds = new Set(
      (Array.isArray(group?.subGroups) ? group.subGroups : []).map((sg) => sg.id)
    );
    return products.filter(
      (p) => p.category === id || (p.subGroup && subIds.has(p.subGroup))
    );
  }

  function showNotice(text) {
    const notice = document.getElementById("notice");
    const textEl = document.getElementById("notice-text");
    const ok = document.getElementById("notice-ok");
    if (!notice || !textEl || !ok) return Promise.resolve();
    textEl.textContent = text;
    notice.hidden = false;
    ok.focus();
    return new Promise((resolve) => {
      function close() {
        notice.hidden = true;
        ok.removeEventListener("click", close);
        notice.removeEventListener("click", onBackdrop);
        document.removeEventListener("keydown", onKey);
        resolve();
      }
      function onBackdrop(event) {
        if (event.target.closest("[data-notice-close]")) close();
      }
      function onKey(event) {
        if (event.key === "Escape" || event.key === "Enter") close();
      }
      ok.addEventListener("click", close);
      notice.addEventListener("click", onBackdrop);
      document.addEventListener("keydown", onKey);
    });
  }

  document.querySelectorAll(".filter-tabs").forEach((tabs) => {
    tabs.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-filter]");
      if (!btn) return;
      const group = tabs.getAttribute("data-filter-group");
      const filter = btn.getAttribute("data-filter");
      filters[group] = filter;
      tabs.querySelectorAll(".filter-tab").forEach((tab) => {
        tab.classList.toggle("is-active", tab === btn);
      });
      if (group === "products") renderProducts();
      if (group === "groups") renderGroups();
      if (group === "users") renderUsers();
    });
  });

  document.getElementById("product-new").addEventListener("click", () => {
    openProductDialog(null);
  });

  productSearch.addEventListener("input", () => {
    productSearchQuery = productSearch.value || "";
    renderProducts();
  });
  document.getElementById("group-new").addEventListener("click", () => {
    openGroupDialog(null);
  });
  document.getElementById("user-new").addEventListener("click", () => {
    openUserDialog(null);
  });

  document.getElementById("product-close").addEventListener("click", () => {
    closeDialog(productDialog);
  });
  document.getElementById("group-close").addEventListener("click", () => {
    closeDialog(groupDialog);
  });
  document.getElementById("user-close").addEventListener("click", () => {
    closeDialog(userDialog);
  });

  document.querySelectorAll("[data-product-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setProductTab(btn.getAttribute("data-product-tab"));
    });
  });

  productMediaList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove-image]");
    if (!btn) return;
    const index = Number(btn.getAttribute("data-remove-image"));
    if (!Number.isInteger(index)) return;
    productKeepImages.splice(index, 1);
    renderProductMedia();
  });

  productSeoAiBtn.addEventListener("click", async () => {
    productError.hidden = true;
    productSeoAiBtn.disabled = true;
    productSeoAiBtn.textContent = "Hazırlanıyor…";
    try {
      const data = await api("/api/admin/products/seo-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("product-name").value.trim(),
          category: productCategory.value,
          meta: document.getElementById("product-meta").value.trim(),
          description: document.getElementById("product-description").value.trim(),
        }),
      });
      const seo = data.seo || {};
      document.getElementById("product-seo-title").value = seo.title || "";
      document.getElementById("product-seo-description").value =
        seo.description || "";
      document.getElementById("product-seo-keywords").value = seo.keywords || "";
      document.getElementById("product-seo-slug").value = seo.slug || "";
      setProductTab("seo");
      flash(
        data.source === "openai"
          ? "SEO alanları yapay zeka ile dolduruldu."
          : "SEO alanları otomatik hazırlandı."
      );
    } catch (err) {
      productError.textContent = err.message;
      productError.hidden = false;
      flash(err.message, true);
    } finally {
      productSeoAiBtn.disabled = false;
      productSeoAiBtn.textContent = "Yapay zeka ile doldur";
    }
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    productError.hidden = true;
    const formData = new FormData(productForm);
    formData.delete("id");
    formData.set("active", productActive.checked ? "true" : "false");
    formData.set("keepImages", JSON.stringify(productKeepImages));
    formData.delete("images");
    const files = productImagesInput.files || [];
    for (const file of files) formData.append("images", file);
    if (!editingProductId && !files.length) {
      productError.textContent = "En az bir ürün görseli seçin.";
      productError.hidden = false;
      return;
    }
    if (editingProductId && !productKeepImages.length && !files.length) {
      productError.textContent = "En az bir ürün görseli gerekli.";
      productError.hidden = false;
      return;
    }
    try {
      if (editingProductId) {
        await api(`/api/admin/products/${encodeURIComponent(editingProductId)}`, {
          method: "PUT",
          body: formData,
        });
        flash("Ürün güncellendi.");
      } else {
        await api("/api/admin/products", { method: "POST", body: formData });
        flash("Ürün eklendi.");
      }
      closeDialog(productDialog);
      await loadCatalog();
    } catch (err) {
      productError.textContent = err.message;
      productError.hidden = false;
      flash(err.message, true);
    }
  });

  productList.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit-product]");
    const deleteBtn = event.target.closest("[data-delete-product]");
    if (editBtn) {
      const product = products.find(
        (p) => p.id === editBtn.getAttribute("data-edit-product")
      );
      if (product) openProductDialog(product);
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-delete-product");
      if (!id) return;
      if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
      try {
        await api(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        flash("Ürün silindi.");
        await loadCatalog();
      } catch (err) {
        flash(err.message, true);
      }
    }
  });

  productCategory.addEventListener("change", () => {
    fillSubGroupSelect(productCategory.value, productSubgroup?.value || "");
  });

  document.getElementById("subgroup-add")?.addEventListener("click", () => {
    syncSubGroupsFromEditor();
    editingSubGroups.push({
      id: "",
      sort: editingSubGroups.length + 1,
      active: true,
      name: { tr: "", en: "", ar: "" },
    });
    renderSubGroupsEditor();
  });

  groupSubgroupsEl?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove-subgroup]");
    if (!btn) return;
    syncSubGroupsFromEditor();
    const index = Number(btn.getAttribute("data-remove-subgroup"));
    if (!Number.isInteger(index)) return;
    editingSubGroups.splice(index, 1);
    renderSubGroupsEditor();
  });

  groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    groupError.hidden = true;
    const subGroups = syncSubGroupsFromEditor().filter((sg) => sg.name?.tr);
    const payload = {
      id: document.getElementById("group-id").value.trim(),
      sort: Number(document.getElementById("group-sort").value || 1),
      active: document.getElementById("group-active").checked,
      name: {
        tr: document.getElementById("group-name-tr").value.trim(),
        en: document.getElementById("group-name-en").value.trim(),
        ar: document.getElementById("group-name-ar").value.trim(),
      },
      subGroups,
    };
    try {
      if (editingGroupId) {
        await api(`/api/admin/groups/${encodeURIComponent(editingGroupId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        flash("Grup güncellendi.");
      } else {
        await api("/api/admin/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        flash("Grup eklendi.");
      }
      closeDialog(groupDialog);
      await loadCatalog();
    } catch (err) {
      groupError.textContent = err.message;
      groupError.hidden = false;
      flash(err.message, true);
    }
  });

  groupList.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit-group]");
    const deleteBtn = event.target.closest("[data-delete-group]");
    if (editBtn) {
      const group = groups.find(
        (g) => g.id === editBtn.getAttribute("data-edit-group")
      );
      if (group) openGroupDialog(group);
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-delete-group");
      if (!id) return;
      const used = productsUsingGroup(id);
      const name = groups.find((g) => g.id === id)?.name?.tr || id;
      if (used.length) {
        await showNotice(
          `"${name}" grubu ${used.length} üründe kayıtlı. Silmek için önce bu ürünleri başka bir gruba taşıyın veya silin.`
        );
        return;
      }
      try {
        await api(`/api/admin/groups/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        flash("Grup silindi.");
        await loadCatalog();
      } catch (err) {
        await showNotice(err.message || "Grup silinemedi.");
      }
    }
  });

  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    userError.hidden = true;
    const payload = {
      name: document.getElementById("user-name").value.trim(),
      email: document.getElementById("user-email").value.trim(),
      role: document.getElementById("user-role").value,
      active: document.getElementById("user-active").checked,
    };
    const password = userPassword.value;
    if (password) payload.password = password;
    try {
      if (editingUserId) {
        await api(`/api/admin/users/${encodeURIComponent(editingUserId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        flash("Kullanıcı güncellendi.");
      } else {
        if (!password) throw new Error("Yeni kullanıcı için şifre gerekli.");
        await api("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        flash("Kullanıcı eklendi.");
      }
      closeDialog(userDialog);
      await loadUsers();
    } catch (err) {
      userError.textContent = err.message;
      userError.hidden = false;
      flash(err.message, true);
    }
  });

  userList.addEventListener("click", async (event) => {
    const editBtn = event.target.closest("[data-edit-user]");
    const deleteBtn = event.target.closest("[data-delete-user]");
    if (editBtn) {
      const user = users.find(
        (u) => u.id === editBtn.getAttribute("data-edit-user")
      );
      if (user) openUserDialog(user);
      return;
    }
    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-delete-user");
      if (!id) return;
      if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
      try {
        await api(`/api/admin/users/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        flash("Kullanıcı silindi.");
        await loadUsers();
      } catch (err) {
        flash(err.message, true);
      }
    }
  });

  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      email: document.getElementById("settings-email").value.trim(),
      phone: document.getElementById("settings-phone").value.trim(),
      kep: document.getElementById("settings-kep").value.trim(),
      web: document.getElementById("settings-web").value.trim(),
      hq: document.getElementById("settings-hq").value.trim(),
      warehouse: document.getElementById("settings-warehouse").value.trim(),
      taxOffice: document.getElementById("settings-tax-office").value.trim(),
      taxNumber: document.getElementById("settings-tax-number").value.trim(),
      mersis: document.getElementById("settings-mersis").value.trim(),
      footerTagTr: document.getElementById("settings-footer-tag").value.trim(),
      heroLeadTr: document.getElementById("settings-hero-lead").value.trim(),
      googleAnalyticsId: document.getElementById("settings-ga")?.value.trim() || "",
      googleSiteVerification: document.getElementById("settings-gsc")?.value.trim() || "",
      bingSiteVerification: document.getElementById("settings-bing")?.value.trim() || "",
    };
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      flash("Site ayarları kaydedildi.");
    } catch (err) {
      flash(err.message, true);
    }
  });

  boot();
})();
