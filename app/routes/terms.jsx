export default function TermsOfService() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>StoreMigrator Pro — Terms of Service</title>
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
            <p>Terms of Service</p>
          </div>
        </header>

        <main>
          <p className="updated">Last updated: May 31, 2026</p>
          <p>By installing or using StoreMigrator Pro (the "App"), you agree to these Terms of Service.</p>

          <h2>1. Description of Service</h2>
          <p>StoreMigrator Pro is a Shopify application that allows merchants to migrate product, customer, order, and collection data from third-party e-commerce platforms into their Shopify store.</p>

          <h2>2. Eligibility</h2>
          <p>You must have an active Shopify store and be authorised to install apps on that store. By using the App, you confirm you have all necessary rights to migrate the data you upload.</p>

          <h2>3. Your Data & Responsibility</h2>
          <ul>
            <li>You are solely responsible for the accuracy and legality of the data you upload and migrate.</li>
            <li>You must ensure you have the right to migrate customer data, including any consents required by GDPR, CCPA, or other applicable laws.</li>
            <li>We are not responsible for data loss, duplication, or errors from incorrectly formatted source files.</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to use the App to:</p>
          <ul>
            <li>Migrate data you do not own or have lawful rights to transfer.</li>
            <li>Upload malicious files or attempt to exploit our infrastructure.</li>
            <li>Circumvent Free plan limits through repeated migrations.</li>
          </ul>

          <h2>5. Billing</h2>
          <p>The Free plan is available at no cost with limits of 50 items per data type. The Pro Annual plan is billed at $499/year through Shopify's billing system. Charges are final and non-refundable except as required by applicable law. You may cancel anytime through your Shopify admin.</p>

          <h2>6. Disclaimers</h2>
          <p>THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE MIGRATIONS WILL BE ERROR-FREE OR COMPLETE.</p>

          <h2>7. Limitation of Liability</h2>
          <p>OUR TOTAL LIABILITY FOR ANY CLAIMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

          <h2>8. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use constitutes acceptance.</p>

          <h2>9. Contact</h2>
          <p>Email: <a href="mailto:support@storemigrator.app">support@storemigrator.app</a></p>
        </main>

        <footer>
          &copy; 2026 StoreMigrator Pro. &nbsp;|&nbsp; <a href="/privacy">Privacy Policy</a>
        </footer>
      </body>
    </html>
  );
}
