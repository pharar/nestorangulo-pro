import { SITE_URL, SITE_NAME, AUTHOR, DEFAULT_DESCRIPTION } from '../config';
import { personSchema } from './person';

/**
 * One schema.org `@graph` per page.
 *
 * Every page states the same three things — this site (`WebSite`), who it
 * belongs to (`Person`) and what this particular URL is (`WebPage` or a
 * subtype) — and pages add their own entities (an `Event`, an `ItemList`) on
 * top. Nodes link to each other by `@id`, so a crawler can join the talk
 * pages, the speaking index and the profile into a single entity.
 *
 * Only facts the page itself shows are emitted; see talkSchema.ts.
 */

export type GraphNode = Record<string, unknown>;

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const ref = (id: string) => ({ '@id': id });

export type WebPageType = 'WebPage' | 'ProfilePage' | 'CollectionPage' | 'ContactPage';

export interface Crumb {
  name: string;
  url: string;
}

/** What a page contributes to its own graph. Everything is optional. */
export interface PageStructuredData {
  /** schema.org type of the page itself. `null` emits no WebPage node. */
  type?: WebPageType | null;
  /** Trail below Home. Defaults to a single crumb for the current page. */
  breadcrumbs?: Crumb[];
  /** `@id` of the page's primary entity (an Event, an ItemList...). */
  mainEntity?: string;
  /** Extra nodes appended to the graph. */
  nodes?: GraphNode[];
}

export function websiteNode(): GraphNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: AUTHOR,
    alternateName: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en',
    publisher: ref(PERSON_ID),
  };
}

/** The full Person entity: home and /about only. */
export function personNode(): GraphNode {
  const { '@context': _context, ...node } = personSchema;
  return node;
}

/**
 * Everywhere else the Person is referenced, not restated. The stub keeps the
 * name and url so references (`publisher`, `performer`) resolve inside the
 * page's own graph without duplicating the whole profile.
 */
export function personStubNode(): GraphNode {
  return { '@type': 'Person', '@id': PERSON_ID, name: AUTHOR, url: `${SITE_URL}/` };
}

export function breadcrumbNode(pageUrl: string, trail: Crumb[]): GraphNode {
  const items = [{ name: 'Home', url: `${SITE_URL}/` }, ...trail];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface PageGraphInput extends PageStructuredData {
  /** Canonical URL. `null` (the 404) emits only the site-level nodes. */
  url: string | null;
  name: string;
  description: string;
  lang: string;
  /** Emit the full Person node (home and /about). */
  fullPerson?: boolean;
}

export function pageGraph(input: PageGraphInput) {
  const { url, name, description, lang, fullPerson = false, nodes = [] } = input;
  const type = input.type === undefined ? 'WebPage' : input.type;
  const isHome = url === `${SITE_URL}/`;

  const graph: GraphNode[] = [websiteNode(), fullPerson ? personNode() : personStubNode()];

  if (url && type) {
    const page: GraphNode = {
      '@type': type,
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: lang,
      isPartOf: ref(WEBSITE_ID),
    };
    if (isHome) page.about = ref(PERSON_ID);
    if (type === 'ProfilePage') page.mainEntity = ref(PERSON_ID);
    if (input.mainEntity) page.mainEntity = ref(input.mainEntity);

    if (!isHome) {
      const trail = input.breadcrumbs ?? [{ name, url }];
      const crumbs = breadcrumbNode(url, trail);
      page.breadcrumb = ref(crumbs['@id'] as string);
      graph.push(page, crumbs);
    } else {
      graph.push(page);
    }
  }

  graph.push(...nodes);
  return { '@context': 'https://schema.org', '@graph': graph };
}
