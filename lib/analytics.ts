/**
 * Google Analytics 4 (GA4) Utility for DailyGurus Price List
 *
 * Implements client-side event tracking, pageview tracking, and measurement ID configuration.
 * Fully conditional: safely no-ops if NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured.
 * Excludes admin routes from public tracking to protect sensitive admin operations.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Declare global window gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Track Pageview in GA4
 * Excludes admin routes (/admin/*) from analytics tracking.
 */
export const pageview = (url: string, title?: string) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return;
  if (url.startsWith('/admin')) return;

  try {
    window.gtag('event', 'page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: title || (typeof document !== 'undefined' ? document.title : ''),
    });
  } catch (err) {
    // Analytics failure must never break the application
    console.debug('GA pageview error:', err);
  }
};

/**
 * Track Custom Event in GA4
 * Safe no-op if GA is unconfigured or in admin route.
 */
export const trackEvent = (
  action: string,
  params?: Record<string, string | number | boolean | undefined | null>
) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;

  try {
    // Filter out undefined/null/empty values to keep events clean and minimal
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      }
    }

    window.gtag('event', action, cleanParams);
  } catch (err) {
    // Analytics failure must never break the application
    console.debug(`GA trackEvent [${action}] error:`, err);
  }
};
