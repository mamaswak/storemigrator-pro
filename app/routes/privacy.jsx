export default function PrivacyPolicy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>StoreMigrator Pro — Privacy Policy</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; background: #fff; line-height: 1.7; }
          header { background: #008060; padding: 20px 0; }
          .inner { max-width: 760px; margin: 0 auto; padding: 0 24px; }
          header h1 { color: #fff; font-size: 1.4rem; font-weight: 600; }
          header p { color: rgba(255,255,255,0.85); font-size: 0.9rem; margin-top: 4px; }
          main { max-width: 760px; margin: 48px auto; padding: 0 24px 80px; }
          h2 { font-size: 1.15rem; font-weight: 600; margin: 36px 0 10px; color: #111; }
          p, li { font-size: 0.97rem; color: #333; margin-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          a { color: #008060; }
          .updated { font-size: 0.85rem; color: #777; margin-bottom: 32px; }
          footer { text-align: center; padding: 24px; font-size: 0.82rem; color: #999; border-top: 1px solid #eee; }
        `}</style>
      </head>
      <body>
        <header>
          <div className="inner">
            <h1>StoreMigrator Pro</h1>
            <p>Privacy Policy</p>
          </div>
        </header>

        <main>
          <p className="updated">Last updated: May 31, 2026</p>
          <p>StoreMigrator Pro ("we", "our", or "us") is a Shopify application that helps merchants migrate store data from other e-commerce platforms into Shopify. This Privacy Policy explains what data we collect, how we use it, and your rights.</p>

          <h2>1. Data We Collect</h2>
          <p>When you install and use StoreMigrator Pro, we collect:</p>
          <ul>
            <li><strong>Shop information</strong> — your Shopify store domain and plan status.</li>
            <li><strong>Migration data</strong> — the CSV or JSON files you upload (products, customers, orders, collections) for the purpose of importing them into your store.</li>
            <li><strong>Migration history</strong> — records of jobs you have run, including status, item counts, and audit logs.</li>
            <li><strong>Billing information</strong> — Shopify charge IDs for subscription management. We do not store payment card details.</li>
            <li><strong>Session tokens</strong> — short-lived tokens used to authenticate your Shopify admin session.</li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To import your data into your Shopify store on your behalf.</li>
            <li>To display your migration history and status within the app.</li>
            <li>To manage your subscription and billing.</li>
            <li>To provide customer support when you contact us.</li>
          </ul>
          <p>We do not sell, share, or rent your data to any third parties.</p>

          <h2>3. Data Retention</h2>
          <ul>
            <li>Uploaded file contents are stored temporarily while the migration job runs and cleared once complete.</li>
            <li>Migration job records and audit logs are retained for 90 days, then deleted.</li>
            <li>Shop and billing records are retained while the app is installed, and up to 30 days after uninstallation.</li>
          </ul>

          <h2>4. Shopify API Data Access</h2>
          <p>StoreMigrator Pro requests the following Shopify API permissions to perform migrations you initiate:</p>
          <ul>
            <li><strong>write_products</strong> — to create products in your store.</li>
            <li><strong>write_customers</strong> — to create customers in your store.</li>
            <li><strong>write_orders</strong> — to create draft orders in your store.</li>
            <li><strong>read_content / write_content</strong> — to support content migration.</li>
            <li><strong>read_themes</strong> — to detect your active theme during migration.</li>
          </ul>

          <h2>5. Data Security</h2>
          <p>We use encrypted connections (HTTPS/TLS) for all data in transit and encrypted storage for credentials. Access to our systems is restricted to authorised personnel only.</p>

          <h2>6. Third-Party Services</h2>
          <ul>
            <li><strong>Railway</strong> (railway.app) — application hosting.</li>
            <li><strong>Shopify</strong> — billing and authentication. Subject to Shopify's own privacy policy.</li>
          </ul>

          <h2>7. GDPR & CCPA Rights</h2>
          <p>You have the right to access, correct, delete, or export your personal data. To exercise these rights, contact us at <a href="mailto:support@storemigrator.app">support@storemigrator.app</a>. We respond within 30 days.</p>

          <h2>8. Data Deletion on Uninstall</h2>
          <p>When you uninstall StoreMigrator Pro, we automatically remove your session data. For full data deletion, email <a href="mailto:support@storemigrator.app">support@storemigrator.app</a>.</p>

          <h2>9. Children's Privacy</h2>
          <p>StoreMigrator Pro is intended for adults. We do not knowingly collect data from children under 16.</p>

          <h2>10. Changes</h2>
          <p>We may update this policy and will update the date above. Continued use constitutes acceptance.</p>

          <h2>11. Contact</h2>
          <ul>
            <li>Email: <a href="mailto:support@storemigrator.app">support@storemigrator.app</a></li>
          </ul>
        </main>

        <footer>
          &copy; 2026 StoreMigrator Pro. &nbsp;|&nbsp; <a href="/terms">Terms of Service</a>
        </footer>
      </body>
    </html>
  );
}
