import WebSocketManager from './js/socket.js';
import {
    createChartConfig,
    toChartData
} from "./js/difficulty-graph.js";
import {
    FAST_SMOOTH_TYPE_MULTIPLE_WIDTH,
    FAST_SMOOTH_TYPE_NO_SMOOTHING,
    fastSmooth,
    max
} from "./js/fast-smooth.js";
import { hitJudgementsAdd, hitJudgementsClear } from "./js/hit-judgements.js";
import GraphFill, { Color } from "./js/GraphFill.js";
const socket = new WebSocketManager('127.0.0.1:24050');

new Odometer({
    el: document.getElementById('bpm'),
    value: 0,
});

new Odometer({
    el: document.getElementById('ppFC'),
    value: 0,
});

new Odometer({
    el: document.getElementById('ppCurrent'),
    value: 0,
});

const cache = {
  h100: -1,
  h50: -1,
  h0: -1,
  sliderBreaks: -1,
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
  difficultyGraph: ''
};

/** @type {0 | 1 | 2 | 3 | 4 | 5} from 0 (no smoothing) to 5 (max smoothing)  */
let graphSmoothing = 2;
const gradientDarker = new GraphFill(new Color(185, 234, 255, 0.4), Color.TRANSPARENT);
const gradientLighter = new GraphFill(new Color(185, 234, 255, 0.7));
let configDarker = createChartConfig(gradientDarker);
let configLighter = createChartConfig(gradientLighter);
let chartDarker;
let chartLighter;
let chartProgress;
const hitJudgementsElement = document.querySelector('#hit-judgements');

function renderGraph(graphData) {
    // Better be sure. In case someone forgets
    if (chartDarker === undefined || chartLighter === undefined || chartProgress === undefined) {
        return;
    }

    console.time('[GRAPH SMOOTHING]');

    // Combine channels that represent the beatmaps difficulty
    const data = new Float32Array(graphData.xaxis.length);
    for (const series of graphData.series) {
        if (!channels.has(series.name)) {
            continue;
        }

        for (let i = 0; i < data.length && i < series.data.length; i++) {
            data[i] += series.data[i];
        }
    }

    // Count up samples that don't represent intro, breaks, and outro sections
    const percent = max(data) / 100;
    let drainSamples = 0;
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.max(0, data[i]);

        if (data[i] > percent) {
            drainSamples++;
        }
    }


    /**
     * Y = 0.00609 * X + 0.88911
     *
     * The number were not chosen randomly, but they are a result of linear regression of hand-picked points:
     * - X = 100; Y = 1
     * - X = 220; Y = 2
     * - X = 500; Y = 4
     * - X = 610; Y = 4
     * - X = 700; Y = 5
     * - X = 1000; Y = 8
     * - X = 1350; Y = 10
     * - X = 2876; Y = 18
     * - X = 8068; Y = 50
     *
     * @type {number}
     */
    const windowWidth = 0.00609 * drainSamples + 0.88911;
    const smoothness = Math.max(FAST_SMOOTH_TYPE_NO_SMOOTHING, Math.min(graphSmoothing, FAST_SMOOTH_TYPE_MULTIPLE_WIDTH));

    const fs = toChartData(
        fastSmooth(data, windowWidth, smoothness)
    );

    console.timeEnd('[GRAPH SMOOTHING]');

    configDarker.data.datasets[0].data = fs;
    configDarker.data.labels = fs;

    configLighter.data.datasets[0].data = fs;
    configLighter.data.labels = fs;

    chartDarker.update();
    chartLighter.update();
}

let MultiplierColorEnabled;

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

        if (message['UseSSPP'] != null) {
            cache['UseSSPP'] = message['UseSSPP'];
        }

        if (message['ShowVisualizer'] != null) {
            cache['ShowVisualizer'] = message['ShowVisualizer'];
        }

        if (message['GraphColor'] != null) {
              gradientDarker.setFill(Color.fromHex(message['GraphColor']).setAlpha(0.5));
              gradientDarker.setBorder(Color.TRANSPARENT.clone());

              const fill = Color.fromHex(message['GraphColor']);
              gradientLighter.setFill(fill.setAlpha(0.5));
              gradientLighter.setBorder(fill.clone().setAlpha(1));

              chartDarker?.update();
              chartLighter?.update();
        }

        if (message['GraphSmoothing'] != null) {
            const smoothingMap = {
                "Raw data": "0",
                "Small smoothing": "1",
                "Smoothing": "2",
                "Big smooth": "3",
                "Manscaped smooth": "4"
            };

            graphSmoothing = smoothingMap[message['GraphSmoothing']];
            renderGraph(JSON.parse(cache.difficultyGraph));
        }

        if (message['CutoffPos'] != null) {
            const cutoffMap = {
                "Top": "border-top-0",
                "Left": "border-left-0",
                "Right": "border-right-0",
                "None": "border-none"
            };

            const cutoffStyleMap = {
                "Top": "20px",
                "Left": "0px",
                "Right": "40px",
                "None": "20px"
            };

            let cutoffPosition = message['CutoffPos'];

            if (cutoffMap[cutoffPosition]) {
                const mainContainer = document.querySelector('.main-container');

                console.log(mainContainer.classList)

                for (const key in cutoffMap) {
                    if (Object.prototype.hasOwnProperty.call(cutoffMap, key)) {
                        const element = cutoffMap[key];
                        console.log(element)
                        mainContainer.classList.remove(element)
                    }
                }

                mainContainer.classList.add(cutoffMap[cutoffPosition])
                document.body.style.marginInline = cutoffStyleMap[cutoffPosition]
            }
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

        if (message["MultiplierColorEnabled"] != null) {
            MultiplierColorEnabled = message["MultiplierColorEnabled"];
        }

    } catch (error) {
        console.log(error);
    };
});

let animationId0;
let animationId1;

const h100 = new CountUp('h100', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });
const h50 = new CountUp('h50', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });
const h0 = new CountUp('h0', 0, 0, 0, .5, { useEasing: true, useGrouping: true, separator: " ", decimal: "." });

const channels = new Set(["aim", "speed"]);

const ppCache = {
    top: document.querySelector('.ppFC').getBoundingClientRect().top,
    left: document.querySelector('.ppFC').getBoundingClientRect().left
}

socket.api_v2(({ play, beatmap, directPath, folders, performance, state, resultsScreen }) => {
    try {
        const percentage = Math.max(0, Math.min(beatmap.time.live / beatmap.time.mp3Length * 100, 100));
        if (chartDarker !== undefined && chartLighter !== undefined && chartProgress !== undefined) {
            const dataString = JSON.stringify(performance.graph);
            if (cache.difficultyGraph !== dataString) {
                cache.difficultyGraph = dataString;

                renderGraph(performance.graph);
            }

            chartProgress.style.width = String(percentage) + "%";
        }

        let pp = state.name === 'ResultScreen' ? resultsScreen.pp : play.pp;
        let hits = state.name === 'ResultScreen' ? resultsScreen.hits : play.hits;

        const isSliderBreak = cache.sliderBreaks !== hits['sliderBreaks'];

        if (cache.h100 !== hits['100']) {
            cache.h100 = hits['100'];
            h100.update(hits['100']);

            if (hits['100'] > 0 && state.name === "Play") {
                cache.sliderBreaks = hits['sliderBreaks'];
                hitJudgementsAdd(hitJudgementsElement, "100", percentage, isSliderBreak);
            }
        }

        if (cache.h50 !== hits['50']) {
            cache.h50 = hits['50'];
            h50.update(hits['50']);

            if (hits['50'] > 0 && state.name === "Play") {
                cache.sliderBreaks = hits['sliderBreaks'];
                hitJudgementsAdd(hitJudgementsElement, "50", percentage, isSliderBreak);
            }
        }

        if (cache.h0 !== hits['0']) {
            cache.h0 = hits['0'];
            h0.update(hits['0']);

            if (hits['0'] > 0 && state.name === "Play") {
                cache.sliderBreaks = hits['sliderBreaks'];
                hitJudgementsAdd(hitJudgementsElement, "x", percentage, isSliderBreak);
            }
        }

        if (hits['100'] === 0 && hits['50'] === 0 && hits['0'] === 0) {
            hitJudgementsClear(hitJudgementsElement);
        }

        if (cache.pp !== Math.round(pp.current)) {
            cache.pp = Math.round(pp.current);
            document.getElementById('ppCurrent').innerHTML = Math.round(pp.current);
        }

        if (cache.artist !== beatmap.artist || cache.title !== beatmap.title) {
            cache.artist = beatmap.artist;
            cache.title = beatmap.title;
            Array.from(document.getElementsByClassName('title')).forEach(element => {
                element.innerHTML = `${beatmap.artist} - ${beatmap.title}`;
            })
            reset('title-text');
            checkAndAnimateScroll(document.querySelector('.title-wrapper'), document.getElementById('title'));
        }

        if (cache.difficulty !== beatmap.version) {
            cache.difficulty = beatmap.version;
            Array.from(document.getElementsByClassName('diff')).forEach(element => {
                element.innerHTML = beatmap.version;
            })
            reset('diff-text');
            checkAndAnimateScroll(document.querySelector('.diff-wrapper'), document.getElementById('diff'), 1);
        }

        if (cache.bpm !== beatmap.stats.bpm.realtime) {
            const bpmValue = document.getElementById('bpm');
            const bpmBox = document.querySelector('.bpm');

            let color = '#FEFFB8';
            if (MultiplierColorEnabled) {
                const { min, max } = beatmap.stats.bpm;

                if (min !== max) {
                    const threshold = (max - min) * 0.25;
                    if (beatmap.stats.bpm.realtime < beatmap.stats.bpm.min + threshold) color = '#b2ff66';
                    if (beatmap.stats.bpm.realtime > beatmap.stats.bpm.max - threshold) color = '#ff6666';
                }
            }

            bpmBox.style.color = color;
            cache.bpm = beatmap.stats.bpm.realtime;
            bpmValue.innerHTML = beatmap.stats.bpm.realtime;

            document.querySelector('.beat-lighting').setAttribute('style', `animation: bpm-animation ${1000 / (beatmap.stats.bpm.realtime / 60)}ms infinite linear;`)
        }

        if (cache.cs !== beatmap.stats.cs.converted) {
            const csBox = document.querySelector('.cs');
            const csValue = document.getElementById('cs');

            let csBoxTextColor = '#ffffff';
            if (MultiplierColorEnabled) {
                if (beatmap.stats.cs.original !== beatmap.stats.cs.converted) {
                    csBoxTextColor = beatmap.stats.cs.converted > beatmap.stats.cs.original ? '#ff6666' : '#b2ff66';
                }
            }

            csBox.style.color = csBoxTextColor;
            cache.cs = beatmap.stats.cs.converted;
            csValue.innerHTML = Math.round(beatmap.stats.cs.converted*100)/100;
        }

        if (cache.ar !== beatmap.stats.ar.converted) {
            const arBox = document.querySelector('.ar');
            const arValue = document.getElementById('ar');

            let arBoxTextColor = '#ffffff';
            if (MultiplierColorEnabled) {
                if (beatmap.stats.ar.original !== beatmap.stats.ar.converted) {
                    arBoxTextColor = beatmap.stats.ar.converted > beatmap.stats.ar.original ? '#ff6666' : '#b2ff66';
                }
            }

            arBox.style.color = arBoxTextColor;
            cache.ar = beatmap.stats.ar.converted;
            arValue.innerHTML = Math.round(beatmap.stats.ar.converted*100)/100;
        }

        if (cache.od !== beatmap.stats.od.converted) {
            const odBox = document.querySelector('.od');
            const odValue = document.getElementById('od');

            let odBoxTextColor = '#ffffff';
            if (MultiplierColorEnabled) {
                if (beatmap.stats.od.original !== beatmap.stats.od.converted) {
                    odBoxTextColor = beatmap.stats.od.converted > beatmap.stats.od.original ? '#ff6666' : '#b2ff66';
                }
            }

            odBox.style.color = odBoxTextColor;
            cache.od = beatmap.stats.od.converted;
            odValue.innerHTML = Math.round(beatmap.stats.od.converted*100)/100;
        }

        if (cache.hp !== beatmap.stats.hp.converted) {
            const hpBox = document.querySelector('.hp');
            const hpValue = document.getElementById('hp');

            let hpBoxTextColor = '#ffffff';
            if (MultiplierColorEnabled) {
                if (beatmap.stats.hp.original !== beatmap.stats.hp.converted) {
                    hpBoxTextColor = beatmap.stats.hp.converted > beatmap.stats.hp.original ? '#ff6666' : '#b2ff66';
                }
            }

            hpBox.style.color = hpBoxTextColor;
            cache.hp = beatmap.stats.hp.converted;
            hpValue.innerHTML = Math.round(beatmap.stats.hp.converted*100)/100;
        }

        if (cache.maxSR !== beatmap.stats.stars.total) {
            cache.maxSR = beatmap.stats.stars.total;
            let sr = document.getElementById('sr');
            let srTextColor = beatmap.stats.stars.total >= 6.5 ? '#fd5' : '#000000';
            sr.innerHTML = beatmap.stats.stars.total.toFixed(2);
            sr.style.color = srTextColor;
            document.querySelector('.sr-star').style.backgroundColor = srTextColor;
            document.getElementById('srCont').style.backgroundColor = getDiffColour(cache.maxSR);
        }

        if ((state.name === 'Play' || state.name === 'ResultScreen') && Boolean(cache['UseSSPP'])) {
            cache.ppSS = performance.accuracy[100];
            document.getElementById('ppFC').innerHTML = Math.round(performance.accuracy[100]).toString();
        } else if ((state.name === 'Play' || state.name === 'ResultScreen') && cache.ppFC !== pp.fc) {
            cache.ppFC = pp.fc;
            document.getElementById('ppFC').innerHTML = Math.round(pp.fc).toString();
        } else if (cache.ppSS !== performance.accuracy[100]) {
            cache.ppSS = performance.accuracy[100];
            document.getElementById('ppFC').innerHTML = Math.round(performance.accuracy[100]).toString();
        }

        if (Boolean(cache['ShowVisualizer'])) {
            document.querySelector('.beat-lighting').style.opacity = 1;
        }

        const ppValueContainer = document.querySelector('.ppFC');
        const ppCurrent = document.querySelector('.ppCurrent')
        const slash = document.querySelector('.slash')
        const ppContainer = document.querySelector('.pp')
        const hitErrorsContainer = document.querySelector('.hit-errors')


        if (state.name !== 'Play' && state.name !== 'ResultScreen') {
            const pp = document.getElementById('ppFC');

            const hitErrors = document.getElementById('ppFC');

            if (pp.innerHTML !== cache.ppSS) {
                pp.innerHTML = Math.round(performance.accuracy[100]).toString();
            }

            hitErrorsContainer.style.height = 0;
            hitErrorsContainer.style.opacity = 0;
            ppContainer.style.height = '100%';

            ppValueContainer.style.transform =
                `translateX(-50%) scale(1.8)`
            ppValueContainer.style.left = '50%'

            ppCurrent.style.opacity = 0;
            slash.style.opacity = 0;

            ppCurrent.style.transform = 'translateY(40px)';
            slash.style.transform = 'translate(-50%, 40px)';
        } else {
            const pp = document.getElementById('ppFC');

            hitErrorsContainer.style.height = '60%';
            hitErrorsContainer.style.opacity = 1;
            ppContainer.style.height = '40%';

            ppValueContainer.style.transform =
                `translateX(-50%) scale(1)`
            ppValueContainer.style.left = '75%'

            ppCurrent.style.opacity = 1;
            slash.style.opacity = 1;

            ppCurrent.style.transform = 'translateX(-50%)';
            ppCurrent.style.left = '25%';
            slash.style.transform = 'translate(-50%, 0px)';
        }

        if (cache['menu.bm.path.full'] != directPath.beatmapBackground) {
            cache['menu.bm.path.full'] = directPath.beatmapBackground;

            const background_path = directPath.beatmapBackground.replace(folders.songs, '');

            const background = document.getElementById('bg');
            background.style.opacity = 0;

            setTimeout(() => {
                background.src = `http://127.0.0.1:24050/files/beatmap/${background_path}`;
            }, 250)

            setTimeout(() => {
                background.style.opacity = 1;
            }, 300);

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

/**
 * No comments
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 */
async function checkAndAnimateScroll(parent, child) {
    if (child.getBoundingClientRect().width >= parent.getBoundingClientRect().width) {
        parent.classList.add('marquee')
        const titles = parent.querySelectorAll('span')

        if (titles.length < 2) parent.append(child.cloneNode(true));

    } else {
        parent.classList.remove('marquee')
        const titles = parent.querySelectorAll('span')

        if (titles.length > 1) titles[0].remove();
    }
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

const img = document.getElementById('bg');
img.onerror = function () {
    img.src = './assets/noimage.png';
};
