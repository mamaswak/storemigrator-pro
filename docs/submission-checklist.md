# Shopify App Store Submission Checklist

Follow this checklist before submitting StoreMigrator Pro for review. Shopify reviewers check every one of these — missing items = instant rejection.

---

## Phase 1: Technical Setup

### Code & Deployment
- [ ] Code pushed to GitHub (private repo is fine)
- [ ] Railway deployment successful and running
- [ ] PostgreSQL database provisioned on Railway
- [ ] All environment variables set in Railway (see `.env.example`)
- [ ] Public Railway domain generated (e.g., `storemigrator-pro.up.railway.app`)
- [ ] App loads at the public URL without errors
- [ ] HTTPS working (Railway provides automatically)

### Shopify Partner Dashboard
- [ ] App created in Partner Dashboard
- [ ] `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` copied to Railway env vars
- [ ] App URL set to Railway public domain
- [ ] Allowed redirection URLs configured (3 entries)
- [ ] `shopify app deploy` run successfully to push config
- [ ] GDPR webhook URLs visible in Partner Dashboard

---

## Phase 2: Functionality Testing

Test everything on a **development store** before submission.

### Install Flow
- [ ] App installs cleanly via OAuth (no errors)
- [ ] Redirects to dashboard after install
- [ ] Shop record created in database
- [ ] Default plan type is "free"

### Core Features
- [ ] Dashboard loads with correct stats
- [ ] "New Migration" wizard works end-to-end
- [ ] File upload accepts CSV, JSON, XML
- [ ] Free plan limit (50 items) triggers upgrade prompt correctly
- [ ] Migration job detail page shows progress
- [ ] History page lists all migrations
- [ ] Empty states render correctly

### Billing Flow
- [ ] Billing page loads
- [ ] "Upgrade to Pro" button creates a one-time charge
- [ ] Redirects to Shopify's charge confirmation screen
- [ ] After approval, callback upgrades shop to Pro
- [ ] Pro features unlocked after upgrade
- [ ] Test mode works (charges don't post in development)

### Webhooks
- [ ] `app/uninstalled` — uninstall from dev store, verify sessions cleared
- [ ] `app/scopes_update` — fires when scopes change
- [ ] `customers/data_request` — returns 200 with empty response
- [ ] `customers/redact` — returns 200 (no PII stored)
- [ ] `shop/redact` — 48 hours after uninstall, verify all shop data deleted

### Uninstall Flow
- [ ] Uninstalling the app deletes sessions
- [ ] Shop marked as uninstalled in DB
- [ ] No errors in logs after uninstall

---

## Phase 3: Listing Assets

### Required Assets (from `/screenshots` folder)
- [ ] App icon: 1200×1200 px PNG (transparent or white background)
- [ ] Feature banner: 1600×900 px PNG
- [ ] Screenshot 1: Dashboard view (1600×900 px)
- [ ] Screenshot 2: Migration wizard (1600×900 px)
- [ ] Screenshot 3: Job detail / progress (1600×900 px)
- [ ] Screenshot 4: Billing page (1600×900 px)
- [ ] Screenshot 5: History page (1600×900 px)

### Listing Content (from `/docs/app-listing.md`)
- [ ] App name entered
- [ ] Tagline entered (under 100 chars)
- [ ] Short description entered (under 500 chars)
- [ ] Full description entered
- [ ] 3 key benefits entered
- [ ] Feature bullets entered
- [ ] Search keywords entered
- [ ] Primary and secondary categories selected
- [ ] Support email: support@storemigrator.app
- [ ] Support URL: https://docs.storemigrator.app
- [ ] Privacy policy URL hosted publicly (paste content of `/docs/privacy-policy.md`)
- [ ] Review notes for Shopify reviewers filled in

### Pricing Setup
- [ ] Free plan configured ($0/month, 50-item limits)
- [ ] Pro plan configured ($499 one-time)
- [ ] Pricing description accurate in listing

---

## Phase 4: Compliance & Policy

- [ ] Privacy policy hosted at public URL
- [ ] Privacy policy explains GDPR compliance
- [ ] Privacy policy mentions all requested scopes
- [ ] Support email works (send a test message)
- [ ] Terms of service page exists (optional but recommended)
- [ ] Refund policy stated clearly (30-day refund mentioned in listing)

---

## Phase 5: Review Readiness

### Common Rejection Reasons (avoid these)
- [ ] **No fake data in screenshots** — use real-looking test data only
- [ ] **Screenshots match actual app** — no photoshopped features
- [ ] **No "Lorem Ipsum"** anywhere in the listing
- [ ] **Pricing in listing matches pricing in code** ($499 one-time in both)
- [ ] **Scopes requested match what the app actually uses** — no over-requesting
- [ ] **GDPR webhooks return 200 OK** — test each webhook URL with a POST request
- [ ] **App doesn't crash on edge cases** — empty states, large files, invalid input
- [ ] **Polaris used consistently** — don't mix with custom UI that breaks Shopify conventions
- [ ] **App Bridge used for navigation** — don't use raw `<a>` tags in embedded context
- [ ] **Loading states everywhere** — never leave the user staring at a blank screen
- [ ] **Error states everywhere** — show readable error messages, not raw stack traces

---

## Phase 6: Final Submission

- [ ] All previous items checked
- [ ] Submitted a test message to support@storemigrator.app and got a reply
- [ ] Done one final end-to-end test on a fresh dev store
- [ ] Clicked "Submit for review" in Partner Dashboard
- [ ] Saved submission confirmation email

---

## After Submission

- **Expected review time:** 5–10 business days
- **Check status:** Partner Dashboard → Apps → Distribution → Review status
- **If rejected:** Shopify provides specific reasons. Fix and resubmit — no penalty for multiple submissions.
- **Common reviewer requests:**
  - "Add more detail to screenshot captions"
  - "Explain why you request [scope]"
  - "Show the billing flow in a screenshot"
  - "Your privacy policy is missing a section on data retention"

---

## Tips to Get Approved First Try

1. **Be conservative with scopes.** Asking for `write_*` is scrutinized more than `read_*`. Only ask for what you need.
2. **Show the free tier clearly in screenshots.** Reviewers like to see the "try before you buy" path.
3. **Make billing transparent.** Mention "$499 one-time" in the listing, the app UI, and the review notes.
4. **Respond fast if the reviewer messages you.** Quick, professional responses = faster approval.
5. **Don't over-promise in the listing.** If you claim "140+ platforms," make sure the app literally lists them.
6. **Test on a clean dev store.** Reviewers use fresh stores — bugs that only appear on fresh installs will fail the review.

---

Good luck with your submission!
