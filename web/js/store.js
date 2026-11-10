/* 状态与持久化：所有数据只保存在本机 localStorage，不联网、不上传。
 * 对外暴露 MC.store：视图只读 state，所有写操作走这里的 mutation。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, M = MC.model, H = MC.host, L = MC.lunar;

  var STORAGE_KEY = 'otools-almanac.v1';
  var listeners = [];
  var data = M.emptyData();
  var persistOk = true;
  var cache = null;

  var t0 = U.today();
  var d0 = U.parse(t0);
  var ui = {
    ready: false,
    view: 'today',
    calYear: d0.getFullYear(),
    calMonth: d0.getMonth() + 1,
    selected: t0,
    almanacDate: t0,
    eventFilter: 'all',
    eventSort: 'time',
    showArchived: false,
    eventQuery: '',
    onboarding: false,
    theme: 'light',
    host: false,
    lang: 'zh-CN',
    storageOk: true,
  };

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      persistOk = true;
    } catch (e) {
      persistOk = false;
      ui.storageOk = false;
    }
  }

  function touch() { cache = null; persist(); notify(); }
  function notify() {
    for (var i = 0; i < listeners.length; i += 1) {
      try { listeners[i](); } catch (e) { console.error('[almanac] render error', e); }
    }
  }
  function subscribe(fn) { listeners.push(fn); }

  function resolveTheme() {
    var mode = data.settings.themeMode;
    if (mode === 'light' || mode === 'dark') return mode;
    var h = H.hostTheme();
    if (h === 'dark' || h === 'light') return h;
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }

  function applyTheme() {
    ui.theme = resolveTheme();
    document.documentElement.setAttribute('data-theme', ui.theme);
    document.documentElement.setAttribute('data-accent', data.settings.accent || 'cinnabar');
  }

  function init(options) {
    var opts = options || {};
    ui.host = H.available();
    ui.lang = H.language();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = M.normalize(JSON.parse(raw));
    } catch (e) { data = M.emptyData(); ui.storageOk = false; }

    var query = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { query[k] = v; }); } catch (e) {}
    if (query.reset === '1') data = M.emptyData();
    if ((query.demo === '1' || opts.demo) && !data.events.length) { data = MC.demo.build(); data.seen = true; }
    if (query.theme === 'dark' || query.theme === 'light') data.settings.themeMode = query.theme;
    if (query.reset === '1' || query.demo === '1') persist();

    applyTheme();
    ui.onboarding = !data.seen;
    ui.ready = true;
    notify();
    return data;
  }

  /* ── 设置 ─────────────────────────────────────────────── */
  function setSettings(patch) {
    Object.keys(patch || {}).forEach(function (k) { data.settings[k] = patch[k]; });
    var s = data.settings;
    s.defaultRemind = U.clamp(Math.round(Number(s.defaultRemind) || 0), 0, 30);
    s.nickname = String(s.nickname || '').slice(0, 20);
    if (!['light', 'dark', 'auto'].includes(s.themeMode)) s.themeMode = 'light';
    if (!['cinnabar', 'indigo', 'bamboo'].includes(s.accent)) s.accent = 'cinnabar';
    applyTheme();
    touch();
  }

  function setCustomHoliday(k, status, label) {
    var c = data.settings.customHolidays;
    delete c.off[k]; delete c.work[k];
    if (status === 'off') c.off[k] = label || '自定义放假';
    if (status === 'work') c.work[k] = label || '自定义补班';
    touch();
  }

  function clearCustomHoliday(k) {
    var c = data.settings.customHolidays;
    var had = !!(c.off[k] || c.work[k]);
    delete c.off[k]; delete c.work[k];
    if (had) touch();
    return had;
  }

  /* ── 事件 CRUD ────────────────────────────────────────── */
  function getEvent(id) {
    for (var i = 0; i < data.events.length; i += 1) if (data.events[i].id === id) return data.events[i];
    return null;
  }

  function syncLunar(ev) {
    if (ev.calendar === 'lunar') {
      var l = L.solarToLunar(ev.date);
      ev.lunar = l ? { year: l.year, month: l.month, day: l.day, leap: l.leap } : null;
      if (!l) ev.calendar = 'solar';
    } else if (ev.repeat !== 'lunar-yearly') {
      ev.lunar = null;
    }
    return ev;
  }

  function addEvent(ev) {
    var v = M.validate(syncLunar(ev));
    if (!v.ok) return v;
    if (ev.mode === 'countup') ev.repeat = 'none';
    ev.title = String(ev.title).trim().slice(0, 40);
    data.events.push(ev);
    touch();
    return { ok: true, id: ev.id };
  }

  function updateEvent(id, patch) {
    var cur = getEvent(id);
    if (!cur) return { ok: false, reason: 'not-found' };
    var next = Object.assign({}, cur, patch);
    if (next.mode === 'countup') next.repeat = 'none';
    var v = M.validate(syncLunar(next));
    if (!v.ok) return v;
    next.title = String(next.title).trim().slice(0, 40);
    data.events[data.events.indexOf(cur)] = next;
    touch();
    return { ok: true };
  }

  function deleteEvent(id) {
    var n = data.events.length;
    data.events = data.events.filter(function (e) { return e.id !== id; });
    if (data.events.length !== n) touch();
  }

  function togglePin(id) {
    var e = getEvent(id);
    if (e) { e.pinned = !e.pinned; touch(); }
  }
  function toggleArchive(id) {
    var e = getEvent(id);
    if (e) { e.archived = !e.archived; touch(); }
  }
  function duplicateEvent(id) {
    var e = getEvent(id);
    if (!e) return;
    var copy = JSON.parse(JSON.stringify(e));
    copy.id = U.uid();
    copy.title = e.title + '（副本）';
    copy.createdAt = Date.now();
    copy.pinned = false; copy.archived = false;
    data.events.push(copy);
    touch();
  }

  /* ── 每日记事 ─────────────────────────────────────────── */
  function getNote(k) { return data.notes[k] || ''; }
  function setNote(k, text) {
    var v = String(text || '').slice(0, 500);
    if (v.trim()) data.notes[k] = v;
    else delete data.notes[k];
    touch();
  }
  function clearNote(k) { delete data.notes[k]; touch(); }
  function noteCount() { return Object.keys(data.notes).length; }

  /* ── 查询：供视图使用 ─────────────────────────────────── */
  function computed(e) {
    var c = M.compute(e, U.today());
    return Object.assign({}, e, c);
  }

  /** 按筛选条件返回带计算结果的事件列表 */
  function listEvents(includeArchived) {
    var q = String(ui.eventQuery || '').trim().toLowerCase();
    var out = data.events.filter(function (e) {
      if (e.archived && !includeArchived) return false;
      if (ui.eventFilter !== 'all' && e.category !== ui.eventFilter) return false;
      if (q && (e.title + ' ' + (e.note || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).map(computed);
    if (ui.eventSort === 'time') {
      out.sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return Math.abs(a.days) - Math.abs(b.days);
      });
    } else if (ui.eventSort === 'created') {
      out.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    } else {
      out.sort(function (a, b) { return a.target < b.target ? -1 : a.target > b.target ? 1 : 0; });
    }
    return out;
  }

  function activeEvents() { return data.events.filter(function (e) { return !e.archived; }); }

  /** 即将到来 / 已到期（用于今日页与提醒） */
  function upcoming(limit) {
    return activeEvents().map(computed)
      .filter(function (e) { return e.mode === 'countdown' && e.days >= 0; })
      .sort(function (a, b) { return a.days - b.days; })
      .slice(0, limit || 4);
  }

  function reminders() {
    return activeEvents().map(computed).filter(function (e) {
      return e.mode === 'countdown' && e.days >= 0 && e.days <= e.remindDays;
    }).sort(function (a, b) { return a.days - b.days; });
  }

  /** 某一天命中的事件（重复事件按「下一次发生日」判断） */
  function eventsOn(k) {
    var out = [];
    data.events.forEach(function (e) {
      if (e.archived) return;
      var c = M.compute(e, k);
      if (e.mode === 'countup') { if (e.date === k) out.push(c); return; }
      if (M.nextFor(e, k) === k) out.push(c);
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  }

  function dayInfo(k) { return L.info(k, data.settings.customHolidays); }

  /** 下一个节气 / 下一个法定假期 */
  function nextHoliday() {
    var k = U.today();
    var custom = data.settings.customHolidays;
    for (var i = 0; i < 400; i += 1) {
      var h = MC.holidays.lookup(k, custom);
      if (h && h.status === 'off') return { key: k, label: h.label, days: i };
      k = U.addDays(k, 1);
    }
    return null;
  }

  /* ── 数据管理 ─────────────────────────────────────────── */
  function serialize() {
    return JSON.stringify({ app: 'otools-almanac', version: 1, exportedAt: new Date().toISOString(), data: data }, null, 2);
  }
  function parseImport(text) {
    var obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object') throw new Error('文件内容不是有效的 JSON');
    var n = M.normalize(obj);
    if (!n.events.length && !Object.keys(n.notes).length) throw new Error('文件里没有可导入的事件或记事');
    return n;
  }
  function importData(text) {
    var next = parseImport(text);
    var keep = { themeMode: data.settings.themeMode, accent: data.settings.accent, privacyMode: data.settings.privacyMode };
    next.settings = Object.assign(next.settings, keep);
    next.seen = true;
    data = next;
    ui.onboarding = false;
    ui.eventFilter = 'all';
    ui.eventQuery = '';
    touch();
    return { events: data.events.length, notes: noteCount() };
  }
  function resetRecords() {
    var settings = JSON.parse(JSON.stringify(data.settings));
    data = M.emptyData();
    data.settings = settings;
    data.seen = true;
    ui.onboarding = false;
    ui.eventFilter = 'all'; ui.eventQuery = ''; ui.showArchived = false;
    touch();
  }
  function loadDemo() {
    var keep = { themeMode: data.settings.themeMode, accent: data.settings.accent, privacyMode: data.settings.privacyMode };
    data = MC.demo.build();
    data.settings = Object.assign(data.settings, keep);
    ui.onboarding = false;
    touch();
  }
  function markSeen() {
    if (data.seen) return;
    data.seen = true;
    touch();
  }
  function setRoute(view) { ui.view = view; notify(); }

  MC.store = {
    ui: ui,
    get data() { return data; },
    get persistOk() { return persistOk; },
    init: init, subscribe: subscribe, notify: notify, applyTheme: applyTheme,
    setSettings: setSettings, setCustomHoliday: setCustomHoliday, clearCustomHoliday: clearCustomHoliday,
    getEvent: getEvent, addEvent: addEvent, updateEvent: updateEvent, deleteEvent: deleteEvent,
    togglePin: togglePin, toggleArchive: toggleArchive, duplicateEvent: duplicateEvent,
    getNote: getNote, setNote: setNote, clearNote: clearNote, noteCount: noteCount,
    computed: computed, listEvents: listEvents, activeEvents: activeEvents,
    upcoming: upcoming, reminders: reminders, eventsOn: eventsOn, dayInfo: dayInfo, nextHoliday: nextHoliday,
    serialize: serialize, parseImport: parseImport, importData: importData,
    resetRecords: resetRecords, loadDemo: loadDemo, markSeen: markSeen, setRoute: setRoute,
  };
})();
