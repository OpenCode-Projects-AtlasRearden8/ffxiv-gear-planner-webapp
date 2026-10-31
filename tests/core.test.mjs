import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const FGP = require(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "js", "core.js"));

function pldFixture() {
  const set = FGP.emptyGearSet("Paladin");
  set.ilvlTarget = 730;
  set.budgetCap = 20000;

  const melds = (arr) => arr;
  set.pieces.weapon.melds = melds([
    { stat: "crit", grade: "XII" },
    { stat: "crit", grade: "XI" },
    { stat: "det", grade: "XII" }
  ]);
  set.pieces.chest.melds = melds([
    { stat: "crit", grade: "XII", amount: 50 },
    { stat: "ten", grade: "X" }
  ]);
  set.pieces.head.melds = melds([
    { stat: "crit", grade: "IX", price: 999 }
  ]);
  set.pieces.chest.itemName = 'Ring "Pocket" of the Feast, XL';
  set.pieces.chest.ilvl = 699;
  set.pieces.chest.notes = "Book priority, comma, \"quotes\" and\nnewline";
  set.pieces.head.itemName = "Helm, Head Guard";
  set.pieces.head.ilvl = 700;
  set.pieces.head.owned = true;
  set.pieces.weapon.owned = true;
  set.pieces.off_hand.melds = [];
  return set;
}

test("sumMeldsByStat totals melds per stat", () => {
  const g = pldFixture();
  const totals = FGP.sumMeldsByStat(g);
  // weapon: crit XII (36) + crit XI (32) = 68; chest: crit override amount 50; head: crit IX (24) -> 142
  assert.equal(totals.crit, 142);
  assert.equal(totals.det, 36);
  assert.equal(totals.ten, 30);
  assert.equal(totals.pie, 0);
});

test("countMelds counts all planned melds", () => {
  const g = pldFixture();
  assert.equal(FGP.countMelds(g), 6);
  g.pieces.chest.melds = [];
  assert.equal(FGP.countMelds(g), 4);
});

test("meldCostTotal uses per-grade default prices", () => {
  const g = pldFixture();
  const expected = 19699;
  assert.equal(FGP.meldCostTotal(g), expected);
});

test("meldAmount honors per-meld override, falls back to grade default", () => {
  assert.equal(FGP.meldAmount({ stat: "crit", grade: "XII", amount: 50 }), 50);
  assert.equal(FGP.meldAmount({ stat: "crit", grade: "XI" }), 32);
  assert.equal(FGP.meldAmount({ stat: "crit", grade: "bogus" }), 0);
  assert.equal(FGP.meldAmount({ stat: "crit", grade: "XII", amount: -3 }), 36);
});

test("meldBudgetStatus flags over-budget", () => {
  const g = pldFixture();
  const status = FGP.meldBudgetStatus(g);
  // spent = 19699
  assert.equal(status.spent, 19699);
  assert.equal(status.cap, 20000);
  assert.equal(status.overBudget, false);
  assert.equal(status.remaining, 301);
  g.budgetCap = 10000;
  const over = FGP.meldBudgetStatus(g);
  assert.equal(over.overBudget, true);
  assert.equal(over.remaining, -9699);
});

test("statProgress computes goal diffs", () => {
  const g = pldFixture();
  g.statGoals = { crit: 100, det: 40, ten: 10, pie: 5 };
  const prog = FGP.statProgress(g);
  assert.equal(prog.crit.goal, 100);
  assert.equal(prog.crit.melded, 142);
  assert.equal(prog.crit.diff, 42);
  assert.equal(prog.det.diff, -4);
  assert.equal(prog.ten.diff, 20);
  assert.equal(prog.pie.diff, -5);
});

test("averageIlvl averages only pieces with positive ilvl", () => {
  const g = pldFixture();
  g.pieces.weapon.ilvl = 730;
  g.pieces.chest.ilvl = 699;
  g.pieces.head.ilvl = 700;
  assert.equal(FGP.averageIlvl(g), Math.round(((730 + 699 + 700) / 3) * 100) / 100);
  assert.equal(FGP.averageIlvl(FGP.emptyGearSet("Machinist")), 0);
});

test("csvField quotes and escapes only when needed", () => {
  assert.equal(FGP.csvField("plain"), "plain");
  assert.equal(FGP.csvField('say "hi"'), '"say ""hi"""');
  assert.equal(FGP.csvField("a,b"), '"a,b"');
  assert.equal(FGP.csvField("line\nbreak"), '"line\nbreak"');
  assert.equal(FGP.csvField(730), "730");
  assert.equal(FGP.csvField(null), "");
});

test("toCsv emits header + quoted rows with CRLF", () => {
  const csv = FGP.toCsv(
    ["a", "b"],
    [["one", 'x"y'], ["two", "three"]]
  );
  assert.equal(csv, 'a,b\r\none,"x""y"\r\ntwo,three\r\n');
});

test("shoppingListCsv lists only unowned pieces", () => {
  const g = pldFixture();
  const rows = FGP.shoppingList(g);
  // owned: weapon, head. Unowned named+ilvl pieces: chest, ring2 (empty), etc.
  const names = rows.map((r) => r.item_name);
  assert.deepEqual(names, ['Ring "Pocket" of the Feast, XL']);
  const csv = FGP.shoppingListCsv(g);
  assert.ok(csv.startsWith("job,slot,item_name,ilvl,sources,notes\r\n"));
  assert.ok(csv.includes('"Ring ""Pocket"" of the Feast, XL"'));
  assert.ok(!csv.includes("Helm, Head Guard"));
  assert.ok(csv.includes("730") === false); // weapon owned, excluded
  assert.ok(csv.endsWith("\r\n"));
});

test("shoppingListCsv includes source labels and notes", () => {
  const g = pldFixture();
  g.pieces.chest.sources = ["raid", "alliance"];
  const csv = FGP.shoppingListCsv(g);
  assert.ok(csv.includes("Raid | Alliance Raid"));
  assert.ok(csv.includes('"Book priority, comma, ""quotes"" and\nnewline"'));
});

test("fullSetCsv includes every slot, melds, and owned flag", () => {
  const g = pldFixture();
  g.pieces.weapon.sources = ["raid"];
  const csv = FGP.fullSetCsv(g);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 13);
  assert.ok(lines[0].includes("owned"));
  assert.ok(csv.includes("yes"));
  assert.ok(csv.includes("Critical Hit +36 (XII)"));
  assert.ok(csv.includes("Critical Hit +50 (XII)"));
  assert.ok(csv.includes("Helm, Head Guard"));
});

test("samplePldSet is a complete, valid PLD plan", () => {
  const s = FGP.samplePldSet();
  assert.equal(s.job, "Paladin");
  FGP.SLOTS.forEach((sl) => {
    assert.ok(s.pieces[sl.id], "missing slot " + sl.id);
  });
  assert.ok(s.pieces.weapon.itemName.length > 0);
  assert.ok(s.pieces.weapon.owned);
  assert.ok(s.budgetCap > 0);
  const status = FGP.meldBudgetStatus(s);
  assert.ok(status.spent > 0);
  const totals = FGP.sumMeldsByStat(s);
  assert.ok(totals.crit > 0);
});
