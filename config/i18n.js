const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');
const fs = require('fs');

const localesPath = path.join(__dirname, '..', 'locales');
console.log('🔧 i18n locales path:', localesPath);
console.log('🔧 i18n locales directory exists:', fs.existsSync(localesPath));

// Check if translation files exist
const enTranslationPath = path.join(localesPath, 'en', 'translation.json');
const ruTranslationPath = path.join(localesPath, 'ru', 'translation.json');
console.log('🔧 EN translation file exists:', fs.existsSync(enTranslationPath));
console.log('🔧 RU translation file exists:', fs.existsSync(ruTranslationPath));

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: path.join(__dirname, '..', 'locales', '{{lng}}', '{{ns}}.json')
    },
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
      lookupHeader: 'accept-language'
    }
  }, (err, t) => {
    if (err) {
      console.error('❌ i18n initialization error:', err);
    } else {
      console.log('✅ i18n initialized successfully');
      console.log('🔧 Available languages:', i18next.languages);
      console.log('🔧 Current language:', i18next.language);
    }
  });

module.exports = i18next;