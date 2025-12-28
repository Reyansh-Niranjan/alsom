import { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, SpeakerIcon } from './Icons';
import './VoiceMode.css';

// Check for browser support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynthesis = window.speechSynthesis;

function VoiceMode({ onTranscript, onSendMessage, ttsEnabled, onToggleTTS, disabled, theme, onStateChange }) {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const onTranscriptRef = useRef(onTranscript);
    const onSendMessageRef = useRef(onSendMessage);

    // Update refs when props change
    useEffect(() => {
        onTranscriptRef.current = onTranscript;
        onSendMessageRef.current = onSendMessage;
    }, [onTranscript, onSendMessage]);

    // Notify parent of state changes
    useEffect(() => {
        if (onStateChange) {
            onStateChange(isRecording);
        }
    }, [isRecording, onStateChange]);

    useEffect(() => {
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
        if (isRecording) {
            try {
                recognitionRef.current?.start();
            } catch (e) {
                // Ignore
            }
        } else {
            recognitionRef.current?.stop();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
    }, [isRecording]);

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
                title={isRecording ? 'Stop Live Mode' : 'Start Live Voice Mode'}
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
                title="Toggle AI Speech"
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
    if (!speechSynthesis) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
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
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
}

export default VoiceMode;
