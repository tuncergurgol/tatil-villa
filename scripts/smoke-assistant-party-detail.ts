import assert from "node:assert/strict";
import { processFlowStep } from "../lib/tatil-assistant-flow";
import type { AssistantSearchState } from "../lib/tatil-assistant-types";

function partyState(total: number): AssistantSearchState {
  return {
    guestName: "Ayse Yilmaz",
    helpAsked: true,
    checkIn: "2026-08-10",
    checkOut: "2026-08-17",
    provisionalGuests: total,
    partyKind: "friends",
  };
}

const splitLines = processFlowStep("2\nyetişkin", partyState(2));
assert.equal(splitLines.handled, true);
if (splitLines.handled) {
  assert.equal(splitLines.state.adults, 2);
  assert.equal(splitLines.state.children, 0);
  assert.equal(splitLines.state.babies, 0);
  assert.equal(splitLines.state.countsCollected, true);
  assert.match(splitLines.reply, /Hangi bölgede/);
}

const firstFragment = processFlowStep("2", partyState(2));
assert.equal(firstFragment.handled, true);
if (firstFragment.handled) {
  assert.equal(firstFragment.state.pendingPartyCount, 2);
  assert.equal(firstFragment.state.provisionalGuests, 2);
  assert.equal(firstFragment.state.countsCollected, undefined);
  assert.match(firstFragment.reply, /yetişkin mi, çocuk mu, bebek mi/);

  const secondFragment = processFlowStep("yetişkin", firstFragment.state, "2");
  assert.equal(secondFragment.handled, true);
  if (secondFragment.handled) {
    assert.equal(secondFragment.state.adults, 2);
    assert.equal(secondFragment.state.children, 0);
    assert.equal(secondFragment.state.babies, 0);
    assert.equal(secondFragment.state.countsCollected, true);
    assert.match(secondFragment.reply, /Hangi bölgede/);
  }
}

const shortGroup = processFlowStep("2 yetişkin", partyState(4));
assert.equal(shortGroup.handled, true);
if (shortGroup.handled) {
  assert.equal(shortGroup.state.adults, 2);
  assert.equal(shortGroup.state.children, undefined);
  assert.equal(shortGroup.state.babies, undefined);
  assert.equal(shortGroup.state.countsCollected, false);
  assert.equal(shortGroup.state.provisionalGuests, 4);
  assert.match(shortGroup.reply, /Kalan 2 kişi için çocuk ve bebek sayısını/);

  const rest = processFlowStep("1 çocuk 1 bebek", shortGroup.state);
  assert.equal(rest.handled, true);
  if (rest.handled) {
    assert.equal(rest.state.adults, 2);
    assert.equal(rest.state.children, 1);
    assert.equal(rest.state.babies, 1);
    assert.equal(rest.state.countsCollected, true);
    assert.match(rest.reply, /Hangi bölgede/);
  }
}

const separateShort = processFlowStep("yetişkin", partyState(4), "2");
assert.equal(separateShort.handled, true);
if (separateShort.handled) {
  assert.equal(separateShort.state.adults, 2);
  assert.equal(separateShort.state.provisionalGuests, 4);
  assert.match(separateShort.reply, /Kalan 2 kişi için çocuk ve bebek sayısını/);
}

const guests = processFlowStep("2", {
  guestName: "Ayse Yilmaz",
  helpAsked: true,
  checkIn: "2026-08-10",
  checkOut: "2026-08-17",
});
assert.equal(guests.handled, true);
if (guests.handled) {
  assert.equal(guests.state.provisionalGuests, 2);
  assert.match(guests.reply, /Aile mi, arkadaş grubu mu/);

  const pair = processFlowStep("aile", guests.state);
  assert.equal(pair.handled, true);
  if (pair.handled) {
    assert.equal(pair.state.adults, 2);
    assert.equal(pair.state.children, 0);
    assert.equal(pair.state.babies, 0);
    assert.equal(pair.state.countsCollected, true);
    assert.match(pair.reply, /Hangi bölgede/);
    assert.doesNotMatch(pair.reply, /Yetişkin, çocuk ve bebek/);
  }
}

const fullSplit = processFlowStep("2\nyetişkin\n1\nçocuk\n1\nbebek", partyState(4));
assert.equal(fullSplit.handled, true);
if (fullSplit.handled) {
  assert.equal(fullSplit.state.adults, 2);
  assert.equal(fullSplit.state.children, 1);
  assert.equal(fullSplit.state.babies, 1);
  assert.equal(fullSplit.state.countsCollected, true);
  assert.match(fullSplit.reply, /Hangi bölgede/);
}

const childrenFill = processFlowStep("2 çocuk", shortGroup.handled ? shortGroup.state : partyState(4));
assert.equal(childrenFill.handled, true);
if (childrenFill.handled) {
  assert.equal(childrenFill.state.adults, 2);
  assert.equal(childrenFill.state.children, 2);
  assert.equal(childrenFill.state.babies, 0);
  assert.equal(childrenFill.state.countsCollected, true);
}

console.log("assistant party detail smoke ok");
