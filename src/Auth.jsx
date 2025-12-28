import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './chatbot';
import ThemeToggle from './components/ThemeToggle';
import { ChatBubbleIcon } from './components/Icons';
import PropTypes from 'prop-types';
import './Auth.css';

export default function AuthComponent({ theme, onToggleTheme }) {
  return (
    <div className={`auth-container ${theme}`}>
      <div className="auth-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <div className="app-logo"><ChatBubbleIcon size={48} /></div>
          <h1>Welcome to AI Chat</h1>
          <p>Your intelligent conversation partner</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: theme === 'light' ? '#4f46e5' : '#7c3aed',
                  brandAccent: theme === 'light' ? '#4338ca' : '#6d28d9',
                }
              }
            }
          }}
          providers={[]}
          theme={theme}
        />

        <div className="theme-toggle-auth">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </div>
  );
}

AuthComponent.propTypes = {
  theme: PropTypes.string.isRequired,
  onToggleTheme: PropTypes.func.isRequired,
};