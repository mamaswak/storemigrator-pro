import { authenticate } from "../shopify.server";

/**
 * GDPR webhook: customers/redact
 *
 * Called 48 hours after a customer requests deletion. We must delete any
 * personal data we hold about the customer.
 *
 * Our app does not persist customer PII. Migration files are processed
 * in memory during import and not retained.
 *
 * Required for Shopify app approval.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);
  console.log(`[GDPR] Customer ID: ${payload.customer?.id}`);

  // No customer PII is stored in our database — nothing to delete.
  // If you add customer data storage later, delete records matching
  // payload.customer.id and payload.customer.email here.

  return new Response();
};
