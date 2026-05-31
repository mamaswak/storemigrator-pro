import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useRevalidator } from "@remix-run/react";
import { useEffect, useRef } from "react";
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

  const logs = await prisma.migrationLog.findMany({
    where: { jobId: params.jobId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Don't send parsedData to the client — it can be large
  const { parsedData: _, ...jobForClient } = job;
  return json({ job: jobForClient, logs });
};

export const action = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const job = await prisma.migrationJob.findFirst({
    where: { id: params.jobId, shopDomain },
  });

  if (!job || job.status !== "pending") {
    return json({ ok: true });
  }

  const parsedRows = job.parsedData ? JSON.parse(job.parsedData) : [];

  if (parsedRows.length === 0) {
    await prisma.migrationJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date() },
    });
    await prisma.migrationLog.create({
      data: { jobId: job.id, level: "error", message: "No parsed data found — please upload the file again." },
    });
    return json({ ok: true });
  }

  await prisma.migrationJob.update({
    where: { id: job.id },
    data: { status: "processing", startedAt: new Date() },
  });

  // Await the migration synchronously so it completes before the response is sent
  try {
    console.log(`[migration] starting job ${job.id} with ${parsedRows.length} rows`);
    await runMigrationJob(job.id, admin, parsedRows);
    console.log(`[migration] job ${job.id} finished`);
  } catch (err) {
    console.error(`[migration] job ${job.id} threw:`, err);
  }

  return json({ ok: true });
};

export default function MigrationDetail() {
  const { job, logs } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const startedRef = useRef(false);

  // Auto-trigger start on first render if job is pending
  useEffect(() => {
    if (job.status === "pending" && !startedRef.current) {
      startedRef.current = true;
      submit({}, { method: "post", action: `/app/migrate/${job.id}` });
    }
  }, [job.id, job.status, submit]);

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
