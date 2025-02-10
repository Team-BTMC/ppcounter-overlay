export class Color {

    static fromHex(literal) {
        let c;

        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(literal)) {
            c = literal.substring(1).split('');

            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }

            c = '0x' + c.join('');
            return new Color((c >> 16) & 255, (c >> 8) & 255, c & 255);
        }

        throw new Error('Bad Hex');
    }




    constructor(red, green, blue, alpha = 1) {
        this._red = red;
        this._green = green;
        this._blue = blue;
        this._alpha = alpha;
    }



    setAlpha(alpha) {
        this._alpha = alpha;
        return this;
    }

    getAlpha() {
        return this._alpha;
    }

    clone() {
        return new Color(
            this._red,
            this._green,
            this._blue,
            this._alpha
        );
    }

    toString() {
        return `rgba(${this._red}, ${this._green}, ${this._blue}, ${this._alpha})`;
    }
}

Color.TRANSPARENT = new Color(0, 0, 0, 0);

export default class GraphFill {



    /**
     * @param {Color} fill
     * @param border
     */
    constructor(fill, border = undefined) {
        this._fill = fill;
        this._border = border !== undefined ? border : fill.clone().setAlpha(1);
        this._gradient = undefined;
        this._width = undefined;
        this._height = undefined;
        this._colorUsed = undefined;
    }



    /**
     * @param {Color} color
     */
    setFill(color) {
        this._fill = color;
        return this;
    }

    /**
     * @param {Color} color
     */
    setBorder(color) {
        this._border = color;
        return this;
    }

    create(context, chartArea) {
        const chartWidth = chartArea.right - chartArea.left;
        const chartHeight = chartArea.bottom - chartArea.top;

        if (this._gradient === undefined
            || this._width !== chartWidth
            || this._height !== chartHeight
            || this._colorUsed !== this._fill.toString()) {
            // Create the gradient because this is either the first render or the size of the chart has changed

            this._width = chartWidth;
            this._height = chartHeight;
            this._gradient = context.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

            this._gradient.addColorStop(0, this._fill.clone().setAlpha(0.1).toString());
            this._gradient.addColorStop(0.4, this._fill.toString());
        }

        return this._gradient;
    }

    border() {
        return () => this._border.toString();
    }

    /**
     * Creates a function for Chart config. This function can be assigned to borderColor or backgroundColor property
     * @returns {function(*): CanvasGradient}
     */
    background() {
        return (context) => {
            const chart = context.chart;
            if (!chart.chartArea) {
                // This case happens on initial chart load
                return;
            }

            return this.create(chart.ctx, chart.chartArea);
        };
    }
}