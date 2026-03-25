import {
  KPIItem,
  BusinessSummaryMetric,
  VintageData,
  RiskMatrixCell,
  RiskDetailRow,
  RiskDrilldownRow,
  RiskDrilldownVintageRow,
  FinancialMonthly,
  AssetDetail,
  GlobalFilter,
} from '../types';
import { randomInRange, generateTimeSeries, generateMonthLabels, generateDayLabels } from '../utils/format';

export { generateMonthLabels };

// 计算全局筛选器的影响因子
function calculateFilterFactor(filter?: GlobalFilter): number {
  if (!filter) return 1;
  
  // 产品和银行始终是单选，因此基础因子固定为1
  const baseFactor = 1;
  
  // 二级机构：空数组表示全选（所有二级机构），否则按选择比例
  const totalSecondaries = institutionCascade
    .filter((item) => filter.banks.includes(item.bankValue))
    .reduce((sum, item) => sum + item.secondaries.length, 0);
  const secondaryCount = filter.secondaryInstitutions.length === 0 
    ? totalSecondaries 
    : filter.secondaryInstitutions.length;
  const secondaryFactor = totalSecondaries > 0 ? secondaryCount / totalSecondaries : 1;
  
  // 三级机构：空数组表示全选（所有三级机构），否则按选择比例
  const totalTertiaries = institutionCascade
    .filter((item) => filter.banks.includes(item.bankValue))
    .flatMap((item) => 
      item.secondaries
        .filter((sec) => 
          filter.secondaryInstitutions.length === 0 || 
          filter.secondaryInstitutions.includes(sec.value)
        )
        .flatMap((sec) => sec.tertiaries)
    ).length;
  const tertiaryCount = filter.tertiaryInstitutions.length === 0 
    ? totalTertiaries 
    : filter.tertiaryInstitutions.length;
  const tertiaryFactor = totalTertiaries > 0 ? tertiaryCount / totalTertiaries : 1;
  
  // 综合因子：基础因子占40%，二级机构占30%，三级机构占30%
  return baseFactor * 0.4 + secondaryFactor * 0.3 + tertiaryFactor * 0.3;
}

function generateFixedLoanMonths(): string[] {
  return Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateYearLabels(count: number): string[] {
  const nowYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, index) => `${nowYear - count + 1 + index}年`);
}

function generateWeekRangeLabels(count: number): string[] {
  const today = new Date();
  const latestFriday = new Date(today);
  const distanceToFriday = (today.getDay() + 2) % 7;
  latestFriday.setDate(today.getDate() - distanceToFriday);

  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const end = new Date(latestFriday);
    end.setDate(latestFriday.getDate() - offset * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const startText = `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}`;
    const endText = `${String(end.getMonth() + 1).padStart(2, '0')}/${String(end.getDate()).padStart(2, '0')}`;
    return `${startText}-${endText}`;
  });
}

function getBusinessTrendXAxis(type: string, customDayCount: number = 30): string[] {
  if (type === 'cumulative') return generateMonthLabels(24);
  if (type === 'year') return generateYearLabels(6);
  if (type === 'month') return generateMonthLabels(12);
  if (type === 'week7') return generateDayLabels(7);
  if (type === 'week') return generateWeekRangeLabels(8);
  if (type === 'custom') return generateDayLabels(customDayCount);
  return generateMonthLabels(12);
}

function generateBusinessSeries(
  length: number,
  options: {
    base: number;
    growth: number;
    seasonal: number;
    volatility: number;
    shockProb?: number;
    shockAmp?: number;
    min?: number;
    max?: number;
  }
): number[] {
  const {
    base,
    growth,
    seasonal,
    volatility,
    shockProb = 0.18,
    shockAmp = 0.1,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
  } = options;

  const values: number[] = [];
  let momentum = 0;
  for (let i = 0; i < length; i++) {
    const trendFactor = 1 + growth * i * 1.8;
    const seasonalFactor = 1 + seasonal * Math.sin((i / Math.max(1, length - 1)) * Math.PI * 2.6 + 0.8);
    momentum = clamp(
      momentum + randomInRange(-volatility * 0.35, volatility * 0.35),
      -volatility * 0.9,
      volatility * 0.9
    );
    const noiseFactor = 1 + momentum + randomInRange(-volatility * 0.2, volatility * 0.2);
    const shockFactor = Math.random() < shockProb ? 1 + randomInRange(-shockAmp, shockAmp) : 1;
    const value = clamp(base * trendFactor * seasonalFactor * noiseFactor * shockFactor, min, max);
    values.push(Math.round(value * 100) / 100);
  }
  return values;
}

// ==================== 业务数据 Mock ====================

export function getBusinessKPIs(filter?: GlobalFilter): KPIItem[] {
  const factor = calculateFilterFactor(filter);
  
  return [
    // A组 - 余额指标
    { key: 'newBalance', name: '新增余额', value: Math.round(185000000 * factor), unit: 'amount', momChange: -0.015, yoyChange: 0.062, prevDelta: Math.round(-2800000 * factor), group: 'A' },
    { key: 'balance', name: '在贷余额', value: Math.round(3256000000 * factor), unit: 'amount', momChange: 0.032, yoyChange: 0.145, prevDelta: Math.round(101000000 * factor), group: 'A' },
    { key: 'loanCount', name: '在贷人数', value: Math.round(125832 * factor), unit: 'count', momChange: 0.025, yoyChange: 0.108, prevDelta: Math.round(3072 * factor), group: 'A' },
    { key: 'balanceWeightedRate', name: '余额加权利率', value: 0.1285, unit: 'percent', momChange: -0.008, yoyChange: -0.021, prevDelta: -0.0007, group: 'A' },

    // B组 - 完件指标
    { key: 'scanRegisterCount', name: '扫码注册人数', value: Math.round(198362 * factor), unit: 'count', momChange: 0.034, yoyChange: 0.158, prevDelta: Math.round(6508 * factor), group: 'B' },
    { key: 'realNameCompletedCount', name: '实名完成人数', value: Math.round(168925 * factor), unit: 'count', momChange: 0.027, yoyChange: 0.121, prevDelta: Math.round(4462 * factor), group: 'B' },
    { key: 'completeCount', name: '完件人数', value: Math.round(142365 * factor), unit: 'count', momChange: 0.018, yoyChange: 0.082, prevDelta: Math.round(2516 * factor), group: 'B' },

    // C组 - 授信指标（1/2/3段）
    { key: 'stage1CreditSuccessCount', name: '1段授信成功人数', value: Math.round(89562 * factor), unit: 'count', momChange: 0.018, yoyChange: 0.083, prevDelta: Math.round(1586 * factor), group: 'C' },
    { key: 'stage1CreditSuccessAmount', name: '1段授信成功金额', value: Math.round(4520000000 * factor), unit: 'amount', momChange: 0.042, yoyChange: 0.172, prevDelta: Math.round(182000000 * factor), group: 'C' },
    { key: 'stage1CreditWeightedRate', name: '1段授信加权利率', value: 0.1356, unit: 'percent', momChange: -0.005, yoyChange: -0.016, prevDelta: -0.0005, group: 'C' },
    { key: 'stage2CreditSuccessCount', name: '2段授信成功人数', value: Math.round(56390 * factor), unit: 'count', momChange: 0.013, yoyChange: 0.071, prevDelta: Math.round(964 * factor), group: 'C' },
    { key: 'stage2CreditSuccessAmount', name: '2段授信成功金额', value: Math.round(2865000000 * factor), unit: 'amount', momChange: 0.029, yoyChange: 0.135, prevDelta: Math.round(80700000 * factor), group: 'C' },
    { key: 'stage2CreditWeightedRate', name: '2段授信加权利率', value: 0.1324, unit: 'percent', momChange: -0.004, yoyChange: -0.013, prevDelta: -0.0004, group: 'C' },
    { key: 'stage3CreditSuccessCount', name: '3段授信成功人数', value: Math.round(33812 * factor), unit: 'count', momChange: 0.011, yoyChange: 0.066, prevDelta: Math.round(532 * factor), group: 'C' },
    { key: 'stage3CreditSuccessAmount', name: '3段授信成功金额', value: Math.round(1718000000 * factor), unit: 'amount', momChange: 0.024, yoyChange: 0.121, prevDelta: Math.round(40300000 * factor), group: 'C' },
    { key: 'stage3CreditWeightedRate', name: '3段授信加权利率', value: 0.1298, unit: 'percent', momChange: -0.003, yoyChange: -0.01, prevDelta: -0.0003, group: 'C' },

    // D组 - 动支指标
    { key: 'drawdownInitiatedCount', name: '发起动支人数', value: Math.round(51230 * factor), unit: 'count', momChange: 0.031, yoyChange: 0.097, prevDelta: Math.round(1468 * factor), group: 'D' },
    { key: 'drawdownSuccessCount', name: '动支成功人数', value: Math.round(45823 * factor), unit: 'count', momChange: 0.028, yoyChange: 0.091, prevDelta: Math.round(1245 * factor), group: 'D' },
    { key: 'drawdownAmount', name: '动支金额', value: Math.round(2180000000 * factor), unit: 'amount', momChange: 0.028, yoyChange: 0.124, prevDelta: Math.round(59500000 * factor), group: 'D' },
    { key: 'drawdownWeightedRate', name: '动支加权利率', value: 0.1312, unit: 'percent', momChange: -0.002, yoyChange: -0.01, prevDelta: -0.0002, group: 'D' },
  ];
}

export function getBusinessSummaryMetrics(type: string = 'cumulative', filter?: GlobalFilter): BusinessSummaryMetric[] {
  const filterFactor = calculateFilterFactor(filter);
  const scopeMultiplier: Record<string, number> = {
    cumulative: 1,
    year: 0.9,
    month: 0.16,
    week7: 0.04,
    week: 0.08,
    custom: 0.12,
  };

  const trendAdjust: Record<string, { mom: number; yoy: number; prev: number }> = {
    cumulative: { mom: 1, yoy: 1, prev: 1 },
    year: { mom: 0.85, yoy: 0.9, prev: 0.9 },
    month: { mom: 1.15, yoy: 0.75, prev: 0.5 },
    week7: { mom: 1.35, yoy: 0.45, prev: 0.2 },
    week: { mom: 1.25, yoy: 0.55, prev: 0.28 },
    custom: { mom: 1.1, yoy: 0.6, prev: 0.35 },
  };

  const scale = scopeMultiplier[type] ?? 1;
  const adjust = trendAdjust[type] ?? trendAdjust.cumulative;

  const baseMetrics: BusinessSummaryMetric[] = [
    { key: 'completeCount', name: '完件人数', value: 142365, unit: 'count', momChange: 0.018, yoyChange: 0.082, prevDelta: 2516 },
    { key: 'creditCount', name: '授信人数', value: 89562, unit: 'count', momChange: 0.015, yoyChange: 0.073, prevDelta: 1320 },
    { key: 'creditAmount', name: '授信金额', value: 4520000000, unit: 'amount', momChange: 0.041, yoyChange: 0.168, prevDelta: 177000000 },
    { key: 'creditRate', name: '授信加权利率', value: 0.1356, unit: 'percent', momChange: -0.004, yoyChange: -0.012, prevDelta: -0.0005 },
    { key: 'drawdownAmount', name: '动支金额', value: 2180000000, unit: 'amount', momChange: 0.027, yoyChange: 0.116, prevDelta: 58600000 },
    { key: 'drawdownCount', name: '动支人数', value: 45823, unit: 'count', momChange: 0.021, yoyChange: 0.087, prevDelta: 968 },
    { key: 'loanBalance', name: '在贷余额', value: 3256000000, unit: 'amount', momChange: 0.029, yoyChange: 0.142, prevDelta: 98500000 },
    { key: 'loanCount', name: '在贷人数', value: 125832, unit: 'count', momChange: 0.023, yoyChange: 0.102, prevDelta: 2865 },
  ];

  return baseMetrics.map((metric) => {
    const scaledValue = metric.unit === 'percent' ? metric.value : Math.max(0, Math.round(metric.value * scale * filterFactor));
    return {
      ...metric,
      value: scaledValue,
      momChange: Math.round(metric.momChange * adjust.mom * 1000) / 1000,
      yoyChange: Math.round(metric.yoyChange * adjust.yoy * 1000) / 1000,
      prevDelta: metric.unit === 'percent'
        ? Math.round(metric.prevDelta * adjust.prev * 100000) / 100000
        : Math.round(metric.prevDelta * scale * filterFactor),
    };
  });
}

export function getScaleTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const xAxis = getBusinessTrendXAxis(type, customDayCount);
  const count = xAxis.length;
  const filterFactor = calculateFilterFactor(filter);
  const baseBalance = (type === 'cumulative' ? 35 : type === 'year' ? 31 : type === 'week' ? 29 : 32) * filterFactor;
  const baseNew = (type === 'cumulative' ? 3.2 : type === 'year' ? 2.6 : type === 'week' ? 2.1 : 1.9) * filterFactor;
  const baseCount = (type === 'cumulative' ? 15 : type === 'year' ? 13.5 : type === 'week' ? 11.8 : 12.3) * filterFactor;
  const growth = type === 'week7' ? 0.002 : type === 'week' ? 0.004 : type === 'year' ? 0.011 : 0.01;
  
  return {
    xAxis,
    balance: generateBusinessSeries(count, { base: baseBalance, growth, seasonal: 0.035, volatility: 0.04, shockProb: 0.15, shockAmp: 0.07, min: 18 * filterFactor }),
    newBalance: generateBusinessSeries(count, { base: baseNew, growth: growth * 1.5, seasonal: 0.09, volatility: 0.12, shockProb: 0.25, shockAmp: 0.22, min: 0.5 * filterFactor }),
    balanceRate: generateBusinessSeries(count, { base: 0.128, growth: 0.0006, seasonal: 0.018, volatility: 0.02, shockProb: 0.1, shockAmp: 0.03, min: 0.09, max: 0.18 }),
    loanCount: generateBusinessSeries(count, { base: baseCount, growth: growth * 0.7, seasonal: 0.04, volatility: 0.05, shockProb: 0.12, shockAmp: 0.06, min: 7 * filterFactor }),
  };
}

export function getDayScaleTrendData(days: number = 7) {
  const dayLabels = generateDayLabels(days);
  return {
    xAxis: dayLabels,
    balance: generateBusinessSeries(days, { base: 32, growth: 0.003, seasonal: 0.015, volatility: 0.025, shockProb: 0.18, shockAmp: 0.05, min: 24 }),
    newBalance: generateBusinessSeries(days, { base: 0.65, growth: 0, seasonal: 0.08, volatility: 0.14, shockProb: 0.28, shockAmp: 0.25, min: 0.2 }),
    balanceRate: generateBusinessSeries(days, { base: 0.129, growth: 0, seasonal: 0.01, volatility: 0.012, shockProb: 0.08, shockAmp: 0.02, min: 0.1, max: 0.17 }),
    loanCount: generateBusinessSeries(days, { base: 12.5, growth: 0.002, seasonal: 0.02, volatility: 0.03, shockProb: 0.15, shockAmp: 0.06, min: 8 }),
  };
}

export function getFunnelData(type: string = 'month') {
  const scale = type === 'cumulative' ? 1.5 : type === 'year' ? 1.2 : 1;
  const applicants = Math.round(175000 * scale * randomInRange(0.94, 1.06));
  const completeRate = randomInRange(0.8, 0.9);
  const firstPassRate = randomInRange(0.72, 0.84);
  const creditRate = randomInRange(0.58, 0.76);
  const drawdownRate = randomInRange(0.52, 0.69);

  const peopleValues = [
    applicants,
    Math.round(applicants * completeRate),
    0,
    0,
    0,
  ];
  peopleValues[2] = Math.round(peopleValues[1] * firstPassRate);
  peopleValues[3] = Math.round(peopleValues[2] * creditRate);
  peopleValues[4] = Math.round(peopleValues[3] * drawdownRate);

  const avgAmounts = [
    randomInRange(45000, 50000),
    randomInRange(45500, 50500),
    randomInRange(47000, 52000),
    randomInRange(49000, 55000),
    randomInRange(46000, 52000),
  ];

  const amountValues = peopleValues.map((value, index) => Math.round(value * avgAmounts[index]));
  const cumulativeRates = peopleValues.map((value) => value / peopleValues[0]);
  
  return {
    people: [
      { name: '申请', value: peopleValues[0] },
      { name: '完件', value: peopleValues[1] },
      { name: '初审通过', value: peopleValues[2] },
      { name: '授信通过', value: peopleValues[3] },
      { name: '放款', value: peopleValues[4] },
    ],
    amount: [
      { name: '申请', value: amountValues[0] },
      { name: '完件', value: amountValues[1] },
      { name: '初审通过', value: amountValues[2] },
      { name: '授信通过', value: amountValues[3] },
      { name: '放款', value: amountValues[4] },
    ],
    avgAmount: [
      { name: '申请', value: Math.round(avgAmounts[0]) },
      { name: '完件', value: Math.round(avgAmounts[1]) },
      { name: '初审通过', value: Math.round(avgAmounts[2]) },
      { name: '授信通过', value: Math.round(avgAmounts[3]) },
      { name: '放款', value: Math.round(avgAmounts[4]) },
    ],
    rate: [
      { name: '申请', value: cumulativeRates[0] },
      { name: '完件', value: cumulativeRates[1] },
      { name: '初审通过', value: cumulativeRates[2] },
      { name: '授信通过', value: cumulativeRates[3] },
      { name: '放款', value: cumulativeRates[4] },
    ],
  };
}

export function getCreditTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const xAxis = getBusinessTrendXAxis(type, customDayCount);
  const length = xAxis.length;
  const filterFactor = calculateFilterFactor(filter);
  const scale = (type === 'cumulative' ? 1.35 : type === 'year' ? 1.15 : 1) * filterFactor;

  const creditCount = generateBusinessSeries(length, {
    base: 8.8 * scale,
    growth: 0.012,
    seasonal: 0.05,
    volatility: 0.06,
    shockProb: 0.16,
    shockAmp: 0.12,
    min: 5.5,
  });

  const creditAmount = generateBusinessSeries(length, {
    base: 39 * scale,
    growth: 0.015,
    seasonal: 0.07,
    volatility: 0.08,
    shockProb: 0.18,
    shockAmp: 0.14,
    min: 22,
  });

  const creditAvg = creditAmount.map((amount, index) => {
    const countValue = Math.max(creditCount[index], 0.1);
    return Math.round((amount * 1e4 / countValue) * 100) / 100;
  });

  const creditRate = generateBusinessSeries(length, {
    base: 0.136,
    growth: 0.0004,
    seasonal: 0.014,
    volatility: 0.018,
    shockProb: 0.1,
    shockAmp: 0.025,
    min: 0.1,
    max: 0.19,
  });

  return {
    xAxis,
    creditCount,
    creditAmount,
    creditAvg,
    creditRate,
  };
}

export function getCompletionTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const xAxis = getBusinessTrendXAxis(type, customDayCount);
  const length = xAxis.length;
  const filterFactor = calculateFilterFactor(filter);
  const scale = (type === 'cumulative' ? 1.25 : type === 'year' ? 1.12 : 1) * filterFactor;

  const scanRegisterCount = generateBusinessSeries(length, {
    base: 18.5 * scale,
    growth: 0.013,
    seasonal: 0.055,
    volatility: 0.07,
    shockProb: 0.17,
    shockAmp: 0.13,
    min: 10,
  });

  const realNameCompletedCount = scanRegisterCount.map((value, index) => {
    const ratio = 0.83 + 0.02 * Math.sin(index * 0.45);
    return Math.round(value * ratio * 100) / 100;
  });

  const completeCount = realNameCompletedCount.map((value, index) => {
    const ratio = 0.84 + 0.02 * Math.cos(index * 0.38);
    return Math.round(value * ratio * 100) / 100;
  });

  return {
    xAxis,
    scanRegisterCount,
    realNameCompletedCount,
    completeCount,
  };
}

export function getCreditStageTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const base = getCreditTrendData(type, customDayCount, filter);

  const stage1Count = base.creditCount;
  const stage1Amount = base.creditAmount;
  const stage1Rate = base.creditRate;

  const stage2Count = base.creditCount.map((value, index) => Math.round(value * (0.63 + 0.02 * Math.sin(index * 0.4)) * 100) / 100);
  const stage2Amount = base.creditAmount.map((value, index) => Math.round(value * (0.62 + 0.02 * Math.cos(index * 0.37)) * 100) / 100);
  const stage2Rate = base.creditRate.map((value, index) => Math.round((value - 0.003 + 0.0003 * Math.sin(index * 0.3)) * 10000) / 10000);

  const stage3Count = base.creditCount.map((value, index) => Math.round(value * (0.38 + 0.02 * Math.cos(index * 0.35)) * 100) / 100);
  const stage3Amount = base.creditAmount.map((value, index) => Math.round(value * (0.37 + 0.015 * Math.sin(index * 0.36)) * 100) / 100);
  const stage3Rate = base.creditRate.map((value, index) => Math.round((value - 0.006 + 0.0003 * Math.cos(index * 0.28)) * 10000) / 10000);

  return {
    xAxis: base.xAxis,
    stage1Count,
    stage1Amount,
    stage1Rate,
    stage2Count,
    stage2Amount,
    stage2Rate,
    stage3Count,
    stage3Amount,
    stage3Rate,
  };
}

export function getLoanResultTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const xAxis = getBusinessTrendXAxis(type, customDayCount);
  const length = xAxis.length;
  const filterFactor = calculateFilterFactor(filter);
  const scale = (type === 'cumulative' ? 1.4 : type === 'year' ? 1.18 : 1) * filterFactor;

  const loanPeople = generateBusinessSeries(length, {
    base: 4.7 * scale,
    growth: 0.011,
    seasonal: 0.06,
    volatility: 0.07,
    shockProb: 0.18,
    shockAmp: 0.15,
    min: 2.8,
  });

  const loanAmount = generateBusinessSeries(length, {
    base: 22 * scale,
    growth: 0.014,
    seasonal: 0.075,
    volatility: 0.09,
    shockProb: 0.2,
    shockAmp: 0.16,
    min: 10,
  });

  const loanAvg = loanAmount.map((amount, index) => {
    const people = Math.max(loanPeople[index], 0.1);
    return Math.round((amount * 1e4 / people) * 100) / 100;
  });

  const loanRate = generateBusinessSeries(length, {
    base: 0.131,
    growth: 0.0005,
    seasonal: 0.015,
    volatility: 0.02,
    shockProb: 0.1,
    shockAmp: 0.025,
    min: 0.095,
    max: 0.19,
  });

  return {
    xAxis,
    loanPeople,
    loanAmount,
    loanAvg,
    loanRate,
  };
}

export function getDrawdownTrendData(type: string = 'month', customDayCount: number = 30, filter?: GlobalFilter) {
  const base = getLoanResultTrendData(type, customDayCount, filter);
  const initiatedCount = base.loanPeople.map((value, index) => Math.round(value * (1.12 + 0.02 * Math.sin(index * 0.42)) * 100) / 100);
  const successCount = base.loanPeople;

  return {
    xAxis: base.xAxis,
    initiatedCount,
    successCount,
    amount: base.loanAmount,
    rate: base.loanRate,
  };
}

export function getApprovalEfficiencyData(type: string = 'month', customDayCount: number = 30) {
  const months = getBusinessTrendXAxis(type, customDayCount);
  const count = months.length;
  const baseRate = type === 'cumulative' ? 0.88 : type === 'year' ? 0.86 : 0.85;
  
  return {
    xAxis: months,
    completeRate: generateBusinessSeries(count, { base: baseRate, growth: 0.0015, seasonal: 0.015, volatility: 0.02, min: 0.76, max: 0.95 }),
    firstPassRate: generateBusinessSeries(count, { base: baseRate - 0.07, growth: 0.001, seasonal: 0.02, volatility: 0.03, min: 0.62, max: 0.9 }),
    creditPassRate: generateBusinessSeries(count, { base: baseRate - 0.2, growth: 0.002, seasonal: 0.03, volatility: 0.05, shockProb: 0.2, shockAmp: 0.08, min: 0.42, max: 0.82 }),
    drawdownRate: generateBusinessSeries(count, { base: 0.51, growth: 0.0015, seasonal: 0.025, volatility: 0.04, shockProb: 0.2, shockAmp: 0.07, min: 0.35, max: 0.75 }),
  };
}

export function getDrawdownTimeData(type: string = 'month', customDayCount: number = 30) {
  const months = getBusinessTrendXAxis(type, customDayCount);
  const count = months.length;
  const baseScale = type === 'cumulative' ? 1.2 : type === 'year' ? 1.08 : 1;
  const t0: number[] = [];
  const t3: number[] = [];
  const t7: number[] = [];
  const t30: number[] = [];
  const notDrawn: number[] = [];

  for (let i = 0; i < count; i++) {
    const monthWave = 1 + 0.08 * Math.sin((i / (count - 1)) * Math.PI * 2);
    const t0Val = clamp(randomInRange(0.19, 0.29) * baseScale * monthWave, 0.14, 0.36);
    const t3Val = clamp(randomInRange(0.1, 0.19) * baseScale * monthWave, 0.07, 0.26);
    const t7Val = clamp(randomInRange(0.05, 0.12) * baseScale * monthWave, 0.03, 0.16);
    const t30Val = clamp(randomInRange(0.03, 0.09) * baseScale * monthWave, 0.02, 0.12);
    const used = t0Val + t3Val + t7Val + t30Val;
    const undrawnVal = clamp(1 - used + randomInRange(-0.02, 0.02), 0.22, 0.58);

    t0.push(Math.round(t0Val * 10000) / 10000);
    t3.push(Math.round(t3Val * 10000) / 10000);
    t7.push(Math.round(t7Val * 10000) / 10000);
    t30.push(Math.round(t30Val * 10000) / 10000);
    notDrawn.push(Math.round(undrawnVal * 10000) / 10000);
  }
  
  return {
    xAxis: months,
    t0,
    t3,
    t7,
    t30,
    notDrawn,
  };
}

// ==================== 风险数据 Mock ====================

export function getVintageData(filter?: GlobalFilter): VintageData[] {
  const cohorts = generateFixedLoanMonths();
  const data: VintageData[] = [];
  const filterFactor = calculateFilterFactor(filter);
  const scale = Math.max(0.4, filterFactor);

  cohorts.forEach((cohort) => {
    for (let mob = 0; mob <= 12; mob++) {
      data.push({
        mob,
        rate: Math.min(0.08, 0.001 * mob * mob * (0.8 + Math.random() * 0.4) * scale),
        cohort,
      });
    }
  });
  return data;
}

export function getRiskMatrixData(): RiskMatrixCell[] {
  const pricingRanges = ['<12%', '12-18%', '18-24%', '>24%'];
  const creditRanges = ['<1万', '1-5万', '5-10万', '>10万'];
  const data: RiskMatrixCell[] = [];
  pricingRanges.forEach((p) => {
    creditRanges.forEach((c) => {
      data.push({
        pricingRange: p,
        creditRange: c,
        dpdRate: randomInRange(0.02, 0.15),
        balance: randomInRange(5000, 80000) * 10000,
      });
    });
  });
  return data;
}

export function getRiskDetailData(filter?: GlobalFilter): RiskDetailRow[] {
  const months = generateFixedLoanMonths();
  const filterFactor = calculateFilterFactor(filter);
  const scale = filterFactor;
  
  return months.map((m) => {
    const loanAmount = randomInRange(1.5, 2.5) * 1e8 * scale;
    const balance = randomInRange(2.5, 3.5) * 1e8 * scale;
    const loanCount = Math.round(randomInRange(3000, 5000) * scale);
    const avgCredit = randomInRange(40000, 60000);
    const avgPricing = randomInRange(0.1, 0.2);

    const dpd90Rate = randomInRange(0.002, 0.015);
    const dpd30Rate = Math.min(0.05, dpd90Rate * randomInRange(1.55, 2.15));
    const dpd3Rate = Math.min(0.08, dpd30Rate * randomInRange(1.35, 1.95));

    const dpd90Principal = balance * dpd90Rate * randomInRange(0.92, 1.08);
    const dpd30Principal = balance * dpd30Rate * randomInRange(0.92, 1.08);
    const dpd3Principal = balance * dpd3Rate * randomInRange(0.92, 1.08);

    const dpd90Count = Math.max(1, Math.round(loanCount * dpd90Rate * randomInRange(0.7, 1.1)));
    const dpd30Count = Math.max(dpd90Count, Math.round(loanCount * dpd30Rate * randomInRange(0.72, 1.12)));
    const dpd3Count = Math.max(dpd30Count, Math.round(loanCount * dpd3Rate * randomInRange(0.74, 1.15)));

    return {
      period: m,
      loanAmount,
      balance,
      loanCount,
      avgCredit,
      avgPricing,
      dpd3Principal,
      dpd3Rate,
      dpd3Count,
      dpd30Principal,
      dpd30Rate,
      dpd30Count,
      dpd90Principal,
      dpd90Rate,
      dpd90Count,
    };
  });
}

export function getOverdueTrendData() {
  const months = generateFixedLoanMonths();
  return {
    xAxis: months,
    dpd3: generateTimeSeries(12, 0.03, 0.15),
    dpd30: generateTimeSeries(12, 0.018, 0.15),
    dpd90: generateTimeSeries(12, 0.008, 0.15),
    balance: generateTimeSeries(12, 32, 0.05),
  };
}

export function getRiskDrilldownData(
  loanMonth: string,
  dimension: 'creditRange' | 'pricingRange' | 'repayment'
): RiskDrilldownRow[] {
  const monthIndex = Math.max(1, Math.min(12, Number.parseInt(loanMonth.replace('月', ''), 10) || 1));
  const monthFactor = 0.9 + monthIndex * 0.03;

  const bucketMap: Record<'creditRange' | 'pricingRange' | 'repayment', string[]> = {
    creditRange: ['0-20万', '20-40万', '40-80万', '80万+'],
    pricingRange: ['0-12%', '12-18%', '18-24%', '24%+'],
    repayment: ['等额本息', '先息后本', '随借随还', '一次性还本'],
  };

  return bucketMap[dimension].map((bucket, index) => {
    const bucketFactor = 1 - index * 0.12;
    const loanAmount = randomInRange(0.35, 1.2) * 1e8 * monthFactor * bucketFactor;
    const balance = loanAmount * randomInRange(1.12, 1.36);
    const loanCount = Math.round(randomInRange(600, 2400) * bucketFactor * monthFactor);
    const avgCredit = Math.max(80000, loanAmount / Math.max(loanCount, 1));
    const avgPricing = randomInRange(0.1, 0.24) * (1 + index * 0.08);
    const dpd3Rate = randomInRange(0.012, 0.045) * (1 + index * 0.16);
    const dpd30Rate = randomInRange(0.008, 0.03) * (1 + index * 0.18);
    const dpd90Rate = randomInRange(0.003, 0.016) * (1 + index * 0.22);
    const dpd3Principal = balance * dpd3Rate * randomInRange(0.92, 1.08);
    const dpd30Principal = balance * dpd30Rate * randomInRange(0.9, 1.06);
    const dpd90Principal = balance * dpd90Rate * randomInRange(0.88, 1.05);
    const dpd3Count = Math.max(1, Math.round(loanCount * dpd3Rate * randomInRange(0.75, 1.1)));
    const dpd30Count = Math.max(1, Math.round(loanCount * dpd30Rate * randomInRange(0.72, 1.08)));
    const dpd90Count = Math.max(1, Math.round(loanCount * dpd90Rate * randomInRange(0.68, 1.06)));

    return {
      key: `${loanMonth}-${dimension}-${index}`,
      loanMonth,
      bucket,
      loanAmount,
      balance,
      loanCount,
      avgCredit,
      avgPricing,
      dpd3Principal,
      dpd3Rate,
      dpd3Count,
      dpd30Principal,
      dpd30Rate,
      dpd30Count,
      dpd90Principal,
      dpd90Rate,
      dpd90Count,
    };
  });
}

export function getRiskDrilldownVintageData(
  loanMonth: string,
  dimension: 'creditRange' | 'pricingRange' | 'repayment'
): RiskDrilldownVintageRow[] {
  const monthIndex = Math.max(1, Math.min(12, Number.parseInt(loanMonth.replace('月', ''), 10) || 1));
  const monthFactor = 0.85 + monthIndex * 0.025;

  const bucketMap: Record<'creditRange' | 'pricingRange' | 'repayment', string[]> = {
    creditRange: ['0-20万', '20-40万', '40-80万', '80万+'],
    pricingRange: ['0-12%', '12-18%', '18-24%', '24%+'],
    repayment: ['等额本息', '先息后本', '随借随还', '一次性还本'],
  };

  return bucketMap[dimension].map((bucket, index) => {
    const row: RiskDrilldownVintageRow = {
      key: `vintage-${loanMonth}-${dimension}-${index}`,
      loanMonth,
      bucket,
    };

    const bucketRiskFactor = 0.88 + index * 0.16;
    for (let mob = 0; mob <= 12; mob++) {
      const baseRate = Math.min(
        0.12,
        0.0009 * mob * mob * monthFactor * bucketRiskFactor * randomInRange(0.92, 1.12)
      );
      row[`mob${mob}`] = Math.round(baseRate * 10000) / 10000;
    }

    return row;
  });
}

// ==================== 财务数据 Mock ====================

export function getFinancialMonthlyData(filter?: GlobalFilter): FinancialMonthly[] {
  const filterFactor = calculateFilterFactor(filter);
  const loanAmountSeries = generateBusinessSeries(12, {
    base: 1.6 * 1e8 * filterFactor,
    growth: 0.02,
    seasonal: 0.045,
    volatility: 0.03,
    shockProb: 0.08,
    shockAmp: 0.05,
    min: 1.2 * 1e8,
    max: 3.2 * 1e8,
  });
  const balanceSeries = generateBusinessSeries(12, {
    base: 29 * 1e8 * filterFactor,
    growth: 0.012,
    seasonal: 0.03,
    volatility: 0.02,
    shockProb: 0.06,
    shockAmp: 0.04,
    min: 24 * 1e8,
    max: 44 * 1e8,
  });
  const budgetIncomeSeries = generateBusinessSeries(12, {
    base: 3200 * 10000 * filterFactor,
    growth: 0.018,
    seasonal: 0.04,
    volatility: 0.03,
    shockProb: 0.08,
    shockAmp: 0.06,
    min: 2400 * 10000,
  });

  return Array.from({ length: 12 }, (_, i) => {
    const month = `M${i + 1}`;
    const loanAmt = loanAmountSeries[i];
    const bal = balanceSeries[i];
    const budgetBal = bal * randomInRange(1.02, 1.1);
    const budgetInc = budgetIncomeSeries[i];
    const actualInc = budgetInc * clamp(0.86 + i * 0.015 + randomInRange(-0.04, 0.04), 0.75, 1.18);
    return {
      month,
      loanAmount: loanAmt,
      balance: bal,
      budgetBalance: budgetBal,
      budgetAchievement: bal / budgetBal,
      budgetIncome: budgetInc,
      actualIncome: actualInc,
      takeRate: (actualInc * 12) / bal,
    };
  });
}

export function getYTDAchievement() {
  const budgetYTD = randomInRange(3.5, 4.5) * 1e8;
  const actualYTD = budgetYTD * randomInRange(0.75, 1.05);
  const timeProgress = new Date().getMonth() / 12;
  return {
    budgetYTD,
    actualYTD,
    achievement: actualYTD / budgetYTD,
    timeProgress,
  };
}

export function getAssetDetailData(filter?: GlobalFilter): AssetDetail[] {
  const assets = ['资产A', '资产B', '资产C', '资产D'];
  const data: AssetDetail[] = [];
  const filterFactor = calculateFilterFactor(filter);
  assets.forEach((asset, index) => {
    const factor = (0.85 + index * 0.12) * filterFactor;
    const loanSeries = generateBusinessSeries(12, {
      base: 3800 * 10000 * factor,
      growth: 0.018 + index * 0.003,
      seasonal: 0.05,
      volatility: 0.03,
      shockProb: 0.08,
      shockAmp: 0.06,
      min: 2200 * 10000,
    });
    const balanceSeries = generateBusinessSeries(12, {
      base: 5.8 * 1e8 * factor,
      growth: 0.014 + index * 0.002,
      seasonal: 0.04,
      volatility: 0.025,
      shockProb: 0.07,
      shockAmp: 0.05,
      min: 3.5 * 1e8,
    });
    const actualInterestSeries = generateBusinessSeries(12, {
      base: 600 * 10000 * factor,
      growth: 0.02,
      seasonal: 0.05,
      volatility: 0.04,
      shockProb: 0.08,
      shockAmp: 0.06,
      min: 320 * 10000,
    });
    const annualRiskLossSeries = generateBusinessSeries(12, {
      base: 0.03 - index * 0.002,
      growth: -0.0004,
      seasonal: 0.015,
      volatility: 0.015,
      shockProb: 0.06,
      shockAmp: 0.03,
      min: 0.008,
      max: 0.05,
    });
    const techDiscountSeries = generateBusinessSeries(12, {
      base: 0.9 - index * 0.035,
      growth: -0.0003,
      seasonal: 0.01,
      volatility: 0.01,
      shockProb: 0.05,
      shockAmp: 0.02,
      min: 0.65,
      max: 0.96,
    });
    const profitRatioSeries = generateBusinessSeries(12, {
      base: 0.34 + index * 0.045,
      growth: 0.0005,
      seasonal: 0.012,
      volatility: 0.012,
      shockProb: 0.05,
      shockAmp: 0.02,
      min: 0.25,
      max: 0.7,
    });
    const profitIncomeSeries = generateBusinessSeries(12, {
      base: 230 * 10000 * factor,
      growth: 0.024,
      seasonal: 0.055,
      volatility: 0.04,
      shockProb: 0.08,
      shockAmp: 0.06,
      min: 120 * 10000,
    });
    const takeRateSeries = generateBusinessSeries(12, {
      base: 0.014 + index * 0.002,
      growth: 0.0006,
      seasonal: 0.015,
      volatility: 0.012,
      shockProb: 0.05,
      shockAmp: 0.02,
      min: 0.008,
      max: 0.05,
    });

    for (let m = 1; m <= 12; m++) {
      const rowIndex = m - 1;
      data.push({
        month: `M${m}`,
        assetName: asset,
        loanAmount: loanSeries[rowIndex],
        balance: balanceSeries[rowIndex],
        rateRange: ['8-12%', '12-15%', '15-18%', '18-24%'][Math.floor(Math.random() * 4)],
        actualInterest: actualInterestSeries[rowIndex],
        annualRiskLoss: annualRiskLossSeries[rowIndex],
        techDiscount: techDiscountSeries[rowIndex],
        profitRatio: profitRatioSeries[rowIndex],
        profitIncome: profitIncomeSeries[rowIndex],
        takeRate: takeRateSeries[rowIndex],
      });
    }
  });
  return data;
}

// ==================== 筛选器选项 Mock ====================

export const productOptions = [
  { value: 'business-loan', label: '经营贷' },
  { value: 'consumer-loan', label: '消费贷' },
];

export const institutionCascade = [
  {
    bank: '南京银行',
    bankValue: 'bank-nanjing',
    secondaries: [
      {
        name: '南京零售一部',
        value: 'nj-retail-1',
        tertiaries: [
          { name: '玄武团队', value: 'nj-retail-1-team-a' },
          { name: '建邺团队', value: 'nj-retail-1-team-b' },
        ],
      },
      {
        name: '南京普惠二部',
        value: 'nj-small-2',
        tertiaries: [
          { name: '江宁团队', value: 'nj-small-2-team-a' },
          { name: '浦口团队', value: 'nj-small-2-team-b' },
        ],
      },
    ],
  },
  {
    bank: '兰州银行',
    bankValue: 'bank-lanzhou',
    secondaries: [
      {
        name: '兰州直营一部',
        value: 'lz-direct-1',
        tertiaries: [
          { name: '城关团队', value: 'lz-direct-1-team-a' },
          { name: '七里河团队', value: 'lz-direct-1-team-b' },
        ],
      },
      {
        name: '兰州渠道三部',
        value: 'lz-channel-3',
        tertiaries: [
          { name: '安宁团队', value: 'lz-channel-3-team-a' },
          { name: '西固团队', value: 'lz-channel-3-team-b' },
        ],
      },
    ],
  },
  {
    bank: '苏州银行',
    bankValue: 'bank-suzhou',
    secondaries: [
      {
        name: '苏州城区一部',
        value: 'sz-urban-1',
        tertiaries: [
          { name: '园区团队', value: 'sz-urban-1-team-a' },
          { name: '姑苏团队', value: 'sz-urban-1-team-b' },
        ],
      },
      {
        name: '苏州昆山二部',
        value: 'sz-kunshan-2',
        tertiaries: [
          { name: '昆山团队', value: 'sz-kunshan-2-team-a' },
          { name: '太仓团队', value: 'sz-kunshan-2-team-b' },
        ],
      },
    ],
  },
];
