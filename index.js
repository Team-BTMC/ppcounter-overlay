import WebSocketManager from './js/socket.js';
import {
  createChartConfig,
  slidingAverageWindowFilter,
  standardDeviationFilter,
  toChartData
} from "./js/difficulty-graph.js";
const socket = new WebSocketManager('127.0.0.1:24050');

let graphSmoothing = 2; // from interval <2; 10> ... tbh, over 4 it looks like doo doo
let configDarker = createChartConfig('rgba(185, 234, 255, 0.4)');
let configLighter = createChartConfig('rgba(185, 234, 255, 0.7)');
let chartDarker;
let chartLighter;
let chartProgress;

function renderGraph(graphData) {
  // Better be sure. In case someone forgets
  if (chartDarker === undefined || chartLighter === undefined || chartProgress === undefined) {
    return;
  }

  console.time('[GRAPH SMOOTHING]');

  const data = new Float32Array(graphData.xaxis.length);
  for (const series of graphData.series) {
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

  const smoothing = Math.round(drainSamples / (Math.PI * 100)) * graphSmoothing;
  const graph = toChartData(
    smoothing === 0
      ? data
      : standardDeviationFilter(
        slidingAverageWindowFilter(data, Math.round(data.length / 600) * graphSmoothing),
        (Math.PI * Math.log2(graphSmoothing)) / 10
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



socket.sendCommand('getSettings', encodeURI(window.COUNTER_PATH));
socket.commands((data) => {
  try {
    const { message } = data;
    if (message['GraphDisabled'] != null) {
      cache['GraphDisabled'] = message['GraphDisabled'];

      if (Boolean(cache['GraphDisabled']) == true) {
        document.getElementsByClassName('difficulty-graph')[0].style.display = 'none';
      } else {
        document.getElementsByClassName('difficulty-graph')[0].style.display = 'block';
      }
    }

    if (message['GraphColor'] != null) {
      (chartDarker ?? configDarker).data.datasets[0].backgroundColor = hexToRgbA(message['GraphColor'], 0.4);
      (configLighter ?? configLighter).data.datasets[0].backgroundColor = hexToRgbA(message['GraphColor'], 0.7);

      chartDarker?.update();
      chartLighter?.update();
    }

    if (message['GraphSmoothing'] != null) {
      graphSmoothing = message['GraphSmoothing'];
      renderGraph(JSON.parse(cache.difficultyGraph));
    }

    if (message['GradientColor1'] != null) {
      document.body.style.setProperty('--gradientColor1', message['GradientColor1']);
    };
    if (message['GradientColor2'] != null) {
      document.body.style.setProperty('--gradientColor2', message['GradientColor2']);
    };
    if (message['OutlineColor'] != null) {
      document.body.style.setProperty('--outlineColor', message['OutlineColor']);
    };
    if (message['DashedLinesColor'] != null) {
      document.body.style.setProperty('--dashedLineColor', message['DashedLinesColor']);
    };
    if (message['100Color'] != null) {
      document.body.style.setProperty('--hunderdColor', message['100Color']);
    };
    if (message['50Color'] != null) {
      document.body.style.setProperty('--fiftyColor', message['50Color']);
    };
    if (message['MissColor'] != null) {
      document.body.style.setProperty('--missColor', message['MissColor']);
    };

  } catch (error) {
    console.log(error);
  };
});

let animationId0;
let animationId1;

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
  ppSS: -1,
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

const channels = new Set(["aim", "speed"]);

socket.api_v2(({play, beatmap, directPath, folders, performance, state}) => {
  try {
    if (chartDarker !== undefined && chartLighter !== undefined && chartProgress !== undefined) {
      const dataString = JSON.stringify(performance.graph);
      if (cache.difficultyGraph !== dataString) {
        cache.difficultyGraph = dataString;

        renderGraph(performance.graph);
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

    if (cache.artist !== beatmap.artist || cache.title !== beatmap.title) {
      cache.artist = beatmap.artist;
      cache.title = beatmap.title;
      document.getElementById('title').innerHTML = `${beatmap.artist} - ${beatmap.title}`;
      reset('title-text');
      checkAndAnimateScroll(document.querySelector('.ArtistSong'), document.getElementById('title'), 0);
    }

    if (cache.difficulty !== beatmap.version) {
      cache.difficulty = beatmap.version;
      document.getElementById('diff').innerHTML = beatmap.version;
      reset('diff-text');
      checkAndAnimateScroll(document.querySelector('.Difficulty'), document.getElementById('diff'), 1);
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
      let sr = document.getElementById('sr');
      let srTextColor = beatmap.stats.stars.total >= 6.5 ? '#fd5' : '#000000';
      sr.innerHTML = beatmap.stats.stars.total;
      sr.style.color = srTextColor;
      document.getElementById('srStar').contentDocument.getElementsByTagName('svg')[0].style.fill = srTextColor;
      document.getElementById('srCont').style.backgroundColor = getDiffColour(cache.maxSR);
    }

    if ((state.name === 'Play' || state.name === 'ResultScreen') && cache.ppFC !== play.pp.fc) {
      cache.ppFC = play.pp.fc;
      document.getElementById('ppMax').innerHTML = Math.round(play.pp.fc).toString();
    } else if (cache.ppSS !== performance.accuracy[100]) {
      cache.ppSS = performance.accuracy[100];
      document.getElementById('ppMax').innerHTML = Math.round(performance.accuracy[100]).toString();
    }
    
    let ppIfFC = document.getElementsByClassName('AlignPP PPifFC')[0];
    let ppCurrent = document.getElementsByClassName('AlignPP CurrentPP')[0];
    let ppSlash = document.getElementsByClassName('slash')[0];
    
    if (state.name !== 'Play' && state.name !== 'ResultScreen') {
      const pp = document.getElementById('ppMax');
      if (pp.innerHTML !== cache.ppSS) {
        pp.innerHTML = Math.round(performance.accuracy[100]).toString();
      }
      ppIfFC.style.transform = 'translateX(-60px)';
      ppCurrent.style.transform = 'translateY(20px)';
      ppSlash.style.transform = 'translateY(20px)';
      ppCurrent.style.opacity = 0;
      ppSlash.style.opacity = 0;
    } else {
      ppIfFC.style.transform = 'translateX(0)';
      ppCurrent.style.transform = 'translateY(0)';
      ppSlash.style.transform = 'translateY(0)';
      ppCurrent.style.opacity = 1;
      ppSlash.style.opacity = 1;
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
        }, 100);
      }, 100);
  
  
  
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

function reset(item) {
  let clones = document.querySelectorAll(`.${item}.clone`);

  Array.from(clones).forEach(clone => {
    clone.remove(); 
  });

  if (animationId0 && item === 'title-text') {
    cancelAnimationFrame(animationId0);
  } else if (animationId1 && item === 'diff-text') {
    cancelAnimationFrame(animationId1);
  }
}

function checkAndAnimateScroll(box, text, picker) {
  if (text.scrollWidth > box.clientWidth) {
      const clone = text.cloneNode(true);
      clone.classList.add('clone');
      clone.style.left = `${text.scrollWidth + 20}px`;

      box.appendChild(clone);
      box.style.mask = 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)';

      startScroll(text, clone, picker);
  }
  else {
    text.style.left = '0px';
    box.style.mask = '';
  }
}

function startScroll(original, clone, picker) {
  let originalPos = 0;
  let clonePos = original.scrollWidth + 20;

  function animate() {
      originalPos -= 0.2;
      clonePos -= 0.2;

      original.style.left = `${originalPos}px`;
      clone.style.left = `${clonePos}px`;

      if (originalPos < -original.scrollWidth - 20) {
          originalPos = clonePos + original.scrollWidth + 20;
      }
      if (clonePos < -clone.scrollWidth - 20) {
          clonePos = originalPos + clone.scrollWidth + 20;
      }

      if (picker == 0) {
        animationId0 = requestAnimationFrame(animate);
      } else if (picker == 1) {
        animationId1 = requestAnimationFrame(animate);
      } else {
        console.log('Massive error, please report this to the developer on discord: @h_24');
      }
  }

  animate();
}

function hexToRgbA(hex, alpha = 1) {
  var c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
          c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  throw new Error('Bad Hex');
}

// Taken from osu-web
const difficultyColourSpectrum = d3.scaleLinear()
  .domain([0.1, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9])
  .clamp(true)
  .range(['#4290FB', '#4FC0FF', '#4FFFD5', '#7CFF4F', '#F6F05C', '#FF8068', '#FF4E6F', '#C645B8', '#6563DE', '#18158E', '#000000'])
  .interpolate(d3.interpolateRgb.gamma(2.2));
  
function getDiffColour(rating) {
  if (rating < 0.1) return '#AAAAAA';
  if (rating >= 9) return '#000000';
  return difficultyColourSpectrum(rating);
}
