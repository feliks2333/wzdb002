# WEIZHI MEDIA TERMINAL / 未址媒体终端

个人作品集静态站点。**纯 HTML / CSS / 原生 JS**，无后端、无框架、无构建步骤，也不需要联网。
风格：明日方舟 莱茵生命 / 工业机能风（冷白 `#f2f4f6`、深灰黑 `#1c1f22`、面板黑 `#0e1113`、
亮绿（战地2042 风）`#b4ff39`、实验蓝 `#3da9fc`；细边框、切角模块、等宽字体读数）。

---

## 1. 目录结构

```
wzdb-site/
├─ index.html            首页：左侧简介+导航 / 右侧音乐·视频媒体面板
├─ music.html            音乐台：播放 / 暂停 / 上一首 / 下一首 / 拖进度 / 调音量
├─ video.html            影像室：<video> 播放 + 自定义控制条 + 封面 poster
├─ portfolio.html        作品集：卡片渲染 + 详情面板（关联音视频可直接试听试看）
├─ about.html            关于 / 联系（邮箱 mailto）
├─ assets/
│  ├─ css/style.css      全部样式（含响应式与动效）
│  └─ js/
│     ├─ works.js        ★ 数据中枢：所有音乐 / 视频 / 作品路径都在这里
│     ├─ ui.js           顶栏时钟、状态灯、扫描光带、面板展开收起、缺图占位、提示条
│     ├─ home.js         首页媒体面板与作品速览
│     ├─ music.js        音乐台播放器
│     ├─ video.js        影像室播放器
│     └─ portfolio.js    作品集卡片、筛选与详情面板
└─ media/
   ├─ music/             放 mp3（见该目录 README.md）
   ├─ video/             放 mp4（见该目录 README.md）
   └─ cover/             放封面图（见该目录 README.md）
```

## 2. 本地预览

在站点根目录起一个静态服务（不要用 `file://` 直接打开，浏览器会限制媒体加载与 `HEAD` 探测）：

```powershell
# 任选一种
python -m http.server 8080
python3 -m http.server 8080
npx serve -l 8080 .
```

然后浏览器打开：**http://localhost:8080/**

## 3. 补真实文件（三步）

1. 把文件放进对应目录：
   - 音乐 → `media/music/`（mp3）
   - 视频 → `media/video/`（mp4，建议 H.264 + AAC）
   - 封面 → `media/cover/`（jpg / png / webp，视频封面建议 16:9）
2. 打开 `assets/js/works.js`，把对应条目的 `src` / `poster` / `cover` 改成真实路径。
3. 刷新页面。**HTML 和 CSS 完全不用改。**

> 页面是容错的：文件缺失时条目会标记 `OFFLINE`、状态显示 `MEDIA_MISSING`、封面位置显示占位块，
> 不会白屏或卡死。首页和关于页的 `MEDIA FILES READY` 会实时统计有多少个媒体文件已就位。

## 4. works.js 数据格式速查

```js
music: [{ id:'MUS-001', code:'UNIT-01', title:'曲名', artist:'作者', album:'专辑',
          src:'media/music/xxx.mp3', cover:'', duration:'--:--',
          tags:['AMBIENT'], desc:'简介' }]

videos: [{ id:'VID-001', code:'UNIT-01', title:'片名',
           src:'media/video/xxx.mp4', poster:'media/cover/xxx.jpg',
           runtime:'--:--', tags:['LOOP'], desc:'简介' }]

works: [{ id:'WRK-001', code:'UNIT-01', title:'作品名', type:'MV', year:'2024',
          cover:'media/cover/xxx.jpg', summary:'一句话', desc:'详细说明',
          tools:['AFTER EFFECTS'], music:['MUS-001'], videos:['VID-001'] }]
```

- `id` 必须唯一；作品通过 `music: []` / `videos: []` 关联音频视频。
- 作品类型 `type` 目前用了 `MV` / `AUDIO` / `VIDEO` / `ARCHIVE`，作品集页的筛选按钮与之对应；
  新增类型时在 `portfolio.html` 里加一个 `<button data-filter="新类型">` 即可。
- `duration` / `runtime` 只是列表上的预估文本，真实文件加载后播放器会用文件的实际时长覆盖显示。
- 站点名、版本号、邮箱、简介等也在 `works.js` 的 `meta` 里，`about.html` 的邮箱会自动读取 `meta.email`。

## 5. 功能与快捷键

| 位置 | 操作 |
| --- | --- |
| 音乐台 / 首页 | `空格` 播放暂停 · `←/→` 快退快进 5 秒 · `↑/↓` 音量 · `N` 下一首 · `P` 上一首 |
| 音乐台 | `LOOP:ALL` 列表循环 / `LOOP:ONE` 单曲循环 / `LOOP:OFF` 播完停止 |
| 影像室 | `空格` 播放暂停 · `←/→` 快退快进 · `F` 全屏 · `LOOP:OFF/ALL/ONE` |
| 作品集 | 点卡片展开详情 · `ESC` 关闭 · 支持 `portfolio.html#WRK-001` 直达 |
| 任意页 | 面板标题栏右侧 `[–] / [+]` 展开收起 |

## 6. 动效清单（只做了这些）

扫描线（全屏细条纹 + 缓慢下移的扫描光带）、状态灯呼吸、进度条与滑杆填充、
面板展开收起的高度过渡、hover 亮绿描边与角标。没有大圆角、没有大阴影。
系统开启“减少动效”时，扫描光带与呼吸灯会自动停用。

## 7. 换主题色

强调色只有一处定义，改 `assets/css/style.css` 顶部的令牌即可全站生效：

```css
--c-accent: #b4ff39;        /* 亮绿：深色模块上的高亮、填充、光晕（战地2042 酸性绿） */
--c-accent-ink: #4c7a00;    /* 深绿：冷白底上的文字与小描边（保证可读） */
--c-accent-rgb: 180, 255, 57;   /* 半透明底色用，与 --c-accent 同色 */
--c-accent-hover: #c9ff6b;      /* hover 提亮 */
```

为什么要两个颜色：亮绿在冷白底上对比度太低，字会看不清；所以深色模块（顶栏、播放器、
媒体面板、卡片封面区）用 `--c-accent` 亮绿，冷白底自动切到 `--c-accent-ink` 深绿。
这个切换由第 21 节的变量覆盖完成，代码里统一写 `var(--c-accent-fg)` 表示“当前上下文的强调前景色”。
如果就想让冷白底也用亮绿（更刺眼但更霓虹），把第 21 节那些选择器改成覆盖 `--c-accent-fg: var(--c-accent);` 即可。

想更黄或更绿，直接换这三个值，例如 `#a6ff00`（更黄更毒）、`#9ef01a`（更绿）、`#ccff00`（更黄）。

## 8. 部署

纯静态，把整个目录丢到任意静态托管（GitHub Pages / Netlify / Nginx）即可，
注意保持 `media/` 的目录结构，且 mp4 建议不要超过托管方的单文件限制。
