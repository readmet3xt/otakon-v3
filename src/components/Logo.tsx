
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className || 'w-24 h-24'} // Default size for splash screen, now square.
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Otakon Logo"
    >
        <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818CF8" /> {/* indigo-400 */}
                <stop offset="100%" stopColor="#C084FC" /> {/* purple-400 */}
            </linearGradient>
        </defs>
        {/* Circle */}
        <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="url(#logo-gradient)" 
            strokeWidth="2" 
        />
    </svg>
);

export default Logo;
