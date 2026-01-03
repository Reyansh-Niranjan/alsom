import { useState } from 'react';
import { ThinkingIcon } from './Icons';
import AnimatedLogo from './AnimatedLogo';
import './ThinkingBlock.css';

function ThinkingBlock({ thinking, isLoading = false }) {
    const [expanded, setExpanded] = useState(false);

    if (isLoading) {
        return (
            <div className="thinking-loading">
                <AnimatedLogo size={28} variant="thinking" />
                <span>Thinking</span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </div>
        );
    }

    if (!thinking) return null;

    return (
        <div className="thinking-block">
            <div className="thinking-header" onClick={() => setExpanded(!expanded)}>
                <ThinkingIcon size={18} className="thinking-icon" />
                <span className="thinking-label">
                    {expanded ? 'Hide reasoning' : 'Show reasoning'}
                </span>
                <span className={`thinking-toggle ${expanded ? 'expanded' : ''}`}>▼</span>
            </div>
            <div className={`thinking-content ${expanded ? 'expanded' : ''}`}>
                <div className="thinking-text">{thinking}</div>
            </div>
        </div>
    );
}

export default ThinkingBlock;
