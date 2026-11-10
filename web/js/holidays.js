/* 法定节假日与调休。
 * 内置数据来自国务院办公厅通知：
 *   2026：国办发明电〔2025〕7号（2025-11-04）
 *   2027：国办发明电〔2026〕10号（2026-11-05）
 * 未收录的年份不猜测，界面会提示"暂无官方调休数据"，用户可自行补录。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;

  var BUILTIN = {
    2026: {
      ranges: [
        { name: '元旦', from: '2026-01-01', to: '2026-01-03' },
        { name: '春节', from: '2026-02-15', to: '2026-02-23' },
        { name: '清明节', from: '2026-04-04', to: '2026-04-06' },
        { name: '劳动节', from: '2026-05-01', to: '2026-05-05' },
        { name: '端午节', from: '2026-06-19', to: '2026-06-21' },
        { name: '中秋节', from: '2026-09-25', to: '2026-09-27' },
        { name: '国庆节', from: '2026-10-01', to: '2026-10-07' },
      ],
      work: ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'],
    },
    2027: {
      ranges: [
        { name: '元旦', from: '2027-01-01', to: '2027-01-03' },
        { name: '春节', from: '2027-02-05', to: '2027-02-13' },
        { name: '清明节', from: '2027-04-03', to: '2027-04-05' },
        { name: '劳动节', from: '2027-05-01', to: '2027-05-05' },
        { name: '端午节', from: '2027-06-09', to: '2027-06-09' },
        { name: '中秋节', from: '2027-09-15', to: '2027-09-15' },
        { name: '国庆节', from: '2027-10-01', to: '2027-10-07' },
      ],
      work: ['2027-01-31', '2027-02-14', '2027-05-08', '2027-09-26', '2027-10-09'],
    },
  };

  var cache = {};

  function builtinMap(year) {
    if (cache[year]) return cache[year];
    var map = {};
    var cfg = BUILTIN[year];
    if (cfg) {
      cfg.ranges.forEach(function (r) {
        var k = r.from;
        var guard = 0;
        while (k <= r.to && guard < 20) {
          map[k] = { status: 'off', label: r.name + '假期' };
          k = U.addDays(k, 1);
          guard += 1;
        }
      });
      cfg.work.forEach(function (k) { map[k] = { status: 'work', label: '调休上班' }; });
    }
    cache[year] = map;
    return map;
  }

  /** 用户自定义优先于内置：custom = { off:{key:label}, work:{key:label} } */
  function lookup(k, custom) {
    var c = custom || {};
    var off = c.off || {};
    var work = c.work || {};
    if (Object.prototype.hasOwnProperty.call(off, k)) {
      return { status: 'off', label: off[k] || '自定义放假' };
    }
    if (Object.prototype.hasOwnProperty.call(work, k)) {
      return { status: 'work', label: work[k] || '自定义补班' };
    }
    var year = Number(String(k).slice(0, 4));
    return builtinMap(year)[k] || null;
  }

  function isWorkday(k, custom) {
    var h = lookup(k, custom);
    if (h) return h.status === 'work';
    var wd = U.parse(k).getDay();
    return wd >= 1 && wd <= 5;
  }

  function list(year, custom) {
    var out = [];
    var cfg = BUILTIN[year];
    if (cfg) {
      cfg.ranges.forEach(function (r) {
        out.push({ key: r.from, end: r.to, status: 'off', label: r.name, days: U.diff(r.from, r.to) + 1 });
      });
      cfg.work.forEach(function (k) { out.push({ key: k, end: k, status: 'work', label: '调休上班', days: 1 }); });
    }
    var c = custom || {};
    Object.keys(c.off || {}).forEach(function (k) {
      if (Number(k.slice(0, 4)) === year) out.push({ key: k, end: k, status: 'off', label: c.off[k] || '自定义放假', days: 1 });
    });
    Object.keys(c.work || {}).forEach(function (k) {
      if (Number(k.slice(0, 4)) === year) out.push({ key: k, end: k, status: 'work', label: c.work[k] || '自定义补班', days: 1 });
    });
    return out.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
  }

  MC.holidays = {
    years: Object.keys(BUILTIN).map(Number),
    hasYear: function (y) { return !!BUILTIN[y]; },
    ranges: function (y) { return BUILTIN[y] ? BUILTIN[y].ranges.slice() : []; },
    lookup: lookup,
    isWorkday: isWorkday,
    list: list,
  };
})();
