"use strict";

(function () {
  var F = window.FGP;
  var STORAGE_KEY = "ffxiv-gear-planner-v1";

  var state = {
    jobs: {},
    currentJob: ""
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) throw new Error("no state");
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.jobs) throw new Error("bad state");
      state = parsed;
      if (!state.jobs[state.currentJob]) {
        state.currentJob = Object.keys(state.jobs)[0] || "";
      }
    } catch (e) {
      var sample = F.samplePldSet();
      state = { jobs: {}, currentJob: "Paladin" };
      state.jobs[sample.job] = sample;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      toast("Could not save: " + e.message);
    }
  }

  function currentSet() {
    return state.jobs[state.currentJob];
  }

  function fmtGil(n) {
    return n.toLocaleString("en-US");
  }

  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function downloadCsv(filename, csvText) {
    var blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast("Exported " + filename + (csvText.trim().length ? "" : " (empty set)"));
  }

  function slug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function renderJobSelect() {
    var sel = document.getElementById("job-select");
    sel.innerHTML = "";
    Object.keys(state.jobs).sort().forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === state.currentJob) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = Object.keys(state.jobs).length === 0;
  }

  function buildSelect(options, labels, selected) {
    var sel = document.createElement("select");
    options.forEach(function (optVal) {
      var o = document.createElement("option");
      o.value = optVal;
      o.textContent = labels[optVal] || optVal;
      if (optVal === selected || selected === undefined) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  function renderStatGoals() {
    var set = currentSet();
    var host = document.getElementById("stat-goals");
    host.innerHTML = "";
    F.STATS.forEach(function (st) {
      var row = document.createElement("div");
      row.className = "stat-goal-row";
      var lbl = document.createElement("label");
      lbl.htmlFor = "goal-" + st;
      lbl.textContent = F.STAT_LABELS[st];
      var inp = document.createElement("input");
      inp.id = "goal-" + st;
      inp.type = "number";
      inp.min = "0";
      inp.value = (set.statGoals && typeof set.statGoals[st] === "number") ? set.statGoals[st] : "";
      inp.addEventListener("input", function () {
        var v = parseInt(inp.value, 10);
        set.statGoals[st] = isNaN(v) ? 0 : v;
        saveState();
        renderTotals();
      });
      row.appendChild(lbl);
      row.appendChild(inp);
      host.appendChild(row);
    });
  }

  function renderMeldRow(piece, meld, index, slotId) {
    var row = document.createElement("div");
    row.className = "meld-row";

    var statSel = buildSelect(F.STATS, F.STAT_LABELS, meld.stat);
    statSel.addEventListener("change", function () {
      meld.stat = statSel.value;
      saveState();
      renderTotals();
    });
    row.appendChild(statSel);

    var gradeSel = buildSelect(F.MATERIA_GRADES, {}, meld.grade);
    gradeSel.addEventListener("change", function () {
      meld.grade = gradeSel.value;
      meld.amount = F.MATERIA_DEFAULTS[gradeSel.value].amount;
      if (amountInput) amountInput.value = meld.amount;
      saveState();
      renderTotals();
    });
    row.appendChild(gradeSel);

    var amountInput = document.createElement("input");
    amountInput.className = "amt";
    amountInput.type = "number";
    amountInput.min = "1";
    amountInput.value = F.meldAmount(meld);
    amountInput.title = "Stat amount granted (default per grade: " +
      F.MATERIA_DEFAULTS[meld.grade].amount + ")";
    amountInput.addEventListener("input", function () {
      var v = parseInt(amountInput.value, 10);
      meld.amount = isNaN(v) ? 0 : v;
      saveState();
      renderTotals();
    });
    row.appendChild(amountInput);

    var priceLabel = document.createElement("span");
    priceLabel.className = "muted";
    priceLabel.textContent = fmtGil(F.meldPrice(meld)) + " gil";
    row.appendChild(priceLabel);

    var rm = document.createElement("button");
    rm.className = "icon-x";
    rm.type = "button";
    rm.textContent = "\u00d7";
    rm.title = "Remove meld";
    rm.addEventListener("click", function () {
      piece.melds.splice(index, 1);
      saveState();
      renderPieces();
      renderTotals();
    });
    row.appendChild(rm);
    return row;
  }

  function renderPieces() {
    var set = currentSet();
    var host = document.getElementById("piece-list");
    host.innerHTML = "";
    F.SLOTS.forEach(function (slot) {
      var piece = set.pieces[slot.id];
      var card = document.createElement("div");
      card.className = "piece-card " + (piece.owned ? "owned" : "missing");
      card.dataset.slot = slot.id;

      var main = document.createElement("div");
      main.className = "piece-main";

      var cSlot = document.createElement("div");
      cSlot.className = "col slot-label";
      var slotLbl = document.createElement("label");
      slotLbl.textContent = slot.label;
      slotLbl.style.marginTop = "0";
      cSlot.appendChild(slotLbl);

      var cItem = document.createElement("div");
      cItem.className = "col item";
      var itemLbl = document.createElement("label");
      itemLbl.textContent = "Item name";
      var itemInp = document.createElement("input");
      itemInp.type = "text";
      itemInp.value = piece.itemName;
      itemInp.placeholder = "(unnamed)";
      itemInp.addEventListener("input", function () {
        piece.itemName = itemInp.value;
        saveState();
        renderTotals();
      });
      cItem.appendChild(itemLbl);
      cItem.appendChild(itemInp);

      var cIlvl = document.createElement("div");
      cIlvl.className = "col ilvl";
      var ilvlLbl = document.createElement("label");
      ilvlLbl.textContent = "ILVL";
      var ilvlInp = document.createElement("input");
      ilvlInp.type = "number";
      ilvlInp.min = "0";
      ilvlInp.value = piece.ilvl || "";
      ilvlInp.addEventListener("input", function () {
        var v = parseInt(ilvlInp.value, 10);
        piece.ilvl = isNaN(v) ? 0 : v;
        saveState();
        renderTotals();
      });
      cIlvl.appendChild(ilvlLbl);
      cIlvl.appendChild(ilvlInp);

      var cOwned = document.createElement("div");
      cOwned.className = "col owned-box";
      var ownWrap = document.createElement("div");
      ownWrap.className = "owned-check";
      var ownCb = document.createElement("input");
      ownCb.type = "checkbox";
      ownCb.checked = !!piece.owned;
      ownCb.id = "owned-" + slot.id;
      ownCb.addEventListener("change", function () {
        piece.owned = ownCb.checked;
        card.className = "piece-card " + (piece.owned ? "owned" : "missing");
        saveState();
        renderTotals();
      });
      var ownLbl = document.createElement("label");
      ownLbl.htmlFor = ownCb.id;
      ownLbl.textContent = "Owned";
      ownLbl.style.marginTop = "0";
      ownWrap.appendChild(ownCb);
      ownWrap.appendChild(ownLbl);
      cOwned.appendChild(ownWrap);

      var cNotes = document.createElement("div");
      cNotes.className = "col notes";
      var notesLbl = document.createElement("label");
      notesLbl.textContent = "Notes";
      var notesInp = document.createElement("input");
      notesInp.type = "text";
      notesInp.value = piece.notes;
      notesInp.placeholder = "source, priority notes\u2026";
      notesInp.addEventListener("input", function () {
        piece.notes = notesInp.value;
        saveState();
        renderTotals();
      });
      cNotes.appendChild(notesLbl);
      cNotes.appendChild(notesInp);

      main.appendChild(cSlot);
      main.appendChild(cItem);
      main.appendChild(cIlvl);
      main.appendChild(cOwned);
      main.appendChild(cNotes);
      card.appendChild(main);

      var srcGrid = document.createElement("div");
      srcGrid.className = "sources-grid";
      F.SOURCES.forEach(function (src) {
        var wrap = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = piece.sources.indexOf(src) !== -1;
        cb.addEventListener("change", function () {
          if (cb.checked) {
            if (piece.sources.indexOf(src) === -1) piece.sources.push(src);
          } else {
            piece.sources = piece.sources.filter(function (s) { return s !== src; });
          }
          saveState();
          renderTotals();
        });
        wrap.appendChild(cb);
        wrap.appendChild(document.createTextNode(" " + F.SOURCE_LABELS[src]));
        srcGrid.appendChild(wrap);
      });
      card.appendChild(srcGrid);

      var meldHost = document.createElement("div");
      meldHost.className = "meld-list";
      piece.melds.forEach(function (meld, i) {
        meldHost.appendChild(renderMeldRow(piece, meld, i, slot.id));
      });

      var addMeld = document.createElement("button");
      addMeld.type = "button";
      addMeld.textContent = "+ Add meld";
      addMeld.addEventListener("click", function () {
        if (piece.melds.length >= 5) {
          toast("This piece already has 5 melds planned.");
          return;
        }
        piece.melds.push({ stat: "crit", grade: "XII", amount: F.MATERIA_DEFAULTS.XII.amount });
        saveState();
        renderPieces();
        renderTotals();
      });
      meldHost.appendChild(addMeld);
      card.appendChild(meldHost);

      host.appendChild(card);
    });
  }

  function renderTotals() {
    var set = currentSet();
    var host = document.getElementById("totals-body");
    host.innerHTML = "";
    if (!set) return;

    var avg = F.averageIlvl(set);
    var target = set.ilvlTarget || 0;
    var budget = F.meldBudgetStatus(set);
    var meldCount = F.countMelds(set);
    var unowned = F.shoppingList(set).length;

    var grid = document.createElement("div");
    grid.className = "totals-grid";

    function tile(label, valueHtml, cls) {
      var t = document.createElement("div");
      t.className = "tile";
      t.innerHTML = label + ": <span class='num " + (cls || "") + "'>" + valueHtml + "</span>";
      grid.appendChild(t);
    }

    tile("Set avg ILVL", avg);
    tile("ILVL target", target || "none", "muted");
    tile(
      "vs target",
      target ? avg + " / " + target : "\u2014",
      target ? (avg >= target ? "ok" : "warn") : ""
    );
    tile("Melds planned", meldCount);
    tile(
      "Meld cost",
      fmtGil(budget.spent) + " gil",
      budget.overBudget ? "over" : ""
    );
    tile(
      "Budget",
      budget.cap ? fmtGil(budget.remaining) + " gil left" : "no cap set",
      budget.overBudget ? "over" : (budget.cap ? "ok" : "muted")
    );
    tile("Shopping list items", unowned, unowned ? "warn" : "ok");
    host.appendChild(grid);

    var prog = F.statProgress(set);
    var table = document.createElement("table");
    table.className = "stat-table";
    table.innerHTML = "<thead><tr><th>Stat</th><th>Goal</th><th>Melded</th><th>Diff</th></tr></thead>";
    var tbody = document.createElement("tbody");
    F.STATS.forEach(function (st) {
      var row = document.createElement("tr");
      var nameTd = document.createElement("td");
      nameTd.textContent = F.STAT_LABELS[st];
      row.appendChild(nameTd);
      ["goal", "melded", "diff"].forEach(function (key, i) {
        var td = document.createElement("td");
        if (i < 2) td.textContent = fmtGil(prog[st][key]);
        else {
          td.textContent = (prog[st].diff >= 0 ? "+" : "") + fmtGil(prog[st].diff);
          td.className = prog[st].diff >= 0 ? "ok" : "warn";
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    host.appendChild(table);

    if (set.notes) {
      var noteP = document.createElement("p");
      noteP.className = "hint";
      noteP.textContent = "Notes: " + set.notes;
      host.appendChild(noteP);
    }
  }

  function renderAll() {
    renderJobSelect();
    renderTargetsPanel();
    renderStatGoals();
    renderPieces();
    renderTotals();
  }

  function renderTargetsPanel() {
    var set = currentSet();
    document.getElementById("ilvl-target").value = set.ilvlTarget || "";
    document.getElementById("budget-cap").value = set.budgetCap || "";
    document.getElementById("set-notes").value = set.notes || "";
  }

  function wireStaticControls() {
    document.getElementById("job-select").addEventListener("change", function (e) {
      state.currentJob = e.target.value;
      saveState();
      renderAll();
    });

    document.getElementById("btn-new-job").addEventListener("click", function () {
      var name = document.getElementById("new-job-name").value.trim();
      if (!name) { toast("Enter a job name first."); return; }
      if (state.jobs[name]) { toast("That job already exists."); return; }
      state.jobs[name] = F.emptyGearSet(name);
      state.currentJob = name;
      document.getElementById("new-job-name").value = "";
      saveState();
      renderAll();
      toast("Added " + name);
    });

    document.getElementById("btn-delete-job").addEventListener("click", function () {
      if (!state.currentJob) return;
      if (!window.confirm("Delete the '" + state.currentJob + "' plan? This cannot be undone.")) return;
      delete state.jobs[state.currentJob];
      state.currentJob = Object.keys(state.jobs)[0] || "";
      saveState();
      renderAll();
      toast("Job deleted.");
    });

    document.getElementById("btn-add-pld").addEventListener("click", function () {
      var sample = F.samplePldSet();
      var name = sample.job;
      var i = 2;
      while (state.jobs[name]) {
        name = sample.job + " " + i;
        i += 1;
      }
      sample.job = name;
      state.jobs[name] = sample;
      state.currentJob = name;
      saveState();
      renderAll();
      toast("Added sample PLD plan: " + name);
    });

    document.getElementById("btn-reset").addEventListener("click", function () {
      if (!state.currentJob) return;
      if (!window.confirm("Clear all gear, melds, and goals for '" + state.currentJob + "'?")) return;
      state.jobs[state.currentJob] = F.emptyGearSet(state.currentJob);
      saveState();
      renderAll();
      toast("Cleared " + state.currentJob + ".");
    });

    document.getElementById("ilvl-target").addEventListener("input", function (e) {
      var v = parseInt(e.target.value, 10);
      currentSet().ilvlTarget = isNaN(v) ? 0 : v;
      saveState();
      renderTotals();
    });

    document.getElementById("budget-cap").addEventListener("input", function (e) {
      var v = parseInt(e.target.value, 10);
      currentSet().budgetCap = isNaN(v) ? 0 : v;
      saveState();
      renderTotals();
    });

    document.getElementById("set-notes").addEventListener("input", function (e) {
      currentSet().notes = e.target.value;
      saveState();
      renderTotals();
    });

    document.getElementById("btn-export-shopping").addEventListener("click", function () {
      var set = currentSet();
      if (!set) return;
      downloadCsv(
        "ffxiv-shopping-list-" + slug(set.job) + ".csv",
        F.shoppingListCsv(set)
      );
    });

    var exportFull = function () {
      var set = currentSet();
      if (!set) return;
      downloadCsv("ffxiv-full-set-" + slug(set.job) + ".csv", F.fullSetCsv(set));
    };
    document.getElementById("btn-export-full").addEventListener("click", exportFull);
    document.getElementById("btn-export-full-2").addEventListener("click", exportFull);
  }

  loadState();
  wireStaticControls();
  renderAll();
})();
