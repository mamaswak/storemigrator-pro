import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  ProgressBar,
  DescriptionList,
  Box,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const job = await prisma.migrationJob.findFirst({
    where: { id: params.jobId, shopDomain },
  });

  if (!job) {
    throw new Response("Migration job not found", { status: 404 });
  }

  const logs = await prisma.migrationLog.findMany({
    where: { jobId: params.jobId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Don't send parsedData to the client — it can be large
  const { parsedData: _, ...jobForClient } = job;
  return json({ job: jobForClient, logs });
};

export default function MigrationDetail() {
  const { job, logs } = useLoaderData();
  const revalidator = useRevalidator();

  // Poll every 2 seconds while active
  useEffect(() => {
    if (job.status === "processing" || job.status === "pending") {
      const interval = setInterval(() => {
        revalidator.revalidate();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [job.status, revalidator]);

  const statusTone = {
    completed: "success",
    failed: "critical",
    processing: "info",
    pending: "attention",
  }[job.status] ?? "attention";

  const progress =
    job.totalItems > 0
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

  return (
    <Page
      title="Migration details"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          {job.status === "completed" && (
            <Banner tone="success" title="Migration completed successfully">
              <p>
                {job.successItems} of {job.totalItems} items imported.
                {job.failedItems > 0 &&
                  ` ${job.failedItems} failed — see the audit trail below.`}
              </p>
            </Banner>
          )}
          {job.status === "failed" && (
            <Banner tone="critical" title="Migration failed">
              <p>Check the audit trail below for details.</p>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">
                  {job.sourcePlatform} → Shopify
                </Text>
                <Badge tone={statusTone}>{job.status}</Badge>
              </InlineStack>

              <DescriptionList
                items={[
                  { term: "Source", description: job.sourcePlatform },
                  { term: "Data type", description: job.entityType },
                  { term: "File", description: job.sourceFileName || "—" },
                  { term: "Total items", description: job.totalItems.toLocaleString() },
                  { term: "Created", description: new Date(job.createdAt).toLocaleString() },
                  {
                    term: "Completed",
                    description: job.completedAt
                      ? new Date(job.completedAt).toLocaleString()
                      : "—",
                  },
                ]}
              />

              {(job.status === "processing" || job.status === "pending") && (
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p">Progress</Text>
                    <Text variant="bodyMd" as="p">
                      {job.processedItems}/{job.totalItems} ({progress}%)
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={progress} />
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {(job.status === "completed" || job.status === "processing") && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Results</Text>
                <InlineStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="bodySm" as="p" tone="subdued">Successful</Text>
                    <Text variant="headingLg" as="p" tone="success">
                      {job.successItems.toLocaleString()}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" as="p" tone="subdued">Failed</Text>
                    <Text
                      variant="headingLg"
                      as="p"
                      tone={job.failedItems > 0 ? "critical" : "subdued"}
                    >
                      {job.failedItems.toLocaleString()}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {logs && logs.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Audit Trail</Text>
                <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                  <BlockStack gap="200">
                    {logs.map((log) => (
                      <div key={log.id} style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>
                        <div
                          style={{
                            color:
                              log.level === "error"
                                ? "#d32f2f"
                                : log.level === "warning"
                                ? "#f57c00"
                                : "#1976d2",
                            fontWeight: "bold",
                          }}
                        >
                          [{log.level.toUpperCase()}] {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                        <div style={{ marginLeft: "1rem", marginTop: "0.25rem" }}>
                          {log.message}
                        </div>
                      </div>
                    ))}
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
