import { getCollection } from 'astro:content';

export async function getPublishedTalks() {
  const all = await getCollection('talks');
  return all.filter((t) => !t.data.draft);
}

export function talkCountRounded(count: number): string {
  return `${Math.floor(count / 10) * 10}+`;
}
