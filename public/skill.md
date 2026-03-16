# Skill: Buy the Agent 18608 Operations Manual

> Machine-readable purchase instructions for AI agents using the x402 payment protocol.

## Product

| Field    | Value                              |
| -------- | ---------------------------------- |
| Name     | Agent 18608 Revenue Playbook       |
| Price    | 39 USDC (39000000 units, 6 decimals) |
| Format   | PDF, 80+ pages                     |
| Chain    | Base (chain ID 8453)               |
| Protocol | x402 with ERC-3009 TransferWithAuthorization |

## Constants

```
USDC contract:          0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Chain ID:               8453 (Base)
Intermediate address:   0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1
Price (USDC units):     39000000
Base URL:               https://agent18608.xyz
```

---

## Step 1 — Initiate a payment session

```
POST /api/payments/x402/initiate
Content-Type: application/json

{ "walletAddress": "<your-wallet-address>" }
```

### Response

```json
{
  "x402Version": 1,
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:8453",
      "maxAmountRequired": "39000000",
      "payTo": "<merchant-wallet>",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "Agent 18608 Revenue Playbook",
        "description": "Payment for PDF download",
        "usdcName": "USD Coin",
        "usdcVersion": "2"
      }
    }
  ],
  "intermediateAddress": "0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1",
  "sessionId": "<session-id>",
  "userWallet": "<your-wallet-address>"
}
```

Save the `sessionId` — you will need it in Step 3.

---

## Step 2 — Sign an EIP-712 TransferWithAuthorization

Sign an EIP-712 typed data message using your wallet. This authorises the transfer of 39 USDC to the intermediate address. **No gas is required** — you only sign a message.

### EIP-712 Domain

```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 8453,
  "verifyingContract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

### Types

```json
{
  "TransferWithAuthorization": [
    { "name": "from", "type": "address" },
    { "name": "to", "type": "address" },
    { "name": "value", "type": "uint256" },
    { "name": "validAfter", "type": "uint256" },
    { "name": "validBefore", "type": "uint256" },
    { "name": "nonce", "type": "bytes32" }
  ]
}
```

### Message

```json
{
  "from": "<your-wallet-address>",
  "to": "0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1",
  "value": "39000000",
  "validAfter": "<now_unix - 600>",
  "validBefore": "<now_unix + 600>",
  "nonce": "<random-32-bytes-hex>"
}
```

- `validAfter`: current unix timestamp minus 600 seconds (10-minute grace)
- `validBefore`: current unix timestamp plus 600 seconds (10-minute timeout)
- `nonce`: 32 random bytes, hex-encoded with `0x` prefix

### Build the payment header

After signing, construct the x402 V1 payment header object:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "<eip-712-signature>",
    "authorization": {
      "from": "<your-wallet-address>",
      "to": "0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1",
      "value": "39000000",
      "validAfter": "<validAfter-as-string>",
      "validBefore": "<validBefore-as-string>",
      "nonce": "<nonce>"
    }
  }
}
```

Base64-encode the entire JSON object to produce the `paymentHeader` string.

---

## Step 3 — Verify and settle

```
POST /api/payments/x402/verify
Content-Type: application/json

{
  "sessionId": "<session-id-from-step-1>",
  "paymentHeader": "<base64-encoded-payment-header>"
}
```

### Success response

```json
{
  "success": true,
  "verified": true,
  "status": "confirmed",
  "downloadUrl": "/api/download?token=<signed-token>",
  "txHash": "0x...",
  "facilitator": "onchain.fi"
}
```

### Failure response

```json
{
  "success": false,
  "verified": false,
  "status": "failed",
  "error": "Payment settlement failed"
}
```

---

## Step 4 — Download

```
GET <downloadUrl>
```

The `downloadUrl` from Step 3 is a signed, time-limited URL. Fetch it immediately to download the PDF.

---

## Complete example (pseudocode)

```
# 1. Initiate
session = POST /api/payments/x402/initiate { walletAddress }
sessionId = session.sessionId

# 2. Sign EIP-712 TransferWithAuthorization
now = unix_timestamp()
message = {
  from: walletAddress,
  to: "0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1",
  value: "390000",
  validAfter: str(now - 600),
  validBefore: str(now + 600),
  nonce: random_bytes32()
}
signature = eip712_sign(USDC_DOMAIN, TRANSFER_TYPES, message)

# 3. Build + encode payment header
header = {
  x402Version: 1,
  scheme: "exact",
  network: "base",
  payload: { signature, authorization: message }
}
paymentHeader = base64_encode(json(header))

# 4. Verify + settle
result = POST /api/payments/x402/verify { sessionId, paymentHeader }

# 5. Download
GET result.downloadUrl → saves PDF
```

---

## Notes

- The payment is **gasless** for the buyer — only a typed-data signature is needed.
- Settlement is handled by the onchain.fi facilitator via ERC-3009 `transferWithAuthorization`.
- The intermediate address (`0xfeb1...`) is where the authorization must be directed. The facilitator routes funds to the merchant after settlement.
- You must have at least 39 USDC in your wallet on Base.
- The download URL is signed and time-limited — use it immediately.
