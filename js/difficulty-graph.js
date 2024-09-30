// /**
//  * @typedef {{ x: number, y: number }} Point
//  */

// /**
//  * @param {number} x
//  * @param {number} y
//  * @param {Point | undefined} out
//  * @return {Point}
//  */
// function point(x, y, out = undefined) {
//     if (out !== undefined) {
//         out.x = x;
//         out.y = y;
//         return out;
//     }

//     return { x, y };
// }

// class Vec {
//     /**
//      * @param {Point} a
//      * @param {Point} b
//      * @return {Vec}
//      */
//     static from(a, b) {
//         return new Vec(
//             b.x - a.x,
//             b.y - a.y
//         );
//     }

//     /** @type {number} */
//     x;
//     /** @type {number} */
//     y;

//     /**
//      * @param {number} x
//      * @param {number} y
//      */
//     constructor(x, y) {
//         this.x = x;
//         this.y = y;
//     }

//     /**
//      * @param {Point} anchor
//      * @param {number} t Must be from interval <0; 1>
//      * @return {Point}
//      */
//     linear(anchor, t) {
//         return point(
//             anchor.x + this.x * t,
//             anchor.y + this.y * t,
//         );
//     }

//     /**
//      * @return {Vec}
//      */
//     normalize() {
//         const len = this.length();
//         this.x /= len;
//         this.y /= len;
//         return this;
//     }

//     /**
//      * @return {number}
//      */
//     length() {
//         return Math.sqrt(this.x * this.x + this.y * this.y);
//     }

//     /**
//      * @param {number} factor
//      * @return {Vec}
//      */
//     multiply(factor) {
//         this.x *= factor;
//         this.y *= factor;
//         return this;
//     }

//     /**
//      * @param {Point} anchor
//      * @return {Point}
//      */
//     end(anchor) {
//         return point(
//             anchor.x + this.x,
//             anchor.y + this.y
//         );
//     }
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} start
//  * @param {number} end
//  */
// function average(array, start = 0, end = Number.POSITIVE_INFINITY) {
//     if (end === Number.POSITIVE_INFINITY) {
//         end = array.length;
//     }

//     const count = end - start;
//     if (count === 0) {
//         return 0;
//     }

//     let sum = 0;
//     for (let i = 0; i < count && i < array.length; i++) {
//         sum += array[i + start];
//     }

//     return sum / count;
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @return {number}
//  */
// function standardDeviation(array) {
//     const avg = average(array);
//     let sum = 0;

//     for (let i = 0; i < array.length; i++) {
//         sum += Math.pow(array[i] - avg, 2);
//     }

//     return Math.sqrt(sum / array.length);
// }

// /**
//  * @param {Point} a
//  * @param {Point} b
//  * @param {number} t
//  * @return {Point}
//  */
// function lerp(a, b, t) {
//     return point(
//         a.x + (b.x - a.x) * t,
//         a.y + (b.y - a.y) * t,
//     );
// }

// /**
//  * @param {Point} a
//  * @param {Vec} v1
//  * @param {Point} b
//  * @param {Vec} v2
//  * @param {number} t Must be from interval <0; 1>
//  * @return {Point}
//  */
// function bezier(a, v1, b, v2, t) {
//     const p0 = v1.linear(a, t);
//     const p1 = v2.linear(b, t);
//     return Vec.from(p0, p1).linear(p0, t);
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} start
//  * @param {number} end
//  * @param {Float64Array} out
//  */
// function renderIntervalCurved(array, start, end, out) {
//     if (start === end) {
//         return;
//     }

//     const count = end - start;
//     const last = array[end] ?? array[end - 1];
//     const center = 2; // todo 0 = no smooth; 2 = max smoothness; 2+ = less smooth

//     const p0 = point(start, array[start] ?? 0);
//     const p1 = point(start + center, array[start] ?? 0);
//     const p2 = point(end - center, last);
//     const p3 = point(end, last);

//     const resolution = count * 2;

//     let lastCurvePoint = p0;

//     start = Math.max(0, start);
//     out[start] = p0.y;

//     for (let i = 1, k = start + 1; i <= resolution && k < end; i++) {
//         const t = i / resolution;

//         const a = lerp(p0, p1, t);
//         const b = lerp(p1, p2, t);
//         const c = lerp(p2, p3, t);

//         const d = lerp(a, b, t);
//         const e = lerp(b, c, t);

//         const curvePoint = lerp(d, e, t);

//         while (lastCurvePoint.x <= k && k <= curvePoint.x) {
//             const u = (k - lastCurvePoint.x) / (curvePoint.x / lastCurvePoint.x);
//             out[k++] = Math.max(0, lerp(lastCurvePoint, curvePoint, u).y);
//         }

//         lastCurvePoint = curvePoint;
//     }
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} start
//  * @param {number} end
//  * @param {Float64Array} out
//  */
// function renderIntervalLinear(array, start, end, out) {
//     if (start === end) {
//         return;
//     }

//     const anchor = point(start, array[start]);
//     const vec = Vec.from(anchor, point(end - 1, array[end - 1]));
//     const count = end - start;

//     for (let k = 0; k < count; k++) {
//         out[start + k] = vec.linear(anchor, k / count).y;
//     }
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} standardDeviationFactor When standard deviation is computed this factor is used to change filter
//  * window
//  * @return {Float64Array}
//  */
// export function standardDeviationFilter(array, standardDeviationFactor) {
//     const std = standardDeviation(array) * standardDeviationFactor;
//     const ret = new Float64Array(array.length);
//     let i = 0;

//     for (; i < (array.length - 1); i++) {
//         if (array[i + 1] === array[i] || Math.abs(array[i + 1] - array[i]) > std) {
//             ret[i] = array[i];
//             continue;
//         }

//         // check the next item in series and determine whether the series is decreasing/increasing by setting min/max
//         let end = i + 1;
//         let min = array[end] < array[i]
//             ? end
//             : undefined;
//         let max = array[end] > array[i]
//             ? end
//             : undefined;

//         for (; end < array.length; end++) {
//             if (array[min ?? max] > array[end]) {
//                 min = end;
//             }

//             if (array[max ?? min] < array[end]) {
//                 max = end;
//             }

//             // check for (generally) smaller margin
//             if ((array[min] + std) < (array[max] - std)) {
//                 break;
//             }

//             // check for big leaps
//             if (Math.abs(array[end] - array[i]) > std) {
//                 break;
//             }
//         }

//         // if min/max are undefined it means that series is strictly monotonous on given interval
//         // thus the min/max must be the starting edge of given interval
//         min ??= i;
//         max ??= i;

//         const closer = Math.min(min, max);
//         const further = Math.max(min, max);

//         // join intervals:
//         //      I0 = <i; closer)
//         //      I1 = <closer; further)
//         //      I2 = <further; end)

//         renderIntervalCurved(array, i, closer, ret);
//         renderIntervalCurved(array, closer, further, ret);
//         renderIntervalCurved(array, further, end, ret);

//         i = end - 1;
//     }

//     if (i !== array.length) {
//         ret[array.length - 1] = array[array.length - 1];
//     }

//     return ret;
// }

// function max(array) {
//     let m = Number.NEGATIVE_INFINITY;

//     for (let i = 0; i < array.length; i++) {
//         if (m < array[i]) {
//             m = array[i];
//         }
//     }

//     return m;
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @return {{ derivatives: Float64Array, average: number }}
//  */
// function flatDerivative(array) {
//     if (array.length === 0) {
//         return {
//             derivatives: new Float64Array(0),
//             average: 0
//         }
//     }

//     const derivatives = new Float64Array(array.length);
//     let last = 0;
//     let sum = array[0];
//     let count = 1;

//     for (let i = 0; i < array.length - 1; i++) {
//         const d = (array[i + 1] - array[i]);

//         if (Math.sign(last) === Math.sign(d) && d !== 0) {
//             last += d;

//             if (i >= 1) {
//                 derivatives[i - 1] = NaN;
//             }
//             continue;
//         }

//         derivatives[i - 1] = last;
//         sum += Math.abs(last);
//         count++;
//         last = d;
//     }

//     const d = (0 - array[array.length - 1]);

//     if (Math.sign(last) === Math.sign(d)) {
//         derivatives[derivatives.length - 1] = last + d;
//         sum += Math.abs(last + d);
//     } else {
//         derivatives[derivatives.length - 2] = last;
//         sum += Math.abs(last);
//         derivatives[derivatives.length - 1] = d;
//         sum += Math.abs(d);
//     }

//     count++;

//     return {
//         derivatives,
//         average: sum / count
//     };
// }

// /**
//  * @param {Float64Array} flat
//  * @param {number} current
//  * @return {number}
//  */
// function nextDerivative(flat, current) {
//     for (let i = current + 1; i < flat.length; i++) {
//         if (!isNaN(flat[i])) {
//             return i;
//         }
//     }

//     return Number.NEGATIVE_INFINITY;
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} derivativeFactor
//  * @param {number} maxSegmentSize
//  * @return {Float64Array}
//  */
// export function derivativeSmoothingFilter(array, derivativeFactor, maxSegmentSize) {
//     const ret = new Float64Array(array.length);
//     const { derivatives, average } = flatDerivative(array);

//     const factoredAverage = average * derivativeFactor;
//     let left = nextDerivative(derivatives, -1);
//     if (left !== 0) {
//         renderIntervalCurved(array, 0, left + 1, ret);
//     }

//     left : while (left >= 0) {
//         let right = nextDerivative(derivatives, left);

//         while (right >= 0) {
//             if (derivatives[left] === 0) {
//                 ret[left] = array[left];
//                 left = right;
//                 continue left;
//             }

//             const d = Math.abs(derivatives[right]);
//             if (d < factoredAverage && right - left < maxSegmentSize) {
//                 right = nextDerivative(derivatives, right);
//                 continue;
//             }

//             renderIntervalCurved(array, left + 1, right + 1, ret);
//             left = right;
//             continue left;
//         }

//         // render last segment
//         renderIntervalCurved(array, left, array.length - 1, ret);
//         break;
//     }

//     return ret;
// }

// /**
//  * @typedef {{ derivative: number, length: number }} FunctionInterval
//  *
//  * @template T
//  * @typedef {{ pointer: ArrayLike<T>, length: number }} FatPointer
//  */

// // todo change FunctionInterval[] to statically sized arrays with custom length (^ FatPointer<FunctionInterval>)

// /**
//  * All derivations are modification of formula:
//  *     d(i) = (a[i + 1] - a[i]) / 2
//  * Modified formula:
//  *     md(i) = d(i) * 2 = ((a[i + 1] - a[i]) / 2) * 2 = a[i + 1] - a[i]
//  * When talking about taking derivative at point. The function modified derivation function is used (md). It is used
//  * because it yielded better out-of-the-box results
//  *
//  * @param {ArrayLike<number>} array
//  * @return {{ derivatives: FunctionInterval[], average: number }}
//  */
// function differentiate(array) {
//     if (array.length === 0) {
//         return {
//             derivatives: [],
//             average: 0
//         };
//     }

//     /** @type {FunctionInterval[]} */
//     const derivatives = [];
//     const percent = max(array) / 100;

//     // Starting at a[0] to precalculate derivation: a[0] - a[-1] = a[0] - 0 = a[0]
//     let last = array[0];
//     let start = -1;

//     // Average calculation could be done after the derivatives of intervals... but we can just keep track of derivations
//     // during generation :)
//     let sum = 0;

//     for (let i = 0; i < array.length - 1; i++) {
//         // round(x / 1%) * 1% removes tiny changes that should be interpreted as constant monotonicity
//         const d = Math.round((array[i + 1] - array[i]) / percent) * percent;

//         // Same monotonicity => merge with last
//         if (Math.sign(last) === Math.sign(d)) {
//             last += d;
//             continue;
//         }

//         // Different monotonicity. Add last interval
//         derivatives.push({
//             derivative: last,
//             length: i - start
//         });

//         sum += Math.abs(last);

//         // and create a new interval
//         last = d;
//         start = i;
//     }

//     // Repeat loops body for last element in array. Last connection will be with x-axis (zero)
//     const d = Math.round((0 - array[array.length - 1]) / percent) * percent;

//     if (Math.sign(last) === Math.sign(d)) {
//         // Merge with last interval and add it
//         derivatives.push({
//             derivative: last + d,
//             length: array.length - start
//         });

//         sum += Math.abs(last);
//     } else {
//         // Intervals don't match in monotonicity. Add `last` interval and `d` interval
//         derivatives.push({
//             derivative: last,
//             length: array.length - 1 - start
//         });

//         sum += Math.abs(last);

//         derivatives.push({
//             derivative: d,
//             length: 1
//         });

//         sum += Math.abs(d);
//     }

//     return {
//         derivatives,
//         average: sum / derivatives.length
//     };
// }

// /**
//  * Let A be an array of intervals.
//  * Let i be an index into A.
//  * Let (Interval, Interval) -> (Interval); (x, y) -> (x + y) be merge function.
//  *
//  * Then merge(A(i), A(i + 1)) that satisfy conditions:
//  *
//  * - derivative(A(i + 1)) < λ
//  * - |A(i)| + |A(i + 1)| <= maxIntervalLength
//  *
//  * @param {FunctionInterval[]} intervals
//  * @param {number} lambda λ
//  * @param {number} maxIntervalLength
//  * @return {FunctionInterval[]}
//  */
// function mergeIntervals(intervals, lambda, maxIntervalLength) {
//     if (intervals.length === 0) {
//         return [];
//     }

//     /** @type {FunctionInterval[]} */
//     const ret = [intervals[0]];

//     for (let i = 1; i < intervals.length; i++) {
//         const outsideOfLambdaBounds = Math.abs(intervals[i].derivative) > lambda;

//         const last = ret[ret.length - 1];
//         const maxIntervalLengthOverflow = last.length + intervals[i].length > maxIntervalLength;

//         if (outsideOfLambdaBounds || maxIntervalLengthOverflow) {
//             ret.push(intervals[i]);
//             continue;
//         }

//         // Merge with last in array
//         last.length += intervals[i].length;
//         last.derivative += intervals[i].derivative;
//     }

//     return ret;
// }

// /**
//  * Definition: Start -> point at x = <code>arrayIndex</code> and y = <code>array[arrayIndex]</code>
//  *
//  * Definition: Point -> point at x = i and y = <code>array[i]</code>; i > <code>arrayIndex</code>
//  *
//  * Propagate tries to extend to next point that satisfies these requirements:
//  *
//  *     - Point is inside a circle around Start with given radius
//  *     - sign(derivative(Start, Point)) = monotonicity
//  *
//  * If these requirements are met, the function will return Point
//  *
//  * @param {Point} start
//  * @param {ArrayLike<number>} array
//  * @param {number} arrayIndex
//  * @param {FunctionInterval[]} intervals
//  * @param {number} intervalIndex
//  * @param {number} radius
//  * @param {-1 | 0 | 1} monotonicity
//  * @param {number} maximum
//  * @return {{ interval: number, point: number }}
//  */
// function propagate(start, array, arrayIndex, intervals, intervalIndex, radius, monotonicity, maximum) {
//     const r2 = radius * radius;
//     let end = arrayIndex + intervals[intervalIndex].length;

//     for (let i = intervalIndex + 1; i < intervals.length; i++) {
//         if ((end - start.x) > radius) {
//             break;
//         }

//         const dx = end - start.x;
//         const dy = array[end] - start.y;

//         // Peak preserving. If there is increasing greater than 10% of height of maximum. Propagate to that point
//         if (dy > maximum * 0.1) {
//             console.log(array[end] - start.y);
//             return {
//                 point: end,
//                 interval: i
//             };
//         }

//         const currentDistance2 = dx * dx + dy * dy;

//         const inRadius = currentDistance2 <= r2;
//         const sameMonotonicity = monotonicity === Math.sign(dy);

//         if (inRadius && sameMonotonicity) {
//             return {
//                 point: end,
//                 interval: i
//             };
//         }

//         end += intervals[i].length;
//     }

//     return {
//         point: start.x,
//         interval: intervalIndex
//     };
// }

// /**
//  * @param {ArrayLike<number>} array
//  * @param {number} differentialFactor Should be non-negative integer
//  * @param {number} maxIntervalLength
//  * @return {Float64Array}
//  */
// export function differentialPropagationFilter(array, differentialFactor, maxIntervalLength) {
//     if (differentialFactor <= 0) {
//         // No smoothing => return raw data
//         return new Float64Array(array);
//     }

//     const ret = new Float64Array(array.length);

//     const maximum = max(array);
//     const { derivatives, average } = differentiate(array);
//     const factoredAverage = average * differentialFactor;

//     const intervals = mergeIntervals(derivatives, factoredAverage, factoredAverage);

//     // Start and end are index into the raw data array. Sum of intervals lengths is exactly array's length + 2, because
//     // zeros are added to start and end of the raw array
//     let start = -1;
//     let end = intervals[0].length - 1;
//     let monotonicity = Math.sign(intervals[0].derivative);

//     let iteration = 0;
//     for (let i = 0; i < intervals.length - 1;) {
//         const s = point(start, array[start] ?? 0);
//         const propagation = propagate(s, array, end, intervals, i, factoredAverage, monotonicity, maximum);

//         if (iteration++ > intervals.length * 2) {
//             // If there is an edge case for propagation and the for loop turns into while(true)...
//             console.log(propagation);
//             throw new Error("Maximum iteration limit reached");
//         }

//         const noPropagationPoint = propagation.point === s.x;
//         const maxIntervalLengthOverflow = propagation.point - start > maxIntervalLength;

//         if (noPropagationPoint || maxIntervalLengthOverflow) {
//             renderIntervalCurved(array, start, end, ret);
//             start = end;
//             end += intervals[i + 1].length;
//             monotonicity = Math.sign(intervals[i + 1].derivative);
//             i++;
//             continue;
//         }

//         end = propagation.point;
//         i = propagation.interval;
//     }

//     renderIntervalCurved(array, start, end, ret);
//     return ret;
// }

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

export function createChartConfig(backgroundColor) {
    return {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    borderColor: 'rgba(0, 0, 0, 0)',
                    backgroundColor,
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