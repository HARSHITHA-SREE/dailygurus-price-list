'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CategorizedData, PriceStats, PriceDateInfo } from '@/lib/types';
import { formatDateLong, formatDateShort, formatPriceString } from '@/lib/price-formatter';
import { ProduceThumbnail } from '@/lib/produce-icons';
import { PriceTrendChart } from '@/components/PriceTrendChart';

interface HistoryViewProps {
  initialData: CategorizedData;
  selectedDate: string;
  latestDate: string;
  dateInfo: PriceDateInfo;
  stats: PriceStats;
  publishedDates: Array<{ price_date: string; item_count: number; is_published: number; notes: string }>;
  initialProductId?: string;
  initialFrom?: string;
  initialTo?: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  initialData,
  selectedDate,
  latestDate,
  dateInfo,
  stats,
  publishedDates,
  initialProductId,
  initialFrom,
  initialTo,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize all accordions open
  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    const allSubs = [
      ...(initialData.vegetables?.subcategories || []),
      ...(initialData.fruits?.subcategories || []),
    ];
    allSubs.forEach(sub => {
      initialOpen[sub.slug] = true;
    });
    setOpenAccordions(initialOpen);
  }, [initialData]);

  // Toggle single accordion
  const toggleAccordion = (slug: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  // Toggle all Vegetables
  const areAllVegOpen = useMemo(() => {
    const vegSubs = initialData.vegetables?.subcategories || [];
    return vegSubs.every(sub => openAccordions[sub.slug]);
  }, [initialData.vegetables, openAccordions]);

  const toggleAllVeg = () => {
    const newState = !areAllVegOpen;
    setOpenAccordions(prev => {
      const updated = { ...prev };
      (initialData.vegetables?.subcategories || []).forEach(sub => {
        updated[sub.slug] = newState;
      });
      return updated;
    });
  };

  // Toggle all Fruits
  const areAllFruitOpen = useMemo(() => {
    const fruitSubs = initialData.fruits?.subcategories || [];
    return fruitSubs.every(sub => openAccordions[sub.slug]);
  }, [initialData.fruits, openAccordions]);

  const toggleAllFruits = () => {
    const newState = !areAllFruitOpen;
    setOpenAccordions(prev => {
      const updated = { ...prev };
      (initialData.fruits?.subcategories || []).forEach(sub => {
        updated[sub.slug] = newState;
      });
      return updated;
    });
  };

  // Live Search
  const cleanSearch = searchTerm.trim().toLowerCase();

  const filteredVegetables = useMemo(() => {
    if (!cleanSearch) return initialData.vegetables?.subcategories || [];

    return (initialData.vegetables?.subcategories || [])
      .map(sub => {
        const matchingProducts = (sub.products || []).filter(p => {
          const matchEn = p.name.toLowerCase().includes(cleanSearch);
          const matchTa = (p.tamil_name || '').toLowerCase().includes(cleanSearch);
          const matchSub = sub.name.toLowerCase().includes(cleanSearch);
          const matchPrice = (p.price || '').toLowerCase().includes(cleanSearch);
          return matchEn || matchTa || matchSub || matchPrice;
        });

        return {
          ...sub,
          products: matchingProducts,
        };
      })
      .filter(sub => (sub.products || []).length > 0);
  }, [initialData.vegetables, cleanSearch]);

  const filteredFruits = useMemo(() => {
    if (!cleanSearch) return initialData.fruits?.subcategories || [];

    return (initialData.fruits?.subcategories || [])
      .map(sub => {
        const matchingProducts = (sub.products || []).filter(p => {
          const matchEn = p.name.toLowerCase().includes(cleanSearch);
          const matchTa = (p.tamil_name || '').toLowerCase().includes(cleanSearch);
          const matchSub = sub.name.toLowerCase().includes(cleanSearch);
          const matchPrice = (p.price || '').toLowerCase().includes(cleanSearch);
          return matchEn || matchTa || matchSub || matchPrice;
        });

        return {
          ...sub,
          products: matchingProducts,
        };
      })
      .filter(sub => (sub.products || []).length > 0);
  }, [initialData.fruits, cleanSearch]);

  const totalFilteredCount = useMemo(() => {
    let count = 0;
    filteredVegetables.forEach(s => (count += (s.products || []).length));
    filteredFruits.forEach(s => (count += (s.products || []).length));
    return count;
  }, [filteredVegetables, filteredFruits]);

  // Text Highlighting Helper
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Page Hero */}
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">Historical Price Archives</h1>
          <p className="page-hero-desc">
            Explore daily wholesale rates recorded across past trading sessions in Koyambedu Market. Select a date below
            to view the complete price snapshot.
          </p>
        </div>
      </section>

      <section className="page-body-section">
        <div className="container">
          {/* Date Selector Card */}
          <div className="history-date-picker-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                📅 Select Archive Date
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => window.print()}
                  className="section-toggle-btn"
                  type="button"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Print Snapshot
                </button>
                <Link
                  href={`/?date=${selectedDate}`}
                  className="section-toggle-btn"
                  style={{
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary-dark)',
                    borderColor: 'var(--color-primary-border)',
                  }}
                >
                  Open in Full View &rarr;
                </Link>
              </div>
            </div>

            {/* Published Dates Grid */}
            <div className="history-grid-dates">
              {publishedDates.map(row => {
                const isCurr = row.price_date === selectedDate;
                const isLatest = row.price_date === latestDate;
                return (
                  <Link
                    key={row.price_date}
                    href={`/history?date=${row.price_date}`}
                    className={`history-date-card ${isCurr ? 'active' : ''}`}
                  >
                    <div>
                      <div className="history-date-card-title">{formatDateShort(row.price_date)}</div>
                      <div className="history-date-card-count">{row.item_count || 73} items priced</div>
                    </div>
                    {isLatest && (
                      <span className="pulse-indicator" style={{ fontSize: '11px', padding: '2px 6px' }}>
                        Latest
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Historical Price Trend Graph */}
          <PriceTrendChart
            publishedDates={publishedDates}
            initialProductId={initialProductId}
            initialFrom={initialFrom}
            initialTo={initialTo}
          />

          {/* Selected Date Snapshot Header */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              marginBottom: '28px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-primary)',
                  }}
                >
                  Snapshot View
                </span>
                <h2
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: 'var(--color-text-main)',
                    marginTop: '4px',
                  }}
                >
                  {formatDateLong(selectedDate)}
                </h2>
                {dateInfo.notes && (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
                    📝 <em>{dateInfo.notes}</em>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div
                  style={{
                    background: 'var(--color-bg-page)',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                    {stats.veg_count}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Vegetables
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--color-bg-page)',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-fruit-primary)' }}>
                    {stats.fruit_count}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    Fruits
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar for this Snapshot */}
          <div className="search-section" style={{ position: 'static', marginBottom: '24px', padding: 0 }}>
            <div className="search-container-box">
              <div className="search-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                id="priceSearchInput"
                className="search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search produce in this snapshot..."
                aria-label="Search produce items and rates"
              />
              {cleanSearch && (
                <span className="search-count-badge" style={{ display: 'inline-block' }}>
                  {totalFilteredCount} {totalFilteredCount === 1 ? 'item' : 'items'} found
                </span>
              )}
              {cleanSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  style={{ display: 'flex' }}
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Empty Search State */}
          {cleanSearch && totalFilteredCount === 0 && (
            <div className="no-results-box is-visible" id="noSearchResults">
              <div className="no-results-icon">🔍</div>
              <h4 className="no-results-title">No produce items found</h4>
              <p className="no-results-text">
                We couldn&apos;t find any results matching &ldquo;{searchTerm}&rdquo; in this archive.
              </p>
            </div>
          )}

          {/* 1. VEGETABLES SECTION */}
          {filteredVegetables.length > 0 && (
            <section id="vegetables" className="price-category-section">
              <div className="section-header-wrap">
                <div className="section-title-badge badge-veg">
                  <span>🥦</span> VEGETABLES WHOLESALE
                </div>
                <button type="button" className="section-toggle-btn" id="toggleAllVegBtn" onClick={toggleAllVeg}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                  </svg>
                  <span className="toggle-text">{areAllVegOpen ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>

              <div className="accordions-list" id="vegetablesAccordions">
                {filteredVegetables.map(subcat => {
                  const isOpen = !!openAccordions[subcat.slug];
                  return (
                    <div
                      key={subcat.id}
                      className={`accordion-card ${isOpen ? 'is-open' : ''}`}
                      id={`accordion-${subcat.slug}`}
                    >
                      <button
                        className="accordion-header"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleAccordion(subcat.slug)}
                      >
                        <div className="accordion-title-wrap">
                          <span className="accordion-icon">{subcat.icon || '🥦'}</span>
                          <span className="accordion-title">{subcat.name}</span>
                          <span className="accordion-badge">{(subcat.products || []).length} items</span>
                        </div>
                        <div className="accordion-chevron">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </button>

                      <div className="accordion-content">
                        <table className="price-table">
                          <thead className="desktop-only-thead">
                            <tr>
                              <th>Produce Item</th>
                              <th className="desktop-unit-col">Unit</th>
                              <th style={{ textAlign: 'right' }}>Wholesale Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(subcat.products || []).map(prod => (
                              <tr key={prod.id} className="produce-row">
                                <td className="item-name-cell">
                                  <div className="produce-item-flex">
                                    <div className="produce-img-wrap">
                                      <ProduceThumbnail
                                        iconName={prod.icon}
                                        imageUrl={prod.image_url}
                                        name={prod.name}
                                        size={36}
                                      />
                                    </div>
                                    <div className="produce-name-details">
                                      <div className="produce-title-row">
                                        <span className="produce-name-en">
                                          {highlightText(prod.name, cleanSearch)}
                                        </span>
                                      </div>
                                      {prod.tamil_name && (
                                        <span className="produce-name-ta" lang="ta">
                                          {highlightText(prod.tamil_name, cleanSearch)}
                                        </span>
                                      )}
                                      <div className="produce-meta-mobile">
                                        {(prod.price_unit || prod.default_unit) && (
                                          <span className="unit-tag-mobile">
                                            {prod.price_unit || prod.default_unit}
                                          </span>
                                        )}
                                        {prod.price_notes && (
                                          <span className="produce-notes-pill">
                                            {prod.price_notes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="item-unit-cell desktop-unit-col">
                                  <span className="unit-tag">{prod.price_unit || prod.default_unit || 'kg'}</span>
                                </td>
                                <td className="item-price-cell">
                                  <div className="price-box-wrapper">
                                    <span className="price-value">{formatPriceString(prod.price)}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. FRUITS SECTION */}
          {filteredFruits.length > 0 && (
            <section id="fruits" className="price-category-section" style={{ marginTop: '36px' }}>
              <div className="section-header-wrap">
                <div className="section-title-badge badge-fruit">
                  <span>🍎</span> FRUITS WHOLESALE
                </div>
                <button
                  type="button"
                  className="section-toggle-btn btn-fruit"
                  id="toggleAllFruitBtn"
                  onClick={toggleAllFruits}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                  </svg>
                  <span className="toggle-text">{areAllFruitOpen ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>

              <div className="accordions-list card-fruit-theme" id="fruitsAccordions">
                {filteredFruits.map(subcat => {
                  const isOpen = !!openAccordions[subcat.slug];
                  return (
                    <div
                      key={subcat.id}
                      className={`accordion-card ${isOpen ? 'is-open' : ''}`}
                      id={`accordion-${subcat.slug}`}
                    >
                      <button
                        className="accordion-header"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleAccordion(subcat.slug)}
                      >
                        <div className="accordion-title-wrap">
                          <span className="accordion-icon">{subcat.icon || '🍎'}</span>
                          <span className="accordion-title">{subcat.name}</span>
                          <span className="accordion-badge">{(subcat.products || []).length} items</span>
                        </div>
                        <div className="accordion-chevron">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </button>

                      <div className="accordion-content">
                        <table className="price-table">
                          <thead className="desktop-only-thead">
                            <tr>
                              <th>Produce Item</th>
                              <th className="desktop-unit-col">Unit</th>
                              <th style={{ textAlign: 'right' }}>Wholesale Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(subcat.products || []).map(prod => (
                              <tr key={prod.id} className="produce-row">
                                <td className="item-name-cell">
                                  <div className="produce-item-flex">
                                    <div className="produce-img-wrap">
                                      <ProduceThumbnail
                                        iconName={prod.icon}
                                        imageUrl={prod.image_url}
                                        name={prod.name}
                                        size={36}
                                      />
                                    </div>
                                    <div className="produce-name-details">
                                      <div className="produce-title-row">
                                        <span className="produce-name-en">
                                          {highlightText(prod.name, cleanSearch)}
                                        </span>
                                      </div>
                                      {prod.tamil_name && (
                                        <span className="produce-name-ta" lang="ta">
                                          {highlightText(prod.tamil_name, cleanSearch)}
                                        </span>
                                      )}
                                      <div className="produce-meta-mobile">
                                        {(prod.price_unit || prod.default_unit) && (
                                          <span className="unit-tag-mobile">
                                            {prod.price_unit || prod.default_unit}
                                          </span>
                                        )}
                                        {prod.price_notes && (
                                          <span className="produce-notes-pill">
                                            {prod.price_notes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="item-unit-cell desktop-unit-col">
                                  <span className="unit-tag">{prod.price_unit || prod.default_unit || 'kg'}</span>
                                </td>
                                <td className="item-price-cell">
                                  <div className="price-box-wrapper">
                                    <span className="price-value">{formatPriceString(prod.price)}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  );
};
