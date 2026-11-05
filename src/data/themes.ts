/**
 * The theme taxonomy, shared by every collection that tags content with themes.
 *
 * It lives here rather than inside one schema so talks and essays cannot drift
 * apart: a theme typo on an essay used to build fine and quietly produce a tag
 * no talk shares. Adding a theme means adding it here, once.
 */
export const THEMES = [
  'Incident Response',
  'Web Security',
  'WordPress Security',
  'Malware',
  'Vulnerability Intelligence',
  'Open Source Security',
  'Software Supply Chain',
  'Security Leadership',
  'GRC',
  'Industrial Cybersecurity',
  'AI Security',
  'Security Awareness',
] as const;
