export const colourKeys = ['background', 'text', 'accent'];
export const fontScaleRange = { min: 80, max: 160, step: 10 };
export const opacityRange = { min: 10, max: 95, default: 78 };

export const defaults = {
  language: 'zh-CN',
  background: '#21182e',
  text: '#fff3dc',
  accent: '#c6a0ff',
  fontScale: 100,
  enableFlood: false,
  enableMagic: false,
};
export const preferenceKey = 'p4-appearance-v1';

export function validHex(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalisePreferences(value) {
  const safe = { ...defaults };
  if (Number.isFinite(value?.fontScale)) {
    const { min, max, step } = fontScaleRange;
    safe.fontScale = Math.max(min, Math.min(max, Math.round(value.fontScale / step) * step));
  }
  if (value?.language === 'en-US') safe.language = 'en-US';
  for (const key of colourKeys) {
    if (validHex(value?.[key])) safe[key] = value[key].toLowerCase();
  }
  for (const key of ['enableFlood', 'enableMagic']) {
    if (typeof value?.[key] === 'boolean') safe[key] = value[key];
  }
  return safe;
}

export function readPreferences() {
  try {
    return normalisePreferences(JSON.parse(localStorage.getItem(preferenceKey)));
  } catch {
    return { ...defaults };
  }
}
