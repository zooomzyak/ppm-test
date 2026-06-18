/* Данные методики 1 «Диагностика мотивационной готовности к развитию параметров ППМ».
   Формулировки перенесены дословно из чернового файла «Глава 3 — методики (черновик).md».
   Нумерация 11 способностей строго по канону _gen/_ref/_PLAN.md.
   Обычный скрипт (не ES-модуль). Присваивает window.PPM_MOTIVATION. */

window.PPM_MOTIVATION = {
  title: "Диагностика мотивационной готовности к развитию параметров ППМ",

  intro: "Ниже — 11 профессиональных способностей преподавателя. По каждой оцените три утверждения по шкале от 1 (совсем нет) до 5 (безусловно да): Ц — развить это важно и полезно для моей работы; И — мне было бы интересно этим заниматься; У — я уверен(а), что смогу это в себе развить.",

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

/* Подсчёт по ключу из черновика:
   - Индекс ценности параметра = (Ц + И) / 2 (диапазон 1–5).
   - Ожидание успеха = У (диапазон 1–5).
   - Мотив мишени автономный, если в Части Б отмечены преимущественно автономные пункты
     (число автономных отметок не меньше числа контролируемых).
   - Мишени развития = выбранные в Части Б способности с автономным мотивом и индексом ценности ≥ 4.
   - Низкое У (≤ 3) при высокой ценности — мишень, требующая большей поддержки.
   Функция устойчива к отсутствующим/частичным ответам. */
window.PPM_MOTIVATION.score = function (answers) {
  var data = window.PPM_MOTIVATION;

  // Карта мотивов id -> тип (autonomous / controlled).
  var motiveType = {};
  for (var i = 0; i < data.partB.motives.length; i++) {
    var m = data.partB.motives[i];
    motiveType[m.id] = m.type;
  }

  // Безопасный доступ к структуре ответов.
  answers = answers || {};
  var grid = answers.grid || {};
  var partB = answers.partB || {};
  var picks = Array.isArray(partB.picks) ? partB.picks : [];
  var motives = partB.motives || {};

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  // Показатели по каждой из 11 способностей.
  var perAbility = [];
  var perAbilityByNum = {};
  for (var a = 0; a < data.abilities.length; a++) {
    var abilityNum = data.abilities[a].num;
    var cell = grid[String(abilityNum)] || grid[abilityNum] || {};

    var c = num(cell["Ц"]);
    var inter = num(cell["И"]);
    var u = num(cell["У"]);

    var value = null;
    if (c !== null && inter !== null) {
      value = (c + inter) / 2;
    } else if (c !== null) {
      value = c;
    } else if (inter !== null) {
      value = inter;
    }

    var rec = { num: abilityNum, value: value, expectation: u };
    perAbility.push(rec);
    perAbilityByNum[abilityNum] = rec;
  }

  // Подсчёт автономных/контролируемых отметок для одной способности.
  function countMotives(abilityNum) {
    var marks = motives[String(abilityNum)];
    if (!marks && marks !== 0) marks = motives[abilityNum];
    if (!Array.isArray(marks)) marks = [];
    var auto = 0, ctrl = 0;
    for (var k = 0; k < marks.length; k++) {
      var t = motiveType[marks[k]];
      if (t === "autonomous") auto++;
      else if (t === "controlled") ctrl++;
    }
    return { auto: auto, ctrl: ctrl, total: auto + ctrl };
  }

  // Мишени развития и мишени, требующие поддержки.
  var suggestedTargets = [];
  var lowConfidence = [];
  var seenPick = {};
  for (var p = 0; p < picks.length; p++) {
    var pn = num(picks[p]);
    if (pn === null) continue;
    if (seenPick[pn]) continue;          // защита от дублей в picks
    seenPick[pn] = true;

    var rec2 = perAbilityByNum[pn];
    if (!rec2) continue;                  // выбран несуществующий номер — пропускаем

    var cm = countMotives(pn);
    var autonomous = cm.auto >= cm.ctrl && cm.total > 0; // преимущественно автономный мотив
    var valuableEnough = rec2.value !== null && rec2.value >= 4;

    if (autonomous && valuableEnough) {
      suggestedTargets.push(pn);
      if (rec2.expectation !== null && rec2.expectation <= 3) {
        lowConfidence.push(pn);
      }
    }
  }

  // Доля автономных мотивов среди всех отметок Части Б (по всем способностям).
  var totalMarks = 0, autoMarks = 0;
  for (var keyNum in motives) {
    if (!Object.prototype.hasOwnProperty.call(motives, keyNum)) continue;
    var arr = motives[keyNum];
    if (!Array.isArray(arr)) continue;
    for (var j = 0; j < arr.length; j++) {
      var tt = motiveType[arr[j]];
      if (tt === "autonomous") { autoMarks++; totalMarks++; }
      else if (tt === "controlled") { totalMarks++; }
    }
  }
  var autonomousShare = totalMarks > 0 ? autoMarks / totalMarks : 0;

  return {
    perAbility: perAbility,
    suggestedTargets: suggestedTargets,
    lowConfidence: lowConfidence,
    autonomousShare: autonomousShare
  };
};
