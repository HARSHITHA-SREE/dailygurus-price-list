'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CategorizedData, Subcategory, ProductPriceItem, PriceStats, PriceDateInfo } from '@/lib/types';
import { formatDateLong, formatDateShort, formatPriceString } from '@/lib/price-formatter';
import { ProduceThumbnail } from '@/lib/produce-icons';
import { trackEvent } from '@/lib/analytics';

interface PriceListViewProps {
  initialData: CategorizedData;
  initialDate: string;
  initialDateInfo: PriceDateInfo;
  initialStats: PriceStats;
  isHistorical?: boolean;
}

export const PriceListView: React.FC<PriceListViewProps> = ({
  initialData,
  initialDate,
  initialDateInfo,
  initialStats,
  isHistorical = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('vegetables');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize smart accordion states (first 2 open on mobile, all open on desktop)
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      const initialOpen: Record<string, boolean> = {};
      const allSubs = [
        ...(initialData.vegetables?.subcategories || []),
        ...(initialData.fruits?.subcategories || []),
      ];

      allSubs.forEach((sub, idx) => {
        if (mobile) {
          // Open first 2 vegetable subcategories on mobile
          initialOpen[sub.slug] = idx < 2;
        } else {
          // Open all on desktop
          initialOpen[sub.slug] = true;
        }
      });

      setOpenAccordions(initialOpen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [initialData]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Track search query with 800ms debounce
  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) return;

    const timer = setTimeout(() => {
      trackEvent('search', {
        search_term: query,
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Toggle single accordion
  const toggleAccordion = (slug: string) => {
    setOpenAccordions(prev => {
      const nextState = !prev[slug];
      if (nextState) {
        trackEvent('price_category_view', { category_name: slug });
      }
      return {
        ...prev,
        [slug]: nextState,
      };
    });
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

  // Live Dual-Language Search and Filtering
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

  // When searching, auto-expand accordions that contain results
  useEffect(() => {
    if (cleanSearch) {
      const openMap: Record<string, boolean> = {};
      filteredVegetables.forEach(s => (openMap[s.slug] = true));
      filteredFruits.forEach(s => (openMap[s.slug] = true));
      setOpenAccordions(openMap);
    }
  }, [cleanSearch, filteredVegetables, filteredFruits]);

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

  // Jump Pill Click Handler
  const handlePillClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setActiveCategory(targetId);
    trackEvent('price_category_view', { category_name: targetId });

    // Make sure targeted accordion is open
    if (targetId.startsWith('accordion-')) {
      const slug = targetId.replace('accordion-', '');
      setOpenAccordions(prev => ({ ...prev, [slug]: true }));
    }

    const el = document.getElementById(targetId);
    if (el) {
      const headerOffset = 130;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-main-title">dailygurus price list</h1>
            <p className="hero-subtitle">Daily Wholesale Price List for Vegetables &amp; Fruits</p>

            {/* Compact Date Card */}
            <div className="hero-date-card">
              <div className="date-card-eyebrow">
                {isHistorical ? 'HISTORICAL MARKET PRICES' : "TODAY'S WHOLESALE PRICES"}
              </div>
              <div className="date-card-main">
                <span className="cal-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <span className="date-card-text">{formatDateLong(initialDate)}</span>
                {!isHistorical ? (
                  <span className="pulse-indicator">
                    <span className="pulse-dot"></span>
                    Updated Today
                  </span>
                ) : (
                  <span className="pulse-indicator pulse-archive">Archive View</span>
                )}
              </div>
            </div>
          </div>

          {isHistorical && (
            <div className="historical-alert-bar">
              <div className="historical-alert-text">
                ⚠️ You are viewing historical market prices for{' '}
                <strong>{formatDateShort(initialDate)}</strong>.
              </div>
              <Link href="/" className="historical-alert-btn">
                View Today&apos;s Live Rates &rarr;
              </Link>
            </div>
          )}

          {/* Hero Produce Banner (Hidden on mobile) */}
          <div className="hero-banner-card">
            <img
              src="/assets/images/hero-produce.jpg"
              alt="Fresh Farm Produce Wholesale Basket"
              width="1000"
              height="428"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Category Quick Cards (50/50 Equal Split on Mobile) */}
      <section className="quick-cards-section">
        <div className="container">
          <div className="quick-cards-grid">
            {/* Vegetables Quick Card */}
            <a
              href="#vegetables"
              className="quick-card card-veg"
              onClick={e => handlePillClick(e, 'vegetables')}
            >
              <div className="quick-card-img">
                <img
                  src="/assets/images/veg-crate.jpg"
                  alt="Vegetables Wholesale Prices"
                  width="96"
                  height="96"
                  loading="lazy"
                />
              </div>
              <div className="quick-card-body">
                <div className="quick-card-badge">🥬 VEGETABLES</div>
                <h3>Vegetables Wholesale</h3>
                <p>{initialStats.veg_count} varieties &bull; Mandi Rates</p>
                <span className="quick-card-btn">
                  View Prices{' '}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>

            {/* Fruits Quick Card */}
            <a
              href="#fruits"
              className="quick-card card-fruit"
              onClick={e => handlePillClick(e, 'fruits')}
            >
              <div className="quick-card-img">
                <img
                  src="/assets/images/fruit-basket.jpg"
                  alt="Fruits Wholesale Prices"
                  width="96"
                  height="96"
                  loading="lazy"
                />
              </div>
              <div className="quick-card-body">
                <div className="quick-card-badge badge-fruit-alt">🍎 FRUITS</div>
                <h3>Fruits Wholesale</h3>
                <p>{initialStats.fruit_count} varieties &bull; Mandi Rates</p>
                <span className="quick-card-btn">
                  View Prices{' '}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Sticky Mobile & Desktop Category Jump Bar */}
      <nav className="sticky-category-bar" id="stickyCategoryBar" aria-label="Quick Category Navigation">
        <div className="container sticky-category-container">
          <div className="category-pills-scroll">
            <a
              href="#vegetables"
              className={`cat-pill ${activeCategory === 'vegetables' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'vegetables')}
            >
              <span>🥦</span> Vegetables
            </a>
            <a
              href="#accordion-tomato"
              className={`cat-pill ${activeCategory === 'accordion-tomato' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-tomato')}
            >
              <span>🍅</span> Tomato
            </a>
            <a
              href="#accordion-onion"
              className={`cat-pill ${activeCategory === 'accordion-onion' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-onion')}
            >
              <span>🧅</span> Onion
            </a>
            <a
              href="#accordion-potato"
              className={`cat-pill ${activeCategory === 'accordion-potato' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-potato')}
            >
              <span>🥔</span> Potato
            </a>
            <a
              href="#accordion-greens-keerai"
              className={`cat-pill ${activeCategory === 'accordion-greens-keerai' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-greens-keerai')}
            >
              <span>🌿</span> Greens
            </a>
            <a
              href="#accordion-garlic"
              className={`cat-pill ${activeCategory === 'accordion-garlic' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-garlic')}
            >
              <span>🧄</span> Garlic
            </a>
            <a
              href="#fruits"
              className={`cat-pill cat-pill-fruit ${activeCategory === 'fruits' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'fruits')}
            >
              <span>🍎</span> Fruits
            </a>
            <a
              href="#accordion-banana"
              className={`cat-pill cat-pill-fruit ${activeCategory === 'accordion-banana' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-banana')}
            >
              <span>🍌</span> Banana
            </a>
            <a
              href="#accordion-mango"
              className={`cat-pill cat-pill-fruit ${activeCategory === 'accordion-mango' ? 'active' : ''}`}
              onClick={e => handlePillClick(e, 'accordion-mango')}
            >
              <span>🥭</span> Mango
            </a>
          </div>
        </div>
      </nav>

      {/* Search Bar Section */}
      <section className="search-section" id="searchSection">
        <div className="container">
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
              placeholder="Search vegetables, fruits or prices... (Press '/' to focus)"
              aria-label="Search produce items and rates"
              autoComplete="off"
            />
            {cleanSearch && (
              <span className="search-count-badge" style={{ display: 'inline-block' }}>
                {totalFilteredCount} {totalFilteredCount === 1 ? 'item' : 'items'} found
              </span>
            )}
            {cleanSearch && (
              <button
                type="button"
                id="searchClearBtn"
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
      </section>

      {/* Main Produce Price Lists */}
      <div className="container">
        {/* Empty Search State */}
        {cleanSearch && totalFilteredCount === 0 && (
          <div className="no-results-box is-visible" id="noSearchResults">
            <div className="no-results-icon">🔍</div>
            <h4 className="no-results-title">No produce items found</h4>
            <p className="no-results-text">
              We couldn&apos;t find any results matching &ldquo;{searchTerm}&rdquo;. Try another item name like
              Tomato, Onion, or Mango.
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
                      aria-controls={`panel-${subcat.slug}`}
                      onClick={() => toggleAccordion(subcat.slug)}
                    >
                      <div className="accordion-title-wrap">
                        <span className="accordion-icon">{subcat.icon || '🥦'}</span>
                        <span className="accordion-title">{subcat.name}</span>
                        <span className="accordion-badge">
                          {(subcat.products || []).length} items
                        </span>
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

                    <div className="accordion-content" id={`panel-${subcat.slug}`} role="region">
                      <table className="price-table">
                        <thead className="desktop-only-thead">
                          <tr>
                            <th>Produce Item</th>
                            <th className="desktop-unit-col">Unit</th>
                            <th style={{ textAlign: 'right' }}>Wholesale Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(subcat.products || []).length > 0 ? (
                            subcat.products?.map(prod => (
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
                                  {prod.price_unit || prod.default_unit ? (
                                    <span className="unit-tag">
                                      {prod.price_unit || prod.default_unit}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                                  )}
                                </td>
                                <td className="item-price-cell">
                                  <div className="price-box-wrapper">
                                    <span className="price-value">
                                      {formatPriceString(prod.price)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                style={{
                                  textAlign: 'center',
                                  color: 'var(--color-text-muted)',
                                  padding: '20px',
                                }}
                              >
                                No items listed for this subcategory on this date.
                              </td>
                            </tr>
                          )}
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
          <section id="fruits" className="price-category-section" style={{ marginTop: '40px' }}>
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
                      aria-controls={`panel-${subcat.slug}`}
                      onClick={() => toggleAccordion(subcat.slug)}
                    >
                      <div className="accordion-title-wrap">
                        <span className="accordion-icon">{subcat.icon || '🍎'}</span>
                        <span className="accordion-title">{subcat.name}</span>
                        <span className="accordion-badge">
                          {(subcat.products || []).length} items
                        </span>
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

                    <div className="accordion-content" id={`panel-${subcat.slug}`} role="region">
                      <table className="price-table">
                        <thead className="desktop-only-thead">
                          <tr>
                            <th>Produce Item</th>
                            <th className="desktop-unit-col">Unit</th>
                            <th style={{ textAlign: 'right' }}>Wholesale Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(subcat.products || []).length > 0 ? (
                            subcat.products?.map(prod => (
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
                                  {prod.price_unit || prod.default_unit ? (
                                    <span className="unit-tag">
                                      {prod.price_unit || prod.default_unit}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
                                  )}
                                </td>
                                <td className="item-price-cell">
                                  <div className="price-box-wrapper">
                                    <span className="price-value">
                                      {formatPriceString(prod.price)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                style={{
                                  textAlign: 'center',
                                  color: 'var(--color-text-muted)',
                                  padding: '20px',
                                }}
                              >
                                No fruit items listed on this date.
                              </td>
                            </tr>
                          )}
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

      {/* Trust & Feature Cards Section */}
      <section className="trust-section">
        <div className="container">
          <h3 className="trust-section-title">Why Wholesalers &amp; Retailers Trust DailyGurus</h3>
          <div className="trust-grid">
            {/* Card 1 */}
            <div className="trust-card">
              <div className="trust-icon-box">
                <span>⚡</span>
              </div>
              <h4>Daily Updated Rates</h4>
              <p>Prices verified every morning straight from Koyambedu Wholesale Mandi auctions by 5:00 AM.</p>
            </div>

            {/* Card 2 */}
            <div className="trust-card">
              <div className="trust-icon-box">
                <span>📊</span>
              </div>
              <h4>Wholesale Transparency</h4>
              <p>Authentic bulk prices for crates, bags, and kg batches, providing clear market trends.</p>
            </div>

            {/* Card 3 */}
            <div className="trust-card">
              <div className="trust-icon-box">
                <span>📱</span>
              </div>
              <h4>Mobile &amp; Fast</h4>
              <p>Optimized for instantaneous loading on mobile browsers with zero lag and offline search.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
