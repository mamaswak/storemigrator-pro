import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  EmptyState,
  useIndexResourceState,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const jobs = await prisma.migrationJob.findMany({
    where: { shopDomain },
    orderBy: { createdAt: "desc" },
  });

  return json({ jobs });
};

export default function History() {
  const { jobs } = useLoaderData();
  const navigate = useNavigate();
  const resourceName = { singular: "migration", plural: "migrations" };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(jobs);

  if (jobs.length === 0) {
    return (
      <Page title="Migration history" backAction={{ content: "Dashboard", url: "/app" }}>
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="No migrations yet"
                action={{ content: "Start a migration", url: "/app/migrate" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Once you run your first migration, you'll see the history here.
                </p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const rows = jobs.map((job, index) => {
    const statusTone = {
      completed: "success",
      failed: "critical",
      processing: "info",
      pending: "attention",
    }[job.status];

    return (
      <IndexTable.Row
        id={job.id}
        key={job.id}
        selected={selectedResources.includes(job.id)}
        position={index}
        onClick={() => navigate(`/app/migrate/${job.id}`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {job.sourcePlatform}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{job.entityType}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={statusTone}>{job.status}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {job.successItems}/{job.totalItems}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {new Date(job.createdAt).toLocaleDateString()}
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Migration history"
      backAction={{ content: "Dashboard", url: "/app" }}
      primaryAction={{ content: "New migration", url: "/app/migrate" }}
    >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <IndexTable
              resourceName={resourceName}
              itemCount={jobs.length}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Source" },
                { title: "Type" },
                { title: "Status" },
                { title: "Items" },
                { title: "Created" },
              ]}
            >
              {rows}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
