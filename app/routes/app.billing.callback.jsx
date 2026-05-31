import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/billing?error=no_charge_id");
  }

  // Annual billing creates AppSubscription, not AppPurchaseOneTime
  const response = await admin.graphql(
    `#graphql
    query getAppSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          name
          status
          createdAt
        }
      }
    }`,
    {
      variables: {
        id: `gid://shopify/AppSubscription/${chargeId}`,
      },
    }
  );

  const result = await response.json();
  const subscription = result.data?.node;

  if (subscription?.status === "ACTIVE") {
    await prisma.shop.upsert({
      where: { shopDomain },
      update: {
        planType: "pro",
        planPurchasedAt: new Date(),
        chargeId: chargeId,
      },
      create: {
        shopDomain,
        planType: "pro",
        planPurchasedAt: new Date(),
        chargeId: chargeId,
      },
    });

    return redirect("/app?upgraded=true");
  }

  return redirect("/app/billing?error=charge_not_active");
};
