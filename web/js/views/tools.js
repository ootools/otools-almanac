/* 日期工具：间隔计算 / 日期推算 / 公历农历互转（全部本地计算） */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, L = MC.lunar, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  var t = U.today();
  var draft = {
    gapA: U.addDays(t, -30), gapB: t,
    base: U.addDays(t, 30), offset: 30,
    solar: t,
    lyear: U.parse(t).getFullYear(), lmonth: 1, lday: 1, lleap: '0',
  };

  function workdays(a, b) {
    if (b < a) { var x = a; a = b; b = x; }
    var n = 0, k = a, guard = 0;
    var custom = S.data.settings.customHolidays;
    while (k <= b && guard < 4000) {
      if (MC.holidays.isWorkday(k, custom)) n += 1;
      k = U.addDays(k, 1); guard += 1;
    }
    return n;
  }

  function gapResult() {
    var a = draft.gapA, b = draft.gapB;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return '<p class="tool-empty">请选择两个日期</p>';
    var days = U.diff(a, b), abs = Math.abs(days);
    var wd = workdays(a, b);
    return '<div class="result-big"><b>' + abs + '</b><span>天' + (days < 0 ? '（' + U.esc(b) + ' 在前）' : '') + '</span></div>' +
      '<div class="result-row"><span>折合</span><b>' + (Math.floor(abs / 7) + ' 周 ' + (abs % 7) + ' 天') + '</b></div>' +
      '<div class="result-row"><span>约合</span><b>' + U.round1(abs / 30.44) + ' 个月</b></div>' +
      '<div class="result-row"><span>工作日</span><b>' + wd + ' 天（含调休）</b></div>' +
      '<div class="result-row"><span>起止</span><b>' + U.esc(U.cnDateFull(a)) + ' → ' + U.esc(U.cnDateFull(b)) + '</b></div>';
  }

  function offsetResult() {
    var base = draft.base, n = Math.round(Number(draft.offset) || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return '<p class="tool-empty">请选择起始日期</p>';
    var k = U.addDays(base, n);
    var info = S.dayInfo(k);
    var l = info.lunar;
    return '<div class="result-big"><b>' + U.esc(U.cnDate(k)) + '</b><span>' + U.esc(U.cnDateFull(k)) + '</span></div>' +
      '<div class="result-row"><span>相距</span><b>' + Math.abs(n) + ' 天（' + (n >= 0 ? '之后' : '之前') + '）</b></div>' +
      (l ? '<div class="result-row"><span>农历</span><b>' + U.esc(l.monthCN) + U.esc(l.dayCN) + ' · ' + U.esc(l.ganzhiDay) + '日</b></div>' : '') +
      (info.term ? '<div class="result-row"><span>节气</span><b>' + U.esc(info.term) + '</b></div>' : '') +
      (info.holiday ? '<div class="result-row"><span>调休</span><b>' + U.esc(info.holiday.label) + '</b></div>' : '');
  }

  function solarResult() {
    var k = draft.solar;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return '<p class="tool-empty">请选择公历日期</p>';
    var l = L.solarToLunar(k);
    if (!l) return '<p class="tool-empty">超出 1900–2100 范围</p>';
    return '<div class="result-big"><b>' + U.esc(l.monthCN) + U.esc(l.dayCN) + '</b><span>' + U.esc(l.ganzhiYear) + '年 · ' + U.esc(l.zodiac) + '</span></div>' +
      '<div class="result-row"><span>干支</span><b>' + U.esc(l.ganzhiYear) + '年 ' + U.esc(l.ganzhiMonth) + '月 ' + U.esc(l.ganzhiDay) + '日</b></div>' +
      '<div class="result-row"><span>月内</span><b>第 ' + l.day + ' / ' + l.monthDays + ' 天' + (l.leap ? '（闰月）' : '') + '</b></div>' +
      '<div class="result-row"><span>星期</span><b>' + U.esc(U.cnDateFull(k)) + '</b></div>';
  }

  function lunarResult() {
    var y = Number(draft.lyear), m = Number(draft.lmonth), d = Number(draft.lday), leap = draft.lleap === '1';
    var k = L.lunarToSolar(y, m, d, leap);
    if (!k) return '<p class="tool-empty">没有找到对应的公历日期（可能该年无此闰月或日期不存在）</p>';
    return '<div class="result-big"><b>' + U.esc(U.cnDate(k)) + '</b><span>' + U.esc(U.cnDateFull(k)) + '</span></div>' +
      '<div class="result-row"><span>输入</span><b>' + y + ' 年 ' + (leap ? '闰' : '') + U.esc(L.MONTH_CN[m]) + U.esc(L.dayCN(d)) + '</b></div>' +
      '<div class="result-row"><span>节气</span><b>' + (L.termOn(k) || '—') + '</b></div>';
  }

  function recalc() {
    var map = { 'gap-out': gapResult, 'offset-out': offsetResult, 'solar-out': solarResult, 'lunar-out': lunarResult };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById('tool-' + id);
      if (el) el.innerHTML = map[id]();
    });
  }

  function field(label, inputHtml) {
    return '<div class="tool-field"><label>' + label + '</label>' + inputHtml + '</div>';
  }

  function dinput(name, value, extra) {
    return '<input type="date" data-draft="' + name + '" data-input-action="tool-change" value="' + U.esc(value) + '"' + (extra || '') + '>';
  }
  function ninput(name, value, extra) {
    return '<input type="number" data-draft="' + name + '" data-input-action="tool-change" value="' + U.esc(value) + '"' + (extra || '') + '>';
  }
  function sinput(name, options, value) {
    return '<select data-draft="' + name + '" data-input-action="tool-change">' + options.map(function (o) {
      return '<option value="' + U.esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + U.esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  function toolCard(icon, title, desc, fieldsHtml, outId, outFn) {
    return '<div class="card tool-card">' +
      '<div class="tool-head"><span class="tool-icon">' + I(icon, 18) + '</span><div><h3>' + U.esc(title) + '</h3><p>' + U.esc(desc) + '</p></div></div>' +
      '<div class="tool-fields">' + fieldsHtml + '</div>' +
      '<div class="tool-out" id="tool-' + outId + '-out">' + outFn() + '</div>' +
    '</div>';
  }

  function render() {
    var monthOpts = L.MONTH_CN.slice(1).map(function (n, i) { return [i + 1, n]; });
    var dayOpts = [];
    for (var i = 1; i <= 30; i += 1) dayOpts.push([i, L.dayCN(i)]);
    return '<div class="tool-intro">' + UI.sectionHead('日期计算器', '三个小工具，全部在本机完成，不联网') +
      '<span class="head-note">' + I('shield', 13) + ' 纯离线</span></div>' +
      '<div class="tool-grid">' +
        toolCard('clock', '日期间隔', '算算两日之间隔了多久',
          field('开始', dinput('gapA', draft.gapA)) + field('结束', dinput('gapB', draft.gapB)),
          'gap', gapResult) +
        toolCard('arrowRight', '日期推算', '从某天起，往前或往后数 N 天',
          field('起始日', dinput('base', draft.base)) +
            field('天数（可为负）', ninput('offset', draft.offset, ' step="1"')),
          'offset', offsetResult) +
        toolCard('sun', '公历 → 农历', '看看这一天对应农历几月初几',
          field('公历日期', dinput('solar', draft.solar)), 'solar', solarResult) +
        toolCard('compass', '农历 → 公历', '农历生日落在公历哪一天',
          field('农历年', ninput('lyear', draft.lyear, ' min="1900" max="2100"')) +
            field('月', sinput('lmonth', monthOpts, draft.lmonth)) +
            field('日', sinput('lday', dayOpts, draft.lday)) +
            field('闰', sinput('lleap', [['0', '平月'], ['1', '闰月']], draft.lleap)),
          'lunar', lunarResult) +
      '</div>' +
      '<p class="fineprint">' + I('info', 13) + ' 农历与干支覆盖 1900–2100 年；工作日统计已计入内置的法定节假日与调休，并可叠加你自定义的标记。</p>';
  }

  MC.actions.register({
    'tool-change': function (el) {
      var name = el.getAttribute('data-draft');
      if (!name) return;
      draft[name] = el.value;
      recalc();
    },
  });

  MC.views.tools = { render: render, recalc: recalc };
})();
