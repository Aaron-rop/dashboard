/**
 * 格式化金额：统一万元
 */
export function formatAmount(value: number): string {
  return (value / 1e4).toFixed(2) + '万元';
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

/**
 * 格式化KPI数值
 */
export function formatKPI(value: number, unit: 'amount' | 'percent' | 'count'): string {
  switch (unit) {
    case 'amount':
      return formatAmount(value);
    case 'percent':
      return formatPercent(value);
    case 'count':
      return value.toLocaleString() + '人';
  }
}

/**
 * 生成随机数
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 生成带波动的时间序列
 */
export function generateTimeSeries(
  length: number,
  base: number,
  volatility: number
): number[] {
  const result: number[] = [];
  let current = base;
  for (let i = 0; i < length; i++) {
    current = current * (1 + (Math.random() - 0.5) * volatility);
    result.push(Math.round(current * 100) / 100);
  }
  return result;
}

/**
 * 生成月份标签
 */
export function generateMonthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return labels;
}

/**
 * 生成日期标签
 */
export function generateDayLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return labels;
}
