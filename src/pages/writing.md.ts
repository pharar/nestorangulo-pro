import type { APIRoute } from 'astro';
import { markdownResponse } from '../lib/ai/page';
import { writingPage } from '../lib/ai/pages/writing';

export const GET: APIRoute = async () => markdownResponse(await writingPage());
