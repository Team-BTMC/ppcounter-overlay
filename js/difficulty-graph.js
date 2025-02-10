import GraphFill from "./GraphFill.js";



/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 *
 * @param {ArrayLike<number>} array
 * @param windowSize
 * @return {Float64Array}
 */
export function slidingAverageWindowFilter(array, windowSize) {
    const result = new Float64Array(array.length);
  
    for (let i = 0; i < array.length; i += 1) {
        const left = i - windowSize;
        const from = left >= 0
            ? left
            : 0;
        const to = i + windowSize + 1;

        let count = 0;
        let sum = 0;

        for (let j = from; j < to && j < array.length; j += 1) {
            sum += array[j];
            count++;
        }

        result[i] = sum / count;
    }
  
    return result;
}

/**
 * Turn filter output to Chart.js input since Chart.js does not like statically typed array...
 *
 * @param {Float64Array} filterOutput
 * @return {number[]}
 */
export function toChartData(filterOutput) {
    return Array.from(filterOutput);
}

/**
 * @param {GraphFill} fill
 * @returns {{data: {datasets: [{backgroundColor: *, data: *[], fill: boolean}], labels: *[]}, options: {legend: {display: boolean}, elements: {line: {tension: number, cubicInterpolationMode: string}, point: {radius: number}}, responsive: boolean, scales: {x: {display: boolean}, y: {display: boolean}}, tooltips: {enabled: boolean}}, type: string}}
 */
export function createChartConfig(fill) {
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    borderColor: fill.border(),
                    borderWidth: 1.5,
                    backgroundColor: fill.background(),
                    data: [],
                    fill: true,
                }
            ]
        },
        options: {
            tooltips: {
                enabled: false
            },
            legend: {
                display: false,
            },
            elements: {
                line: {
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                point: {
                    radius: 0
                }
            },
            responsive: false,
            scales: {
                x: {
                    display: false,
                },
                y: {
                    display: false,
                }
            }
        }
    };
}
