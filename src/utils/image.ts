import { useAuthStore } from '../store/authStore';

/**
 * Universal helper to resolve any image string, image object, or product/item entity
 * into a fully-qualified, valid HTTPS URL suitable for React Native <Image source={{ uri }}>.
 * Returns null if no valid image is available.
 */
export function resolveProductImage(
  itemOrUrl: any,
  overrideStoreUrl?: string
): string | null {
  if (!itemOrUrl) return null;

  let raw: string | null = null;

  // 1. Raw string passed directly
  if (typeof itemOrUrl === 'string') {
    raw = itemOrUrl.trim();
  } else if (typeof itemOrUrl === 'object') {
    // 2. Extract potential image properties
    raw =
      itemOrUrl.image_url ||
      itemOrUrl.image ||
      itemOrUrl.primary_image ||
      itemOrUrl.thumbnail ||
      itemOrUrl.feature_image ||
      itemOrUrl.img ||
      itemOrUrl.url ||
      itemOrUrl.src ||
      itemOrUrl.path ||
      itemOrUrl.images?.[0]?.url ||
      itemOrUrl.images?.[0]?.image_url ||
      itemOrUrl.images?.[0]?.path ||
      itemOrUrl.product?.image_url ||
      itemOrUrl.product?.image ||
      itemOrUrl.product?.primary_image ||
      itemOrUrl.product?.thumbnail ||
      null;

    if (raw && typeof raw !== 'string') {
      if (typeof (raw as any).url === 'string') raw = (raw as any).url;
      else if (typeof (raw as any).path === 'string') raw = (raw as any).path;
      else raw = null;
    }
  }

  if (!raw || typeof raw !== 'string') return null;
  raw = raw.trim();

  // If empty or an SVG data URI (React Native <Image> cannot render SVG data URIs)
  if (raw === '' || raw.startsWith('data:image/svg')) {
    return null;
  }

  // Handle local file URIs (e.g. file:// picked from device library)
  if (raw.startsWith('file://') || raw.startsWith('content://')) {
    return raw;
  }

  // Get active store base URL
  const activeStore = useAuthStore.getState().getActiveStore();
  const rawBase = (overrideStoreUrl || activeStore?.store_url || 'https://aamzo.com')
    .trim()
    .replace(/\/+$/, '');
  const baseUrl = rawBase.startsWith('http') ? rawBase : `https://${rawBase}`;
  const isHttpsStore = baseUrl.startsWith('https://');

  // Handle full HTTP / HTTPS URLs
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // Replace localhost / 127.0.0.1 with store URL
    let fixed = raw.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, baseUrl);

    // Upgrade http:// to https:// if store uses https
    if (
      isHttpsStore &&
      fixed.startsWith('http://') &&
      !fixed.includes('localhost') &&
      !fixed.includes('127.0.0.1')
    ) {
      fixed = 'https://' + fixed.slice(7);
    }
    return fixed;
  }

  // Handle relative paths (e.g. "/uploads/...", "uploads/...", "/storage/...")
  const cleanPath = raw.replace(/^\/+/, '');
  return `${baseUrl}/${cleanPath}`;
}
