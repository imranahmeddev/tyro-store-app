# PRD.md — MOBILE PRODUCT REQUIREMENTS & API CONTRACT

> **VAULT LOCK STATUS:** ACTIVE (`CLAUDE.md` -> `PRD.md`)

---

## 1. 14-SCREEN ARCHITECTURE & COMPONENT DIRECTORY

```text
Tyro eComm - Store Management App/
├── app/
│   ├── _layout.tsx                     # Root App shell, Theme/Auth init, Push setup & Error Boundary
│   ├── index.tsx                       # Guarded Cold Start Router (waits for isInitialized)
│   ├── login.tsx                       # Multi-store connection screen (Store URL + Credentials)
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Bottom tab bar with live pending order badge
│   │   ├── dashboard.tsx               # Analytics overview, charts, top products, live revenue
│   │   ├── orders.tsx                  # Order listing with status pills, search, date filtering
│   │   ├── products.tsx                # Catalog manager with inline stock editor & search
│   │   └── customers.tsx               # Customer directory with search and order history
│   ├── orders/
│   │   ├── [id].tsx                    # Order details, status progression, notes, courier dispatch
│   │   ├── abandoned/
│   │   │   └── [id].tsx                # Abandoned Cart breakdown, 1-tap call/WhatsApp, note, convert to order
│   │   ├── create.tsx                  # Mobile POS: customer info, item builder, shipping & discounts
│   │   └── edit.tsx                    # Edit existing customer details, address, delivery notes
│   ├── customers/
│   │   └── [id].tsx                    # Customer profile, LTV, total orders, direct dial/SMS shortcut
│   └── hub/
│       ├── index.tsx                   # Commerce Hub navigation grid
│       ├── coupons/
│       │   ├── index.tsx               # Coupon list with active/inactive status toggle
│       │   └── create.tsx              # Create coupon (percentage, fixed, min spend, expiry)
│       ├── reviews/
│       │   └── index.tsx               # Customer review moderation queue & merchant replies
│       └── settings/
│           └── index.tsx               # Multi-store manager, theme switcher, sound test, OTA updater
├── src/
│   ├── api/
│   │   └── client.ts                   # Dynamic multi-tenant Axios instance with 401 interceptor
│   ├── components/
│   │   ├── AppErrorBoundary.tsx        # React Native native crash recovery UI
│   │   ├── BarcodeScanner.tsx          # Camera-based live barcode/SKU scanner
│   │   └── ProductForm.tsx             # Shared product create/edit form with media upload
│   ├── hooks/
│   │   └── usePushNotifications.ts     # Android notification channels, FCM token registration
│   ├── services/
│   │   └── soundService.ts             # "Cha-Ching!" cash register audio playback service
│   └── store/
│       ├── authStore.ts                # Multi-store credential persistence in SecureStore
│       └── themeStore.ts               # OLED Pure Black & Light theme store
```

---

## 2. BACKEND API CONTRACT (`Code 12` -> `MOBILE APP`)

All endpoints are hosted on the backend in `Code 12` under `/api/v1/*` (configured in `routes/api.php` and `app/Http/Controllers/Api/V1/*`):

| Screen / Feature | Mobile Client Call | Backend Handler (`Code 12`) | Contract & Payload Spec |
|---|---|---|---|
| **Login / Connect** | `POST /api/v1/auth/token`<br>`GET /api/v1/store-info` | `AuthController@token`<br>`StoreInfoController@index` | Input: `{email, password, device_name}`.<br>Returns: `{access_token, user}` and `{store_name, currency, logo}`. |
| **Dashboard** | `GET /api/v1/dashboard` | `DashboardController@index` | Query params: `{period, date_type, metric_type}`.<br>Returns: gross revenue, total orders, average order value, top products. |
| **Orders List** | `GET /api/v1/orders` | `OrderController@index` | Query params: `{page, per_page, status, search, include_abandoned}`.<br>Returns paginated orders with eager-loaded `items`. Supports `status=abandoned` and unified chronological feed. |
| **Abandoned Checkouts** | `GET /api/v1/abandoned-checkouts`<br>`GET /api/v1/abandoned-checkouts/{id}`<br>`PATCH /api/v1/abandoned-checkouts/{id}/note`<br>`PATCH /api/v1/abandoned-checkouts/{id}/recover`<br>`POST /api/v1/abandoned-checkouts/{id}/convert`<br>`DELETE /api/v1/abandoned-checkouts/{id}` | `AbandonedCheckoutController` | Full abandoned cart lifecycle: paginated listing with stats, 1-tap call/WhatsApp customer reachout, note update, recovery toggle, 1-click atomic conversion to real Order, and deletion. |
| **Order Details** | `GET /api/v1/orders/{id}` | `OrderController@show` | Returns order details, items, customer history, next/previous navigation IDs. |
| **Order Status Update** | `PATCH /api/v1/orders/{id}/status` | `OrderController@updateStatus` | Body: `{status: 'confirmed'\|'shipped'\|'delivered'\|'cancelled'}`. Triggers server stock/coupon reconciliation. |
| **Order Notes** | `POST /api/v1/orders/{id}/notes` | `OrderController@addNote` | Body: `{note: string}`. Adds staff timeline note. |
| **Mobile POS (Create)** | `POST /api/v1/orders` | `OrderController@store` | Body: `{customer_name, customer_phone, shipping_address, items: [{product_id, quantity, variant_id, unit_price}]}`. |
| **Quick Stock Update** | `PATCH /api/v1/inventory/{id}/stock`| `InventoryController@updateStock` | Body: `{stock_quantity: number}`. Instant stock override. |
| **Product Media Upload** | `POST /api/v1/products/media` | `ProductController@uploadMedia` | `multipart/form-data` with `file`. Returns public URL or CDN path. |
| **Customer Directory** | `GET /api/v1/customers` | `CustomerController@index` | Paginated customer search with order counts and spent totals. |
| **Coupons** | `GET /api/v1/coupons`<br>`POST /api/v1/coupons`<br>`PATCH /api/v1/coupons/{id}/toggle` | `CouponController` | List, create, and toggle active status. |
| **Review Moderation** | `GET /api/v1/reviews`<br>`PATCH /api/v1/reviews/{id}/status`<br>`POST /api/v1/reviews/{id}/reply` | `ReviewController` | Approve, reject, and submit merchant reply. |
| **Push Device Token** | `POST /api/v1/devices` | `DeviceController@store` | Body: `{token, platform: 'android'\|'ios', device_name}`. Stored in `device_tokens` table. |
| **OTA Updater** | `GET /api/v1/update/check`<br>`POST /api/v1/update/run` | `UpdateController` | Self-hosted backend update check and pipeline. |

