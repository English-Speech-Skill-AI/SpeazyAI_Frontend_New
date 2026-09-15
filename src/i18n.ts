import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

const getInitialLng = () => {
  if (typeof window === 'undefined') return 'en';
  const seg = window.location.pathname.split('/')[1];
  return (seg === 'en' || seg === 'ar') ? seg : 'en';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLng(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
