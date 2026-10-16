const languages = ['zh-CN', 'en-US'];
const dictionaries = Object.fromEntries(await Promise.all(languages.map(async language => {
  const dictionary = typeof window === 'undefined'
    ? (await import('./locales/' + language + '.json', { with: { type: 'json' } })).default
    : await (await fetch('/locales/' + language + '.json', { cache: 'no-store' })).json();
  return [language, dictionary];
})));
let locale = 'zh-CN';

export function setLocale(language) {
  locale = languages.includes(language) ? language : 'zh-CN';
}

export function getLocale() {
  return locale;
}

export function t(key, params = {}, language = locale) {
  const text = dictionaries[language]?.[key] ?? dictionaries['zh-CN'][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '{' + name + '}'));
}
