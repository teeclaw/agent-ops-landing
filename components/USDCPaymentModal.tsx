"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useSignTypedData,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  USDC_ADDRESS,
  PRICE_USDC_BIGINT,
  PRICE_DISPLAY,
  PRICE_USDC_HUMAN,
  PRICE_USDC_UNITS,
  BASE_CHAIN_ID,
  ONCHAIN_INTERMEDIATE_ADDRESS,
  X402_VERSION,
} from "@/lib/constants";

const RECIPIENT = process.env.NEXT_PUBLIC_X402_WALLET as `0x${string}` | undefined;

// EIP-712 domain for USDC on Base (ERC-3009 TransferWithAuthorization)
const USDC_EIP712_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_ADDRESS,
} as const;

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

type PaymentStatus =
  | "initiating"
  | "ready"
  | "signing"
  | "verifying"
  | "confirmed"
  | "error";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: `0x${string}` | undefined;
}

/** Generate a random bytes32 nonce */
function randomNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

export default function USDCPaymentModal({
  isOpen,
  onClose,
  walletAddress,
}: Props) {
  const [status, setStatus] = useState<PaymentStatus>("initiating");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorType, setErrorType] = useState<
    | "wrong-chain"
    | "rejected"
    | "insufficient"
    | "verify-failed"
    | "generic"
  >("generic");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [facilitator, setFacilitator] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync, reset: resetSign } = useSignTypedData();
  const isWrongChain = chainId !== base.id;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus("initiating");
      setSessionId(null);
      setErrorMessage("");
      setErrorType("generic");
      setDownloadUrl("");
      setFacilitator("");
      setTxHash(null);
      resetSign();
      initiatePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initiatePayment = async () => {
    if (!RECIPIENT) {
      setStatus("error");
      setErrorMessage("Payment configuration error. Please contact support.");
      setErrorType("generic");
      return;
    }

    try {
      const response = await fetch("/api/payments/x402/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletAddress || null }),
      });

      const data = await response.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
        setStatus("ready");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to initiate payment session.");
        setErrorType("generic");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Payment initiation failed. Please try again.");
      setErrorType("generic");
    }
  };

  const handlePay = useCallback(async () => {
    if (!sessionId || !address) return;

    if (isWrongChain) {
      try {
        switchChain({ chainId: base.id });
      } catch {
        setStatus("error");
        setErrorMessage(
          "Failed to switch to Base network. Please switch manually in your wallet.",
        );
        setErrorType("wrong-chain");
      }
      return;
    }

    if (!RECIPIENT) {
      setStatus("error");
      setErrorMessage("Payment configuration error. Please contact support.");
      setErrorType("generic");
      return;
    }

    setStatus("signing");
    setErrorMessage("");

    try {
      // Build TransferWithAuthorization parameters (matches @x402/evm exact)
      const now = Math.floor(Date.now() / 1000);
      const validAfterNum = now - 600; // 10 min grace (matches x402 SDK)
      const validBeforeNum = now + 600; // 10 min timeout
      const nonce = randomNonce();

      // Sign EIP-712 TransferWithAuthorization
      // onchain.fi requires `to` = their intermediate address (validates before routing to facilitators)
      const signature = await signTypedDataAsync({
        domain: USDC_EIP712_DOMAIN,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization",
        message: {
          from: address,
          to: ONCHAIN_INTERMEDIATE_ADDRESS,
          value: PRICE_USDC_BIGINT,
          validAfter: BigInt(validAfterNum),
          validBefore: BigInt(validBeforeNum),
          nonce,
        },
      });

      // Build x402 V1 payment header — onchain.fi facilitators use V1 format
      // V1: { x402Version, scheme, network, payload } (no `accepted` wrapper)
      const paymentPayload = {
        x402Version: X402_VERSION,
        scheme: "exact",
        network: "base",
        payload: {
          signature,
          authorization: {
            from: address,
            to: ONCHAIN_INTERMEDIATE_ADDRESS,
            value: PRICE_USDC_UNITS,
            validAfter: String(validAfterNum),
            validBefore: String(validBeforeNum),
            nonce,
          },
        },
      };

      // Base64-encode the payment header
      const paymentHeader = btoa(JSON.stringify(paymentPayload));

      // Send to server for settlement via onchain.fi
      await verifyPayment(paymentHeader);
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; name?: string };
      const message = error?.shortMessage || "";

      if (
        message.includes("User rejected") ||
        error?.name === "UserRejectedRequestError"
      ) {
        setStatus("error");
        setErrorMessage("Signature request cancelled. You can try again when ready.");
        setErrorType("rejected");
      } else if (
        message.includes("insufficient") ||
        message.includes("exceeds balance")
      ) {
        setStatus("error");
        setErrorMessage(
          `Insufficient USDC balance. You need at least ${PRICE_USDC_HUMAN} USDC on Base.`,
        );
        setErrorType("insufficient");
      } else {
        setStatus("error");
        setErrorMessage(message || "Signing failed. Please try again.");
        setErrorType("generic");
      }
    }
  }, [sessionId, address, isWrongChain, switchChain, signTypedDataAsync]);

  const verifyPayment = async (paymentHeader: string) => {
    setStatus("verifying");

    try {
      const response = await fetch("/api/payments/x402/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, paymentHeader }),
      });

      const data = await response.json();

      if (data.verified && data.downloadUrl) {
        setStatus("confirmed");
        setDownloadUrl(data.downloadUrl);
        setFacilitator(data.facilitator || "");
        setTxHash(data.txHash || null);
      } else {
        setStatus("error");
        setErrorMessage(
          data.error || "Payment settlement failed. Please contact support.",
        );
        setErrorType("verify-failed");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Settlement request failed. Please try again.");
      setErrorType("verify-failed");
    }
  };

  const handleRetry = () => {
    if (errorType === "verify-failed") {
      // Full restart since we need a new signature
      resetSign();
      setStatus("initiating");
      initiatePayment();
    } else {
      // rejected, insufficient, generic — go back to ready
      setStatus("ready");
      setErrorMessage("");
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.location.href = downloadUrl;
      setTimeout(() => onClose(), 1000);
    }
  };

  if (!isOpen) return null;

  const truncatedHash = txHash
    ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
    : "";

  const retryLabel =
    errorType === "verify-failed"
      ? "Start Over"
      : errorType === "wrong-chain"
        ? "Switch to Base"
        : "Try Again";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-8 relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="font-display text-2xl mb-8 text-gray-900">
          Pay with USDC
        </h2>

        {/* Initiating */}
        {status === "initiating" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Spinner />
            <p className="text-sm text-gray-400">Preparing payment...</p>
          </div>
        )}

        {/* Ready */}
        {status === "ready" && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Amount</label>
              <p className="text-2xl font-display text-gray-900">{PRICE_USDC_HUMAN} USDC</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Network
              </label>
              <span className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded">
                Base
              </span>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-700">
                Gasless payment — you only sign a message, no transaction fees.
              </p>
            </div>

            {isWrongChain && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                <p className="text-xs text-amber-700">
                  You&apos;re connected to the wrong network. Please switch to
                  Base to continue.
                </p>
              </div>
            )}

            <button
              onClick={handlePay}
              className="w-full bg-[#d4a853] hover:bg-[#c49a42] text-white font-medium py-3 px-6 rounded-lg transition-colors text-sm"
            >
              {isWrongChain ? "Switch to Base" : `Pay ${PRICE_DISPLAY} USDC`}
            </button>
          </div>
        )}

        {/* Signing */}
        {status === "signing" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Spinner />
            <p className="text-sm text-gray-400">
              Waiting for signature...
            </p>
            <p className="text-xs text-gray-300">
              Sign the message in your wallet (no gas required)
            </p>
          </div>
        )}

        {/* Verifying — onchain.fi is settling */}
        {status === "verifying" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Spinner />
            <p className="text-sm text-gray-400">
              Settling payment on-chain...
            </p>
            <p className="text-xs text-gray-300">
              This usually takes a few seconds
            </p>
          </div>
        )}

        {/* Confirmed */}
        {status === "confirmed" && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-100 rounded-lg p-5 text-center">
              <p className="text-green-600 font-medium mb-1">
                Payment Confirmed
              </p>
              {facilitator && (
                <p className="text-xs text-gray-400">
                  Settled by: {facilitator}
                </p>
              )}
              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#d4a853] hover:text-[#c49a42] mt-2 inline-block"
                >
                  {truncatedHash} ↗
                </a>
              )}
            </div>
            <button
              onClick={handleDownload}
              className="w-full bg-[#d4a853] hover:bg-[#c49a42] text-white font-medium py-3 px-6 rounded-lg transition-colors text-sm"
            >
              Download Your Manual
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <p className="text-red-500 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={handleRetry}
              className="w-full bg-[#d4a853] hover:bg-[#c49a42] text-white font-medium py-3 px-6 rounded-lg transition-colors text-sm"
            >
              {retryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6 text-[#d4a853]" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
