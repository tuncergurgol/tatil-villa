"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  deleteBiletallRoute,
  saveBiletallRoute,
} from "@/app/actions/admin/biletall-settings";
import { buildBiletallIframeSrc, getBiletallAdminLinks } from "@/lib/biletall";
import {
  DEFAULT_BILETALL_ROUTES,
  isDefaultBiletallRoute,
  type BiletallRouteRecord,
} from "@/lib/biletall-routes";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100";

type BiletallRoutesEditorProps = {
  routes: BiletallRouteRecord[];
  portalSlug: string;
  username: string;
};

type RouteEditFormProps = {
  item: ReturnType<typeof getBiletallAdminLinks>[number];
  routeRecord: BiletallRouteRecord;
  routes: BiletallRouteRecord[];
  portalSlug: string;
  username: string;
  isPending: boolean;
  onCancel: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

function RouteEditForm({
  item,
  routeRecord,
  routes,
  portalSlug,
  username,
  isPending,
  onCancel,
  onSaved,
  onError,
}: RouteEditFormProps) {
  const [label, setLabel] = useState(routeRecord.label);
  const [publicPath, setPublicPath] = useState(routeRecord.publicPath);
  const [callbackPath, setCallbackPath] = useState(routeRecord.callbackPath);
  const [iframeSrc, setIframeSrc] = useState(
    routeRecord.customIframeSrc?.trim() || item.iframeSrc
  );
  const [iframeManual, setIframeManual] = useState(
    Boolean(routeRecord.customIframeSrc?.trim())
  );

  const draftRoutes = useMemo(
    () =>
      routes.map((route) =>
        route.kind === item.kind
          ? { ...route, label, publicPath, callbackPath }
          : route
      ),
    [routes, item.kind, label, publicPath, callbackPath]
  );

  const computedIframeSrc = useMemo(
    () =>
      buildBiletallIframeSrc(
        item.kind,
        portalSlug,
        { username },
        draftRoutes
      ),
    [item.kind, portalSlug, username, draftRoutes]
  );

  useEffect(() => {
    if (!iframeManual) {
      setIframeSrc(computedIframeSrc);
    }
  }, [computedIframeSrc, iframeManual]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError("");

    const formData = new FormData();
    formData.set("kind", item.kind);
    formData.set("label", label);
    formData.set("publicPath", publicPath);
    formData.set("callbackPath", callbackPath);
    formData.set(
      "customIframeSrc",
      iframeSrc.trim() !== computedIframeSrc.trim() ? iframeSrc.trim() : ""
    );

    const result = await saveBiletallRoute({}, formData);
    if (result.error) {
      onError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Başlık
          </span>
          <input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className={inputClass}
            autoComplete="off"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Public path
          </span>
          <input
            name="publicPath"
            value={publicPath}
            onChange={(event) => setPublicPath(event.target.value)}
            className={inputClass}
            placeholder="/bilet/ara"
            autoComplete="off"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">
            Biletall callback path
          </span>
          <input
            name="callbackPath"
            value={callbackPath}
            onChange={(event) => setCallbackPath(event.target.value)}
            className={inputClass}
            placeholder="bilet/ara"
            autoComplete="off"
            required
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-500">
          Iframe URL
        </span>
        <textarea
          name="customIframeSrc"
          value={iframeSrc}
          onChange={(event) => {
            setIframeManual(true);
            setIframeSrc(event.target.value);
          }}
          rows={3}
          spellCheck={false}
          className={`${inputClass} font-mono text-xs leading-relaxed`}
          placeholder="https://iframe.biletall.com/..."
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Bu alana doğrudan yazabilirsiniz. Path alanlarını değiştirdiğinizde
          URL otomatik güncellenir; elle düzenlediyseniz korunur.
        </p>
        {iframeManual ? (
          <button
            type="button"
            onClick={() => {
              setIframeManual(false);
              setIframeSrc(computedIframeSrc);
            }}
            className="mt-2 text-xs font-semibold text-sky-700 hover:text-sky-900"
          >
            Otomatik URL&apos;ye dön
          </button>
        ) : null}
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

export default function BiletallRoutesEditor({
  routes,
  portalSlug,
  username,
}: BiletallRoutesEditorProps) {
  const router = useRouter();
  const [editingKind, setEditingKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const links = getBiletallAdminLinks(portalSlug, { username }, routes);

  function handleDelete(kind: BiletallRouteRecord["kind"], label: string) {
    if (
      !window.confirm(`"${label}" kaydı varsayılan değerlere sıfırlansın mı?`)
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteBiletallRoute(kind);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditingKind(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Public route & iframe URL&apos;leri
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Biletall callback parametreleri site içi path&apos;lerle eşleşir. Iframe
        URL satırına doğrudan yazabilirsiniz.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {links.map((item) => {
          const isEditing = editingKind === item.kind;
          const routeRecord =
            routes.find((route) => route.kind === item.kind) ??
            DEFAULT_BILETALL_ROUTES.find((route) => route.kind === item.kind)!;
          const isCustom = !isDefaultBiletallRoute(routeRecord);

          return (
            <li
              key={item.kind}
              className="rounded-xl border border-gray-100 bg-slate-50/80 p-4"
            >
              {isEditing ? (
                <RouteEditForm
                  item={item}
                  routeRecord={routeRecord}
                  routes={routes}
                  portalSlug={portalSlug}
                  username={username}
                  isPending={isPending}
                  onCancel={() => setEditingKind(null)}
                  onSaved={() => {
                    setEditingKind(null);
                    router.refresh();
                  }}
                  onError={setError}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.label}
                        </p>
                        {isCustom ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Özel
                          </span>
                        ) : null}
                      </div>
                      <Link
                        href={item.publicPath}
                        className="mt-1 inline-flex text-sm font-medium text-sky-700 hover:text-sky-900"
                        target="_blank"
                      >
                        {item.publicPath} ↗
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingKind(item.kind)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Değiştir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.kind, item.label)}
                        disabled={isPending || !isCustom}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Callback:{" "}
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-gray-700">
                      {item.callbackPath}
                    </code>
                  </p>
                  <p className="mt-2 break-all font-mono text-xs leading-relaxed text-gray-600">
                    {item.iframeSrc}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
