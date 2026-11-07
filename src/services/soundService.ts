import { Platform, Vibration } from 'react-native';

/**
 * High-fidelity Web Audio synthesis for web previews.
 */
function synthesizeChaChingWeb(): void {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // 1. First crisp register coin ding
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1760, now);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // 2. High chime bell at +0.12s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2637, now + 0.12);
    gain2.gain.setValueAtTime(0.6, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    // 3. Resonant coin ring
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(880, now + 0.06);
    gain3.gain.setValueAtTime(0.3, now + 0.06);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.06);
    osc3.stop(now + 0.4);
  } catch (err) {
    console.warn('[SoundService] Web audio synthesis note:', err);
  }
}

/**
 * Signature "Cha-Ching!" notification and haptic response.
 *
 * NOTE: On native Android/iOS, push notification sound 'chaching.wav' is handled
 * at the OS notification channel level (res/raw/chaching.wav) without needing
 * deprecated third-party audio modules.
 */
export async function playChaChingSound(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      try {
        const soundAsset = require('../../assets/sounds/chaching.mp3');
        const audioUri =
          typeof soundAsset === 'string'
            ? soundAsset
            : soundAsset?.default || soundAsset?.uri || '/assets/sounds/chaching.mp3';

        const audio = new (window as any).Audio(audioUri);
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            synthesizeChaChingWeb();
          });
        }
        return;
      } catch {
        synthesizeChaChingWeb();
        return;
      }
    }

    // On native mobile devices: Schedule immediate local alert with custom WooCommerce order chime
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🛍️ Order Notification Alert',
          body: 'New order received!',
          sound: 'woo_commerce_order',
        },
        trigger: {
          type: 'channel',
          channelId: 'woocommerce-order-alerts',
        } as any,
      });
    } catch (notifErr) {
      console.warn('[SoundService] Notification alert note:', notifErr);
    }

    // Provide signature haptic cash-register pattern
    try {
      Vibration.vibrate([0, 80, 60, 120]);
    } catch (vibErr) {
      console.warn('[SoundService] Haptic feedback note:', vibErr);
    }
  } catch (err) {
    console.warn('[SoundService] Sound/Haptic notification note:', err);
  }
}

/**
 * Cleanup / unload hook (no-op now that legacy expo-av is eliminated).
 */
export async function unloadSound(): Promise<void> {
  // No-op
}
