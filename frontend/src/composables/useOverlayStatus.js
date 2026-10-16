import { computed } from 'vue';
import { activeFields } from '../../rules.js';

export function useOverlayStatus(overlay, preferences, t) {
  const { state, error, locked, connection, desktopStatus } = overlay;

  const statusText = computed(() => {
    if (error.value) {
      const message = error.value.includes('RECOVERY_HOTKEY_UNAVAILABLE')
        ? t('error.recovery')
        : error.value;
      return t('status.error', { message });
    }
    if (locked.value) return t('status.locked');

    const fields = activeFields(preferences.value);
    const count = fields.filter(key => state.value[key] !== null).length;
    return t('status.count', { count, total: fields.length });
  });

  const connectionText = computed(() => {
    if (!connection.desktop) return t('status.preview');
    if (!desktopStatus.value) return t('status.connecting');

    const { warnings } = desktopStatus.value;
    return warnings.length
      ? t('status.hotkeyWarning', { keys: warnings.join(', ') })
      : t('status.connected');
  });

  return { statusText, connectionText };
}
