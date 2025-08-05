import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-baseline space-x-1.5 px-2 py-1">
      <span className="typing-dot"></span>
      <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
      <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
    </div>
  );
};

export default TypingIndicator;