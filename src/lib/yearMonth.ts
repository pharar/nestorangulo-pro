import type { Lang } from '../i18n/config';

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
};

/** `2025-01` -> `Jan 2025` / `ene 2025`; `2025` -> `2025`. Shared by the About components and twin. */
export function formatYearMonth(value: string, lang: Lang = 'en'): string {
  const [year, month] = value.split('-');
  return month ? `${MONTHS[lang][parseInt(month, 10) - 1]} ${year}` : year;
}
