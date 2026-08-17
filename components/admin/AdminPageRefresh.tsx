"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "admin:refresh-after-save";

let pendingSaveRefresh = false;
let fetchPatchCount = 0;
let originalFetch: typeof window.fetch | null = null;
let onServerActionSettled: (() => void) | null = null;

function isNextServerAction(
  input: RequestInfo | URL,
  init?: RequestInit
): boolean {
  const sources: Array<Headers | HeadersInit | undefined> = [init?.headers];
  if (input instanceof Request) sources.push(input.headers);

  for (const headers of sources) {
    if (!headers) continue;
    if (headers instanceof Headers) {
      if (headers.has("Next-Action") || headers.has("next-action")) return true;
      continue;
    }
    if (Array.isArray(headers)) {
      if (headers.some(([key]) => key.toLowerCase() === "next-action")) {
        return true;
      }
      continue;
    }
    if (
      Object.keys(headers as Record<string, unknown>).some(
        (key) => key.toLowerCase() === "next-action"
      )
    ) {
      return true;
    }
  }

  return false;
}

function patchFetch() {
  if (fetchPatchCount === 0) {
    originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const isAction = isNextServerAction(input, init);
      const response = await originalFetch!(input, init);
      if (isAction) onServerActionSettled?.();
      return response;
    };
  }
  fetchPatchCount += 1;
  return () => {
    fetchPatchCount = Math.max(0, fetchPatchCount - 1);
    if (fetchPatchCount === 0 && originalFetch) {
      window.fetch = originalFetch;
      originalFetch = null;
    }
  };
}

function markPendingSaveRefresh() {
  pendingSaveRefresh = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, window.location.pathname);
  } catch {
    /* ignore quota / private mode */
  }
}

function isSaveControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, [type='submit']");
  if (!control || control.closest("[data-no-page-refresh]")) return false;
  if ("disabled" in control && (control as HTMLButtonElement).disabled) {
    return false;
  }

  const label = (
    control instanceof HTMLInputElement
      ? control.value
      : (control.textContent ?? "")
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");

  if (
    !label ||
    label.includes("kaydediliyor") ||
    label.includes("güncelleniyor")
  ) {
    return false;
  }
  return /\bkaydet\b/.test(label) || label === "güncelle";
}

function isPageTitleHeading(target: EventTarget | null): HTMLHeadingElement | null {
  if (!(target instanceof Element)) return null;
  const heading = target.closest("h1");
  if (!(heading instanceof HTMLHeadingElement)) return null;
  if (heading.closest("[data-no-page-refresh], a, button, [role='dialog']")) {
    return null;
  }
  return heading;
}

export function useRefreshOnActionSuccess(success: boolean | undefined) {
  const router = useRouter();
  useEffect(() => {
    if (success) router.refresh();
  }, [success, router]);
}

export default function AdminPageRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    try {
      const savedFrom = sessionStorage.getItem(STORAGE_KEY);
      if (savedFrom && savedFrom !== pathname) {
        sessionStorage.removeItem(STORAGE_KEY);
        router.refresh();
      }
    } catch {
      /* ignore */
    }

    document.querySelectorAll(".admin-dashboard h1").forEach((heading) => {
      if (heading.closest("[data-no-page-refresh], a, button, [role='dialog']")) {
        return;
      }
      if (!heading.getAttribute("title")) {
        heading.setAttribute("title", "Sayfayı yenile");
      }
    });
  }, [pathname, router]);

  useEffect(() => {
    onServerActionSettled = () => {
      if (!pendingSaveRefresh) return;
      pendingSaveRefresh = false;
      routerRef.current.refresh();
    };

    const unpatch = patchFetch();

    function onClick(event: MouseEvent) {
      if (isSaveControl(event.target)) {
        markPendingSaveRefresh();
        return;
      }

      const heading = isPageTitleHeading(event.target);
      if (!heading) return;

      event.preventDefault();
      routerRef.current.refresh();
    }

    function onSubmit(event: SubmitEvent) {
      if (isSaveControl(event.submitter) || isSaveControl(event.target)) {
        markPendingSaveRefresh();
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);

    return () => {
      onServerActionSettled = null;
      unpatch();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
