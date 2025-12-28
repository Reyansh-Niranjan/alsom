import { useState } from 'react';
import PropTypes from 'prop-types';
import ThemeToggle from './ThemeToggle';
import { EditIcon, CheckIcon, CloseIcon } from './Icons';
import './ChatHeader.css';

function ChatHeader({ title, onRename, theme, onToggleTheme }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(title);

    const handleSave = () => {
        if (editValue.trim() && editValue !== title) {
            onRename(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(title);
        setIsEditing(false);
    };

    return (
        <header className={`chat-header-modern ${theme}`}>
            <div className="header-title-section">
                {isEditing ? (
                    <div className="title-edit-mode">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                            }}
                            autoFocus
                        />
                        <button onClick={handleSave} className="save-btn"><CheckIcon size={16} /></button>
                        <button onClick={handleCancel} className="cancel-btn"><CloseIcon size={16} /></button>
                    </div>
                ) : (
                    <>
                        <h1 className="header-title">{title}</h1>
                        <button
                            className="edit-title-btn"
                            onClick={() => setIsEditing(true)}
                            title="Rename conversation"
                        >
                            <EditIcon size={16} />
                        </button>
                    </>
                )}
            </div>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </header>
    );
}

ChatHeader.propTypes = {
    title: PropTypes.string.isRequired,
    onRename: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    onToggleTheme: PropTypes.func.isRequired,
};

export default ChatHeader;
