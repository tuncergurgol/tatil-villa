import { getRequestClientIp } from "@/lib/request-client-ip";
import { verifySimpleCaptcha } from "@/lib/simple-captcha";
import {
  isTurnstileConfigured,
  verifyTurnstileToken,
} from "@/lib/turnstile";

export type PublicBotChallengeResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Potansiyel müşteriyi kaçırmadan bot engeli:
 * Turnstile varsa görünmez/esnek widget; yoksa basit toplama sorusu.
 */
export async function assertPublicBotChallenge(
  formData: FormData | null | undefined
): Promise<PublicBotChallengeResult> {
  if (isTurnstileConfigured()) {
    const clientIp = await getRequestClientIp();
    return verifyTurnstileToken(
      String(formData?.get("cfTurnstileToken") ?? ""),
      clientIp
    );
  }

  return verifySimpleCaptcha(
    String(formData?.get("simpleCaptchaToken") ?? ""),
    String(formData?.get("simpleCaptchaAnswer") ?? "")
  );
}
