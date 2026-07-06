"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { FileText, Save, Trash2, UploadCloud, X } from "lucide-react";
import { uploadCompanyAsset } from "@/app/actions/admin/company-assets";
import {
  clearVillaDocument,
  getVillaDocumentData,
  saveVillaDocument,
  type VillaDocumentActionState,
} from "@/app/actions/admin/villa-document";
import {
  combineDocumentNo,
  inferKonutBelgesiType,
  KONUT_BELGE_NO_PREFIXES,
  parseDocumentNoParts,
  TOURISM_DOCUMENT_TYPES,
} from "@/lib/villa-document-types";
import type { TourismDocumentType } from "@prisma/client";

interface VillaDocumentModalProps {
  villaId: string;
  villaName: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function VillaDocumentModal({
  villaId,
  villaName,
  onClose,
  onSaved,
}: VillaDocumentModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [documentImageUrl, setDocumentImageUrl] = useState("");
  const [documentType, setDocumentType] = useState<TourismDocumentType | "">("");
  const [ownerName, setOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("");
  const [bedCapacity, setBedCapacity] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [documentNoPrefix, setDocumentNoPrefix] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [isClearing, startClear] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<
    VillaDocumentActionState,
    FormData
  >(saveVillaDocument, {});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getVillaDocumentData(villaId);
        if (cancelled) return;
        if (!data) {
          setLoadError("Villa bulunamadı");
          return;
        }
        const loadedType = data.documentType ?? "";
        const loadedDocumentNo = data.documentNo ?? "";
        const { prefix, number } = parseDocumentNoParts(loadedDocumentNo);
        const inferredType = inferKonutBelgesiType(loadedDocumentNo);

        setDocumentType(loadedType || inferredType || "");
        setOwnerName(data.documentOwnerName);
        setAddress(data.documentAddress);
        setRoomCapacity(String(data.documentRoomCapacity ?? ""));
        setBedCapacity(String(data.documentBedCapacity ?? ""));
        setDocumentImageUrl(data.documentImageUrl);
        setDocumentNoPrefix(prefix);
        setDocumentNumber(number);
        setDocumentNo(loadedDocumentNo);
      } catch {
        if (!cancelled) setLoadError("Belge bilgileri yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [villaId]);

  useEffect(() => {
    const combined = combineDocumentNo(documentNoPrefix, documentNumber);
    setDocumentNo(combined);

    if (!documentType && inferKonutBelgesiType(combined)) {
      setDocumentType("KONUT_BELGESI");
    }
  }, [documentNoPrefix, documentNumber, documentType]);

  useEffect(() => {
    if (state.success) {
      onSaved?.();
      onClose();
    }
  }, [state.success, onClose, onSaved]);

  function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "villaDocument");

    startUpload(async () => {
      const result = await uploadCompanyAsset(formData);
      if (result.success) {
        setDocumentImageUrl(result.url);
      } else {
        setUploadError(result.error);
      }
    });
  }

  function handleClear() {
    if (!window.confirm("Turizm izin belgesi bilgileri temizlensin mi?")) return;
    setClearError(null);
    startClear(async () => {
      const result = await clearVillaDocument(villaId);
      if (result.error) {
        setClearError(result.error);
        return;
      }
      onSaved?.();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              Turizm İzin Belgesi
            </h2>
            <button
              type="button"
              onClick={handleClear}
              disabled={isClearing || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Temizle
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-gray-500">
            Yükleniyor...
          </div>
        ) : loadError ? (
          <div className="px-6 py-16 text-center text-sm text-red-600">
            {loadError}
          </div>
        ) : (
          <form action={formAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="villaId" value={villaId} />
            <input type="hidden" name="documentImageUrl" value={documentImageUrl} />
            <input type="hidden" name="documentNo" value={documentNo} />

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <p className="text-sm text-gray-500">{villaName}</p>

              {(state.error || clearError || uploadError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {state.error || clearError || uploadError}
                </div>
              )}

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Belge Bilgileri
                </h3>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Belge Türü <span className="text-red-500">*</span>
                  </span>
                  <select
                    name="documentType"
                    required
                    value={documentType}
                    onChange={(e) =>
                      setDocumentType(e.target.value as TourismDocumentType)
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Seçiniz</option>
                    {TOURISM_DOCUMENT_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Belge No
                    </span>
                    <select
                      value={documentNoPrefix}
                      onChange={(event) => setDocumentNoPrefix(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Seçiniz</option>
                      {KONUT_BELGE_NO_PREFIXES.map((prefix) => (
                        <option key={prefix} value={prefix}>
                          {prefix}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Belge Numarası
                    </span>
                    <input
                      value={documentNumber}
                      onChange={(event) => setDocumentNumber(event.target.value)}
                      placeholder="Örn. 8041"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Ev & Sahip Bilgileri
                </h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Belge Sahibi Adı
                    </span>
                    <input
                      name="documentOwnerName"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Ev Adresi
                    </span>
                    <input
                      name="documentAddress"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Oda Kapasitesi
                      </span>
                      <input
                        name="documentRoomCapacity"
                        type="number"
                        min={0}
                        required
                        value={roomCapacity}
                        onChange={(e) => setRoomCapacity(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Yatak Kapasitesi
                      </span>
                      <input
                        name="documentBedCapacity"
                        type="number"
                        min={0}
                        required
                        value={bedCapacity}
                        onChange={(e) => setBedCapacity(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Belge Görseli
                </h3>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-60"
                >
                  {documentImageUrl ? (
                    <div className="w-full space-y-3">
                      {documentImageUrl.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-700">
                          <FileText className="h-5 w-5" />
                          PDF yüklendi
                        </div>
                      ) : (
                        <div className="relative mx-auto h-40 w-full max-w-xs overflow-hidden rounded-xl border border-gray-200">
                          <Image
                            src={documentImageUrl}
                            alt="Belge görseli"
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="text-center text-xs text-gray-500">
                        Değiştirmek için tıklayın
                      </p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mb-3 h-10 w-10 text-indigo-500" />
                      <p className="text-sm font-medium text-gray-700">
                        PDF veya resim dosyası yükleyin
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Tıklayarak dosya seçin
                      </p>
                    </>
                  )}
                </button>
              </section>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDocumentImageUrl("");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Belgeyi Sil
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {pending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
