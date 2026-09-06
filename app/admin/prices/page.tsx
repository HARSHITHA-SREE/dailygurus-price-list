'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductPriceItem, Category, Subcategory } from '@/lib/types';
import { formatDateLong, formatDateShort } from '@/lib/price-formatter';
import { parseWhatsAppPriceList, ParsedPriceItem } from '@/lib/whatsapp-parser';

function AdminPricesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sheet Data
  const [isPublished, setIsPublished] = useState(0);
  const [sheetNotes, setSheetNotes] = useState('');
  const [products, setProducts] = useState<ProductPriceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Filtering & Category Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'veg' | 'fruit'>('all');

  // WhatsApp Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');
  const [parsedPreviewItems, setParsedPreviewItems] = useState<ParsedPriceItem[]>([]);
  const [selectedImportIndices, setSelectedImportIndices] = useState<Set<number>>(new Set());

  // Check if openImport param was passed in URL
  useEffect(() => {
    if (searchParams.get('openImport') === 'true' || searchParams.get('openImport') === '1') {
      setIsImportModalOpen(true);
    }
  }, [searchParams]);

  // Load prices for selected date
  const loadPricesForDate = async (dateStr: string, copyFromDate?: string) => {
    setLoading(true);
    try {
      let url = `/api/admin/prices?date=${dateStr}`;
      if (copyFromDate) {
        url += `&copy_from_date=${copyFromDate}`;
      }

      const res = await fetch(url);
      if (res.status === 401) {
        window.location.href = '/admin';
        return;
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load prices');

      setIsPublished(copyFromDate ? 0 : json.priceDateInfo?.is_published || 0);
      setSheetNotes(json.priceDateInfo?.notes || '');
      setProducts(json.products || []);
      setCategories(json.categories || []);
      setSubcategories(json.subcategories || []);

      if (copyFromDate) {
        showToast(`Copied prices from ${formatDateShort(copyFromDate)}. Review and save when ready.`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading price sheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricesForDate(selectedDate);
  }, [selectedDate]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Change Date Handlers
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    router.push(`/admin/prices?date=${newDate}`);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    handleDateChange(todayStr);
  };

  const handleCopyPreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const prevDateStr = d.toISOString().split('T')[0];
    loadPricesForDate(selectedDate, prevDateStr);
  };

  // Update item field in memory
  const handleItemChange = (id: number, field: 'price' | 'price_unit' | 'price_notes', value: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Save or Publish
  const handleSavePrices = async (publish: boolean) => {
    setSaving(true);
    try {
      const itemsToSave = products.map(p => ({
        product_id: p.id,
        price: p.price || '',
        unit: p.price_unit || p.default_unit || 'kg',
        price_notes: p.price_notes || '',
      }));

      const res = await fetch('/api/admin/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          is_published: publish ? 1 : 0,
          notes: sheetNotes,
          items: itemsToSave,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save prices');
      }

      setIsPublished(publish ? 1 : 0);
      showToast(
        publish
          ? `🚀 Successfully published prices for ${formatDateShort(selectedDate)} live!`
          : `💾 Saved draft for ${formatDateShort(selectedDate)}.`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Error saving prices', 'error');
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Parser execution
  const handleRunParser = (text: string) => {
    setRawImportText(text);
    if (!text.trim()) {
      setParsedPreviewItems([]);
      setSelectedImportIndices(new Set());
      return;
    }

    const result = parseWhatsAppPriceList(text, products);
    setParsedPreviewItems(result.items);

    // Default: select all matched items
    const selected = new Set<number>();
    result.items.forEach((item, index) => {
      if (item.matchedProduct) {
        selected.add(index);
      }
    });
    setSelectedImportIndices(selected);
  };

  // Apply parsed WhatsApp prices into current products state
  const handleApplyParsedPrices = () => {
    if (parsedPreviewItems.length === 0) return;

    let appliedCount = 0;
    const updatedProducts = [...products];

    parsedPreviewItems.forEach((parsedItem, idx) => {
      if (!selectedImportIndices.has(idx)) return;

      if (parsedItem.matchedProduct) {
        const prodIndex = updatedProducts.findIndex(p => p.id === parsedItem.matchedProduct!.id);
        if (prodIndex !== -1) {
          updatedProducts[prodIndex] = {
            ...updatedProducts[prodIndex],
            price: parsedItem.price,
            price_unit: parsedItem.unit || updatedProducts[prodIndex].default_unit || 'kg',
            price_notes: parsedItem.priceNotes || updatedProducts[prodIndex].price_notes || '',
          };
          appliedCount++;
        }
      }
    });

    setProducts(updatedProducts);
    setIsImportModalOpen(false);
    showToast(`Applied ${appliedCount} prices from WhatsApp list into sheet! Don't forget to save.`, 'success');
  };

  // Filtered Products for Display
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Tab filter
      if (selectedCategoryTab === 'veg' && p.category_id !== 1) return false;
      if (selectedCategoryTab === 'fruit' && p.category_id !== 2) return false;

      // Query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const tamilMatch = (p.tamil_name || '').toLowerCase().includes(q);
      const unitMatch = (p.default_unit || '').toLowerCase().includes(q);
      return nameMatch || tamilMatch || unitMatch;
    });
  }, [products, selectedCategoryTab, searchQuery]);

  const sampleWholesaleText = `Tomato big crates( premium) : 650
Tomato (local) big crates :550
Nashik new - Big (60+) : 1900/1950
Cabbage local: 600/500
Cauliflower small: 180
Garlic Big A4: 220
Potato Agra: 17/16
Banana Nendram: 70/65
Custard Apple: 1300 (20kg box)`;

  // Export / Download Static JSON file
  const handleExportJson = () => {
    const priceMapDict: Record<string, { price: string; unit: string; notes: string }> = {};
    products.forEach(p => {
      const entry = {
        price: (p.price || '').trim(),
        unit: (p.price_unit || p.default_unit || 'kg').trim(),
        notes: (p.price_notes || '').trim(),
      };
      priceMapDict[String(p.id)] = entry;
      if (p.slug) {
        priceMapDict[p.slug] = entry;
      }
    });

    const vegCategory = categories.find(c => c.category_type === 'veg') || { id: 1, name: 'Vegetables', slug: 'vegetables', icon: '🥦', category_type: 'veg' };
    const fruitCategory = categories.find(c => c.category_type === 'fruit') || { id: 2, name: 'Fruits', slug: 'fruits', icon: '🍎', category_type: 'fruit' };

    const buildTree = (catId: number) => {
      const subs = subcategories
        .filter(s => s.category_id === catId)
        .sort((a, b) => a.display_order - b.display_order);

      return subs.map(sub => {
        const prods = products
          .filter(p => p.subcategory_id === sub.id && p.active === 1)
          .sort((a, b) => a.display_order - b.display_order)
          .map(p => {
            const pInfo = priceMapDict[String(p.id)] || (p.slug ? priceMapDict[p.slug] : null);
            return {
              id: p.id,
              slug: p.slug || p.id,
              category_id: p.category_id,
              subcategory_id: p.subcategory_id,
              name: p.name,
              tamil_name: p.tamil_name,
              icon: p.icon,
              image_url: p.image_url,
              default_unit: p.default_unit,
              display_order: p.display_order,
              active: p.active,
              price: pInfo ? pInfo.price : '',
              price_unit: pInfo ? pInfo.unit : p.default_unit,
              price_notes: pInfo ? pInfo.notes : '',
            };
          });

        return {
          id: sub.id,
          category_id: sub.category_id,
          name: sub.name,
          slug: sub.slug,
          icon: sub.icon,
          display_order: sub.display_order,
          active: 1,
          products: prods,
        };
      });
    };

    const dayPayload = {
      date: selectedDate,
      published: true,
      notes: sheetNotes || `Official Koyambedu wholesale auction rates for ${selectedDate}`,
      categories: [
        {
          id: vegCategory.id,
          name: vegCategory.name,
          slug: vegCategory.slug,
          icon: vegCategory.icon,
          category_type: 'veg',
          display_order: 1,
          active: 1,
          subcategories: buildTree(vegCategory.id),
        },
        {
          id: fruitCategory.id,
          name: fruitCategory.name,
          slug: fruitCategory.slug,
          icon: fruitCategory.icon,
          category_type: 'fruit',
          display_order: 2,
          active: 1,
          subcategories: buildTree(fruitCategory.id),
        },
      ],
      prices: priceMapDict,
    };

    const blob = new Blob([JSON.stringify(dayPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📥 Downloaded ${selectedDate}.json! Commit to data/prices/ and push to GitHub.`, 'success');
  };

  return (
    <div className="admin-container">
      {/* Static JSON Workflow Banner */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.86rem',
          color: '#166534',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>📁</span>
          <span>
            <strong>Static JSON Architecture:</strong> Rates are stored in <code>data/prices/{selectedDate}.json</code>. Save directly or click <strong>Download JSON</strong>, then <code>git commit &amp; git push</code> to deploy live instantly.
          </span>
        </div>
        <button
          type="button"
          onClick={handleExportJson}
          className="dg-btn dg-btn-outline"
          style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: '#86efac', color: '#15803d', background: '#ffffff' }}
        >
          📥 Download {selectedDate}.json
        </button>
      </div>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 1000,
            padding: '14px 20px',
            borderRadius: '10px',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-xl)',
            backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#0284c7' : '#059669',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div
        className="dg-card"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Date Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handlePrevDay}
              className="dg-btn dg-btn-outline"
              style={{ padding: '8px 12px' }}
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              className="dg-input"
              value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              style={{ fontWeight: 700, width: 'auto', minWidth: '160px' }}
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="dg-btn dg-btn-outline"
              style={{ padding: '8px 12px' }}
              title="Next Day"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="dg-btn dg-btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
            >
              Today
            </button>
          </div>

          {/* Publishing Status Badge */}
          <div>
            {isPublished === 1 ? (
              <span className="badge badge-published" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                🚀 Published Live
              </span>
            ) : (
              <span className="badge badge-draft" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                📝 Draft Mode
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleCopyPreviousDay}
            className="dg-btn dg-btn-outline"
            style={{ fontSize: '0.85rem' }}
          >
            <span>📋</span>
            <span>Copy Previous Day</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="dg-btn dg-btn-secondary"
            style={{ fontSize: '0.85rem', fontWeight: 700 }}
          >
            <span>⚡</span>
            <span>WhatsApp Bulk Paste</span>
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSavePrices(false)}
            className="dg-btn dg-btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <span>💾</span>
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSavePrices(true)}
            className="dg-btn dg-btn-success"
            style={{ fontSize: '0.88rem', fontWeight: 700 }}
          >
            <span>🚀</span>
            <span>{saving ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setSelectedCategoryTab('all')}
            className={`dg-btn ${selectedCategoryTab === 'all' ? 'dg-btn-primary' : 'dg-btn-outline'}`}
            style={{ padding: '7px 16px', fontSize: '0.85rem' }}
          >
            All Products ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryTab('veg')}
            className={`dg-btn ${selectedCategoryTab === 'veg' ? 'dg-btn-primary' : 'dg-btn-outline'}`}
            style={{ padding: '7px 16px', fontSize: '0.85rem' }}
          >
            🥦 Vegetables ({products.filter(p => p.category_id === 1).length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategoryTab('fruit')}
            className={`dg-btn ${selectedCategoryTab === 'fruit' ? 'dg-btn-primary' : 'dg-btn-outline'}`}
            style={{ padding: '7px 16px', fontSize: '0.85rem' }}
          >
            🍎 Fruits ({products.filter(p => p.category_id === 2).length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ maxWidth: '320px', width: '100%' }}>
          <input
            type="text"
            className="dg-input"
            placeholder="🔍 Filter by name or Tamil name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Price Sheet Table */}
      <div className="dg-card" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>⏳</div>
            <p>Loading price sheet for {formatDateLong(selectedDate)}...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569', width: '60px' }}>Icon</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Product / Tamil Name</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569', width: '120px' }}>Category</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569', width: '180px' }}>Price (₹)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569', width: '140px' }}>Unit</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: '#475569' }}>Notes / Grade</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => (
                  <tr
                    key={prod.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: prod.price ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Icon */}
                    <td style={{ padding: '12px 18px', textAlign: 'center', fontSize: '1.25rem' }}>
                      {prod.icon || (prod.category_id === 1 ? '🥦' : '🍎')}
                    </td>

                    {/* Product Names */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{prod.name}</div>
                      {prod.tamil_name && (
                        <div className="tamil-text" style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                          {prod.tamil_name}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '12px 18px' }}>
                      {prod.category_id === 1 ? (
                        <span className="badge badge-veg">Veg</span>
                      ) : (
                        <span className="badge badge-fruit">Fruit</span>
                      )}
                    </td>

                    {/* Price Input */}
                    <td style={{ padding: '12px 18px' }}>
                      <input
                        type="text"
                        className="dg-input"
                        placeholder="e.g. 650 or 1900/1950"
                        value={prod.price || ''}
                        onChange={e => handleItemChange(prod.id, 'price', e.target.value)}
                        style={{
                          fontWeight: 700,
                          color: prod.price ? '#047857' : '#94a3b8',
                          borderColor: prod.price ? 'var(--primary-border)' : 'var(--border-color)',
                        }}
                      />
                    </td>

                    {/* Unit Input */}
                    <td style={{ padding: '12px 18px' }}>
                      <input
                        type="text"
                        className="dg-input"
                        placeholder="kg / crate / box"
                        value={prod.price_unit || prod.default_unit || 'kg'}
                        onChange={e => handleItemChange(prod.id, 'price_unit', e.target.value)}
                      />
                    </td>

                    {/* Notes */}
                    <td style={{ padding: '12px 18px' }}>
                      <input
                        type="text"
                        className="dg-input"
                        placeholder="e.g. Premium / Local"
                        value={prod.price_notes || ''}
                        onChange={e => handleItemChange(prod.id, 'price_notes', e.target.value)}
                        style={{ fontSize: '0.84rem' }}
                      />
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No matching products found. Try adjusting your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Bar */}
      <div
        style={{
          position: 'sticky',
          bottom: '16px',
          zIndex: 30,
          background: '#ffffff',
          borderRadius: '12px',
          padding: '14px 24px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ fontSize: '0.88rem', color: '#475569' }}>
          Date: <strong>{formatDateLong(selectedDate)}</strong> • Priced Items:{' '}
          <strong style={{ color: '#059669' }}>
            {products.filter(p => p.price && p.price !== '—' && p.price.toLowerCase() !== 'nill').length}
          </strong>{' '}
          / {products.length}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSavePrices(false)}
            className="dg-btn dg-btn-secondary"
          >
            <span>💾</span>
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleSavePrices(true)}
            className="dg-btn dg-btn-success"
            style={{ fontWeight: 700 }}
          >
            <span>🚀</span>
            <span>{saving ? 'Publishing...' : 'Publish Live to Public'}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Bulk Parser Modal */}
      {isImportModalOpen && (
        <div className="dg-modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div
            className="dg-modal-content"
            style={{ maxWidth: '900px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  WhatsApp & Text Market List Parser
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split Pane */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px',
                padding: '20px 24px',
                overflowY: 'auto',
                maxHeight: 'calc(80vh - 140px)',
              }}
            >
              {/* Left: Raw Text Area */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                    Paste Market List Text:
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRunParser(sampleWholesaleText)}
                    style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Paste Sample Text
                  </button>
                </div>
                <textarea
                  className="dg-textarea"
                  rows={14}
                  placeholder={`Tomato big crates( premium) : 650\nTomato (local) big crates :550\nNashik new - Big (60+) : 1900/1950\nCabbage local: 600/500\nCauliflower small: 180`}
                  value={rawImportText}
                  onChange={e => handleRunParser(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Right: Matched Live Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                    Live Matched Items ({parsedPreviewItems.length}):
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedImportIndices(new Set(parsedPreviewItems.map((_, i) => i)))}
                      style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Check All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImportIndices(new Set())}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Uncheck All
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  {parsedPreviewItems.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Paste market text on the left to see instant fuzzy catalog matching.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {parsedPreviewItems.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: selectedImportIndices.has(idx) ? '#ffffff' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.85rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedImportIndices.has(idx)}
                            onChange={e => {
                              const next = new Set(selectedImportIndices);
                              if (e.target.checked) next.add(idx);
                              else next.delete(idx);
                              setSelectedImportIndices(next);
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {item.extractedName}
                            </div>
                            {item.matchedProduct ? (
                              <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 600 }}>
                                ↳ Matched: {item.matchedProduct.name} ({item.matchedProduct.category_id === 1 ? 'Veg' : 'Fruit'})
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 600 }}>
                                ⚠️ No catalog match found
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#047857' }}>₹{item.price}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.unit}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                Selected <strong>{selectedImportIndices.size}</strong> of {parsedPreviewItems.length} items
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="dg-btn dg-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedImportIndices.size === 0}
                  onClick={handleApplyParsedPrices}
                  className="dg-btn dg-btn-primary"
                >
                  <span>Apply to Price Sheet ({selectedImportIndices.size})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPricesPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155' }}>Loading Price Sheet...</h3>
        </div>
      }
    >
      <AdminPricesContent />
    </Suspense>
  );
}
