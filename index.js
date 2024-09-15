// connecting to websocket
import WebSocketManager from './js/socket.js';
import { createChartConfig, smooth } from "./js/difficulty-graph.js";
const socket = new WebSocketManager('127.0.0.1:24050');



const DIFFICULTY_GRAPH_SMOOTHING = 3;



// cache values here to prevent constant updating
const cache = {
  h100: -1,
  h50: -1,
  h0: -1,
  accuracy: -1,
  difficultyGraph: {
    data: '',
    seek: 0,
    time: 0,
    played: 0
  }
};



// Smooth numbers update
const accuracy = new CountUp('accuracy', 0, 0, 2, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." })
const h100 = new CountUp('h100', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." })
const h50 = new CountUp('h50', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." })
const h0 = new CountUp('h0', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." })

const configDarker = createChartConfig('rgba(185, 234, 255, 0.4)');
const configLighter = createChartConfig('rgba(185, 234, 255, 0.8)');
let chartDarker;
let chartLighter;
let chartProgress;

const categories = new Set(["aim", "speed"]);



// receive message update from websocket
socket.api_v2(({ play, performance, beatmap }) => {
  try {
    if (chartDarker !== undefined && chartLighter !== undefined && chartProgress !== undefined) {
      const dataString = JSON.stringify(performance.graph.xaxis);
      if (cache.difficultyGraph.data !== dataString) {
        cache.difficultyGraph.data = dataString;

        console.log(performance.graph);
        const data = new Float32Array(performance.graph.xaxis.length);
        for (const series of performance.graph.series) {
          if (!categories.has(series.name)) {
            continue;
          }

          for (let i = 0; i < data.length && i < series.data.length; i++) {
            data[i] += series.data[i];
          }
        }

        const smoothed = smooth(data, DIFFICULTY_GRAPH_SMOOTHING, x => Math.max(0, x / 1000));
        console.log(smoothed);

        configDarker.data.datasets[0].data = smoothed;
        configDarker.data.labels = smoothed;

        configLighter.data.datasets[0].data = smoothed;
        configLighter.data.labels = smoothed;

        chartDarker.update();
        chartLighter.update();
      }

      const percentage = Math.max(0, Math.min(beatmap.time.live / beatmap.time.mp3Length * 100, 100));
      chartProgress.style.width = String(percentage) + "%";
    }

    // check if value has changed
    if (cache.h100 !== play.hits['100']) {
      // update cache
      cache.h100 = play.hits['100'];


      //      IMPORTANT   !!   USE ONE OF THEM

      // update html via countup
      h100.update(play.hits['100']);

      // update html via js
      document.getElementById('h100').innerHTML = play.hits['100'];
    };



    if (cache.h50 !== play.hits['50']) {
      cache.h50 = play.hits['50'];
      h50.update(play.hits['50']);
    };

    if (cache.h0 !== play.hits['0']) {
      cache.h0 = play.hits['0'];
      h0.update(play.hits['0']);
    };

    if (cache.accuracy != play.accuracy) {
      cache.accuracy = play.accuracy;
      accuracy.update(play.accuracy);
    };

    if (cache.pp !== Math.round(play.pp.current)) {
      cache.pp = Math.round(play.pp.current);
      document.getElementById('pp').innerHTML = Math.round(play.pp.current);
    };
  } catch (error) {
    console.log(error);
  };
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