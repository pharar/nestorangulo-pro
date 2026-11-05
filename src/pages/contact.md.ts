import type { APIRoute } from 'astro';
import { markdownResponse } from '../lib/ai/page';
import { contactPage } from '../lib/ai/pages/contact';

export const GET: APIRoute = () => markdownResponse(contactPage());
