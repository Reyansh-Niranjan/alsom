import { useState, useEffect, useRef } from 'react';
import { useScribe } from '@elevenlabs/react';
import { MicrophoneIcon, SpeakerIcon } from './Icons';
import './VoiceMode.css';

// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

const TTS_PROVIDER = (import.meta.env.VITE_TTS_PROVIDER || 'browser').toLowerCase();
const STT_PROVIDER = (import.meta.env.VITE_STT_PROVIDER || 'browser').toLowerCase();

function cleanupTextForSpeech(text) {
    if (typeof text !== 'string') return '';
    // Minimal cleanup to avoid reading code fences and excessive whitespace aloud.
    let cleaned = text;
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
}

let elevenAudio = null;
let elevenAbortController = null;

async function fetchScribeToken(authToken) {
    const headers = {};
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch('/api/scribe-token', { headers });
    if (!response.ok) {
        throw new Error(await response.text());
    }
    const data = await response.json();
    if (!data?.token) throw new Error('Missing token in response');
    return data.token;
}

function VoiceMode({ onTranscript, onSendMessage, ttsEnabled, onToggleTTS, disabled, theme, onStateChange, authToken }) {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const onTranscriptRef = useRef(onTranscript);
    const onSendMessageRef = useRef(onSendMessage);
    const isRecordingRef = useRef(isRecording);
    const authTokenRef = useRef(authToken);
    const lastCommittedRef = useRef('');

    const scribe = useScribe({
        modelId: 'scribe_v2_realtime',
        onPartialTranscript: (data) => {
            if (!isRecordingRef.current || STT_PROVIDER !== 'elevenlabs') return;
            const text = data?.text || '';
            if (onTranscriptRef.current) onTranscriptRef.current(text);
        },
        onCommittedTranscript: (data) => {
            if (!isRecordingRef.current || STT_PROVIDER !== 'elevenlabs') return;
            const text = (data?.text || '').trim();
            if (!text) return;
            if (text === lastCommittedRef.current) return;
            lastCommittedRef.current = text;
            if (onTranscriptRef.current) onTranscriptRef.current(text);
            if (onSendMessageRef.current) onSendMessageRef.current(text);
        },
    });

    // Update refs when props change
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
        onSendMessageRef.current = onSendMessage;
    }, [onTranscript, onSendMessage]);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    useEffect(() => {
        authTokenRef.current = authToken;
    }, [authToken]);

    // Notify parent of state changes
    useEffect(() => {
        if (onStateChange) {
            onStateChange(isRecording);
        }
    }, [isRecording, onStateChange]);

    useEffect(() => {
        if (STT_PROVIDER === 'elevenlabs') return;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const current = event.resultIndex;
            const transcript = event.results[current][0].transcript;

            // Call via ref to avoid effect dependency
            if (onTranscriptRef.current) onTranscriptRef.current(transcript);

            // Clear existing silence timer
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // If user stops speaking for 1.5s, send the message
            if (transcript.trim().length > 0) {
                silenceTimerRef.current = setTimeout(() => {
                    if (onSendMessageRef.current) {
                        onSendMessageRef.current(transcript);
                        // Optional: Clear transcript after sending if desired,
                        // but usually better to let the parent handle the "sent" state
                    }
                }, 1500);
            }
        };

        recognition.onend = () => {
            // Auto-restart if we think we are recording (simulating continuous listening loops if browser stops it)
            if (isRecording) {
                try {
                    recognition.start();
                } catch (e) {
                    console.log("Restarting recognition...");
                }
            } else {
                setIsRecording(false);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            recognition.abort();
        };
    }, []); // Only run once on mount

    // Watch isRecording to start/stop
    useEffect(() => {
        if (STT_PROVIDER === 'elevenlabs') return;
        if (isRecording) {
            try {
                recognitionRef.current?.start();
            } catch {
                // Ignore
            }
            return;
        }

        recognitionRef.current?.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }, [isRecording]);

    useEffect(() => {
        if (STT_PROVIDER !== 'elevenlabs') return;

        if (!isRecording) {
            try { scribe.disconnect(); } catch { /* noop */ }
            return;
        }

        (async () => {
            try {
                const token = await fetchScribeToken(authTokenRef.current);
                await scribe.connect({
                    token,
                    microphone: {
                        echoCancellation: true,
                        noiseSuppression: true,
                    },
                });
            } catch (e) {
                console.error('Failed to start ElevenLabs Scribe:', e);
                setIsRecording(false);
            }
        })();
    }, [isRecording, scribe]);

    const toggleRecording = () => {
        setIsRecording(!isRecording);
    };

    return (
        <div className={`voice-controls ${theme}`}>
            <button
                type="button"
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                disabled={disabled}
                title={isRecording ? `Stop Live Mode (${STT_PROVIDER})` : `Start Live Voice Mode (${STT_PROVIDER})`}
            >
                <MicrophoneIcon size={20} />
            </button>

            {isRecording && (
                <div className="voice-indicator">
                    <div className="wave">
                        <span></span><span></span><span></span><span></span>
                    </div>
                </div>
            )}

            <button
                type="button"
                className={`voice-btn ${ttsEnabled ? 'tts-active' : ''}`}
                onClick={onToggleTTS}
                disabled={disabled}
                title={`Toggle AI Speech (${TTS_PROVIDER})`}
            >
                <SpeakerIcon size={20} />
            </button>
        </div>
    );
}

/**
 * Speak text using Web Speech API
 */
export function speakText(text, onStart, onEnd) {
    const cleanedText = cleanupTextForSpeech(text);
    if (!cleanedText) {
        if (onEnd) onEnd();
        return;
    }

    if (TTS_PROVIDER === 'elevenlabs') {
        stopSpeaking();

        (async () => {
            try {
                elevenAbortController = new AbortController();
                const response = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: cleanedText }),
                    signal: elevenAbortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await response.text());
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                const audio = new Audio(audioUrl);
                elevenAudio = audio;

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    elevenAudio = null;
                    elevenAbortController = null;
                    if (onEnd) onEnd();
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    elevenAudio = null;
                    elevenAbortController = null;
                    if (onEnd) onEnd();
                };

                if (onStart) onStart();
                await audio.play();
            } catch (e) {
                console.warn('ElevenLabs TTS failed, falling back to browser TTS:', e);
                elevenAudio = null;
                elevenAbortController = null;
                speakTextBrowser(cleanedText, onStart, onEnd);
            }
        })();

        return;
    }

    speakTextBrowser(cleanedText, onStart, onEnd);
}

function speakTextBrowser(cleanedText, onStart, onEnd) {
    if (!speechSynthesis) {
        if (onEnd) onEnd();
        return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a natural-sounding voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Samantha')
    );
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
        if (onStart) onStart();
    };

    utterance.onend = () => {
        if (onEnd) onEnd();
    };

    utterance.onerror = () => {
        if (onEnd) onEnd();
    };

    speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking() {
    if (elevenAbortController) {
        try { elevenAbortController.abort(); } catch { /* noop */ }
        elevenAbortController = null;
    }
    if (elevenAudio) {
        try {
            elevenAudio.pause();
            elevenAudio.currentTime = 0;
        } catch {
            // noop
        }
        elevenAudio = null;
    }
    if (speechSynthesis) speechSynthesis.cancel();
}

export default VoiceMode;
