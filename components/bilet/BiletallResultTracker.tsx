"use client";

import { useEffect, useRef } from "react";

type Props = {
  query: Record<string, string>;
};

function buildDedupeKey(query: Record<string, string>) {
  return Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export default function BiletallResultTracker({ query }: Props) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    const dedupeKey = buildDedupeKey(query);
    if (!dedupeKey) return;

    const storageKey = `obilet-inquiry:${dedupeKey}`;
    if (sessionStorage.getItem(storageKey)) return;

    sentRef.current = true;
    fetch("/api/obilet/inquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(storageKey, "1");
      })
      .catch(() => {
        sentRef.current = false;
      });
  }, [query]);

  return null;
}
