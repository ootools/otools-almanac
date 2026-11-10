/* 示例数据：相对「今天」生成，保证任何时候打开都有可看的内容，且可一键清空。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;
  var L = MC.lunar;

  function lunarOf(k) {
    var l = L.solarToLunar(k);
    return l ? { year: l.year, month: l.month, day: l.day, leap: l.leap } : null;
  }

  function ev(o) {
    var base = MC.model.emptyEvent();
    Object.keys(o).forEach(function (k) { base[k] = o[k]; });
    return base;
  }

  function build() {
    var t = U.today();
    var y = U.parse(t).getFullYear();
    var springKey = L.lunarToSolar(y, 1, 1, false);
    // 若今年春节已过，示例指向明年春节
    if (springKey && springKey < t) springKey = L.lunarToSolar(y + 1, 1, 1, false);
    var springLunar = springKey ? lunarOf(springKey) : null;

    var list = [
      ev({
        title: '春节 · 回家', date: springKey || U.addDays(t, 80),
        calendar: 'lunar', lunar: springLunar,
        mode: 'countdown', repeat: 'lunar-yearly', category: 'family',
        color: '#B4472F', icon: 'home', note: '提前订票，陪家人吃年夜饭。',
        remindDays: 15, pinned: true,
      }),
      ev({
        title: '相识纪念日', date: U.addDays(t, -820),
        mode: 'countup', repeat: 'none', category: 'love',
        color: '#C25B7A', icon: 'heart', note: '从那天起，日子有了刻度。',
        remindDays: 0, pinned: true,
      }),
      ev({
        title: '项目交付', date: U.addDays(t, 12),
        mode: 'countdown', repeat: 'none', category: 'work',
        color: '#2F6F73', icon: 'flag', note: '联调 + 验收材料，提前两天自检。',
        remindDays: 3, pinned: false,
      }),
      ev({
        title: '妈妈的生日', date: U.addDays(t, 34),
        mode: 'countdown', repeat: 'yearly', category: 'family',
        color: '#C9833F', icon: 'cake', note: '记得订蛋糕和花。',
        remindDays: 7, pinned: false,
      }),
      ev({
        title: '资格认证考试', date: U.addDays(t, 58),
        mode: 'countdown', repeat: 'none', category: 'study',
        color: '#5B6FA8', icon: 'book', note: '每周末刷一套真题。',
        remindDays: 14, pinned: false,
      }),
      ev({
        title: '房租缴纳', date: U.addDays(t, 6),
        mode: 'countdown', repeat: 'monthly', category: 'life',
        color: '#7A7F87', icon: 'clock', note: '每月固定支出。',
        remindDays: 2, pinned: false,
      }),
      ev({
        title: '周末长跑', date: U.addDays(t, 3),
        mode: 'countdown', repeat: 'weekly', category: 'life',
        color: '#3E7D62', icon: 'target', note: '十公里，别偷懒。',
        remindDays: 0, pinned: false,
      }),
      ev({
        title: '旧屋搬家', date: U.addDays(t, -140),
        mode: 'countup', repeat: 'none', category: 'life',
        color: '#7A7F87', icon: 'archive', note: '已完成，留作纪念。',
        remindDays: 0, pinned: false, archived: true,
      }),
    ];

    var notes = {};
    notes[t] = '今天整理一下这个月的安排。';
    notes[U.addDays(t, 3)] = '和朋友约了晚饭。';
    notes[U.addDays(t, 12)] = '交付日，留出一整天缓冲。';

    var data = MC.model.emptyData();
    data.events = list;
    data.notes = notes;
    data.seen = true;
    return data;
  }

  MC.demo = { build: build };
})();
