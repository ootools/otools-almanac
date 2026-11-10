/* 今日：大日期 + 农历干支 + 宜忌 + 倒数速览 + 节气节日 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, L = MC.lunar, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  function holidayBadge(h) {
    if (!h) return '';
    var off = h.status === 'off';
    return '<span class="holiday-badge ' + (off ? 'off' : 'work') + '">' +
      (off ? '休' : '班') + '<b>' + U.esc(h.label) + '</b></span>';
  }

  function chip(f) {
    return '<span class="fest-chip ' + f.type + '">' + U.esc(f.name) + '</span>';
  }

  function ganzhiCell(label, value, sub) {
    return '<div class="gz-cell"><small>' + label + '</small><strong>' + U.esc(value) + '</strong>' +
      (sub ? '<em>' + U.esc(sub) + '</em>' : '') + '</div>';
  }

  function yiJiCard(info) {
    var l = info.lunar;
    if (!l || !S.data.settings.showAlmanac) {
      return '<div class="card yiji-card">' + UI.sectionHead('今日黄历', '可到「黄历」页查看完整内容') +
        '<div class="yiji-disabled">' + (S.data.settings.showAlmanac ? '该日期超出 1900–2100 范围' : '黄历显示已在设置中关闭') + '</div></div>';
    }
    var nt = L.nextTerm(U.today());
    return '<div class="card yiji-card">' +
      UI.sectionHead('今日宜忌', l.jianchu + '日 · ' + l.ganzhiDay + ' · 冲' + l.chong,
        '<button class="btn btn-soft btn-sm" data-action="nav" data-view="almanac">完整黄历' + I('arrowRight', 14) + '</button>') +
      '<div class="yiji-grid">' +
        '<div class="yiji-col yi"><div class="yiji-seal">宜</div><ul>' +
          l.yi.map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="yiji-col ji"><div class="yiji-seal">忌</div><ul>' +
          l.ji.map(function (x) { return '<li>' + U.esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '</div>' +
      '<div class="yiji-foot">' +
        '<div><small>农历月</small><b>' + U.esc(l.monthCN) + ' · ' + l.monthDays + ' 天</b></div>' +
        '<div><small>日柱</small><b>' + U.esc(l.ganzhiDay) + ' · ' + U.esc(l.jianchu) + '</b></div>' +
        '<div><small>下一节气</small><b>' + (nt ? U.esc(nt.name) + ' · ' + U.cnDate(nt.key) : '—') + '</b></div>' +
      '</div>' +
      '<p class="yiji-note">' + I('info', 12) + ' 宜忌依建除十二神推得，属传统民俗文化参考，不用于实际决策。</p>' +
    '</div>';
  }

  function eventMini(e) {
    var c = e.mode === 'countup' ? 'up' : (e.days === 0 ? 'zero' : 'down');
    var num = e.mode === 'countup' ? e.abs : e.days;
    var suffix = e.mode === 'countup' ? '天了' : (e.days === 0 ? '天' : '天后');
    if (e.days === 0 && e.mode !== 'countup') num = '今';
    return '<button class="mini-event" data-action="open-event" data-id="' + U.esc(e.id) + '" style="--ev:' + e.color + '">' +
      '<span class="mini-icon">' + I(e.icon, 17) + '</span>' +
      '<span class="mini-body"><b class="priv">' + U.esc(e.title) + '</b>' +
        '<small>' + U.cnDate(e.target) + (e.repeating ? ' · ' + repeatName(e.repeat) : '') + '</small></span>' +
      '<span class="mini-num ' + c + '"><b>' + num + '</b><small>' + suffix + '</small></span>' +
    '</button>';
  }

  function repeatName(r) {
    var hit = MC.model.REPEATS.filter(function (x) { return x.id === r; })[0];
    return hit ? hit.name.replace('（公历）', '').replace('（农历）', '农历') : '';
  }

  function countdownCard() {
    var up = S.upcoming(4);
    var all = S.activeEvents().length;
    return '<div class="card soon-card">' +
      UI.sectionHead('日子近了', all ? '共 ' + all + ' 个进行中的日子' : '还没有添加事件',
        '<button class="btn btn-primary btn-sm" data-action="new-event">' + I('plus', 14) + '新建</button>') +
      (up.length ? '<div class="mini-list">' + up.map(eventMini).join('') + '</div>' :
        UI.emptyState('hourglass', '还没有倒数日', '把重要的日子记下来，就不会错过', '<button class="btn btn-soft btn-sm" data-action="load-demo">载入示例</button>')) +
      (up.length ? '<button class="link-more" data-action="nav" data-view="events">查看全部 ' + all + ' 个日子' + I('arrowRight', 13) + '</button>' : '') +
    '</div>';
  }

  function termCard(info) {
    var t = U.today();
    var nt = L.nextTerm(t);
    var nh = S.data.settings.showHolidays ? S.nextHoliday() : null;
    var terms = L.termList(U.parse(t).getFullYear());
    var past = terms.filter(function (x) { return x.key < t; }).length;
    return '<div class="card timeline-card">' +
      UI.sectionHead('时序', '节气与假期，慢慢数着过') +
      '<div class="timeline">' +
        (nt ? '<div class="tl-item"><span class="tl-dot term"></span><div><b>' + U.esc(nt.name) + '</b>' +
          '<small>' + U.cnDate(nt.key) + ' · 还有 ' + U.diff(t, nt.key) + ' 天</small></div></div>' : '') +
        (nh ? '<div class="tl-item"><span class="tl-dot off"></span><div><b>' + U.esc(nh.label) + '</b>' +
          '<small>' + U.cnDate(nh.key) + ' · 还有 ' + nh.days + ' 天</small></div></div>' : '') +
        '<div class="tl-item"><span class="tl-dot plain"></span><div><b>今年已过 ' + past + ' 个节气</b>' +
          '<small>二十四节气轮转，周而复始</small></div></div>' +
      '</div></div>';
  }

  function render() {
    var t = U.today();
    var info = S.dayInfo(t);
    var d = U.parse(t);
    var l = info.lunar;
    var gz = info.weekday;
    var fests = info.festivals || [];
    var big = String(d.getDate());
    var monthCN = ['', '一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'][d.getMonth() + 1];

    return '<div class="today-grid">' +
      '<div class="card hero-card">' +
        '<div class="hero-main">' +
          '<div class="hero-kicker">' + d.getFullYear() + ' · ' + monthCN + ' · ' + gz + '</div>' +
          '<div class="hero-date"><span class="hero-num">' + big + '</span><span class="hero-unit">日</span></div>' +
          '<div class="hero-sub">' + U.esc(U.cnDateFull(t)) + '</div>' +
          '<div class="hero-chips">' +
            (info.holiday ? holidayBadge(info.holiday) : '') +
            fests.map(chip).join('') +
            (info.term ? '<span class="fest-chip term">' + U.esc(info.term) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hero-aside">' +
          '<div class="seal-mark"><span>岁</span><span>纪</span></div>' +
          '<div class="lunar-line">' + (l ? '农历' + U.esc(l.monthCN) + U.esc(l.dayCN) : '农历数据不可用') + '</div>' +
          (l ? '<div class="gz-row">' +
            ganzhiCell('年', l.ganzhiYear, l.zodiac + '年') +
            ganzhiCell('月', l.ganzhiMonth, '') +
            ganzhiCell('日', l.ganzhiDay, l.jianchu + '日') +
          '</div>' : '') +
          (l ? '<p class="hero-foot">建除 ' + U.esc(l.jianchu) + ' · 冲' + U.esc(l.chong) + ' · 月内第 ' + l.day + ' 天</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="today-cols">' + yiJiCard(info) + countdownCard() + '</div>' +
      termCard(info) +
      '<p class="fineprint">' + I('info', 13) + ' 宜忌、建除与生肖为传统民俗文化参考，不具科学或决策意义；节假日调休以国务院办公厅通知为准。</p>' +
    '</div>';
  }

  MC.views.today = { render: render, holidayBadge: holidayBadge, chip: chip, repeatName: repeatName };
})();
