import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
  ProgressBar,
  List,
  Icon,
} from "@shopify/polaris";
import {
  ImportIcon,
  ChartVerticalIcon,
  StarIcon,
  CheckIcon,
} from "@shopify/polaris-icons";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Ensure shop exists in DB
  let shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (!shop) {
    shop = await prisma.shop.create({ data: { shopDomain } });
  }

  const recentJobs = await prisma.migrationJob.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = {
    totalJobs: await prisma.migrationJob.count({ where: { shopDomain } }),
    completedJobs: await prisma.migrationJob.count({
      where: { shopDomain, status: "completed" },
    }),
    totalItemsMigrated: await prisma.migrationJob.aggregate({
      where: { shopDomain, status: "completed" },
      _sum: { successItems: true },
    }),
  };

  return json({
    shop,
    recentJobs,
    stats: {
      ...stats,
      totalItemsMigrated: stats.totalItemsMigrated._sum.successItems || 0,
    },
  });
};

export default function Dashboard() {
  const { shop, recentJobs, stats } = useLoaderData();
  const isPro = shop.planType === "pro";

  return (
    <Page
      title="StoreMigrator Pro"
      subtitle="Migrate your store data to Shopify with confidence"
      primaryAction={{
        content: "Start New Migration",
        url: "/app/migrate",
        icon: ImportIcon,
      }}
    >
      <Layout>
        {!isPro && (
          <Layout.Section>
            <Banner
              title="You're on the Free plan"
              tone="info"
              action={{
                content: "Upgrade to Pro — $499/year",
                url: "/app/billing",
              }}
            >
              <p>
                Free plan includes up to 50 products, 50 customers, and 50 orders.
                Upgrade to Pro for unlimited migrations, SEO redirects, and
                priority support. Cancel anytime.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">
                  Total Migrations
                </Text>
                <Text variant="heading2xl" as="p">
                  {stats.totalJobs}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">
                  Completed
                </Text>
                <Text variant="heading2xl" as="p">
                  {stats.completedJobs}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">
                  Items Migrated
                </Text>
                <Text variant="heading2xl" as="p">
                  {stats.totalItemsMigrated.toLocaleString()}
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3" tone="subdued">
                  Plan
                </Text>
                <InlineStack gap="200" blockAlign="center">
                  <Text variant="heading2xl" as="p">
                    {isPro ? "Pro" : "Free"}
                  </Text>
                  {isPro && <Badge tone="success">Active</Badge>}
                </InlineStack>
              </BlockStack>
            </Card>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  Recent migrations
                </Text>
                <Button url="/app/history" variant="plain">
                  View all
                </Button>
              </InlineStack>
              {recentJobs.length === 0 ? (
                <BlockStack gap="300" align="center">
                  <Text variant="bodyMd" as="p" tone="subdued">
                    No migrations yet. Start your first migration to see it here.
                  </Text>
                  <Button url="/app/migrate" variant="primary">
                    Start New Migration
                  </Button>
                </BlockStack>
              ) : (
                <BlockStack gap="300">
                  {recentJobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                What StoreMigrator Pro does
              </Text>
              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="p">Imports products, variants, and images</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="p">Transfers customers and order history</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="p">
                    Preserves SEO with 301 redirects (Pro plan)
                  </Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="p">Maps metafields and custom attributes</Text>
                </InlineStack>
                <InlineStack gap="200" blockAlign="start" wrap={false}>
                  <Icon source={CheckIcon} tone="success" />
                  <Text as="p">Validates data before importing</Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function JobRow({ job }) {
  const progress =
    job.totalItems > 0
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

  const statusTone = {
    completed: "success",
    failed: "critical",
    processing: "info",
    pending: "attention",
  }[job.status];

  return (
    <BlockStack gap="200">
      <InlineStack align="space-between">
        <BlockStack gap="100">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {job.sourcePlatform} → Shopify ({job.entityType})
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            {new Date(job.createdAt).toLocaleString()}
          </Text>
        </BlockStack>
        <InlineStack gap="200" blockAlign="center">
          <Badge tone={statusTone}>{job.status}</Badge>
          <Text variant="bodySm" as="p">
            {job.successItems}/{job.totalItems} items
          </Text>
        </InlineStack>
      </InlineStack>
      {job.status === "processing" && <ProgressBar progress={progress} />}
    </BlockStack>
  );
}
