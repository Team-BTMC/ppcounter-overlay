export function smooth(arr, windowSize, getter = value => value, setter) {
    const get = getter
    const result = []
  
    for (let i = 0; i < arr.length; i += 1) {
        const leftOffset = i - windowSize
        const from = leftOffset >= 0 ? leftOffset : 0
        const to = i + windowSize + 1

        let count = 0
        let sum = 0
        for (let j = from; j < to && j < arr.length; j += 1) {
            sum += get(arr[j])
            count += 1
        }

        result[i] = setter ? setter(arr[i], sum / count) : sum / count
    }
  
    return result
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