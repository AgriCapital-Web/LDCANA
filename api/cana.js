import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const cors = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).setHeader('Access-Control-Allow-Origin','*').setHeader('Access-Control-Allow-Methods','POST,OPTIONS').setHeader('Access-Control-Allow-Headers','content-type').end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error('CANA API configuration error: DATABASE_URL is missing');
    res.status(500).json({ error: 'Le service est temporairement indisponible. Veuillez réessayer plus tard ou contacter l’équipe Les Délices de CANA.' });
    return;
  }
  try {
    const body = req.body || {};
    const action = typeof body.p_action === 'string' ? body.p_action : '';
    const payload = body.p_payload && typeof body.p_payload === 'object' ? body.p_payload : {};
    const session = typeof body.p_session === 'string' && body.p_session ? body.p_session : null;
    if (!action) {
      res.status(400).json({ error: 'p_action required' });
      return;
    }
    const rows = await sql`select public.cana_api(${action}, ${JSON.stringify(payload)}::jsonb, ${session}) as data`;
    res.status(200).json(rows[0]?.data ?? null);
  } catch (error) {
    console.error('CANA API error', error);
    res.status(500).json({ error: 'Une difficulté technique empêche cette action pour le moment. Veuillez réessayer. Si le problème persiste, contactez l’équipe Les Délices de CANA.' });
  }
}
