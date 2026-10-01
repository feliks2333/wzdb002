/* ============================================================================
 * WEIZHI MEDIA TERMINAL — 数据中枢 / DATA HUB
 * ----------------------------------------------------------------------------
 * 【重要】本站所有音乐、视频、作品的路径都只写在本文档里。
 *   补真实文件时：
 *     1. 把 mp3 放进 media/music/，mp4 放进 media/video/，封面图放进 media/cover/
 *     2. 回到本文件，把对应条目的 src / poster / cover 改成真实文件名即可
 *     3. 不需要改任何 HTML / CSS
 *
 * 字段说明
 *   music[]  id        编号（唯一，作品通过它关联音乐）
 *            code      UNIT 标签
 *            title     曲名
 *            artist    作者 / 演出
 *            album     专辑 / 合集
 *            src       音频路径，相对站点根目录
 *            cover     可选，媒体封面图（放 media/cover/）；留空显示占位块
 *            duration  预留时长文本，真实文件加载后会被自动覆盖（读不到就显示 --:--）
 *            tags      标签数组
 *            desc      简介
 *   videos[] id / code / title / src / poster / runtime / tags / desc
 *            cover     与 poster 同义，二选一填即可
 *   works[]  id / code / title / type / year / cover / summary / desc / tools[]
 *            music     关联音乐 id 数组
 *            videos    关联视频 id 数组
 * ========================================================================== */
(function (global) {
  'use strict';

  var WORKS = {
    /* ---------------------------------------------------------------- 站点信息 */
    meta: {
      site: 'WEIZHI MEDIA TERMINAL',
      siteCn: '未址媒体终端',
      unit: 'UNIT-01',
      rev: 'REV0.1',
      author: 'WEIZHI',
      role: '影像 / 声音 / 交互装置',
      email: 'weizhi@example.com',            // 改这里即可，about.html 会自动读
      location: 'CN / REMOTE',
      tagline: '冷却的机器，发热的表达。',
      intro:
        '这里是 WEIZHI 的个人作品终端，收纳影像、声音与交互装置的实验记录。' +
        '所有模块以离线优先的方式组织：音频、视频与封面图全部存放在本地 media/ 目录，' +
        '由 assets/js/works.js 统一索引，不依赖任何后端与框架。',
      /* 媒体根目录：只有整体换目录时才需要改 */
      base: {
        music: 'media/music/',
        video: 'media/video/',
        cover: 'media/cover/'
      }
    },

    /* ------------------------------------------------------------------ 音乐 */
    music: [
      {
        id: 'MUS-001',
        code: 'UNIT-01',
        title: 'IMMERSION PROTOCOL',
        artist: 'WEIZHI',
        album: 'RHINE SEQUENCE 01',
        src: 'media/music/01-immersion-protocol.mp3',
        cover: '',                                  /* 可选：媒体封面图，留空则显示占位块 */
        duration: '--:--',
        tags: ['AMBIENT', 'SYNTH'],
        desc: '低速合成器铺底，模拟冷却液在管道里循环的声音。'
      },
      {
        id: 'MUS-002',
        code: 'UNIT-02',
        title: 'COLD START SEQUENCE',
        artist: 'WEIZHI',
        album: 'RHINE SEQUENCE 01',
        src: 'media/music/02-cold-start-sequence.mp3',
        cover: '',
        duration: '--:--',
        tags: ['ELECTRONIC', 'DRONE'],
        desc: '从静止到运行的点火过程，前面三十秒只有电流声。'
      }
    ],

    /* ------------------------------------------------------------------ 视频 */
    videos: [
      {
        id: 'VID-001',
        code: 'UNIT-01',
        title: 'FIELD TEST 01',
        src: 'media/video/01-field-test.mp4',
        poster: 'media/cover/vid-001.jpg',
        runtime: '--:--',
        tags: ['TEST', '16:9'],
        desc: '第一次外场测试记录，手持拍摄，未做稳定处理。'
      },
      {
        id: 'VID-002',
        code: 'UNIT-02',
        title: 'TERMINAL LOOP',
        src: 'media/video/02-terminal-loop.mp4',
        poster: 'media/cover/vid-002.jpg',
        runtime: '--:--',
        tags: ['LOOP', 'UI'],
        desc: '为终端界面做的循环影像，用于展场投影。'
      }
    ],

    /* ------------------------------------------------------------------ 作品 */
    works: [
      {
        id: 'WRK-001',
        code: 'UNIT-01',
        title: 'IMMERSION PROTOCOL — 影像实验',
        type: 'MV',
        year: '2024',
        cover: 'media/cover/wrk-001.jpg',
        summary: '音乐与影像同步推进的短片实验，画面随低频呼吸。',
        desc:
          '以同名曲目为骨架剪接的影像实验：画面亮度与低频振幅绑定，' +
          '在投影环境中观看时，房间的暗部会随节拍一起呼吸。' +
          '全片由三段实拍与两段程序生成图形交叉构成，未使用素材库。',
        tools: ['PREMERE', 'AFTER EFFECTS', 'ABLETON LIVE'],
        music: ['MUS-001'],
        videos: ['VID-001']
      },
      {
        id: 'WRK-002',
        code: 'UNIT-02',
        title: 'COLD START SEQUENCE',
        type: 'AUDIO',
        year: '2024',
        cover: 'media/cover/wrk-002.jpg',
        summary: '纯音频作品，记录一台设备从关机到运行的完整过程。',
        desc:
          '采集自一台老式风冷机箱的启动全过程：继电器、风扇、硬盘寻道。' +
          '素材经时间拉伸后重新编排，末尾保留原始启动噪音不做修饰。',
        tools: ['ABLETON LIVE', 'MAX/MSP'],
        music: ['MUS-002'],
        videos: []
      },
      {
        id: 'WRK-003',
        code: 'UNIT-03',
        title: 'TERMINAL LOOP',
        type: 'VIDEO',
        year: '2025',
        cover: 'media/cover/wrk-003.jpg',
        summary: '为展场制作的循环影像，供终端界面与投影使用。',
        desc:
          '无缝循环的四分钟影像，冷白与安全橙交替出现，' +
          '用于展场大屏与终端背景。片中没有人物，只有机械与光。',
        tools: ['AFTER EFFECTS', 'TOUCHDESIGNER'],
        music: [],
        videos: ['VID-002']
      },
      {
        id: 'WRK-004',
        code: 'UNIT-04',
        title: 'UNIT ARCHIVE 2024',
        type: 'ARCHIVE',
        year: '2025',
        cover: 'media/cover/wrk-004.jpg',
        summary: '全年实验记录的归档卷宗，含草稿、截图与失败样本。',
        desc:
          '把一年里的废稿、测试片段与失败尝试整理成一份可检索的卷宗。' +
          '保留失败样本是本卷宗的目的：它们比成品更能说明方法。',
        tools: ['FIGMA', 'GIT', 'MARKDOWN'],
        music: [],
        videos: []
      }
    ]
  };

  /* ------------------------------------------------------------- 查询辅助函数 */

  /** 按 id 取音乐，取不到返回 null */
  WORKS.getMusic = function (id) {
    for (var i = 0; i < WORKS.music.length; i++) {
      if (WORKS.music[i].id === id) return WORKS.music[i];
    }
    return null;
  };

  /** 按 id 取视频，兼容 cover / poster 两种写法 */
  WORKS.getVideo = function (id) {
    for (var i = 0; i < WORKS.videos.length; i++) {
      if (WORKS.videos[i].id === id) return WORKS.videos[i];
    }
    return null;
  };

  /** 按 id 取作品 */
  WORKS.getWork = function (id) {
    for (var i = 0; i < WORKS.works.length; i++) {
      if (WORKS.works[i].id === id) return WORKS.works[i];
    }
    return null;
  };

  /** 取视频封面：poster 优先，其次 cover，都没有返回空串 */
  WORKS.videoCover = function (v) {
    if (!v) return '';
    return v.poster || v.cover || '';
  };

  /** 取音乐封面（可选字段，没填返回空串 → 页面显示占位块） */
  WORKS.musicCover = function (m) {
    if (!m) return '';
    return m.cover || m.poster || '';
  };

  /** 把作品关联的 id 数组展开成对象数组（自动跳过找不到的 id） */
  WORKS.relatedMusic = function (work) {
    var out = [];
    (work && work.music ? work.music : []).forEach(function (id) {
      var m = WORKS.getMusic(id);
      if (m) out.push(m);
    });
    return out;
  };

  WORKS.relatedVideos = function (work) {
    var out = [];
    (work && work.videos ? work.videos : []).forEach(function (id) {
      var v = WORKS.getVideo(id);
      if (v) out.push(v);
    });
    return out;
  };

  global.WORKS = WORKS;
})(window);
