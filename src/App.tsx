import { ColorWidget } from "./components/ColorWidget";
import { useEffect, useState } from "react";
import { ArrowUpRightIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Chart, ChartPalette, LayerCard, Text } from "@cloudflare/kumo";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import ReactMarkdown from "react-markdown";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  AxisPointerComponent,
  BrushComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  barTimeAxis,
  line3Series,
  line6Series,
  pieSeries,
  stackedBarSeries,
  timeAxis,
} from "./data/mockChartData";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  AxisPointerComponent,
  BrushComponent,
  GridComponent,
  TooltipComponent,
  CanvasRenderer,
  AriaComponent,
]);

const lightCategoricalDefaults = [
  "#2563EB",
  "#D97706",
  "#E11D48",
  "#4F46E5",
  "#EA6D00",
  "#0D9488",
];

const darkCategoricalDefaults = [
  "#60A5FA",
  "#FBBF24",
  "#FB7185",
  "#818CF8",
  "#FB923C",
  "#2DD4BF",
];

export default function MockDataPage() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const isDarkMode = mode === "dark";
  const [categoricalColorsByMode, setCategoricalColorsByMode] = useState(() => ({
    light: lightCategoricalDefaults,
    dark: darkCategoricalDefaults,
  }));
  const palette = isDarkMode
    ? categoricalColorsByMode.dark
    : categoricalColorsByMode.light;

  const handleCategoricalColorChange = (rowIndex: number, nextColor: string) => {
    setCategoricalColorsByMode((previous) => {
      const next = isDarkMode ? [...previous.dark] : [...previous.light];
      next[rowIndex] = nextColor;

      return isDarkMode
        ? { ...previous, dark: next }
        : { ...previous, light: next };
    });
  };

  const line3SemanticColors = [
    String(ChartPalette.semantic("Attention")),
    String(ChartPalette.semantic("Warning")),
    String(ChartPalette.semantic("Neutral")),
  ];

  const cvdLabels = ["Blue", "Amber", "Rose", "Indigo", "Orange", "Teal"];

  const toRgb = (hex: string) => {
    const cleaned = hex.replace("#", "").trim();
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  };

  const toHex = (r: number, g: number, b: number) => {
    const normalize = (value: number) =>
      Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");

    return `#${normalize(r)}${normalize(g)}${normalize(b)}`.toUpperCase();
  };

  const simulateDeuteranopia = (hex: string) => {
    const { r, g, b } = toRgb(hex);

    const transformedR = 0.367 * r + 0.861 * g - 0.228 * b;
    const transformedG = 0.28 * r + 0.673 * g + 0.047 * b;
    const transformedB = -0.012 * r + 0.043 * g + 0.969 * b;

    return toHex(transformedR, transformedG, transformedB);
  };

  const wcagGuidelinesMarkdown = `### WCAG requirements

- **1.4.1 Use of Color — Level A.** Colour must not be the only differentiator — every series needs a redundant non-colour cue (dash pattern, direct label, or adjacent data table). [(WCAG)](https://www.w3.org/TR/WCAG21/#use-of-color)
- **1.4.11 Non-text Contrast — Level AA.** Lines, bars, map regions, and data points must achieve at least **3:1** contrast against their adjacent background. The lightest steps of a sequential scale are exempt when the overall gradient is the essential encoding. [(WCAG)](https://www.w3.org/TR/WCAG21/#non-text-contrast)
- **1.4.3 Contrast Minimum — Level AA.** Axis labels, legend text, and tooltips must meet **4.5:1** for normal text and **3:1** for large text. [(WCAG)](https://www.w3.org/TR/WCAG21/#contrast-minimum)`


  const lineOptions3Series: EChartsOption = {
    color: line3SemanticColors,
    backgroundColor: "transparent",
    grid: { left: 40, right: 20, top: 24, bottom: 36 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timeAxis,
    },
    yAxis: { 
      type: "value", 
      splitLine: { show: true, lineStyle: { type: "dashed", opacity: 0.5 } } 
    },
    series: line3Series.map((series) => ({
      ...series,
      type: "line",
      showSymbol: false,
      lineStyle: { width: 1.5 },
    })),
  };

  const lineOptions6Series: EChartsOption = {
    color: palette,
    backgroundColor: "transparent",
    grid: { left: 40, right: 20, top: 24, bottom: 36 },
    tooltip: { trigger: "axis", appendToBody: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timeAxis,
    },
    yAxis: { 
      type: "value", 
      splitLine: { show: true, lineStyle: { type: "dashed", opacity: 0.5 } },
    },
    series: line6Series.map((series) => ({
      ...series,
      type: "line",
      showSymbol: false,
      lineStyle: { width: 1.25 },
    })),
  };

  const barOptions: EChartsOption = {
    color: palette,
    backgroundColor: "transparent",
    grid: { left: 56, right: 24, top: 52, bottom: 52 },
    legend: {
      top: 8,
      left: 12,
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: {
        color: isDarkMode ? "#c5c7ce" : "#262626",
      },
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: barTimeAxis,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { type: "dashed", opacity: 0.5 } },
    },
    series: stackedBarSeries.map((series) => ({
      ...series,
      type: "bar",
      stack: "total",
      barWidth: 26,
      emphasis: { focus: "series" as const },
    })),
  };

  const pieOptions: EChartsOption = {
    color: palette,
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    series: [
      {
        name: "Traffic share",
        type: "pie",
        radius: ["45%", "72%"],
        data: pieSeries,
      },
    ],
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  return (
    <div
      data-mode={mode}
      className="min-h-screen w-full p-6 bg-kumo-canvas"
    >
      <div className="mx-auto w-full max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0 space-y-6">
          <LayerCard>
            <LayerCard.Secondary>
              <p>Line chart — 3 series</p>
            </LayerCard.Secondary>
            <LayerCard.Primary>
              <Chart echarts={echarts} options={lineOptions3Series} isDarkMode={isDarkMode} height={280} />
            </LayerCard.Primary>
          </LayerCard>

          <LayerCard>
            <LayerCard.Secondary>
              <p>Line chart — 6 series</p>
            </LayerCard.Secondary>
            <LayerCard.Primary>
              <Chart echarts={echarts} options={lineOptions6Series} isDarkMode={isDarkMode} height={280} />
            </LayerCard.Primary>
          </LayerCard>

          <LayerCard>
            <LayerCard.Secondary>
              <Text variant="body">Bar chart</Text>
            </LayerCard.Secondary>
            <LayerCard.Primary>
              <Chart echarts={echarts} options={barOptions} isDarkMode={isDarkMode} height={300} />
            </LayerCard.Primary>
          </LayerCard>

          <LayerCard>
            <LayerCard.Secondary>
              <p>Donut chart</p>
            </LayerCard.Secondary>
            <LayerCard.Primary>
              <Chart echarts={echarts} options={pieOptions} isDarkMode={isDarkMode} height={400} />
            </LayerCard.Primary>
          </LayerCard>

          <LayerCard>
            <LayerCard.Secondary>
              <p>CVD simulation — normal vs deuteranopia approximation</p>
            </LayerCard.Secondary>
            <LayerCard.Primary>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Text variant="body">Normal vision</Text>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {palette.map((color, index) => (
                      <div key={`normal-${cvdLabels[index]}`} className="space-y-2">
                        <div className="h-18 rounded-lg" style={{ backgroundColor: color }} />
                        <Text variant="body" DANGEROUS_className="font-mono">
                          {cvdLabels[index]}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Text variant="body">Deuteranopia approximation (matrix — indicative only)</Text>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {palette.map((color, index) => (
                      <div key={`deut-${cvdLabels[index]}`} className="space-y-2">
                        <div
                          className="h-18 rounded-lg"
                          style={{ backgroundColor: simulateDeuteranopia(color) }}
                        />
                        <Text variant="body" DANGEROUS_className="font-mono">
                          {cvdLabels[index]}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-kumo-elevated ring ring-kumo-line p-4">
                  <Text variant="body">
                    CVD groups in this palette
                  </Text>
                  <Text variant="body" DANGEROUS_className="mt-1 text-kumo-subtle">
                    Blue + Indigo — blue family (separated by lightness)
                    <br />
                    Amber + Orange — yellow-brown family
                    <br />
                    Rose — pink-grey cluster under CVD approximation
                    <br />
                    Teal — blue-green family
                  </Text>
                </div>
              </div>
            </LayerCard.Primary>
          </LayerCard>
        </div>

        <div className="mt-6 w-full max-w-full lg:mt-0">
          <div className="sticky top-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
            <Text variant="heading3">Chart Colors</Text>
            <div className="inline-flex items-center rounded-lg ring ring-kumo-hairline bg-kumo-base p-1">
              <button
                type="button"
                onClick={() => setMode("light")}
                aria-label="Switch to light mode"
                className="rounded-md p-2 bg-kumo-recessed"
              >
                <SunIcon size={16} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => setMode("dark")}
                aria-label="Switch to dark mode"
                className={`rounded-md p-2 ${mode === "dark" ? "bg-neutral-200 text-neutral-900" : "text-neutral-600"}`}
              >
                <MoonIcon size={16} weight="bold" />
              </button>
            </div>
            </div>

            <div className="text-sm leading-6 text-kumo-default">
              <ReactMarkdown
                components={{
                  h3: ({ children }) => (
                    <h3 className="m-0 text-base font-semibold text-kumo-default">{children}</h3>
                  ),
                  ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  p: ({ children }) => <p className="m-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1"
                    >
                      {children}
                      <ArrowUpRightIcon size={12}/>
                    </a>
                  ),
                }}
              >
                {wcagGuidelinesMarkdown}
              </ReactMarkdown>
            </div>

            <ColorWidget
              categoricalColors={palette}
              onCategoricalColorChange={handleCategoricalColorChange}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
