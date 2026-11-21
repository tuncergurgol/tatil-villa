(() => {
  if (window.location.pathname.startsWith("/admin")) return;

  const editable = (target) =>
    target &&
    target.closest &&
    target.closest("input, textarea, select, [contenteditable='true']");

  const lockMedia = (root) => {
    const scope = root && root.querySelectorAll ? root : document;
    if (scope.matches && scope.matches("img, video")) {
      scope.setAttribute("draggable", "false");
    }
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll("img, video").forEach((el) => {
      el.setAttribute("draggable", "false");
    });
  };

  document.addEventListener("contextmenu", (event) => {
    if (editable(event.target)) return;
    event.preventDefault();
  });

  document.addEventListener("dragstart", (event) => {
    if (editable(event.target)) return;
    event.preventDefault();
  });

  document.addEventListener("selectstart", (event) => {
    if (editable(event.target)) return;
    event.preventDefault();
  });

  document.addEventListener("copy", (event) => {
    if (editable(event.target)) return;
    event.preventDefault();
  });

  document.addEventListener("cut", (event) => {
    if (editable(event.target)) return;
    event.preventDefault();
  });

  document.addEventListener("keydown", (event) => {
    if (editable(event.target)) return;
    const key = String(event.key || "").toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;
    if (key === "s" || key === "u" || key === "p" || key === "c" || key === "a") {
      event.preventDefault();
    }
  });

  const boot = () => {
    lockMedia(document);
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches("img, video")) lockMedia(node.parentNode || document);
          else lockMedia(node);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
