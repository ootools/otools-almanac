/* 首次运行引导：一次简短的说明，不阻断、可跳过 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, I = MC.icons.icon, UI = MC.ui;
  MC.views = MC.views || {};

  function renderOverlay() {
    if (!S.ui.onboarding) return '';
    return '<div class="onboard">' +
      '<div class="onboard-paper">' +
        '<div class="onboard-deco"><span>岁</span><span>纪</span></div>' +
        '<div class="onboard-kicker">CHRONOS ALMANAC · 离线万年历</div>' +
        '<h2>把日子，<br>认真记下来。</h2>' +
        '<p class="onboard-lead">一本放在本机的万年历，加上一本属于你的倒数日。</p>' +
        '<div class="onboard-feats">' +
          '<div>' + I('calendar', 17) + '<span>农历干支 · 节气 · 宜忌</span></div>' +
          '<div>' + I('flag', 17) + '<span>法定节假日与调休</span></div>' +
          '<div>' + I('hourglass', 17) + '<span>倒数日与正数日</span></div>' +
          '<div>' + I('shield', 17) + '<span>完全离线 · 不上传</span></div>' +
        '</div>' +
        '<div class="onboard-actions">' +
          '<button class="btn btn-primary" data-action="onboard-start">开始使用' + I('arrowRight', 15) + '</button>' +
          '<button class="btn btn-ghost" data-action="onboard-demo">' + I('sparkle', 15) + '先看看示例</button>' +
        '</div>' +
        '<p class="onboard-foot">' + I('info', 13) + ' 数据只保存在这台设备上，随时可在「设置」里导出备份或清空。今天是 ' + U.esc(U.cnDateFull(U.today())) + '。</p>' +
      '</div>' +
    '</div>';
  }

  MC.actions.register({
    'onboard-start': function () { S.markSeen(); S.ui.onboarding = false; S.notify(); UI.toast('欢迎使用岁纪', 'success'); },
    'onboard-demo': function () { S.loadDemo(); S.ui.onboarding = false; S.notify(); UI.toast('示例数据已载入', 'success'); },
  });

  MC.views.onboarding = { renderOverlay: renderOverlay };
})();
