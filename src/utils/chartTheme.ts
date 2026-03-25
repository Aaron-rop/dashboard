export const chartPalette = {
  green900: '#16a34a',
  green800: '#22c55e',
  green700: '#22c55e',
  green600: '#34d399',
  green500: '#6ee7b7',
  green400: '#86efac',
  green300: '#bbf7d0',
  mint500: '#2dd4bf',
  lime500: '#84cc16',
  amber500: '#f97316',
  neutral500: '#94a3b8',
  neutral300: '#cbd5e1',
  danger500: '#dc2626',
};

export const chartSeries = [
  chartPalette.green900,
  chartPalette.mint500,
  chartPalette.green500,
  chartPalette.green600,
  chartPalette.green400,
  chartPalette.neutral500,
];

export const chartAxis = {
  axisLine: { lineStyle: { color: '#cbd5e1' } },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: '#ecf0f3' } },
};

export const chartLegend = {
  textStyle: { color: '#475569', fontWeight: 500 },
};

export const chartTooltip = {
  backgroundColor: 'rgba(15, 23, 42, 0.86)',
  borderWidth: 0,
  textStyle: { color: '#f8fafc' },
  extraCssText: 'backdrop-filter: blur(6px); border-radius: 10px;',
};

export const buildXAxisLabelDensity = (total: number, maxVisible: number = 10) => {
  if (total <= maxVisible) {
    return { interval: 0, hideOverlap: true };
  }

  return {
    interval: Math.ceil(total / maxVisible) - 1,
    hideOverlap: true,
  };
};

export const areaStyleByColor = (color: string) => ({
  color: {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: `${color}55` },
      { offset: 1, color: `${color}08` },
    ],
  },
});

export const vintageRateColor = (rate: number) => {
  if (rate > 0.05) return chartPalette.danger500;
  if (rate > 0.02) return chartPalette.amber500;
  return chartPalette.green900;
};

export const assetColorMap: Record<string, string> = {
  资产A: '#22c55e',
  资产B: '#34d399',
  资产C: '#2dd4bf',
  资产D: '#a3e635',
};
