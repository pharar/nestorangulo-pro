import type { APIRoute } from 'astro';
import { markdownResponse } from '../lib/ai/page';
import { homePage } from '../lib/ai/pages/home';

export const GET: APIRoute = async () => markdownResponse(await homePage());
