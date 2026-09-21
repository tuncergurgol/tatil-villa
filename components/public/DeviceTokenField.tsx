"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceToken } from "@/lib/device-token-client";

export default function DeviceTokenField() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(getOrCreateDeviceToken());
  }, []);

  return <input type="hidden" name="deviceToken" value={token} />;
}
