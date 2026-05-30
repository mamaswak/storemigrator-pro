import { useState, useCallback, useRef } from "react";
import { json, redirect, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Select,
  DropZone,
  Banner,
  List,
  Divider,
  Box,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { parseMigrationFile } from "../lib/migration-parser.server";

const FREE_LIMIT = 50;

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
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  const isPro = shop?.planType === "pro";

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 50_000_000, // 50MB
  });

  const formData = await unstable_parseMultipartFormData(request, uploadHandler);
  const sourcePlatform = formData.get("sourcePlatform");
  const entityType = formData.get("entityType");
  const file = formData.get("file");

  if (!sourcePlatform || !entityType || !file) {
    return json({ error: "Please fill in all required fields" }, { status: 400 });
  }

  const fileText = await file.text();
  const parsed = await parseMigrationFile(fileText, entityType);

  if (parsed.error) {
    return json({ error: parsed.error }, { status: 400 });
  }

  // Enforce free plan limit
  if (!isPro && parsed.totalRows > FREE_LIMIT) {
    return json(
      {
        error: `Your file has ${parsed.totalRows} ${entityType}. The Free plan is limited to ${FREE_LIMIT} items. Upgrade to Pro for unlimited migrations.`,
        upgradeRequired: true,
      },
      { status: 402 }
    );
  }

  const job = await prisma.migrationJob.create({
    data: {
      shopDomain,
      sourcePlatform,
      entityType,
      status: "pending",
      totalItems: parsed.totalRows,
      sourceFileName: file.name,
    },
  });

  // Store parsed rows in a global map for the runner to access
  // In production, this should be stored in S3 or a queue service
  if (!global.migrationRowsCache) {
    global.migrationRowsCache = {};
  }
  global.migrationRowsCache[job.id] = parsed.rows;

  return redirect(`/app/migrate/${job.id}`);
};

export default function Migrate() {
  const { shop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const isPro = shop.planType === "pro";

  const [sourcePlatform, setSourcePlatform] = useState("woocommerce");
  const [entityType, setEntityType] = useState("products");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback(
    (_droppedFiles, acceptedFiles) => {
      if (!acceptedFiles.length) return;
      setFile(acceptedFiles[0]);
      // Attach the file to the real input so it submits as multipart form data
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(acceptedFiles[0]);
        fileInputRef.current.files = dt.files;
      }
    },
    []
  );

  const platformOptions = [
    { label: "WooCommerce", value: "woocommerce" },
    { label: "BigCommerce", value: "bigcommerce" },
    { label: "Magento", value: "magento" },
    { label: "Squarespace", value: "squarespace" },
    { label: "Wix", value: "wix" },
    { label: "Etsy", value: "etsy" },
    { label: "PrestaShop", value: "prestashop" },
    { label: "OpenCart", value: "opencart" },
    { label: "Generic CSV", value: "csv" },
  ];

  const entityOptions = [
    { label: "Products", value: "products" },
    { label: "Customers", value: "customers" },
    { label: "Orders", value: "orders" },
    { label: "Collections", value: "collections" },
  ];

  return (
    <Page
      title="New migration"
      subtitle="Import data from your old platform into Shopify"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner
              tone={actionData.upgradeRequired ? "warning" : "critical"}
              title={
                actionData.upgradeRequired
                  ? "Upgrade required"
                  : "Something went wrong"
              }
              action={
                actionData.upgradeRequired
                  ? {
                      content: "Upgrade to Pro — $499 one-time",
                      url: "/app/billing",
                    }
                  : undefined
              }
            >
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {!isPro && (
          <Layout.Section>
            <Banner tone="info">
              <p>
                You're on the Free plan (up to {FREE_LIMIT} items per migration).{" "}
                <a href="/app/billing">Upgrade to Pro</a> for unlimited items,
                SEO redirects, and priority support.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <Form method="post" encType="multipart/form-data">
              <BlockStack gap="500">
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Step 1: Choose your source platform
                  </Text>
                  <Select
                    label="Where are you migrating from?"
                    options={platformOptions}
                    value={sourcePlatform}
                    onChange={setSourcePlatform}
                    name="sourcePlatform"
                  />
                </BlockStack>

                <Divider />

                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Step 2: Choose what to migrate
                  </Text>
                  <Select
                    label="Data type"
                    options={entityOptions}
                    value={entityType}
                    onChange={setEntityType}
                    name="entityType"
                  />
                  <Text variant="bodySm" as="p" tone="subdued">
                    You can run multiple migrations — one for each data type.
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="300">
                  <Text variant="headingMd" as="h2">
                    Step 3: Upload your export file
                  </Text>
                  {/* Hidden real file input — populated via DataTransfer on drop */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept=".csv,.json,.xml"
                    style={{ display: "none" }}
                  />
                  <DropZone
                    accept=".csv,.json,.xml"
                    type="file"
                    allowMultiple={false}
                    onDrop={handleDrop}
                  >
                    {file ? (
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            {file.name}
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            {(file.size / 1024).toFixed(1)} KB
                          </Text>
                        </BlockStack>
                      </Box>
                    ) : (
                      <DropZone.FileUpload
                        actionTitle="Upload file"
                        actionHint="Accepts .csv, .json, .xml (up to 50MB)"
                      />
                    )}
                  </DropZone>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Export your data from {platformOptions.find(o => o.value === sourcePlatform)?.label} and upload the file here.
                    Need help? See our{" "}
                    <a href="/app/support">export guides</a>.
                  </Text>
                </BlockStack>

                <InlineStack align="end" gap="200">
                  <Button url="/app" variant="tertiary">
                    Cancel
                  </Button>
                  <Button
                    submit
                    variant="primary"
                    loading={isSubmitting}
                    disabled={!file}
                  >
                    Start migration
                  </Button>
                </InlineStack>
              </BlockStack>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                How to export from {platformOptions.find(o => o.value === sourcePlatform)?.label}
              </Text>
              <ExportInstructions platform={sourcePlatform} />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function ExportInstructions({ platform }) {
  const instructions = {
    woocommerce: [
      "Log in to your WordPress admin",
      "Go to Products > All Products",
      "Click 'Export' at the top of the page",
      "Select 'All columns' and export as CSV",
    ],
    bigcommerce: [
      "Log in to BigCommerce admin",
      "Go to Products > Export",
      "Select 'Default' template",
      "Click 'Continue' and download the CSV",
    ],
    magento: [
      "Log in to Magento admin",
      "Go to System > Data Transfer > Export",
      "Choose the entity type (Products, Customers, etc.)",
      "Click 'Continue' to download",
    ],
    etsy: [
      "Log in to your Etsy shop",
      "Go to Shop Manager > Settings > Options",
      "Under 'Download Data', select the data type",
      "Click 'Download CSV'",
    ],
    csv: [
      "Prepare a CSV file with your data",
      "Ensure headers match standard e-commerce fields",
      "Save as UTF-8 encoded CSV",
      "Upload the file here",
    ],
  };

  const steps = instructions[platform] || instructions.csv;

  return (
    <List type="number">
      {steps.map((step, i) => (
        <List.Item key={i}>{step}</List.Item>
      ))}
    </List>
  );
}
