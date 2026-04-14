import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { BarChart3, TrendingUp, ScatterChart, PieChart, Filter, Eye, EyeOff, Info } from "lucide-react";
import Plot from "react-plotly.js";

interface ChartData {
  title: string;
  data: any[];
  layout: any;
}

interface CategorizedCharts {
  trends: ChartData[];
  comparisons: ChartData[];
  correlations: ChartData[];
  distributions: ChartData[];
  others: ChartData[];
}

interface DashboardLayoutProps {
  categorizedCharts: CategorizedCharts;
}

const chartIcons = {
  trends: TrendingUp,
  comparisons: BarChart3,
  correlations: ScatterChart,
  distributions: PieChart,
  others: BarChart3,
};

const chartColors = {
  primary: "#2563eb",
  secondary: "#10b981",
  accent: "#f59e0b",
  neutral: "#6b7280",
  background: "#f8fafc",
};

export function DashboardLayout({ categorizedCharts }: DashboardLayoutProps) {
  // Initialize with all charts visible
  const getAllChartIds = () => {
    const allIds: string[] = [];
    Object.entries(categorizedCharts).forEach(([category, charts]) => {
      charts.forEach((_: ChartData, index: number) => {
        allIds.push(`${category}-${index}`);
      });
    });
    return new Set(allIds);
  };

  const [activeTab, setActiveTab] = useState("overview");
  const [visibleCharts, setVisibleCharts] = useState<Set<string>>(getAllChartIds());
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  // Calculate key metrics from charts
  const getKeyMetrics = () => {
    const metrics = [];

    // Extract metrics from trend charts (most important)
    if (categorizedCharts.trends.length > 0) {
      const trendChart = categorizedCharts.trends[0];
      metrics.push({
        title: "Trend Analysis",
        value: trendChart.title,
        type: "trend",
        icon: TrendingUp,
      });
    }

    // Extract metrics from comparison charts
    if (categorizedCharts.comparisons.length > 0) {
      const comparisonChart = categorizedCharts.comparisons[0];
      metrics.push({
        title: "Top Performer",
        value: comparisonChart.title,
        type: "comparison",
        icon: BarChart3,
      });
    }

    // Extract metrics from distribution charts
    if (categorizedCharts.distributions.length > 0) {
      const distributionChart = categorizedCharts.distributions[0];
      metrics.push({
        title: "Data Distribution",
        value: distributionChart.title,
        type: "distribution",
        icon: PieChart,
      });
    }

    return metrics;
  };

  const keyMetrics = getKeyMetrics();

  const toggleChartVisibility = (chartId: string) => {
    const newVisible = new Set(visibleCharts);
    if (newVisible.has(chartId)) {
      newVisible.delete(chartId);
    } else {
      newVisible.add(chartId);
    }
    setVisibleCharts(newVisible);
  };

  const renderChart = (chart: ChartData, index: number, category: string) => {
    const chartId = `${category}-${index}`;
    const isVisible = visibleCharts.has(chartId);

    return (
      <Card key={chartId} className="h-full hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800 flex-1 truncate">
              {chart.title}
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleChartVisibility(chartId)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isVisible ? 'Hide this chart' : 'Show this chart'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="secondary" className="w-fit">
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {isVisible ? (
            <div className="h-80 w-full">
              <Plot
                data={chart.data}
                layout={{
                  ...chart.layout,
                  margin: { t: 20, r: 20, b: 40, l: 60 },
                  font: { family: "Inter, sans-serif", size: 12 },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  xaxis: {
                    ...chart.layout?.xaxis,
                    gridcolor: "#e5e7eb",
                    linecolor: "#d1d5db",
                  },
                  yaxis: {
                    ...chart.layout?.yaxis,
                    gridcolor: "#e5e7eb",
                    linecolor: "#d1d5db",
                  },
                  colorway: [chartColors.primary, chartColors.secondary, chartColors.accent],
                }}
                style={{ width: "100%", height: "100%" }}
                config={{
                  displayModeBar: false,
                  responsive: true,
                }}
              />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="text-center">
                <EyeOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm mb-2">Chart hidden</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleChartVisibility(chartId)}
                  className="hover:bg-blue-50 hover:border-blue-200"
                >
                  Show Chart
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderChartGrid = (charts: ChartData[], category: string) => {
    if (charts.length === 0) return null;

    const IconComponent = chartIcons[category as keyof typeof chartIcons];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-800 capitalize">
            {category}
          </h3>
          <Badge variant="outline">{charts.length}</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart, index) => renderChart(chart, index, category))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {keyMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This represents the most significant {metric.type} in your dataset</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 leading-tight">
                        {metric.value}
                      </p>
                    </div>
                    <IconComponent className="h-8 w-8 text-blue-500 ml-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="trends">Trends Only</SelectItem>
                  <SelectItem value="comparisons">Comparisons Only</SelectItem>
                  <SelectItem value="correlations">Correlations Only</SelectItem>
                  <SelectItem value="distributions">Distributions Only</SelectItem>
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCharts(new Set())}
                  >
                    Hide All Charts
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hide all charts to reduce clutter and focus on specific insights</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allChartIds: string[] = [];
                      Object.entries(categorizedCharts).forEach(([category, charts]) => {
                        charts.forEach((_: ChartData, index: number) => {
                          allChartIds.push(`${category}-${index}`);
                        });
                      });
                      setVisibleCharts(new Set(allChartIds));
                    }}
                  >
                    Show All Charts
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Display all available charts for comprehensive analysis</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Charts Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="comparisons" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comparisons
            </TabsTrigger>
            <TabsTrigger value="correlations" className="flex items-center gap-2">
              <ScatterChart className="h-4 w-4" />
              Correlations
            </TabsTrigger>
            <TabsTrigger value="distributions" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distributions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-6">
            {/* Show one chart from each category in overview */}
            {renderChartGrid(categorizedCharts.trends.slice(0, 1), "trends")}
            {renderChartGrid(categorizedCharts.comparisons.slice(0, 1), "comparisons")}
            {renderChartGrid(categorizedCharts.correlations.slice(0, 1), "correlations")}
            {renderChartGrid(categorizedCharts.distributions.slice(0, 1), "distributions")}
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            {renderChartGrid(categorizedCharts.trends, "trends")}
          </TabsContent>

          <TabsContent value="comparisons" className="mt-6">
            {renderChartGrid(categorizedCharts.comparisons, "comparisons")}
          </TabsContent>

          <TabsContent value="correlations" className="mt-6">
            {renderChartGrid(categorizedCharts.correlations, "correlations")}
          </TabsContent>
          
          <TabsContent value="distributions" className="mt-6">
            {renderChartGrid(categorizedCharts.distributions, "distributions")}
          </TabsContent>
          
        </Tabs>
      </div>
    </TooltipProvider>
  );
};