import assert from "node:assert/strict";
import {
  buildInferredConfirm,
  extractRelativeStay,
  extractShorthandParty,
  processFlowStep,
  setAssistantRegionCatalog,
} from "../lib/tatil-assistant-flow";
import type { AssistantSearchState } from "../lib/tatil-assistant-types";

const now = new Date(2026, 10, 19);
const phrase =
  "temmuzun ilk cumartesinden başlayıp bir sonraki cuma çıkmak istiyorum";
const expectedQuestion =
  "03 Temmuz 2027 Cumartesi Günü girişli 09 Temmuz 2027 Cuma günü çıkışlı 6 Gece doğru mudur";

function firstSaturday(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const offset = (6 - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset);
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const july2027 = firstSaturday(2027, 6);
assert.equal(july2027.getDay(), 6);
assert.equal(dateKey(july2027), "2027-07-03");

const stay = extractRelativeStay(phrase, now);
assert.equal(stay?.checkIn, "2027-07-03");
assert.equal(stay?.checkOut, "2027-07-09");
assert.equal(new Date(2027, 6, 9).getDay(), 5);

const onTheDay = extractRelativeStay(phrase, new Date(2027, 6, 3));
assert.equal(onTheDay?.checkIn, "2027-07-03");

const afterFirstSaturday = extractRelativeStay(phrase, new Date(2027, 6, 4));
const july2028 = firstSaturday(2028, 6);
assert.equal(afterFirstSaturday?.checkIn, dateKey(july2028));
assert.ok(dateKey(july2028) > "2027-07-04");

assert.equal(extractRelativeStay("temmuzun ilk cumartesi", now), null);
assert.equal(extractShorthandParty("6 yetişkin 2 çocuk"), null);
assert.deepEqual(extractShorthandParty("6 y 2 ç"), { adults: 6, children: 2 });
assert.deepEqual(extractShorthandParty("6y 2c"), { adults: 6, children: 2 });

setAssistantRegionCatalog([
  {
    id: "kayakoy",
    parentId: null,
    level: "ILCE",
    name: "Kayaköy",
    slug: "kayakoy",
  },
  {
    id: "mugla",
    parentId: null,
    level: "IL",
    name: "Muğla",
    slug: "mugla",
  },
]);

const opened: AssistantSearchState = { guestName: "Vedat", helpAsked: true };

const party = processFlowStep("6 y 2 ç villa arıyorum kayaköyden", opened, undefined, now);
assert.equal(party.handled, true);
if (party.handled) {
  assert.equal(party.reply, "6 yetişkin, 2 çocuk, Kayaköy bölgesi doğru mudur");
  assert.equal(party.state.adults, undefined);
  assert.equal(party.state.regionSlugs, undefined);
  assert.equal(party.state.pendingConfirm?.adults, 6);
  assert.equal(party.state.pendingConfirm?.children, 2);
  assert.deepEqual(party.state.pendingConfirm?.regionSlugs, ["kayakoy"]);

  const accepted = processFlowStep("evet", party.state, undefined, now);
  assert.equal(accepted.handled, true);
  if (accepted.handled) {
    assert.equal(accepted.state.adults, 6);
    assert.equal(accepted.state.children, 2);
    assert.equal(accepted.state.babies, 0);
    assert.equal(accepted.state.countsCollected, true);
    assert.deepEqual(accepted.state.regionSlugs, ["kayakoy"]);
    assert.equal(accepted.state.pendingConfirm, undefined);
    assert.match(accepted.reply, /Hangi tarihlerde konaklamak istiyorsunuz/);

    const dates = processFlowStep(phrase, accepted.state, undefined, now);
    assert.equal(dates.handled, true);
    if (dates.handled) {
      assert.equal(dates.reply, expectedQuestion);
      assert.equal(dates.state.checkIn, undefined);
      assert.equal(dates.state.adults, 6);
      assert.doesNotMatch(dates.reply, /hizmet veremiyoruz/);

      const confirmed = processFlowStep("evet", dates.state, undefined, now);
      assert.equal(confirmed.handled, true);
      if (confirmed.handled) {
        assert.equal(confirmed.state.checkIn, "2027-07-03");
        assert.equal(confirmed.state.checkOut, "2027-07-09");
        assert.match(confirmed.reply, /Aile mi, arkadaş grubu mu/);
      }

      const rejected = processFlowStep("hayır", dates.state, undefined, now);
      assert.equal(rejected.handled, true);
      if (rejected.handled) {
        assert.equal(rejected.state.checkIn, undefined);
        assert.equal(rejected.state.pendingConfirm, undefined);
        assert.match(rejected.reply, /Tarihi tam anlayamadım/);
      }
    }
  }
}

const directDate = processFlowStep(phrase, opened, undefined, now);
assert.equal(directDate.handled, true);
if (directDate.handled) {
  assert.equal(directDate.reply, expectedQuestion);
  assert.doesNotMatch(directDate.reply, /hizmet veremiyoruz/);
}

const spelled = processFlowStep("6 yetişkin 2 çocuk", {
  guestName: "Vedat",
  helpAsked: true,
  checkIn: "2026-08-01",
  checkOut: "2026-08-08",
}, undefined, now);
assert.equal(spelled.handled, true);
if (spelled.handled) {
  assert.equal(spelled.state.pendingConfirm, undefined);
  assert.equal(spelled.state.adults, 6);
  assert.equal(spelled.state.children, 2);
  assert.doesNotMatch(spelled.reply, /doğru mudur/);
}

const outside = processFlowStep("parisden villa bakıyorum", opened, undefined, now);
assert.equal(outside.handled, true);
if (outside.handled) {
  assert.match(outside.reply, /Paris/);
  assert.match(outside.reply, /hizmet veremiyoruz/);
}

assert.equal(buildInferredConfirm(phrase, now)?.question, expectedQuestion);

const friday = new Date(2026, 10, 20);
const weekendPhrase =
  "Cumartesi giriş Pazar çıkış 1 gecelik 2 kişilik müsait villa";
const weekendQuestion =
  "21 Kasım 2026 Cumartesi Günü girişli 22 Kasım 2026 Pazar günü çıkışlı 1 Gece doğru mudur";

const weekend = extractRelativeStay(weekendPhrase, friday);
assert.equal(weekend?.checkIn, "2026-11-21");
assert.equal(weekend?.checkOut, "2026-11-22");
assert.equal(
  extractRelativeStay("Cumartesi giriş Pazar çıkış 1 gecelik 2 kişilik müsaitliğ", friday)
    ?.checkIn,
  "2026-11-21"
);

const saturday = new Date(2026, 10, 21);
assert.equal(
  extractRelativeStay("cumartesi giriş pazar çıkış", saturday)?.checkIn,
  "2026-11-21"
);
assert.equal(
  extractRelativeStay("cuma giriş 2 gecelik", friday)?.checkOut,
  "2026-11-22"
);
assert.equal(extractRelativeStay("cumartesi ve pazar villa", friday), null);

const weekendTurn = processFlowStep(
  weekendPhrase,
  { guestName: "Vedat", helpAsked: true },
  undefined,
  friday
);
assert.equal(weekendTurn.handled, true);
if (weekendTurn.handled) {
  assert.equal(weekendTurn.reply, weekendQuestion);
  assert.equal(weekendTurn.state.checkIn, undefined);
  assert.equal(weekendTurn.state.provisionalGuests, 2);
  assert.doesNotMatch(weekendTurn.reply, /Tarihi tam anlayamadım/);

  const acceptedWeekend = processFlowStep("evet", weekendTurn.state, undefined, friday);
  assert.equal(acceptedWeekend.handled, true);
  if (acceptedWeekend.handled) {
    assert.equal(acceptedWeekend.state.checkIn, "2026-11-21");
    assert.equal(acceptedWeekend.state.checkOut, "2026-11-22");
    assert.equal(acceptedWeekend.state.provisionalGuests, 2);
    assert.match(acceptedWeekend.reply, /Aile mi, arkadaş grubu mu/);
  }
}

setAssistantRegionCatalog([]);
console.log("assistant relative stay smoke ok");
