import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Banner,
  Divider,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

import { authenticate, PRO_PLAN } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  let shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    shop = await prisma.shop.create({ data: { shopDomain } });
  }

  return json({ shop });
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "purchase") {
    await billing.require({
      plans: [PRO_PLAN],
      isTest: process.env.NODE_ENV !== "production",
      onFailure: async () => billing.request({
        plan: PRO_PLAN,
        isTest: process.env.NODE_ENV !== "production",
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback?shop=${shopDomain}`,
      }),
    });

    return json({ success: true });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Billing() {
  const { shop } = useLoaderData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const isPro = shop.planType === "pro";
  const error = fetcher.data?.error;

  const handleUpgrade = () => {
    fetcher.submit({ intent: "purchase" }, { method: "POST" });
  };

  return (
    <Page
      title="Upgrade to Pro"
      subtitle="Unlock unlimited migrations with an annual subscription"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {error && (
          <Layout.Section>
            <Banner tone="critical" title="Could not start checkout">
              <p>{error}</p>
            </Banner>
          </Layout.Section>
        )}

        {isPro && (
          <Layout.Section>
            <Banner tone="success" title="You're on the Pro plan">
              <p>
                Thank you for supporting StoreMigrator Pro. You have full access
                to all Pro features.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingLg" as="h2">Free</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">For small stores testing the waters</Text>
                </BlockStack>
                <InlineStack gap="100" blockAlign="baseline">
                  <Text variant="heading2xl" as="p">$0</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">forever</Text>
                </InlineStack>
                <Divider />
                <BlockStack gap="200">
                  <PlanFeature>Up to 50 products</PlanFeature>
                  <PlanFeature>Up to 50 customers</PlanFeature>
                  <PlanFeature>Up to 50 orders</PlanFeature>
                  <PlanFeature>CSV imports</PlanFeature>
                  <PlanFeature>Basic email support</PlanFeature>
                </BlockStack>
                <Button disabled fullWidth>{isPro ? "Downgraded" : "Current plan"}</Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingLg" as="h2">Pro</Text>
                      <Badge tone="success">Most popular</Badge>
                    </InlineStack>
                    <Text variant="bodyMd" as="p" tone="subdued">For serious migrations and large catalogs</Text>
                  </BlockStack>
                </InlineStack>
                <InlineStack gap="100" blockAlign="baseline">
                  <Text variant="heading2xl" as="p">$499</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">/year</Text>
                </InlineStack>
                <Text variant="bodySm" as="p" tone="subdued">Cancel anytime. Renews annually.</Text>
                <Divider />
                <BlockStack gap="200">
                  <PlanFeature>Unlimited products, customers, orders</PlanFeature>
                  <PlanFeature>All source platforms (140+)</PlanFeature>
                  <PlanFeature>SEO-preserving 301 redirects</PlanFeature>
                  <PlanFeature>Metafields and custom attributes</PlanFeature>
                  <PlanFeature>Bulk image migration</PlanFeature>
                  <PlanFeature>Collection and category mapping</PlanFeature>
                  <PlanFeature>Priority email support</PlanFeature>
                  <PlanFeature>Migration validation reports</PlanFeature>
                </BlockStack>
                <Button
                  variant="primary"
                  fullWidth
                  loading={isSubmitting}
                  disabled={isPro}
                  onClick={handleUpgrade}
                >
                  {isPro ? "You have Pro" : "Upgrade to Pro — $499/year"}
                </Button>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function PlanFeature({ children }) {
  return (
    <InlineStack gap="200" blockAlign="start" wrap={false}>
      <div style={{ marginTop: "2px", flexShrink: 0 }}>
        <CheckIcon width="16" height="16" />
      </div>
      <Text variant="bodyMd" as="p">{children}</Text>
    </InlineStack>
  );
}
