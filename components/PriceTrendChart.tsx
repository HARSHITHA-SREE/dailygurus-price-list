'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendDataPoint, TrendProduct } from '@/lib/types';
import { formatRupee } from '@/lib/price-parser';

// Register Chart.js components (tree-shaking)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProductOption {
  id: number;
  name: string;
  tamil_name: string;
  default_unit: string;
  category_id: number;
  subcategory_id: number | null;
}

interface SubcategoryOption {
  id: number;
  name: string;
  category_id: number;
}

interface CategoryOption {
  id: number;
  name: string;
  category_type: string;
}

interface PriceTrendChartProps {
  publishedDates: Array<{ price_date: string }>;
  initialProductId?: string;
  initialFrom?: string;
  initialTo?: string;
}

type FetchState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export const PriceTrendChart: React.FC<PriceTrendChartProps> = ({
  publishedDates,
  initialProductId,
  initialFrom,
  initialTo,
}) => {
  // Compute date bounds from published dates
  const sortedDates = useMemo(() => {
    return [...publishedDates]
      .map(d => d.price_date)
      .sort((a, b) => a.localeCompare(b));
  }, [publishedDates]);

  const earliestDate = sortedDates[0] || '';
  const latestDate = sortedDates[sortedDates.length - 1] || '';

  // State
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [fromDate, setFromDate] = useState<string>(initialFrom || earliestDate);
  const [toDate, setToDate] = useState<string>(initialTo || latestDate);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [productInfo, setProductInfo] = useState<TrendProduct | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/history/products');
        const json = await res.json();
        if (json.success) {
          setProducts(json.products || []);
          setSubcategories(json.subcategories || []);
          setCategories(json.categories || []);
          // Auto-select first product if none specified
          if (!initialProductId && json.products?.length > 0) {
            setSelectedProductId(String(json.products[0].id));
          }
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setProductsLoading(false);
      }
    }
    loadProducts();
  }, [initialProductId]);

  // Update dates when published dates change
  useEffect(() => {
    if (!initialFrom && earliestDate) setFromDate(earliestDate);
    if (!initialTo && latestDate) setToDate(latestDate);
  }, [earliestDate, latestDate, initialFrom, initialTo]);

  // Fetch trend data
  const fetchTrend = useCallback(async () => {
    // Validate
    if (!selectedProductId) {
      setValidationError('Please select a product.');
      return;
    }
    if (!fromDate || !toDate) {
      setValidationError('Please select both From and To dates.');
      return;
    }
    if (fromDate > toDate) {
      setValidationError('From Date cannot be after To Date.');
      return;
    }
    setValidationError('');
    setFetchState('loading');
    setErrorMessage('');

    try {
      const params = new URLSearchParams({
        product_id: selectedProductId,
        from: fromDate,
        to: toDate,
      });
      const res = await fetch(`/api/history/trend?${params}`);
      const json = await res.json();

      if (!json.success) {
        setFetchState('error');
        setErrorMessage(json.error || 'Failed to fetch trend data');
        return;
      }

      setProductInfo(json.product);
      setTrendData(json.data || []);

      const graphable = (json.data || []).filter((d: TrendDataPoint) => d.type !== 'ungraphable');
      setFetchState(graphable.length === 0 ? 'empty' : 'success');

      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set('product', selectedProductId);
      url.searchParams.set('from', fromDate);
      url.searchParams.set('to', toDate);
      window.history.replaceState({}, '', url.toString());
    } catch (err) {
      console.error('Trend fetch error:', err);
      setFetchState('error');
      setErrorMessage('Unable to load price trend. Please try again.');
    }
  }, [selectedProductId, fromDate, toDate]);

  // Auto-fetch if initial params provided
  useEffect(() => {
    if (initialProductId && initialFrom && initialTo && !productsLoading) {
      fetchTrend();
    }
  }, [initialProductId, initialFrom, initialTo, productsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick range handlers
  const setQuickRange = (days: number | 'all') => {
    if (days === 'all') {
      setFromDate(earliestDate);
      setToDate(latestDate);
    } else {
      const to = latestDate || new Date().toISOString().split('T')[0];
      const fromD = new Date(to);
      fromD.setDate(fromD.getDate() - days);
      const from = fromD.toISOString().split('T')[0];
      setFromDate(from);
      setToDate(to);
    }
  };

  // Determine if data is range-type or single-type
  const graphableData = useMemo(
    () => trendData.filter(d => d.type !== 'ungraphable'),
    [trendData]
  );

  const hasRangeData = useMemo(
    () => graphableData.some(d => d.type === 'range'),
    [graphableData]
  );

  // Summary stats
  const summary = useMemo(() => {
    if (graphableData.length === 0) return null;

    const minValues = graphableData.map(d => d.min!).filter(v => v !== undefined);
    const maxValues = graphableData.map(d => d.max!).filter(v => v !== undefined);

    if (minValues.length === 0) return null;

    const opening = minValues[0];
    const current = minValues[minValues.length - 1];
    const high = Math.max(...maxValues);
    const low = Math.min(...minValues);
    const change = current - opening;
    const changePct = opening !== 0 ? ((change / opening) * 100) : 0;

    // Only show percentage for single-type consistently
    const isConsistent = graphableData.every(d => d.type === graphableData[0].type);

    return {
      opening,
      current,
      high,
      low,
      change,
      changePct,
      isConsistent,
      isRange: hasRangeData,
    };
  }, [graphableData, hasRangeData]);

  // Format date for chart label
  const formatChartDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    } catch {
      return dateStr;
    }
  };

  // Build Chart.js data
  const chartData: ChartData<'line'> = useMemo(() => {
    const labels = trendData.map(d => formatChartDate(d.date));

    if (hasRangeData) {
      // Two series: Min and Max
      return {
        labels,
        datasets: [
          {
            label: 'Maximum',
            data: trendData.map(d => (d.type !== 'ungraphable' && d.max !== undefined) ? d.max : null),
            borderColor: '#047857',
            backgroundColor: 'rgba(4, 120, 87, 0.08)',
            pointBackgroundColor: '#047857',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            tension: 0.3,
            fill: '+1',
            spanGaps: false,
          },
          {
            label: 'Minimum',
            data: trendData.map(d => (d.type !== 'ungraphable' && d.min !== undefined) ? d.min : null),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            pointBackgroundColor: '#059669',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2.5,
            tension: 0.3,
            fill: false,
            spanGaps: false,
          },
        ],
      };
    }

    // Single series
    return {
      labels,
      datasets: [
        {
          label: 'Price',
          data: trendData.map(d => (d.type !== 'ungraphable' && d.min !== undefined) ? d.min : null),
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          pointBackgroundColor: '#059669',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          spanGaps: false,
        },
      ],
    };
  }, [trendData, hasRangeData]);

  // Chart options
  const chartOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: hasRangeData,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { size: 13, family: "'Plus Jakarta Sans', sans-serif", weight: 'bold' as const },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { size: 13, family: "'Plus Jakarta Sans', sans-serif", weight: 'bold' as const },
        bodyFont: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        displayColors: hasRangeData,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const point = trendData[idx];
            if (!point) return '';
            // Format full date for tooltip
            try {
              const [y, m, d] = point.date.split('-').map(Number);
              const date = new Date(Date.UTC(y, m - 1, d));
              return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              });
            } catch {
              return point.date;
            }
          },
          afterTitle: () => {
            return productInfo ? productInfo.name : '';
          },
          label: (context) => {
            const idx = context.dataIndex;
            const point = trendData[idx];
            if (!point || point.type === 'ungraphable') return 'No data';

            const val = context.parsed.y;
            if (val === null) return 'No data';

            const label = context.dataset.label || 'Price';
            const formatted = formatRupee(val);
            const unitStr = point.unit ? ` per ${point.unit}` : '';
            return `${label}: ${formatted}${unitStr}`;
          },
          afterBody: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const point = trendData[idx];
            if (point?.raw && point.type !== 'ungraphable') {
              return `Raw: ${point.raw}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
          color: '#64748b',
          maxRotation: 45,
          minRotation: 0,
        },
        border: {
          color: '#e2e8f0',
        },
      },
      y: {
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
        ticks: {
          font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
          color: '#64748b',
          callback: (value) => '₹' + Number(value).toLocaleString('en-IN'),
        },
        border: {
          display: false,
        },
      },
    },
  }), [hasRangeData, trendData, productInfo]);

  // Group products by subcategory for <optgroup>
  const groupedProducts = useMemo(() => {
    const groups: Array<{ label: string; products: ProductOption[] }> = [];
    const subMap = new Map(subcategories.map(s => [s.id, s]));
    const catMap = new Map(categories.map(c => [c.id, c]));
    const grouped = new Map<string, ProductOption[]>();

    for (const p of products) {
      const sub = p.subcategory_id ? subMap.get(p.subcategory_id) : null;
      const cat = catMap.get(p.category_id);
      const key = sub ? `${cat?.name || 'Other'} > ${sub.name}` : (cat?.name || 'Other');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    }

    for (const [label, prods] of grouped) {
      groups.push({ label, products: prods });
    }

    return groups;
  }, [products, subcategories, categories]);

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: 'var(--radius-lg, 14px)',
      padding: '24px',
      marginBottom: '28px',
      boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0,0,0,0.05))',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '20px' }}>📈</span>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-main, #0f172a)',
            margin: 0,
          }}>Historical Price Trend</h3>
        </div>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted, #64748b)',
          margin: 0,
        }}>Track price movement over time for any produce item</p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '16px',
      }}>
        {/* Product Selector */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label
            htmlFor="trend-product"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-muted, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >Select Product</label>
          <select
            id="trend-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={productsLoading}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              border: '1.5px solid var(--border-color, #e2e8f0)',
              borderRadius: 'var(--radius-md, 10px)',
              background: '#ffffff',
              color: 'var(--text-main, #0f172a)',
              cursor: 'pointer',
              appearance: 'auto' as any,
              fontFamily: 'inherit',
            }}
          >
            {productsLoading ? (
              <option>Loading products...</option>
            ) : (
              <>
                <option value="">— Choose a product —</option>
                {groupedProducts.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.products.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}{p.tamil_name ? ` (${p.tamil_name})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </>
            )}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label
            htmlFor="trend-from"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-muted, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >From Date</label>
          <input
            id="trend-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              border: '1.5px solid var(--border-color, #e2e8f0)',
              borderRadius: 'var(--radius-md, 10px)',
              background: '#ffffff',
              color: 'var(--text-main, #0f172a)',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* To Date */}
        <div>
          <label
            htmlFor="trend-to"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-muted, #64748b)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '6px',
            }}
          >To Date</label>
          <input
            id="trend-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              border: '1.5px solid var(--border-color, #e2e8f0)',
              borderRadius: 'var(--radius-md, 10px)',
              background: '#ffffff',
              color: 'var(--text-main, #0f172a)',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* Quick Ranges + Update Button Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '20px',
      }}>
        {[{label: '7D', days: 7}, {label: '30D', days: 30}, {label: '90D', days: 90}, {label: 'All Time', days: 'all' as const}].map(btn => (
          <button
            key={btn.label}
            type="button"
            onClick={() => setQuickRange(btn.days)}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1.5px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              background: 'var(--bg-main, #f8fafc)',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.color = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
              e.currentTarget.style.color = 'var(--text-muted, #64748b)';
            }}
          >{btn.label}</button>
        ))}

        <button
          type="button"
          onClick={fetchTrend}
          disabled={fetchState === 'loading'}
          style={{
            marginLeft: 'auto',
            padding: '10px 24px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: 'none',
            borderRadius: 'var(--radius-md, 10px)',
            background: '#059669',
            color: '#ffffff',
            cursor: fetchState === 'loading' ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
            opacity: fetchState === 'loading' ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (fetchState !== 'loading') e.currentTarget.style.background = '#047857'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#059669'; }}
        >
          {fetchState === 'loading' ? 'Loading...' : 'Update Graph'}
        </button>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div style={{
          padding: '10px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '16px',
        }}>{validationError}</div>
      )}

      {/* Loading State */}
      {fetchState === 'loading' && (
        <div style={{
          height: '300px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: 'var(--text-muted, #64748b)',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#059669',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading price trend...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty State */}
      {fetchState === 'empty' && (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          color: 'var(--text-muted, #64748b)',
        }}>
          <span style={{ fontSize: '2rem' }}>📭</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
            No historical price data available for this date range.
          </p>
        </div>
      )}

      {/* Error State */}
      {fetchState === 'error' && (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          color: '#dc2626',
        }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
            {errorMessage || 'Unable to load price trend. Please try again.'}
          </p>
        </div>
      )}

      {/* Chart */}
      {fetchState === 'success' && (
        <>
          <div style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(250px, 40vw, 420px)',
          }}>
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>

          {/* Summary Stats */}
          {summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginTop: '20px',
              padding: '16px',
              background: 'var(--bg-main, #f8fafc)',
              borderRadius: 'var(--radius-md, 10px)',
              border: '1px solid var(--border-color, #e2e8f0)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {summary.isRange ? 'Current (Min)' : 'Current'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                  {formatRupee(summary.current)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Opening
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '2px' }}>
                  {formatRupee(summary.opening)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  High
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                  {formatRupee(summary.high)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Low
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  {formatRupee(summary.low)}
                </div>
              </div>
              {summary.isConsistent && !summary.isRange && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Change
                  </div>
                  <div style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: summary.change >= 0 ? '#059669' : '#dc2626',
                    marginTop: '2px',
                  }}>
                    {summary.change >= 0 ? '+' : ''}{formatRupee(summary.change)}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: '4px' }}>
                      ({summary.change >= 0 ? '+' : ''}{summary.changePct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Idle state message */}
      {fetchState === 'idle' && !productsLoading && (
        <div style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          color: 'var(--text-muted, #64748b)',
        }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
            Select a product and date range, then click <strong>Update Graph</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
