/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * @param {number} x
 * @param {number} y
 * @param {Point | undefined} out
 * @return {Point}
 */
function point(x, y, out = undefined) {
    if (out !== undefined) {
        out.x = x;
        out.y = y;
        return out;
    }

    return { x, y };
}

class Vec {
    /**
     * @param {Point} a
     * @param {Point} b
     * @return {Vec}
     */
    static from(a, b) {
        return new Vec(
            b.x - a.x,
            b.y - a.y
        );
    }

    /** @type {number} */
    x;
    /** @type {number} */
    y;

    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {Point} anchor
     * @param {number} t Must be from interval <0; 1>
     * @return {Point}
     */
    linear(anchor, t) {
        return point(
            anchor.x + this.x * t,
            anchor.y + this.y * t,
        );
    }

    /**
     * @return {Vec}
     */
    normalize() {
        const len = this.length();
        this.x /= len;
        this.y /= len;
        return this;
    }

    /**
     * @return {number}
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * @param {number} factor
     * @return {Vec}
     */
    multiply(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    /**
     * @param {Point} anchor
     * @return {Point}
     */
    end(anchor) {
        return point(
            anchor.x + this.x,
            anchor.y + this.y
        );
    }
}

/**
 * @param {ArrayLike<number>} array
 * @param {number} start
 * @param {number} end
 */
function average(array, start = 0, end = Number.POSITIVE_INFINITY) {
    if (end === Number.POSITIVE_INFINITY) {
        end = array.length;
    }

    const count = end - start;
    if (count === 0) {
        return 0;
    }

    let sum = 0;
    for (let i = 0; i < count && i < array.length; i++) {
        sum += array[i + start];
    }

    return sum / count;
}

/**
 * @param {ArrayLike<number>} array
 * @return {number}
 */
function standardDeviation(array) {
    const avg = average(array);
    let sum = 0;

    for (let i = 0; i < array.length; i++) {
        sum += Math.pow(array[i] - avg, 2);
    }

    return Math.sqrt(sum / array.length);
}


/**
 * @param {Point} a
 * @param {Vec} v1
 * @param {Point} b
 * @param {Vec} v2
 * @param {number} t Must be from interval <0; 1>
 * @return {Point}
 */
function bezier(a, v1, b, v2, t) {
    const p0 = v1.linear(a, t);
    const p1 = v2.linear(b, t);
    return Vec.from(p0, p1).linear(p0, t);
}

/**
 * @param {ArrayLike<number>} array
 * @param {number} start
 * @param {number} end
 * @param {Float64Array} out
 */
function renderIntervalCurved(array, start, end, out) {
    if (start === end) {
        return;
    }

    const count = end - start;
    const countLog2 = Math.log2(count);
    const last = array[end] ?? array[end - 1];

    // create starting point
    const a = point(start, array[start]);
    // create vector from element before start (or start offset by midpoint) to start
    const midPoint = (last - array[start]) / count;
    const v0 = Vec.from(point(start - 1, array[start - 1] ?? array[start] - midPoint), a)
        .multiply(countLog2);
    // create end point
    const b = point(end, last);
    // create vector from end to element after end (or end offset by midpoint)
    const v1 = Vec.from(b, point(end, array[end] ?? last - midPoint))
        .multiply(countLog2);

    for (let k = 0; k < count; k++) {
        out[start + k] = Math.max(0, bezier(a, v0, b, v1, k / count).y);
    }
}

/**
 * @param {ArrayLike<number>} array
 * @param {number} start
 * @param {number} end
 * @param {Float64Array} out
 */
function renderIntervalLinear(array, start, end, out) {
    if (start === end) {
        return;
    }

    const anchor = point(start, array[start]);
    const vec = Vec.from(anchor, point(end - 1, array[end - 1]));
    const count = end - start;

    for (let k = 0; k < count; k++) {
        out[start + k] = vec.linear(anchor, k / count).y;
    }
}

/**
 * @param {ArrayLike<number>} array
 * @param {number} standardDeviationFactor When standard deviation is computed this factor is used to change filter
 * window
 * @return {Float64Array}
 */
export function standardDeviationFilter(array, standardDeviationFactor) {
    const std = standardDeviation(array) * standardDeviationFactor;
    const ret = new Float64Array(array.length);
    let i = 0;

    for (; i < (array.length - 1); i++) {
        if (array[i + 1] === array[i] || Math.abs(array[i + 1] - array[i]) > std) {
            ret[i] = array[i];
            continue;
        }

        // check the next item in series and determine whether the series is decreasing/increasing by setting min/max
        let end = i + 1;
        let min = array[end] < array[i]
            ? end
            : undefined;
        let max = array[end] > array[i]
            ? end
            : undefined;

        for (; end < array.length; end++) {
            if (array[min ?? max] > array[end]) {
                min = end;
            }

            if (array[max ?? min] < array[end]) {
                max = end;
            }

            // check for (generally) smaller margin
            if ((array[min] + std) < (array[max] - std)) {
                break;
            }

            // check for big leaps
            if (Math.abs(array[end] - array[i]) > std) {
                break;
            }
        }

        // if min/max are undefined it means that series is strictly monotonous on given interval
        // thus the min/max must be the starting edge of given interval
        min ??= i;
        max ??= i;

        const closer = Math.min(min, max);
        const further = Math.max(min, max);

        // join intervals:
        //      I0 = <i; closer)
        //      I1 = <closer; further)
        //      I2 = <further; end)

        renderIntervalCurved(array, i, closer, ret);
        renderIntervalCurved(array, closer, further, ret);
        renderIntervalCurved(array, further, end, ret);

        i = end - 1;
    }

    if (i !== array.length) {
        ret[array.length - 1] = array[array.length - 1];
    }

    return ret;
}

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