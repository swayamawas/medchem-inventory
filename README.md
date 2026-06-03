# AasaMedChem — Inventory & Order Management System

A production-ready inventory and quotation management system for chemical sales. Built with Next.js, Prisma, and PostgreSQL (Neon), this system supports multi-unit chemical ordering with precise base-unit conversions and role-based access control.

---

## Live Demo

> Deploy to Vercel using the guide below to get a live URL.

**Test Credentials:**

| Role   | Email                        | Password       |
|--------|------------------------------|----------------|
| Admin  | admin@aasamedchem.com        | AdminPass123   |
| Seller | seller@aasamedchem.com       | SellerPass123  |

---

## Features

- **Role-Based Auth** — ADMIN and SELLER roles via NextAuth.js credentials
- **Product CRUD** — Admin can create, edit, delete products with live conversion preview in the form
- **Unit Conversion Engine** — All quantities stored in base units (g, mL, item); rates stored per base unit
- **Live Price Calculation** — Seller sees the exact formula: `quantity_in_base × rate_per_base = price`
- **Quotation / Order Flow** — Seller adds products to cart, picks any supported unit, confirms order
- **Admin Order Audit** — Admin sees: entered unit, base unit stored, conversion factor used, and final price
- **Stock Deduction** — Approving an order deducts from inventory in a database transaction
- **INR Pricing** — All monetary values displayed in ₹

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 16 (App Router), TypeScript |
| Styling     | Tailwind CSS v4                     |
| Auth        | NextAuth.js v4 (Credentials)        |
| ORM         | Prisma v5.14                        |
| Database    | Neon PostgreSQL (hosted)            |
| Deployment  | Vercel                              |

---

## System Design

```
Browser (Client)
    │
    ▼
Next.js App Router (Server Components + Server Actions)
    │
    ├── /auth/signin      → Public sign-in page
    ├── /admin            → Admin-only (products CRUD + order review)
    └── /seller           → Seller-only (browse + order/quotation placement)
    │
    ▼
Prisma ORM (v5.14, prisma-client-js)
    │
    ▼
Neon PostgreSQL — schema: "medchem"
    Tables: User, Product, Order, OrderItem
```

Middleware (`src/middleware.ts`) enforces role-based route protection at the edge.

---

## Database Schema

### User
| Field     | Type        | Notes                        |
|-----------|-------------|------------------------------|
| id        | UUID (PK)   | Auto-generated               |
| name      | String      |                              |
| email     | String      | Unique                       |
| password  | String      | bcryptjs hashed              |
| role      | Enum        | `ADMIN` or `SELLER`          |
| createdAt | DateTime    |                              |
| updatedAt | DateTime    |                              |

### Product
| Field           | Type               | Notes                                              |
|-----------------|--------------------|----------------------------------------------------|
| id              | UUID (PK)          |                                                    |
| name            | String             | Unique                                             |
| description     | String?            | Optional                                           |
| category        | String             | e.g. Solvents, Acids, Salts                        |
| dimensionType   | Enum               | `WEIGHT`, `VOLUME`, or `COUNT`                     |
| baseUnit        | String             | Always `g`, `mL`, or `item`                        |
| ratePerBaseUnit | NUMERIC(18,6)      | ₹ per 1 base unit                                  |
| stockQuantity   | NUMERIC(18,6)      | Always in base unit                                |

### Order
| Field      | Type          | Notes                             |
|------------|---------------|-----------------------------------|
| id         | UUID (PK)     |                                   |
| userId     | UUID (FK)     | → User                            |
| status     | Enum          | `PENDING`, `APPROVED`, `REJECTED` |
| totalPrice | NUMERIC(18,6) | Sum of all order item prices       |
| createdAt  | DateTime      |                                   |

### OrderItem ← Most Important Table
| Field             | Type          | Notes                                          |
|-------------------|---------------|------------------------------------------------|
| id                | UUID (PK)     |                                                |
| orderId           | UUID (FK)     | → Order                                        |
| productId         | UUID (FK)     | → Product                                      |
| enteredQuantity   | NUMERIC(18,6) | What the seller typed (e.g. `2`)               |
| enteredUnit       | String        | What the seller chose (e.g. `kg`)              |
| quantityInBaseUnit| NUMERIC(18,6) | Converted value (e.g. `2000` for 2 kg)         |
| calculatedPrice   | NUMERIC(18,6) | `quantityInBaseUnit × ratePerBaseUnit`         |

---

## Unit Storage & Conversion Strategy

### Why Base Units?
Storing all quantities in a single base unit per dimension type eliminates conversion ambiguity and makes pricing calculations trivially correct.

### Dimension → Base Unit Mapping
| Dimension | Base Unit | Supported Input Units |
|-----------|-----------|-----------------------|
| WEIGHT    | `g`       | `g`, `kg`             |
| VOLUME    | `mL`      | `mL`, `L`             |
| COUNT     | `item`    | `item`                |

### Conversion Factors (`src/utils/conversions.ts`)
```ts
const UNIT_FACTORS = {
  g:    1,       // base
  kg:   1000,    // 1 kg = 1000 g
  mL:   1,       // base
  L:    1000,    // 1 L = 1000 mL
  item: 1,       // base
}
```

### Pricing Strategy
Prices are **always stored as rate per 1 base unit** in the database:

| Admin Inputs     | Stored in DB as            |
|------------------|----------------------------|
| ₹1000 per L      | ₹1.000000 per mL           |
| ₹1200 per kg     | ₹1.200000 per g            |
| ₹150 per item    | ₹150.000000 per item       |

This means price calculation is always: `quantityInBaseUnit × ratePerBaseUnit`.

**Example:**
```
Product: Ethanol
Admin configures: ₹1000/L  →  stored as ₹1.000000/mL

Seller orders: 250 mL
  quantityInBaseUnit = 250 mL × 1 = 250 mL
  calculatedPrice    = 250 × ₹1.000000 = ₹250.00 ✓

Seller orders: 2 L
  quantityInBaseUnit = 2 × 1000 = 2000 mL
  calculatedPrice    = 2000 × ₹1.000000 = ₹2000.00 ✓
```

### Conversion Flow
```
User Input (e.g. 2 kg Sodium Chloride)
    │
    ▼  convertToBaseUnit(2, "kg") → 2 × 1000 = 2000 g
    │
    ▼  calculatePrice(2000, 1.2) → ₹2400
    │
    ▼  Store in OrderItem:
       enteredQuantity = 2
       enteredUnit = "kg"
       quantityInBaseUnit = 2000
       calculatedPrice = 2400.00
```

### Where Conversions Happen
- **Saving products** (`actions.ts → createProductAction`): admin's display-unit rate → base unit rate
- **Placing orders** (`actions.ts → placeOrderAction`): seller's entered quantity → base unit quantity → price
- **Displaying data** (UI components): base unit values → display unit for human-readable presentation

---

## PostgreSQL Data Types Rationale

| Field Type     | PostgreSQL Type  | Reason                                                              |
|----------------|------------------|---------------------------------------------------------------------|
| Price/Rate     | `NUMERIC(18,6)`  | 18 digits total, 6 decimal places. No floating-point rounding errors. Supports prices like ₹0.000001/mL |
| Quantity/Stock | `NUMERIC(18,6)`  | Same. Supports both large stocks (millions of mL) and tiny decimals |

`NUMERIC` (also called `DECIMAL`) is an exact numeric type in PostgreSQL, unlike `FLOAT` or `DOUBLE` which have binary floating-point representation errors that compound in financial calculations.

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Steps
```bash
# 1. Clone and enter directory
cd C:\Users\swaya\.gemini\antigravity\scratch\medchem-inventory

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Create .env file
# DATABASE_URL="postgresql://..."   ← your Neon connection string with &schema=medchem
# NEXTAUTH_SECRET="your-secret-key"
# NEXTAUTH_URL="http://localhost:3000"

# 4. Push schema to database
npx prisma db push

# 5. Generate Prisma client
npx prisma generate

# 6. Seed sample data
npx prisma db seed

# 7. Run dev server
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the sign-in page.

---

## Deployment to Vercel

1. Push this project to a GitHub repository
2. Import it in [vercel.com](https://vercel.com)
3. Set these environment variables in Vercel Dashboard:
   - `DATABASE_URL` — Neon PostgreSQL connection string (with `?sslmode=require&schema=medchem`)
   - `NEXTAUTH_SECRET` — any strong random string
   - `NEXTAUTH_URL` — your Vercel deployment URL (e.g. `https://medchem.vercel.app`)
4. Deploy. Vercel will run `npm run build` automatically.

---

## Using the Application

### Admin Panel (`/admin`)
1. Log in as Admin
2. **Products tab**: Create/edit/delete products. The form shows a live preview of the exact values that will be stored in the DB (base unit rate and base unit stock).
3. **Incoming Orders tab**: View all submitted orders. Click any row to expand and see the full conversion audit (entered unit → base unit → formula → price). Approve or Reject pending orders.

### Seller Panel (`/seller`)
1. Log in as Seller
2. **Browse Chemicals tab**: Search by name, filter by category. Each card shows the catalog price in a human-friendly unit (e.g. ₹1000/L) and the base rate for transparency.
3. Click "Add to Order" → adjust quantity and unit in the order panel on the right. The system shows the live formula: `X unit = Y base_unit → ₹Z`.
4. Click "Place Quotation / Order" to submit. The order goes to `PENDING` and awaits Admin approval.
5. **My Orders tab**: Track status of all your submitted orders.

---

## Git Commit Strategy
Following incremental commits (not a single mega-commit):
1. `chore: Initial Next.js project setup`
2. `feat: Database schema - User, Product, Order, OrderItem with NUMERIC(18,6)`
3. `feat: NextAuth credentials authentication with ADMIN/SELLER roles`
4. `feat: Unit conversion utilities - convertToBaseUnit, calculatePrice`
5. `feat: Admin product CRUD with live base-unit conversion preview`
6. `feat: Seller catalog, cart, and quotation/order placement flow`
7. `feat: Admin order audit panel with conversion verification`
8. `chore: UI polish, global CSS, and documentation`
