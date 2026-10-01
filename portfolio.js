/* ============================================================================
 * 作品集：卡片渲染 + 类型筛选 + 详情面板（含关联音视频小播放器）
 * 数据来自 assets/js/works.js 的 works[]
 * ========================================================================== */
(function () {
  'use strict';

  var W = window.WORKS;
  var WM = window.WM;
  if (!W || !WM) return;

  var grid = WM.q('#wk-grid');
  var detail = WM.q('#wk-detail');
  var mediaMap = {};
  var filter = 'ALL';
  var openId = null;
  var miniAudios = [];      /* 详情面板里的音频，保证同时只响一个 */
  var cardMap = {};         /* id -> card 元素 */

  /* ------------------------------------------------------------ 卡片渲染 */

  function coverNode(w) {
    var box = WM.el('div', 'card__media');
    if (w.cover) {
      var img = WM.el('img');
      img.src = w.cover;
      img.alt = (w.title || w.id) + ' 封面';
      img.setAttribute('data-img', '');
      img.setAttribute('data-code', w.code || w.id);
      img.setAttribute('data-label', 'NO COVER');
      box.appendChild(img);
    } else {
      box.appendChild(WM.placeholder(w.code || w.id, 'NO COVER'));
    }
    box.appendChild(WM.el('span', 'card__media-code mono', w.code || w.id));
    box.appendChild(WM.el('span', 'card__type mono', w.type || 'WORK'));
    return box;
  }

  function buildCards() {
    if (!grid) return;
    if (!W.works.length) {
      grid.appendChild(WM.el('p', 'mono muted', '作品集为空：请在 works.js 的 works[] 里添加条目。'));
      return;
    }

    W.works.forEach(function (w) {
      var card = WM.el('article', 'card');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-work', w.id);
      card.setAttribute('aria-label', '打开作品 ' + (w.title || w.id) + ' 的详情');

      card.appendChild(coverNode(w));

      var body = WM.el('div', 'card__body');
      body.appendChild(WM.el('h3', 'card__title', w.title || w.id));
      body.appendChild(WM.el('p', 'card__summary', w.summary || ''));

      var tags = WM.el('div', 'card__tags');
      var music = W.relatedMusic(w);
      var videos = W.relatedVideos(w);
      if (music.length) tags.appendChild(WM.el('span', 'chip chip--accent', 'AUDIO ×' + music.length));
      if (videos.length) tags.appendChild(WM.el('span', 'chip chip--blue', 'VIDEO ×' + videos.length));
      tags.appendChild(WM.el('span', 'chip', w.year || '--'));
      if (w.tools && w.tools.length) tags.appendChild(WM.el('span', 'chip', w.tools[0]));
      body.appendChild(tags);

      card.appendChild(body);

      card.addEventListener('click', function () { open(w.id, true); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(w.id, true); }
      });

      grid.appendChild(card);
      cardMap[w.id] = card;
    });

    WM.wireImages(grid);
  }

  /* ------------------------------------------------------------ 筛选 */

  function applyFilter(type) {
    filter = type;
    var shown = 0;
    W.works.forEach(function (w) {
      var card = cardMap[w.id];
      if (!card) return;
      var on = (type === 'ALL' || (w.type || '').toUpperCase() === type);
      card.classList.toggle('hidden', !on);
      if (on) shown++;
    });
    var c = WM.q('#wk-count');
    if (c) c.textContent = 'SHOWING ' + WM.pad(shown) + ' / ' + WM.pad(W.works.length);
    /* 当前打开的作品被筛掉时关闭详情 */
    if (openId && filter !== 'ALL') {
      var w = W.getWork(openId);
      if (w && (w.type || '').toUpperCase() !== filter) close();
    }
  }

  function initFilters() {
    var btns = WM.qa('[data-filter]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) { o.classList.toggle('is-active', o === b); });
        applyFilter(b.getAttribute('data-filter'));
      });
    });
  }

  /* ------------------------------------------------------------ 关联音频小播放器 */

  function audioMini(m) {
    var wrap = WM.el('div', 'mini-player');
    var head = WM.el('div', 'mini-player__head');
    head.appendChild(WM.el('span', 'mono', m.code || m.id));
    head.appendChild(WM.el('span', 'grow', m.title || ''));
    head.appendChild(WM.el('span', 'mono', m.tags ? m.tags.join(' / ') : 'AUDIO'));
    wrap.appendChild(head);

    var body = WM.el('div', 'mini-player__body');

    var audio = document.createElement('audio');
    audio.preload = 'none';               /* 懒加载：点了播放才去取文件，避免无谓的 404 */
    audio.volume = 0.85;
    audio.className = 'hidden';

    var row = WM.el('div', 'mini-row');
    var btn = WM.el('button', 'btn-play');
    btn.type = 'button';
    btn.setAttribute('aria-label', '播放 ' + (m.title || m.id));
    btn.innerHTML = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';

    var slider = WM.el('div', 'slider slider--blue grow');
    var track = WM.el('div', 'slider__track');
    var fill = WM.el('div', 'slider__fill');
    var input = WM.el('input', 'slider__input');
    input.type = 'range';
    input.min = '0';
    input.max = '1000';
    input.value = '0';
    input.setAttribute('aria-label', '播放进度 ' + (m.title || m.id));
    slider.appendChild(track);
    slider.appendChild(fill);
    slider.appendChild(input);

    var time = WM.el('span', 'time-readout');
    time.innerHTML = '<b>--:--</b> / <span>' + (m.duration || '--:--') + '</span>';

    row.appendChild(btn);
    row.appendChild(slider);
    row.appendChild(time);
    body.appendChild(row);

    var row2 = WM.el('div', 'mini-row');
    var state = WM.el('span', 'mono muted', 'STATE:STANDBY');
    row2.appendChild(state);
    row2.appendChild(WM.el('span', 'grow'));
    row2.appendChild(WM.el('span', 'mono muted', m.src || ''));
    body.appendChild(row2);

    wrap.appendChild(body);
    wrap.appendChild(audio);

    /* 播放行为 */
    var setIcon = function (playing) {
      btn.innerHTML = playing
        ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 H4 V10 H1 Z M6 0 H9 V10 H6 Z"/></svg>'
        : '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0 L9 5 L1 10 Z"/></svg>';
    };

    var srcReady = false;
    btn.addEventListener('click', function () {
      if (!srcReady) { audio.src = m.src; audio.load(); srcReady = true; }
      if (audio.paused) {
        miniAudios.forEach(function (a) { if (a !== audio) a.pause(); });
        var p = audio.play();
        if (p && p.catch) p.catch(function () {
          state.textContent = 'STATE:MEDIA_MISSING';
          WM.notifyMissing('music', m.src);
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function () { setIcon(true); state.textContent = 'STATE:PLAYING'; });
    audio.addEventListener('pause', function () { setIcon(false); state.textContent = 'STATE:PAUSED'; });
    audio.addEventListener('ended', function () { setIcon(false); state.textContent = 'STATE:ENDED'; });
    audio.addEventListener('error', function () {
      setIcon(false);
      state.textContent = 'STATE:MEDIA_MISSING';
      mediaMap[m.src] = false;
      WM.notifyMissing('music', m.src);
    });
    audio.addEventListener('loadedmetadata', function () {
      WM.q('span', time).textContent = WM.clock(audio.duration);
      state.textContent = 'STATE:READY';
    });
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      WM.q('b', time).textContent = WM.clock(audio.currentTime);
      if (audio.dataset.dragging !== '1') {
        var pct = audio.currentTime / audio.duration * 100;
        WM.setSlider(input, pct);
        input.value = String(Math.round(pct * 10));
      }
    });
    input.addEventListener('input', function () {
      WM.setSlider(input, Number(input.value) / 10);
      if (audio.duration) WM.q('b', time).textContent = WM.clock((Number(input.value) / 1000) * audio.duration);
    });
    var down = function () { audio.dataset.dragging = '1'; };
    var up = function () {
      audio.dataset.dragging = '0';
      if (audio.duration) audio.currentTime = (Number(input.value) / 1000) * audio.duration;
    };
    input.addEventListener('pointerdown', down);
    input.addEventListener('pointerup', up);
    input.addEventListener('change', up);

    miniAudios.push(audio);
    return wrap;
  }

  /* ------------------------------------------------------------ 关联视频小播放器 */

  function videoMini(v) {
    var wrap = WM.el('div', 'mini-player');
    var head = WM.el('div', 'mini-player__head');
    head.appendChild(WM.el('span', 'mono', v.code || v.id));
    head.appendChild(WM.el('span', 'grow', v.title || ''));
    head.appendChild(WM.el('span', 'mono', v.src || ''));
    wrap.appendChild(head);

    var body = WM.el('div', 'mini-player__body');
    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'none';               /* 点了播放才取文件 */
    video.playsInline = true;
    video.src = v.src;
    var cover = W.videoCover(v);
    if (cover && mediaMap[cover] !== false) video.setAttribute('poster', cover);
    video.addEventListener('error', function () {
      if (!video.getAttribute('src')) return;
      mediaMap[v.src] = false;
      WM.notifyMissing('video', v.src);
    });
    video.addEventListener('play', function () {
      miniAudios.forEach(function (a) { a.pause(); });
      WM.qa('video', detail).forEach(function (o) { if (o !== video) o.pause(); });
    });
    body.appendChild(video);
    wrap.appendChild(body);
    return wrap;
  }

  /* ------------------------------------------------------------ 详情面板 */

  function open(id, scroll) {
    var w = W.getWork(id);
    if (!w || !detail) return;
    openId = id;

    WM.q('#d-code').textContent = w.code || id;
    WM.q('#d-title').textContent = w.title || id;
    WM.q('#d-type').textContent = (w.type || 'WORK') + ' · ' + (w.year || '');
    WM.q('#d-desc').textContent = w.desc || w.summary || '（这条作品还没有写说明）';

    /* 封面 */
    var media = WM.q('#d-media');
    media.innerHTML = '';
    if (w.cover) {
      var img = WM.el('img');
      img.src = w.cover;
      img.alt = (w.title || id) + ' 封面';
      media.appendChild(img);
      WM.imageFallback(img, w.code || id, 'NO COVER');
    } else {
      media.appendChild(WM.placeholder(w.code || id, 'NO COVER'));
    }
    media.appendChild(WM.el('span', 'card__type mono', w.type || 'WORK'));

    /* 键值表 */
    var kv = WM.q('#d-kv');
    kv.innerHTML = '';
    var rows = [
      ['ID', w.id || '--'],
      ['UNIT', w.code || '--'],
      ['TYPE', w.type || '--'],
      ['YEAR', w.year || '--'],
      ['TOOLS', (w.tools && w.tools.length) ? w.tools.join(' / ') : '--'],
      ['COVER', w.cover || '（未设置）'],
      ['AUDIO LINK', W.relatedMusic(w).map(function (m) { return m.id; }).join(' / ') || '--'],
      ['VIDEO LINK', W.relatedVideos(w).map(function (v) { return v.id; }).join(' / ') || '--']
    ];
    rows.forEach(function (r) {
      var row = WM.el('div', 'kv__row');
      row.appendChild(WM.el('span', 'kv__k', r[0]));
      row.appendChild(WM.el('span', null, r[1]));
      kv.appendChild(row);
    });

    /* 释放上一轮的音频，避免叠加播放 */
    miniAudios.forEach(function (a) { a.pause(); a.removeAttribute('src'); });
    miniAudios = [];
    WM.qa('video', detail).forEach(function (o) { o.pause(); });

    /* 关联音频 */
    var aWrap = WM.q('#d-audio-wrap');
    var aBox = WM.q('#d-audio');
    var musics = W.relatedMusic(w);
    aBox.innerHTML = '';
    if (musics.length) {
      aWrap.classList.remove('hidden');
      musics.forEach(function (m) { aBox.appendChild(audioMini(m)); });
    } else {
      aWrap.classList.add('hidden');
    }

    /* 关联视频 */
    var vWrap = WM.q('#d-video-wrap');
    var vBox = WM.q('#d-video');
    var vids = W.relatedVideos(w);
    vBox.innerHTML = '';
    if (vids.length) {
      vWrap.classList.remove('hidden');
      vids.forEach(function (v) { vBox.appendChild(videoMini(v)); });
    } else {
      vWrap.classList.add('hidden');
    }

    /* 高亮卡片 */
    Object.keys(cardMap).forEach(function (k) {
      cardMap[k].classList.toggle('is-open', k === id);
      cardMap[k].setAttribute('aria-expanded', String(k === id));
    });

    detail.classList.add('is-open');
    if (history.replaceState) history.replaceState(null, '', '#' + encodeURIComponent(id));

    if (scroll) {
      var top = detail.getBoundingClientRect().top + window.pageYOffset - 60;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function close() {
    openId = null;
    detail.classList.remove('is-open');
    miniAudios.forEach(function (a) { a.pause(); });
    WM.qa('video', detail).forEach(function (o) { o.pause(); });
    Object.keys(cardMap).forEach(function (k) {
      cardMap[k].classList.remove('is-open');
      cardMap[k].removeAttribute('aria-expanded');
    });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ------------------------------------------------------------ 启动 */

  buildCards();
  initFilters();
  applyFilter('ALL');

  WM.q('#d-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openId) close();
  });

  /* 直达链接：portfolio.html#WRK-001 */
  function fromHash() {
    var id = decodeURIComponent((location.hash || '').replace('#', ''));
    if (id && W.getWork(id)) open(id, true);
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);

  /* 文件探测：标记封面缺失、更新详情里的封面占位 */
  WM.scanMedia().then(function (map) {
    mediaMap = map || {};
    WM.qa('#wk-grid img[data-img]').forEach(function (img) {
      var code = img.getAttribute('data-code');
      var w = null;
      W.works.forEach(function (x) { if ((x.code || x.id) === code) w = x; });
      WM.imageFallback(img, code, WM.isMissing(mediaMap, w ? w.cover : '') ? 'COVER MISSING' : 'NO COVER');
    });
    if (openId) {
      /* 重新打开一次，让封面判定用上最新探测结果 */
      var keep = openId;
      open(keep, false);
    }
  });
})();
