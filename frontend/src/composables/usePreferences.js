import { computed, inject, onScopeDispose, provide, ref, watch } from 'vue';
import { setLocale, t as translate } from '../../i18n.js';
import { colourKeys, normalisePreferences, opacityRange, preferenceKey, readPreferences } from '../../preferences.js';

const languageKey = Symbol('language');

function applyAppearance(preferences) {
  const root = document.documentElement;
  root.lang = preferences.language;
  root.style.setProperty('--font-scale', preferences.fontScale / 100);
  for (const key of colourKeys) {
    root.style.setProperty('--' + key, preferences[key]);
  }
  const rgb = [1, 3, 5].map(index => parseInt(preferences.background.slice(index, index + 2), 16));
  root.style.setProperty('--panel-rgb', rgb.join(','));
}

export function usePreferences() {
  const preferences = ref(readPreferences());
  provide(languageKey, computed(() => preferences.value.language));

  watch(preferences, next => {
    setLocale(next.language);
    applyAppearance(next);
  }, { immediate: true, flush: 'sync' });

  function save(patch) {
    preferences.value = normalisePreferences({ ...preferences.value, ...patch });
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences.value)); } catch { /* Session settings still work. */ }
  }

  const onStorage = event => {
    if (event.key === preferenceKey) preferences.value = readPreferences();
  };
  window.addEventListener('storage', onStorage);
  onScopeDispose(() => window.removeEventListener('storage', onStorage));
  return { preferences, save };
}

export function useTranslation(preferences) {
  const language = preferences
    ? computed(() => preferences.value.language)
    : inject(languageKey, ref('zh-CN'));
  return (key, params) => translate(key, params, language.value);
}

export function useOpacity(view) {
  const storageKey = 'p4-opacity-' + view;
  let initial = opacityRange.default;
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (saved >= opacityRange.min && saved <= opacityRange.max) initial = saved;
  } catch { /* Use the default. */ }
  const opacity = ref(initial);
  watch(opacity, value => {
    document.documentElement.style.setProperty('--panel-alpha', value / 100);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Persistence is optional. */ }
  }, { immediate: true });
  return opacity;
}
