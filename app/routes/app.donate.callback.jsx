import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/donate?error=no_charge_id");
  }

  // Verify the charge status with Shopify
  const response = await admin.graphql(
    `#graphql
    query getAppPurchase($id: ID!) {
      node(id: $id) {
        ... on AppPurchaseOneTime {
          id
          name
          status
          createdAt
          price {
            amount
            currencyCode
          }
        }
      }
    }`,
    {
      variables: {
        id: `gid://shopify/AppPurchaseOneTime/${chargeId}`,
      },
    }
  );

  const result = await response.json();
  const purchase = result.data?.node;

  if (!purchase) {
    return redirect("/app/donate?error=charge_not_found");
  }

  const purchaseGid = purchase.id;

  // Update the donation record we created in the action
  const existingDonation = await prisma.donation.findFirst({
    where: { chargeId: purchaseGid, shopDomain },
  });

  if (existingDonation) {
    await prisma.donation.update({
      where: { id: existingDonation.id },
      data: {
        status: purchase.status,
        confirmedAt: purchase.status === "ACTIVE" ? new Date() : null,
      },
    });
  } else {
    // Fallback if for some reason the pending record wasn't created
    const amount = parseFloat(purchase.price?.amount || "0");
    await prisma.donation.create({
      data: {
        shopDomain,
        amount,
        chargeId: purchaseGid,
        status: purchase.status,
        confirmedAt: purchase.status === "ACTIVE" ? new Date() : null,
      },
    });
  }

  if (purchase.status === "ACTIVE") {
    return redirect("/app/donate?donated=true");
  }
  if (purchase.status === "DECLINED") {
    return redirect("/app/donate?error=declined");
  }
  return redirect("/app/donate?error=charge_not_active");
};
