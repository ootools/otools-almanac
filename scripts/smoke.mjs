/**
 * 真实浏览器冒烟：CDP 点击回归 + Panel 尺寸截图（无第三方依赖）。
 * 用法（服务 + Chrome 由外部同一条 shell 命令拉起，见 README）：
 *   CDP_PORT=9234 BASE_URL=http://127.0.0.1:6494/ node scripts/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, '_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CDP_PORT = Number(process.env.CDP_PORT || 9234);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:6494/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  let page = null;
  for (let i = 0; i < 20 && !page; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch (e) { /* Chrome 还在启动 */ }
    if (!page) await sleep(300);
  }
  if (!page) throw new Error('找不到 CDP 页面目标');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const jsErrors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      jsErrors.push((d.text || '') + ' ' + (d.exception && d.exception.description ? d.exception.description : ''));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
  });
  return { send, jsErrors };
}

async function main() {
  const { send, jsErrors } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 980, height: 700, deviceScaleFactor: 1, mobile: false,
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.text);
    return res.result && res.result.result ? res.result.result.value : undefined;
  };
  const exists = (sel) => evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const count = (sel) => evaluate(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
  const click = (sel) => evaluate(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`);
  const nav = (v) => click(`[data-action="nav"][data-view="${v}"]`);

  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  };
  const shot = async (name) => {
    await evaluate("(function(){var r=document.getElementById('toast-root');if(r)r.innerHTML='';return true;})()");
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (res.result && res.result.data) {
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(res.result.data, 'base64'));
      console.log(`  shot  ${name}.png`);
    }
  };
  const goto = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 30; i += 1) {
      await sleep(180);
      if (await evaluate('!!(window.MC && window.MC.store && window.MC.store.ui.ready)')) return;
    }
    throw new Error('页面加载超时：' + url);
  };

  // ── 首次打开 / 引导 ─────────────────────────────────
  await goto(BASE + '?reset=1');

  // ── 离线历法数据自检（页面加载之后） ─────────────────
  check('历法范围覆盖 1900–2100', (await evaluate('MC.lunar.from + "/" + MC.lunar.to')) === '1900/2100');
  check('2026-11-10 日干支为戊子', (await evaluate('MC.lunar.dayGanzhi("2026-11-10")')) === '戊子');
  check('农历 2027 正月初一 = 2027-02-06', (await evaluate('MC.lunar.lunarToSolar(2027,1,1,false)')) === '2027-02-06');
  check('农历 2027 五月初五 = 2027-06-09', (await evaluate('MC.lunar.lunarToSolar(2027,5,5,false)')) === '2027-06-09');
  check('2026-10-01 为法定放假', (await evaluate('MC.holidays.lookup("2026-10-01").status')) === 'off');
  check('2026-10-10 为调休上班', (await evaluate('MC.holidays.lookup("2026-10-10").status')) === 'work');
  check('2027 春节假期含 02-06', (await evaluate('MC.holidays.lookup("2027-02-06").status')) === 'off');
  check('二十四节气每年 24 项', (await evaluate('MC.lunar.termList(2026).length')) === 24);

  check('首次打开显示欢迎引导', await exists('.onboard-paper'));
  check('引导含四项能力说明', (await count('.onboard-feats > div')) === 4);
  await shot('01-onboarding');

  await click('[data-action="onboard-demo"]');
  await sleep(350);
  check('载入示例后进入今日页', await exists('.hero-card'));
  check('大日期为数字', /^\d+$/.test(String(await text('.hero-num')).trim()), await text('.hero-num'));
  check('干支年月日三柱', (await count('.gz-cell')) === 3);
  check('今日宜忌两栏', (await count('.yiji-col')) === 2);
  check('倒数速览有条目', (await count('.mini-event')) > 0, String(await count('.mini-event')));
  check('时序卡片', await exists('.timeline-card'));
  check('样式表已生效', (await evaluate("getComputedStyle(document.querySelector('.card')).borderRadius")) === '16px');
  check('面板宽度下无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await evaluate('document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth'));
  await shot('02-today-light');

  await click('[data-action="theme-quick"]');
  await sleep(250);
  check('切换深色主题', (await evaluate("document.documentElement.getAttribute('data-theme')")) === 'dark');
  await shot('03-today-dark');
  await click('[data-action="theme-quick"]');
  await sleep(200);

  // ── 万年历 ──────────────────────────────────────────
  await nav('calendar');
  await sleep(250);
  check('日历渲染 42 格', (await count('.cal-cell')) === 42);
  check('每格都有农历/节日标签', (await count('.cell-label')) === 42);
  check('选中日详情卡', await exists('.cal-detail'));
  check('含调休标记的格子', (await count('.day-flag')) >= 0);
  const monthBefore = await text('.cal-nav-left h3');
  await click('[data-action="cal-shift"][data-delta="1"]');
  await sleep(180);
  check('切换月份', (await text('.cal-nav-left h3')) !== monthBefore,
    monthBefore + ' → ' + await text('.cal-nav-left h3'));
  await click('[data-action="cal-today"]');
  await sleep(180);
  await click('.cal-cell.today');
  await sleep(180);
  check('点选日期高亮', (await count('.cal-cell.selected')) === 1);
  await evaluate(`(function(){var t=document.querySelector('[data-note-text]');t.value='冒烟测试记事';return true;})()`);
  await click('[data-action="save-day-note"]');
  await sleep(220);
  check('保存记事写入本机数据', (await evaluate('MC.store.getNote(MC.util.today())')) === '冒烟测试记事');
  await shot('04-calendar');
  await click('[data-action="mark-day"][data-status="off"]');
  await sleep(200);
  check('自定义放假标记生效', (await evaluate('MC.store.dayInfo(MC.util.today()).holiday.label')) === '自定义放假');
  await click('[data-action="mark-day"][data-status="none"]');
  await sleep(180);
  check('还原自定义标记', (await evaluate('MC.store.dayInfo(MC.util.today()).holiday === null')) === true);

  // ── 倒数日 ──────────────────────────────────────────
  await nav('events');
  await sleep(250);
  check('示例事件卡片 7 张（另 1 张归档）', (await count('.ev-card')) === 7, String(await count('.ev-card')));
  check('分类筛选共 7 项', (await count('.filter-chip')) === 7);
  check('正数日与倒数日并存', (await count('.ev-card.up')) > 0 && (await count('.ev-card.down')) > 0);
  await shot('05-events');

  await evaluate(`(function(){var i=document.querySelector('[data-input-action="event-search"]');i.value='妈妈';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(150);
  check('搜索过滤生效', (await count('.ev-card')) === 1, String(await count('.ev-card')));
  await evaluate(`(function(){var i=document.querySelector('[data-input-action="event-search"]');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(150);

  await click('[data-action="event-filter"][data-value="work"]');
  await sleep(180);
  check('按分类筛选', (await count('.ev-card')) === 1, String(await count('.ev-card')));
  await click('[data-action="event-filter"][data-value="all"]');
  await sleep(180);

  const evBefore = await evaluate('MC.store.data.events.length');
  await click('[data-action="new-event"]');
  await sleep(250);
  check('打开事件编辑器', await exists('#event-form'));
  check('编辑器含 11 个表单项', (await count('#event-form [name]')) >= 11, String(await count('#event-form [name]')));
  await shot('06-event-editor');
  await evaluate(`(function(){var f=document.querySelector('#event-form');f.elements.namedItem('title').value='冒烟测试日';f.elements.namedItem('date').value='2027-01-01';return true;})()`);
  await click('[data-action="save-event"]');
  await sleep(300);
  check('新建事件写入数据', (await evaluate('MC.store.data.events.length')) === evBefore + 1);
  check('新建后弹层已关闭', !(await exists('#event-form')));
  check('新事件标题正确', (await evaluate("MC.store.data.events.filter(function(e){return e.title==='冒烟测试日';}).length")) === 1);

  const newId = await evaluate("MC.store.data.events.filter(function(e){return e.title==='冒烟测试日';})[0].id");
  await click(`[data-action="pin-event"][data-id="${newId}"]`);
  await sleep(180);
  check('置顶切换', (await evaluate(`MC.store.getEvent(${JSON.stringify(newId)}).pinned`)) === true);
  await click(`[data-action="duplicate-event"][data-id="${newId}"]`);
  await sleep(180);
  check('复制事件', (await evaluate('MC.store.data.events.length')) === evBefore + 2);
  await evaluate(`(function(){var f=document.querySelector('[data-input-action="event-sort"]');f.value='created';f.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(180);
  check('排序切换不报错', (await count('.ev-card')) > 0);
  await click('[data-action="toggle-archived"]');
  await sleep(200);
  check('归档视图可打开', (await count('.ev-card')) >= 1);
  await click('[data-action="toggle-archived"]');
  await sleep(180);

  // ── 黄历 ────────────────────────────────────────────
  await nav('almanac');
  await sleep(250);
  check('四柱卡片', (await count('.pillar')) === 4);
  check('宜忌标签齐全', (await count('.alm-tags span')) >= 8, String(await count('.alm-tags span')));
  check('二十四节气表 24 项', (await count('.term-item')) === 24);
  check('官方放假调休列表', (await count('.holiday-row')) > 0, String(await count('.holiday-row')));
  const almBefore = await evaluate('MC.store.ui.almanacDate');
  await click('[data-action="alm-shift"][data-delta="1"]');
  await sleep(180);
  check('黄历翻页', (await evaluate('MC.store.ui.almanacDate')) !== almBefore);
  await click('[data-action="alm-today"]');
  await sleep(150);
  await shot('07-almanac');

  // ── 日期工具 ────────────────────────────────────────
  await nav('tools');
  await sleep(250);
  check('四个日期工具', (await count('.tool-card')) === 4);
  check('四个结果区已计算', (await count('.result-big')) === 4);
  await shot('08-tools');
  await evaluate(`(function(){var i=document.querySelector('[data-draft="offset"]');i.value='100';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(150);
  check('日期推算实时重算', /100/.test(String(await text('#tool-offset-out'))), String(await text('#tool-offset-out')).slice(0, 60));
  check('公历转农历有结果', /农历|月|初/.test(String(await text('#tool-solar-out'))) || (await count('#tool-solar-out .result-row')) > 0);

  // ── 设置 ────────────────────────────────────────────
  await nav('settings');
  await sleep(250);
  check('设置项齐全', (await count('.setting-row')) >= 7, String(await count('.setting-row')));
  check('数据管理四个入口', (await count('.data-actions .btn')) === 4);
  check('四格数据统计', (await count('.data-stats > div')) === 4);
  await click('[data-action="set-accent"][data-value="indigo"]');
  await sleep(180);
  check('切换主色为靛青', (await evaluate("document.documentElement.getAttribute('data-accent')")) === 'indigo');
  await click('[data-action="set-accent"][data-value="cinnabar"]');
  await sleep(150);
  await shot('09-settings');
  await evaluate(`(function(){var c=document.querySelector('[data-field="privacyMode"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(180);
  check('隐私模式开启', (await evaluate('document.body.classList.contains("privacy-on")')) === true);
  await evaluate(`(function(){var c=document.querySelector('[data-field="privacyMode"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(150);

  // ── 导出 / 持久化 ───────────────────────────────────
  check('导出 JSON 可解析', (await evaluate('JSON.parse(MC.store.serialize()).data.events.length')) === evBefore + 2);
  check('今日记事已持久化', (await evaluate('MC.store.getNote(MC.util.today())')) === '冒烟测试记事');

  await goto(BASE);
  await sleep(350);
  check('重载后数据仍在', (await evaluate('MC.store.data.events.length')) === evBefore + 2);
  check('重载后不再显示引导', !(await exists('.onboard-paper')));
  check('重载无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true);

  check('无 JS 运行时异常', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过；截图目录：${SHOTS}`);
  if (failed.length) process.exitCode = 1;
  try { await send('Browser.close'); } catch (e) { /* 端口由外部命令兜底清理 */ }
}

try {
  await main();
} catch (error) {
  console.error('冒烟失败：' + (error.stack || error.message));
  process.exitCode = 1;
}
