import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Divider,
  Icon,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  let shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    shop = await prisma.shop.create({ data: { shopDomain } });
  }

  // Build the Shopify-hosted pricing page URL
  // Pattern: https://admin.shopify.com/store/{store-handle}/charges/{app-handle}/pricing_plans
  const storeHandle = shopDomain.replace(".myshopify.com", "");
  const pricingPageUrl = `https://admin.shopify.com/store/${storeHandle}/charges/store-migrator-pro/pricing_plans`;

  return json({ shop, pricingPageUrl });
};

export default function Billing() {
  const { shop, pricingPageUrl } = useLoaderData();
  const isPro = shop.planType === "pro";

  return (
    <Page
      title="Plans & Pricing"
      subtitle="Choose the plan that fits your migration needs"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
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
                  <PlanFeature>Email support</PlanFeature>
                </BlockStack>
                {!isPro && <Badge tone="success">Current plan</Badge>}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="headingLg" as="h2">Pro Annual</Text>
                  {isPro && <Badge tone="success">Active</Badge>}
                </InlineStack>
                <Text variant="bodyMd" as="p" tone="subdued">For serious migrations and large catalogs</Text>
                <InlineStack gap="100" blockAlign="baseline">
                  <Text variant="heading2xl" as="p">$499</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">/year</Text>
                </InlineStack>
                <Text variant="bodySm" as="p" tone="subdued">Annual subscription. Cancel anytime.</Text>
                <Divider />
                <BlockStack gap="200">
                  <PlanFeature>Unlimited products, customers, and orders</PlanFeature>
                  <PlanFeature>All source platforms supported</PlanFeature>
                  <PlanFeature>SEO-preserving 301 redirects</PlanFeature>
                  <PlanFeature>Custom field and metafield mapping</PlanFeature>
                  <PlanFeature>Bulk image migration</PlanFeature>
                  <PlanFeature>Priority email support</PlanFeature>
                </BlockStack>
                <Button
                  url={pricingPageUrl}
                  target="_top"
                  variant="primary"
                  fullWidth
                  disabled={isPro}
                >
                  {isPro ? "You're on Pro" : "Upgrade to Pro Annual"}
                </Button>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">How billing works</Text>
              <Text variant="bodyMd" as="p">
                StoreMigrator Pro uses Shopify's secure billing system. When you upgrade, you'll be taken to Shopify's pricing page to review and approve the charge. All charges appear on your regular Shopify bill, and you can cancel anytime from your Shopify admin.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function PlanFeature({ children }) {
  return (
    <InlineStack gap="200" blockAlign="start" wrap={false}>
      <Icon source={CheckIcon} tone="success" />
      <Text variant="bodyMd" as="p">{children}</Text>
    </InlineStack>
  );
}
