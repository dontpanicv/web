import type { APIRoute } from 'astro';
import { agentFiles } from '../../lib/agent-files';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await agentFiles()), { headers: { 'content-type': 'application/json' } });
