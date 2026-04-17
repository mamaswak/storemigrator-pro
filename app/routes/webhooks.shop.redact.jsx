import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * GDPR webhook: shop/redact
 *
 * Called 48 hours after a shop uninstalls the app. We must delete all
 * data related to the shop from our database.
 *
 * Required for Shopify app approval.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} received for shop: ${shop}`);

  const shopDomain = payload.shop_domain || shop;

  // Delete all data associated with this shop
  try {
    // Delete migration logs first (foreign key)
    const jobs = await prisma.migrationJob.findMany({
      where: { shopDomain },
      select: { id: true },
    });
    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length > 0) {
      await prisma.migrationLog.deleteMany({
        where: { jobId: { in: jobIds } },
      });
    }

    // Delete migration jobs
    await prisma.migrationJob.deleteMany({ where: { shopDomain } });

    // Delete sessions
    await prisma.session.deleteMany({ where: { shop: shopDomain } });

    // Delete shop record
    await prisma.shop.deleteMany({ where: { shopDomain } });

    console.log(`[GDPR] All data deleted for shop: ${shopDomain}`);
  } catch (error) {
    console.error(`[GDPR] Error deleting shop data:`, error);
  }

  return new Response();
};
