import type { APIRoute } from 'astro';
import { markdownResponse } from '../lib/ai/page';
import { speakingPage } from '../lib/ai/pages/talks';

export const GET: APIRoute = async () => markdownResponse(await speakingPage());
