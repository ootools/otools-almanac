/* 应用入口：路由、渲染、全局事件与公共动作 */
(function () {
  'use strict';
  var MC = window.MC;
  var U = MC.util, S = MC.store, I = MC.icons.icon, UI = MC.ui;

  var NAV = [
    { id: 'today', label: '今日', icon: 'home' },
    { id: 'calendar', label: '万年历', icon: 'calendar' },
    { id: 'events', label: '倒数日', icon: 'hourglass' },
    { id: 'almanac', label: '黄历', icon: 'compass' },
    { id: 'tools', label: '日期工具', icon: 'target' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ];

  var SUBTITLE = {
    today: '一本历书，和属于你的日子',
    calendar: '1900–2100 · 公历农历节气一览',
    events: '重要的日子，不该被忘记',
    almanac: '干支建除宜忌，民俗文化参考',
    tools: '间隔、推算与公历农历互转',
    settings: '按你的习惯来',
  };

  var reminderDismissed = false;

  function greeting() {
    var h = new Date().getHours();
    var word = h < 6 ? '夜深了' : (h < 11 ? '早上好' : (h < 14 ? '中午好' : (h < 18 ? '下午好' : '晚上好')));
    var name = S.data.settings.nickname;
    return name ? word + '，' + name : word + '，愿今天顺遂';
  }

  function navHtml() {
    return NAV.map(function (n) {
      var badge = '';
      if (n.id === 'events') {
        var c = S.activeEvents().length;
        if (c) badge = '<span class="nav-count">' + c + '</span>';
      }
      return '<button class="nav-item' + (S.ui.view === n.id ? ' active' : '') +
        '" data-action="nav" data-view="' + n.id + '">' +
        '<span class="nav-icon">' + I(n.icon, 19) + '</span><span>' + n.label + '</span>' + badge +
        (S.ui.view === n.id ? '<i class="nav-active"></i>' : '') + '</button>';
    }).join('');
  }

  function topHtml() {
    var item = NAV.filter(function (n) { return n.id === S.ui.view; })[0] || NAV[0];
    document.getElementById('page-title').textContent = item.label;
    document.getElementById('page-sub').textContent = S.ui.view === 'today' ? greeting() : SUBTITLE[S.ui.view];
    document.getElementById('top-date').innerHTML = I('calendar', 14) + '<span>' + U.esc(U.cnDateFull(U.today())) + '</span>';
    document.getElementById('theme-icon').innerHTML = I(S.ui.theme === 'dark' ? 'sun' : 'moon', 18);
  }

  function reminderHtml() {
    if (reminderDismissed || S.ui.onboarding || S.ui.view !== 'today') return '';
    var list = S.reminders();
    if (!list.length) return '';
    var first = list[0];
    var more = list.length > 1 ? '，另有 ' + (list.length - 1) + ' 个日子临近' : '';
    return '<div class="reminder-banner">' +
      '<span class="reminder-icon">' + I('bell', 18) + '</span>' +
      '<div class="reminder-text"><strong>' + U.esc(first.title) + ' 快到了</strong>' +
        '<p>' + (first.days === 0 ? '就是今天' : '还有 ' + first.days + ' 天') +
        ' · ' + U.esc(U.cnDate(first.target)) + more + '。</p></div>' +
      '<button class="btn btn-soft btn-sm" data-action="nav" data-view="events">查看倒数日</button>' +
      '<button class="icon-btn" data-action="dismiss-reminder" aria-label="关闭提醒">' + I('close', 16) + '</button>' +
    '</div>';
  }

  function render() {
    if (!S.ui.ready) return;
    document.body.classList.toggle('privacy-on', !!S.data.settings.privacyMode);
    document.getElementById('nav').innerHTML = navHtml();
    topHtml();
    document.getElementById('reminder-slot').innerHTML = reminderHtml();

    var view = MC.views[S.ui.view] || MC.views.today;
    var root = document.getElementById('view');
    root.innerHTML = view.render();
    root.scrollTop = 0;
    root.classList.remove('view-enter');
    void root.offsetWidth;
    root.classList.add('view-enter');

    var overlay = document.getElementById('overlay');
    var html = MC.views.onboarding.renderOverlay();
    overlay.innerHTML = html;
    overlay.classList.toggle('active', !!html);
  }

  MC.actions.register({
    'nav': function (el) {
      var v = el.getAttribute('data-view');
      if (v === 'calendar' && S.ui.view !== 'calendar') {
        var d = U.parse(S.ui.selected);
        S.ui.calYear = d.getFullYear();
        S.ui.calMonth = d.getMonth() + 1;
      }
      if (v === 'almanac' && S.ui.view !== 'almanac') S.ui.almanacDate = S.ui.selected;
      S.setRoute(v);
    },
    'theme-quick': function () { S.setSettings({ themeMode: S.ui.theme === 'dark' ? 'light' : 'dark' }); },
    'dismiss-reminder': function () { reminderDismissed = true; render(); },
  });

  function shiftMonth(delta) {
    var m = S.ui.calMonth + delta, y = S.ui.calYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    S.ui.calMonth = m; S.ui.calYear = y; S.notify();
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action]');
      if (el && !el.disabled) {
        e.preventDefault();
        MC.actions.handle(el.getAttribute('data-action'), el, e);
      }
    });

    var onField = function (e) {
      var el = e.target.closest && e.target.closest('[data-input-action]');
      if (el && !el.disabled) MC.actions.handle(el.getAttribute('data-input-action'), el, e);
    };
    document.addEventListener('input', onField);
    document.addEventListener('change', onField);

    document.addEventListener('change', function (e) {
      var el = e.target.closest && e.target.closest('[data-field]');
      if (!el) return;
      var value = el.type === 'checkbox' ? el.checked : el.value;
      if (el.getAttribute('data-field') === 'defaultRemind') value = Number(value);
      var patch = {}; patch[el.getAttribute('data-field')] = value;
      S.setSettings(patch);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modalRoot = document.getElementById('modal-root');
        var last = modalRoot && modalRoot.lastElementChild;
        if (last) { last.classList.remove('shown'); setTimeout(function () { last.remove(); }, 180); return; }
        if (S.ui.onboarding) { MC.actions.handle('onboard-start', document.body, e); return; }
      }
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
      if (typing || S.ui.onboarding || document.querySelector('.modal-backdrop')) return;
      if (S.ui.view === 'calendar') {
        if (e.key === 'ArrowLeft') shiftMonth(-1);
        if (e.key === 'ArrowRight') shiftMonth(1);
      } else if (S.ui.view === 'almanac') {
        if (e.key === 'ArrowLeft') { S.ui.almanacDate = U.addDays(S.ui.almanacDate, -1); S.notify(); }
        if (e.key === 'ArrowRight') { S.ui.almanacDate = U.addDays(S.ui.almanacDate, 1); S.notify(); }
      }
    });

    try {
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (S.data.settings.themeMode === 'auto') { S.applyTheme(); render(); }
        });
      }
    } catch (e) {}
  }

  function boot() {
    S.subscribe(render);
    bind();
    S.init();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
