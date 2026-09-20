'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <footer className="site-footer">
        <div className="footer-top">
          <div className="container footer-grid">
            {/* Column 1: Brand & Tagline */}
            <div className="footer-col brand-col">
              <Link href="/" className="footer-logo-link" aria-label="DailyGurus Home">
                <img
                  src="/assets/images/logo-white.svg"
                  alt="DailyGurus Wholesale Price List"
                  width="240"
                  height="52"
                  className="footer-logo"
                />
              </Link>
              <p className="footer-tagline">
                Your trusted source for daily wholesale prices of vegetables and fruits directly from Koyambedu Wholesale Market, Chennai.
              </p>
              <div className="footer-market-badge">
                <span className="live-dot"></span>
                <span>Mandi Open: 4:00 AM – 12:00 PM</span>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="footer-col links-col">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-nav">
                <li>
                  <Link href="/">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/#vegetables">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Vegetables Prices
                  </Link>
                </li>
                <li>
                  <Link href="/#fruits">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Fruits Prices
                  </Link>
                </li>
                <li>
                  <Link href="/history">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Historical Rates
                  </Link>
                </li>
                <li>
                  <Link href="/about">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Wholesale Produce */}
            <div className="footer-col">
              <h4 className="footer-heading">Wholesale Produce</h4>
              <ul className="footer-nav">
                <li>
                  <Link href="/#accordion-tomato">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Tomato (Crates & Local)
                  </Link>
                </li>
                <li>
                  <Link href="/#accordion-onion">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Onion (Nashik & Sambar)
                  </Link>
                </li>
                <li>
                  <Link href="/#accordion-potato">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Potato (Agra & Hasan)
                  </Link>
                </li>
                <li>
                  <Link href="/#accordion-greens-keerai">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Greens & Keerai Bunches
                  </Link>
                </li>
                <li>
                  <Link href="/#accordion-garlic">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Garlic Boom & A4
                  </Link>
                </li>
                <li>
                  <Link href="/#fruits">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    Seasonal Fresh Fruits
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact Info */}
            <div className="footer-col contact-col">
              <h4 className="footer-heading">Contact & Location</h4>
              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                </div>
                <div className="contact-text">
                  <strong>Koyambedu Wholesale Market Complex</strong>
                  <span>Market Gate 2, Koyambedu, Chennai - 600092</span>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div className="contact-text">
                  <a href="tel:+919876543210">+91 98765 43210</a>
                  <span>Mon - Sun: 5:00 AM - 9:00 PM</span>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <div className="contact-text">
                  <a href="mailto:contact@dailygurus.com">contact@dailygurus.com</a>
                  <span>Direct Mandi Inquiries</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div className="container footer-bottom-flex">
            <div className="footer-copy">
              &copy; {new Date().getFullYear()} <strong>DailyGurus Price List</strong>. All rights reserved. Daily Wholesale Price List for Vegetables & Fruits.
            </div>
            <div className="footer-bottom-links">
              <Link href="/privacy">Privacy Policy</Link>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>&bull;</span>
              <Link href="/admin">Admin Portal</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Back-To-Top Button */}
      <button
        className={`back-to-top ${showBackToTop ? 'is-visible' : ''}`}
        id="backToTopBtn"
        aria-label="Scroll back to top"
        title="Back to top"
        onClick={scrollToTop}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      </button>
    </>
  );
};
