/**
 * Language-aware content access. The English collections (`talks`, `writing`)
 * are the source of truth for what exists and what is published; the Spanish
 * overlays (`talksEs`, `writingEs`, matched by id) only add translated text.
 * Draft filtering therefore stays identical to the English routes.
 *
 * `en` -> the English entries untouched.
 * `es` -> English entry + overlay: overlay fields override, the body is the
 *         overlay's. Talks without an overlay fall back to English wholesale;
 *         essays without one are left out of the Spanish list.
 *
 *   const talks = await getLocalizedTalks('es');
 *   const { Content } = await renderLocalized(talks[0]);
 *   talks[0].data.title   // merged data
 *   talks[0].translated   // true when a Spanish overlay was applied
 *
 * See documentation/I18N.md.
 */
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/config';
import { getPublishedTalks } from './talks';
import { getPublishedEssays } from './writing';

export interface Localized<E extends CollectionEntry<'talks'> | CollectionEntry<'writing'>, O> {
  id: string;
  lang: Lang;
  /** The English entry (dates, themes, covers, draft…). */
  entry: E;
  /** The Spanish overlay, when one exists and `lang` is `es`. */
  overlay?: O;
  /** English data with the overlay's fields applied. */
  data: E['data'];
  /** True when `data`/body come from a Spanish overlay. */
  translated: boolean;
}

export type LocalizedTalk = Localized<CollectionEntry<'talks'>, CollectionEntry<'talksEs'>>;
export type LocalizedEssay = Localized<CollectionEntry<'writing'>, CollectionEntry<'writingEs'>>;

/** Drop `undefined` so an overlay's absent optional fields do not erase English ones. */
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function overlayMap<C extends 'talksEs' | 'writingEs'>(collection: C) {
  const all = await getCollection(collection);
  return new Map<string, (typeof all)[number]>(all.map((e) => [e.id, e]));
}

/** Published talks in `lang`, in `getPublishedTalks()` order. */
export async function getLocalizedTalks(lang: Lang): Promise<LocalizedTalk[]> {
  const talks = await getPublishedTalks();
  if (lang === 'en') {
    return talks.map((entry) => ({
      id: entry.id,
      lang,
      entry,
      data: entry.data,
      translated: false,
    }));
  }
  const overlays = await overlayMap('talksEs');
  return talks.map((entry) => {
    const overlay = overlays.get(entry.id);
    return {
      id: entry.id,
      lang,
      entry,
      overlay,
      data: overlay ? { ...entry.data, ...defined(overlay.data) } : entry.data,
      translated: !!overlay,
    };
  });
}

/**
 * Published essays in `lang`, newest first. Spanish: only essays that have a
 * `writing-es/` translation.
 */
export async function getLocalizedEssays(lang: Lang): Promise<LocalizedEssay[]> {
  const essays = await getPublishedEssays();
  if (lang === 'en') {
    return essays.map((entry) => ({
      id: entry.id,
      lang,
      entry,
      data: entry.data,
      translated: false,
    }));
  }
  const overlays = await overlayMap('writingEs');
  return essays.flatMap((entry) => {
    const overlay = overlays.get(entry.id);
    if (!overlay) return [];
    return [
      {
        id: entry.id,
        lang,
        entry,
        overlay,
        data: { ...entry.data, ...defined(overlay.data) },
        translated: true,
      },
    ];
  });
}

/** Render the body that belongs to the item: the overlay's when translated. */
export async function renderLocalized(item: LocalizedTalk | LocalizedEssay) {
  return render(item.overlay ?? item.entry);
}

/** Does a published talk have a Spanish translation? */
export async function hasSpanishTalk(id: string): Promise<boolean> {
  return (await getLocalizedTalks('es')).some((t) => t.id === id && t.translated);
}

/** Does a published essay have a Spanish translation? */
export async function hasSpanishEssay(id: string): Promise<boolean> {
  return (await getLocalizedEssays('es')).some((e) => e.id === id);
}
