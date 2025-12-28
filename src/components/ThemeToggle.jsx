import PropTypes from 'prop-types';
import { MoonIcon, SunIcon } from './Icons';
import './ThemeToggle.css';

function ThemeToggle({ theme, onToggle }) {
    return (
        <button className="theme-toggle" onClick={onToggle} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
        </button>
    );
}

ThemeToggle.propTypes = {
    theme: PropTypes.string.isRequired,
    onToggle: PropTypes.func.isRequired,
};

export default ThemeToggle;
