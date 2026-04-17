import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
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
  List,
  Divider,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PRO_PRICE_USD = 499;
const PRO_PLAN_NAME = "StoreMigrator Pro - Lifetime License";

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
  const { admin, session, billing } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "purchase") {
    // Create a one-time application charge via GraphQL
    const response = await admin.graphql(
      `#graphql
      mutation AppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean) {
        appPurchaseOneTimeCreate(
          name: $name,
          price: $price,
          returnUrl: $returnUrl,
          test: $test
        ) {
          userErrors {
            field
            message
          }
          appPurchaseOneTime {
            id
            name
            status
          }
          confirmationUrl
        }
      }`,
      {
        variables: {
          name: PRO_PLAN_NAME,
          price: { amount: PRO_PRICE_USD, currencyCode: "USD" },
          returnUrl: `${process.env.SHOPIFY_APP_URL}/app/billing/callback?shop=${shopDomain}`,
          test: process.env.NODE_ENV !== "production",
        },
      }
    );

    const result = await response.json();
    const data = result.data?.appPurchaseOneTimeCreate;

    if (data?.userErrors?.length > 0) {
      return json({ error: data.userErrors[0].message }, { status: 400 });
    }

    if (data?.confirmationUrl) {
      return redirect(data.confirmationUrl);
    }

    return json({ error: "Unable to create charge" }, { status: 500 });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function Billing() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const isPro = shop.planType === "pro";

  return (
    <Page
      title="Upgrade to Pro"
      subtitle="Unlock unlimited migrations with a one-time payment"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Could not start checkout">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {isPro && (
          <Layout.Section>
            <Banner tone="success" title="You're on the Pro plan">
              <p>
                Thank you for supporting StoreMigrator Pro. You have lifetime
                access to all Pro features.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            {/* Free plan card */}
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text variant="headingLg" as="h2">
                    Free
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    For small stores testing the waters
                  </Text>
                </BlockStack>
                <InlineStack gap="100" blockAlign="baseline">
                  <Text variant="heading2xl" as="p">
                    $0
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    forever
                  </Text>
                </InlineStack>
                <Divider />
                <BlockStack gap="200">
                  <PlanFeature>Up to 50 products</PlanFeature>
                  <PlanFeature>Up to 50 customers</PlanFeature>
                  <PlanFeature>Up to 50 orders</PlanFeature>
                  <PlanFeature>CSV imports</PlanFeature>
                  <PlanFeature>Basic email support</PlanFeature>
                </BlockStack>
                <Button disabled fullWidth>
                  {isPro ? "Downgraded" : "Current plan"}
                </Button>
              </BlockStack>
            </Card>

            {/* Pro plan card */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingLg" as="h2">
                        Pro
                      </Text>
                      <Badge tone="success">Most popular</Badge>
                    </InlineStack>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      For serious migrations and large catalogs
                    </Text>
                  </BlockStack>
                </InlineStack>
                <InlineStack gap="100" blockAlign="baseline">
                  <Text variant="heading2xl" as="p">
                    $499
                  </Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    one-time
                  </Text>
                </InlineStack>
                <Text variant="bodySm" as="p" tone="subdued">
                  Lifetime access. No recurring charges.
                </Text>
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
                <Form method="post">
                  <input type="hidden" name="intent" value="purchase" />
                  <Button
                    submit
                    variant="primary"
                    fullWidth
                    loading={isSubmitting}
                    disabled={isPro}
                  >
                    {isPro ? "You have Pro" : "Upgrade to Pro — $499 one-time"}
                  </Button>
                </Form>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Why a one-time payment?
              </Text>
              <Text variant="bodyMd" as="p">
                Migrations are a one-time event for most merchants. You shouldn't
                pay forever for a service you use once. Pay once, migrate as many
                times as you need, and keep lifetime access to all Pro features
                and future updates.
              </Text>
              <Text variant="bodyMd" as="p">
                For comparison, migration agencies typically charge $2,000–$5,000
                for the same service. Our $499 flat rate saves you thousands
                while giving you full control over the process.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Frequently asked questions
              </Text>
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3">
                    Is the $499 really one-time?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Yes. You pay once and get lifetime access. No monthly fees,
                    no renewal charges, no surprises.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3">
                    Can I get a refund if the migration fails?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Yes. If we can't successfully migrate your data and our
                    support team cannot resolve the issue, we offer a full
                    refund within 30 days of purchase.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3">
                    What if I have more than 25,000 items?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    The Pro plan handles unlimited items. Very large catalogs
                    (100k+) are processed in batches automatically.
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text variant="headingSm" as="h3">
                    Can I try before I buy?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Yes. The Free plan lets you migrate up to 50 products, 50
                    customers, and 50 orders so you can validate the quality
                    before upgrading.
                  </Text>
                </BlockStack>
              </BlockStack>
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
      <div style={{ marginTop: "2px", flexShrink: 0 }}>
        <CheckIcon width="16" height="16" />
      </div>
      <Text variant="bodyMd" as="p">
        {children}
      </Text>
    </InlineStack>
  );
}
