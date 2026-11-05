/**
 * Markdown for `/about/`.
 *
 * Credentials, service roles and publications come from `src/data/*`.
 *
 * DUPLICATION: the tagline, biography, speaking blurb and the press bios are
 * hard-coded in `src/pages/about.astro` and `src/components/Press.astro`;
 * the publication citation format mirrors `Publications.astro`. Edit together.
 */
import { AUTHOR } from '../../../config';
import { credentials } from '../../../data/credentials';
import { publications, type Publication } from '../../../data/publications';
import { serviceRoles } from '../../../data/service';
import { getPublishedTalks, talkCountRounded } from '../../talks';
import { blocks, link, list, paragraph, text, yearMonth } from '../markdown';
import { makePage } from '../page';
import type { MarkdownPage } from '../types';

const PUBLICATION_TYPES: Record<Publication['type'], string> = {
  book_chapter: 'Book Chapter',
  conference_paper: 'Conference Paper',
};

function credentialItem(c: (typeof credentials)[number]): string {
  const meta = [
    c.issuer,
    c.type,
    c.eqfLevel ? `EQF Level ${c.eqfLevel}` : undefined,
    c.validUntil ? `Valid until ${yearMonth(c.validUntil)}` : undefined,
    c.yearCompleted ? String(c.yearCompleted) : undefined,
    c.since ? `Since ${yearMonth(c.since)}` : undefined,
  ].filter(Boolean) as string[];
  let line = `**${text(c.title)}** — ${text(meta.join(' · '))}`;
  if (c.verifyUrl) line += ` (${link('Verify', c.verifyUrl)})`;
  if (c.note) line += `. ${text(c.note)}`;
  return line;
}

function serviceItem(r: (typeof serviceRoles)[number]): string {
  const when = r.since
    ? r.until
      ? `${yearMonth(r.since)} – ${yearMonth(r.until)}`
      : `Since ${yearMonth(r.since)}`
    : undefined;
  const parts = [r.organization, r.type, when].filter(Boolean) as string[];
  let line = `**${text(r.title)}** — ${text(parts.join(' · '))}`;
  if (r.note) line += `. ${text(r.note)}`;
  return line;
}

function authors(coAuthors: string[] = []): string {
  const all = ['Angulo de Ugarte, N.', ...coAuthors];
  if (all.length === 1) return all[0];
  return `${all.slice(0, -1).join(', ')}, & ${all[all.length - 1]}`;
}

function publicationItem(p: Publication): string {
  const parts = [
    `${text(authors(p.coAuthors))} (${p.year}). ${text(p.title)}.`,
    p.in ? `In _${text(p.in)}_.` : '',
    p.venue ? `_${text(p.venue)}_.` : '',
    p.publisher ? `${text(p.publisher)}.` : '',
    p.isbn ? `ISBN ${text(p.isbn)}.` : '',
    `(${PUBLICATION_TYPES[p.type] ?? p.type})`,
  ];
  return parts.filter(Boolean).join(' ');
}

export async function aboutPage(): Promise<MarkdownPage> {
  const count = (await getPublishedTalks()).length;
  const rounded = talkCountRounded(count);

  const oneLiner = `Builds security programs from zero. 10+ years in cybersecurity, came up through incident response. CISSP. ${rounded} international talks.`;
  const shortBio = `${AUTHOR} is a security leader with over a decade in cybersecurity. Most recently he was Head of Security at Patchstack — a vulnerability intelligence company ranked #1 CNA globally in 2023 and 2025 — where he built the internal security program from zero. Before Patchstack he spent eight years in incident response at Sucuri and GoDaddy, handling thousands of web compromises annually with a specialization in e-commerce malware. CISSP, Computer Science Engineer, and Head of Technology at the ISC2 Spain Chapter. ${rounded} international talks across Europe and Japan.`;

  const body = blocks(
    paragraph('Security leader · CISSP · Builder of security programs from zero'),
    '## Biography',
    paragraph(
      'I build security programs from zero inside technical organizations — programs that engineering teams actually run, not policy documents that sit in a shared drive.'
    ),
    paragraph(
      'Ten years in cybersecurity, starting hands-on. Eight of them inside incident response at Sucuri and GoDaddy: thousands of compromised sites per year, malware analysis at scale, forensic work on e-commerce credit card skimmers. That work taught me to think like an attacker before thinking like a defender, and to recognize the gap between security theater and security practice.'
    ),
    paragraph(
      'Most recently, I was Head of Security at Patchstack, where I built the entire internal security function from zero: secure development lifecycle, threat modeling embedded in engineering, ISO 27001 and SOC 2 readiness, vendor risk, incident response, security culture. Patchstack is the global #1 CNA in 2023 and 2025, ahead of GitHub and Kernel.org — a ranking earned by the research team I previously led as Data & Research Lead. The technology was never the hard part. The organizational negotiation was.'
    ),
    paragraph(
      `CISSP. Computer Science Engineer (ULPGC), with formal academic grounding in AI — neural networks, genetic algorithms, automata. ${rounded} international conference talks across Europe and Japan. Head of Technology, ISC2 Spain Chapter. Based in Valencia.`
    ),
    '## Credentials',
    list(credentials.map(credentialItem)),
    '## Speaking',
    paragraph(
      `${count} international conference appearances on web security, vulnerability intelligence, CMS security, and security culture. Selected venues: WordCamp Europe, WordCamp Tokyo, WordCamp Osaka, WordCamp Vienna, WordCamp Geneva, WordCamp Greece, WordSesh. Featured in podcasts, webinars, and interviews across multiple regions.`
    ),
    list([
      link('Full speaking archive on this site', '/speaking/'),
      link('Talks archive on WordPress.tv', 'https://wordpress.tv/?s=nestor+angulo'),
    ]),
    '## Service',
    list(serviceRoles.map(serviceItem)),
    '## Publications',
    publications.map((p, i) => `${i + 1}. ${publicationItem(p)}`).join('\n'),
    '## For event organizers & press',
    '### One-liner',
    `> ${text(oneLiner)}`,
    '### Short bio (~70 words)',
    `> ${text(shortBio)}`,
    '### Speaker photo',
    list([
      link('Speaker photo — portrait (JPEG)', '/images/photo-nestor-hires-a.jpg'),
      link('Speaker photo — Athens (JPEG)', '/images/photo-nestor-hires-b.jpg'),
    ]),
    paragraph('Minimum 1500px on the long side. For event programs, slides, and press coverage.')
  );

  return makePage({
    path: '/about/',
    title: `About — ${AUTHOR}`,
    label: 'About',
    description: `CISSP and security leader, a decade in the field. Head of Security at Patchstack. Builds security programs from zero. ${rounded} international talks. Valencia.`,
    section: 'core',
    body,
  });
}
