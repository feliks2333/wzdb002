/* ============================================================================
 * WEIZHI MEDIA TERMINAL — 共用行为层
 * 顶栏时钟 / 状态灯 / 扫描光带 / 面板展开收起 / 缺图占位 / 提示条 / 文本绑定
 * 无框架、无依赖，全部原生 JS。
 * ========================================================================== */
(function (global) {
  'use strict';

  var WM = {};

  /* ------------------------------------------------------------ 0 基础工具 */

  WM.q = function (sel, root) { return (root || document).querySelector(sel); };
  WM.qa = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /** 创建元素：el('div', 'cls', '文本') */
  WM.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /** 秒 → mm:ss（无效值返回 --:--） */
  WM.clock = function (sec) {
    if (!isFinite(sec) || sec < 0) return '--:--';
    var s = Math.floor(sec % 60);
    var m = Math.floor(sec / 60) % 60;
    var h = Math.floor(sec / 3600);
    var p = function (n) { return n < 10 ? '0' + n : String(n); };
    return h > 0 ? h + ':' + p(m) + ':' + p(s) : p(m) + ':' + p(s);
  };

  WM.pad = function (n, len) {
    var s = String(n);
    while (s.length < (len || 2)) s = '0' + s;
    return s;
  };

  /** 数值夹取 */
  WM.clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* -------------------------------------------------------- 1 缺图占位生成 */

  /**
   * 生成缺图占位块（媒体文件还没放进 media/ 时显示）
   * @param {string} code  编号，如 WRK-001
   * @param {string} label 说明，如 NO COVER
   */
  WM.placeholder = function (code, label) {
    var box = WM.el('div', 'media-fallback');
    var b = WM.el('b', null, label || 'NO MEDIA');
    var s = WM.el('span', null, code || '');
    box.appendChild(b);
    box.appendChild(s);
    return box;
  };

  /**
   * 给 <img> 挂失败回退：文件不存在时隐藏图片并插入占位块。
   * 同时对「监听前就已失败」的缓存情况做一次判断。
   */
  WM.imageFallback = function (img, code, label) {
    if (!img) return;
    var apply = function () {
      if (img.getAttribute('data-fallback') === 'done') return;
      img.setAttribute('data-fallback', 'done');
      var box = img.parentNode;
      img.style.display = 'none';
      if (box) box.appendChild(WM.placeholder(code, label));
    };
    img.addEventListener('error', apply);
    if (img.complete && img.naturalWidth === 0) apply();
  };

  /** 批量：容器内所有 [data-img] 图片挂回退（code 取自 data-code） */
  WM.wireImages = function (root) {
    WM.qa('img[data-img]', root).forEach(function (img) {
      WM.imageFallback(img, img.getAttribute('data-code') || '', img.getAttribute('data-label') || 'NO MEDIA');
    });
  };

  /* ---------------------------------------------------------- 2 提示条 notice */

  var noticeTimer = null;

  /** 右下角等宽提示条，例如提示文件还没放好 */
  WM.notice = function (msg, tag) {
    var old = WM.q('.notice');
    if (old) old.parentNode.removeChild(old);
    var box = WM.el('div', 'notice');
    box.setAttribute('role', 'status');
    box.appendChild(WM.el('span', 'notice__tag', tag || '[SYS]'));
    box.appendChild(WM.el('span', null, msg));
    box.addEventListener('click', function () { box.parentNode && box.parentNode.removeChild(box); });
    document.body.appendChild(box);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    }, 5200);
  };

  /** 媒体文件缺失时的统一提示 */
  WM.notifyMissing = function (kind, path) {
    WM.notice(
      '媒体文件未就绪：' + path + ' —— 把文件放进 media/' + kind + '/ 即可（路径写在 assets/js/works.js）。',
      '[MEDIA]'
    );
  };

  /* -------------------------------------------------------- 3 面板展开 / 收起 */

  function setCollapsed(panel, collapse) {
    var body = WM.q('.panel__body', panel);
    var btn = WM.q('[data-collapse]', panel);
    if (!body || !btn) return;
    var isCollapsed = panel.classList.contains('is-collapsed');
    if (collapse === isCollapsed) return;

    if (collapse) {
      body.style.height = body.scrollHeight + 'px';
      void body.offsetHeight;                 /* 强制回流，让高度过渡生效 */
      panel.classList.add('is-collapsed');
      body.style.height = '0px';
    } else {
      panel.classList.remove('is-collapsed');
      body.style.height = '0px';
      void body.offsetHeight;
      body.style.height = body.scrollHeight + 'px';
      var done = function () {
        body.style.height = '';               /* 恢复自适应高度 */
        body.removeEventListener('transitionend', done);
      };
      body.addEventListener('transitionend', done);
    }
    btn.textContent = collapse ? '[+]' : '[–]';
    btn.setAttribute('aria-expanded', String(!collapse));
    var st = WM.q('[data-panel-status]', panel);
    if (st) {
      var on = st.getAttribute('data-on') || 'ACTIVE';
      var off = st.getAttribute('data-off') || 'IDLE';
      st.innerHTML = 'STATUS:<b>' + (collapse ? off : on) + '</b>';
    }
  }

  /** 初始化页面内所有 [data-panel] 的折叠按钮 */
  WM.initPanels = function (root) {
    WM.qa('[data-panel]', root).forEach(function (panel) {
      var btn = WM.q('[data-collapse]', panel);
      if (!btn) return;
      btn.addEventListener('click', function () {
        setCollapsed(panel, !panel.classList.contains('is-collapsed'));
      });
    });
    /* 允许用 data-collapsed 指定默认收起 */
    WM.qa('[data-panel][data-collapsed="true"]', root).forEach(function (panel) {
      setCollapsed(panel, true);
    });
  };

  WM.collapsePanel = setCollapsed;

  /** 更新面板状态文字，如 STATUS:PLAYING */
  WM.setStatus = function (target, text, cls) {
    var el = typeof target === 'string' ? WM.q(target) : target;
    if (!el) return;
    el.innerHTML = 'STATUS:<b class="' + (cls || '') + '">' + text + '</b>';
  };

  /* ------------------------------------------------------------ 4 进度条 / 滑杆 */

  /** 设置进度条填充宽度（百分比 0-100），可传 isLive 控制流动纹理 */
  WM.setMeter = function (fillEl, pct, live) {
    if (!fillEl) return;
    fillEl.style.width = WM.clamp(pct, 0, 100) + '%';
    var meter = fillEl.parentNode;
    if (meter && live != null) meter.classList.toggle('is-live', !!live);
  };

  /** 同步自定义滑杆的填充宽度（滑杆用 --p 变量驱动） */
  WM.setSlider = function (input, pct) {
    if (!input) return;
    var wrap = input.parentNode;
    if (wrap) wrap.style.setProperty('--p', WM.clamp(pct, 0, 100) + '%');
  };

  /* -------------------------------------------------------------- 5 顶栏 / 时钟 */

  function tickClock() {
    var d = new Date();
    var t = WM.pad(d.getHours()) + ':' + WM.pad(d.getMinutes()) + ':' + WM.pad(d.getSeconds());
    var date = d.getFullYear() + '-' + WM.pad(d.getMonth() + 1) + '-' + WM.pad(d.getDate());
    WM.qa('[data-clock]').forEach(function (n) { n.textContent = t; });
    WM.qa('[data-clock-date]').forEach(function (n) { n.textContent = date; });
    WM.qa('[data-clock-full]').forEach(function (n) { n.textContent = date + ' ' + t; });
  }

  var bootTime = Date.now();

  function tickUptime() {
    var s = Math.floor((Date.now() - bootTime) / 1000);
    var txt = 'T+' + WM.pad(Math.floor(s / 3600)) + ':' + WM.pad(Math.floor(s / 60) % 60) + ':' + WM.pad(s % 60);
    WM.qa('[data-uptime]').forEach(function (n) { n.textContent = txt; });
  }

  /* -------------------------------------------------------- 6 导航高亮 / 文本绑定 */

  function initNav() {
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (here === '') here = 'index.html';
    WM.qa('.topnav a, a[data-nav]').forEach(function (a) {
      var target = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (target && target === here) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /** 把 works.js 里的站点信息填进 data-bind 元素 */
  function initBindings() {
    var W = global.WORKS;
    if (!W) return;
    var meta = W.meta || {};
    var year = String(new Date().getFullYear());

    WM.qa('[data-bind]').forEach(function (n) {
      var key = n.getAttribute('data-bind');
      if (key === 'email') {
        n.textContent = meta.email || '';
        if (n.tagName === 'A') n.setAttribute('href', 'mailto:' + (meta.email || ''));
      } else if (key === 'email-href') {
        n.setAttribute('href', 'mailto:' + (meta.email || ''));
      } else if (key === 'year') {
        n.textContent = year;
      } else if (key === 'count-music') {
        n.textContent = WM.pad(W.music.length);
      } else if (key === 'count-video') {
        n.textContent = WM.pad(W.videos.length);
      } else if (key === 'count-works') {
        n.textContent = WM.pad(W.works.length);
      } else if (meta[key] != null) {
        n.textContent = meta[key];
      }
    });
  }

  /* -------------------------------------------------- 6.5 媒体文件就绪探测 */

  /**
   * 探测单个文件是否存在。
   * 返回 Promise<true|false|null>；null 表示无法判断（file:// 打开时）。
   */
  WM.probe = function (url) {
    if (!url) return Promise.resolve(false);
    if (location.protocol === 'file:') return Promise.resolve(null);
    if (!global.fetch) return Promise.resolve(null);
    return global.fetch(url, { method: 'HEAD', cache: 'no-store' })
      .then(function (r) { return !!r.ok; })
      .catch(function () { return false; });
  };

  /**
   * 扫描 works.js 里登记的全部媒体（音频 / 视频 / 封面），
   * 更新 [data-media-ready] 与 [data-media-meter]，并派发 wm:media 事件。
   * 页面可以 .then(map) 拿到 { 路径: true|false|null }。
   */
  WM.scanMedia = function () {
    var W = global.WORKS;
    if (!W) { WM.scanMedia.result = Promise.resolve({}); return WM.scanMedia.result; }

    var paths = [];
    W.music.forEach(function (m) {
      if (m.src) paths.push(m.src);
      var c = W.musicCover ? W.musicCover(m) : '';
      if (c) paths.push(c);
    });
    W.videos.forEach(function (v) {
      if (v.src) paths.push(v.src);
      var c = W.videoCover(v);
      if (c) paths.push(c);
    });
    W.works.forEach(function (w) { if (w.cover) paths.push(w.cover); });

    /* 去重 */
    paths = paths.filter(function (p, i) { return paths.indexOf(p) === i; });

    var result = WM.scanMedia.result = Promise.all(paths.map(function (p) {
      return WM.probe(p).then(function (ok) { return { path: p, ok: ok }; });
    })).then(function (rows) {
      var map = {};
      var ready = 0, known = 0;
      rows.forEach(function (r) {
        map[r.path] = r.ok;
        if (r.ok === true) ready++;
        if (r.ok !== null) known++;
      });
      var total = known || paths.length;
      var pct = total ? Math.round(ready / total * 100) : 0;

      WM.qa('[data-media-ready]').forEach(function (n) {
        n.textContent = known === 0
          ? 'N/A (file://)'
          : WM.pad(ready) + '/' + WM.pad(total);
      });
      WM.qa('[data-media-meter]').forEach(function (n) { WM.setMeter(n, pct, false); });

      if (known > 0 && ready < total) {
        WM.notice('有 ' + (total - ready) + ' 个媒体文件尚未就位，列表条目会标记 OFFLINE；把文件放进 media/ 对应目录即可。', '[MEDIA]');
      }

      try {
        document.dispatchEvent(new CustomEvent('wm:media', { detail: map }));
      } catch (e) { /* 老浏览器忽略 */ }
      return map;
    });

    return result;
  };

  /** 判断某个路径是否缺失（探测未完成时返回 false，不误标） */
  WM.isMissing = function (map, path) {
    return !!(map && path && map[path] === false);
  };

  /* -------------------------------------------------------------- 7 扫描光带 */

  function initScan() {
    if (WM.q('.scan-sweep')) return;
    var s = WM.el('div', 'scan-sweep');
    s.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s);
  }

  /* ------------------------------------------------------------------ 8 启动 */

  WM.boot = function () {
    initScan();
    initNav();
    initBindings();
    WM.initPanels();
    WM.wireImages(document);
    tickClock();
    tickUptime();
    setInterval(tickClock, 1000);
    setInterval(tickUptime, 1000);
  };

  global.WM = WM;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WM.boot);
  } else {
    WM.boot();
  }
})(window);
