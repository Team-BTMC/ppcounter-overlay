import WebSocketManager from './js/socket.js';
import {
  createChartConfig,
  slidingAverageWindowFilter,
  standardDeviationFilter,
  toChartData
} from "./js/difficulty-graph.js";
const socket = new WebSocketManager('127.0.0.1:24050');

const DIFFICULTY_GRAPH_SMOOTHING = 2; // from interval <2; 10> ... tbh, over 4 it looks like doo doo

const cache = {
  h100: -1,
  h50: -1,
  h0: -1,
  accuracy: -1,
  title: "",
  artist: "",
  difficulty: "",
  bpm: -1,
  cs: -1,
  ar: -1,
  od: -1,
  hp: -1,
  maxSR: -1,
  ppFC: -1,
  background: "",
  difficultyGraph: {
    data: '',
    seek: 0,
    time: 0,
    played: 0
  }
};

const h100 = new CountUp('h100', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });
const h50 = new CountUp('h50', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });
const h0 = new CountUp('h0', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });

const configDarker = createChartConfig('rgba(185, 234, 255, 0.4)');
const configLighter = createChartConfig('rgba(185, 234, 255, 0.8)');
let chartDarker;
let chartLighter;
let chartProgress;

const channels = new Set(["aim", "speed"]);

socket.api_v2(({ play, beatmap, directPath, folders, performance}) => {
  try {
    if (chartDarker !== undefined && chartLighter !== undefined && chartProgress !== undefined) {
      const dataString = JSON.stringify(performance.graph.xaxis);
      if (cache.difficultyGraph.data !== dataString) {
        cache.difficultyGraph.data = dataString;

        console.time('[GRAPH SMOOTHING]')
        const data = new Float32Array(performance.graph.xaxis.length);
        for (const series of performance.graph.series) {
          if (!channels.has(series.name)) {
            continue;
          }

          for (let i = 0; i < data.length && i < series.data.length; i++) {
            data[i] += series.data[i];
          }
        }

        let drainSamples = 0;
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.max(0, data[i]);

          if (data[i] !== 0) {
            drainSamples++;
          }
        }

        const smoothing = Math.round(drainSamples / (Math.PI * 100)) * DIFFICULTY_GRAPH_SMOOTHING;
        const graph = toChartData(
          smoothing === 0
            ? data
            : standardDeviationFilter(
              slidingAverageWindowFilter(data, Math.round(data.length / 600) * DIFFICULTY_GRAPH_SMOOTHING),
              (Math.PI * Math.log2(DIFFICULTY_GRAPH_SMOOTHING)) / 10
            ),
        );

        console.timeEnd('[GRAPH SMOOTHING]');

        configDarker.data.datasets[0].data = graph;
        configDarker.data.labels = graph;

        configLighter.data.datasets[0].data = graph;
        configLighter.data.labels = graph;

        chartDarker.update();
        chartLighter.update();
      }

      const percentage = Math.max(0, Math.min(beatmap.time.live / beatmap.time.mp3Length * 100, 100));
      chartProgress.style.width = String(percentage) + "%";
    }

    if (cache.h100 !== play.hits['100']) {
      cache.h100 = play.hits['100'];
      h100.update(play.hits['100']);
      document.getElementById('h100').innerHTML = play.hits['100'];
    }

    if (cache.h50 !== play.hits['50']) {
      cache.h50 = play.hits['50'];
      h50.update(play.hits['50']);
    }

    if (cache.h0 !== play.hits['0']) {
      cache.h0 = play.hits['0'];
      h0.update(play.hits['0']);
    }

    if (cache.pp !== Math.round(play.pp.current)) {
      cache.pp = Math.round(play.pp.current);
      document.getElementById('pp').innerHTML = Math.round(play.pp.current);
    }

    if (cache.artist !== beatmap.artist || cache.title !== beatmap.stats.title) {
      cache.artist = beatmap.artist;
      cache.title = beatmap.title;
      document.getElementById('title').innerHTML = `${cache.artist} - ${cache.title}`;
    }

    if (cache.difficulty !== beatmap.version) {
      cache.difficulty = beatmap.version;
      document.getElementById('diff').innerHTML = beatmap.version;
    }

    if (cache.bpm !== beatmap.stats.bpm.realtime) {
      cache.bpm = beatmap.stats.bpm.realtime;
      document.getElementById('bpm').innerHTML = beatmap.stats.bpm.realtime;
    }

    if (cache.cs !== beatmap.stats.cs.converted) {
      cache.cs = beatmap.stats.cs.converted;
      document.getElementById('cs').innerHTML = beatmap.stats.cs.converted;
    }

    if (cache.ar !== beatmap.stats.ar.converted) {
      cache.ar = beatmap.stats.ar.converted;
      document.getElementById('ar').innerHTML = beatmap.stats.ar.converted;
    }

    if (cache.od !== beatmap.stats.od.converted) {
      cache.od = beatmap.stats.od.converted;
      document.getElementById('od').innerHTML = beatmap.stats.od.converted;
    }

    if (cache.hp !== beatmap.stats.hp.converted) {
      cache.hp = beatmap.stats.hp.converted;
      document.getElementById('hp').innerHTML = beatmap.stats.hp.converted;
    }

    if (cache.maxSR !== beatmap.stats.stars.total) {
      cache.maxSR = beatmap.stats.stars.total;
      document.getElementById('sr').innerHTML = beatmap.stats.stars.total;
    }

    if (cache.ppFC !== play.pp.fc) {
      cache.ppFC = play.pp.fc;
      document.getElementById('ppMax').innerHTML = Math.round(play.pp.fc);;
    }

    if (cache['menu.bm.path.full'] != directPath.beatmapBackground) {
      cache['menu.bm.path.full'] = directPath.beatmapBackground;
  
      const background_path = directPath.beatmapBackground.replace(folders.songs, '');
  
      const background = document.getElementById('bg');
      background.style.opacity = 0;

      setTimeout(() => {
        background.src = `http://127.0.0.1:24050/files/beatmap/${background_path}`;  
        setTimeout(() => {
          background.style.opacity = 1;
        }, 200);
      }, 200);
  
  
  
      const image = new Image();
      image.src = `http://127.0.0.1:24050/files/beatmap/${background_path}`;
      image.onerror = () => document.getElementById('bg').classList.add('active');
      image.onload = () => document.getElementById('bg').classList.remove('active');
    };
  } catch (error) {
    console.log(error);
  }
});

window.addEventListener('load', () => {
  chartDarker = new Chart(
    document.querySelector('.difficulty-graph .darker').getContext('2d'),
    configDarker
  );

  chartProgress = document.querySelector('.difficulty-graph .progress');
  chartLighter = new Chart(
      document.querySelector('.difficulty-graph .lighter').getContext('2d'),
    configLighter
  );
});