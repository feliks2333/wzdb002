/* ============================================================================
 * 影像室：作品视频播放（自定义控制条）
 * 列表来自 assets/js/works.js 的 videos[]，封面取 poster / cover
 * ========================================================================== */
(function () {
  'use strict';

  var W = window.WORKS;
  var WM = window.WM;
  if (!W || !WM) return;

  var video = WM.q('#v-player');
  var stage = WM.q('#v-stage');
  var seek = WM.q('#v-seek');
  var vol = WM.q('#v-vol');

  var idx = -1;
  var mediaMap = {};
  var thumbs = [];
  var posterFb = null;

  var repeatModes = ['OFF', 'ALL', 'ONE'];
  var repeatMode = 'OFF';

  /* ------------------------------------------------------------ 列表渲染 */

  function buildList() {
    var list = WM.q('#v-list');
    if (!list) return;

    if (!W.videos.length) {
      list.appendChild(WM.el('p', 'mono muted', '列表为空：请在 works.js 的 videos[] 里添加条目。'));
      return;
    }

    W.videos.forEach(function (v, i) {
      var t = WM.el('button', 'thumb');
      t.type = 'button';

      var media = WM.el('span', 'thumb__media');
      var cover = W.videoCover(v);
      if (cover) {
        var img = WM.el('img');
        img.src = cover;
        img.alt = (v.title || v.id) + ' 封面';
        img.setAttribute('data-img', '');
        img.setAttribute('data-code', v.code || v.id);
        img.setAttribute('data-label', 'NO POSTER');
        media.appendChild(img);
      } else {
        media.appendChild(WM.placeholder(v.code || v.id, 'NO POSTER'));
      }
      media.appendChild(WM.el('span', 'thumb__idx mono', v.code || v.id));
      t.appendChild(media);

      var body = WM.el('span', 'thumb__body');
      body.appendChild(WM.el('span', 'thumb__title', v.title || v.id));
      body.appendChild(WM.el('span', 'thumb__sub',
        (v.tags && v.tags.length ? v.tags.join(' / ') : 'VIDEO') + ' · ' + (v.runtime || '--:--')));
      t.appendChild(body);

      t.addEventListener('click', function () {
        if (i === idx) { toggle(); return; }
        load(i, true);
      });

      list.appendChild(t);
      thumbs.push(t);
    });

    WM.wireImages(list);
  }

  function markOffline(el, path) {
    if (!el || !WM.isMissing(mediaMap, path)) return;
    el.setAttribute('data-offline', '1');
    var box = WM.q('.thumb__body', el) || WM.q('.list__meta', el);
    if (box && !WM.q('.tag-offline', box)) box.appendChild(WM.el('span', 'tag-offline', 'OFFLINE'));
  }

  /* ------------------------------------------------------------ 状态显示 */

  function setState(text, cls) {
    var st = WM.q('#r-v-state');
    if (st) { st.textContent = text; st.className = 'readout__v ' + (cls || ''); }
    WM.setStatus('#video-panel [data-panel-status]', text, cls);
  }

  function setPlayIcon(playing) {
    var b = WM.q('#v-toggle');
    if (!b) return;
    b.innerHTML = playing
      ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>'
      : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
  }

  function setLamp(playing) {
    var l = WM.q('#v-lamp');
    if (!l) return;
    l.classList.toggle('lamp--on', playing);
    l.classList.toggle('lamp--fast', playing);
    l.classList.toggle('lamp--idle', !playing);
  }

  /** 封面是否可用：探测结果 false 时不设 poster，改用占位块 */
  function posterUsable(cover) {
    if (!cover) return false;
    return mediaMap[cover] !== false;
  }

  function showPosterFallback(cover, code) {
    if (posterFb && posterFb.parentNode) posterFb.parentNode.removeChild(posterFb);
    if (posterUsable(cover)) { posterFb = null; return; }
    posterFb = WM.placeholder(code, cover ? 'POSTER MISSING' : 'NO POSTER');
    posterFb.classList.add('stage__fb');
    if (stage) stage.appendChild(posterFb);
  }

  function hidePosterFallback() {
    if (posterFb) posterFb.classList.add('hidden');
  }

  function fillReadout(v) {
    var cover = W.videoCover(v);
    WM.q('#v-title').textContent = v.title || v.id;
    WM.q('#v-sub').textContent = (v.code || v.id) + ' · ' +
      (v.tags && v.tags.length ? v.tags.join(' / ') : 'VIDEO') + ' · ' + (v.runtime || '--:--');
    WM.q('#v-desc').textContent = v.desc || '（这条影像还没有写简介）';

    WM.q('#r-v-id').textContent = v.id || '--';
    WM.q('#r-v-code').textContent = v.code || '--';
    var src = WM.q('#r-v-src');
    src.textContent = v.src || '--';
    src.title = v.src || '';
    var po = WM.q('#r-v-poster');
    po.textContent = cover || '（未设置）';
    po.title = cover || '';

    var known = mediaMap[v.src];
    var file = WM.q('#r-v-file');
    file.textContent = known === true ? 'READY' : (known === false ? 'MISSING' : 'UNKNOWN');
    file.className = 'readout__v ' + (known === true ? 'accent' : 'muted');

    WM.q('#v-path').textContent = 'PATH: ' + (v.src || 'media/video');
    document.title = '▶ ' + (v.title || v.id) + ' — WEIZHI MEDIA TERMINAL';
  }

  function highlight() {
    thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === idx); });
  }

  /* ------------------------------------------------------------ 播放控制 */

  function load(i, autoplay) {
    if (!W.videos.length || !video) return;
    idx = (i + W.videos.length) % W.videos.length;
    var v = W.videos[idx];
    var cover = W.videoCover(v);

    video.classList.remove('hidden');
    var empty = WM.q('#v-empty');
    if (empty) empty.classList.add('hidden');

    if (posterUsable(cover)) video.setAttribute('poster', cover);
    else video.removeAttribute('poster');

    video.src = v.src;
    video.load();

    var badge = WM.q('#v-badge');
    if (badge) badge.textContent = (v.code || v.id) + ' · ' + (v.title || '');

    fillReadout(v);
    showPosterFallback(cover, v.code || v.id);
    highlight();
    WM.setSlider(seek, 0);
    if (seek) seek.value = '0';
    WM.q('#v-cur').textContent = '--:--';
    WM.q('#v-dur').textContent = v.runtime || '--:--';

    if (autoplay) play(); else setState('READY');
  }

  function play() {
    if (idx < 0) { load(0, true); return; }
    var p = video.play();
    if (p && p.catch) {
      p.catch(function () { setState('MEDIA_MISSING'); setPlayIcon(false); setLamp(false); });
    }
  }

  function pause() { video.pause(); }
  function toggle() { video.paused ? play() : pause(); }

  function step(delta) { load(idx + delta, true); }

  function advance() {
    if (repeatMode === 'ONE') { video.currentTime = 0; play(); return; }
    if (repeatMode === 'ALL') { step(1); return; }
    if (idx < W.videos.length - 1) step(1);
    else setState('ENDED');
  }

  /* ------------------------------------------------------------ 事件绑定 */

  if (video) {
    video.addEventListener('play', function () {
      setPlayIcon(true); setLamp(true); setState('PLAYING', 'accent');
      hidePosterFallback();
      var w = WM.q('.vctrl__seek');
      if (w) w.classList.add('is-live');
    });
    video.addEventListener('pause', function () {
      setPlayIcon(false); setLamp(false);
      if (!video.ended) setState('PAUSED');
      var w = WM.q('.vctrl__seek');
      if (w) w.classList.remove('is-live');
    });
    video.addEventListener('ended', function () { setState('ENDED'); advance(); });
    video.addEventListener('loadedmetadata', function () {
      WM.q('#v-dur').textContent = WM.clock(video.duration);
      var file = WM.q('#r-v-file');
      if (file && video.duration) { file.textContent = 'READY'; file.className = 'readout__v accent'; }
      /* 从封面切到首帧：隐藏占位块 */
      hidePosterFallback();
    });
    video.addEventListener('timeupdate', function () {
      if (!video.duration) return;
      WM.q('#v-cur').textContent = WM.clock(video.currentTime);
      if (video.dataset.dragging !== '1') {
        var pct = video.currentTime / video.duration * 100;
        WM.setSlider(seek, pct);
        if (seek) seek.value = String(Math.round(pct * 10));
      }
    });
    video.addEventListener('volumechange', function () {
      var v = Math.round(video.volume * 100);
      WM.setSlider(vol, v);
      var b = WM.q('#v-mute');
      if (b) b.textContent = video.muted ? 'MUTE' : 'VOL';
    });
    video.addEventListener('error', function () {
      if (!video.getAttribute('src')) return;
      var v = W.videos[idx];
      setState('MEDIA_MISSING');
      setPlayIcon(false);
      setLamp(false);
      if (!v) return;
      mediaMap[v.src] = false;
      markOffline(thumbs[idx], v.src);
      var file = WM.q('#r-v-file');
      if (file) { file.textContent = 'MISSING'; file.className = 'readout__v muted'; }
      showPosterFallback(W.videoCover(v), v.code || v.id);
      WM.notifyMissing('video', v.src);
    });
  }

  /* 进度条 */
  if (seek) {
    seek.addEventListener('input', function () {
      var pct = Number(seek.value) / 10;
      WM.setSlider(seek, pct);
      if (video.duration) WM.q('#v-cur').textContent = WM.clock((Number(seek.value) / 1000) * video.duration);
    });
    var onDown = function () { video.dataset.dragging = '1'; };
    var onUp = function () {
      video.dataset.dragging = '0';
      if (video.duration) video.currentTime = (Number(seek.value) / 1000) * video.duration;
    };
    seek.addEventListener('pointerdown', onDown);
    seek.addEventListener('pointerup', onUp);
    seek.addEventListener('change', onUp);
    seek.addEventListener('keydown', onDown);
    seek.addEventListener('keyup', onUp);
  }

  /* 音量 */
  if (vol) {
    vol.addEventListener('input', function () {
      video.muted = false;
      video.volume = Number(vol.value) / 100;
      WM.setSlider(vol, Number(vol.value));
    });
  }

  /* 按钮 */
  WM.q('#v-toggle').addEventListener('click', toggle);
  WM.q('#v-mute').addEventListener('click', function () { video.muted = !video.muted; });
  WM.q('#v-full').addEventListener('click', function () {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else if (stage.requestFullscreen) {
        var r = stage.requestFullscreen();
        if (r && r.catch) r.catch(function () { WM.notice('当前浏览器拒绝了全屏请求。', '[VIDEO]'); });
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      } else {
        WM.notice('当前浏览器不支持全屏播放。', '[VIDEO]');
      }
    } catch (e) {
      WM.notice('全屏失败：' + e.message, '[VIDEO]');
    }
  });

  var loopBtn = WM.q('#v-loop');
  var cycleLoop = function () {
    repeatMode = repeatModes[(repeatModes.indexOf(repeatMode) + 1) % repeatModes.length];
    loopBtn.textContent = 'LOOP:' + repeatMode;
    loopBtn.classList.toggle('accent', repeatMode !== 'OFF');
    WM.notice('循环模式：' + repeatMode + '（OFF 播完停止 / ALL 顺序连播 / ONE 单段循环）', '[VIDEO]');
  };
  loopBtn.addEventListener('click', cycleLoop);
  loopBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLoop(); }
  });

  /* 快捷键 */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); if (video.duration) video.currentTime = WM.clamp(video.currentTime + 5, 0, video.duration); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); if (video.duration) video.currentTime = WM.clamp(video.currentTime - 5, 0, video.duration); }
    else if (e.key === 'f' || e.key === 'F') { WM.q('#v-full').click(); }
  });

  /* ------------------------------------------------------------ 启动 */

  buildList();
  WM.wireImages(document);
  video.volume = 0.8;
  WM.setSlider(vol, 80);
  setState('STANDBY');
  setLamp(false);

  if (W.videos.length) {
    /* 预载第一条读数与封面，不自动播放 */
    idx = 0;
    var v0 = W.videos[0];
    fillReadout(v0);
    WM.q('#v-dur').textContent = v0.runtime || '--:--';
    var badge0 = WM.q('#v-badge');
    if (badge0) badge0.textContent = (v0.code || v0.id) + ' · ' + (v0.title || '');
    highlight();
  }

  /* 探测文件就绪情况 → 打 OFFLINE 标记 + 处理封面占位 */
  WM.scanMedia().then(function (map) {
    mediaMap = map || {};
    W.videos.forEach(function (v, i) {
      markOffline(thumbs[i], v.src);
      if (i === idx) {
        showPosterFallback(W.videoCover(v), v.code || v.id);
        if (posterUsable(W.videoCover(v))) video.setAttribute('poster', W.videoCover(v));
        var file = WM.q('#r-v-file');
        var known = mediaMap[v.src];
        file.textContent = known === true ? 'READY' : (known === false ? 'MISSING' : 'UNKNOWN');
        file.className = 'readout__v ' + (known === true ? 'accent' : 'muted');
      }
    });
    WM.qa('#v-list img[data-img]').forEach(function (img) {
      var code = img.getAttribute('data-code');
      var v = W.getVideo(code);
      WM.imageFallback(img, code, WM.isMissing(mediaMap, v ? W.videoCover(v) : '') ? 'POSTER MISSING' : 'NO POSTER');
    });
  });
})();
