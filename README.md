# AasaMedChem – Inventory & Order Management System

## Project Overview

A production-ready Inventory and Order Management System built for chemical sales and inventory tracking.

The application allows administrators to manage products, inventory, pricing, and incoming orders while sellers can browse products, generate quotations, and place orders using flexible units such as grams, kilograms, milliliters, liters, and item counts.

The system uses a normalized storage strategy where all quantities and prices are converted into base units before being stored in the database. This ensures accurate inventory management, consistent pricing calculations, and reliable reporting.

---

## Repository

GitHub Repository:

https://github.com/swayamawas/medchem-inventory

---

## Test Credentials

### Admin

Email: [admin@aasamedchem.com](mailto:admin@aasamedchem.com)

Password: AdminPass123

### Seller

Email: [seller@aasamedchem.com](mailto:seller@aasamedchem.com)

Password: SellerPass123

---

# Features

## Authentication & Authorization

* Role-based authentication using NextAuth.js
* ADMIN role
* SELLER role
* Protected routes using middleware

## Product Management

* Create products
* Edit products
* Delete products
* Manage inventory levels
* Configure pricing
* Live conversion preview before saving

## Unit Conversion Engine

Supported Units:

### Weight

* g
* kg

### Volume

* mL
* L

### Count

* item

All values are normalized and stored in base units.

## Seller Features

* Browse products
* Search products
* Filter by category
* Add products to quotation/order
* Select quantity and unit
* Live pricing calculations
* View order history

## Admin Features

* Product CRUD
* Inventory monitoring
* Review incoming orders
* Approve orders
* Reject orders
* View conversion audit trail
* Automatic inventory deduction

## Pricing

* INR (₹) support
* High precision pricing
* Automatic unit-aware calculations

---

# Technology Stack

## Frontend

* Next.js 16 (App Router)
* TypeScript
* Tailwind CSS

## Backend

* Next.js Server Actions

## Authentication

* NextAuth.js

## ORM

* Prisma ORM

## Database

* Neon PostgreSQL

## Deployment

* Vercel

---

# High Level Architecture

```text
Seller/Admin
      │
      ▼
Next.js Frontend
      │
      ▼
Server Actions
      │
      ▼
Prisma ORM
      │
      ▼
Neon PostgreSQL
```

Middleware enforces role-based access control for Admin and Seller dashboards.

---

# Database Schema

## User

Stores authentication credentials and user role.

| Field    | Type           |
| -------- | -------------- |
| id       | UUID           |
| name     | String         |
| email    | String         |
| password | String         |
| role     | ADMIN / SELLER |

---

## Product

Stores inventory and pricing information.

| Field           | Type                    |
| --------------- | ----------------------- |
| id              | UUID                    |
| name            | String                  |
| description     | String                  |
| category        | String                  |
| dimensionType   | WEIGHT / VOLUME / COUNT |
| baseUnit        | String                  |
| ratePerBaseUnit | NUMERIC(18,6)           |
| stockQuantity   | NUMERIC(18,6)           |

---

## Order

Stores order header information.

| Field      | Type                          |
| ---------- | ----------------------------- |
| id         | UUID                          |
| userId     | UUID                          |
| status     | PENDING / APPROVED / REJECTED |
| totalPrice | NUMERIC(18,6)                 |

---

## OrderItem

Stores individual products within an order.

| Field              | Type          |
| ------------------ | ------------- |
| id                 | UUID          |
| orderId            | UUID          |
| productId          | UUID          |
| enteredQuantity    | NUMERIC(18,6) |
| enteredUnit        | String        |
| quantityInBaseUnit | NUMERIC(18,6) |
| calculatedPrice    | NUMERIC(18,6) |

---

# Unit Storage Strategy

## Why Base Units?

All inventory values are stored in a single base unit for each dimension.

This eliminates conversion ambiguity and simplifies inventory calculations.

### Base Unit Mapping

| Dimension | Base Unit |
| --------- | --------- |
| WEIGHT    | g         |
| VOLUME    | mL        |
| COUNT     | item      |

### Supported Units

| Dimension | Supported Units |
| --------- | --------------- |
| WEIGHT    | g, kg           |
| VOLUME    | mL, L           |
| COUNT     | item            |

---

# Conversion Factors

```ts
const UNIT_FACTORS = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  item: 1,
};
```

Examples:

* 1 kg = 1000 g
* 2 kg = 2000 g
* 1 L = 1000 mL
* 2 L = 2000 mL

---

# Pricing Strategy

Prices are stored as:

```text
ratePerBaseUnit
```

Examples:

| Admin Input | Stored In Database |
| ----------- | ------------------ |
| ₹1000 / L   | ₹1.000000 / mL     |
| ₹1200 / kg  | ₹1.200000 / g      |
| ₹150 / item | ₹150.000000 / item |

Price Calculation Formula:

```text
quantityInBaseUnit × ratePerBaseUnit
```

Example:

```text
Product: Ethanol

Configured:
₹1000 / L

Stored:
₹1 / mL

Order:
2 L

Conversion:
2 × 1000 = 2000 mL

Price:
2000 × ₹1 = ₹2000
```

---

# Conversion Flow

```text
User Input
      │
      ▼
Convert To Base Unit
      │
      ▼
Calculate Price
      │
      ▼
Store In Database
      │
      ▼
Display To Admin
```

---

# Where Conversions Occur

### Product Creation

Admin-entered values are converted into base-unit values before storage.

### Order Placement

Seller-entered quantities are converted into base units before pricing calculations.

### UI Display

Stored base-unit values are converted into user-friendly units for display.

---

# PostgreSQL Data Type Decisions

### Why NUMERIC(18,6)?

Inventory and pricing systems require exact precision.

Using:

```sql
NUMERIC(18,6)
```

prevents floating-point rounding errors.

Benefits:

* Supports very small values
* Supports very large values
* Exact financial calculations
* No FLOAT precision issues

---

# Key Design Decisions

## Why PostgreSQL?

PostgreSQL provides:

* Strong relational modeling
* ACID transactions
* Reliable data consistency
* Excellent support for financial calculations

## Why Base Unit Storage?

Normalization simplifies:

* Inventory tracking
* Reporting
* Pricing calculations
* Unit conversion

## Why OrderItem Table?

One order can contain multiple products.

The OrderItem table stores product-specific quantities, units, conversions, and pricing.

## Why ratePerBaseUnit?

A single pricing formula can be used regardless of which unit the seller selects.

---

# Local Setup

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create a .env file:

```env
DATABASE_URL=your_neon_connection_string
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## Push Schema

```bash
npx prisma db push
```

## Generate Prisma Client

```bash
npx prisma generate
```

## Seed Database

```bash
npx prisma db seed
```

## Run Development Server

```bash
npm run dev
```

Open:

http://localhost:3000

---

# Deployment (Vercel)

1. Push code to GitHub
2. Import repository into Vercel
3. Configure environment variables

Required Variables:

```env
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
```

4. Deploy

---

# Using The Application

## Admin Workflow

1. Login as Admin
2. Create/Edit Products
3. Configure Pricing
4. Monitor Inventory
5. Review Orders
6. Approve or Reject Orders

---

## Seller Workflow

1. Login as Seller
2. Search Products
3. Select Quantity & Unit
4. View Live Pricing
5. Place Order
6. Track Status

---

# Screenshots

## Admin Dashboard

* Product Management
* Inventory Monitoring

## Seller Dashboard

* Product Catalog
* Search & Filtering

## Order Workflow

* Order Placement
* Admin Approval
* Inventory Deduction

---

# Future Improvements

* Inventory history tracking
* Email notifications
* Advanced reporting
* CSV export
* Pagination for large datasets

---

# Conclusion

This project demonstrates a complete inventory and quotation workflow using normalized unit storage, precise financial calculations, role-based access control, and transactional inventory management. The system ensures accurate pricing, reliable inventory tracking, and scalable architecture suitable for real-world chemical inventory operations.
