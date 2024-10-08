export class Color {
    static TRANSPARENT = new Color(0, 0, 0, 0);

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



    #red;
    #green;
    #blue;
    #alpha;

    constructor(red, green, blue, alpha = 1) {
        this.#red = red;
        this.#green = green;
        this.#blue = blue;
        this.#alpha = alpha;
    }



    setAlpha(alpha) {
        this.#alpha = alpha;
        return this;
    }

    getAlpha() {
        return this.#alpha;
    }

    clone() {
        return new Color(
            this.#red,
            this.#green,
            this.#blue,
            this.#alpha
        );
    }

    toString() {
        return `rgba(${this.#red}, ${this.#green}, ${this.#blue}, ${this.#alpha})`;
    }
}



export default class GraphFill {
    #gradient;
    #width;
    #height;
    /** @type {Color} */
    #fill;
    /** @type {Color} */
    #border;
    #colorUsed;



    /**
     * @param {Color} fill
     * @param border
     */
    constructor(fill, border = undefined) {
        this.#fill = fill;
        this.#border = border ?? fill.clone().setAlpha(1);
    }



    /**
     * @param {Color} color
     */
    setFill(color) {
        this.#fill = color;
        return this;
    }

    /**
     * @param {Color} color
     */
    setBorder(color) {
        this.#border = color;
        return this;
    }

    create(context, chartArea) {
        const chartWidth = chartArea.right - chartArea.left;
        const chartHeight = chartArea.bottom - chartArea.top;

        if (this.#gradient === undefined
            || this.#width !== chartWidth
            || this.#height !== chartHeight
            || this.#colorUsed !== this.#fill.toString()) {
            // Create the gradient because this is either the first render or the size of the chart has changed

            this.#width = chartWidth;
            this.#height = chartHeight;
            this.#gradient = context.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);

            this.#gradient.addColorStop(0, this.#fill.clone().setAlpha(0.1).toString());
            this.#gradient.addColorStop(0.4, this.#fill.toString());
        }

        return this.#gradient;
    }

    border() {
        return () => this.#border.toString();
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