import { useState } from 'react';
import PropTypes from 'prop-types';
import { MenuIcon, CloseIcon, DeleteIcon, EditIcon, CheckIcon, UserIcon } from './Icons';
import './Sidebar.css';

function Sidebar({
  conversations,
  currentConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onSignOut,
  userEmail,
  isCollapsed,
  onToggleSidebar,
  theme
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = (conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = (id) => {
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${theme}`}>
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title={isCollapsed ? 'Expand' : 'Collapse'}>
          {isCollapsed ? <MenuIcon size={20} /> : <CloseIcon size={20} />}
        </button>
        {!isCollapsed && (
          <button className="new-chat-btn" onClick={onNewChat}>
            <span className="icon">+</span>
            <span>New Chat</span>
          </button>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <p>No conversations yet</p>
                <p className="hint">Start a new chat!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                  onClick={() => onSelectChat(conv.id)}
                >
                  {editingId === conv.id ? (
                    <div className="edit-mode" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(conv.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button onClick={() => handleSaveEdit(conv.id)}><CheckIcon size={16} /></button>
                        <button onClick={handleCancelEdit}><CloseIcon size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="conversation-content">
                        <div className="conversation-title">{conv.title}</div>
                        <div className="conversation-time">{formatDate(conv.updated_at)}</div>
                      </div>
                      <div className="conversation-actions">
                        <button
                          className="action-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv);
                          }}
                          title="Rename"
                        >
                          <EditIcon size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this conversation?')) {
                              onDeleteChat(conv.id);
                            }
                          }}
                          title="Delete"
                        >
                          <DeleteIcon size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar"><UserIcon size={24} /></div>
              <div className="user-details">
                <div className="user-email">{userEmail}</div>
              </div>
            </div>
            <button className="signout-btn-sidebar" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

Sidebar.propTypes = {
  conversations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    updated_at: PropTypes.string.isRequired,
  })).isRequired,
  currentConversationId: PropTypes.string,
  onNewChat: PropTypes.func.isRequired,
  onSelectChat: PropTypes.func.isRequired,
  onDeleteChat: PropTypes.func.isRequired,
  onRenameChat: PropTypes.func.isRequired,
  onSignOut: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool.isRequired,
  onToggleSidebar: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
};

export default Sidebar;
