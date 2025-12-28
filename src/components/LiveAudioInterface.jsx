import React from 'react';
import './LiveAudioInterface.css';
import { CloseIcon } from './Icons';

function LiveAudioInterface({ isRecording, isSpeaking, isThinking, transcript, lastResponse, onExit }) {

    // Determine state class
    let stateClass = 'idle';
    let statusText = 'Ready';

    if (isThinking) {
        stateClass = 'thinking';
        statusText = 'Thinking...';
    } else if (isSpeaking) {
        stateClass = 'speaking';
        statusText = 'Speaking...';
    } else if (isRecording) {
        stateClass = 'listening';
        statusText = 'Listening...';
    }

    return (
        <div className="live-overlay">
            <button className="exit-btn" onClick={onExit}>
                <CloseIcon size={20} />
                Exit Live Mode
            </button>

            <div className="live-content">
                <div className={`ai-logo-container ${stateClass}`}>
                    <div className="ring-1 orbital-ring"></div>
                    <div className="ring-2 orbital-ring"></div>
                    <div className="ring-3 orbital-ring"></div>
                    <div className="ai-orb"></div>
                </div>

                <div className="status-text">{statusText}</div>

                <div className="live-transcript">
                    {transcript || (isRecording ? "Listening..." : "Say something...")}
                </div>

                {lastResponse && !isThinking && (
                    <div className="live-response">
                        "{lastResponse}"
                    </div>
                )}
            </div>
        </div>
    );
}

export default LiveAudioInterface;
