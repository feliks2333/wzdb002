/* ============================================================================
 * 首页：媒体面板（音乐 / 视频）+ 作品速览
 * 数据全部来自 assets/js/works.js
 * ========================================================================== */
(function () {
  'use strict';

  var W = window.WORKS;
  var WM = window.WM;
  if (!W || !WM) return;

  var mediaMap = {};          /* 媒体文件探测结果：路径 -> true/false/null */

  /* ============================================================ 1 通用小件 */

  function playIcon(cls) {
    var s = WM.el('span', 'row-icon ' + (cls || ''));
    s.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
    return s;
  }

  function pauseIcon() {
    var s = WM.el('span', 'row-icon');
    s.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>';
    return s;
  }

  function offlineTag() {
    return WM.el('span', 'tag-offline', 'OFFLINE');
  }

  function markOffline(row, path) {
    if (!WM.isMissing(mediaMap, path)) return;
    row.classList.add('is-offline');
    var meta = WM.q('.list__meta', row) || WM.q('.thumb__body', row);
    if (meta && !WM.q('.tag-offline', meta)) meta.appendChild(offlineTag());
  }

  /* ============================================================ 2 音乐区 */

  var audio = WM.q('#home-audio');
  var musicRows = [];
  var mIndex = -1;
  var seek = WM.q('#home-seek');
  var lamp = WM.q('#home-lamp');

  function buildMusic() {
    var list = WM.q('#home-music-list');
    if (!list) return;

    W.music.forEach(function (m, i) {
      var row = WM.el('button', 'list__row');
      row.type = 'button';
      row.setAttribute('data-music', m.id);

      row.appendChild(WM.el('span', 'list__code mono', m.code || m.id));

      var main = WM.el('span', 'list__main');
      main.appendChild(WM.el('span', 'list__title', m.title || m.id));
      main.appendChild(WM.el('span', 'list__sub', (m.artist || '') + (m.tags && m.tags.length ? ' · ' + m.tags.join(' / ') : '')));
      row.appendChild(main);

      var meta = WM.el('span', 'list__meta mono');
      meta.appendChild(playIcon());
      meta.appendChild(WM.el('span', null, m.duration || '--:--'));
      row.appendChild(meta);

      row.addEventListener('click', function () { loadMusic(i, true); });
      list.appendChild(row);
      musicRows.push(row);
      markOffline(row, m.src);
    });
  }

  function highlightMusic() {
    musicRows.forEach(function (r, i) { r.classList.toggle('is-active', i === mIndex); });
  }

  function loadMusic(i, autoplay) {
    if (!W.music.length) return;
    mIndex = (i + W.music.length) % W.music.length;
    var m = W.music[mIndex];

    audio.src = m.src;
    audio.load();

    var title = WM.q('#home-now-title');
    var sub = WM.q('#home-now-sub');
    if (title) title.textContent = m.title || m.id;
    if (sub) sub.textContent = (m.artist || '') + ' · ' + (m.album || '') + ' · ' + (m.code || m.id);

    WM.qa('#home-music-list .row-icon').forEach(function (ic, idx) {
      ic.innerHTML = idx === mIndex
        ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>'
        : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
    });

    highlightMusic();
    if (autoplay) play();
    audio.addEventListener('loadedmetadata', syncDuration, { once: true });
  }

  function syncDuration() {
    var m = W.music[mIndex];
    if (!m) return;
    var dur = WM.clock(audio.duration);
    var el = WM.q('#home-dur');
    if (el) el.textContent = dur;
    var row = musicRows[mIndex];
    if (row) {
      var meta = WM.q('.list__meta span:last-child', row);
      if (meta) meta.textContent = dur;
    }
  }

  function play() {
    if (!audio.src && W.music.length) { loadMusic(0, true); return; }
    var sending = audio.play();
    if (sending && sending.catch) {
      sending.catch(function () {
        setPlayState(false, 'MEDIA OFFLINE');
      });
    }
  }

  function pause() { audio.pause(); }

  function setPlayState(playing, statusText) {
    var btn = WM.q('#home-toggle');
    if (btn) btn.textContent = playing ? '❚❚' : '▶';
    if (lamp) {
      lamp.classList.toggle('lamp--on', playing);
      lamp.classList.toggle('lamp--fast', playing);
      lamp.classList.toggle('lamp--idle', !playing);
    }
    WM.setStatus('#media-panel [data-panel-status]', statusText || (playing ? 'PLAYING' : 'STANDBY'), playing ? 'is-ok' : '');
    var meter = WM.q('.now .slider__fill');
    if (meter && meter.parentNode) meter.parentNode.classList.toggle('is-live', playing);
  }

  if (audio) {
    audio.volume = 0.8;

    audio.addEventListener('play', function () { setPlayState(true); });
    audio.addEventListener('pause', function () { setPlayState(false); });
    audio.addEventListener('ended', function () { loadMusic(mIndex + 1, true); });
    audio.addEventListener('timeupdate', function () {
      var cur = WM.q('#home-cur');
      if (cur) cur.textContent = WM.clock(audio.currentTime);
      if (seek && audio.duration) {
        audio.dataset.dragging = audio.dataset.dragging || '';
        if (audio.dataset.dragging !== '1') {
          var pct = audio.currentTime / audio.duration * 100;
          seek.value = String(Math.round(pct * 10));
          WM.setSlider(seek, pct);
        }
      }
    });
    audio.addEventListener('error', function () {
      var m = W.music[mIndex];
      if (!m) return;
      setPlayState(false, 'MEDIA_MISSING');
      var sub = WM.q('#home-now-sub');
      if (sub) sub.textContent = 'MEDIA OFFLINE · ' + m.src;
      if (musicRows[mIndex]) markOffline(musicRows[mIndex], m.src);
      WM.notifyMissing('music', m.src);
    });
  }

  /* 进度拖动 */
  if (seek) {
    var startDrag = function () { if (audio) audio.dataset.dragging = '1'; };
    var endDrag = function () {
      if (!audio) return;
      audio.dataset.dragging = '0';
      if (audio.duration) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    };
    seek.addEventListener('input', function () {
      var pct = Number(seek.value) / 10;
      WM.setSlider(seek, pct);
      var cur = WM.q('#home-cur');
      if (cur && audio && audio.duration) cur.textContent = WM.clock((Number(seek.value) / 1000) * audio.duration);
    });
    seek.addEventListener('pointerdown', startDrag);
    seek.addEventListener('pointerup', endDrag);
    seek.addEventListener('keydown', startDrag);
    seek.addEventListener('keyup', endDrag);
    seek.addEventListener('change', endDrag);
  }

  var btnToggle = WM.q('#home-toggle');
  if (btnToggle) btnToggle.addEventListener('click', function () { audio.paused ? play() : pause(); });
  var btnPrev = WM.q('#home-prev');
  if (btnPrev) btnPrev.addEventListener('click', function () { loadMusic(mIndex - 1, true); });
  var btnNext = WM.q('#home-next');
  if (btnNext) btnNext.addEventListener('click', function () { loadMusic(mIndex + 1, true); });

  /* ============================================================ 3 视频区 */

  var video = WM.q('#home-video');
  var vIndex = -1;

  function buildVideos() {
    var list = WM.q('#home-video-list');
    if (!list) return;

    W.videos.forEach(function (v, i) {
      var t = WM.el('button', 'thumb');
      t.type = 'button';
      t.setAttribute('data-video', v.id);

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
      body.appendChild(WM.el('span', 'thumb__sub', (v.tags && v.tags.length ? v.tags.join(' / ') : 'VIDEO') + ' · ' + (v.runtime || '--:--')));
      t.appendChild(body);

      t.addEventListener('click', function () { loadVideo(i, true); });
      list.appendChild(t);
      markOffline(t, v.src);
    });

    WM.wireImages(list);
  }

  function loadVideo(i, autoplay) {
    if (!W.videos.length || !video) return;
    vIndex = (i + W.videos.length) % W.videos.length;
    var v = W.videos[vIndex];
    var cover = W.videoCover(v);

    video.classList.remove('hidden');
    var empty = WM.q('#home-video-empty');
    if (empty) empty.classList.add('hidden');

    video.setAttribute('poster', cover || '');
    video.src = v.src;
    video.load();

    var badge = WM.q('#home-video-badge');
    if (badge) badge.textContent = (v.code || v.id) + ' · ' + (v.title || '');
    WM.setStatus('#media-panel [data-panel-status]', 'VIDEO READY', 'is-blue');

    WM.qa('#home-video-list .thumb').forEach(function (t, idx) {
      t.classList.toggle('is-active', idx === vIndex);
    });

    if (autoplay) {
      var pr = video.play();
      if (pr && pr.catch) pr.catch(function () { setPlayState(false, 'MEDIA_MISSING'); });
    }
  }

  if (video) {
    video.addEventListener('error', function () {
      var v = W.videos[vIndex];
      if (!v || !video.getAttribute('src')) return;
      WM.notifyMissing('video', v.src);
      WM.setStatus('#media-panel [data-panel-status]', 'MEDIA_MISSING', '');
    });
    video.addEventListener('play', function () {
      var b = WM.q('#home-v-toggle');
      if (b) b.textContent = '❚❚';
    });
    video.addEventListener('pause', function () {
      var b = WM.q('#home-v-toggle');
      if (b) b.textContent = '▶';
    });
  }

  var vToggle = WM.q('#home-v-toggle');
  if (vToggle) vToggle.addEventListener('click', function () {
    if (vIndex < 0) { loadVideo(0, true); return; }
    video.paused ? video.play() : video.pause();
  });
  var vMute = WM.q('#home-v-mute');
  if (vMute) vMute.addEventListener('click', function () {
    video.muted = !video.muted;
    vMute.textContent = video.muted ? 'MUTE' : 'VOL';
  });

  /* ============================================================ 4 标签切换 */

  function initTabs() {
    var tabs = WM.qa('.tab[data-tab]');
    var panes = WM.qa('[data-tabpane]');
    var full = WM.q('[data-open-full]');
    var map = { music: 'music.html', video: 'video.html' };

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', String(on));
        });
        panes.forEach(function (p) {
          p.classList.toggle('hidden', p.getAttribute('data-tabpane') !== key);
        });
        if (full && map[key]) full.setAttribute('href', map[key]);
        /* 面板高度变化后重算（面板体是自适应高度，无需处理，这里只同步 aria） */
      });
    });
  }

  /* ============================================================ 5 作品速览 */

  function buildWorks() {
    var list = WM.q('#home-work-list');
    if (!list) return;

    W.works.forEach(function (w, i) {
      var row = WM.el('button', 'list__row');
      row.type = 'button';

      row.appendChild(WM.el('span', 'list__code mono', w.code || WM.pad(i + 1, 3)));

      var main = WM.el('span', 'list__main');
      main.appendChild(WM.el('span', 'list__title', w.title || w.id));
      main.appendChild(WM.el('span', 'list__sub', w.summary || ''));
      row.appendChild(main);

      var meta = WM.el('span', 'list__meta mono');
      meta.appendChild(WM.el('span', 'chip chip--ink', w.type || 'WORK'));
      meta.appendChild(WM.el('span', null, w.year || ''));
      row.appendChild(meta);

      row.addEventListener('click', function () {
        location.href = 'portfolio.html#' + encodeURIComponent(w.id);
      });
      list.appendChild(row);
    });
  }

  /* ============================================================ 6 启动 */

  buildMusic();
  buildVideos();
  buildWorks();
  initTabs();
  WM.wireImages(document);
  setPlayState(false, 'STANDBY');

  /* 探测媒体文件是否就位，并给缺失条目打 OFFLINE 标记 */
  WM.scanMedia().then(function (map) {
    mediaMap = map || {};
    musicRows.forEach(function (r) {
      var m = W.music[musicRows.indexOf(r)];
      if (m) markOffline(r, m.src);
    });
    WM.qa('#home-video-list .thumb').forEach(function (t, i) {
      if (W.videos[i]) markOffline(t, W.videos[i].src);
    });
    WM.qa('#home-video-list img[data-img]').forEach(function (img) {
      var code = img.getAttribute('data-code');
      var v = W.getVideo(code);
      WM.imageFallback(img, code, WM.isMissing(mediaMap, v ? W.videoCover(v) : '') ? 'NO COVER' : 'NO MEDIA');
    });
  });

  /* 快捷键：空格播放/暂停 */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (audio) (audio.paused ? play() : pause());
    }
  });
})();
