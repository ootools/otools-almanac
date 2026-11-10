/* 万年历：月网格（农历 / 节气 / 节日 / 调休 / 事件 / 记事）+ 选中日详情 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, L = MC.lunar, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  var WEEK_HEAD = ['一', '二', '三', '四', '五', '六', '日'];

  function cell(x) {
    var info = S.dayInfo(x.key);
    var label = info.label || { text: '', kind: 'plain' };
    var h = S.data.settings.showHolidays ? info.holiday : null;
    var evs = S.eventsOn(x.key);
    var note = S.getNote(x.key);
    var cls = ['cal-cell'];
    if (!x.inMonth) cls.push('out');
    if (x.weekday >= 5) cls.push('weekend');
    if (x.isToday) cls.push('today');
    if (x.key === S.ui.selected) cls.push('selected');
    if (h && h.status === 'off') cls.push('holiday-off');
    if (h && h.status === 'work') cls.push('holiday-work');
    if (!info.inRange) cls.push('no-range');

    var dots = '';
    if (evs.length) dots += '<i class="dot ev" style="background:' + evs[0].color + '"></i>';
    if (note) dots += '<i class="dot note"></i>';

    return '<button class="' + cls.join(' ') + '" data-action="select-day" data-date="' + x.key + '" title="' + U.esc(U.cnDateFull(x.key)) + '">' +
      '<span class="cell-top"><b>' + x.day + '</b>' +
        (h ? '<i class="day-flag ' + h.status + '">' + (h.status === 'off' ? '休' : '班') + '</i>' : '') +
      '</span>' +
      '<span class="cell-label ' + label.kind + '">' + U.esc(label.text) + '</span>' +
      '<span class="cell-dots">' + dots + '</span>' +
    '</button>';
  }

  function gridCard() {
    var y = S.ui.calYear, m = S.ui.calMonth;
    var grid = U.monthGrid(y, m);
    var hasOfficial = MC.holidays.hasYear(y);
    return '<div class="card cal-grid-card">' +
      '<div class="cal-nav">' +
        '<div class="cal-nav-left">' +
          '<button class="icon-btn" data-action="cal-shift" data-delta="-12" title="上一年">' + I('chevronsLeft', 16) + '</button>' +
          '<button class="icon-btn" data-action="cal-shift" data-delta="-1" title="上个月">' + I('left', 16) + '</button>' +
          '<h3>' + y + ' <em>年</em> ' + U.pad(m) + ' <em>月</em></h3>' +
          '<button class="icon-btn" data-action="cal-shift" data-delta="1" title="下个月">' + I('right', 16) + '</button>' +
          '<button class="icon-btn" data-action="cal-shift" data-delta="12" title="下一年">' + I('chevronsRight', 16) + '</button>' +
        '</div>' +
        '<div class="cal-nav-right">' +
          (hasOfficial ? '<span class="official-tag">' + I('check', 13) + '含官方调休</span>' : '<span class="official-tag muted">暂无官方调休</span>') +
          '<button class="btn btn-ghost btn-sm" data-action="cal-today">' + I('target', 13) + '今天</button>' +
        '</div>' +
      '</div>' +
      '<div class="cal-week">' + WEEK_HEAD.map(function (w, i) {
        return '<span class="' + (i >= 5 ? 'we' : '') + '">' + w + '</span>';
      }).join('') + '</div>' +
      '<div class="cal-grid">' + grid.map(cell).join('') + '</div>' +
      '<div class="cal-legend">' +
        '<span><i class="lg today"></i>今天</span>' +
        '<span><i class="lg traditional"></i>传统节日</span>' +
        '<span><i class="lg term"></i>节气</span>' +
        '<span><i class="lg off"></i>放假</span>' +
        '<span><i class="lg work"></i>调休上班</span>' +
        '<span><i class="lg ev"></i>倒数日</span>' +
        '<span><i class="lg note"></i>记事</span>' +
      '</div>' +
    '</div>';
  }

  function detailCard() {
    var k = S.ui.selected;
    var info = S.dayInfo(k);
    var l = info.lunar;
    var h = info.holiday;
    var evs = S.eventsOn(k);
    var note = S.getNote(k);
    var fests = info.festivals || [];

    var yiJi = (!l || !S.data.settings.showAlmanac) ? '' :
      '<div class="detail-yiji">' +
        '<div class="dy-col"><span class="dy-seal yi">宜</span><p>' + l.yi.map(U.esc).join(' · ') + '</p></div>' +
        '<div class="dy-col"><span class="dy-seal ji">忌</span><p>' + l.ji.map(U.esc).join(' · ') + '</p></div>' +
      '</div>';

    return '<div class="card cal-detail">' +
      '<div class="detail-head">' +
        '<div><h3>' + U.esc(U.cnDate(k, true)) + '</h3><p>' + U.esc(U.cnDateFull(k)) + '</p></div>' +
        '<span class="detail-seal">' + (l ? U.esc(l.ganzhiDay) : '—') + '</span>' +
      '</div>' +
      '<div class="detail-lunar">' +
        '<b>' + (l ? '农历' + U.esc(l.monthCN) + U.esc(l.dayCN) : '超出历法范围') + '</b>' +
        (l ? '<span>' + U.esc(l.ganzhiYear) + '年 · ' + U.esc(l.zodiac) + ' · ' + U.esc(l.jianchu) + '日 · 冲' + U.esc(l.chong) + '</span>' : '') +
      '</div>' +
      (fests.length ? '<div class="detail-fests">' + fests.map(function (f) {
        return MC.views.today.chip(f);
      }).join('') + (info.term ? MC.views.today.chip({ name: info.term, type: 'term' }) : '') + '</div>' : '') +
      (MC.views.today.holidayBadge(h) ? '<div class="detail-holiday">' + MC.views.today.holidayBadge(h) + '</div>' : '') +
      yiJi +
      '<div class="detail-events">' +
        '<div class="detail-subhead"><b>这一天的日子</b>' +
          '<button class="mini-add" data-action="new-event-on" data-date="' + k + '">' + I('plus', 13) + '添加</button></div>' +
        (evs.length ? evs.map(function (e) {
          return '<button class="detail-ev" data-action="open-event" data-id="' + U.esc(e.id) + '" style="--ev:' + e.color + '">' +
            I(e.icon, 14) + '<span class="priv">' + U.esc(e.title) + '</span>' +
            '<em>' + (e.mode === 'countup' ? '第 ' + e.abs + ' 天' : (e.days === 0 ? '就是这天' : e.days + ' 天后')) + '</em></button>';
        }).join('') : '<p class="detail-empty">这一天还没有安排</p>') +
      '</div>' +
      '<div class="detail-notes">' +
        '<div class="detail-subhead"><b>记事</b>' +
          (note ? '<button class="mini-add danger" data-action="clear-day-note" data-date="' + k + '">' + I('trash', 13) + '清除</button>' : '') + '</div>' +
        '<textarea data-note-text placeholder="记点什么…（只保存在本机）" rows="2">' + U.esc(note) + '</textarea>' +
        '<button class="btn btn-soft btn-sm btn-block" data-action="save-day-note" data-date="' + k + '">' + I('check', 14) + '保存记事</button>' +
      '</div>' +
      (S.data.settings.showHolidays ? '<div class="detail-custom">' +
        '<div class="detail-subhead"><b>调休标记</b><small>覆盖内置数据</small></div>' +
        '<div class="custom-row">' +
          '<button class="btn btn-ghost btn-sm" data-action="mark-day" data-date="' + k + '" data-status="off">设为放假</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="mark-day" data-date="' + k + '" data-status="work">设为补班</button>' +
          '<button class="btn btn-ghost btn-sm" data-action="mark-day" data-date="' + k + '" data-status="none">还原</button>' +
        '</div></div>' : '') +
    '</div>';
  }

  function render() {
    return '<div class="cal-layout">' + gridCard() + detailCard() + '</div>';
  }

  MC.actions.register({
    'select-day': function (el) {
      var k = el.getAttribute('data-date');
      var d = U.parse(k);
      S.ui.selected = k;
      S.ui.calYear = d.getFullYear();
      S.ui.calMonth = d.getMonth() + 1;
      S.notify();
    },
    'cal-shift': function (el) {
      var delta = Number(el.getAttribute('data-delta'));
      var y = S.ui.calYear, m = S.ui.calMonth;
      if (Math.abs(delta) === 12) y += delta > 0 ? 1 : -1;
      else m += delta;
      while (m < 1) { m += 12; y -= 1; }
      while (m > 12) { m -= 12; y += 1; }
      S.ui.calMonth = m; S.ui.calYear = y;
      S.notify();
    },
    'cal-today': function () {
      var d = U.parse(U.today());
      S.ui.calYear = d.getFullYear(); S.ui.calMonth = d.getMonth() + 1; S.ui.selected = U.today();
      S.notify();
    },
    'save-day-note': function (el) {
      var k = el.getAttribute('data-date');
      var box = document.querySelector('[data-note-text]');
      S.setNote(k, box ? box.value : '');
      UI.toast(box && box.value.trim() ? '记事已保存' : '记事已清空', 'success');
    },
    'clear-day-note': function (el) {
      S.clearNote(el.getAttribute('data-date'));
      UI.toast('已清除记事', 'success');
    },
    'mark-day': function (el) {
      var k = el.getAttribute('data-date'), st = el.getAttribute('data-status');
      if (st === 'none') {
        var had = S.clearCustomHoliday(k);
        UI.toast(had ? '已还原为默认' : '这一天没有自定义标记', had ? 'success' : 'info');
      } else {
        S.setCustomHoliday(k, st, st === 'off' ? '自定义放假' : '自定义补班');
        UI.toast(st === 'off' ? '已标记为放假' : '已标记为补班', 'success');
      }
    },
  });

  MC.views.calendar = { render: render };
})();
