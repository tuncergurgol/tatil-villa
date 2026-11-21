/**
 * Ev sahibi ödemeleri günlük mailinin test gönderimi.
 * Çalıştır: npx tsx scripts/send-owner-payment-test-mail.ts [YYYY-MM-DD]
 */
import {
  getIstanbulDateKey,
  getYesterdayIstanbulDateKey,
} from "../lib/booking-calendar-days";
import { sendOwnerPaymentDailyMail } from "../lib/daily-check-in-reports";

async function main() {
  const checkInDateKey = process.argv[2] || getYesterdayIstanbulDateKey();
  console.log(
    `Ev sahibi ödemeleri TEST maili gönderiliyor (giriş ${checkInDateKey})...`
  );

  const result = await sendOwnerPaymentDailyMail(checkInDateKey, {
    test: true,
    overdueBeforeDateKey: getIstanbulDateKey(),
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.emailSent) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
