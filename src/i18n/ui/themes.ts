import type { Lang } from '../config';

/**
 * Display labels for the theme tags shared by talks and essays. The stored
 * value (the `themes` enum in `src/content.config.ts`) is always the English
 * label; this only changes what a Spanish page shows. Filters must keep
 * matching on the stored value.
 *
 * Terms Spanish practitioners say in English stay in English (Malware, GRC).
 */
const ES: Record<string, string> = {
  'Incident Response': 'Respuesta ante incidentes',
  'Web Security': 'Seguridad web',
  'WordPress Security': 'Seguridad en WordPress',
  Malware: 'Malware',
  'Vulnerability Intelligence': 'Inteligencia de vulnerabilidades',
  'Open Source Security': 'Seguridad open source',
  'Software Supply Chain': 'Cadena de suministro de software',
  'Security Leadership': 'Liderazgo en seguridad',
  GRC: 'GRC',
  'Industrial Cybersecurity': 'Ciberseguridad industrial',
  'AI Security': 'Seguridad en IA',
  'Security Awareness': 'Concienciación en seguridad',
};

export function themeLabel(theme: string, lang: Lang): string {
  return lang === 'es' ? (ES[theme] ?? theme) : theme;
}
