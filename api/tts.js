/**
 * Vercel Serverless Function: /api/tts
 *
 * Server-side proxy for ElevenLabs Text-to-Speech.
 * Keeps ELEVENLABS_API_KEY secret (never sent to client).
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
      text,
      voice_id,
      model_id,
      output_format,
      voice_settings,
      language_code,
      apply_text_normalization,
    } = req.body || {};

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field' });
    }

    const voiceId = (voice_id && typeof voice_id === 'string')
      ? voice_id
      : process.env.ELEVENLABS_DEFAULT_VOICE_ID;

    if (!voiceId) {
      return res.status(400).json({
        error: 'Missing "voice_id" and ELEVENLABS_DEFAULT_VOICE_ID not set'
      });
    }

    const modelId = (model_id && typeof model_id === 'string')
      ? model_id
      : (process.env.ELEVENLABS_TTS_MODEL_ID || 'eleven_flash_v2_5');

    const outputFormat = (output_format && typeof output_format === 'string')
      ? output_format
      : (process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128');

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        language_code: typeof language_code === 'string' ? language_code : undefined,
        voice_settings: (voice_settings && typeof voice_settings === 'object') ? voice_settings : undefined,
        apply_text_normalization: typeof apply_text_normalization === 'string' ? apply_text_normalization : 'auto',
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: 'ElevenLabs TTS error', details: errText });
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('[API /tts] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
