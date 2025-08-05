import React from 'react';

const UserAvatar: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="User Avatar"
    >
        <circle cx="12" cy="12" r="12" />
    </svg>
);

export default UserAvatar;
