import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
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
  DescriptionList,
  Divider,
  Box,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { runMigrationJob } from "../lib/migration-runner.server";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const job = await prisma.migrationJob.findFirst({
    where: { id: params.jobId, shopDomain },
  });

  if (!job) {
    throw new Response("Migration job not found", { status: 404 });
  }

  // Fetch audit logs for this job
  const logs = await prisma.migrationLog.findMany({
    where: { jobId: params.jobId },
    orderBy: { createdAt: "asc" },
    take: 100, // Limit to last 100 logs for display
  });

  return json({ job, logs });
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const job = await prisma.migrationJob.findFirst({
    where: { id: params.jobId, shopDomain },
  });

  if (!job) {
    return json({ error: "Job not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "start") {
    // Retrieve parsed rows from cache
    const parsedRows = global.migrationRowsCache?.[job.id] || [];

    if (parsedRows.length === 0) {
      return json(
        { error: "No data found for this migration. Please upload the file again." },
        { status: 400 }
      );
    }

    // Kick off the migration (async, but we update status immediately)
    await prisma.migrationJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date() },
    });

    // In a real app this runs via a background worker queue
    runMigrationJob(job.id, admin, parsedRows).catch((err) => {
      console.error("Migration failed:", err);
    });
  }

  return json({ success: true });
};

export default function MigrationDetail() {
  const { job, logs } = useLoaderData();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const isSubmitting = navigation.state === "submitting";

  // Poll for updates every 2 seconds while processing
  useEffect(() => {
    if (job.status === "processing") {
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
  }[job.status];

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
                {job.successItems} of {job.totalItems} items were imported
                successfully.
                {job.failedItems > 0 &&
                  ` ${job.failedItems} items failed — see the audit trail below.`}
              </p>
            </Banner>
          )}
          {job.status === "failed" && (
            <Banner tone="critical" title="Migration failed">
              <p>The migration encountered an error and could not complete. Check the audit trail for details.</p>
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
                  {
                    term: "Total items",
                    description: job.totalItems.toLocaleString(),
                  },
                  {
                    term: "Created",
                    description: new Date(job.createdAt).toLocaleString(),
                  },
                  {
                    term: "Completed",
                    description: job.completedAt
                      ? new Date(job.completedAt).toLocaleString()
                      : "—",
                  },
                ]}
              />

              {job.status === "processing" && (
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text variant="bodyMd" as="p">
                      Progress
                    </Text>
                    <Text variant="bodyMd" as="p">
                      {job.processedItems}/{job.totalItems} ({progress}%)
                    </Text>
                  </InlineStack>
                  <ProgressBar progress={progress} />
                </BlockStack>
              )}

              {job.status === "pending" && (
                <Form method="post">
                  <input type="hidden" name="intent" value="start" />
                  <Button submit variant="primary" loading={isSubmitting}>
                    Start migration now
                  </Button>
                </Form>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {(job.status === "completed" || job.status === "processing") && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Results
                </Text>
                <InlineStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="bodySm" as="p" tone="subdued">
                      Successful
                    </Text>
                    <Text variant="headingLg" as="p" tone="success">
                      {job.successItems.toLocaleString()}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" as="p" tone="subdued">
                      Failed
                    </Text>
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
                <Text variant="headingMd" as="h2">
                  Audit Trail
                </Text>
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
