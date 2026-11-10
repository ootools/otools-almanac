# 岁纪 · 万年历与倒数日（Chronos Almanac）

OTools 独立插件，`panel` 模式默认打开（980 × 700）。纯前端、**完全离线**：
所有数据只写入本机 `localStorage`，无网络请求、无账号、无埋点。

## 功能

### 万年历 / 黄历
- **1900–2100 公历 ⇄ 农历**：月首表由 `lunardate` / `lunarInfo` 官方农历表在构建期预生成，运行时零依赖。
- **干支与生肖**：年柱、月柱（五虎遁）、日柱（六十甲子连续递推，锚点 2026-11-10 = 戊子）、建除十二神、冲煞。
- **二十四节气**：Meeus 太阳视黄经求每 15° 交点，取北京时间日期，低精度天文推算。
- **节日**：传统节日（春节/元宵/端午/七夕/中秋/重阳/除夕/小年等）、公历节日、母亲节/父亲节/感恩节等推算节日。
- **黄历宜忌**：按建除十二神给出民俗参考文案，明确标注不具科学或决策意义。
- **法定节假日与调休**：内置国务院办公厅 2026 / 2027 年通知全文（放假区间 + 调休上班日）；未收录年份不猜测，界面提示「暂无官方调休数据」。可自定义覆盖任意一天的放假 / 补班标记。
- **日历月视图**：42 格显示农历日、节气、节日、休/班角标、事件点、记事点；点选日期查看当日黄历、事件、记事，并可直接补录调休或添加倒数日。

### 倒数日 / 正数日
- 倒数日（还有多少天）与正数日（已经多少天）。
- 重复规则：不重复、每年（公历）、**每年（农历）**、每月、每周；农历重复自动换算每年对应的公历日期。
- 分类、颜色、图标、备注、置顶、归档、复制、提前提醒。
- 筛选 / 排序 / 搜索；已归档单独查看。
- 首次运行可一键载入示例数据，也可直接开始使用。

### 日期工具
- 日期间隔（天数 / 周数 / 约合月数 / 含调休的工作日数）。
- 日期推算（起始日 ± N 天，附农历、节气、调休）。
- 公历 → 农历、农历 → 公历（支持闰月）。

### 外观与数据
- 浅色 / 深色 / 跟随系统；朱砂 / 靛青 / 竹青三套主色。
- 隐私模式（模糊事件名称与备注）、黄历 / 节假日显示开关、默认提醒天数、称呼。
- JSON 导入导出（OTools 宿主文件对话框；普通浏览器回退为下载与 `input[type=file]`）、载入示例、清空数据。

## 数据来源与免责

| 项目 | 来源 |
| --- | --- |
| 农历月首 | `lunardate` / `lunarInfo` 官方农历表，构建期生成 `web/js/calendar-data.js` |
| 节气 | Meeus 低精度太阳视黄经算法，按北京时间取日期 |
| 日干支 | 六十甲子连续递推，锚点 2026-11-10 = 戊子 |
| 宜忌 / 建除 / 生肖 | 传统民俗文化整理，**仅供了解与参考** |
| 放假调休 | 国务院办公厅《关于 2026 年部分节假日安排的通知》《关于 2027 年部分节假日安排的通知》 |

> 黄历内容属民俗文化参考，不具科学或决策意义；节气为天文算法低精度推算；
> 节假日安排请以官方最新通知为准。未收录的年份不猜测，由用户自行补录。

## 工程结构

```
plugin.json            # 清单：openMode=panel, panelWidth=980, panelHeight=700
logo.svg
web/                   # 源码（原生 HTML/CSS/JS，无框架、无 bundler）
  index.html           # 入口，含 OTools 宿主桥标记
  css/app.css
  js/calendar-data.js  # 自动生成，勿手改
  js/{util,bridge,icons,ui,holidays,lunar,model,demo,store}.js
  js/views/{today,calendar,events,almanac,tools,settings,onboarding}.js
  js/app.js
dist/                  # 由 build-web.mjs 从 web/ 拷贝（entry 指向这里）
scripts/
  gen-lunar-rows.py       # 生成农历月首中间产物 scripts/lunar-rows.txt
  gen-calendar-data.mjs   # 生成 web/js/calendar-data.js（含自检）
  build-web.mjs           # web/ → dist/
  pack-plugin.mjs         # 产出 .oplg + SHA256SUMS + meta.json
  verify-plugin.mjs       # 校验 ZIP / CRC / SHA256 / 入口桥
  serve-dist.mjs          # 本地静态预览 dist/
  smoke.mjs               # CDP 真实点击冒烟 + 截图
  deploy-to-otools.ps1    # 可选：同步到 OTools 主仓库做本地试跑
```

## 构建 / 打包 / 校验

```bash
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"

"$NODE" scripts/build-web.mjs                    # web/ → dist/
"$NODE" scripts/pack-plugin.mjs --out dist-pack # 生成 .oplg
"$NODE" scripts/verify-plugin.mjs dist-pack     # 校验
```

`verify-plugin.mjs` 对纯前端插件会提示缺少 `.wasm`，属预期（无 native 模块），可忽略。

重新生成历法数据（一般不需要，数据已入库）：

```bash
python scripts/gen-lunar-rows.py
"$NODE" scripts/gen-calendar-data.mjs
```

## 浏览器冒烟（可选）

本机的坑：**服务 + Chrome + 冒烟必须在同一条 shell 命令里执行**（后台进程跨调用不存活），
且**每次换新端口**——旧服务残留会让新服务 `EADDRINUSE` 静默退出，请求落到旧代码上，产生假故障。
`curl` 走代理时本机地址需 `--noproxy '*'`。

```bash
cd "D:/Repos/xyito/otools/otools-almanac"
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"

"$NODE" scripts/serve-dist.mjs 6498 > _shots/serve.log 2>&1 & SRV=$!
"$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --remote-allow-origins='*' --remote-debugging-port=9238 \
  --user-data-dir="D:/Repos/xyito/otools/otools-almanac/_shots/final-profile" \
  --window-size=980,700 about:blank > _shots/chrome.log 2>&1 & CHR=$!
sleep 4
CDP_PORT=9238 BASE_URL=http://127.0.0.1:6498/ "$NODE" scripts/smoke.mjs
kill $SRV $CHR 2>/dev/null
```

上面这组端口仅是本次验证用过的示例，**下次执行请换成未占用的新端口**， Chrome 的
`--user-data-dir` 也换一个空目录，避免复用旧会话状态。

截图落在 `_shots/`，尺寸为 panel 的 980 × 700。冒烟覆盖：离线历法数据自检、首次引导、
今日页（含深色主题）、万年历（记事 / 调休标记 / 翻月）、倒数日（增删改 / 搜索 / 筛选 / 置顶 / 复制 / 归档）、
黄历（四柱 / 节气表 / 放假列表）、日期工具（实时重算）、设置（主色 / 隐私 / 导出）、重载持久化，
以及无横向溢出与无 JS 运行时异常。

### 验证记录（v1.0.0）

- JS 语法检查：全部通过；`gen-calendar-data.mjs` 离线历法自检失败 0 项。
- CDP 冒烟：**62 / 62 通过**，无 JS 运行时异常，`scrollWidth/clientWidth = 980/980`。
- 发布包：`dist-pack/otools-almanac-1.0.0.oplg`，22 个条目 / 196536 字节（压缩后 61585 字节）。
- `verify-plugin.mjs`：全部通过；仅有纯前端插件预期内的 `.wasm` 警告。

## 本地试跑（写入 OTools 主仓库，需自行确认）

```powershell
pwsh -File scripts/deploy-to-otools.ps1 -OtoolsRoot D:/Repos/xyito/otools/otools
```

该脚本会把 `plugin.json` / `logo.svg` / `dist` 同步到 `plugins/otools-almanac`，
**会改动 OTools 主仓库**，执行前请确认。也可直接安装 `dist-pack/*.oplg`。

---

## 独立仓库与发版

本插件是 `ootools` 组织下的独立 public 仓库：`git@github.com:ootools/otools-almanac.git`（默认分支 `main`），
并在 xyito 主仓库中以子模块 `otools/otools-almanac` 挂载。

- `.github/workflows/build-plugin.yml`：push / PR / 手动触发，构建 `web/ → dist/`、打包并校验 `.oplg`。
- `.github/workflows/release-plugin.yml`：手动触发或推送 `v*` 标签。默认 `dry_run=true` 只构建校验；
  关掉 dry-run 才创建 GitHub Release。上架 OTools 插件市场需先配置 secret `XYCLOUD_PAT`，
  并显式传 `publish_market=true`。

```bash
gh workflow run release-plugin.yml --repo ootools/otools-almanac --ref main \
  -f display_version=<版本号> -F publish_market=true -F dry_run=false
```

> `plugin.json` 的版本号是唯一事实来源：发版前先 +1 并推送 main，
> xyito 里的子模块指针也要同步提交推送。
