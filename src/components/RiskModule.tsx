import React, { useMemo, useState } from 'react';
import { Radio, Table, Space, Tabs, Select } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ColumnsType } from 'antd/es/table';
import type { GlobalFilter, RiskDetailRow, RiskDrilldownRow, RiskDrilldownVintageRow } from '../types';
import { formatAmount, formatPercent } from '../utils/format';
import { buildXAxisLabelDensity, chartSeries, vintageRateColor } from '../utils/chartTheme';
import { getRiskDetailData, getRiskDrilldownData, getRiskDrilldownVintageData, getVintageData } from '../mock/data';

interface Props {
  globalFilter: GlobalFilter;
}

const RiskModule: React.FC<Props> = ({ globalFilter }) => {
  const [selectedLoanMonth, setSelectedLoanMonth] = useState<string>('1月');
  const [drilldownDimension, setDrilldownDimension] = useState<'creditRange' | 'pricingRange' | 'repayment'>('creditRange');
  const [selectedVintageMobs, setSelectedVintageMobs] = useState<number[]>([3, 6, 9]);

  const vintageData = useMemo(() => getVintageData(globalFilter), [globalFilter]);
  const detailData = useMemo(() => getRiskDetailData(globalFilter), [globalFilter]);
  const drilldownData = useMemo(
    () => getRiskDrilldownData(selectedLoanMonth, drilldownDimension),
    [selectedLoanMonth, drilldownDimension]
  );
  const drilldownVintageData = useMemo(
    () => getRiskDrilldownVintageData(selectedLoanMonth, drilldownDimension),
    [selectedLoanMonth, drilldownDimension]
  );

  const cohorts = [...new Set(vintageData.map((item) => item.cohort))];
  const mobOptions = useMemo(
    () =>
      Array.from(new Set(vintageData.map((item) => item.mob)))
        .sort((a, b) => a - b)
        .map((mob) => ({ label: `MOB${mob}`, value: mob })),
    [vintageData]
  );
  const activeVintageMobs = useMemo(() => {
    const availableMobs = new Set(mobOptions.map((option) => Number(option.value)));
    return selectedVintageMobs
      .map((mob) => Number(mob))
      .filter((mob) => availableMobs.has(mob));
  }, [mobOptions, selectedVintageMobs]);

  const vintageTableData = cohorts.map((cohort) => {
    const row: Record<string, any> = { cohort };
    vintageData
      .filter((item) => item.cohort === cohort)
      .forEach((item) => {
        row[`mob${item.mob}`] = item.rate;
      });
    return row;
  });

  const mobColumns = [
    { title: '月份', dataIndex: 'cohort', key: 'cohort', fixed: 'left' as const, width: 100 },
    ...Array.from({ length: 13 }, (_, index) => ({
      title: `MOB${index}`,
      dataIndex: `mob${index}`,
      key: `mob${index}`,
      width: 80,
      render: (value: number) => (value ? <span style={{ color: vintageRateColor(value), fontWeight: 600 }}>{(value * 100).toFixed(2)}%</span> : '-'),
    })),
  ];

  const detailColumns: ColumnsType<RiskDetailRow> = [
    { title: '放款月', dataIndex: 'period', key: 'period', fixed: 'left', width: 72, sorter: (a, b) => a.period.localeCompare(b.period) },
    { title: '放款金额', dataIndex: 'loanAmount', key: 'loanAmount', width: 88, render: (v) => formatAmount(v), sorter: (a, b) => a.loanAmount - b.loanAmount },
    { title: '在贷余额', dataIndex: 'balance', key: 'balance', width: 88, render: (v) => formatAmount(v), sorter: (a, b) => a.balance - b.balance },
    { title: '在贷人数', dataIndex: 'loanCount', key: 'loanCount', width: 76, render: (v) => v.toLocaleString(), sorter: (a, b) => a.loanCount - b.loanCount },
    { title: '平均额度', dataIndex: 'avgCredit', key: 'avgCredit', width: 80, render: (v) => formatAmount(v), sorter: (a, b) => a.avgCredit - b.avgCredit },
    { title: '平均定价', dataIndex: 'avgPricing', key: 'avgPricing', width: 76, render: (v) => formatPercent(v), sorter: (a, b) => a.avgPricing - b.avgPricing },
    {
      title: '3D+ 逾期',
      children: [
        { title: '逾期本金', dataIndex: 'dpd3Principal', key: 'dpd3Principal', width: 84, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd3Rate', key: 'dpd3Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd3Count', key: 'dpd3Count', width: 72 },
      ],
    },
    {
      title: '30D+ 逾期',
      children: [
        { title: '逾期本金', dataIndex: 'dpd30Principal', key: 'dpd30Principal', width: 84, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd30Rate', key: 'dpd30Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd30Count', key: 'dpd30Count', width: 72 },
      ],
    },
    {
      title: '不良',
      children: [
        { title: '90D+逾期本金', dataIndex: 'dpd90Principal', key: 'dpd90Principal', width: 92, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd90Rate', key: 'dpd90Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd90Count', key: 'dpd90Count', width: 72 },
      ],
    },
  ];

  const bucketTitleMap: Record<'creditRange' | 'pricingRange' | 'repayment', string> = {
    creditRange: '额度区间',
    pricingRange: '定价区间',
    repayment: '还款方式',
  };

  const drilldownVintageColumns: ColumnsType<RiskDrilldownVintageRow> = [
    { title: bucketTitleMap[drilldownDimension], dataIndex: 'bucket', key: 'bucket', width: 130 },
    ...Array.from({ length: 13 }, (_, index) => ({
      title: `MOB${index}`,
      dataIndex: `mob${index}`,
      key: `mob${index}`,
      width: 90,
      render: (value: number) => (typeof value === 'number' ? <span style={{ color: vintageRateColor(value), fontWeight: 600 }}>{(value * 100).toFixed(2)}%</span> : '-'),
    })),
  ];

  const drilldownColumns: ColumnsType<RiskDrilldownRow> = [
    { title: bucketTitleMap[drilldownDimension], dataIndex: 'bucket', key: 'bucket', width: 96 },
    { title: '放款金额', dataIndex: 'loanAmount', key: 'loanAmount', width: 88, render: (v) => formatAmount(v) },
    { title: '在贷余额', dataIndex: 'balance', key: 'balance', width: 88, render: (v) => formatAmount(v) },
    { title: '在贷人数', dataIndex: 'loanCount', key: 'loanCount', width: 76, render: (v) => v.toLocaleString() },
    { title: '平均额度', dataIndex: 'avgCredit', key: 'avgCredit', width: 80, render: (v) => formatAmount(v) },
    { title: '平均定价', dataIndex: 'avgPricing', key: 'avgPricing', width: 76, render: (v) => formatPercent(v) },
    {
      title: '3D+ 逾期',
      children: [
        { title: '逾期本金', dataIndex: 'dpd3Principal', key: 'dpd3Principal', width: 86, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd3Rate', key: 'dpd3Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd3Count', key: 'dpd3Count', width: 72, render: (v) => v.toLocaleString() },
      ],
    },
    {
      title: '30D+ 逾期',
      children: [
        { title: '逾期本金', dataIndex: 'dpd30Principal', key: 'dpd30Principal', width: 86, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd30Rate', key: 'dpd30Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd30Count', key: 'dpd30Count', width: 72, render: (v) => v.toLocaleString() },
      ],
    },
    {
      title: '90D+ 逾期',
      children: [
        { title: '逾期本金', dataIndex: 'dpd90Principal', key: 'dpd90Principal', width: 86, render: (v) => formatAmount(v) },
        { title: '逾期率', dataIndex: 'dpd90Rate', key: 'dpd90Rate', width: 72, render: (v) => formatPercent(v) },
        { title: '逾期人数', dataIndex: 'dpd90Count', key: 'dpd90Count', width: 72, render: (v) => v.toLocaleString() },
      ],
    },
  ];

  const overallRiskRateOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let content = `${params[0]?.axisValue || ''}<br/>`;
        params.forEach((p: any) => {
          content += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
        });
        return content;
      },
    },
    legend: { data: ['3D+逾期率', '30D+逾期率', '90D+逾期率'], bottom: 0 },
    grid: { left: 50, right: 20, top: 30, bottom: 45 },
    xAxis: {
      type: 'category' as const,
      data: detailData.map((item) => item.period),
      axisLabel: buildXAxisLabelDensity(detailData.length),
    },
    yAxis: {
      type: 'value' as const,
      name: '逾期率',
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    },
    series: [
      { name: '3D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd3Rate), itemStyle: { color: '#22c55e' } },
      { name: '30D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd30Rate), itemStyle: { color: '#f59e0b' } },
      { name: '90D+逾期率', type: 'line', smooth: true, showSymbol: false, data: detailData.map((item) => item.dpd90Rate), itemStyle: { color: '#ef4444' } },
    ],
  };

  const overallVintageOption = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let content = `${params[0]?.axisValue || ''}<br/>`;
        params.forEach((p: any) => {
          content += `${p.marker} ${p.seriesName}: ${(p.value * 100).toFixed(2)}%<br/>`;
        });
        return content;
      },
    },
    color: chartSeries,
    legend: { data: activeVintageMobs.map((mob) => `MOB${mob}`), bottom: 0 },
    grid: { left: 50, right: 20, top: 30, bottom: 45 },
    xAxis: {
      type: 'category' as const,
      data: cohorts,
      axisLabel: buildXAxisLabelDensity(cohorts.length),
    },
    yAxis: {
      type: 'value' as const,
      name: 'Vintage逾期率',
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(1)}%` },
    },
    series: activeVintageMobs.map((mob, index) => ({
      name: `MOB${mob}`,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: vintageTableData.map((item) => (item[`mob${mob}`] as number) ?? 0),
      itemStyle: { color: chartSeries[index % chartSeries.length] },
    })),
  };

  return (
    <div>
      <Tabs
        defaultActiveKey="vintage"
        items={[
          {
            key: 'vintage',
            label: 'Vintage',
            children: (
              <>
                <div className="risk-section">
                  <div className="section-title">Vintage总体概览</div>
                  <div className="chart-card">
                    <div className="chart-title chart-title-inline-logic">
                      <span className="chart-title-main">总体Vintage趋势</span>
                      <Select
                        mode="multiple"
                        options={mobOptions}
                        value={activeVintageMobs}
                        onChange={(value) => setSelectedVintageMobs(value.map((mob) => Number(mob)))}
                        maxTagCount="responsive"
                        style={{ minWidth: 260 }}
                      />
                    </div>
                    <ReactECharts option={overallVintageOption} notMerge style={{ height: 280 }} />
                  </div>
                </div>

                <div className="risk-main risk-main-compact">
                  <div className="chart-card">
                    <div className="chart-title">总体Vintage</div>
                    <Table
                      columns={mobColumns}
                      dataSource={vintageTableData}
                      pagination={false}
                      size="small"
                      scroll={{ x: 1100 }}
                      rowKey="cohort"
                      onRow={(record) => ({ onClick: () => setSelectedLoanMonth(record.cohort) })}
                      rowClassName={(record) => (record.cohort === selectedLoanMonth ? 'risk-row-selected' : '')}
                    />
                  </div>
                </div>

                <div className="risk-section risk-section-compact-top">
                  <div className="section-title">Vintage明细分析</div>
                  <div className="chart-card">
                    <Space size="large" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                      <Space>
                        <span style={{ fontWeight: 600 }}>当前放款月：</span>
                        <span style={{ fontWeight: 700, color: '#22c55e' }}>{selectedLoanMonth}</span>
                      </Space>
                      <Space>
                        <span style={{ fontWeight: 600 }}>分析维度：</span>
                        <Radio.Group
                          className="risk-drilldown-radio"
                          value={drilldownDimension}
                          onChange={(e) => setDrilldownDimension(e.target.value)}
                          optionType="button"
                          buttonStyle="solid"
                        >
                          <Radio.Button value="creditRange">额度</Radio.Button>
                          <Radio.Button value="pricingRange">定价</Radio.Button>
                          <Radio.Button value="repayment">还款方式</Radio.Button>
                        </Radio.Group>
                      </Space>
                    </Space>

                    <Table<RiskDrilldownVintageRow>
                      columns={drilldownVintageColumns}
                      dataSource={drilldownVintageData}
                      rowKey="key"
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 1300 }}
                    />
                  </div>
                </div>
              </>
            ),
          },
          {
            key: 'overdue',
            label: '逾期',
            children: (
              <>
                <div className="risk-section">
                  <div className="section-title">逾期总体概览</div>
                  <div className="chart-card">
                    <div className="chart-title">总体逾期率趋势</div>
                    <ReactECharts option={overallRiskRateOption} style={{ height: 280 }} />
                  </div>
                </div>

                <div className="risk-main risk-main-compact">
                  <div className="chart-card">
                    <div className="chart-title">总体逾期</div>
                    <Table<RiskDetailRow>
                      columns={detailColumns}
                      dataSource={detailData}
                      rowKey="period"
                      scroll={{ x: 1420 }}
                      pagination={false}
                      size="small"
                      bordered
                      onRow={(record) => ({ onClick: () => setSelectedLoanMonth(record.period) })}
                      rowClassName={(record) => (record.period === selectedLoanMonth ? 'risk-row-selected' : '')}
                    />
                  </div>
                </div>

                <div className="risk-section risk-section-compact-top">
                  <div className="section-title">逾期明细分析</div>
                  <div className="chart-card">
                    <Space size="large" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                      <Space>
                        <span style={{ fontWeight: 600 }}>当前放款月：</span>
                        <span style={{ fontWeight: 700, color: '#22c55e' }}>{selectedLoanMonth}</span>
                      </Space>
                      <Space>
                        <span style={{ fontWeight: 600 }}>分析维度：</span>
                        <Radio.Group
                          className="risk-drilldown-radio"
                          value={drilldownDimension}
                          onChange={(e) => setDrilldownDimension(e.target.value)}
                          optionType="button"
                          buttonStyle="solid"
                        >
                          <Radio.Button value="creditRange">额度</Radio.Button>
                          <Radio.Button value="pricingRange">定价</Radio.Button>
                          <Radio.Button value="repayment">还款方式</Radio.Button>
                        </Radio.Group>
                      </Space>
                    </Space>

                    <Table<RiskDrilldownRow>
                      columns={drilldownColumns}
                      dataSource={drilldownData}
                      rowKey="key"
                      pagination={false}
                      size="small"
                      bordered
                      scroll={{ x: 1460 }}
                    />
                  </div>
                </div>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default RiskModule;
