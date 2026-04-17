import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // When app is uninstalled, clean up the shop's sessions
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }

  // Mark shop as uninstalled (keep record for analytics, compliance)
  await prisma.shop.updateMany({
    where: { shopDomain: shop },
    data: { uninstalledAt: new Date() },
  });

  return new Response();
};
