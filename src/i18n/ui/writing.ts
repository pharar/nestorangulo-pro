import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/** Writing index, essay page and their Markdown twins. */
export const writing = defineDict({
  en: {
    listTitle: 'Writing — Nestor Angulo de Ugarte',
    listDescription:
      'Essays on security program design, vulnerability intelligence, incident response, and organizational security practice.',
    listCrumb: 'Writing',
    listLabel: 'Writing',
    h1: 'Writing',
    intro:
      'Essays on security program design, vulnerability intelligence, and operational practice.',
    comingNext: 'Coming next.',
    backHome: '← Back to home',
    themesLabel: 'Themes',
    backToWriting: '← Back to writing',
    updated: 'Updated {date}',
    // Markdown twin
    mdComingNext: 'Coming next. In the meantime, see the talks:',
    mdSpeakingArchive: 'Speaking archive',
    mdThemes: 'Themes',
    mdSubtitle: 'Subtitle',
    mdPublished: 'Published',
    mdUpdated: 'Updated',
    mdLanguage: 'Language',
    mdAuthor: 'Author',
    mdAllWriting: '← All writing',
    mdLanguageName: 'English',
  },
  es: {
    listTitle: 'Artículos — Nestor Angulo de Ugarte',
    listDescription:
      'Artículos sobre diseño de programas de seguridad, inteligencia de vulnerabilidades, respuesta ante incidentes y práctica organizativa de la seguridad.',
    listCrumb: 'Artículos',
    listLabel: 'Artículos',
    h1: 'Artículos',
    intro:
      'Artículos sobre diseño de programas de seguridad, inteligencia de vulnerabilidades y práctica operativa.',
    comingNext: 'Próximamente.',
    backHome: '← Volver al inicio',
    themesLabel: 'Temas',
    backToWriting: '← Volver a los artículos',
    updated: 'Actualizado el {date}',
    mdComingNext: 'Próximamente. Mientras tanto, echa un vistazo a las charlas:',
    mdSpeakingArchive: 'Archivo de charlas',
    mdThemes: 'Temas',
    mdSubtitle: 'Subtítulo',
    mdPublished: 'Publicado',
    mdUpdated: 'Actualizado',
    mdLanguage: 'Idioma',
    mdAuthor: 'Autor',
    mdAllWriting: '← Todos los artículos',
    mdLanguageName: 'Español',
  },
});

export const useWriting = (lang: Lang) => useTranslations(writing, lang);
