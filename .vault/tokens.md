# TOKENS.md — UI DESIGN TOKENS, OLED THEME & HARDWARE INTEGRATION

> **VAULT LOCK STATUS:** ACTIVE (`CLAUDE.md` -> `TOKENS.md`)

---

## 1. DUAL-THEME COLOR PALETTE (`src/store/themeStore.ts`)

| Token Name | Light Theme | OLED Dark Theme | Notes / Usage |
|---|---|---|---|
| `background` | `#f8fafc` (Slate 50) | `#000000` (Pure Black) | 0% battery draw on AMOLED/OLED displays. |
| `surface` | `#ffffff` | `#09090b` (Zinc 950) | Elevated modal, card, and sheet background. |
| `card` | `#ffffff` | `#121214` (Deep Zinc) | Product and order list items. |
| `border` | `#e2e8f0` (Slate 200) | `#27272a` (Zinc 800) | Subtle separator and input boundaries. |
| `text` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Primary titles and body text. |
| `textSecondary`| `#64748b` (Slate 500) | `#a1a1aa` (Zinc 400) | Timestamps, subtitles, and labels. |
| `primary` | `#0284c7` (Sky 600) | `#38bdf8` (Sky 400) | Primary interactive buttons and highlights. |

---

## 2. WOOCOMMERCE & ORDER STATUS ACCENTS

| Token Context | Value | Application |
|---|---|---|
| **Active Tab Pill** | `rgba(139, 92, 246, 0.22)` | Bottom tab bar active indicator pill. |
| **Active Tab Icon** | `#c084fc` (Purple 400) | Tint for selected tab icon. |
| **Tab Badge** | `#8b5cf6` (Purple 500) | Pending order count pill badge. |
| **Delivered / Verified** | `#10b981` (Emerald 500) | Successful fulfillment badges. |
| **Pending / Follow-up**| `#f59e0b` (Amber 500) | Awaiting action or verification. |
| **Cancelled / Fake** | `#ef4444` (Red 500) | Rejection and fraud alert badges. |

---

## 3. HARDWARE & PERIPHERAL INTEGRATION SPECIFICATIONS

### 3.1 Camera Barcode & SKU Scanner (`src/components/BarcodeScanner.tsx`)
- Uses `expo-camera` with `CameraView`.
- Scans `ean13`, `qr`, `code128`, `upc_a` barcodes in real time.
- Features: Live scanning targeting reticle, hardware torch toggle, manual SKU keyboard input fallback.

### 3.2 "Cha-Ching!" Cash Register Audio Chime (`src/services/soundService.ts`)
- Plays instant cash register chime upon new order arrival or test sound button.
- Uses `expo-av` with `android/app/src/main/res/raw/chaching.wav`.
- Wrapped in defensive `try / catch` blocks to prevent unhandled audio driver rejections.
- Fallback to Web Audio API synthesis (`synthesizeChaChingWeb()`) for web preview.

### 3.3 FCM Order Alert Notification Channel (`src/hooks/usePushNotifications.ts`)
- Configured with Android Channel ID `'order-alerts'`.
- Sound: `'chaching'` (with graceful fallback to `'default'`).
- Importance: `AndroidImportance.MAX`.
- Vibration pattern: `[0, 250, 250, 250]`.
- Trigger: Plays foreground chime and invalidates TanStack Query caches for zero-touch UI refresh.

