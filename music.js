/* ============================================================================
 * 音乐台：播放 / 暂停 / 上一首 / 下一首 / 拖动进度 / 音量
 * 歌单来自 assets/js/works.js 的 music[]
 * ========================================================================== */
(function () {
  'use strict';

  var W = window.WORKS;
  var WM = window.WM;
  if (!W || !WM) return;

  var audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.volume = 0.8;
  audio.id = 'm-audio';
  document.body.appendChild(audio);

  var idx = -1;
  var repeatModes = ['ALL', 'ONE', 'OFF'];
  var repeatMode = 'ALL';
  var mediaMap = {};
  var rows = [];

  var listEl = WM.q('#m-list');
  var seek = WM.q('#m-seek');
  var vol = WM.q('#m-vol');

  /* ------------------------------------------------------------ 列表渲染 */

  function buildList() {
    if (!listEl) return;
    if (!W.music.length) {
      listEl.appendChild(WM.el('div', 'panel__inner mono muted', '歌单为空：请在 assets/js/works.js 的 music[] 里添加条目。'));
      return;
    }
    W.music.forEach(function (m, i) {
      var row = WM.el('button', 'list__row');
      row.type = 'button';

      row.appendChild(WM.el('span', 'list__code mono', m.code || WM.pad(i + 1, 2)));

      var main = WM.el('span', 'list__main');
      main.appendChild(WM.el('span', 'list__title', m.title || m.id));
      main.appendChild(WM.el('span', 'list__sub',
        (m.artist || '') + (m.album ? ' · ' + m.album : '') +
        (m.tags && m.tags.length ? ' · ' + m.tags.join(' / ') : '')));
      row.appendChild(main);

      var meta = WM.el('span', 'list__meta mono');
      var icon = WM.el('span', 'row-icon');
      icon.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
      meta.appendChild(icon);
      meta.appendChild(WM.el('span', 'row-dur', m.duration || '--:--'));
      row.appendChild(meta);

      row.addEventListener('click', function () {
        if (i === idx) { toggle(); return; }
        load(i, true);
      });

      listEl.appendChild(row);
      rows.push(row);
    });
  }

  function markOffline(row, path) {
    if (!row || !WM.isMissing(mediaMap, path)) return;
    row.classList.add('is-offline');
    var meta = WM.q('.list__meta', row);
    if (meta && !WM.q('.tag-offline', meta)) meta.appendChild(WM.el('span', 'tag-offline', 'OFFLINE'));
  }

  /* ------------------------------------------------------------ 状态显示 */

  function setState(text, cls) {
    WM.setStatus('#player-panel [data-panel-status]', text, cls);
    var st = WM.q('#m-state');
    if (st) st.textContent = 'STATE:' + text;
  }

  function setLamp(playing) {
    var l = WM.q('#m-lamp');
    if (!l) return;
    l.classList.toggle('lamp--on', playing);
    l.classList.toggle('lamp--fast', playing);
    l.classList.toggle('lamp--idle', !playing);
  }

  function setPlayIcon(playing) {
    var btn = WM.q('#m-toggle');
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>'
      : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
  }

  function fillReadout(m) {
    var cover = WM.q('#m-cover-box');
    if (cover) {
      /* 清掉旧内容（保留编号角标） */
      WM.qa('img, .media-fallback', cover).forEach(function (n) { n.parentNode.removeChild(n); });
      var c = W.musicCover(m);
      if (c) {
        var img = WM.el('img');
        img.src = c;
        img.alt = (m.title || m.id) + ' 封面';
        cover.insertBefore(img, cover.firstChild);
        WM.imageFallback(img, m.code || m.id, 'NO COVER');
      } else {
        cover.insertBefore(WM.placeholder(m.code || m.id, 'NO COVER'), cover.firstChild);
      }
    }
    var no = WM.q('#m-cover-no');
    if (no) no.textContent = m.code || m.id;

    var t = WM.q('#m-title');
    if (t) t.textContent = m.title || m.id;
    var s = WM.q('#m-sub');
    if (s) s.textContent = (m.artist || '') + ' · ' + (m.album || '') + ' · ' + (m.code || m.id);

    WM.q('#r-id').textContent = m.id || '--';
    WM.q('#r-code').textContent = m.code || '--';
    WM.q('#r-album').textContent = m.album || '--';
    WM.q('#r-tags').textContent = (m.tags && m.tags.length) ? m.tags.join(' / ') : '--';
    WM.q('#r-src').textContent = m.src || '--';
    WM.q('#r-src').title = m.src || '';
    var d = WM.q('#m-desc');
    if (d) d.textContent = m.desc || '（这条曲目还没有写简介）';

    var file = WM.q('#r-file');
    var known = mediaMap[m.src];
    file.textContent = known === true ? 'READY' : (known === false ? 'MISSING' : 'UNKNOWN');
    file.className = 'readout__v ' + (known === true ? 'accent' : (known === false ? 'muted' : ''));

    var path = WM.q('#m-path');
    if (path) path.textContent = 'PATH: ' + (m.src || 'media/music');
    document.title = '▶ ' + (m.title || m.id) + ' — WEIZHI MEDIA TERMINAL';
  }

  function highlight() {
    rows.forEach(function (r, i) {
      r.classList.toggle('is-active', i === idx);
      var ic = WM.q('.row-icon', r);
      if (ic) {
        ic.innerHTML = (i === idx && !audio.paused)
          ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>'
          : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
      }
    });
  }

  /* ------------------------------------------------------------ 播放控制 */

  function load(i, autoplay) {
    if (!W.music.length) return;
    idx = (i + W.music.length) % W.music.length;
    var m = W.music[idx];

    audio.src = m.src;
    audio.load();

    fillReadout(m);
    WM.setSlider(seek, 0);
    if (seek) seek.value = '0';
    WM.q('#m-cur').textContent = '--:--';
    WM.q('#m-dur').textContent = m.duration || '--:--';
    highlight();

    if (autoplay) play(); else setState('READY');
  }

  function play() {
    if (idx < 0) { load(0, true); return; }
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        setState('MEDIA_MISSING');
        setPlayIcon(false);
        setLamp(false);
      });
    }
  }

  function pause() { audio.pause(); }

  function toggle() { audio.paused ? play() : pause(); }

  function step(delta) { load(idx + delta, true); }

  /** 按循环模式决定下一首 */
  function advance() {
    if (repeatMode === 'ONE') {
      audio.currentTime = 0;
      play();
      return;
    }
    if (repeatMode === 'OFF' && idx === W.music.length - 1) {
      setState('ENDED');
      return;
    }
    step(1);
  }

  /* ------------------------------------------------------------ 事件绑定 */

  audio.addEventListener('play', function () {
    setPlayIcon(true); setLamp(true); setState('PLAYING', 'is-ok'); highlight();
    var meter = WM.q('#m-seek-wrap');
    if (meter) meter.classList.add('is-live');
  });
  audio.addEventListener('pause', function () {
    setPlayIcon(false); setLamp(false);
    if (!audio.ended) setState('PAUSED');
    highlight();
    var meter = WM.q('#m-seek-wrap');
    if (meter) meter.classList.remove('is-live');
  });
  audio.addEventListener('ended', function () {
    setState('ENDED'); advance();
  });
  audio.addEventListener('loadedmetadata', function () {
    var d = WM.clock(audio.duration);
    WM.q('#m-dur').textContent = d;
    var m = W.music[idx];
    var row = rows[idx];
    if (row && m) {
      var dEl = WM.q('.row-dur', row);
      if (dEl) dEl.textContent = d;
    }
    var file = WM.q('#r-file');
    if (file && audio.duration) { file.textContent = 'READY'; file.className = 'readout__v accent'; }
  });
  audio.addEventListener('timeupdate', function () {
    if (!audio.duration) return;
    WM.q('#m-cur').textContent = WM.clock(audio.currentTime);
    if (audio.dataset.dragging !== '1') {
      var pct = audio.currentTime / audio.duration * 100;
      WM.setSlider(seek, pct);
      if (seek) seek.value = String(Math.round(pct * 10));
    }
  });
  audio.addEventListener('error', function () {
    var m = W.music[idx];
    setState('MEDIA_MISSING');
    setPlayIcon(false);
    setLamp(false);
    if (!m) return;
    mediaMap[m.src] = false;
    markOffline(rows[idx], m.src);
    var file = WM.q('#r-file');
    if (file) { file.textContent = 'MISSING'; file.className = 'readout__v muted'; }
    WM.notifyMissing('music', m.src);
  });
  audio.addEventListener('volumechange', function () {
    var v = Math.round(audio.volume * 100);
    WM.setSlider(vol, v);
    var txt = WM.q('#m-vol-text');
    if (txt) txt.textContent = (audio.muted ? 'MUTE ' : '') + v + '%';
    var btn = WM.q('#m-mute');
    if (btn) btn.textContent = audio.muted ? 'MUTE' : 'VOL';
  });

  /* 进度条：拖动 + 键盘 */
  if (seek) {
    seek.addEventListener('input', function () {
      var pct = Number(seek.value) / 10;
      WM.setSlider(seek, pct);
      if (audio.duration) WM.q('#m-cur').textContent = WM.clock((Number(seek.value) / 1000) * audio.duration);
    });
    var onDown = function () { audio.dataset.dragging = '1'; };
    var onUp = function () {
      audio.dataset.dragging = '0';
      if (audio.duration) audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
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
      audio.muted = false;
      audio.volume = Number(vol.value) / 100;
      WM.setSlider(vol, Number(vol.value));
    });
  }

  /* 按钮 */
  WM.q('#m-toggle').addEventListener('click', toggle);
  WM.q('#m-prev').addEventListener('click', function () {
    /* 播放超过 3 秒时，先回到本曲开头 */
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    step(-1);
  });
  WM.q('#m-next').addEventListener('click', function () { step(1); });
  WM.q('#m-mute').addEventListener('click', function () { audio.muted = !audio.muted; });

  var repeatBtn = WM.q('#m-repeat');
  var cycleRepeat = function () {
    repeatMode = repeatModes[(repeatModes.indexOf(repeatMode) + 1) % repeatModes.length];
    repeatBtn.textContent = 'LOOP:' + repeatMode;
    repeatBtn.classList.toggle('accent', repeatMode !== 'OFF');
    WM.notice('循环模式：' + repeatMode + '（ALL 列表循环 / ONE 单曲循环 / OFF 播完停止）', '[AUDIO]');
  };
  repeatBtn.addEventListener('click', cycleRepeat);
  repeatBtn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleRepeat(); }
  });

  /* 快捷键 */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      /* 在滑杆上用方向键时，交给原生行为 */
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); if (audio.duration) audio.currentTime = WM.clamp(audio.currentTime + 5, 0, audio.duration); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); if (audio.duration) audio.currentTime = WM.clamp(audio.currentTime - 5, 0, audio.duration); }
    else if (e.code === 'ArrowUp') { e.preventDefault(); audio.volume = WM.clamp(audio.volume + 0.05, 0, 1); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); audio.volume = WM.clamp(audio.volume - 0.05, 0, 1); }
    else if (e.key === 'n' || e.key === 'N') { step(1); }
    else if (e.key === 'p' || e.key === 'P') { step(-1); }
  });

  /* ------------------------------------------------------------ 启动 */

  buildList();
  WM.wireImages(document);
  var repeatInit = WM.q('#m-repeat');
  if (repeatInit) repeatInit.textContent = 'LOOP:' + repeatMode;
  setState('STANDBY');
  setLamp(false);
  WM.setSlider(vol, 80);

  if (W.music.length) {
    /* 预载第一条的读数，但不自动播放、也不预取文件（避免误报缺失） */
    var m0 = W.music[0];
    idx = 0;
    fillReadout(m0);
    WM.q('#m-dur').textContent = m0.duration || '--:--';
    highlight();
  }

  /* 探测文件就绪情况 */
  WM.scanMedia().then(function (map) {
    mediaMap = map || {};
    W.music.forEach(function (m, i) { markOffline(rows[i], m.src); });
    if (idx >= 0) {
      var m = W.music[idx];
      var file = WM.q('#r-file');
      var known = mediaMap[m.src];
      file.textContent = known === true ? 'READY' : (known === false ? 'MISSING' : 'UNKNOWN');
      file.className = 'readout__v ' + (known === true ? 'accent' : 'muted');
    }
  });
})();
