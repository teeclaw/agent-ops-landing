"use client";

import { useState } from "react";

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

type Status = "idle" | "loading" | "success" | "error";

export default function TxRecoveryForm() {
  const [expanded, setExpanded] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = txHash.trim();

    if (!TX_HASH_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage(
        "Invalid format. Transaction hash must start with 0x followed by 64 hex characters.",
      );
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/payments/x402/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: trimmed }),
      });

      const data = await res.json();

      if (data.success && data.downloadUrl) {
        setStatus("success");
        setDownloadUrl(data.downloadUrl);
      } else {
        setStatus("error");
        setErrorMessage(
          data.error || "Could not verify this transaction. Please check the hash and try again.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("Request failed. Please try again.");
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-4"
      >
        Already paid? Recover your download
      </button>
    );
  }

  return (
    <div className="mt-6 w-full max-w-sm">
      {status === "success" ? (
        <div className="bg-green-50 border border-green-100 rounded-lg p-5">
          <p className="text-green-600 font-medium text-sm mb-3">
            Payment verified successfully
          </p>
          <a
            href={downloadUrl}
            className="inline-block w-full text-center py-3 bg-[#d4a853] hover:bg-[#c49a42] text-white rounded-lg font-medium text-sm transition-colors"
          >
            Download Your Manual
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs text-gray-400 mb-1">
            Paste your transaction hash
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => {
              setTxHash(e.target.value);
              if (status === "error") {
                setStatus("idle");
                setErrorMessage("");
              }
            }}
            placeholder="0x..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
            disabled={status === "loading"}
          />

          {status === "error" && errorMessage && (
            <p className="text-xs text-red-500">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading" || !txHash.trim()}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? "Verifying..." : "Recover Download"}
          </button>

          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setTxHash("");
              setStatus("idle");
              setErrorMessage("");
            }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
