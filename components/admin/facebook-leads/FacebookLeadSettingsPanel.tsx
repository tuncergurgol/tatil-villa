"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Save } from "lucide-react";
import { updateFacebookLeadSettingsAction } from "@/app/actions/admin/facebook-leads";

type Props = {
  enabled: boolean;
  appId: string;
  appSecret: string;
  verifyToken: string;
  pageId: string;
  pageAccessToken: string;
  webhookUrl: string;
};

export default function FacebookLeadSettingsPanel({
  enabled,
  appId,
  appSecret,
  verifyToken,
  pageId,
  pageAccessToken,
  webhookUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function copyText(key: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <form
      className="space-y-5 rounded-2xl border border-blue-200 bg-blue-50/40 p-5"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          await updateFacebookLeadSettingsAction(formData);
          setMessage("Ayarlar kaydedildi.");
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="text-base font-bold text-gray-900">Facebook Bağlantısı</h2>
        <p className="mt-1 text-sm text-gray-600">
          Meta Business → Uygulama → Webhooks → Page → leadgen aboneliği.
          Callback URL ve verify token aşağıdadır.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <input
          type="checkbox"
          name="facebookLeadEnabled"
          defaultChecked={enabled}
          className="rounded border-gray-300"
        />
        Facebook Lead entegrasyonu aktif
      </label>

      <div className="rounded-xl border border-blue-100 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Webhook URL
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-800">
              {webhookUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyText("webhook", webhookUrl)}
            className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
          >
            {copied === "webhook" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Verify Token
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-800">
              {verifyToken || "(Kayıtta otomatik oluşturulur)"}
            </p>
          </div>
          {verifyToken ? (
            <button
              type="button"
              onClick={() => copyText("token", verifyToken)}
              className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
            >
              {copied === "token" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
        <input type="hidden" name="facebookLeadVerifyToken" value={verifyToken} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">App ID</span>
          <input
            name="facebookLeadAppId"
            defaultValue={appId}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="Meta App ID"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">App Secret</span>
          <input
            name="facebookLeadAppSecret"
            type="password"
            defaultValue={appSecret}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            placeholder="Webhook imza doğrulama"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Page ID</span>
          <input
            name="facebookLeadPageId"
            defaultValue={pageId}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-gray-700">Page Access Token</span>
          <textarea
            name="facebookLeadPageAccessToken"
            defaultValue={pageAccessToken}
            rows={3}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 font-mono text-xs"
            placeholder="Lead verisini çekmek için pages_manage_ads / leads_retrieval izinli token"
          />
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-xs leading-relaxed text-gray-600">
        <p className="flex items-center gap-1.5 font-semibold text-gray-800">
          <Link2 className="h-3.5 w-3.5" />
          Meta kurulum özeti
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>developers.facebook.com → Uygulamanız → Webhooks → Page</li>
          <li>Callback URL ve Verify Token yukarıdaki değerler</li>
          <li>leadgen alanına abone olun</li>
          <li>Lead Ads formu oluşturun ve sayfaya bağlayın</li>
        </ol>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Kaydediliyor…" : "Bağlantı ayarlarını kaydet"}
        </button>
        {message ? (
          <span className="text-sm font-medium text-emerald-700">{message}</span>
        ) : null}
      </div>
    </form>
  );
}
