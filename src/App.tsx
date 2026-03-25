import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Tabs, Select, Avatar, ConfigProvider } from 'antd';
import { UserOutlined, BankOutlined, AppstoreOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { productOptions, institutionCascade } from './mock/data';
import BusinessModule from './components/BusinessModule';
import RiskModule from './components/RiskModule';
import FinanceModule from './components/FinanceModule';
import type { GlobalFilter } from './types';

const App: React.FC = () => {
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter>({
    products: [productOptions[0].value],
    banks: [institutionCascade[0].bankValue],
    secondaryInstitutions: [],
    tertiaryInstitutions: [],
  });
  const [activeTab, setActiveTab] = useState('business');

  const bankOptions = useMemo(
    () => institutionCascade.map((item) => ({ label: item.bank, value: item.bankValue })),
    []
  );

  const secondaryOptions = useMemo(() => {
    return institutionCascade
      .filter((item) => globalFilter.banks.includes(item.bankValue))
      .flatMap((item) =>
        item.secondaries.map((secondary) => ({
          label: `${item.bank} - ${secondary.name}`,
          value: secondary.value,
        }))
      );
  }, [globalFilter.banks]);

  const tertiaryOptions = useMemo(() => {
    const selectedBank = institutionCascade.find((item) => globalFilter.banks.includes(item.bankValue));
    if (!selectedBank) return [];
    
    // 如果二级机构为空，显示所有三级机构
    if (globalFilter.secondaryInstitutions.length === 0) {
      return selectedBank.secondaries.flatMap((secondary) =>
        secondary.tertiaries.map((tertiary) => ({
          label: `${secondary.name} - ${tertiary.name}`,
          value: tertiary.value,
        }))
      );
    }
    
    // 否则只显示选中的二级机构下的三级机构
    return selectedBank.secondaries
      .filter((secondary) => globalFilter.secondaryInstitutions.includes(secondary.value))
      .flatMap((secondary) =>
        secondary.tertiaries.map((tertiary) => ({
          label: `${secondary.name} - ${tertiary.name}`,
          value: tertiary.value,
        }))
      );
  }, [globalFilter.banks, globalFilter.secondaryInstitutions]);

  useEffect(() => {
    const validSecondaryValues = new Set(secondaryOptions.map((item) => item.value));
    const validTertiaryValues = new Set(tertiaryOptions.map((item) => item.value));
    setGlobalFilter((prev) => {
      const nextSecondary = prev.secondaryInstitutions.filter((value) => validSecondaryValues.has(value));
      const nextTertiary = prev.tertiaryInstitutions.filter((value) => validTertiaryValues.has(value));
      const secondaryUnchanged =
        nextSecondary.length === prev.secondaryInstitutions.length &&
        nextSecondary.every((value, index) => value === prev.secondaryInstitutions[index]);
      const tertiaryUnchanged =
        nextTertiary.length === prev.tertiaryInstitutions.length &&
        nextTertiary.every((value, index) => value === prev.tertiaryInstitutions[index]);

      if (secondaryUnchanged && tertiaryUnchanged) {
        return prev;
      }

      return {
        ...prev,
        secondaryInstitutions: nextSecondary,
        tertiaryInstitutions: nextTertiary,
      };
    });
  }, [secondaryOptions, tertiaryOptions]);

  const handleProductChange = useCallback((value: string) => {
    setGlobalFilter((prev) => ({ ...prev, products: [value] }));
  }, []);

  const handleBankChange = useCallback((value: string) => {
    setGlobalFilter((prev) => ({ 
      ...prev, 
      banks: [value],
      secondaryInstitutions: [],
      tertiaryInstitutions: [],
    }));
  }, []);

  const handleSecondaryChange = useCallback((value: string[]) => {
    setGlobalFilter((prev) => ({ 
      ...prev, 
      secondaryInstitutions: value || [],
      tertiaryInstitutions: [],
    }));
  }, []);

  const handleTertiaryChange = useCallback((value: string[]) => {
    setGlobalFilter((prev) => ({ ...prev, tertiaryInstitutions: value || [] }));
  }, []);

  const tabItems = [
    {
      key: 'business',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          业务数据
        </span>
      ),
      children: <BusinessModule globalFilter={globalFilter} />,
    },
    {
      key: 'risk',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          风险数据
        </span>
      ),
      children: <RiskModule globalFilter={globalFilter} />,
    },
    {
      key: 'finance',
      label: (
        <span>
          <AppstoreOutlined style={{ marginRight: 6 }} />
          财务数据
        </span>
      ),
      children: <FinanceModule globalFilter={globalFilter} />,
    },
  ];

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#22c55e',
          colorSuccess: '#22c55e',
          colorWarning: '#f59e0b',
          colorError: '#dc2626',
          borderRadius: 12,
          borderRadiusLG: 14,
          fontSize: 17,
        },
        components: {
          Tabs: {
            itemActiveColor: '#22c55e',
            itemHoverColor: '#22c55e',
            inkBarColor: '#22c55e',
          },
          Table: {
            headerBg: '#f8fafc',
            rowHoverBg: '#f1fbf5',
            borderColor: '#e5e7eb',
          },
          Radio: {
            buttonSolidCheckedBg: '#22c55e',
            buttonSolidCheckedHoverBg: '#16a34a',
          },
          Select: {
            optionSelectedBg: '#ecfdf3',
          },
          Button: {
            primaryShadow: 'none',
          },
        },
      }}
    >
      <div className="header-bar">
        <div className="header-left">
          <div className="header-brand">
            <span className="header-title">信贷业务驾驶舱</span>
            <span className="header-subtitle">业务 · 风险 · 财务一体化监控</span>
          </div>
          <Select
            options={productOptions}
            value={globalFilter.products[0]}
            onChange={handleProductChange}
            placeholder="产品维度"
            style={{ minWidth: 200 }}
          />
          <Select
            options={bankOptions}
            value={globalFilter.banks[0]}
            onChange={handleBankChange}
            placeholder="银行维度"
            style={{ minWidth: 220 }}
          />
          <Select
            options={secondaryOptions}
            value={globalFilter.secondaryInstitutions}
            onChange={handleSecondaryChange}
            mode="multiple"
            maxTagCount="responsive"
            placeholder="二级机构"
            style={{ minWidth: 220 }}
            disabled={globalFilter.banks.length === 0}
            allowClear
          />
          <Select
            options={tertiaryOptions}
            value={globalFilter.tertiaryInstitutions}
            onChange={handleTertiaryChange}
            mode="multiple"
            maxTagCount="responsive"
            placeholder="三级机构"
            style={{ minWidth: 220 }}
            allowClear
          />
        </div>
        <div className="header-right">
          <BankOutlined style={{ fontSize: 16 }} />
          <span>管理员</span>
          <Avatar size={32} icon={<UserOutlined />} />
        </div>
      </div>

      <div className="main-content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="dashboard-tabs"
          size="large"
        />
      </div>
    </ConfigProvider>
  );
};

export default App;
