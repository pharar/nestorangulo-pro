import { defineDict, useTranslations } from './index';
import { DEFAULT_TITLE } from '../../config';
import type { Lang } from '../config';

/**
 * Home page copy: the single source for BOTH the HTML view (src/views/Home.astro)
 * and its Markdown twin (src/lib/ai/pages/home.ts), so they cannot drift.
 * `{count}` / `{rounded}` are filled by `t(key, vars)`.
 */
export const home = defineDict({
  en: {
    title: DEFAULT_TITLE,
    description:
      'Head of Security and CISSP. I build security programs from zero — vulnerability intelligence, incident response, ISO 27001 and SOC 2.',
    role: 'Head of Security',
    headline: 'Building security programs from zero',
    tagline1: 'Builder of programs.',
    tagline2: 'Operator at incident scale.',
    tagline3: 'Strategist at the exec table.',
    heroAlt: "Close-up of a katana's hand guard and wrapped grip, lit from the side.",
    manifestoLabel: 'Manifesto',
    manifesto1:
      "Security programs don't fail because of bad tools or misconfigured alerts. They fail because they were designed for a different organization than the one that has to run them — shaped around compliance frameworks instead of engineering workflows, written in a language that only makes sense inside a security team, and treated as infrastructure when they're actually a relationship with every team in the company.",
    manifesto2:
      "I spent eight years inside incident response at Sucuri and GoDaddy. At the scale we operated — thousands of incidents per year, live malware campaigns, e-commerce skimmers running in production, intrusions on critical infrastructure — the gap between security theater and security practice becomes impossible to hide. You either build things that work under pressure or you don't.",
    manifesto3:
      'At Patchstack, I built the security program from scratch. Not a policy document dropped into a shared drive — a functioning program: secure development lifecycle, threat modeling embedded in engineering, incident response playbooks, vulnerability intelligence workflows, and coordinated disclosure operating at the scale of the global #1 CNA in 2023 and 2025, ahead of GitHub and Kernel.org. The hardest part was never the technology. It was the organizational negotiation: making security useful instead of obstructive, translating risk into decisions that product and engineering teams can act on.',
    manifesto4:
      'This site is a working archive. Essays on security program design, talks from {rounded} international conference appearances, and the thinking behind the work.',
    exploreLabel: 'Explore this site',
    sectionsLabel: 'Site sections',
    writingLabel: 'Writing',
    writingDesc:
      'Essays on security program design, vulnerability intelligence, and what incident response at scale actually teaches.',
    writingCta: 'Read the essays →',
    speakingLabel: 'Speaking',
    speakingDesc:
      '{count} international conference appearances. Slides, notes, and editorial commentary on each.',
    speakingCta: 'Browse the archive →',
    aboutLabel: 'About',
    aboutDesc: "Background, credentials, and what I've built across Patchstack and Sucuri/GoDaddy.",
    aboutCta: 'Read →',
    // Markdown twin only (no card on the page).
    contactLabel: 'Contact',
    contactDesc: 'Professional inquiries, speaking invitations, or conversation.',
  },
  es: {
    title: DEFAULT_TITLE,
    description:
      'Head of Security y CISSP. Construyo programas de seguridad desde cero: inteligencia de vulnerabilidades, respuesta a incidentes, ISO 27001 y SOC 2.',
    role: 'Head of Security',
    headline: 'Construyendo programas de seguridad desde cero',
    tagline1: 'Constructor de programas.',
    tagline2: 'Operador a escala de incidente.',
    tagline3: 'Estratega en la mesa de dirección.',
    heroAlt: 'Primer plano de la guarda y la empuñadura trenzada de una katana, iluminada de lado.',
    manifestoLabel: 'Manifiesto',
    manifesto1:
      'Los programas de seguridad no fallan por culpa de malas herramientas o de alertas mal configuradas. Fallan porque se diseñaron para una organización distinta de la que tiene que ejecutarlos: pensados en torno a marcos de cumplimiento en lugar de flujos de trabajo de ingeniería, escritos en un lenguaje que solo tiene sentido dentro de un equipo de seguridad y tratados como infraestructura cuando en realidad son una relación con todos los equipos de la empresa.',
    manifesto2:
      'Pasé ocho años en respuesta a incidentes en Sucuri y GoDaddy. A la escala a la que operábamos (miles de incidentes al año, campañas de malware en vivo, skimmers de e-commerce ejecutándose en producción, intrusiones en infraestructura crítica) la distancia entre el teatro de la seguridad y la seguridad de verdad es imposible de esconder. O construyes cosas que funcionan bajo presión, o no.',
    manifesto3:
      'En Patchstack construí el programa de seguridad desde cero. No un documento de políticas olvidado en una carpeta compartida, sino un programa que funciona: ciclo de vida de desarrollo seguro, modelado de amenazas integrado en ingeniería, playbooks de respuesta a incidentes, flujos de inteligencia de vulnerabilidades y divulgación coordinada a la escala de la CNA número 1 del mundo en 2023 y 2025, por delante de GitHub y Kernel.org. Lo difícil nunca fue la tecnología. Fue la negociación dentro de la organización: conseguir que la seguridad sea útil en lugar de un estorbo y traducir el riesgo en decisiones sobre las que los equipos de producto e ingeniería puedan actuar.',
    manifesto4:
      'Esta web es un archivo vivo. Artículos sobre diseño de programas de seguridad, charlas de {rounded} apariciones en conferencias internacionales y el pensamiento detrás del trabajo.',
    exploreLabel: 'Explora esta web',
    sectionsLabel: 'Secciones de la web',
    writingLabel: 'Artículos',
    writingDesc:
      'Artículos sobre diseño de programas de seguridad, inteligencia de vulnerabilidades y lo que enseña de verdad la respuesta a incidentes a escala.',
    writingCta: 'Leer los artículos →',
    speakingLabel: 'Charlas',
    speakingDesc:
      '{count} apariciones en conferencias internacionales. Diapositivas, notas y comentario editorial de cada una.',
    speakingCta: 'Explorar el archivo →',
    aboutLabel: 'Sobre mí',
    aboutDesc:
      'Trayectoria, certificaciones y lo que he construido en Patchstack y en Sucuri/GoDaddy.',
    aboutCta: 'Leer →',
    contactLabel: 'Contacto',
    contactDesc: 'Consultas profesionales, invitaciones para dar charlas o simplemente conversar.',
  },
});

export const useHome = (lang: Lang) => useTranslations(home, lang);
