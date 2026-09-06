const I18N = {
  currentLang: localStorage.getItem('saathi_lang') || 'hi',
  translations: {},

  async init() {
    await this.loadLocale(this.currentLang);
    this.updateDOM();
  },

  async setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('saathi_lang', lang);
    await this.loadLocale(lang);
    this.updateDOM();
  },

  async loadLocale(lang) {
    try {
      const res = await fetch(`/static/locales/${lang}.json`);
      if (res.ok) {
        this.translations[lang] = await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch locale file:", e);
    }
  },

  t(key, fallback = "") {
    const dict = this.translations[this.currentLang];
    return (dict && dict[key]) || fallback || key;
  },

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        if (el.tagName === 'INPUT' && el.placeholder) {
          el.placeholder = text;
        } else {
          el.innerText = text;
        }
      }
    });
  }
};

window.I18N = I18N;
