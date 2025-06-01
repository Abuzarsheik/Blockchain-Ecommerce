/**
 * 🌍 INTERNATIONALIZATION FRAMEWORK
 * Multi-language support for Blocmerce NFT Marketplace
 * Zero risk implementation - works independently
 */

// Simple i18n implementation without external dependencies
class SimpleI18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.supportedLanguages = ['en', 'es', 'fr'];
        
        this.init();
    }

    async init() {
        // Load translations
        await this.loadTranslations();
        
        // Detect browser language
        this.detectLanguage();
        
        console.log('🌍 Internationalization framework initialized');
        console.log(`📍 Current language: ${this.currentLanguage}`);
    }

    async loadTranslations() {
        try {
            // Load English (default)
            const enTranslations = await import('./locales/en.json');
            this.translations.en = enTranslations.default || enTranslations;

            // Load Spanish
            const esTranslations = await import('./locales/es.json');
            this.translations.es = esTranslations.default || esTranslations;

            // Load French
            const frTranslations = await import('./locales/fr.json');
            this.translations.fr = frTranslations.default || frTranslations;

            console.log('✅ Translations loaded for:', Object.keys(this.translations));
        } catch (error) {
            console.warn('⚠️ Error loading translations:', error);
            // Fallback to basic English translations
            this.translations.en = {
                common: { loading: 'Loading...', error: 'Error', success: 'Success' },
                navigation: { home: 'Home', marketplace: 'Marketplace' }
            };
        }
    }

    detectLanguage() {
        // Check localStorage first
        const savedLanguage = localStorage.getItem('blocmerce-language');
        if (savedLanguage && this.supportedLanguages.includes(savedLanguage)) {
            this.currentLanguage = savedLanguage;
            return;
        }

        // Detect from browser
        const browserLanguage = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLanguage)) {
            this.currentLanguage = browserLanguage;
        }

        // Save detected language
        localStorage.setItem('blocmerce-language', this.currentLanguage);
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];

        // Navigate through nested keys
        for (const k of keys) {
            if (translation && typeof translation === 'object' && k in translation) {
                translation = translation[k];
            } else {
                // Fallback to English
                translation = this.translations[this.fallbackLanguage];
                for (const fallbackKey of keys) {
                    if (translation && typeof translation === 'object' && fallbackKey in translation) {
                        translation = translation[fallbackKey];
                    } else {
                        return key; // Return key if translation not found
                    }
                }
                break;
            }
        }

        // Handle parameters
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{\{(\w+)\}\}/g, (match, param) => {
                return params[param] || match;
            });
        }

        return typeof translation === 'string' ? translation : key;
    }

    changeLanguage(language) {
        if (this.supportedLanguages.includes(language)) {
            this.currentLanguage = language;
            localStorage.setItem('blocmerce-language', language);
            
            // Trigger language change event
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { language } 
            }));
            
            console.log(`🌍 Language changed to: ${language}`);
            return true;
        }
        return false;
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return this.supportedLanguages.map(lang => ({
            code: lang,
            name: this.getLanguageName(lang),
            nativeName: this.getLanguageNativeName(lang)
        }));
    }

    getLanguageName(code) {
        const names = {
            en: 'English',
            es: 'Spanish',
            fr: 'French'
        };
        return names[code] || code;
    }

    getLanguageNativeName(code) {
        const nativeNames = {
            en: 'English',
            es: 'Español',
            fr: 'Français'
        };
        return nativeNames[code] || code;
    }

    // Format numbers according to locale
    formatNumber(number, options = {}) {
        try {
            const locale = this.getLocale();
            return new Intl.NumberFormat(locale, options).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    // Format currency
    formatCurrency(amount, currency = 'USD') {
        return this.formatNumber(amount, {
            style: 'currency',
            currency: currency
        });
    }

    // Format date
    formatDate(date, options = {}) {
        try {
            const locale = this.getLocale();
            return new Intl.DateTimeFormat(locale, options).format(new Date(date));
        } catch (error) {
            return new Date(date).toLocaleDateString();
        }
    }

    getLocale() {
        const locales = {
            en: 'en-US',
            es: 'es-ES',
            fr: 'fr-FR'
        };
        return locales[this.currentLanguage] || 'en-US';
    }

    // Get text direction for RTL languages
    getDirection() {
        const rtlLanguages = ['ar', 'he', 'fa'];
        return rtlLanguages.includes(this.currentLanguage) ? 'rtl' : 'ltr';
    }
}

// Create global instance
const i18n = new SimpleI18n();

// React hook for using translations
export const useTranslation = () => {
    const [language, setLanguage] = React.useState(i18n.getCurrentLanguage());

    React.useEffect(() => {
        const handleLanguageChange = (event) => {
            setLanguage(event.detail.language);
        };

        window.addEventListener('languageChanged', handleLanguageChange);
        return () => window.removeEventListener('languageChanged', handleLanguageChange);
    }, []);

    return {
        t: i18n.t.bind(i18n),
        language,
        changeLanguage: i18n.changeLanguage.bind(i18n),
        supportedLanguages: i18n.getSupportedLanguages(),
        formatNumber: i18n.formatNumber.bind(i18n),
        formatCurrency: i18n.formatCurrency.bind(i18n),
        formatDate: i18n.formatDate.bind(i18n),
        direction: i18n.getDirection()
    };
};

// Language selector component
export const LanguageSelector = ({ className = '' }) => {
    const { language, changeLanguage, supportedLanguages } = useTranslation();

    return React.createElement('select', {
        value: language,
        onChange: (e) => changeLanguage(e.target.value),
        className: `language-selector ${className}`,
        'aria-label': 'Select Language'
    }, supportedLanguages.map(lang => 
        React.createElement('option', {
            key: lang.code,
            value: lang.code
        }, `${lang.nativeName} (${lang.name})`)
    ));
};

export default i18n; 