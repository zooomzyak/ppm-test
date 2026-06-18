/* ============================================================
   Развитие ППМ — сайт диагностики. Логика приложения.
   Чистый JS, без зависимостей. Данные приходят из
   data.abilities.js / data.motivation.js / data.diagnostic.js
   (глобалы window.PPM_ABILITIES / PPM_MOTIVATION / PPM_DIAGNOSTIC).
   ============================================================ */
(function () {
"use strict";

/* ---------------- утилиты ---------------- */
function h(tag, attrs) {
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    var v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else e.setAttribute(k, v);
  }
  for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
  return e;
}
function add(e, kid) {
  if (kid == null || kid === false) return;
  if (Array.isArray(kid)) { kid.forEach(function (k) { add(e, k); }); return; }
  e.appendChild(typeof kid === "object" ? kid : document.createTextNode(String(kid)));
}
var $ = function (s, r) { return (r || document).querySelector(s); };

var toastTimer = null;
function toast(msg, type) {
  var t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.className = "toast"; }, 2600);
}

/* ---------------- хранилище ---------------- */
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
var K_PROFILE = "ppm.profile", K_PROG = "ppm.progress", K_SUGG = "ppm.suggested";
function draftKey(inst) { return "ppm.draft." + inst; }
function getProfile() { return LS.get(K_PROFILE, null); }
function getProgress() { return LS.get(K_PROG, {}); }
function setStatus(inst, st) { var p = getProgress(); p[inst] = st; LS.set(K_PROG, p); }
function statusOf(inst) { return getProgress()[inst] || ""; }

var saveTimer = null;
function autosave(inst, ans, silent) {
  LS.set(draftKey(inst), ans);
  if (statusOf(inst) !== "done") setStatus(inst, "draft");
  if (!silent) { clearTimeout(saveTimer); saveTimer = setTimeout(function () { toast("Черновик сохранён"); }, 700); }
}

/* ---------------- код участника ---------------- */
function normIdent(s) { return (s || "").toUpperCase().replace(/\s+/g, ""); }

/* ---------------- отправка ответов ---------------- */
var SUBMIT_URL = (typeof window !== "undefined" && window.PPM_SUBMIT_URL) ? window.PPM_SUBMIT_URL : "";
function buildRecord(instrument, stage, payload) {
  var profile = getProfile() || {};
  var meta = { code: profile.code || "", profile: profile, instrument: instrument, stage: stage || "", ts: new Date().toISOString(), ua: navigator.userAgent, href: location.href };
  return { meta: meta, payload: payload };
}
function submitRecord(rec) {
  if (!SUBMIT_URL) return Promise.reject(new Error("Адрес для сбора ответов не задан"));
  var data = {
    code: rec.meta.code,
    instrument: rec.meta.instrument,
    stage: rec.meta.stage,
    age: (rec.meta.profile && rec.meta.profile.age) || "",
    ts: rec.meta.ts,
    meta: JSON.stringify(rec.meta),
    payload: JSON.stringify(rec.payload)
  };
  return fetch(SUBMIT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data)
  }).then(function () { return true; });
}
function recordToText(rec) {
  return "Код участника: " + rec.meta.code + "\nИнструмент: " + rec.meta.instrument +
    (rec.meta.stage ? " (" + rec.meta.stage + ")" : "") + "\nВремя: " + rec.meta.ts +
    "\n\n--- ДАННЫЕ (JSON) ---\n" + JSON.stringify({ meta: rec.meta, payload: rec.payload }, null, 2);
}
function download(filename, text) {
  var b = new Blob([text], { type: "application/json;charset=utf-8" });
  var a = h("a", { href: URL.createObjectURL(b), download: filename });
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast("Скопировано", "ok"); }, function () { fallbackCopy(text); });
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  var ta = h("textarea", { style: { position: "fixed", left: "-9999px" } }); ta.value = text;
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); toast("Скопировано", "ok"); } catch (e) { toast("Не удалось скопировать", "err"); }
  ta.remove();
}

/* ---------------- общие компоненты ---------------- */
function appbar() {
  var p = getProfile();
  var bar = h("header", { class: "appbar" },
    h("div", { class: "inner" },
      h("div", { class: "brand" },
        h("b", { text: "Развитие профессионального педагогического мышления" }),
        h("span", { text: "диагностика и выбор целей" })
      ),
      h("div", { class: "spacer" }),
      p && p.code ? h("div", { class: "code-chip", title: "Ваш анонимный код" }, p.code) : null,
      h("button", { class: "hublink", onclick: function () { location.hash = "#/hub"; } }, "На главную")
    )
  );
  return bar;
}
function pageHead(kicker, title, lead) {
  return h("div", { class: "hub-head screen" },
    kicker ? h("p", { class: "kicker", text: kicker }) : null,
    h("h1", { style: { fontSize: "26px", marginBottom: "8px" }, text: title }),
    lead ? h("p", { class: "lead muted", style: { fontSize: "16px" }, text: lead }) : null
  );
}
function autosaveHint() {
  return h("p", { class: "faint", style: { fontSize: "13px", margin: "0 0 18px" } }, "Ответы сохраняются в этом браузере автоматически. Можно закрыть и продолжить позже.");
}

/* сегментная шкала 1..n */
function scaleControl(n, value, onPick, labels) {
  var seg = h("div", { class: "seg" });
  var btns = [];
  for (var i = 1; i <= n; i++) (function (i) {
    var b = h("button", { type: "button", text: String(i), onclick: function () {
      value = i; btns.forEach(function (x, idx) { x.classList.toggle("on", idx + 1 === i); }); onPick(i);
    } });
    if (value === i) b.classList.add("on");
    btns.push(b); seg.appendChild(b);
  })(i);
  var ends = labels ? h("div", { class: "ends" }, h("span", { text: labels[0] }), h("span", { text: labels[1] })) : null;
  return h("div", { class: "scale" + (n === 7 ? " s7" : "") }, seg, ends);
}

/* ====================================================================
   ЛЕНДИНГ
   ==================================================================== */
function mountLanding(app) {
  var hero = h("div", { class: "hero screen" },
    h("div", { class: "seal" }, "ВАК 5.3.4"),
    h("div", { class: "inner" },
      h("p", { class: "kicker on-dark", text: "Программа развития педагогического мышления" }),
      h("h1", { text: "Диагностика и выбор целей развития" }),
      h("p", { class: "lead", text: "Короткая серия заданий о вашем профессиональном мышлении как преподавателя. Помогает выбрать, что развивать, и увидеть динамику до и после программы." }),
      h("div", { class: "meta" },
        h("span", {}, h("b", {}, "4"), " инструмента"),
        h("span", {}, "анонимно, по личному коду"),
        h("span", {}, "можно с телефона")
      ),
      h("div", { class: "actions" },
        h("button", { class: "btn gold big", onclick: function () { location.hash = getProfile() ? "#/hub" : "#/anketa"; } },
          getProfile() ? "Продолжить" : "Начать", h("span", { class: "arr", text: "→" }))
      )
    )
  );

  var items = [
    ["Мотивация", "Что важно и интересно развивать и в чём вы уверены."],
    ["Выбор целей", "Отметить навыки, над которыми будете работать."],
    ["Первичная диагностика", "Замер текущего уровня до программы."],
    ["Вторичная диагностика", "Тот же замер после программы, для сравнения."]
  ];
  var grid = h("div", { class: "hub-grid screen", style: { marginTop: "20px" } });
  items.forEach(function (it, i) {
    grid.appendChild(h("div", { class: "tile", style: { cursor: "default" } },
      h("div", { class: "row1" }, h("div", { class: "idx", text: String(i + 1) }), h("h3", { text: it[0] })),
      h("p", { text: it[1] })
    ));
  });

  var note = h("div", { class: "note ok screen", style: { marginTop: "20px" } },
    "Конфиденциальность. Вместо имени используется короткий код из первых букв ФИО и даты рождения. Он нужен только чтобы связать ваши ответы «до» и «после». Личность по нему не раскрывается.");

  app.appendChild(h("div", { class: "wrap" }, hero, grid, note));
}

/* ====================================================================
   АНКЕТА + КОД
   ==================================================================== */
function renderAnketa(main) {
  var prof = getProfile() || {};
  var st = { age: prof.age || "", ident: prof.ident || "" };

  main.appendChild(pageHead("Шаг 1", "Ваш код участника", "Придумайте короткий код и запомните его. По нему ваши ответы до и после программы свяжутся между собой. Возраст нужен только для общей статистики."));

  var codeBox = h("div", { class: "note", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" } },
    h("span", {}, "Запомните этот код"),
    h("b", { id: "codeView", style: { fontSize: "18px", letterSpacing: ".04em" }, text: prof.code || "—" })
  );
  function refreshCode() {
    var c = normIdent(st.ident);
    $("#codeView").textContent = c || "—";
    return c;
  }

  function field(label, hint, node) {
    return h("div", { class: "field" }, h("label", { text: label }), hint ? h("p", { class: "hint", text: hint }) : null, node);
  }
  function inp(key, type) {
    var e = h("input", { type: type || "text", value: st[key] || "" });
    e.addEventListener("input", function () { st[key] = e.value; if (key === "ident") refreshCode(); });
    return e;
  }

  var card = h("div", { class: "card pad-lg" },
    codeBox,
    field("Идентификатор", "Придумайте короткий код, который легко запомните. Например, КОТ7 или любимое слово с числом. Запишите его, он понадобится в конце программы для повторного прохождения. Регистр и пробелы не важны.", inp("ident")),
    field("Возраст, полных лет", null, inp("age", "number")),
    h("p", { class: "err-line", id: "anketaErr" }, "Введите идентификатор и возраст."),
    h("div", { class: "inline-actions" },
      h("button", { class: "btn primary big", onclick: function () {
        var code = normIdent(st.ident);
        var ageOk = st.age !== "" && Number(st.age) > 0;
        if (!code || !ageOk) { $("#anketaErr").classList.add("show"); return; }
        var profile = { age: st.age, ident: st.ident, code: code };
        LS.set(K_PROFILE, profile);
        toast("Готово, ваш код " + code, "ok");
        location.hash = "#/hub";
      } }, "Сохранить и продолжить", h("span", { class: "arr", text: "→" }))
    )
  );
  main.appendChild(h("div", { class: "screen" }, card));
  refreshCode();
}

/* ====================================================================
   ХАБ
   ==================================================================== */
function renderHub(main) {
  var prof = getProfile();
  main.appendChild(pageHead(null, "Главная", "Четыре инструмента. Рекомендуемый порядок — мотивация, выбор целей, первичная диагностика. Вторичную проходят после программы."));

  var tiles = [
    { inst: "motivation", stage: "", title: "Мотивация", desc: "Оцените 11 способностей по важности, интересу и уверенности. Около 7 минут.", hash: "#/motivation" },
    { inst: "targets", stage: "", title: "Выбор целей", desc: "Отметьте навыки, которые будете развивать. 2–3 минуты.", hash: "#/targets" },
    { inst: "diagnostic.pre", stage: "pre", title: "Первичная диагностика", desc: "Полный замер из шести блоков до программы. Около 60 минут, можно с перерывами.", hash: "#/diagnostic/pre" },
    { inst: "diagnostic.post", stage: "post", title: "Вторичная диагностика", desc: "Тот же замер после программы. Сравнивается с первичной по вашему коду.", hash: "#/diagnostic/post" }
  ];
  var labels = { "": ["none", "не начато"], draft: ["draft", "черновик"], done: ["done", "отправлено"] };
  var grid = h("div", { class: "hub-grid screen" });
  tiles.forEach(function (t, i) {
    var stt = statusOf(t.inst);
    var lb = labels[stt] || labels[""];
    var tile = h("div", { class: "tile " + (stt === "done" ? "done" : stt === "draft" ? "draft" : ""), onclick: function () { location.hash = t.hash; } },
      h("div", { class: "row1" }, h("div", { class: "idx", text: String(i + 1) }), h("h3", { text: t.title })),
      h("p", { text: t.desc }),
      h("div", { class: "foot" },
        h("span", { class: "statuspill " + lb[0], text: lb[1] }),
        h("span", { class: "go" }, stt === "done" ? "Открыть" : (stt === "draft" ? "Продолжить" : "Начать"), h("span", { class: "arr", text: "→" }))
      )
    );
    grid.appendChild(tile);
  });
  main.appendChild(grid);

  main.appendChild(h("div", { class: "note screen", style: { marginTop: "20px" } },
    h("span", {}, "Код участника "), h("b", { text: prof.code }),
    h("span", { class: "faint" }, "  ·  один и тот же для первичной и вторичной диагностики.")
  ));
}

/* ====================================================================
   ЗАВЕРШЕНИЕ ИНСТРУМЕНТА (отправка + бэкап)
   ==================================================================== */
function finishInstrument(opts, btn) {
  // opts: {instrument, stage, payload, title, message, resultNode}
  var rec = buildRecord(opts.instrument, opts.stage, opts.payload);
  var orig = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = ""; btn.appendChild(h("span", { class: "spinner" })); btn.appendChild(document.createTextNode(" Отправляем…"));

  submitRecord(rec).then(function () {
    setStatus(opts.statusKey || opts.instrument, "done");
    showDone(opts, rec, true);
  }).catch(function () {
    setStatus(opts.statusKey || opts.instrument, "done");
    showDone(opts, rec, false);
  });
}
function showDone(opts, rec, ok) {
  var main = $("main.wrap"); if (!main) return;
  main.innerHTML = "";
  var actions = h("div", { class: "actions" },
    h("button", { class: "btn gold", onclick: function () { copyText(recordToText(rec)); } }, "Скопировать ответы"),
    h("button", { class: "btn ghost", style: { color: "#fff", borderColor: "rgba(255,255,255,.4)" }, onclick: function () {
      download("ппм_" + rec.meta.code + "_" + rec.meta.instrument + (rec.meta.stage ? "_" + rec.meta.stage : "") + ".json", recordToText(rec));
    } }, "Скачать файл"),
    h("button", { class: "btn", onclick: function () { location.hash = "#/hub"; } }, "На главную")
  );
  var card = h("div", { class: "done-card screen" },
    h("div", { class: "done-check" }, h("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="#E7CE8E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' })),
    h("h2", { text: opts.title || "Готово" }),
    h("p", { text: ok ? (opts.message || "Ответы отправлены исследователю. Спасибо.") : "Ответы сохранены, но отправить автоматически не вышло (возможно, нет сети или сайт открыт локально). Нажмите «Скопировать ответы» или «Скачать файл» и пришлите их." }),
    opts.resultNode || null,
    actions
  );
  main.appendChild(card);
  window.scrollTo(0, 0);
}

/* ====================================================================
   МОТИВАЦИЯ (Методика 1)
   ==================================================================== */
function renderMotivation(main) {
  var M = window.PPM_MOTIVATION;
  if (!M) { main.appendChild(notReady()); return; }
  var inst = "motivation";
  var ans = LS.get(draftKey(inst), { grid: {}, partB: { picks: [], motives: {} } });
  ans.grid = ans.grid || {}; ans.partB = ans.partB || { picks: [], motives: {} };

  main.appendChild(pageHead("Инструмент 1", M.title || "Мотивация развития", M.intro));
  main.appendChild(autosaveHint());

  var prog = h("div", { class: "progress-wrap" }, h("div", { class: "progress-bar" }, h("i", { id: "motBar" })), h("div", { class: "progress-label" }, h("span", { id: "motLab", text: "Отвечено 0 из 11" }), h("span", { text: "часть А" })));
  main.appendChild(prog);

  function refresh() {
    var done = 0;
    M.abilities.forEach(function (a) { var g = ans.grid[a.num]; if (g && g.Ц && g.И && g.У) done++; });
    $("#motBar").style.width = (done / M.abilities.length * 100) + "%";
    $("#motLab").textContent = "Отвечено " + done + " из " + M.abilities.length;
  }

  // Часть А
  main.appendChild(h("div", { class: "section-eyebrow" }, h("b", { text: "Часть А · оцените каждое умение" }), h("span", { class: "ln" })));
  M.abilities.forEach(function (a) {
    var g = ans.grid[a.num] || (ans.grid[a.num] = {});
    var rows = h("div", { class: "triple" });
    M.statements.forEach(function (s) {
      var lab = h("div", { class: "lab" }, h("b", { text: s.short }), s.text);
      var sc = scaleControl(5, g[s.key] || 0, function (v) { g[s.key] = v; autosave(inst, ans); refresh(); }, ["1 · " + (M.scale.minLabel || ""), "5 · " + (M.scale.maxLabel || "")]);
      rows.appendChild(h("div", { class: "row" }, lab, sc));
    });
    main.appendChild(h("div", { class: "card" },
      h("h2", { style: { fontSize: "18px" } }, h("span", { class: "qnum", text: String(a.num) }), a.name),
      h("p", { class: "lead", style: { margin: "2px 0 4px" }, text: a.facing }),
      rows
    ));
  });

  // Часть Б
  main.appendChild(h("div", { class: "section-eyebrow" }, h("b", { text: "Часть Б · приоритет и мотив" }), h("span", { class: "ln" })));
  var bWrap = h("div", { class: "card" }, h("p", { class: "lead", text: M.partB.instruction }));
  var picksHost = h("div");
  M.abilities.forEach(function (a) {
    var on = ans.partB.picks.indexOf(a.num) >= 0;
    var motivesBox = h("div", { style: { display: on ? "block" : "none", margin: "10px 0 4px 42px" } });
    function buildMotives() {
      motivesBox.innerHTML = "";
      var sel = ans.partB.motives[a.num] || (ans.partB.motives[a.num] = []);
      M.partB.motives.forEach(function (m) {
        var mon = sel.indexOf(m.id) >= 0;
        var c = h("label", { class: "choice" + (mon ? " on" : ""), style: { padding: "9px 12px" } },
          h("span", { class: "mark" }), h("span", { class: "txt", text: m.text }));
        c.addEventListener("click", function () {
          var k = sel.indexOf(m.id); if (k >= 0) sel.splice(k, 1); else sel.push(m.id);
          c.classList.toggle("on"); autosave(inst, ans);
        });
        motivesBox.appendChild(c);
      });
    }
    var row = h("div", {},
      (function () {
        var ab = h("div", { class: "ability" + (on ? " on" : "") },
          h("div", { class: "num", text: String(a.num) }),
          h("div", { class: "body" }, h("div", { class: "name", text: a.name }), h("div", { class: "simple", text: a.facing })),
          h("div", { class: "check" })
        );
        ab.addEventListener("click", function () {
          var idx = ans.partB.picks.indexOf(a.num);
          if (idx >= 0) { ans.partB.picks.splice(idx, 1); on = false; }
          else {
            if (ans.partB.picks.length >= (M.partB.pick || 3)) { toast("Можно выбрать " + (M.partB.pick || 3), "err"); return; }
            ans.partB.picks.push(a.num); on = true;
          }
          ab.classList.toggle("on", on); motivesBox.style.display = on ? "block" : "none";
          if (on) buildMotives();
          autosave(inst, ans);
        });
        return ab;
      })(),
      motivesBox
    );
    if (on) buildMotives();
    picksHost.appendChild(row);
  });
  bWrap.appendChild(picksHost);
  main.appendChild(bWrap);

  main.appendChild(h("p", { class: "err-line", id: "motErr" }));
  main.appendChild(h("div", { class: "inline-actions" },
    h("button", { class: "btn primary big", onclick: function (ev) {
      // мягкая валидация
      var doneCount = 0; M.abilities.forEach(function (a) { var g = ans.grid[a.num]; if (g && g.Ц && g.И && g.У) doneCount++; });
      if (doneCount < M.abilities.length) { showErr("motErr", "Оцените все 11 умений по трём шкалам (отвечено " + doneCount + " из 11)."); return; }
      if (ans.partB.picks.length !== (M.partB.pick || 3)) { showErr("motErr", "В части Б выберите ровно " + (M.partB.pick || 3) + " умения."); return; }
      var res = M.score(ans);
      LS.set(K_SUGG, res.suggestedTargets || []);
      finishInstrument({ instrument: "motivation", stage: "", payload: { answers: ans, score: res }, title: "Мотивация пройдена", message: "Ответы отправлены. Ниже — что стоит развивать в первую очередь.", resultNode: motivationResult(res, M) }, ev.currentTarget);
    } }, "Завершить и отправить", h("span", { class: "arr", text: "→" }))
  ));
  refresh();
}
function motivationResult(res, M) {
  var nameByNum = {}; (M.abilities || []).forEach(function (a) { nameByNum[a.num] = a.name; });
  var box = h("div", { class: "summary" });
  box.appendChild(h("div", { class: "l" }, h("span", {}, "Рекомендованные цели"), h("b", { text: (res.suggestedTargets && res.suggestedTargets.length ? res.suggestedTargets.map(function (n) { return n + " " + (nameByNum[n] || ""); }).join(", ") : "по результату не выделились") })));
  if (res.lowConfidence && res.lowConfidence.length)
    box.appendChild(h("div", { class: "l" }, h("span", {}, "Нужна поддержка (низкая уверенность)"), h("b", { text: res.lowConfidence.map(function (n) { return String(n); }).join(", ") })));
  box.appendChild(h("div", { class: "l" }, h("span", {}, "Доля внутренней мотивации"), h("b", { text: Math.round((res.autonomousShare || 0) * 100) + "%" })));
  return box;
}
function showErr(id, msg) { var e = $("#" + id); if (e) { e.textContent = msg; e.classList.add("show"); e.scrollIntoView({ behavior: "smooth", block: "center" }); } }

/* ====================================================================
   ВЫБОР ЦЕЛЕЙ
   ==================================================================== */
function renderTargets(main) {
  var A = window.PPM_ABILITIES;
  if (!A) { main.appendChild(notReady()); return; }
  var inst = "targets";
  var draft = LS.get(draftKey(inst), null);
  var picks = (draft && draft.picks) || LS.get(K_SUGG, []).slice();
  var sugg = LS.get(K_SUGG, []);

  main.appendChild(pageHead("Инструмент 2", "Выбор навыков-целей", "Отметьте 1–3 навыка, над которыми будете работать в программе. По ним пойдёт сравнение «до и после»."));
  if (sugg.length) main.appendChild(h("div", { class: "note", style: { marginBottom: "16px" } }, "По результатам мотивации заранее отмечены: ", h("b", { text: sugg.join(", ") }), ". Можно изменить."));
  main.appendChild(autosaveHint());

  function save() { LS.set(draftKey(inst), { picks: picks }); if (statusOf(inst) !== "done") setStatus(inst, "draft"); updateBar(); }
  var host = h("div", { class: "screen" });
  A.forEach(function (a) {
    var on = picks.indexOf(a.num) >= 0;
    var row = h("div", { class: "ability" + (on ? " on" : "") },
      h("div", { class: "num", text: String(a.num) }),
      h("div", { class: "body" },
        h("div", { class: "name", text: a.name }),
        h("div", { class: "simple", text: a.simple }),
        h("div", { class: "desc", text: a.desc }),
        h("div", { class: "tags" },
          h("span", { class: "tag " + (a.kind === "specific" ? "spec" : "univ"), text: a.kind === "specific" ? "специфический" : "универсальный" }),
          a.measure ? h("span", { class: "tag", text: "замер · " + a.measure }) : null,
          sugg.indexOf(a.num) >= 0 ? h("span", { class: "tag sugg", text: "по мотивации" }) : null
        )
      ),
      h("div", { class: "check" })
    );
    row.addEventListener("click", function () {
      var idx = picks.indexOf(a.num);
      if (idx >= 0) picks.splice(idx, 1);
      else { if (picks.length >= 3) { toast("Рекомендуем не больше трёх целей", "err"); } picks.push(a.num); }
      row.classList.toggle("on", picks.indexOf(a.num) >= 0); save();
    });
    host.appendChild(row);
  });
  main.appendChild(host);

  var bar = h("div", { class: "sticky-bar" }, h("div", { class: "inner" },
    h("div", { class: "count" }, "Выбрано ", h("b", { id: "tgCount", text: String(picks.length) }), " из 11"),
    h("div", { class: "spacer" }),
    h("button", { class: "btn primary", onclick: function (ev) {
      if (!picks.length) { toast("Отметьте хотя бы один навык", "err"); return; }
      var A2 = window.PPM_ABILITIES; var nameByNum = {}; A2.forEach(function (x) { nameByNum[x.num] = x; });
      var chosen = picks.slice().sort(function (a, b) { return a - b; }).map(function (n) { return { num: n, name: nameByNum[n] ? nameByNum[n].name : "", simple: nameByNum[n] ? nameByNum[n].simple : "" }; });
      var sumNode = h("div", { class: "summary" });
      chosen.forEach(function (c) { sumNode.appendChild(h("div", { class: "l" }, h("span", { text: c.num + " · " + c.name }), h("b", { text: c.simple }))); });
      finishInstrument({ instrument: "targets", stage: "", payload: { picks: picks.slice().sort(function (a, b) { return a - b; }), chosen: chosen }, title: "Цели зафиксированы", message: "Ваши навыки-цели сохранены и отправлены.", resultNode: sumNode }, ev.currentTarget);
    } }, "Сохранить цели", h("span", { class: "arr", text: "→" }))
  ));
  main.appendChild(bar);
  function updateBar() { var c = $("#tgCount"); if (c) c.textContent = String(picks.length); }
}

/* ====================================================================
   ДИАГНОСТИКА (Методика 2) — pre / post
   ==================================================================== */
var TARGET_BLOCK = { 1: "B2", 2: "B1", 3: "B3", 4: "B3", 5: "B4", 6: "B5", 7: "B5", 8: "B5", 9: "B6", 10: "B5", 11: "B5" };
var TARGET_B5TASK = { 6: "t3", 7: "t1", 8: "t5", 10: "t4", 11: "t2" };

function renderDiagnostic(main, stage) {
  var D = window.PPM_DIAGNOSTIC;
  if (!D || !D.blocks) { main.appendChild(notReady()); return; }
  stage = (stage === "post") ? "post" : "pre";
  var inst = "diagnostic." + stage;
  var ans = LS.get(draftKey(inst), {});
  var targets = ((LS.get(draftKey("targets"), {}) || {}).picks) || [];
  var relBlocks = {}, relTasks = {};
  targets.forEach(function (t) { if (TARGET_BLOCK[t]) relBlocks[TARGET_BLOCK[t]] = true; if (TARGET_B5TASK[t]) relTasks[TARGET_B5TASK[t]] = true; });
  var hasTargets = targets.length > 0 && Object.keys(relBlocks).length > 0;
  var showAll = !hasTargets;

  var stageRu = stage === "pre" ? "Первичная" : "Вторичная";
  main.appendChild(pageHead("Инструмент " + (stage === "pre" ? "3" : "4"), stageRu + " диагностика", "Отвечайте искренне, «правильных» ответов для вас нет. Ответы сохраняются, можно проходить с перерывами."));
  main.appendChild(autosaveHint());

  var modeText = h("span", {});
  var modeBtn = h("button", { class: "btn ghost", style: { padding: "8px 16px" }, onclick: function () { showAll = !showAll; updateModeNote(); buildBody(); } });
  if (hasTargets) main.appendChild(h("div", { class: "note", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } }, modeText, modeBtn));

  var body = h("div", {});
  main.appendChild(body);

  function updateModeNote() {
    if (!hasTargets) return;
    if (showAll) { modeText.textContent = "Показан полный замер из всех блоков."; modeBtn.textContent = "Только мои навыки-цели"; }
    else { modeText.textContent = "Показаны задания по вашим навыкам-целям (" + targets.slice().sort(function (a, b) { return a - b; }).join(", ") + ")."; modeBtn.textContent = "Показать полный замер"; }
  }
  function visibleBlocks() { return showAll ? D.blocks.slice() : D.blocks.filter(function (b) { return relBlocks[b.id]; }); }

  function refresh() {
    var closedTotal = 0, closedDone = 0;
    visibleBlocks().forEach(function (b) {
      if (b.type === "single" || b.type === "scenario" || b.type === "likert7" || b.type === "plusminus") {
        var a = ans[b.id] || {}; closedTotal += b.items.length;
        b.items.forEach(function (it) { if (a[it.n] != null && a[it.n] !== "") closedDone++; });
      }
      var stEl = body.querySelector('.steps [data-blk="' + b.id + '"]');
      if (stEl) stEl.classList.toggle("ok", blockComplete(b, ans[b.id]));
    });
    var c = $("#dgClosed"); if (c) c.textContent = String(closedDone);
    var tot = $("#dgTotal"); if (tot) tot.textContent = String(closedTotal);
    var bar2 = $("#dgBar"); if (bar2) bar2.style.width = (closedTotal ? closedDone / closedTotal * 100 : 0) + "%";
    var lab = $("#dgLab"); if (lab) lab.textContent = "Отвечено " + closedDone + " из " + closedTotal;
  }

  function buildBody() {
    body.innerHTML = "";
    var vis = visibleBlocks();
    var steps = h("div", { class: "steps" });
    vis.forEach(function (b, i) {
      steps.appendChild(h("div", { class: "st", "data-blk": b.id, onclick: function () { var t = $("#blk_" + b.id); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); } },
        h("span", { class: "dot", text: String(i + 1) }), b.param || b.title));
    });
    body.appendChild(steps);
    body.appendChild(h("div", { class: "progress-wrap" }, h("div", { class: "progress-bar" }, h("i", { id: "dgBar" })), h("div", { class: "progress-label" }, h("span", { id: "dgLab", text: "" }), h("span", { text: "" }))));
    vis.forEach(function (b) { body.appendChild(renderBlock(b, ans, inst, refresh, (b.id === "B5" && !showAll) ? relTasks : null)); });
    body.appendChild(h("p", { class: "err-line", id: "dgErr" }));
    body.appendChild(h("div", { class: "sticky-bar" }, h("div", { class: "inner" },
      h("div", { class: "count" }, h("b", { id: "dgClosed", text: "0" }), " из ", h("b", { id: "dgTotal", text: "0" }), " пунктов с выбором"),
      h("div", { class: "spacer" }),
      h("button", { class: "btn primary", onclick: function (ev) { submitDiagnostic(D, ans, inst, stage, ev.currentTarget, vis.map(function (b) { return b.id; }), showAll); } }, "Завершить и отправить", h("span", { class: "arr", text: "→" }))
    )));
    refresh();
  }

  updateModeNote();
  buildBody();
}

function blockComplete(b, a) {
  a = a || {};
  if (b.type === "single" || b.type === "scenario" || b.type === "likert7" || b.type === "plusminus")
    return b.items.every(function (it) { return a[it.n] != null && a[it.n] !== ""; });
  if (b.type === "project") {
    var ok = true;
    (b.header || []).forEach(function (f) { if (!a[f.id]) ok = false; });
    (b.tasks || []).forEach(function (t) { (t.parts || []).forEach(function (p) { (p.fields || []).forEach(function (f) { if (!a[f.id]) ok = false; }); }); });
    return ok;
  }
  if (b.type === "openlist") return !!(a[(b.field && b.field.id) || "errors"]);
  return false;
}

function renderBlock(b, ans, inst, refresh, allowedTasks) {
  var a = ans[b.id] || (ans[b.id] = {});
  var head = h("div", {},
    h("div", { class: "section-eyebrow" }, h("b", { text: b.title }), h("span", { class: "ln" })),
    b.intro ? h("p", { class: "lead muted", style: { marginTop: "-4px", whiteSpace: "pre-wrap" }, text: b.intro }) : null
  );
  var body = h("div", { class: "card", id: "blk_" + b.id });
  body.appendChild(head);

  if (b.type === "single") b.items.forEach(function (it) { body.appendChild(singleItem(b, it, a, inst, ans, refresh)); });
  else if (b.type === "scenario") b.items.forEach(function (it) { body.appendChild(scenarioItem(b, it, a, inst, ans, refresh)); });
  else if (b.type === "likert7") { if (b.scaleLabels) body.appendChild(scaleLegend(b.scaleLabels)); b.items.forEach(function (it) { body.appendChild(likertItem(b, it, a, inst, ans, refresh)); }); }
  else if (b.type === "plusminus") b.items.forEach(function (it) { body.appendChild(pmItem(b, it, a, inst, ans, refresh)); });
  else if (b.type === "project") body.appendChild(projectBlock(b, a, inst, ans, refresh, allowedTasks));
  else if (b.type === "openlist") body.appendChild(openlistBlock(b, a, inst, ans, refresh));

  return body;
}
function scaleLegend(labels) {
  var w = h("div", { class: "note", style: { fontSize: "13px" } });
  w.textContent = labels.join("   ·   ");
  return w;
}
function singleItem(b, it, a, inst, ans, refresh) {
  var box = h("div", { class: "q" }, h("p", { class: "qtext" }, h("span", { class: "qnum", text: String(it.n) }), it.text));
  var ch = h("div", { class: "choices" });
  it.options.forEach(function (o) {
    var on = a[it.n] === o.k;
    var c = h("div", { class: "choice" + (on ? " on" : "") }, h("span", { class: "mark" }), h("span", { class: "ltr", text: (o.k || "").toUpperCase() }), h("span", { class: "txt", text: o.t }));
    c.addEventListener("click", function () {
      a[it.n] = o.k; Array.prototype.forEach.call(ch.children, function (x) { x.classList.remove("on"); }); c.classList.add("on");
      autosave(inst, ans, true); refresh();
    });
    ch.appendChild(c);
  });
  box.appendChild(ch); return box;
}
function scenarioItem(b, it, a, inst, ans, refresh) {
  var box = h("div", { class: "q" },
    h("p", { class: "qtext" }, h("span", { class: "qnum", text: String(it.n) }), h("span", { class: "situation", text: it.situation })));
  var ch = h("div", { class: "choices" });
  it.options.forEach(function (txt, idx) {
    var on = a[it.n] === idx;
    var c = h("div", { class: "choice" + (on ? " on" : "") + (idx === it.options.length - 1 ? " muted-opt" : "") }, h("span", { class: "mark" }), h("span", { class: "txt", text: txt }));
    c.addEventListener("click", function () {
      a[it.n] = idx; Array.prototype.forEach.call(ch.children, function (x) { x.classList.remove("on"); }); c.classList.add("on");
      autosave(inst, ans, true); refresh();
    });
    ch.appendChild(c);
  });
  box.appendChild(ch); return box;
}
function likertItem(b, it, a, inst, ans, refresh) {
  var box = h("div", { class: "q" }, h("p", { class: "qtext" }, h("span", { class: "qnum", text: String(it.n) }), it.text));
  box.appendChild(scaleControl(7, a[it.n] || 0, function (v) { a[it.n] = v; autosave(inst, ans, true); refresh(); }, ["1", "7"]));
  return box;
}
function pmItem(b, it, a, inst, ans, refresh) {
  var box = h("div", { class: "q" }, h("p", { class: "qtext" }, h("span", { class: "qnum", text: String(it.n) }), it.text));
  var yes = h("button", { type: "button", class: "pm-y" }, h("span", { class: "sym", text: "+" }), "Да, согласен");
  var no = h("button", { type: "button", class: "pm-n" }, h("span", { class: "sym", text: "−" }), "Нет");
  var wrap = h("div", { class: "pm" }, (yes.className = "yes" + (a[it.n] === "+" ? " on" : ""), yes), (no.className = "no" + (a[it.n] === "−" ? " on" : ""), no));
  yes.addEventListener("click", function () { a[it.n] = "+"; yes.classList.add("on"); no.classList.remove("on"); autosave(inst, ans, true); refresh(); });
  no.addEventListener("click", function () { a[it.n] = "−"; no.classList.add("on"); yes.classList.remove("on"); autosave(inst, ans, true); refresh(); });
  box.appendChild(wrap); return box;
}
function field(label, hint, node) { return h("div", { class: "field" }, label ? h("label", { text: label }) : null, hint ? h("p", { class: "hint", text: hint }) : null, node); }
function ta(id, a, inst, ans, refresh) {
  var e = h("textarea", { value: a[id] || "" });
  e.value = a[id] || "";
  e.addEventListener("input", function () { a[id] = e.value; autosave(inst, ans, true); refresh && refresh(); });
  return e;
}
function projectBlock(b, a, inst, ans, refresh, allowedTasks) {
  var wrap = h("div", {});
  if (b.header && b.header.length) {
    var hb = h("div", { class: "task" }, h("h3", { text: "Дисциплина для проекта" }));
    b.header.forEach(function (f) { hb.appendChild(field(f.label, null, (function () { var e = h("input", { type: "text", value: a[f.id] || "" }); e.addEventListener("input", function () { a[f.id] = e.value; autosave(inst, ans, true); refresh && refresh(); }); return e; })())); });
    wrap.appendChild(hb);
  }
  (b.tasks || []).forEach(function (t) {
    if (allowedTasks && !allowedTasks[t.id]) return;
    var card = h("div", { class: "task" }, h("h3", { text: t.title }), t.intro ? h("p", { class: "help", text: t.intro }) : null);
    (t.parts || []).forEach(function (p) {
      var pn = h("div", { class: "part" }, p.sub ? h("p", { class: "sub", text: p.sub }) : null, p.help ? h("p", { class: "help", text: p.help }) : null);
      (p.fields || []).forEach(function (f) { pn.appendChild(field(f.label, f.help, ta(f.id, a, inst, ans, refresh))); });
      card.appendChild(pn);
    });
    wrap.appendChild(card);
  });
  return wrap;
}
function openlistBlock(b, a, inst, ans, refresh) {
  var wrap = h("div", {});
  if (b.article && b.article.length) {
    var art = h("div", { class: "article" }, b.articleTitle ? h("h4", { text: b.articleTitle }) : null);
    b.article.forEach(function (p) { art.appendChild(h("p", { text: p })); });
    wrap.appendChild(art);
  }
  if (b.prompt) wrap.appendChild(h("p", { class: "lead muted", text: b.prompt }));
  var fid = (b.field && b.field.id) || "errors";
  wrap.appendChild(field((b.field && b.field.label) || "Ваш ответ:", null, ta(fid, a, inst, ans, refresh)));
  return wrap;
}

function submitDiagnostic(D, ans, inst, stage, btn, visibleIds, showAll) {
  var visSet = {}; (visibleIds || D.blocks.map(function (b) { return b.id; })).forEach(function (id) { visSet[id] = true; });
  var scores = {};
  function sc(id, fn) { if (visSet[id] && fn) { try { scores[id] = fn(ans[id] || {}); } catch (e) {} } }
  sc("B1", D.scoreB1); sc("B2", D.scoreB2); sc("B3", D.scoreB3); sc("B4", D.scoreB4);

  var miss = [];
  D.blocks.forEach(function (b) {
    if (!visSet[b.id]) return;
    if (b.type === "single" || b.type === "scenario" || b.type === "likert7" || b.type === "plusminus") {
      if (!blockComplete(b, ans[b.id])) miss.push(b.param || b.title);
    }
  });
  if (miss.length) {
    showErr("dgErr", "Не до конца заполнены блоки с выбором, " + miss.join("; ") + ". Можно отправить как есть или дозаполнить.");
    if (!btn.dataset.warned) { btn.dataset.warned = "1"; return; }
  }
  var targets = ((LS.get(draftKey("targets"), {}) || {}).picks) || [];
  var payload = { stage: stage, mode: showAll ? "full" : "adaptive", blocks: visibleIds || [], targets: targets, answers: ans, scores: scores };
  finishInstrument({ instrument: "diagnostic", stage: stage, statusKey: inst, payload: payload, title: (stage === "pre" ? "Первичная" : "Вторичная") + " диагностика завершена", message: "Ответы отправлены исследователю. Спасибо за подробные ответы." }, btn);
}

/* ---------------- заглушка, пока данные не загрузились ---------------- */
function notReady() {
  return h("div", { class: "card screen" }, h("h2", { text: "Загрузка…" }), h("p", { class: "lead", text: "Если сообщение не исчезает, обновите страницу." }), h("div", { class: "skeleton", style: { marginTop: "14px" } }));
}

/* ---------------- роутер ---------------- */
function render() {
  var app = $("#app"); app.innerHTML = "";
  var hash = location.hash || "#/";
  var parts = hash.replace(/^#\/?/, "").split("/");
  var root = parts[0] || "";

  if (root === "") { mountLanding(app); return; }
  if (!getProfile() && root !== "anketa") { location.hash = "#/anketa"; return; }

  app.appendChild(appbar());
  var main = h("main", { class: "wrap" });
  app.appendChild(main);

  if (root === "anketa") renderAnketa(main);
  else if (root === "hub") renderHub(main);
  else if (root === "motivation") renderMotivation(main);
  else if (root === "targets") renderTargets(main);
  else if (root === "diagnostic") renderDiagnostic(main, parts[1]);
  else { location.hash = "#/hub"; return; }

  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
if (document.readyState !== "loading") render();

})();
