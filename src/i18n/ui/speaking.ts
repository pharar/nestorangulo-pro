import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/**
 * Speaking section copy (listing, talk page, filter bar): the single source for
 * the HTML views (`src/views/Speaking*.astro`) and the Markdown twins
 * (`src/lib/ai/pages/talks.ts`), so they cannot drift.
 *
 * Placeholders ({count}, {value}, {author}...) are filled by `t(key, vars)`.
 * The filter script runs in the browser and receives the `filter*` / `count*`
 * strings as JSON in a `data-labels` attribute, with placeholders intact.
 */
export const speaking = defineDict({
  en: {
    navLabel: 'Speaking',
    title: 'Speaking — Nestor Angulo de Ugarte',
    mdTitle: 'Speaking — {author}',
    description:
      '{count} talks across WordCamps, conferences, podcasts and webinars — web security, vulnerability intelligence, software supply chain, and security culture.',
    h1: 'Speaking',
    tagline: 'web security · vulnerability intelligence · software supply chain · security culture',
    intro:
      '{count} appearances at WordCamps, industry conferences, podcasts, and webinars spanning web security, vulnerability intelligence, software supply chain, and security culture — across Europe and Japan.',
    featured: 'Featured',
    archive: 'Archive',
    themesLabel: 'Themes',
    // Filter bar (client-side script)
    filterGroup: 'Filter talks',
    filterAll: 'All',
    filterFeatured: 'Featured',
    countAll: 'Showing all {count} talks',
    countFeaturedOne: 'Showing {count} featured talk',
    countFeaturedMany: 'Showing {count} featured talks',
    countYearOne: 'Showing {count} talk from {value}',
    countYearMany: 'Showing {count} talks from {value}',
    countThemeOne: 'Showing {count} talk tagged {value}',
    countThemeMany: 'Showing {count} talks tagged {value}',
    // List links
    linkVideo: 'Video ↗',
    linkSlides: 'Slides ↗',
    linkEvent: 'Event ↗',
    // Talk page
    back: '← Back to speaking',
    watchVideo: 'Watch video ↗',
    viewSlides: 'View slides ↗',
    viewEvent: 'View event ↗',
    slidesAlsoPre: 'Slides also available on the',
    slidesAlsoLink: 'event site ↗',
    // Formats
    'format-conference-talk': 'Conference Talk',
    'format-meetup-talk': 'Meetup Talk',
    'format-panel': 'Panel',
    'format-podcast': 'Podcast',
    'format-webinar': 'Webinar',
    'format-ama': 'AMA',
    'format-workshop': 'Workshop',
    // Markdown twin
    mdFeatured: 'Featured',
    mdArchive: 'Archive',
    mdDescriptionFallback: '{format} by {author} at {event}, {date}.',
    mdThemes: 'Themes',
    mdFormat: 'Format',
    mdEvent: 'Event',
    mdLocation: 'Location',
    mdDate: 'Date',
    mdLanguage: 'Language',
    mdSpeaker: 'Speaker',
    mdVideo: 'Video',
    mdSlides: 'Slides',
    mdSlidesOnEventSite: 'Slides on the event site',
    mdWatchVideo: 'Watch video',
    mdViewSlidesPdf: 'View slides (PDF)',
    mdViewSlides: 'View slides',
    mdEventSlides: 'Event-hosted slides',
    mdNote: 'Note',
    mdAllTalks: '← All talks',
    'mdLang-en': 'English',
    'mdLang-es': 'Spanish (Español)',
  },
  es: {
    navLabel: 'Charlas',
    title: 'Charlas — Nestor Angulo de Ugarte',
    mdTitle: 'Charlas — {author}',
    description:
      '{count} charlas en WordCamps, congresos, podcasts y webinars: seguridad web, inteligencia de vulnerabilidades, cadena de suministro de software y cultura de seguridad.',
    h1: 'Charlas',
    tagline:
      'seguridad web · inteligencia de vulnerabilidades · cadena de suministro de software · cultura de seguridad',
    intro:
      '{count} intervenciones en WordCamps, congresos del sector, podcasts y webinars sobre seguridad web, inteligencia de vulnerabilidades, cadena de suministro de software y cultura de seguridad, por Europa y Japón.',
    featured: 'Destacadas',
    archive: 'Archivo',
    themesLabel: 'Temas',
    filterGroup: 'Filtrar charlas',
    filterAll: 'Todas',
    filterFeatured: 'Destacadas',
    countAll: 'Mostrando las {count} charlas',
    countFeaturedOne: 'Mostrando {count} charla destacada',
    countFeaturedMany: 'Mostrando {count} charlas destacadas',
    countYearOne: 'Mostrando {count} charla de {value}',
    countYearMany: 'Mostrando {count} charlas de {value}',
    countThemeOne: 'Mostrando {count} charla con la etiqueta {value}',
    countThemeMany: 'Mostrando {count} charlas con la etiqueta {value}',
    linkVideo: 'Vídeo ↗',
    linkSlides: 'Slides ↗',
    linkEvent: 'Evento ↗',
    back: '← Volver a charlas',
    watchVideo: 'Ver vídeo ↗',
    viewSlides: 'Ver slides ↗',
    viewEvent: 'Ver evento ↗',
    slidesAlsoPre: 'Slides también disponibles en la',
    slidesAlsoLink: 'web del evento ↗',
    'format-conference-talk': 'Charla en congreso',
    'format-meetup-talk': 'Charla en meetup',
    'format-panel': 'Mesa redonda',
    'format-podcast': 'Podcast',
    'format-webinar': 'Webinar',
    'format-ama': 'AMA',
    'format-workshop': 'Workshop',
    mdFeatured: 'Destacadas',
    mdArchive: 'Archivo',
    mdDescriptionFallback: '{format} de {author} en {event}, {date}.',
    mdThemes: 'Temas',
    mdFormat: 'Formato',
    mdEvent: 'Evento',
    mdLocation: 'Lugar',
    mdDate: 'Fecha',
    mdLanguage: 'Idioma',
    mdSpeaker: 'Ponente',
    mdVideo: 'Vídeo',
    mdSlides: 'Slides',
    mdSlidesOnEventSite: 'Slides en la web del evento',
    mdWatchVideo: 'Ver vídeo',
    mdViewSlidesPdf: 'Ver slides (PDF)',
    mdViewSlides: 'Ver slides',
    mdEventSlides: 'Slides alojadas en la web del evento',
    mdNote: 'Nota',
    mdAllTalks: '← Todas las charlas',
    'mdLang-en': 'Inglés (English)',
    'mdLang-es': 'Español',
  },
});

export const useSpeaking = (lang: Lang) => useTranslations(speaking, lang);

/** Display label of a talk format (`conference-talk`...). */
export function formatLabel(format: string, lang: Lang): string {
  const t = useSpeaking(lang);
  return t(`format-${format}` as Parameters<typeof t>[0]);
}

/** Name of a talk's delivery language (`es` -> "Spanish (Español)" / "Español"). */
export function deliveryLanguageName(code: string, lang: Lang): string {
  const t = useSpeaking(lang);
  return code === 'en' || code === 'es' ? t(`mdLang-${code}`) : code;
}

const ES_PLACES: Record<string, string> = {
  Spain: 'España',
  Japan: 'Japón',
  Switzerland: 'Suiza',
  Finland: 'Finlandia',
  Greece: 'Grecia',
  Geneva: 'Ginebra',
  Vienna: 'Viena',
  Tokyo: 'Tokio',
};

/**
 * Display form of a stored location ("Madrid, Spain" -> "Madrid, España").
 * Display only: content and structured data keep the stored English value.
 */
export function placeLabel(location: string, lang: Lang): string {
  if (lang !== 'es') return location;
  return location
    .split(',')
    .map((part) => {
      const p = part.trim();
      return ES_PLACES[p] ?? p;
    })
    .join(', ');
}
