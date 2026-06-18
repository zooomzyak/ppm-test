/* Данные методики 1 «Диагностика мотивационной готовности к развитию параметров ППМ».
   Формулировки перенесены дословно из чернового файла «Глава 3 — методики (черновик).md».
   Нумерация 11 способностей строго по канону _gen/_ref/_PLAN.md.
   Обычный скрипт (не ES-модуль). Присваивает window.PPM_MOTIVATION. */

window.PPM_MOTIVATION = {
  title: "Диагностика мотивационной готовности к развитию параметров ППМ",

  intro: "Ниже 11 профессиональных способностей преподавателя. По каждой оцените три утверждения по шкале от 1 (совсем нет) до 5 (безусловно да).\nЦ — развить это важно и полезно для моей работы.\nИ — мне было бы интересно этим заниматься.\nУ — я уверен(а), что смогу это в себе развить.",

  scale: { min: 1, max: 5, minLabel: "совсем нет", maxLabel: "безусловно да" },

  statements: [
    { key: "Ц", short: "Ценность",     text: "развить это важно и полезно для моей работы" },
    { key: "И", short: "Интерес",      text: "мне было бы интересно этим заниматься" },
    { key: "У", short: "Уверенность",  text: "я уверен(а), что смогу это в себе развить" }
  ],

  abilities: [
    { num: 1,  name: "Гибкость",                          facing: "быстро перестраивать занятие и менять приёмы по ходу" },
    { num: 2,  name: "Критичность",                       facing: "замечать слабые места в аргументах, проверять обоснованность" },
    { num: 3,  name: "Креативность",                      facing: "придумывать нестандартные объяснения, задания, форматы" },
    { num: 4,  name: "Рефлексивность",                    facing: "анализировать своё преподавание, учиться на опыте" },
    { num: 5,  name: "Надситуативность",                  facing: "видеть за ситуацией более широкие задачи подготовки" },
    { num: 6,  name: "Эпистемологичность",                facing: "показывать, как получено знание и каковы его границы" },
    { num: 7,  name: "Концептуальность",                  facing: "строить материал как систему понятий, а не перечень тем" },
    { num: 8,  name: "Дискурсивность",                    facing: "вести научную дискуссию и диалог со студентами" },
    { num: 9,  name: "Академическая экспертность",        facing: "оценивать работы по стандартам, видеть ошибки" },
    { num: 10, name: "Исследовательская интегративность", facing: "связывать свою науку и преподавание" },
    { num: 11, name: "Архитектоничность",                 facing: "проектировать программу как целостную систему" }
  ],

  partB: {
    instruction: "Выберите 3 способности, которыми хотели бы заняться в первую очередь. Для каждой отметьте, что вами движет (можно несколько): интересно само по себе; важно для меня как преподавателя; этого требует кафедра/руководство; нужно для карьеры/аттестации.",
    pick: 3,
    motives: [
      { id: "m1", text: "интересно само по себе",             type: "autonomous" },
      { id: "m2", text: "важно для меня как преподавателя",         type: "autonomous" },
      { id: "m3", text: "этого требует кафедра/руководство",   type: "controlled" },
      { id: "m4", text: "нужно для карьеры/аттестации",        type: "controlled" }
    ]
  }
};

/* Подсчёт части А.
   Индекс ценности параметра = (Ц + И) / 2 (диапазон 1–5). Ожидание успеха = У.
   Кандидаты в цели = параметры с ценностью ≥ 4, не больше трёх по убыванию ценности.
   Низкая уверенность = ценность ≥ 4 при У ≤ 3.
   Устойчиво к отсутствующим и частичным ответам. */
window.PPM_MOTIVATION.score = function (answers) {
  var data = window.PPM_MOTIVATION;
  answers = answers || {};
  var grid = answers.grid || {};
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }

  var perAbility = [];
  for (var a = 0; a < data.abilities.length; a++) {
    var an = data.abilities[a].num;
    var cell = grid[String(an)] || grid[an] || {};
    var c = num(cell["Ц"]), inter = num(cell["И"]), u = num(cell["У"]);
    var value = null;
    if (c !== null && inter !== null) value = (c + inter) / 2;
    else if (c !== null) value = c;
    else if (inter !== null) value = inter;
    perAbility.push({ num: an, value: value, expectation: u });
  }

  var byValue = perAbility.filter(function (r) { return r.value !== null; })
    .slice().sort(function (x, y) { return (y.value || 0) - (x.value || 0); });
  var suggestedTargets = byValue.filter(function (r) { return r.value >= 4; })
    .slice(0, 3).map(function (r) { return r.num; });
  var lowConfidence = perAbility.filter(function (r) {
    return r.value !== null && r.value >= 4 && r.expectation !== null && r.expectation <= 3;
  }).map(function (r) { return r.num; });

  return { perAbility: perAbility, suggestedTargets: suggestedTargets, lowConfidence: lowConfidence };
};

/* Подсчёт автономности мотивов, отмеченных на шаге выбора целей.
   motivesMap = { номерСпособности: [идМотива, ...] }.
   Мотив мишени автономный, если автономных отметок не меньше контролируемых. */
window.PPM_MOTIVATION.scoreMotives = function (motivesMap) {
  var data = window.PPM_MOTIVATION;
  var type = {};
  (data.partB.motives || []).forEach(function (m) { type[m.id] = m.type; });
  motivesMap = motivesMap || {};
  var totalMarks = 0, autoMarks = 0, perTarget = {};
  for (var k in motivesMap) {
    if (!Object.prototype.hasOwnProperty.call(motivesMap, k)) continue;
    var arr = motivesMap[k];
    if (!Array.isArray(arr)) continue;
    var auto = 0, ctrl = 0;
    for (var i = 0; i < arr.length; i++) {
      var t = type[arr[i]];
      if (t === "autonomous") auto++;
      else if (t === "controlled") ctrl++;
    }
    perTarget[k] = { auto: auto, ctrl: ctrl, autonomous: auto >= ctrl && (auto + ctrl) > 0 };
    autoMarks += auto; totalMarks += auto + ctrl;
  }
  return { autonomousShare: totalMarks > 0 ? autoMarks / totalMarks : 0, perTarget: perTarget };
};
