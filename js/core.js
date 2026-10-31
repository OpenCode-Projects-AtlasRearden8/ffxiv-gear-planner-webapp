"use strict";

var FGP = (function () {
  var SLOTS = [
    { id: "weapon", label: "Weapon" },
    { id: "off_hand", label: "Off Hand" },
    { id: "head", label: "Head" },
    { id: "chest", label: "Chest" },
    { id: "hands", label: "Hands" },
    { id: "legs", label: "Legs" },
    { id: "feet", label: "Feet" },
    { id: "earrings", label: "Earrings" },
    { id: "necklace", label: "Necklace" },
    { id: "bracelets", label: "Bracelets" },
    { id: "ring1", label: "Ring 1" },
    { id: "ring2", label: "Ring 2" }
  ];

  var STATS = ["crit", "dhit", "det", "vit", "pie", "sks", "sps", "ten"];

  var STAT_LABELS = {
    crit: "Critical Hit",
    dhit: "Direct Hit",
    det: "Determination",
    vit: "Vitality",
    pie: "Piety",
    sks: "Skill Speed",
    sps: "Spell Speed",
    ten: "Tenacity"
  };

  var SOURCES = ["hunt", "raid", "alliance", "craft", "purchased", "other"];

  var SOURCE_LABELS = {
    hunt: "Hunt",
    raid: "Raid",
    alliance: "Alliance Raid",
    craft: "Crafted",
    purchased: "Purchased",
    other: "Other"
  };

  var MATERIA_GRADES = ["XII", "XI", "X", "IX"];

  var MATERIA_DEFAULTS = {
    XII: { amount: 36, price: 5000 },
    XI: { amount: 32, price: 2500 },
    X: { amount: 30, price: 1200 },
    IX: { amount: 24, price: 600 }
  };

  function newPiece(slotId) {
    return {
      slot: slotId,
      itemName: "",
      ilvl: 0,
      owned: false,
      sources: [],
      notes: "",
      melds: []
    };
  }

  function emptyGearSet(jobName) {
    var pieces = {};
    SLOTS.forEach(function (s) { pieces[s.id] = newPiece(s.id); });
    return {
      job: jobName,
      ilvlTarget: 0,
      budgetCap: 0,
      notes: "",
      statGoals: {},
      pieces: pieces
    };
  }

  function pieceIlvlValid(p) {
    return typeof p.ilvl === "number" && isFinite(p.ilvl) && p.ilvl > 0;
  }

  function averageIlvl(gearSet) {
    var total = 0;
    var count = 0;
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (p && pieceIlvlValid(p)) {
        total += p.ilvl;
        count += 1;
      }
    });
    if (count === 0) return 0;
    return Math.round((total / count) * 100) / 100;
  }

  function meldAmount(meld) {
    var amt = MATERIA_DEFAULTS[meld.grade] ? MATERIA_DEFAULTS[meld.grade].amount : 0;
    if (typeof meld.amount === "number" && isFinite(meld.amount) && meld.amount > 0) {
      amt = meld.amount;
    }
    return amt;
  }

  function meldPrice(meld) {
    var base = MATERIA_DEFAULTS[meld.grade] ? MATERIA_DEFAULTS[meld.grade].price : 0;
    if (typeof meld.price === "number" && isFinite(meld.price) && meld.price >= 0) {
      base = meld.price;
    }
    return base;
  }

  function sumMeldsByStat(gearSet) {
    var totals = {};
    STATS.forEach(function (st) { totals[st] = 0; });
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (!p) return;
      (p.melds || []).forEach(function (m) {
        if (m && totals.hasOwnProperty(m.stat)) {
          totals[m.stat] += meldAmount(m);
        }
      });
    });
    return totals;
  }

  function countMelds(gearSet) {
    var n = 0;
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (p && p.melds) n += p.melds.length;
    });
    return n;
  }

  function meldCostTotal(gearSet) {
    var cost = 0;
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (!p) return;
      (p.melds || []).forEach(function (m) {
        cost += meldPrice(m);
      });
    });
    return cost;
  }

  function meldBudgetStatus(gearSet) {
    var spent = meldCostTotal(gearSet);
    var cap = typeof gearSet.budgetCap === "number" ? gearSet.budgetCap : 0;
    return {
      spent: spent,
      cap: cap,
      remaining: cap - spent,
      overBudget: cap > 0 && spent > cap
    };
  }

  function statProgress(gearSet, meldTotals) {
    meldTotals = meldTotals || sumMeldsByStat(gearSet);
    var out = {};
    STATS.forEach(function (st) {
      var goal = gearSet.statGoals && typeof gearSet.statGoals[st] === "number"
        ? gearSet.statGoals[st]
        : 0;
      var have = meldTotals[st] || 0;
      out[st] = {
        goal: goal,
        melded: have,
        diff: have - goal
      };
    });
    return out;
  }

  function normalizeSources(sources) {
    if (!Array.isArray(sources)) return [];
    return sources.filter(function (src) {
      return SOURCES.indexOf(src) !== -1;
    });
  }

  function shoppingList(gearSet) {
    var rows = [];
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (!p || p.owned) return;
      if (!p.itemName && !pieceIlvlValid(p)) return;
      rows.push({
        job: gearSet.job,
        slot: s.label,
        item_name: p.itemName || "(unnamed)",
        ilvl: pieceIlvlValid(p) ? p.ilvl : "",
        sources: normalizeSources(p.sources),
        notes: p.notes || ""
      });
    });
    return rows;
  }

  function csvField(value) {
    var str = value === null || value === undefined ? "" : String(value);
    if (/[",\r\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function toCsv(header, rows) {
    var lines = [header.map(csvField).join(",")];
    rows.forEach(function (row) {
      lines.push(row.map(csvField).join(","));
    });
    return lines.join("\r\n") + "\r\n";
  }

  function shoppingListCsv(gearSet) {
    var rows = shoppingList(gearSet).map(function (r) {
      return [
        r.job,
        r.slot,
        r.item_name,
        r.ilvl,
        r.sources.map(function (src) { return SOURCE_LABELS[src]; }).join(" | "),
        r.notes
      ];
    });
    return toCsv(
      ["job", "slot", "item_name", "ilvl", "sources", "notes"],
      rows
    );
  }

  function fullSetCsv(gearSet) {
    var rows = [];
    SLOTS.forEach(function (s) {
      var p = gearSet.pieces[s.id];
      if (!p) return;
      var meldText = (p.melds || []).map(function (m) {
        var amt = meldAmount(m);
        return STAT_LABELS[m.stat] + " +" + amt + " (" + (m.grade || "?") + ")";
      }).join(" / ");
      rows.push([
        gearSet.job,
        s.label,
        p.itemName || "",
        pieceIlvlValid(p) ? p.ilvl : "",
        p.owned ? "yes" : "no",
        normalizeSources(p.sources).map(function (src) { return SOURCE_LABELS[src]; }).join(" | "),
        meldText,
        p.notes || ""
      ]);
    });
    return toCsv(
      ["job", "slot", "item_name", "ilvl", "owned", "sources", "melds", "notes"],
      rows
    );
  }

  function samplePldSet() {
    var set = emptyGearSet("Paladin");
    set.ilvlTarget = 730;
    set.budgetCap = 750000;
    set.notes = "Sample loadout with placeholder item names. Edit item names, ILVLs, sources, and melds to match your own server market. Materia prices are assumptions you can override per-meld.";
    set.statGoals = { crit: 1800, dhit: 400, det: 1440, vit: 0, pie: 0, sks: 400, sps: 0, ten: 360 };
    var p = set.pieces;

    p.weapon = {
      slot: "weapon", itemName: "Aegis-Armiger's Sword (sample)", ilvl: 730, owned: true,
      sources: ["raid"], notes: "Beast/echo placeholder - replace with your actual weapon.",
      melds: [
        { stat: "crit", grade: "XII" },
        { stat: "crit", grade: "XI" },
        { stat: "det", grade: "X" }
      ]
    };
    p.off_hand = {
      slot: "off_hand", itemName: "Aegis-Armiger's Shield (sample)", ilvl: 730, owned: true,
      sources: ["raid"], notes: "", melds: [{ stat: "ten", grade: "XII" }]
    };
    p.head = {
      slot: "head", itemName: "Aegis Helm of Fending (sample)", ilvl: 720, owned: false,
      sources: ["hunt"], notes: "Sacks of Nuts weekly - plan 2 clears.", melds: [{ stat: "crit", grade: "XI" }]
    };
    p.chest = {
      slot: "chest", itemName: "Aegis Cuirass of Fending (sample)", ilvl: 730, owned: false,
      sources: ["raid"], notes: "Savage book priority #1.", melds: [{ stat: "crit", grade: "XII" }]
    };
    p.hands = {
      slot: "hands", itemName: "Aegis Gauntlets of Fending (sample)", ilvl: 720, owned: true,
      sources: ["hunt"], notes: "", melds: []
    };
    p.legs = {
      slot: "legs", itemName: "Aegis Breeches of Fending (sample)", ilvl: 720, owned: false,
      sources: ["hunt"], notes: "", melds: [{ stat: "det", grade: "XI" }]
    };
    p.feet = {
      slot: "feet", itemName: "Aegis Sabatons of Fending (sample)", ilvl: 720, owned: true,
      sources: ["hunt"], notes: "", melds: []
    };
    p.earrings = {
      slot: "earrings", itemName: "Aegis Earrings of Fending (sample)", ilvl: 710, owned: false,
      sources: ["alliance"], notes: "Alliance raid coin/bonus.", melds: [{ stat: "crit", grade: "X" }]
    };
    p.necklace = {
      slot: "necklace", itemName: "Aegis Choker of Fending (sample)", ilvl: 710, owned: false,
      sources: ["alliance"], notes: "", melds: []
    };
    p.bracelets = {
      slot: "bracelets", itemName: "Aegis Bracelets of Fending (sample)", ilvl: 710, owned: false,
      sources: ["craft"], notes: "Market board, crafted HQ.", melds: [{ stat: "det", grade: "X" }]
    };
    p.ring1 = {
      slot: "ring1", itemName: "Aegis Ring of Fending (sample)", ilvl: 720, owned: true,
      sources: ["hunt"], notes: "", melds: [{ stat: "crit", grade: "XI" }]
    };
    p.ring2 = {
      slot: "ring2", itemName: "Warded Rings of Fending (sample)", ilvl: 700, owned: false,
      sources: ["purchased"], notes: "Placeholder second ring.", melds: []
    };
    return set;
  }

  return {
    SLOTS: SLOTS,
    STATS: STATS,
    STAT_LABELS: STAT_LABELS,
    SOURCES: SOURCES,
    SOURCE_LABELS: SOURCE_LABELS,
    MATERIA_GRADES: MATERIA_GRADES,
    MATERIA_DEFAULTS: MATERIA_DEFAULTS,
    newPiece: newPiece,
    emptyGearSet: emptyGearSet,
    averageIlvl: averageIlvl,
    meldAmount: meldAmount,
    meldPrice: meldPrice,
    sumMeldsByStat: sumMeldsByStat,
    countMelds: countMelds,
    meldCostTotal: meldCostTotal,
    meldBudgetStatus: meldBudgetStatus,
    statProgress: statProgress,
    shoppingList: shoppingList,
    csvField: csvField,
    toCsv: toCsv,
    shoppingListCsv: shoppingListCsv,
    fullSetCsv: fullSetCsv,
    samplePldSet: samplePldSet
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = FGP;
}
