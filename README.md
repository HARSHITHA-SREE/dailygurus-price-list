# DailyGurus Price List

> **Modern, mobile-first wholesale price-list platform for vegetables and fruits.**  
> Built with pure **PHP 8+**, **SQLite (PDO)**, **HTML5**, **Vanilla CSS3**, and **Vanilla JavaScript** — with zero frameworks and zero build steps.

🌐 **Production Website**: [https://pricelist.reginaldalfret.tech](https://pricelist.reginaldalfret.tech/)

---

## 🌟 Key Features

* **Daily Wholesale Pricing**: Transparent rates for Vegetables, Fruits, Greens (Keerai), and Garlic updated every morning from mandi auctions.
* **Instant Client-Side Search**: Zero-latency filtering across commodity names, prices, and units with match highlighting (`<mark>`) and automatic accordion expansion.
* **Wholesale Pricing Formats**: Precision handling of complex mandi trade conventions without mathematical averaging:
  * Multi-price ranges: `1900/1950` &rarr; **₹1,900 / ₹1,950**
  * Bracketed quantities: `1300 (20kg box)` &rarr; **₹1,300 (20kg box)**
  * Tiered units: `30/200/150 per 5 kg` &rarr; **₹30 / ₹200 / ₹150 per 5 kg**
  * Stock statuses: `Nill` &rarr; **Nill**, missing prices &rarr; **—**
* **Mobile-First Responsive Layout**: Touch-optimized accordion controls, slide-out drawer menu, and fluid scaling across 360px to 4K displays.
* **Price History Explorer**: Browse historical rate snapshots for past dates with dedicated snapshot search and printable archives.
* **Admin Management Suite**:
  * **Daily Prices Editor**: Rapid daily rate entry with 1-click **"Copy from previous day"**, inline new item creation, **Save Draft**, and **Publish Today's Prices**.
  * **WhatsApp Bulk Quick Importer**: Fuzzy text parser that auto-matches raw pasted wholesale lists against catalog products with real-time confidence preview.
  * **Product Catalog CRUD**: Categorization, subcategory mapping, default packaging units, display ordering, and visibility toggles.
  * **Security & Settings**: Bcrypt password hashing (`PASSWORD_DEFAULT`), constant-time CSRF protection, and session security.

---

## 🛠️ Technology Stack

* **Backend**: PHP 8.0+ (Native PDO SQLite driver)
* **Database**: SQLite 3 (Auto-initializing, zero external database daemon required)
* **Frontend**: Semantic HTML5, Vanilla CSS3 (Custom Design System), Vanilla JavaScript (ES6+)
* **Dependencies**: **Zero** external npm packages, frameworks, or build tools.

---

## 📁 Directory Structure

```
.
├── index.php                 # Public Homepage (Hero, Category Cards, Search, Accordions, Footer)
├── history.php               # Price History Explorer & Past Snapshot Viewer
├── about.php                 # About Us & Market Methodology
├── contact.php               # Contact Information & Wholesale Inquiry Form
├── config.php                # Central Application Configuration (Contact, Timezone, Currency)
├── database.php              # SQLite PDO connection, automatic schema setup & seeder
├── functions.php             # Functions proxy
├── router.php                # Security router for local development & production servers
├── sitemap.php               # Dynamic XML Sitemap generator
├── robots.txt                # Search engine crawler directives
├── database/
│   └── .htaccess             # Protects SQLite database files from direct HTTP access
├── assets/
│   ├── css/
│   │   ├── style.css         # Public responsive stylesheet
│   │   └── admin.css         # Admin management stylesheet
│   ├── js/
│   │   ├── app.js            # Live search filter, accordion animation, mobile navigation
│   │   └── admin.js          # WhatsApp bulk text parser and live preview engine
│   └── images/
│       ├── logo.svg          # DailyGurus official SVG branding (deep forest & leaf green)
│       ├── logo-white.svg    # White vector logo for dark footer & admin sidebar
│       ├── hero-produce.jpg  # Produce basket hero image
│       ├── veg-crate.jpg     # Vegetable crate navigation visual
│       └── fruit-basket.jpg  # Fruit assortment navigation visual
├── admin/
│   ├── index.php             # Router to dashboard / login
│   ├── login.php             # Secure admin authentication with CSRF protection
│   ├── logout.php            # Session termination
│   ├── dashboard.php         # Admin overview, metrics & recent update log
│   ├── prices.php            # Daily Price Sheet Editor (Draft / Publish workflows)
│   ├── products.php          # Catalog Manager (Add, Edit, Reorder, Deactivate)
│   ├── import.php            # Bulk Text Importer with real-time parser
│   ├── history.php           # Date Archive Manager (Duplicate & toggle status)
│   └── settings.php          # Admin Credentials & Database Diagnostics
└── includes/
    ├── header.php            # Public site header & navigation
    ├── footer.php            # Public site footer & copyright
    ├── auth.php              # Authentication guards & session security
    ├── functions.php         # Core business logic, pricing formatter, query helpers
    ├── admin_header.php      # Reusable admin sidebar & topbar layout
    └── admin_footer.php      # Admin layout footer
```

---

## 🚀 Local Development Setup

### Prerequisites
* PHP 8.0 or higher with `pdo_sqlite`, `sqlite3`, `mbstring`, and `openssl` extensions enabled in `php.ini`.

### Running Locally
1. Clone or extract the project:
   ```bash
   cd "DG - Price List"
   ```
2. Start the built-in development server with the security router:
   ```bash
   php -S 127.0.0.1:8000 router.php
   ```
3. Open in your browser:
   * **Public Website**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   * **Price History**: [http://127.0.0.1:8000/history.php](http://127.0.0.1:8000/history.php)
   * **Admin Login**: [http://127.0.0.1:8000/admin/login.php](http://127.0.0.1:8000/admin/login.php)

> **Note on Database**: On the first request, the application automatically initializes the SQLite schema and seeds the catalog with initial commodities. Live production databases are excluded from Git.

---

## 🔐 Admin Daily Workflow

### 1. Updating Today's Prices
1. Log in to `/admin/login.php`.
2. Navigate to **Daily Prices** (`/admin/prices.php`).
3. Select today's date. If it is a new date, click **"Copy from previous day"** to populate yesterday's prices as a baseline.
4. Edit the prices that changed in the market auctions.
5. Click **Publish Today's Prices**. The public homepage immediately reflects the new rates.

### 2. WhatsApp Bulk Quick Import
1. Navigate to **Bulk Quick Import** (`/admin/import.php`).
2. Paste raw multi-line market text:
   ```text
   Tomato big crates: 650
   Tomato local big crates: 550
   Cabbage local: 600/500
   Cauliflower small: 180
   Nashik new - Big (60+): 1900/1950
   Potato Agra: 17/16
   Garlic Big A4: 220
   ```
3. The parser automatically matches text lines against active catalog commodities with real-time confidence scores.
4. Review the preview table and click **Confirm & Import Prices**.

---

## 🌐 Production Architecture

```
Internet (Public Users)
       │
       ▼
Cloudflare Edge Network (HTTPS / SSL Termination)
       │
       ▼
Cloudflare Tunnel (Encrypted Outbound Tunnel)
       │
       ▼
Host Server (Windows Service: DailyGurusPriceList + Cloudflared)
       │
       ▼
PHP 8+ Fast Server (router.php)
       │
       ▼
SQLite Database (Stored securely outside document root)
```

---

## 🔒 Security Best Practices

* **No Direct DB Access**: The SQLite database file is stored securely outside the web root and direct HTTP access to `.sqlite` files returns `404 Not Found` / `403 Forbidden`.
* **SQL Injection Defense**: 100% of database interactions use PDO prepared statements with parameterized inputs.
* **XSS Defense**: Dynamic output is escaped with `htmlspecialchars(..., ENT_QUOTES, 'UTF-8')`.
* **CSRF Defense**: State-changing POST requests require cryptographic token verification (`hash_equals()`).

---

## 📄 License

Proprietary — Developed for **DailyGurus Wholesale Market Operations**.

2026 - All Rights Reserved
