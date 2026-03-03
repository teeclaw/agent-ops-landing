'use client';

import { useState, useEffect } from 'react';

interface PaymentData {
  sessionId: string;
  amount: string;
  recipient: string;
  network: string;
  expiresAt: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentData | null;
}

export default function USDCPaymentModal({ isOpen, onClose, paymentData }: Props) {
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<'input' | 'verifying' | 'confirmed' | 'error'>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen && paymentData) {
      setTxHash('');
      setStatus('input');
      setErrorMessage('');
      setDownloadUrl('');
      setCopied(false);
    }
  }, [isOpen, paymentData]);

  if (!isOpen || !paymentData) return null;

  const { recipient, amount, sessionId } = paymentData;
  
  // Format amount (convert from wei to human readable)
  const usdcAmount = (parseInt(amount) / 1_000_000).toFixed(2);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(recipient);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleVerifyPayment = async () => {
    if (!txHash) {
      setErrorMessage('Please enter a transaction hash');
      return;
    }

    setStatus('verifying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/payments/x402/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          txHash: txHash.trim()
        }),
      });

      const data = await response.json();

      if (data.verified && data.downloadUrl) {
        setStatus('confirmed');
        setDownloadUrl(data.downloadUrl);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Payment verification failed. Please check your transaction hash.');
      }

    } catch (error) {
      setStatus('error');
      setErrorMessage('Verification failed. Please try again.');
      console.error('Verification error:', error);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.location.href = downloadUrl;
      setTimeout(() => onClose(), 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-6 text-white">Pay with USDC</h2>

        {status === 'confirmed' ? (
          // Success state
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-green-500 text-4xl mb-2">✓</div>
              <p className="text-green-400 font-medium">Payment Confirmed!</p>
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Download Your Playbook
            </button>
          </div>
        ) : (
          // Payment instructions
          <div className="space-y-6">
            {/* Amount */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Amount</label>
              <div className="text-3xl font-bold text-white">{usdcAmount} USDC</div>
            </div>

            {/* Network */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Network</label>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 inline-block">
                <span className="text-blue-400 font-medium">Base</span>
              </div>
            </div>

            {/* Recipient Address */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Send to</label>
              <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between gap-2">
                <code className="text-xs text-zinc-300 break-all flex-1">{recipient}</code>
                <button
                  onClick={handleCopyAddress}
                  className="text-zinc-400 hover:text-white transition-colors shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <span className="text-green-400 text-xs">✓</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">
                <strong>Important:</strong> Send exactly {usdcAmount} USDC on Base network. After sending, paste your transaction hash below.
              </p>
            </div>

            {/* Transaction Hash Input */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Transaction Hash</label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={status === 'verifying'}
              />
            </div>

            {/* Error Message */}
            {status === 'error' && errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                {errorMessage}
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerifyPayment}
              disabled={status === 'verifying' || !txHash}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              {status === 'verifying' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Payment'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
