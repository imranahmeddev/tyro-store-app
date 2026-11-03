# CLAUDE.md — MOBILE APP MASTER ROUTER & CONTEXT ARCHITECTURE VAULT

> **SYSTEM LOCK (MANDATORY FOR ALL AI CODING AGENTS):**
> You are operating inside **Tyro eComm - Store Management App**, a multi-store WooCommerce/Shopify-style merchant companion app built on **React Native 0.88.1 + React 19.3.0 + Expo SDK ~58.0.21 + Expo Router ~58.0.28 + Zustand + TanStack React Query**.
> It communicates with the **TyroeCom (`Code 12`)** backend over the `/api/v1/*` Sanctum API.
> Even when conversation context window compacts, you **MUST NOT** guess native versions, invent API paths, or re-enable the New Architecture without reading the relevant Context Architecture Vault files below.

---

## 1. MANDATORY PRE-EXECUTION ROUTING PROTOCOL

Before modifying code, run this **3-Step Context Lock**:
1. **Identify Task Domain:** Match the task to the Routing Matrix below.
2. **Read & Lock Vault Files:** Read `.vault/stack.md`, `.vault/prd.md`, `.vault/state.md`, `.vault/tokens.md`, and `.vault/plan.md`.
3. **Verify Invariants:** Check your changes against the **Hard Mobile Invariants** in Section 3.

---

## 2. MASTER ROUTER MATRIX

| Vault File | Path | Primary Responsibility | When You MUST Lock & Read This File |
|---|---|---|---|
| **1. Tech Stack Lock** | `.vault/stack.md` | React Native 0.88.1, React 19.3.0, Expo SDK ~58.0.21, `newArchEnabled: false`, Hermes, package ID `com.theimranahmed.tyroecom`. | **ALWAYS READ FIRST** on build configs, dependencies, native Android/iOS changes, or audio/push services. |
| **2. Product Requirements** | `.vault/prd.md` | 14-screen directory map (`app/`, `src/components/`, `app/hub/*`), screen-by-screen audit, and exact `/api/v1/*` contract with `Code 12`. | Modifying screens, creating order/product mutations, or connecting backend endpoints. |
| **3. State Machines & Flows** | `.vault/state.md` | Multi-store connection lifecycle (`/auth/token`, `/store-info`, `/devices`), `expo-secure-store` persistence (`authStore.ts`), dynamic Axios interceptor (`src/api/client.ts`), 401 revocation. | Touching authentication, store switching, API interceptors, push tokens, or offline cache. |
| **4. Design Tokens & Hardware** | `.vault/tokens.md` | Light & OLED Pure Black (`#000000`) palettes (`themeStore.ts`), WooCommerce purple accents (`#8b5cf6` / `#c084fc`), Barcode Scanner, "Cha-Ching!" audio, and FCM push notifications. | Modifying styling, theme hooks, audio playback (`soundService.ts`), camera scanning, or push notification handlers. |
| **5. Phased Roadmap** | `.vault/plan.md` | Phased Android crash remediation checklist, release verification, and future feature sprint tracking. | Executing bug fixes, performance optimizations, or release builds. |

---

## 3. HARD MOBILE ARCHITECTURAL INVARIANTS (NEVER VIOLATE)

### 3.1 Native & Architecture Invariants (`stack.md` + `plan.md`)
- **`newArchEnabled` Aligned with React Native 0.88.1:** `"newArchEnabled": true` in `app.json` and `newArchEnabled=true` in `android/gradle.properties` to support `ExpoReactHostFactory` and TurboModules. Legacy `expo-av` is completely uninstalled.
- **Never Execute Native Modules at Root Module Scope:** Never call `Notifications.setNotificationHandler()`, `Audio.setAudioModeAsync()`, or native permissions at top-level JavaScript execution. Always execute them inside React component lifecycles (`useEffect`) wrapped in `try / catch`.
- **Root Error Boundary Mandatory:** `<RootNavigation />` in `app/_layout.tsx` must always be wrapped in `<AppErrorBoundary>` to prevent silent native process crashes.
- **Package ID Consistency:** The Android package and iOS bundle identifier must both strictly match `"com.theimranahmed.tyroecom"` (matching `google-services.json`).
- **Permissions Declaration:** Android permissions (`POST_NOTIFICATIONS`, `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE`) must be explicitly declared in both `AndroidManifest.xml` and `app.json`.

### 3.2 State, Multi-Store & Network Invariants (`state.md` + `prd.md`)
- **Dynamic Axios BaseURL:** Never hardcode a store domain in API calls. All network requests must use `src/api/client.ts` with relative paths (`/api/v1/...`), which resolves `config.baseURL` dynamically from `useAuthStore.getState().getActiveStore()`.
- **Zero Premature Redirects on Cold Start:** `app/index.tsx` must check `isInitialized` before evaluating `activeStoreId`. If `!isInitialized`, it must return `null` or a themed loading indicator and allow `app/_layout.tsx` to handle splash screen hide after state hydration.
- **Defensive Push Notification Setup:** `registerForPushNotificationsAsync()` must only run after `isInitialized === true` and `activeStoreId` exists. All channel, permission, and token calls must be defensively wrapped so permission denials or missing Play Services never crash the app.

### 3.3 UI & Hardware Invariants (`tokens.md`)
- **OLED Pure Black:** Dark mode background must remain `#000000` (true deep black for 0% AMOLED battery drain).
- **TypeScript Strictness:** All application source code (`app/`, `src/`) uses strict TypeScript (`.tsx` and `.ts`). Verify zero errors with `npx tsc --noEmit`.

