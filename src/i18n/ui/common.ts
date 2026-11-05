import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/** Shared chrome: header, footer, skip link, theme toggle, language switch. */
export const common = defineDict({
  en: {
    skipToContent: 'Skip to content',
    logoLabel: 'Nestor Angulo de Ugarte — home',
    mainNavLabel: 'Main navigation',
    navWriting: 'Writing',
    navSpeaking: 'Speaking',
    navAbout: 'About',
    navContact: 'Contact',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    themeTitle: 'Switch theme',
    // The switch shows the TARGET language: code, link text language, label.
    switchCode: 'ES',
    switchLabel: 'Leer en español',
    switchLang: 'es',
    footerLinkedin: 'LinkedIn',
    footerContact: 'Contact',
    footerSource: 'Source',
  },
  es: {
    skipToContent: 'Saltar al contenido',
    logoLabel: 'Nestor Angulo de Ugarte — inicio',
    mainNavLabel: 'Navegación principal',
    navWriting: 'Artículos',
    navSpeaking: 'Charlas',
    navAbout: 'Sobre mí',
    navContact: 'Contacto',
    themeToDark: 'Cambiar a tema oscuro',
    themeToLight: 'Cambiar a tema claro',
    themeTitle: 'Cambiar tema',
    switchCode: 'EN',
    switchLabel: 'Read in English',
    switchLang: 'en',
    footerLinkedin: 'LinkedIn',
    footerContact: 'Contacto',
    footerSource: 'Código',
  },
});

export const useCommon = (lang: Lang) => useTranslations(common, lang);
