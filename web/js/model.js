/* 倒数日 / 正数日领域模型：事件、重复规则、天数计算、数据归一化。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;

  var CATEGORIES = [
    { id: 'life', name: '生活', color: '#B4472F', icon: 'sun' },
    { id: 'family', name: '家人', color: '#C9833F', icon: 'heart' },
    { id: 'love', name: '纪念日', color: '#C25B7A', icon: 'flower' },
    { id: 'work', name: '工作', color: '#2F6F73', icon: 'flag' },
    { id: 'study', name: '学习', color: '#5B6FA8', icon: 'book' },
    { id: 'other', name: '其他', color: '#7A7F87', icon: 'star' },
  ];

  var REPEATS = [
    { id: 'none', name: '不重复' },
    { id: 'yearly', name: '每年（公历）' },
    { id: 'lunar-yearly', name: '每年（农历）' },
    { id: 'monthly', name: '每月' },
    { id: 'weekly', name: '每周' },
  ];

  var MODES = [
    { id: 'countdown', name: '倒数日', hint: '还有多少天' },
    { id: 'countup', name: '正数日', hint: '已经多少天' },
  ];

  var ACCENTS = [
    { id: 'cinnabar', name: '朱砂', color: '#B4472F' },
    { id: 'indigo', name: '靛青', color: '#3C6B8F' },
    { id: 'bamboo', name: '竹青', color: '#3E7D62' },
  ];

  var DEFAULT_SETTINGS = {
    themeMode: 'light',
    accent: 'cinnabar',
    privacyMode: false,
    showAlmanac: true,
    showHolidays: true,
    defaultRemind: 3,
    nickname: '',
    customHolidays: { off: {}, work: {} },
  };

  function mod(n, m) { return ((n % m) + m) % m; }

  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  /** 构造 y-m-d，日超出当月天数时收敛到月末（每月重复的 31 号） */
  function clampDate(y, m, d) {
    while (m > 12) { y += 1; m -= 12; }
    while (m < 1) { y -= 1; m += 12; }
    return U.key(new Date(y, m - 1, Math.min(d, daysInMonth(y, m))));
  }

  function emptyEvent() {
    var t = U.today();
    return {
      id: U.uid(),
      title: '',
      date: t,
      calendar: 'solar',
      lunar: null,
      mode: 'countdown',
      repeat: 'none',
      category: 'life',
      color: CATEGORIES[0].color,
      icon: 'star',
      note: '',
      remindDays: DEFAULT_SETTINGS.defaultRemind,
      pinned: false,
      archived: false,
      createdAt: Date.now(),
    };
  }

  function emptyData() {
    return {
      version: 1,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      events: [],
      notes: {},
      seen: false,
      createdAt: Date.now(),
    };
  }

  /** 下一次（或当天）发生日 */
  function nextFor(ev, from) {
    if (ev.repeat === 'none' || from < ev.date) return ev.date;
    var d = U.parse(from);
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var base = U.parse(ev.date);
    var bm = base.getMonth() + 1;
    var bd = base.getDate();
    if (ev.repeat === 'yearly') {
      var k1 = clampDate(y, bm, bd);
      return k1 >= from ? k1 : clampDate(y + 1, bm, bd);
    }
    if (ev.repeat === 'monthly') {
      var k2 = clampDate(y, m, bd);
      if (k2 >= from) return k2;
      return clampDate(y, m + 1, bd);
    }
    if (ev.repeat === 'weekly') {
      return U.addDays(from, mod(base.getDay() - d.getDay(), 7));
    }
    if (ev.repeat === 'lunar-yearly' && ev.lunar && MC.lunar) {
      var L = ev.lunar;
      var k3 = MC.lunar.lunarToSolar(y, L.month, L.day, L.leap);
      if (k3 && k3 >= from) return k3;
      return MC.lunar.lunarToSolar(y + 1, L.month, L.day, L.leap) || ev.date;
    }
    return ev.date;
  }

  /** 天数计算：days = 目标日 − 今天（正数=还有，负数=已过） */
  function compute(ev, today) {
    var t = today || U.today();
    var target = ev.mode === 'countup' ? ev.date : nextFor(ev, t);
    var days = U.diff(t, target);
    return {
      target: target,
      days: days,
      abs: Math.abs(days),
      state: days > 0 ? 'future' : days < 0 ? 'past' : 'today',
      repeating: ev.repeat !== 'none' && ev.mode === 'countdown',
    };
  }

  function validate(ev) {
    if (!ev || !String(ev.title || '').trim()) return { ok: false, reason: '请填写事件名称' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date || '')) return { ok: false, reason: '日期格式不正确' };
    if (ev.repeat === 'lunar-yearly' && !ev.lunar) return { ok: false, reason: '农历重复需要有效的农历日期' };
    return { ok: true };
  }

  function categoryOf(id) {
    for (var i = 0; i < CATEGORIES.length; i += 1) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function normalize(raw) {
    var base = emptyData();
    if (!raw || typeof raw !== 'object') return base;
    var src = (raw.data && typeof raw.data === 'object') ? raw.data : raw;
    var s = src.settings || {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(s, k)) base.settings[k] = s[k];
    });
    if (!base.settings.customHolidays || typeof base.settings.customHolidays !== 'object') {
      base.settings.customHolidays = { off: {}, work: {} };
    }
    if (!base.settings.customHolidays.off) base.settings.customHolidays.off = {};
    if (!base.settings.customHolidays.work) base.settings.customHolidays.work = {};
    if (!['light', 'dark', 'auto'].includes(base.settings.themeMode)) base.settings.themeMode = 'light';
    if (!['cinnabar', 'indigo', 'bamboo'].includes(base.settings.accent)) base.settings.accent = 'cinnabar';
    base.settings.privacyMode = !!base.settings.privacyMode;
    base.settings.showAlmanac = base.settings.showAlmanac !== false;
    base.settings.showHolidays = base.settings.showHolidays !== false;
    base.settings.defaultRemind = U.clamp(Number(base.settings.defaultRemind) || 0, 0, 30);
    base.settings.nickname = String(base.settings.nickname || '').slice(0, 20);

    var list = Array.isArray(src.events) ? src.events : [];
    base.events = list.filter(function (e) { return e && typeof e === 'object'; }).map(function (e) {
      var ev = emptyEvent();
      Object.keys(ev).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(e, k)) ev[k] = e[k];
      });
      ev.id = String(e.id || U.uid()).slice(0, 40);
      ev.title = String(e.title || '未命名').slice(0, 40);
      ev.date = /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : U.today();
      ev.calendar = e.calendar === 'lunar' ? 'lunar' : 'solar';
      ev.mode = e.mode === 'countup' ? 'countup' : 'countdown';
      if (ev.mode === 'countup') ev.repeat = 'none';
      if (!REPEATS.some(function (r) { return r.id === ev.repeat; })) ev.repeat = 'none';
      if (!CATEGORIES.some(function (c) { return c.id === ev.category; })) ev.category = 'other';
      ev.color = /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : categoryOf(ev.category).color;
      ev.note = String(e.note || '').slice(0, 500);
      ev.remindDays = U.clamp(Number(e.remindDays) || 0, 0, 30);
      ev.pinned = !!e.pinned;
      ev.archived = !!e.archived;
      ev.lunar = e.lunar && typeof e.lunar === 'object' ? {
        year: Number(e.lunar.year) || U.parse(ev.date).getFullYear(),
        month: U.clamp(Number(e.lunar.month) || 1, 1, 12),
        day: U.clamp(Number(e.lunar.day) || 1, 1, 30),
        leap: !!e.lunar.leap,
      } : null;
      return ev;
    });
    var notes = src.notes && typeof src.notes === 'object' ? src.notes : {};
    Object.keys(notes).forEach(function (k) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) base.notes[k] = String(notes[k]).slice(0, 500);
    });
    base.seen = !!src.seen;
    base.createdAt = Number(src.createdAt) || Date.now();
    return base;
  }

  MC.model = {
    CATEGORIES: CATEGORIES,
    REPEATS: REPEATS,
    MODES: MODES,
    ACCENTS: ACCENTS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    emptyEvent: emptyEvent,
    emptyData: emptyData,
    normalize: normalize,
    compute: compute,
    nextFor: nextFor,
    validate: validate,
    clampDate: clampDate,
    categoryOf: categoryOf,
  };
})();
