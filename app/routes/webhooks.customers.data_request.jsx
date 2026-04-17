import { authenticate } from "../shopify.server";

/**
 * GDPR webhook: customers/data_request
 *
 * Called when a customer requests their data from a store that has installed
 * this app. Our app stores NO customer PII — only shop-level metadata and
 * migration job records. We respond acknowledging the request.
 *
 * Required for Shopify app approval.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);
  console.log(`[GDPR] Payload:`, JSON.stringify(payload));

  // Our app does not store customer personal data beyond what is uploaded
  // in temporary migration files. Those files are processed in memory only
  // and not persisted. No data to return.
  //
  // If you later add customer data storage, collect it here and send to the
  // store owner email listed in the payload.

  return new Response();
};
