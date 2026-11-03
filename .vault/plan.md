# PLAN.md — PHASED ANDROID CRASH REMEDIATION & RELEASE VERIFICATION

> **VAULT LOCK STATUS:** ACTIVE (`CLAUDE.md` -> `PLAN.md`)

---

## PHASE 1: ANDROID STANDALONE STARTUP CRASH REMEDIATION (P0 BLOCKER)

- [x] **1.1 Disable `newArchEnabled` to Eliminate `expo-av` C++ JNI SIGABRT Crash:**
  - In `app.json`: Change `"newArchEnabled": true` to `"newArchEnabled": false`.
  - In `android/gradle.properties`: Change `newArchEnabled=true` to `newArchEnabled=false`.
  - In `src/services/soundService.ts`: Defensively wrap `Audio.setAudioModeAsync`, `Audio.Sound.createAsync`, and `replayAsync` in `try / catch` blocks to prevent unhandled promise rejections.

- [x] **1.2 Defer Notifications Setup & Top-Level Handlers:**
  - In `app/_layout.tsx`: Remove `Notifications.setNotificationHandler` from global module scope; move inside `useEffect` wrapped in `try / catch`.
  - In `src/hooks/usePushNotifications.ts`: Defer channel and token registration until `isInitialized === true` and `activeStoreId` is truthy.
  - Defensively wrap channel creation with `sound: 'chaching'` with automatic fallback to `'default'`. Wrap `getPermissionsAsync`, `requestPermissionsAsync`, and `getDevicePushTokenAsync` in `try / catch`.

- [x] **1.3 Eliminate Cold Start Navigation Redirect Race Condition:**
  - In `app/index.tsx`: Wait for `isInitialized` from `useAuthStore` before reading `activeStoreId`. Return `null` while uninitialized to prevent early `<Redirect />` racing.
  - In `app/_layout.tsx`: Wrap `SplashScreen.preventAutoHideAsync()` in `.catch(() => {})`, coordinate navigation with `isInitialized`, and call `SplashScreen.hideAsync().catch(() => {})`.

- [x] **1.4 Implement Root React Native Error Boundary:**
  - Create `src/components/AppErrorBoundary.tsx` class component with dark/light recovery UI and reset retry handler.
  - Wrap `<RootNavigation />` inside `<AppErrorBoundary>` in `app/_layout.tsx`.

---

## PHASE 2: PERMISSIONS, ASSETS & BUILD CONFIGURATION (P1 HIGH)

- [x] **2.1 Add `POST_NOTIFICATIONS` Permission & Explicit Android Permissions:**
  - In `android/app/src/main/AndroidManifest.xml`: Add `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`.
  - In `app.json`: Add explicit `"permissions"` array under `"android"`.

- [x] **2.2 Fix iOS Bundle Identifier Typo:**
  - In `app.json:18`: Fix `"com.theimranahmed.tyroecomm"` to `"com.theimranahmed.tyroecom"` to match Android and `google-services.json`.

- [x] **2.3 Create Explicit `metro.config.js` for Audio Bundling:**
  - Create `metro.config.js` in project root using `getDefaultConfig(__dirname)` and registering `'wav'` and `'mp3'` in `resolver.assetExts`.

---

## PHASE 3: VERIFICATION & COMPILATION HEALTH (P2)

- [x] **3.1 TypeScript Typecheck:**
  - Run `npx tsc --noEmit` and confirm 0 type errors.
- [x] **3.2 Asset & Manifest Integrity:**
  - Verify `android/app/src/main/res/raw/chaching.wav` and `android/app/google-services.json` are intact.

---

## PHASE 4: ABANDONED CHECKOUT INTEGRATION & REAL-TIME ALERTS (P1 COMPLETED)

- [x] **4.1 Mobile Orders Feed Integration:**
  - Added `Abandoned` filter pill in horizontal status chips with live count badge from `GET /api/v1/abandoned-checkouts`.
  - Added specialized Abandoned Cart cards with `🛒 ABANDONED CART` / `RECOVERED` badge, customer phone, cart items preview, and quick 1-tap Call, WhatsApp, and Recover actions.
- [x] **4.2 Dedicated Detail View (`app/orders/abandoned/[id].tsx`):**
  - Built full breakdown screen with Customer Card, 1-Tap Call & WhatsApp reachout, Cart Items with images, quantities, unit prices, line totals, Admin Note editor, Mark as Recovered toggle, 1-Click "Convert to Order", and deletion.
- [x] **4.3 Real-Time Push Notification & Signature Chime:**
  - Updated `usePushNotifications.ts` to trigger `playChaChingSound()` and invalidate Query caches on `abandoned_checkout` events. Deep linking on tap opens the abandoned checkout directly.
- [x] **4.4 Orders Tab Badge:**
  - Updated tab layout to include unrecovered abandoned carts in the live Orders badge count.
