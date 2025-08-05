import React, { useState } from 'react';
import { ConnectionStatus } from '../types';

interface ConnectionModalProps {
  onClose: () => void;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  status: ConnectionStatus;
  error: string | null;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  onClose,
  onConnect,
  onDisconnect,
  status,
  error,
}) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(code);
  };
  
  const isConnecting = status === ConnectionStatus.CONNECTING;
  const isConnected = status === ConnectionStatus.CONNECTED;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md m-4 relative"
        onClick={(e) => e.stopPropagation()}
    >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-2">Connect to Your PC</h2>
        <p className="text-slate-400 mb-6">Enter the 4-digit code from the Otakon desktop app to sync screenshots.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="connection-code" className="block text-sm font-medium text-slate-300 mb-1">
              4-Digit Connection Code
            </label>
            <input
              id="connection-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1234"
              maxLength={4}
              pattern="\d{4}"
              title="Enter exactly 4 digits"
              disabled={isConnecting || isConnected}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
          </div>
          
          {error && <p className="text-red-400 text-sm animate-fade-in">{error}</p>}
          {isConnected && <p className="text-green-400 text-sm animate-fade-in">Connected successfully. Ready to receive screenshots.</p>}

          <div className="flex flex-col sm:flex-row items-center pt-4 gap-3">
            {isConnected ? (
                <button
                    type="button"
                    onClick={onDisconnect}
                    className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors"
                >
                    Disconnect
                </button>
            ) : (
                <button
                    type="submit"
                    disabled={isConnecting || !/^\d{4}$/.test(code)}
                    className="w-full flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-md transition-all duration-200"
                >
                {isConnecting ? (
                    <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Connecting...
                    </>
                ) : (
                    'Connect'
                )}
                </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionModal;