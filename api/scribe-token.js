/**
 * Vercel Serverless Function: /api/scribe-token
 *
 * Creates a single-use token for ElevenLabs Scribe v2 Realtime.
 * This prevents exposing ELEVENLABS_API_KEY to the browser.
 */

import { createClient } from '@supabase/supabase-js';

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

async function maybeVerifySupabaseUser(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = req.headers.authorization;

  if (!supabaseUrl || !supabaseServiceKey) return { ok: true, skipped: true };
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Missing Authorization bearer token' };
  }

  const accessToken = authHeader.slice('bearer '.length);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Invalid Supabase session' };
  }

  return { ok: true, skipped: false, userId: data.user.id };
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  setCors(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed. Use GET.' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error: ELEVENLABS_API_KEY not set' });

  try {
    const authCheck = await maybeVerifySupabaseUser(req);
    if (!authCheck.ok) {
      return res.status(authCheck.status || 401).json({ error: authCheck.error || 'Unauthorized' });
    }

    const upstream = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'ElevenLabs token error', details: data || null });
    }

    if (!data?.token) {
      return res.status(500).json({ error: 'Unexpected response from ElevenLabs token endpoint' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ token: data.token });
  } catch (error) {
    console.error('[API /scribe-token] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
