export interface ChartData {
  title: string
  data: any[]
  layout: any
}

export interface CategorizedCharts {
  trends: ChartData[]
  comparisons: ChartData[]
  correlations: ChartData[]
  distributions: ChartData[]
  others: ChartData[]
}

/**
 * Classifies charts based on plotly chart type
 */
export function classifyCharts(charts: ChartData[]): CategorizedCharts {

  const categorized: CategorizedCharts = {
    trends: [],
    comparisons: [],
    correlations: [],
    distributions: [],
    others: []
  }

  charts.forEach((chart) => {

    if (!chart.data || chart.data.length === 0) {
      categorized.others.push(chart)
      return
    }

    const chartType = chart.data[0].type

    switch (chartType) {

      case "scatter":

        if (chart.data[0].mode === "lines" || chart.data[0].mode === "lines+markers") {
          categorized.trends.push(chart)
        } else {
          categorized.correlations.push(chart)
        }

        break

      case "bar":

        categorized.comparisons.push(chart)
        break

      case "histogram":

        categorized.distributions.push(chart)
        break

      case "box":

        categorized.distributions.push(chart)
        break

      case "violin":

        categorized.distributions.push(chart)
        break

      case "heatmap":

        categorized.correlations.push(chart)
        break

      default:

        categorized.others.push(chart)

    }

  })

  return categorized
}