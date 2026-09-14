"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import {
  getMemberFavoriteVillaIdsAction,
  toggleMemberFavoriteVillaAction,
} from "@/app/actions/member-favorites";

type MemberFavoriteButtonProps = {
  villaId: string;
  variant?: "pill" | "icon";
  className?: string;
};

export default function MemberFavoriteButton({
  villaId,
  variant = "icon",
  className = "",
}: MemberFavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getMemberFavoriteVillaIdsAction().then((ids) => {
      if (!active) return;
      setFavorited(ids.includes(villaId));
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [villaId]);

  function handleClick() {
    startTransition(async () => {
      const result = await toggleMemberFavoriteVillaAction(villaId);
      if (result.needsLogin) {
        router.push(`/uye?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (result.error) return;
      if (typeof result.favorited === "boolean") {
        setFavorited(result.favorited);
      }
    });
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready || pending}
        className={`inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-md backdrop-blur hover:bg-white disabled:opacity-60 ${className}`}
        aria-pressed={favorited}
      >
        <Heart
          className={`h-4 w-4 ${
            favorited ? "fill-rose-500 text-rose-500" : "text-slate-700"
          }`}
        />
        {favorited ? "Beğenildi" : "Favori"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready || pending}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-sm transition hover:text-rose-500 disabled:opacity-60 ${className}`}
      aria-label={favorited ? "Favorilerden çıkar" : "Favorilere ekle"}
      aria-pressed={favorited}
    >
      <Heart
        className={`h-4 w-4 ${favorited ? "fill-rose-500 text-rose-500" : ""}`}
      />
    </button>
  );
}
