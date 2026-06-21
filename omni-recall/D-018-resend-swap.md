# D-018 — Email Provider: SendGrid → Resend

Date: 2026-06-21
PR: (this PR number)

## Decision

Swapped SendGrid for Resend as the sole outbound email provider. Reason: SendGrid free tier is a 60-day trial only; Resend offers 3,000 emails/month permanently.

## Changes

- Package: @sendgrid/mail removed, resend installed
- Adapter: SendGridOutboundAdapter → ResendOutboundAdapter
- Env var: SENDGRID_API_KEY → RESEND_API_KEY
- OUTBOUND_EMAIL_FROM: unchanged (disputes@playmoney.icu)
- assertLiveAllowed() guard: preserved on all sends

## Ops actions required (manual, not code)

1. Add RESEND_API_KEY to GitHub Actions secrets
2. Remove SENDGRID_API_KEY from GitHub Actions secrets
3. Verify playmoney.icu domain in Resend dashboard
4. Add RESEND_API_KEY to production hosting env
