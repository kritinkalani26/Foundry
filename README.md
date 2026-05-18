# Foundry — India's Makerspace Marketplace

> Every tool. Every city. One platform.

Foundry connects people who need access to fabrication equipment — 3D printers, laser cutters, CNC mills, lathes, water jets, and more — with verified local space owners across India's tier-2 cities. This is something I am just starting in India, but this will be useful around the world, including the US. I will expand it to other countries, based on pricing data from there.

**Live demo:** `npm run dev` → `http://localhost:3000`

---

## The Problem

A student in Kota who needs a custom drone part fabricated, a small business in Indore that needs laser-cut acrylic panels, a PCB prototype needed in Patna — all of them either pay 4–5× for shipping from metros, wait weeks, or simply don't make the thing.

Meanwhile, thousands of individuals and small shops in these cities own idle fabrication equipment — 3D printers, laser cutters, lathes — and have no reliable way to find paying customers outside their immediate network.

**Foundry closes this gap with a two-sided marketplace.**

---

## What Foundry Does

Customers describe their job, get an instant ML-powered price estimate, and connect with verified local space owners who have the right equipment. Space owners earn income on idle machine time.

Supported equipment:

| Equipment | Use Case |
|-----------|----------|
| 3D Printer (FDM / SLA / Resin) | Prototypes, custom parts, miniatures |
| Laser Cutter | Acrylic panels, wood signage, leather goods |
| CNC Mill | Precision aluminum/steel parts, woodwork |
| Lathe | Turned parts, shafts, custom hardware |
| Water Jet | Sheet metal, stone, glass cutting |
| Soldering / PCB Assembly | Electronics prototyping and assembly |
| Vinyl Cutter | Stickers, heat-transfer graphics, signage |
| PCB Fabrication | Custom circuit boards, 1–8 layer |

---

## ML-Powered Pricing

The core technical differentiator is an ML pricing engine trained on Indian market data — replacing the naive formula most platforms use.

### How it works

For each equipment type, a **Gradient Boosting Regressor** (100 trees, depth 4) is trained on 350–500 synthetic data points calibrated against real Indian makerspace rates (sourced from 3Ding, IndiaMART listings, Makenica, FabLab Indore, and local operator interviews).

Models are trained on `log(price)` so relative error is minimized across the wide price range (₹80 → ₹50,000+).

**Training metrics:**

| Equipment | R² | Typical MAPE |
|---|---|---|
| 3D Printer | 0.954 | 15.9% |
| Laser Cutter | 0.965 | 19.0% |
| CNC Mill | 0.952 | 14.0% |
| Lathe | 0.912 | 21.1% |
| Water Jet | 0.954 | 15.4% |
| Soldering | 0.964 | 17.2% |
| Vinyl Cutter | 0.974 | 20.6% |
| PCB Fabrication | 0.980 | 13.8% |

### Inference pipeline

Models are serialized as compact nested JSON tree structures (~50KB each) and served from a Next.js API route with zero external dependencies:

```
POST /api/price
Body: { equipment: "laser-cutter", params: { widthMm, heightMm, materialCode, thicknessMm, quantity } }
→ { price: 977, low: 801, high: 1153 }
```

The TypeScript inference engine traverses the gradient boosted trees directly — no Python at runtime, no ML server to maintain:

```typescript
function traverseTree(node: TreeNode, feats: number[]): number {
  if (node.v !== undefined) return node.v;
  return feats[node.f!] <= node.t!
    ? traverseTree(node.l!, feats)
    : traverseTree(node.r!, feats);
}

function predictGBM(model: ModelData, feats: number[]): PriceResult {
  let logPred = model.init_value;
  for (const tree of model.trees) {
    logPred += model.learning_rate * traverseTree(tree, feats);
  }
  return { price: Math.round(Math.exp(logPred)), ... };
}
```

### Sample predictions

```
3D Print  — 42cm³ PLA, 30% infill:      ₹285   (range ₹234–336)
3D Print  — 80cm³ Resin:                ₹2,635
Laser Cut — 200×150mm acrylic 3mm:      ₹977
CNC Mill  — aluminum, medium complexity: ₹2,369
PCB Fab   — 10×10cm, 2-layer, qty 10:   ₹1,607
```

To retrain models with real order data: `python scripts/train_models.py`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                 │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  STL Parser  │  │  Three.js   │  │  ML Price  │ │
│  │ (WebAssembly)│  │  3D Viewer  │  │  Estimator │ │
│  └──────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS / Next.js API Routes
┌─────────────────────────▼───────────────────────────┐
│                   Next.js 14 Server                 │
│  ┌──────────────────────────────────────────────┐   │
│  │              API Routes                      │   │
│  │  /api/price    /api/orders   /api/printers   │   │
│  │  /api/demand   /api/ratings  /api/payment    │   │
│  └──────────────────────────────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  GBM Inference  │  │  Matching Algorithm      │  │
│  │  (8 ML models)  │  │  (distance+rating+price) │  │
│  └─────────────────┘  └──────────────────────────┘  │
└───────────────┬─────────────────┬───────────────────┘
                ▼                 ▼
        ┌────────────┐     ┌────────────┐
        │ PostgreSQL │     │ Cloudinary │
        │  + Prisma  │     │  (Files)   │
        └────────────┘     └────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) with Server Components |
| Language | TypeScript end-to-end |
| ML Training | Python · scikit-learn · XGBoost |
| ML Inference | TypeScript GBM engine (no runtime Python dependency) |
| Database | PostgreSQL + Prisma ORM |
| File Storage | Cloudinary |
| 3D Rendering | Three.js (lazy-loaded) |
| Payments | UPI simulation (Razorpay-ready) |

---

## Key Features

### 1. STL File Analyzer
Parses binary/ASCII STL files entirely in the browser. Uses the **Divergence Theorem** to compute volume:

```
V = (1/6) × |Σ v₁ · (v₂ × v₃)|
```

Outputs: volume (cm³), surface area, bounding box, triangle count, estimated print time, support structure detection.

### 2. Printer Owner Matching Algorithm
Filters candidates by material support, build volume, and distance (Haversine ≤ 100km), then scores them:

```
score = distance_score × 0.40
      + rating_score   × 0.35
      + price_score    × 0.25
```

Each dimension is normalized across the live candidate set so no single factor dominates.

### 3. Demand-Based Surge Pricing
```
daily_ratio = today_orders / (7_day_average)
if daily_ratio ≥ 2.0 → surge multiplier up to 1.5×
```

### 4. Order State Machine
```
UPLOADED → QUOTED → CONFIRMED → PRINTING → QUALITY_CHECK → READY → DELIVERED
```

Each transition is timestamped in `OrderStatusHistory`. Estimated completion is computed from print time on transition to `PRINTING`.

### 5. Rating System
```
composite = print_quality × 0.50 + accuracy × 0.35 + packaging × 0.15
```

Owners with composite < 3.5 are hidden from the matching pool automatically.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — all 8 equipment types, city coverage, how it works |
| `/upload` | STL upload → 3D preview → ML price estimate → printer matching → UPI payment |
| `/request` | Quote request form for non-3D equipment (laser, CNC, lathe, etc.) with live ML estimate sidebar |
| `/printers` | Browse verified space owners by city |
| `/owner` | Space owner onboarding — supports all 8 equipment types with dynamic form |
| `/dashboard/customer` | Customer order history |
| `/dashboard/owner` | Owner dashboard — earnings, orders, surge controls |
| `/order/[id]` | Real-time order tracking |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ with scikit-learn (`pip install scikit-learn numpy`)
- PostgreSQL 14+ (optional — demo mode works without it)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/foundry
cd foundry
npm install

# Configure environment (database and file storage)
cp .env.example .env
# Edit .env — the app runs in demo mode without a real database

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Retrain ML models (optional)

```bash
python scripts/train_models.py
# Outputs 8 model JSON files to src/lib/models/
```

---

## Database Schema (simplified)

```
User ──< Order ──< OrderStatusHistory
           │
           ├──< Quote ──> PrinterOwner ──< Printer
           │
           ├──> STLAnalysis
           └──> Rating
```

---

## Roadmap

- **Real training data** — replace synthetic data with actual accepted quotes from live orders; retrain monthly
- **Authentication** — NextAuth with Google + phone OTP
- **Mobile app** — React Native owner app for managing orders on the go
- **Live tracking** — GPS-based delivery tracking for pickup orders
- **Multi-city expansion** — Bhopal, Varanasi, Jodhpur, Raipur

---

## Why This Matters

India has ~3 million engineering students. The majority study in tier-2 cities where fabrication access is near-zero. Physical prototyping is foundational to engineering education — it's the difference between understanding a concept and building something real.

Beyond students: tier-2 India has a growing class of small manufacturers, repair shops, and solo founders who need fabrication on-demand. The total addressable market is not a niche — it's the next 300 million people coming online with something to build.

---

*Built to close the fabrication gap in India's tier-2 cities.*
