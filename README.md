# CourierTrack – Courier & Parcel Tracking System

A full-featured Courier & Parcel Tracking System built with React, Vite, Tailwind CSS, and JSON Server.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Install & Run
```bash
npm install
npm start        # starts both JSON Server (port 3001) and Vite dev server (port 5173)
```

Or run separately:
```bash
npm run server   # JSON Server on http://localhost:3001
npm run dev      # Vite on http://localhost:5173
```

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@courier.com | password123 |
| **Branch Staff** | staff1@courier.com | password123 |
| **Delivery Agent** | agent1@courier.com | password123 |
| **Customer** | customer1@example.com | password123 |

## 🌐 Public Tracking
Track parcels without login: `http://localhost:5173/track`

## 📦 Tech Stack
- **Frontend**: React 18, React Router v6, Tailwind CSS, React Icons
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Backend**: JSON Server (db.json)
- **Date Utilities**: date-fns

## 🔖 Features
- **Role-Based Access Control**: Admin, Branch Staff, Delivery Agent, Customer
- **Shipment Lifecycle**: Created → Branch Received → Processing → In Transit → Arrived → Agent Assigned → Out for Delivery → Delivered
- **Failed/Return Flow**: Delivery Failed → Return Initiated → Returned to Sender
- **Cancellation**: Available before shipment reaches non-cancellable stage
- **Tracking**: Public parcel tracking with full timeline
- **Branch Transfers**: Transfer parcels between branches
- **Delivery Confirmation**: Agents update delivery status with receiver details
- **Pricing Engine**: Configurable pricing by delivery type and weight
- **Payments**: Track payments with multiple methods
- **Reports**: Shipment, Delivery, Revenue, Branch reports with filters
- **Notifications**: In-app notification system
- **Responsive**: Fully mobile-responsive UI

## 📁 Project Structure
```
src/
├── api/          # Axios API functions
├── components/   # Shared UI components
├── context/      # Auth & Toast context
├── pages/        # All page components
│   ├── dashboard/    # Role-specific dashboards
│   ├── shipments/    # Shipment CRUD + detail
│   ├── customers/    # Customer management
│   ├── branches/     # Branch management
│   ├── agents/       # Delivery agent management
│   ├── tracking/     # Public tracking page
│   ├── transfers/    # Branch transfers
│   ├── delivery/     # Delivery management
│   ├── payments/     # Payment management
│   ├── pricing/      # Pricing configuration
│   └── reports/      # 4 report types
└── utils/        # Constants, helpers, validators
```

## 🚀 Deploy

### Netlify
```bash
npm run build
# Deploy the dist/ folder to Netlify
# netlify.toml is pre-configured
```

### Vercel
```bash
npm run build
# vercel.json is pre-configured
vercel deploy
```

> **Note**: For production, replace JSON Server with a real backend (Node.js/Express, Firebase, Supabase, etc.). JSON Server is for development only.
