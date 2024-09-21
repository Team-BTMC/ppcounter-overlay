/**
 * Find the maximum or array slice. Start is inclusive but end is exclusive
 *
 * @param array
 * @param start
 * @param end
 * @return {number}
 */
export function max(array, start = 0, end = -1) {
    if (end === -1) {
        end = array.length;
    }

    let maximum = Number.NEGATIVE_INFINITY;

    for (let i = start; i < array.length && i < end; i++) {
        if (maximum < array[i]) {
            maximum = array[i];
        }
    }

    return maximum;
}

/**
 * Calculate sum of array slice. Start is inclusive but end is exclusive
 *
 * @param {ArrayLike<number>} array
 * @param {number} start
 * @param {number} end
 * @return {number}
 */
function sum(array, start = 0, end = - 1) {
    if (end === -1) {
        end = array.length;
    }

    let s = 0;

    for (let i = start; i < array.length && i < end; i++) {
        s += array[i];
    }

    return s;
}

/**
 * Calculate mean of array slice. Start is inclusive but end is exclusive
 *
 * @param {ArrayLike<number>} array
 * @param {number} start
 * @param {number} end
 * @return {number}
 */
function mean(array, start = 0, end = -1) {
    return sum(array, start, end) / end;
}

/**
 * @param {ArrayLike<number>} array
 * @param {number} windowWidth
 * @param {boolean} doSmoothEnds
 * @return {Float64Array}
 */
function smooth(array, windowWidth, doSmoothEnds) {
    const width = Math.round(windowWidth);
    if (width <= 1) {
        return new Float64Array(array);
    }

    const half = Math.round(width / 2);
    const ret = new Float64Array(array.length);

    let sumPoints = sum(array, 0, width);
    let i = 0;

    for (; i < array.length - width + 1; i++) {
        ret[i + half - 1] = Math.max(0, sumPoints);
        sumPoints -= array[i];
        sumPoints += array[i + width];
    }

    ret[i + half] = Math.max(0, sum(array, array.length - width + 1, array.length));

    for (let j = 0; j < ret.length; j++) {
        ret[j] /= width;
    }

    if (!doSmoothEnds) {
        return ret;
    }

    const start = (windowWidth + 1) / 2;
    ret[0] = (array[0] + array[1]) / 2;

    for (let j = 1; j < start; j++) {
        ret[j] = Math.max(0, mean(array, 0, 2 * j - 1));
        ret[array.length - j] = Math.max(0, mean(array, array.length - 2 * j + 2, array.length));
    }

    ret[ret.length - 1] = Math.max(0, (array[array.length - 1] + array[array.length - 2]) / 2);

    return ret;
}

export const FAST_SMOOTH_TYPE_NO_SMOOTHING = 0;
export const FAST_SMOOTH_TYPE_RECTANGULAR = 1;
export const FAST_SMOOTH_TYPE_TRIANGULAR = 2;
export const FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_3 = 3;
export const FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_4 = 4;
export const FAST_SMOOTH_TYPE_MULTIPLE_WIDTH = 5;

/**
 * Smooths array with smooth of width windowWidth.
 * The argument "type" determines the smooth type:
 * - If type = FAST_SMOOTH_TYPE_RECTANGULAR = 0, rectangular (sliding-average or boxcar)
 * - If type = FAST_SMOOTH_TYPE_TRIANGULAR = 1, triangular (2 passes of sliding-average)
 * - If type = FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_3 = 2, pseudo-Gaussian (3 passes of sliding-average)
 * - If type = FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_4 = 3, pseudo-Gaussian (4 passes of same sliding-average)
 * - If type = FAST_SMOOTH_TYPE_MULTIPLE_WIDTH = 4, multiple-width (4 passes of different sliding-average)
 * The argument "doSmoothEnds" controls how the "ends" of the signal (the first w/2 points and the last w/2 points) are
 * handled.
 * - If ends=0, the ends are zero. (In this mode the elapsed time is independent of the smooth width). The fastest.
 * - If ends=1, the ends are smoothed with progressively smaller smooths the closer to the end. (In this mode the
 * elapsed time increases with increasing smooth widths).
 *
 * Version 3.0, October 2016.
 *
 * Copyright (c) 2024, Jan Horák
 *
 * Copyright (c) 2012, Thomas C. O'Haver
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @param array
 * @param windowWidth
 * @param type
 * @param doSmoothEnds
 * @return {Float64Array}
 * @see https://www.mathworks.com/matlabcentral/fileexchange/19998-fast-smoothing-function
 */
export function fastSmooth(array, windowWidth, type = FAST_SMOOTH_TYPE_RECTANGULAR, doSmoothEnds = false) {
    const a = array;
    const w = windowWidth;
    const e = doSmoothEnds;

    switch (type) {
        case FAST_SMOOTH_TYPE_NO_SMOOTHING:
            return new Float64Array(array);

        default:
        case FAST_SMOOTH_TYPE_RECTANGULAR:
            return smooth(a, w, e);

        case FAST_SMOOTH_TYPE_TRIANGULAR:
            return smooth(
                smooth(
                    a, w, e
                ), w, e
            );

        case FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_3:
            return smooth(
                smooth(
                    smooth(
                        a, w, e
                    ), w, e
                ), w, e
            );

        case FAST_SMOOTH_TYPE_PSEUDO_GAUSSIAN_4:
            return smooth(
                smooth(
                    smooth(
                        smooth(
                            a, w, e
                        ),
                        w, e
                    ), w, e
                ), w, e
            );

        case FAST_SMOOTH_TYPE_MULTIPLE_WIDTH:
            return smooth(
                smooth(
                    smooth(
                        smooth(
                            a, Math.round(1.6 * w), e
                        ),
                        Math.round(1.4 * w), e
                    ),
                    Math.round(1.2 * w), e
                ), w, e
            );
    }
}
