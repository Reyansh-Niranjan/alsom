/**
 * Vercel Serverless Function: /api/dialogue
 *
 * Server-side proxy for ElevenLabs Text-to-Dialogue.
 * Note: Text-to-Dialogue is not intended for real-time agents.
 */

function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  setCors(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error: ELEVENLABS_API_KEY not set' });

  try {
    const {
      inputs,
      model_id,
      output_format,
      language_code,
      settings,
      apply_text_normalization,
    } = req.body || {};

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid "inputs" field. Must be a non-empty array.' });
    }

    const outputFormat = (output_format && typeof output_format === 'string')
      ? output_format
      : (process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128');

    const url = `https://api.elevenlabs.io/v1/text-to-dialogue?output_format=${encodeURIComponent(outputFormat)}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        inputs,
        model_id: (model_id && typeof model_id === 'string') ? model_id : 'eleven_v3',
        language_code: typeof language_code === 'string' ? language_code : undefined,
        settings: (settings && typeof settings === 'object') ? settings : undefined,
        apply_text_normalization: typeof apply_text_normalization === 'string' ? apply_text_normalization : 'auto',
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: 'ElevenLabs dialogue error', details: errText });
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('[API /dialogue] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
