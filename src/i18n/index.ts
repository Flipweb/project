import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['ru', 'en'],
    fallbackLng: 'ru',
    debug: import.meta.env.DEV,
    
    // Namespaces
    ns: ['common', 'auth', 'profile'],
    defaultNS: 'common',
    fallbackNS: 'common',

    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },

    interpolation: {
      escapeValue: false
    }
  });

export default i18n;