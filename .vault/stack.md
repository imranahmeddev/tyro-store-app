# STACK.md — MOBILE TECH STACK & RUNTIME INVARIANTS

> **VAULT LOCK STATUS:** ACTIVE (`CLAUDE.md` -> `STACK.md`)

---

## 1. CORE RUNTIME & DEPENDENCY MATRIX (`package.json`)

| Package | Declared Version | Role & Architectural Invariant |
|---|---|---|
| **`react-native`** | `0.88.1` | Native runtime on Android & iOS. Uses Hermes JavaScript engine. |
| **`react`** | `19.3.0` | React 19 core UI runtime. |
| **`react-dom`** | `19.3.0` | DOM renderer for Web preview. |
| **`expo`** | `~58.0.21` | Expo SDK 58 platform toolchain. |
| **`expo-router`** | `~58.0.28` | File-system-based routing engine (`app/`). |
| **`zustand`** | `^5.0.16` | Global store (`useAuthStore`, `useThemeStore`). |
| **`@tanstack/react-query`**| `^5.105.0` | Server state management, auto-caching, and background invalidation. |
| **`axios`** | `^1.21.0` | HTTP client with dynamic multi-tenant base URL and auth token injection. |
| **`expo-notifications`**| `~58.1.7` | Remote FCM push notifications and custom sound channels. |
| **`expo-secure-store`** | `~58.0.2` | Hardware-backed encrypted key-value store for merchant credentials. |
| **`expo-camera`** | `~58.0.14` | Live barcode scanning for order & SKU fulfillment. |
| **`expo-av`** | `^16.0.8` | Cash register audio chime ("Cha-Ching!") on order arrival. |
| **`expo-clipboard`** | `~58.0.4` | Merchant clipboard copying for tracking codes and customer details. |
| **`expo-device`** | `~58.0.5` | Physical hardware and device model detection. |
| **`expo-image-picker`** | `~58.0.10` | Media picking for product catalog image uploads. |
| **`expo-image-manipulator`**| `~58.0.16`| Image compression and format conversion before upload. |
| **`lucide-react-native`** | `^1.63.0` | Icon system. |

---

## 2. NATIVE ANDROID CONFIGURATION LOCK

| Setting | Location | Value | Reason |
|---|---|---|---|
| **Architecture Mode** | `app.json:10`<br>`android/gradle.properties:44` | `"newArchEnabled": false`<br>`newArchEnabled=false` | **LOCKED FALSE:** `expo-av` does not support React Native New Architecture (Fabric/TurboModules). Enabling New Architecture causes instant fatal `SIGABRT` / `UnsatisfiedLinkError` on Android startup. |
| **JS Engine** | `android/gradle.properties:48` | `hermesEnabled=true` | High-performance AOT bytecode execution. |
| **Package ID** | `app.json:28`<br>`android/app/build.gradle:89` | `com.theimranahmed.tyroecom` | Canonical package name matching `google-services.json`. |
| **iOS Bundle ID** | `app.json:18` | `com.theimranahmed.tyroecom` | Corrected to match Android and Firebase config. |
| **Minification / R8** | `android/gradle.properties:32` | `android.enableMinifyInReleaseBuilds=false` | Avoids aggressive bytecode stripping of TurboModules and reflection helpers. |
| **Asset Extensions** | `metro.config.js` | `['wav', 'mp3', ...]` | Bundles raw audio assets for offline cash-register chimes. |

