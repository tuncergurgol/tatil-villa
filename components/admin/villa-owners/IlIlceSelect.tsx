"use client";

import { useMemo, useState } from "react";
import {
  getDistrictsByProvince,
  getProvinceByMernisCode,
  type TurkeyProvince,
} from "@/lib/mernis-ilce";

interface IlIlceSelectProps {
  provinces: TurkeyProvince[];
  defaultMernisCode?: string | null;
  disabled?: boolean;
}

export default function IlIlceSelect({
  provinces,
  defaultMernisCode,
  disabled = false,
}: IlIlceSelectProps) {
  const initialProvince = getProvinceByMernisCode(defaultMernisCode);

  return (
    <IlIlceSelectInner
      key={`${defaultMernisCode ?? "new"}-${disabled}`}
      provinces={provinces}
      initialIlKodu={initialProvince?.ilKodu ?? null}
      defaultMernisCode={defaultMernisCode ?? ""}
      disabled={disabled}
    />
  );
}

function IlIlceSelectInner({
  provinces,
  initialIlKodu,
  defaultMernisCode,
  disabled,
}: {
  provinces: TurkeyProvince[];
  initialIlKodu: number | null;
  defaultMernisCode: string;
  disabled: boolean;
}) {
  const [ilKodu, setIlKodu] = useState<number | "">(initialIlKodu ?? "");
  const [districtCode, setDistrictCode] = useState(defaultMernisCode);

  const districts = useMemo(
    () => (typeof ilKodu === "number" ? getDistrictsByProvince(ilKodu) : []),
    [ilKodu]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-xs font-medium text-gray-500">İl</span>
        <select
          value={ilKodu}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value;
            setIlKodu(value ? Number(value) : "");
            setDistrictCode("");
          }}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        >
          <option value="">İl seçin</option>
          {provinces.map((province) => (
            <option key={province.ilKodu} value={province.ilKodu}>
              {province.ilAdi}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-500">İlçe</span>
        <select
          name="mernisIlceCode"
          value={districtCode}
          disabled={disabled || !ilKodu}
          onChange={(e) => setDistrictCode(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        >
          <option value="">İlçe seçin</option>
          {districts.map((district) => (
            <option key={district.code} value={district.code}>
              {district.ilceAdi}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
