import { defineDict, useTranslations } from './index';
import type { Lang } from '../config';

/**
 * About page copy: the single source for the HTML view (src/views/About.astro),
 * its components (Credentials, Service, Publications, Press) and its Markdown
 * twin (src/lib/ai/pages/about.ts). `{count}` / `{rounded}` / `{n}` / `{title}` /
 * `{date}` are filled by `t(key, vars)`.
 */
export const about = defineDict({
  en: {
    title: 'About — Nestor Angulo de Ugarte',
    description:
      'CISSP and security leader, a decade in the field. Head of Security at Patchstack. Builds security programs from zero. {rounded} international talks. Valencia.',
    breadcrumb: 'About',
    h1: 'About',
    photoAlt: 'Nestor Angulo de Ugarte, Head of Security and CISSP.',
    tagline: 'Security leader · CISSP · Builder of security programs from zero',
    bioLabel: 'Biography',
    bio1: 'I build security programs from zero inside technical organizations — programs that engineering teams actually run, not policy documents that sit in a shared drive.',
    bio2: 'Ten years in cybersecurity, starting hands-on. Eight of them inside incident response at Sucuri and GoDaddy: thousands of compromised sites per year, malware analysis at scale, forensic work on e-commerce credit card skimmers. That work taught me to think like an attacker before thinking like a defender, and to recognize the gap between security theater and security practice.',
    bio3: 'Most recently, I was Head of Security at Patchstack, where I built the entire internal security function from zero: secure development lifecycle, threat modeling embedded in engineering, ISO 27001 and SOC 2 readiness, vendor risk, incident response, security culture. Patchstack is the global #1 CNA in 2023 and 2025, ahead of GitHub and Kernel.org — a ranking earned by the research team I previously led as Data & Research Lead. The technology was never the hard part. The organizational negotiation was.',
    bio4: 'CISSP. Computer Science Engineer (ULPGC), with formal academic grounding in AI — neural networks, genetic algorithms, automata. {rounded} international conference talks across Europe and Japan. Head of Technology, ISC2 Spain Chapter. Based in Valencia.',
    credentialsHeading: 'Credentials',
    verify: 'Verify',
    verifyLink: 'Verify ↗',
    verifyAria: 'Verify credential: {title}',
    eqf: 'EQF Level {n}',
    validUntil: 'Valid until {date}',
    since: 'Since {date}',
    speakingHeading: 'Speaking',
    speakingText:
      '{count} international conference appearances on web security, vulnerability intelligence, CMS security, and security culture. Selected venues: WordCamp Europe, WordCamp Tokyo, WordCamp Osaka, WordCamp Vienna, WordCamp Geneva, WordCamp Greece, WordSesh. Featured in podcasts, webinars, and interviews across multiple regions.',
    speakingLink: 'View talks archive on WordPress.tv →',
    speakingArchive: 'Full speaking archive on this site',
    speakingWptv: 'Talks archive on WordPress.tv',
    serviceHeading: 'Service',
    publicationsHeading: 'Publications',
    pubBookChapter: 'Book Chapter',
    pubConferencePaper: 'Conference Paper',
    pubIn: 'In',
    pubAnd: '&',
    pressHeading: 'For event organizers & press',
    oneLinerLabel: 'One-liner',
    oneLiner:
      'Builds security programs from zero. 10+ years in cybersecurity, came up through incident response. CISSP. {rounded} international talks.',
    shortBioLabel: 'Short bio (~70 words)',
    shortBio:
      'Nestor Angulo de Ugarte is a security leader with over a decade in cybersecurity. Most recently he was Head of Security at Patchstack — a vulnerability intelligence company ranked #1 CNA globally in 2023 and 2025 — where he built the internal security program from zero. Before Patchstack he spent eight years in incident response at Sucuri and GoDaddy, handling thousands of web compromises annually with a specialization in e-commerce malware. CISSP, Computer Science Engineer, and Head of Technology at the ISC2 Spain Chapter. {rounded} international talks across Europe and Japan.',
    copy: 'Copy',
    copied: 'Copied!',
    copyOneLinerAria: 'Copy one-liner bio to clipboard',
    copyShortBioAria: 'Copy short bio to clipboard',
    copiedAria: 'Copied to clipboard',
    copyFallbackAria: 'Copy to clipboard',
    photoLabel: 'Speaker photo',
    photoPortraitLink: 'Download speaker photo — portrait (JPEG) →',
    photoAthensLink: 'Download speaker photo — Athens (JPEG) →',
    photoPortraitMd: 'Speaker photo — portrait (JPEG)',
    photoAthensMd: 'Speaker photo — Athens (JPEG)',
    photoNote: 'Minimum 1500px on the long side. For event programs, slides, and press coverage.',
  },
  es: {
    title: 'Sobre mí — Nestor Angulo de Ugarte',
    description:
      'CISSP y líder de seguridad, una década en el sector. Head of Security en Patchstack. Construye programas de seguridad desde cero. {rounded} charlas internacionales. Valencia.',
    breadcrumb: 'Sobre mí',
    h1: 'Sobre mí',
    photoAlt: 'Nestor Angulo de Ugarte, Head of Security y CISSP.',
    tagline: 'Líder de seguridad · CISSP · Constructor de programas de seguridad desde cero',
    bioLabel: 'Biografía',
    bio1: 'Construyo programas de seguridad desde cero dentro de organizaciones técnicas — programas que los equipos de ingeniería ejecutan de verdad, no documentos de políticas olvidados en una carpeta compartida.',
    bio2: 'Diez años en ciberseguridad, empezando con las manos en la masa. Ocho de ellos en respuesta a incidentes en Sucuri y GoDaddy: miles de webs comprometidas al año, análisis de malware a escala, trabajo forense sobre skimmers de tarjetas de crédito en e-commerce. Aquello me enseñó a pensar como un atacante antes que como un defensor, y a reconocer la distancia entre el teatro de la seguridad y la seguridad de verdad.',
    bio3: 'Hasta hace poco fui Head of Security en Patchstack, donde construí desde cero toda la función de seguridad interna: ciclo de vida de desarrollo seguro, modelado de amenazas integrado en ingeniería, preparación para ISO 27001 y SOC 2, riesgo de proveedores, respuesta a incidentes, cultura de seguridad. Patchstack es la CNA número 1 del mundo en 2023 y 2025, por delante de GitHub y Kernel.org — un ranking que se ganó el equipo de investigación que lideré antes como Data & Research Lead. La tecnología nunca fue lo difícil. Lo difícil fue la negociación dentro de la organización.',
    bio4: 'CISSP. Ingeniero Informático (ULPGC), con una sólida base académica en IA — redes neuronales, algoritmos genéticos, autómatas. {rounded} charlas en conferencias internacionales por Europa y Japón. Head of Technology del ISC2 Spain Chapter. Afincado en Valencia.',
    credentialsHeading: 'Certificaciones',
    verify: 'Verificar',
    verifyLink: 'Verificar ↗',
    verifyAria: 'Verificar certificación: {title}',
    eqf: 'Nivel EQF {n}',
    validUntil: 'Válido hasta {date}',
    since: 'Desde {date}',
    speakingHeading: 'Charlas',
    speakingText:
      '{count} apariciones en conferencias internacionales sobre seguridad web, inteligencia de vulnerabilidades, seguridad de CMS y cultura de seguridad. Algunas sedes: WordCamp Europe, WordCamp Tokyo, WordCamp Osaka, WordCamp Vienna, WordCamp Geneva, WordCamp Greece, WordSesh. También en podcasts, webinars y entrevistas de varias regiones.',
    speakingLink: 'Ver el archivo de charlas en WordPress.tv →',
    speakingArchive: 'Archivo completo de charlas en esta web',
    speakingWptv: 'Archivo de charlas en WordPress.tv',
    serviceHeading: 'Cargos y servicio',
    publicationsHeading: 'Publicaciones',
    pubBookChapter: 'Capítulo de libro',
    pubConferencePaper: 'Artículo de congreso',
    pubIn: 'En',
    pubAnd: 'y',
    pressHeading: 'Para organizadores de eventos y prensa',
    oneLinerLabel: 'Una línea',
    oneLiner:
      'Construye programas de seguridad desde cero. Más de 10 años en ciberseguridad, formado en respuesta a incidentes. CISSP. {rounded} charlas internacionales.',
    shortBioLabel: 'Bio corta (~70 palabras)',
    shortBio:
      'Nestor Angulo de Ugarte es un líder de seguridad con más de una década en ciberseguridad. Hasta hace poco fue Head of Security en Patchstack — una empresa de inteligencia de vulnerabilidades, CNA número 1 del mundo en 2023 y 2025 — donde construyó desde cero el programa de seguridad interno. Antes de Patchstack pasó ocho años en respuesta a incidentes en Sucuri y GoDaddy, gestionando miles de compromisos web al año y especializándose en malware de e-commerce. CISSP, Ingeniero Informático y Head of Technology del ISC2 Spain Chapter. {rounded} charlas internacionales por Europa y Japón.',
    copy: 'Copiar',
    copied: '¡Copiado!',
    copyOneLinerAria: 'Copiar la bio de una línea al portapapeles',
    copyShortBioAria: 'Copiar la bio corta al portapapeles',
    copiedAria: 'Copiado al portapapeles',
    copyFallbackAria: 'Copiar al portapapeles',
    photoLabel: 'Foto de speaker',
    photoPortraitLink: 'Descargar foto de speaker — retrato (JPEG) →',
    photoAthensLink: 'Descargar foto de speaker — Atenas (JPEG) →',
    photoPortraitMd: 'Foto de speaker — retrato (JPEG)',
    photoAthensMd: 'Foto de speaker — Atenas (JPEG)',
    photoNote:
      'Mínimo 1500 px en el lado largo. Para programas de eventos, diapositivas y cobertura de prensa.',
  },
});

export const useAbout = (lang: Lang) => useTranslations(about, lang);
