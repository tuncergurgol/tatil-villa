"use client";

import { Download, ImageIcon } from "lucide-react";
import { PUBLIC_BRAND_ASSET_GROUPS } from "@/lib/public-brand-assets";

export default function BrandAssetDownloads() {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Site logoları
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Public sitelerde kullanılan marka görsellerini buradan indirebilirsiniz.
            Tatildeyiz logosu Şirket → Logo &amp; Görseller sekmesinden yönetilir.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {PUBLIC_BRAND_ASSET_GROUPS.map((group) => (
          <div
            key={group.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                {group.label}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">{group.domain}</p>
            </div>

            <div className="mb-4 flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={group.assets[0]?.path}
                alt={`${group.label} logo`}
                className="max-h-14 w-auto max-w-full object-contain"
              />
            </div>

            <ul className="space-y-2">
              {group.assets.map((asset) => (
                <li key={asset.path}>
                  <a
                    href={asset.path}
                    download={asset.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    <span>{asset.label}</span>
                    <Download className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
