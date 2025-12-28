import PropTypes from 'prop-types';

// Flat color SVG icons with no gradients
export function ChatBubbleIcon({ size = 64, color = '#6366f1', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path
                d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                fill={color}
            />
        </svg>
    );
}
ChatBubbleIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function UserIcon({ size = 40, color = '#6366f1', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="8" r="4" fill={color} />
            <path d="M12 14C7.58 14 4 16.69 4 20V22H20V20C20 16.69 16.42 14 12 14Z" fill={color} />
        </svg>
    );
}
UserIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function RobotIcon({ size = 40, color = '#10b981', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="5" y="8" width="14" height="11" rx="2" fill={color} />
            <circle cx="9" cy="13" r="1.5" fill="white" />
            <circle cx="15" cy="13" r="1.5" fill="white" />
            <rect x="10" y="16" width="4" height="1" fill="white" />
            <rect x="11" y="4" width="2" height="4" fill={color} />
            <circle cx="12" cy="3" r="2" fill={color} />
        </svg>
    );
}
RobotIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function SendIcon({ size = 24, color = '#6366f1', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill={color} />
        </svg>
    );
}
SendIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function MenuIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z" fill={color} />
        </svg>
    );
}
MenuIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function CloseIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill={color} />
        </svg>
    );
}
CloseIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function DeleteIcon({ size = 20, color = '#ef4444', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill={color} />
        </svg>
    );
}
DeleteIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function EditIcon({ size = 20, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z" fill={color} />
        </svg>
    );
}
EditIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function CheckIcon({ size = 20, color = '#22c55e', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill={color} />
        </svg>
    );
}
CheckIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function MoonIcon({ size = 24, color = '#a78bfa', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 11.54 20.96 11.08 20.9 10.64C19.92 12.01 18.32 12.9 16.5 12.9C13.52 12.9 11.1 10.48 11.1 7.5C11.1 5.68 11.99 4.08 13.36 3.1C12.92 3.04 12.46 3 12 3Z" fill={color} />
        </svg>
    );
}
MoonIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function SunIcon({ size = 24, color = '#fbbf24', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <circle cx="12" cy="12" r="5" fill={color} />
            <path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}
SunIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function AttachmentIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M16.5 6V17.5C16.5 19.71 14.71 21.5 12.5 21.5C10.29 21.5 8.5 19.71 8.5 17.5V5C8.5 3.62 9.62 2.5 11 2.5C12.38 2.5 13.5 3.62 13.5 5V15.5C13.5 16.05 13.05 16.5 12.5 16.5C11.95 16.5 11.5 16.05 11.5 15.5V6H10V15.5C10 16.88 11.12 18 12.5 18C13.88 18 15 16.88 15 15.5V5C15 2.79 13.21 1 11 1C8.79 1 7 2.79 7 5V17.5C7 20.54 9.46 23 12.5 23C15.54 23 18 20.54 18 17.5V6H16.5Z" fill={color} />
        </svg>
    );
}
AttachmentIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function MicrophoneIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill={color} />
            <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill={color} />
        </svg>
    );
}
MicrophoneIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function SpeakerIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M3 9V15H7L12 20V4L7 9H3Z" fill={color} />
            <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12Z" fill={color} />
            <path d="M14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z" fill={color} />
        </svg>
    );
}
SpeakerIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export function ThinkingIcon({ size = 24, color = 'currentColor', className = '' }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill={color} />
        </svg>
    );
}
ThinkingIcon.propTypes = { size: PropTypes.number, color: PropTypes.string, className: PropTypes.string };

export default {
    ChatBubbleIcon,
    UserIcon,
    RobotIcon,
    SendIcon,
    MenuIcon,
    CloseIcon,
    DeleteIcon,
    EditIcon,
    CheckIcon,
    MoonIcon,
    SunIcon,
    AttachmentIcon,
    MicrophoneIcon,
    SpeakerIcon,
    ThinkingIcon
};
