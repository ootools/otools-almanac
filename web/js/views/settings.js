/* 设置：外观 / 隐私 / 显示 / 数据管理 / 关于 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, H = MC.host, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  function themeButtons(s) {
    var opts = [
      { id: 'light', name: '浅色', icon: 'sun' },
      { id: 'dark', name: '深色', icon: 'moon' },
      { id: 'auto', name: '跟随系统', icon: 'palette' },
    ];
    return '<div class="seg-group">' + opts.map(function (o) {
      return '<button class="seg-btn' + (s.themeMode === o.id ? ' active' : '') +
        '" data-action="set-theme" data-value="' + o.id + '">' + I(o.icon, 14) + U.esc(o.name) + '</button>';
    }).join('') + '</div>';
  }

  function accentButtons(s) {
    return '<div class="accent-group">' + M.ACCENTS.map(function (a) {
      return '<button class="accent-btn' + (s.accent === a.id ? ' active' : '') +
        '" data-action="set-accent" data-value="' + a.id + '" style="--c:' + a.color + '">' +
        '<i></i><span>' + U.esc(a.name) + '</span>' + (s.accent === a.id ? I('check', 13) : '') + '</button>';
    }).join('') + '</div>';
  }

  function toggleRow(name, label, desc, checked) {
    return '<label class="setting-row toggle-row">' +
      '<span class="setting-label"><b>' + U.esc(label) + '</b><small>' + U.esc(desc) + '</small></span>' +
      '<input type="checkbox" data-field="' + name + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="switch"></span></label>';
  }

  function appearanceCard() {
    var s = S.data.settings;
    return '<div class="card">' + UI.sectionHead('外观', '换成你看着顺眼的样子') +
      '<div class="setting-row stack"><span class="setting-label"><b>界面主题</b><small>「跟随系统」会读取宿主或系统的配色</small></span>' + themeButtons(s) + '</div>' +
      '<div class="setting-row stack"><span class="setting-label"><b>主色调</b><small>影响强调色、印章与图表</small></span>' + accentButtons(s) + '</div>' +
    '</div>';
  }

  function generalCard() {
    var s = S.data.settings;
    return '<div class="card">' + UI.sectionHead('习惯与显示', '按你的喜好来') +
      '<div class="setting-row"><span class="setting-label"><b>称呼</b><small>会显示在今日页的问候里</small></span>' +
        '<input class="text-input" type="text" data-field="nickname" maxlength="20" placeholder="怎么称呼你" value="' + U.esc(s.nickname) + '"></div>' +
      '<div class="setting-row"><span class="setting-label"><b>默认提前提醒</b><small>新建倒数日时的默认值</small></span>' +
        '<select class="text-input" data-field="defaultRemind">' +
          [0, 1, 2, 3, 5, 7, 10, 15, 30].map(function (n) {
            return '<option value="' + n + '"' + (Number(s.defaultRemind) === n ? ' selected' : '') + '>' +
              (n === 0 ? '不提醒' : '提前 ' + n + ' 天') + '</option>';
          }).join('') + '</select></div>' +
      toggleRow('privacyMode', '隐私模式', '模糊事件名称与备注，适合在他人面前打开', s.privacyMode) +
      toggleRow('showAlmanac', '显示黄历宜忌', '关闭后今日页与日历不再展示宜忌', s.showAlmanac) +
      toggleRow('showHolidays', '显示节假日调休', '关闭后不显示「休 / 班」标记', s.showHolidays) +
    '</div>';
  }

  function dataCard() {
    var d = S.data;
    var customOff = Object.keys(d.settings.customHolidays.off).length;
    var customWork = Object.keys(d.settings.customHolidays.work).length;
    return '<div class="card">' + UI.sectionHead('数据管理', '所有内容只保存在这台设备上') +
      '<div class="data-stats">' +
        '<div><b>' + d.events.length + '</b><span>个日子</span></div>' +
        '<div><b>' + S.activeEvents().length + '</b><span>进行中</span></div>' +
        '<div><b>' + S.noteCount() + '</b><span>条记事</span></div>' +
        '<div><b>' + (customOff + customWork) + '</b><span>条自定义调休</span></div>' +
      '</div>' +
      '<div class="storage-line ' + (S.ui.storageOk ? 'ok' : 'bad') + '">' +
        I(S.ui.storageOk ? 'shield' : 'info', 15) +
        '<span>' + (S.ui.storageOk ? '本机存储正常 · 从未联网上传' : '本机存储不可用，改动可能不会被保存') + '</span></div>' +
      '<div class="data-actions">' +
        '<button class="btn btn-soft btn-sm" data-action="export-json">' + I('download', 14) + '导出 JSON</button>' +
        '<button class="btn btn-soft btn-sm" data-action="import-json">' + I('upload', 14) + '导入 JSON</button>' +
        '<button class="btn btn-ghost btn-sm" data-action="load-demo">' + I('sparkle', 14) + '载入示例</button>' +
        '<button class="btn btn-ghost btn-sm danger-text" data-action="reset-all">' + I('trash', 14) + '清空数据</button>' +
      '</div>' +
      '<p class="form-hint">导入会替换当前全部日子、记事与自定义调休；外观设置保持不变。导出文件为标准 JSON，可自行备份。</p>' +
    '</div>';
  }

  function aboutCard() {
    return '<div class="card about-card">' + UI.sectionHead('关于 岁纪', 'Chronos Almanac · v1.0.0') +
      '<div class="about-grid">' +
        '<div><b>' + I('calendar', 16) + ' 万年历</b><p>1900–2100 年公历 / 农历、干支生肖、二十四节气、传统节日、建除宜忌。</p></div>' +
        '<div><b>' + I('hourglass', 16) + ' 倒数日</b><p>倒数与正数、公历 / 农历重复、分类提醒、置顶归档、隐私模式。</p></div>' +
        '<div><b>' + I('shield', 16) + ' 完全离线</b><p>无网络请求、无账号、无埋点。数据只写入本机 localStorage。</p></div>' +
        '<div><b>' + I('clock', 16) + ' 日期工具</b><p>日期间隔、日期推算、公历农历互转，工作日统计含调休。</p></div>' +
      '</div>' +
      '<p class="fineprint">' + I('info', 13) + ' 节假日数据来自国务院办公厅 2026 / 2027 年部分节假日安排通知；未收录年份不猜测。宜忌、干支与生肖为传统民俗文化参考，不具科学或决策意义。</p>' +
    '</div>';
  }

  function render() {
    return '<div class="settings-grid">' +
      '<div class="settings-col">' + appearanceCard() + generalCard() + '</div>' +
      '<div class="settings-col">' + dataCard() + aboutCard() + '</div>' +
    '</div>';
  }

  MC.actions.register({
    'set-theme': function (el) { S.setSettings({ themeMode: el.getAttribute('data-value') }); },
    'set-accent': function (el) { S.setSettings({ accent: el.getAttribute('data-value') }); },
    'export-json': function () {
      var name = '岁纪备份-' + U.today() + '.json';
      H.saveJson(name, S.serialize()).then(function (r) {
        if (r) UI.toast(r === 'browser' ? '已通过浏览器下载备份' : '已导出到 ' + r, 'success');
      }).catch(function (e) { UI.toast('导出失败：' + e.message, 'error'); });
    },
    'import-json': function () {
      H.openJson().then(function (file) {
        if (!file) return;
        try {
          var r = S.importData(file.text);
          UI.toast('已导入 ' + r.events + ' 个日子、' + r.notes + ' 条记事', 'success');
        } catch (e) { UI.toast('导入失败：' + e.message, 'error'); }
      }).catch(function (e) { UI.toast('读取文件失败：' + e.message, 'error'); });
    },
    'load-demo': function () {
      UI.confirm({ title: '载入示例数据？', message: '当前的全部日子、记事与自定义调休会被示例内容替换。', confirmText: '载入示例' })
        .then(function (yes) { if (yes) { S.loadDemo(); UI.toast('示例数据已载入', 'success'); } });
    },
    'reset-all': function () {
      UI.confirm({ title: '清空全部数据？', message: '所有倒数日、记事与自定义调休都会被永久删除，无法撤销。建议先导出备份。', danger: true, confirmText: '确认清空' })
        .then(function (yes) { if (yes) { S.resetRecords(); UI.toast('已清空，可以重新开始', 'success'); } });
    },
  });

  MC.views.settings = { render: render };
})();
