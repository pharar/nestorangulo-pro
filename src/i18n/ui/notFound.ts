import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/** The 404 page. */
export const notFound = defineDict({
  en: {
    title: 'Page not found — Nestor Angulo de Ugarte',
    description: "That page doesn't exist. It may have been moved or renamed.",
    h1: 'Page not found',
    lead: "That page doesn't exist — it may have been moved or renamed.",
    backHome: '← Back to home',
  },
  es: {
    title: 'Página no encontrada — Nestor Angulo de Ugarte',
    description: 'Esa página no existe. Puede que la hayan movido o cambiado de nombre.',
    h1: 'Página no encontrada',
    lead: 'Esa página no existe: puede que la hayan movido o cambiado de nombre.',
    backHome: '← Volver al inicio',
  },
});

export const useNotFound = (lang: Lang) => useTranslations(notFound, lang);
