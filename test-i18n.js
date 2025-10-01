#!/usr/bin/env node

// Test script for i18n functionality
// Run with: node test-i18n.js

const i18next = require('./config/i18n');

console.log('🧪 Testing i18n functionality...\n');

// Wait for i18n to initialize
setTimeout(() => {
    console.log('📋 i18n Status:');
    console.log('   - Languages:', i18next.languages);
    console.log('   - Current language:', i18next.language);
    console.log('   - Fallback language:', i18next.options.fallbackLng);

    console.log('\n📝 Sample Translations:');

    // Test some common translations
    const testKeys = [
        'hero.titleMain',
        'hero.subtitle',
        'nav.home',
        'nav.products',
        'categories.title',
        'features.secure.title',
        'cta.primary'
    ];

    console.log('\n🇺🇸 English translations:');
    testKeys.forEach(key => {
        try {
            const translation = i18next.t(key, { lng: 'en' });
            console.log(`   ${key}: "${translation}"`);
        } catch (error) {
            console.log(`   ${key}: ❌ Error - ${error.message}`);
        }
    });

    console.log('\n🇷🇺 Russian translations:');
    testKeys.forEach(key => {
        try {
            const translation = i18next.t(key, { lng: 'ru' });
            console.log(`   ${key}: "${translation}"`);
        } catch (error) {
            console.log(`   ${key}: ❌ Error - ${error.message}`);
        }
    });

    console.log('\n🔄 Language Switching Test:');
    console.log('   Current language:', i18next.language);

    // Test language change
    i18next.changeLanguage('ru', (err, t) => {
        if (err) {
            console.log('   ❌ Language change failed:', err);
        } else {
            console.log('   ✅ Changed to Russian');
            console.log('   Sample Russian text:', t('hero.titleMain'));
        }

        i18next.changeLanguage('en', (err2, t2) => {
            if (err2) {
                console.log('   ❌ Language change back failed:', err2);
            } else {
                console.log('   ✅ Changed back to English');
                console.log('   Sample English text:', t2('hero.titleMain'));
            }

            console.log('\n🎉 i18n test completed!');
            process.exit(0);
        });
    });

}, 1000);