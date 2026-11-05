import type { APIRoute } from 'astro';
import { markdownResponse } from '../lib/ai/page';
import { aboutPage } from '../lib/ai/pages/about';

export const GET: APIRoute = async () => markdownResponse(await aboutPage());
