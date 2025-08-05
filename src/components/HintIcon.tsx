
import React from 'react';

const HintIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 14a6 6 0 0 1-6-6 6 6 0 0 1 6-6 6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.19V14Z" />
  </svg>
);

export default HintIcon;