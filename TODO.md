# TODO: Agent Operations Manual Landing Page

## Completed

### Landing Page
- [x] Landing page UI (minimalist elegant, Playfair Display + Inter)
- [x] Mobile responsive navbar with hamburger menu
- [x] GSAP scroll animations
- [x] RainbowKit wallet connect (lightTheme)
- [x] Favicon + app icons + manifest.json

### Payment Infrastructure
- [x] x402 payment initiate API route
- [x] x402 payment verify API route (via onchain.fi)
- [x] x402 payment recover API route (tx hash lookup)
- [x] Gumroad webhook handler
- [x] USDC payment modal (chain switching, tx states, error handling)
- [x] Tx recovery form (paste tx hash to recover download)

### Download Infrastructure
- [x] Signed download URLs (HMAC-SHA256, 24h expiry)
- [x] PDF serving endpoint with token verification
- [x] Timing-safe signature comparison

### Email Delivery
- [x] Resend integration (replaced SendGrid plan)
- [x] Branded HTML email template
- [x] Email delivery on Gumroad purchase
- [ ] Email delivery on x402 payment (no email collected in USDC flow)

### Purchase Tracking
- [x] Upstash Redis for payment storage (30-day TTL)
- [x] Payment records for both x402 and Gumroad sources
- [x] Purchase lookup by tx hash (recover endpoint)

### Deployment
- [x] Vercel project setup
- [x] Environment variables configured
- [x] Custom domain (agent18608.xyz)
- [x] DNS + SSL (automatic via Vercel)
- [x] Production build passing

### AI Agent Discovery
- [x] `public/skill.md` — machine-readable x402 purchase flow for AI agents
- [x] AI agent callout in Pricing section (with copy button)

### Code Quality (March 2026 cleanup)
- [x] Extract shared constants (`lib/constants.ts`)
- [x] Fix metadata: "18-chapter" corrected to "9-chapter"
- [x] Add `metadataBase` to layout.tsx
- [x] Add `og:image` + `twitter:images` to metadata
- [x] Add `.env.example` documenting all env vars
- [x] Fix `manifest.json` (added `start_url`, `description`)
- [x] Fix fail-fast: Redis throws on missing credentials
- [x] Fix fail-fast: WalletConnect logs error on missing project ID
- [x] Remove dead code: `buildPaymentRequirements()`, unused `amountInUnits`
- [x] Remove dead code: individual param path in download route
- [x] Fix `extra.version` mismatch (unified to `X402_VERSION = '1'`)
- [x] Type `paymentProof` properly (was `any`)
- [x] Delete leftover files: `page-premium-draft.tsx`, `page.tsx.backup`

---

## Pending

### Assets Needed
- [ ] Create `public/og-image.png` (1200x630) for social previews
- [x] Verify `public/cover.png` exists (referenced in pricing section)

### Mobile Layout Fixes
- [ ] Pricing buttons not centered on mobile (`max-w-sm` needs `mx-auto md:mx-0`)
- [ ] Comparison table cramped on mobile (reduce cell `pr-8` to `pr-4 md:pr-8`)
- [ ] Hamburger touch target too small (`p-2` → `p-3` for 44px minimum)
- [ ] Section vertical spacing too generous on mobile (`py-32` → `py-16 md:py-32`)
- [ ] Price text oversized on mobile (`text-6xl` → `text-5xl md:text-6xl`)
- [ ] Chapter grid gap too large on mobile (`gap-y-16` → `gap-y-10 md:gap-y-16`)

### QA
- [ ] Run Lighthouse audit (target: 95+)
- [ ] Test on real mobile devices
- [ ] Test accessibility (screen reader, keyboard nav)
- [ ] Verify all external links work
- [ ] Test in different browsers (Chrome, Firefox, Safari)
- [ ] Spell check all copy

### Payment Testing
- [ ] End-to-end test: Gumroad purchase flow
- [x] End-to-end test: x402 USDC payment flow
- [ ] Test download URL expiration (24h)
- [ ] Test tx hash recovery flow

### Analytics
- [ ] Add analytics (Plausible or similar)
- [ ] Track payment method selection
- [ ] Track downloads
- [ ] Track conversion rate

### Security Hardening
- [ ] Sanitize user-supplied values in email HTML template (XSS prevention)
- [ ] Reduce Gumroad webhook logging (currently logs buyer email)
- [ ] Consider download-per-token rate limiting

---

## Nice-to-Have (Post-Launch)

- [ ] Add Playwright e2e tests
- [ ] Set up error monitoring (Sentry)
- [ ] Collect email in USDC flow for download link delivery
- [ ] Add refund request form
- [ ] Add purchase lookup by email
- [ ] Add testimonials section
- [ ] Add social proof (purchase counter)
- [ ] Add discount codes
- [ ] Add affiliate tracking
- [ ] Create admin dashboard
- [ ] Add webhook retry logic
- [ ] Add purchase receipts
- [ ] Add license key generation (for HTML version)
- [ ] Extract business logic from API routes into use-case layer (per CLAUDE.md architecture)

---

## Dependencies

- **From TeeDesign:** ✅ PDF file (`agent-ops-manual-v1.0.0.pdf`)
- **From TeeWriter:** ✅ Final landing page copy
- **From Owner (0xd):**
  - ✅ Domain: agent18608.xyz
  - ✅ Gumroad product setup + credentials
  - ✅ Email service credentials (Resend)
  - ✅ DNS configuration (Vercel + Resend)
  - ✅ Payment wallet confirmation
