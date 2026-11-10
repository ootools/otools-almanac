/* 倒数日：筛选 / 排序 / 搜索 / 事件卡片 / 新建编辑弹层 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, L = MC.lunar, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  var COLORS = ['#B4472F', '#C9833F', '#C25B7A', '#2F6F73', '#5B6FA8', '#3E7D62', '#7A7F87'];
  var ICON_NAMES = ['star', 'heart', 'cake', 'flag', 'book', 'home', 'target', 'clock', 'flower', 'sun', 'hourglass', 'compass'];

  function countText(e) {
    if (e.mode === 'countup') return { n: e.abs, lead: '已经', unit: '天' };
    if (e.days === 0) return { n: '0', lead: '就在', unit: '今天' };
    if (e.days > 0) return { n: e.days, lead: '还有', unit: '天' };
    return { n: e.abs, lead: '已过', unit: '天' };
  }

  function card(e) {
    var c = countText(e);
    var cat = M.categoryOf(e.category);
    var rep = MC.views.today.repeatName(e.repeat);
    var state = e.mode === 'countup' ? 'up' : (e.days === 0 ? 'zero' : (e.days > 0 ? 'down' : 'past'));
    return '<article class="ev-card ' + state + (e.pinned ? ' pinned' : '') + '" style="--ev:' + e.color + '">' +
      '<span class="ev-stripe"></span>' +
      '<div class="ev-icon">' + I(e.icon, 20) + '</div>' +
      '<div class="ev-body">' +
        '<div class="ev-title"><b class="priv">' + U.esc(e.title) + '</b>' +
          (e.pinned ? '<span class="pin-mark">' + I('pin', 12) + '</span>' : '') +
          '<span class="cat-pill" style="--pill:' + cat.color + '">' + U.esc(cat.name) + '</span></div>' +
        '<div class="ev-meta">' + U.cnDate(e.target, e.target.slice(0, 4) !== U.today().slice(0, 4)) +
          ' · ' + U.weekdayCN(e.target) +
          (rep ? ' · ' + U.esc(rep) : '') +
          (e.calendar === 'lunar' && e.lunar ? ' · 农历' + L.MONTH_CN[e.lunar.month] + L.dayCN(e.lunar.day) : '') +
          (e.remindDays ? ' · 提前 ' + e.remindDays + ' 天提醒' : '') + '</div>' +
        (e.note ? '<p class="ev-note priv">' + U.esc(e.note) + '</p>' : '') +
      '</div>' +
      '<div class="ev-count"><small>' + c.lead + '</small><b>' + c.n + '</b><span>' + c.unit + '</span></div>' +
      '<div class="ev-actions">' +
        '<button class="icon-btn" data-action="edit-event" data-id="' + U.esc(e.id) + '" title="编辑">' + I('edit', 15) + '</button>' +
        '<button class="icon-btn" data-action="pin-event" data-id="' + U.esc(e.id) + '" title="' + (e.pinned ? '取消置顶' : '置顶') + '">' + I('pin', 15) + '</button>' +
        '<button class="icon-btn" data-action="duplicate-event" data-id="' + U.esc(e.id) + '" title="复制">' + I('copy', 15) + '</button>' +
        '<button class="icon-btn" data-action="archive-event" data-id="' + U.esc(e.id) + '" title="' + (e.archived ? '取消归档' : '归档') + '">' + I('archive', 15) + '</button>' +
      '</div>' +
    '</article>';
  }

  function listHtml() {
    var list = S.listEvents(S.ui.showArchived);
    var archived = S.data.events.filter(function (e) { return e.archived; }).length;
    if (!list.length) {
      return UI.emptyState('hourglass', S.ui.eventQuery ? '没有匹配的日子' : (S.ui.showArchived ? '归档是空的' : '还没有倒数日'),
        S.ui.eventQuery ? '换个关键词试试' : (S.ui.showArchived ? '归档的日子会收在这里' : '把重要的日子记下来，就不会错过'),
        '<button class="btn btn-primary btn-sm" data-action="new-event">' + I('plus', 14) + '新建倒数日</button>');
    }
    return '<div class="ev-list">' + list.map(card).join('') + '</div>' +
      (archived && !S.ui.showArchived ?
        '<button class="archive-more" data-action="toggle-archived">' + I('archive', 14) + '查看 ' + archived + ' 个已归档的日子' + I('right', 13) + '</button>' : '');
  }

  function filterBar() {
    var cats = [{ id: 'all', name: '全部' }].concat(M.CATEGORIES);
    var total = S.activeEvents().length;
    return '<div class="card ev-toolbar">' +
      '<div class="ev-filters">' + cats.map(function (c) {
        return '<button class="filter-chip' + (S.ui.eventFilter === c.id ? ' active' : '') +
          '" data-action="event-filter" data-value="' + c.id + '">' + U.esc(c.name) + '</button>';
      }).join('') + '</div>' +
      '<div class="ev-tools">' +
        '<label class="search-box">' + I('search', 15) +
          '<input type="search" data-input-action="event-search" placeholder="搜索名称或备注" value="' + U.esc(S.ui.eventQuery) + '"></label>' +
        '<select class="mini-select" data-input-action="event-sort">' +
          '<option value="time"' + (S.ui.eventSort === 'time' ? ' selected' : '') + '>按临近程度</option>' +
          '<option value="date"' + (S.ui.eventSort === 'date' ? ' selected' : '') + '>按目标日期</option>' +
          '<option value="created"' + (S.ui.eventSort === 'created' ? ' selected' : '') + '>按创建时间</option>' +
        '</select>' +
        '<button class="btn btn-primary btn-sm" data-action="new-event">' + I('plus', 14) + '新建</button>' +
      '</div>' +
    '</div>' +
    '<div class="ev-summary"><span id="ev-count">' + total + ' 个进行中的日子</span>' +
      (S.ui.showArchived ? '<button class="link-more" data-action="toggle-archived">返回进行中' + I('left', 13) + '</button>' : '') +
    '</div>';
  }

  /* ── 编辑器 ───────────────────────────────────────────── */
  function editorBody(ev, isNew) {
    var opts = function (arr, sel, valueKey, nameKey) {
      return arr.map(function (o) {
        var v = o[valueKey], n = o[nameKey];
        return '<option value="' + U.esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + U.esc(n) + '</option>';
      }).join('');
    };
    var lunarHint = ev.calendar === 'lunar' && ev.lunar
      ? '农历 ' + L.MONTH_CN[ev.lunar.month] + L.dayCN(ev.lunar.day) : '';
    return '<form id="event-form" class="ev-form" onsubmit="return false">' +
      '<div class="form-row"><label>名称 <i>*</i></label>' +
        '<input name="title" maxlength="40" required placeholder="例如：妈妈的生日" value="' + U.esc(ev.title) + '"></div>' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>类型</label><select name="mode" data-input-action="event-mode">' +
          opts(M.MODES, ev.mode, 'id', 'name') + '</select></div>' +
        '<div class="form-row"><label>日期 <i>*</i></label>' +
          '<input type="date" name="date" required min="1900-01-01" max="2100-12-31" value="' + U.esc(ev.date) + '"></div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>历法</label><select name="calendar" data-input-action="event-calendar">' +
          '<option value="solar"' + (ev.calendar === 'solar' ? ' selected' : '') + '>公历</option>' +
          '<option value="lunar"' + (ev.calendar === 'lunar' ? ' selected' : '') + '>农历（按此日换算）</option>' +
        '</select></div>' +
        '<div class="form-row"><label>重复</label><select name="repeat" id="ev-repeat">' +
          opts(M.REPEATS, ev.repeat, 'id', 'name') + '</select></div>' +
      '</div>' +
      '<p class="form-hint" id="ev-lunar-hint">' + (lunarHint ? U.esc(lunarHint) : '农历重复会按每年对应的公历日期自动推算') + '</p>' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>分类</label><select name="category">' +
          opts(M.CATEGORIES, ev.category, 'id', 'name') + '</select></div>' +
        '<div class="form-row"><label>图标</label><select name="icon">' +
          opts(ICON_NAMES.map(function (n) { return { id: n, name: iconLabel(n) }; }), ev.icon, 'id', 'name') + '</select></div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="form-row"><label>提前提醒</label><select name="remindDays">' +
          [0, 1, 2, 3, 5, 7, 10, 15, 30].map(function (n) {
            return '<option value="' + n + '"' + (Number(ev.remindDays) === n ? ' selected' : '') + '>' +
              (n === 0 ? '不提醒' : '提前 ' + n + ' 天') + '</option>';
          }).join('') + '</select></div>' +
        '<div class="form-row"><label>颜色</label><div class="color-row">' +
          COLORS.map(function (c) {
            return '<button type="button" class="color-dot' + (c === ev.color ? ' active' : '') +
              '" data-action="pick-color" data-color="' + c + '" style="--c:' + c + '" aria-label="选择颜色"></button>';
          }).join('') + '<input type="hidden" name="color" value="' + U.esc(ev.color) + '"></div></div>' +
      '</div>' +
      '<div class="form-row"><label>备注</label>' +
        '<textarea name="note" rows="2" maxlength="500" placeholder="想记下的话…">' + U.esc(ev.note) + '</textarea></div>' +
      '<label class="check-row"><input type="checkbox" name="pinned"' + (ev.pinned ? ' checked' : '') + '> 置顶显示</label>' +
      (isNew ? '' : '<p class="form-id">ID ' + U.esc(ev.id) + '</p>') +
    '</form>';
  }

  function iconLabel(n) {
    var map = { star: '星', heart: '心', cake: '蛋糕', flag: '旗', book: '书', home: '家', target: '靶',
      clock: '钟', flower: '花', sun: '日', hourglass: '沙漏', compass: '罗盘' };
    return map[n] || n;
  }

  function formValues(root) {
    var f = root.querySelector('#event-form');
    var g = function (n) { var el = f.elements.namedItem(n); return el ? el.value : ''; };
    return {
      title: g('title'), mode: g('mode'), date: g('date'), calendar: g('calendar'),
      repeat: g('repeat'), category: g('category'), icon: g('icon'),
      remindDays: Number(g('remindDays')) || 0, color: g('color'), note: g('note'),
      pinned: !!(f.elements.namedItem('pinned') && f.elements.namedItem('pinned').checked),
    };
  }

  function openEvent(id, presetDate) {
    var isNew = !id;
    var ev = id ? JSON.parse(JSON.stringify(S.getEvent(id) || {})) : M.emptyEvent();
    if (presetDate && isNew) ev.date = presetDate;
    if (isNew) ev.remindDays = S.data.settings.defaultRemind;
    if (!ev.color) ev.color = M.categoryOf(ev.category).color;

    var close = UI.modal({
      title: isNew ? '新建日子' : '编辑日子',
      subtitle: isNew ? '公历 / 农历、重复与提醒都可以随时改' : U.cnDate(ev.date, true),
      width: 500,
      body: editorBody(ev, isNew),
      footer:
        (isNew ? '' : '<button class="btn btn-danger btn-sm" data-action="delete-event" data-id="' + U.esc(ev.id) + '">' + I('trash', 14) + '删除</button>') +
        '<span class="modal-spacer"></span>' +
        '<button class="btn btn-ghost btn-sm" data-modal-close>取消</button>' +
        '<button class="btn btn-primary btn-sm" data-action="save-event" data-id="' + U.esc(isNew ? '' : ev.id) + '">' + I('check', 14) + '保存</button>',
      onMount: function (root, hide) {
        var mode = root.querySelector('[name="mode"]');
        var rep = root.querySelector('#ev-repeat');
        if (mode && rep) rep.disabled = mode.value === 'countup';
        void hide;
      },
    });
    void close;
  }

  MC.actions.register({
    'new-event': function () { openEvent(null); },
    'new-event-on': function (el) { openEvent(null, el.getAttribute('data-date')); },
    'edit-event': function (el) { openEvent(el.getAttribute('data-id')); },
    'open-event': function (el) { openEvent(el.getAttribute('data-id')); },
    'save-event': function (el) {
      var id = el.getAttribute('data-id');
      var backdrop = el.closest('.modal-backdrop');
      var v = formValues(backdrop);
      var r = id ? S.updateEvent(id, v) : S.addEvent(Object.assign(M.emptyEvent(), v));
      if (!r.ok) { UI.toast(r.reason || '保存失败', 'error'); return; }
      backdrop.classList.remove('shown');
      setTimeout(function () { backdrop.remove(); }, 180);
      UI.toast(id ? '已更新' : '已添加：' + v.title, 'success');
    },
    'delete-event': function (el) {
      var id = el.getAttribute('data-id');
      var e = S.getEvent(id);
      if (!e) return;
      UI.confirm({ title: '删除这个日子？', message: '「' + e.title + '」将被永久删除，此操作无法撤销。', danger: true, confirmText: '删除' })
        .then(function (yes) {
          if (!yes) return;
          var bd = document.querySelector('.modal-backdrop');
          if (bd) { bd.classList.remove('shown'); setTimeout(function () { bd.remove(); }, 180); }
          S.deleteEvent(id);
          UI.toast('已删除', 'success');
        });
    },
    'pick-color': function (el) {
      var bd = el.closest('.modal-backdrop');
      bd.querySelectorAll('.color-dot').forEach(function (b) { b.classList.remove('active'); });
      el.classList.add('active');
      var hidden = bd.querySelector('[name="color"]');
      if (hidden) hidden.value = el.getAttribute('data-color');
    },
    'event-filter': function (el) { S.ui.eventFilter = el.getAttribute('data-value'); S.notify(); },
    'event-sort': function (el) { S.ui.eventSort = el.value; S.notify(); },
    'toggle-archived': function () { S.ui.showArchived = !S.ui.showArchived; S.notify(); },
    'event-search': function (el) {
      S.ui.eventQuery = el.value;
      var box = document.getElementById('event-list');
      if (box) box.innerHTML = listHtml();
    },
    'event-mode': function (el) {
      var bd = el.closest('.modal-backdrop');
      var rep = bd && bd.querySelector('#ev-repeat');
      if (rep) {
        rep.disabled = el.value === 'countup';
        if (rep.disabled) rep.value = 'none';
      }
    },
    'event-calendar': function (el) {
      var bd = el.closest('.modal-backdrop');
      var hint = bd && bd.querySelector('#ev-lunar-hint');
      var dateEl = bd && bd.querySelector('[name="date"]');
      var rep = bd && bd.querySelector('#ev-repeat');
      if (!hint) return;
      if (el.value === 'lunar' && dateEl && dateEl.value) {
        var l = L.solarToLunar(dateEl.value);
        hint.textContent = l ? '对应农历 ' + l.monthCN + l.dayCN + '（' + l.ganzhiYear + '年）' : '该日期超出 1900–2100 范围';
        if (rep && !rep.disabled) rep.value = 'lunar-yearly';
      } else {
        hint.textContent = '农历重复会按每年对应的公历日期自动推算';
        if (rep && rep.value === 'lunar-yearly') rep.value = 'none';
      }
    },
    'pin-event': function (el) { S.togglePin(el.getAttribute('data-id')); UI.toast('已更新置顶状态', 'success'); },
    'archive-event': function (el) { S.toggleArchive(el.getAttribute('data-id')); UI.toast('已更新归档状态', 'success'); },
    'duplicate-event': function (el) { S.duplicateEvent(el.getAttribute('data-id')); UI.toast('已复制一份', 'success'); },
  });

  function render() {
    return filterBar() + '<div id="event-list">' + listHtml() + '</div>';
  }

  MC.views.events = { render: render, openEvent: openEvent, countText: countText };
})();
