# Privacy Policy for StoreMigrator Pro

**Last Updated:** April 17, 2026

This Privacy Policy describes how StoreMigrator Pro ("we", "our", "us", "the App") collects, uses, and protects information when you install and use our Shopify application.

---

## 1. Information We Collect

### 1.1 Shop Information
When you install StoreMigrator Pro on your Shopify store, we receive and store:
- Your shop's `.myshopify.com` domain
- Your shop's ID and basic metadata
- OAuth access tokens required for API access
- Installation and uninstallation timestamps
- Plan type (Free or Pro) and billing status

### 1.2 Migration Data (Processed In-Memory Only)
When you use the App to migrate data, you upload files containing:
- Product data (titles, descriptions, prices, SKUs, images)
- Customer data (names, emails, phone numbers, addresses)
- Order data (order numbers, line items, totals, statuses)
- Collection and metafield data

**These files are processed in-memory during the migration and are not persisted to our database.** Only migration job metadata (status, item counts, timestamps, error logs) is retained.

### 1.3 Technical Data
- IP addresses (for security and fraud prevention, retained 30 days)
- Browser user-agent strings (for debugging)
- Request timestamps and error logs

---

## 2. How We Use Information

We use the information we collect to:
- Provide and operate the App's migration functionality
- Authenticate your Shopify account via OAuth
- Process billing (via Shopify's Billing API — we never see your payment details)
- Communicate with you about service updates, support requests, and security alerts
- Improve our service and troubleshoot errors
- Comply with legal obligations

---

## 3. Information Sharing

We **do not sell, rent, or trade** your data. We share information only with:

- **Shopify:** To perform API operations on your behalf (required for the app to function)
- **Railway (our hosting provider):** For application hosting and database storage
- **Service providers:** Limited to email delivery (for support responses) and error monitoring
- **Legal compliance:** If required by law, court order, or government authority

We never share your shop data, product catalog, or customer information with third parties for marketing purposes.

---

## 4. Data Retention

- **Shop records:** Retained while the App is installed, plus 30 days after uninstallation (for billing reconciliation)
- **Migration jobs and logs:** Retained for 90 days for troubleshooting, then deleted
- **Uploaded migration files:** Processed in-memory only — never persisted
- **Session data:** Deleted automatically when the App is uninstalled
- **GDPR redaction requests:** All data deleted within 48 hours of receiving a `shop/redact` webhook

---

## 5. Your Rights (GDPR, CCPA, and Similar Laws)

You have the right to:
- **Access** the data we hold about your shop
- **Correct** inaccurate data
- **Delete** your data (uninstalling the App triggers automatic deletion within 48 hours)
- **Port** your data in a machine-readable format
- **Object** to certain types of processing

To exercise any of these rights, contact us at **privacy@storemigrator.app**. We will respond within 30 days.

**Shopify GDPR compliance webhooks we implement:**
- `customers/data_request` — returns what data we hold (typically none, as we don't store customer PII)
- `customers/redact` — deletes any customer data on request
- `shop/redact` — deletes all shop data within 48 hours of uninstall

---

## 6. Data Security

We protect your data using:
- **HTTPS encryption** for all data in transit
- **Encrypted database storage** for data at rest
- **OAuth 2.0** for secure Shopify authentication — we never store your Shopify password
- **Principle of least privilege** — we request only the scopes required for the App to function
- **Regular security updates** and dependency patching
- **Access controls** limiting who on our team can access production data

No system is 100% secure, but we take reasonable steps to protect your data.

---

## 7. Children's Privacy

The App is intended for business use only. We do not knowingly collect information from children under 16.

---

## 8. International Data Transfers

If you are located outside the country where our servers are hosted, your data may be transferred internationally. We ensure adequate protections through standard contractual clauses and comply with applicable data transfer regulations.

---

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes via email or an in-app notice. The "Last Updated" date at the top reflects the most recent revision.

---

## 10. Contact Us

If you have questions about this Privacy Policy or our data practices, contact us:

- **Email:** privacy@storemigrator.app
- **Support:** support@storemigrator.app
- **Website:** https://storemigrator.app

---

## Requested Shopify Scopes and Why We Need Them

| Scope | Purpose |
|-------|---------|
| `write_products` | Create imported products in your catalog |
| `write_customers` | Create imported customer records |
| `write_orders` | Create imported historical orders |
| `read_content` | Read existing pages and blog posts to prevent duplicates |
| `write_content` | Import pages and blog posts (Pro feature) |
| `read_themes` | Detect theme for redirect generation (Pro feature) |

We request only the minimum scopes necessary to provide the App's functionality.
