import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - DailyGurus Price List',
  description:
    'Privacy Policy for DailyGurus Price List. Learn how anonymous website analytics and technical data are handled.',
};

export default function PrivacyPage() {
  return (
    <>
      {/* Page Hero */}
      <section className="page-hero">
        <div className="container">
          <h1 className="page-hero-title">Privacy Policy</h1>
          <p className="page-hero-desc">
            Transparency and privacy in how we operate and measure website traffic on DailyGurus Price List.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="page-body-section">
        <div className="container">
          <div style={{ maxWidth: '840px', margin: '0 auto' }}>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '30px',
              }}
            >
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  marginBottom: '16px',
                }}
              >
                1. Overview &amp; Commitment to Privacy
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.7',
                  marginBottom: '16px',
                }}
              >
                DailyGurus Price List is a public informational service providing daily wholesale produce prices directly
                from Koyambedu Wholesale Market, Chennai. We do not require visitor accounts, logins, or personal details
                to access our daily rates or historical charts.
              </p>

              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  margin: '28px 0 16px 0',
                }}
              >
                2. Website Usage Measurement (Google Analytics)
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.7',
                  marginBottom: '16px',
                }}
              >
                To understand visitor volume, popular produce pages, and site performance, we utilize{' '}
                <strong>Google Analytics 4 (GA4)</strong>. Google Analytics uses cookies and technical device indicators to
                measure aggregate visitor behavior, such as:
              </p>
              <ul
                style={{
                  paddingLeft: '24px',
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.8',
                  marginBottom: '16px',
                }}
              >
                <li>Overall page visits and session duration</li>
                <li>Device categories (mobile vs. desktop) and browser types</li>
                <li>Popular product searches and category views</li>
                <li>General geographic region (country or state level)</li>
              </ul>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.7',
                  marginBottom: '16px',
                }}
              >
                IP anonymization is enabled by default. Google processes this technical information in accordance with its
                own Privacy Policy:{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                  Google Privacy &amp; Terms
                </a>
                .
              </p>

              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  margin: '28px 0 16px 0',
                }}
              >
                3. What We Do NOT Collect
              </h2>
              <ul
                style={{
                  paddingLeft: '24px',
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.8',
                  marginBottom: '16px',
                }}
              >
                <li>We do not collect names, email addresses, or phone numbers of public visitors.</li>
                <li>We do not track or store sensitive financial or banking credentials.</li>
                <li>We do not sell, rent, or trade visitor data to third-party advertisers.</li>
              </ul>

              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-primary-dark)',
                  margin: '28px 0 16px 0',
                }}
              >
                4. Managing Analytics Cookies
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-text-body)',
                  lineHeight: '1.7',
                  marginBottom: '24px',
                }}
              >
                Visitors may disable or clear cookies at any time through standard browser settings or use the official{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                  Google Analytics Opt-out Browser Add-on
                </a>
                . Doing so will not restrict your access to our daily wholesale prices or historical market charts.
              </p>

              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Last updated: September 2026
                </span>
                <Link
                  href="/"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                  }}
                >
                  &larr; Back to Wholesale Prices
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
