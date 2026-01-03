import './AnimatedLogo.css';

function AnimatedLogo({ size = 40, variant = 'thinking' }) {
    const scale = size / 64;
    
    return (
        <div 
            className={`animated-logo ${variant}`}
            style={{ 
                width: size, 
                height: size,
                '--scale': scale 
            }}
        >
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id={`logoGrad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" className="grad-start" />
                        <stop offset="100%" className="grad-end" />
                    </linearGradient>
                </defs>
                
                {/* Background */}
                <rect 
                    className="logo-bg" 
                    width="64" 
                    height="64" 
                    rx="14" 
                    fill={`url(#logoGrad-${variant})`}
                />
                
                {/* Chat bubble */}
                <path 
                    className="logo-bubble"
                    d="M16 20 
                       C16 17 18.5 14 22 14 
                       H42 
                       C45.5 14 48 17 48 20 
                       V36 
                       C48 39 45.5 42 42 42 
                       H30 
                       L22 50 
                       V42 
                       H22 
                       C18.5 42 16 39 16 36 
                       Z" 
                    fill="white"
                />
                
                {/* Animated dots */}
                <circle className="logo-dot dot-1" cx="26" cy="26" r="3" />
                <circle className="logo-dot dot-2" cx="32" cy="26" r="3" />
                <circle className="logo-dot dot-3" cx="38" cy="26" r="3" />
                
                {/* Voice wave */}
                <path 
                    className="logo-wave"
                    d="M24 34 Q28 31 32 34 Q36 37 40 34" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    fill="none"
                />
            </svg>
        </div>
    );
}

export default AnimatedLogo;
