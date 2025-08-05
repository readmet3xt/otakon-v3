
import React from 'react';

const ScreenshotIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="10.5" cy="10.5" r="4.5" />
    <line x1="14" y1="14" x2="18" y2="18" />
  </svg>
);

export default ScreenshotIcon;