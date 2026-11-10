/* 黄历：完整日课（干支 / 建除 / 宜忌 / 冲煞）+ 二十四节气表 + 节假日调休 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, L = MC.lunar, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  function pillar(name, gz, sub) {
    return '<div class="pillar"><small>' + name + '</small><b>' + U.esc(gz) + '</b><em>' + U.esc(sub || '') + '</em></div>';
  }

  function mainCard(k) {
    var info = S.dayInfo(k), l = info.lunar, h = info.holiday;
    if (!l) return '<div class="card">' + UI.emptyState('compass', '超出历法范围', '本插件内置 1900–2100 年的农历与节气数据') + '</div>';
    return '<div class="card alm-main">' +
      '<div class="alm-head">' +
        '<div><div class="alm-date">' + U.esc(U.cnDate(k, true)) + '</div>' +
          '<p>' + U.esc(U.cnDateFull(k)) + ' · 农历' + U.esc(l.monthCN) + U.esc(l.dayCN) + '</p></div>' +
        '<span class="alm-seal">' + U.esc(l.jianchu) + '<small>建除</small></span>' +
      '</div>' +
      '<div class="pillar-row">' +
        pillar('年柱', l.ganzhiYear, l.zodiac + '年') +
        pillar('月柱', l.ganzhiMonth, l.monthCN) +
        pillar('日柱', l.ganzhiDay, '冲' + l.chong) +
        pillar('建除', l.jianchu, '十二神') +
      '</div>' +
      '<div class="alm-yiji">' +
        '<div class="alm-yj yi"><div class="alm-yj-head"><span class="yiji-seal">宜</span><b>今日所宜</b></div>' +
          '<div class="alm-tags">' + l.yi.map(function (x) { return '<span>' + U.esc(x) + '</span>'; }).join('') + '</div></div>' +
        '<div class="alm-yj ji"><div class="alm-yj-head"><span class="yiji-seal">忌</span><b>今日所忌</b></div>' +
          '<div class="alm-tags">' + l.ji.map(function (x) { return '<span>' + U.esc(x) + '</span>'; }).join('') + '</div></div>' +
      '</div>' +
      '<div class="alm-meta">' +
        (info.term ? '<span class="meta-chip term">' + I('sun', 14) + '节气 · ' + U.esc(info.term) + '</span>' : '') +
        (info.festivals || []).map(function (f) {
          return '<span class="meta-chip ' + f.type + '">' + I('sparkle', 14) + U.esc(f.name) + '</span>';
        }).join('') +
        (h ? '<span class="meta-chip ' + h.status + '">' + I('calendar', 14) + U.esc(h.label) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function navCard(k) {
    return '<div class="card alm-nav">' +
      '<div class="alm-nav-left">' +
        '<button class="icon-btn" data-action="alm-shift" data-delta="-1" title="前一天">' + I('left', 16) + '</button>' +
        '<input type="date" data-input-action="alm-date" value="' + U.esc(k) + '" min="1900-01-01" max="2100-12-31">' +
        '<button class="icon-btn" data-action="alm-shift" data-delta="1" title="后一天">' + I('right', 16) + '</button>' +
      '</div>' +
      '<div class="alm-nav-right">' +
        '<button class="btn btn-ghost btn-sm" data-action="alm-shift" data-delta="-30" title="前一月">前一月</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="alm-today" title="回到今天">' + I('target', 13) + '今天</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="alm-shift" data-delta="30" title="后一月">后一月</button>' +
      '</div>' +
    '</div>';
  }

  function termCard(k) {
    var y = U.parse(k).getFullYear();
    var list = L.termList(y);
    if (!list.length) return '';
    return '<div class="card">' +
      UI.sectionHead(y + ' 年 · 二十四节气', '太阳视黄经每 15° 交一节，日期按北京时间',
        '<span class="head-note">' + I('info', 13) + ' 离线推算</span>') +
      '<div class="term-grid">' + list.map(function (t) {
        var cur = t.key === k, past = t.key < U.today();
        return '<div class="term-item' + (cur ? ' current' : '') + (past ? ' past' : '') + '">' +
          '<b>' + U.esc(t.name) + '</b><span>' + U.esc(U.cnDate(t.key)) + '</span></div>';
      }).join('') + '</div></div>';
  }

  function holidayCard(k) {
    var y = U.parse(k).getFullYear();
    var items = MC.holidays.list(y, S.data.settings.customHolidays);
    var has = MC.holidays.hasYear(y);
    var custom = S.data.settings.customHolidays;
    return '<div class="card">' +
      UI.sectionHead(y + ' 年 · 放假与调休',
        has ? '依据国务院办公厅通知，用户自定义标记优先' : '暂无该年官方通知，可自行补录',
        '<span class="head-note">' + (has ? I('check', 13) + ' 已收录官方通知' : I('info', 13) + ' 待补录') + '</span>') +
      (items.length ? '<div class="holiday-list">' + items.map(function (it) {
        var isCustom = !!(custom.off[it.key] || custom.work[it.key]);
        return '<div class="holiday-row ' + it.status + '">' +
          '<span class="hl-tag">' + (it.status === 'off' ? '休' : '班') + '</span>' +
          '<div><b>' + U.esc(it.label) + '</b><small>' + U.esc(U.cnDate(it.key, true)) +
            (it.days > 1 ? ' — ' + U.esc(U.cnDate(it.end)) + '（' + it.days + ' 天）' : '') + '</small></div>' +
          (isCustom ? '<span class="custom-mark">自定义</span>' : '') +
        '</div>';
      }).join('') + '</div>' : UI.emptyState('calendar', '暂无放假安排', '可以在下方补录这一年的放假 / 补班日')) +
      '<div class="holiday-add">' +
        '<div class="detail-subhead"><b>补录 / 覆盖某一天</b><small>会覆盖内置数据</small></div>' +
        '<div class="holiday-form">' +
          '<input type="date" data-holiday-date value="' + U.esc(k) + '">' +
          '<input type="text" data-holiday-label maxlength="20" placeholder="名称（可选）">' +
          '<select data-holiday-status>' +
            '<option value="off">放假</option><option value="work">补班</option><option value="none">还原默认</option>' +
          '</select>' +
          '<button class="btn btn-soft btn-sm" data-action="holiday-add">' + I('plus', 13) + '应用</button>' +
        '</div></div>' +
    '</div>';
  }

  function render() {
    var k = S.ui.almanacDate;
    return '<div class="alm-layout">' +
      '<div class="alm-col-left">' + navCard(k) + mainCard(k) + '</div>' +
      '<div class="alm-col-right">' + holidayCard(k) +
        '<p class="fineprint">' + I('info', 13) + ' 干支、建除十二神与宜忌属传统民俗文化内容，仅供了解与参考；节气为天文算法低精度推算，重大安排请以官方历书为准。</p>' +
      '</div>' +
    '</div>' + termCard(k);
  }

  MC.actions.register({
    'alm-shift': function (el) {
      var d = Number(el.getAttribute('data-delta'));
      S.ui.almanacDate = U.addDays(S.ui.almanacDate, d);
      S.notify();
    },
    'alm-today': function () { S.ui.almanacDate = U.today(); S.notify(); },
    'alm-date': function (el) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
      S.ui.almanacDate = el.value;
      S.notify();
    },
    'holiday-add': function () {
      var dateEl = document.querySelector('[data-holiday-date]');
      var labelEl = document.querySelector('[data-holiday-label]');
      var stEl = document.querySelector('[data-holiday-status]');
      if (!dateEl || !/^\d{4}-\d{2}-\d{2}$/.test(dateEl.value)) { UI.toast('请选择有效日期', 'error'); return; }
      var st = stEl.value;
      if (st === 'none') {
        var had = S.clearCustomHoliday(dateEl.value);
        UI.toast(had ? '已还原为默认' : '这一天没有自定义标记', had ? 'success' : 'info');
      } else {
        S.setCustomHoliday(dateEl.value, st, labelEl.value.trim() || (st === 'off' ? '自定义放假' : '自定义补班'));
        UI.toast('已保存 ' + U.cnDate(dateEl.value), 'success');
      }
    },
  });

  MC.views.almanac = { render: render };
})();
