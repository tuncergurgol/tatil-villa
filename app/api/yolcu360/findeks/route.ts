import { NextResponse } from "next/server";
import {
  findeksCheck,
  findeksPhoneList,
  findeksPinConfirm,
  findeksPinRenew,
  findeksReport,
} from "@/lib/yolcu360/client";
import { getYolcu360Settings } from "@/lib/yolcu360/settings";
import { yolcu360JsonError, parseJsonBody } from "@/lib/yolcu360/api-helpers";

export async function POST(request: Request) {
  try {
    const settings = await getYolcu360Settings();
    if (!settings.enabled || !settings.publicEnabled) {
      return NextResponse.json({ error: "Servis kullanılamıyor" }, { status: 503 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const body = await parseJsonBody<Record<string, string>>(request);

    switch (action) {
      case "check":
        return NextResponse.json(
          await findeksCheck(body.identityNumber, body.integrationCode)
        );
      case "phone-list":
        return NextResponse.json(
          await findeksPhoneList(body.identityNumber, body.integrationCode)
        );
      case "report":
        return NextResponse.json(await findeksReport(body));
      case "pin-confirm":
        await findeksPinConfirm(
          body.findeksCode,
          body.pinCode,
          body.integrationCode
        );
        return NextResponse.json({ ok: true });
      case "pin-renew":
        await findeksPinRenew(body.findeksCode, body.integrationCode);
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Geçersiz findeks action" }, { status: 400 });
    }
  } catch (error) {
    return yolcu360JsonError(error, "Findeks işlemi başarısız");
  }
}
