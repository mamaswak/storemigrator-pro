import prisma from "../db.server";
import {
  normalizeProduct,
  normalizeCustomer,
  normalizeOrder,
  normalizeCollection,
} from "./migration-parser.server";

const API_VERSION = "2025-01";

async function shopifyGQL(shop, accessToken, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function runMigrationJob(jobId, shop, accessToken, parsedRows) {
  const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: "processing", startedAt: new Date() },
    });

    const batchSize = 10;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    while (processed < parsedRows.length) {
      const batch = parsedRows.slice(processed, Math.min(processed + batchSize, parsedRows.length));

      for (let i = 0; i < batch.length; i++) {
        const rowIndex = processed + i;
        const row = batch[i];

        try {
          let result;
          switch (job.entityType) {
            case "products":
              result = await createShopifyProduct(shop, accessToken, row, job.sourcePlatform);
              break;
            case "customers":
              result = await createShopifyCustomer(shop, accessToken, row);
              break;
            case "orders":
              result = await createShopifyOrder(shop, accessToken, row, job.sourcePlatform);
              break;
            case "collections":
              result = await createShopifyCollection(shop, accessToken, row);
              break;
            default:
              throw new Error(`Unknown entity type: ${job.entityType}`);
          }

          if (result.userErrors && result.userErrors.length > 0) {
            failed++;
            const errorMessages = result.userErrors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ");
            console.error(`[migration] row ${rowIndex + 1} userErrors:`, errorMessages);
            await prisma.migrationLog.create({
              data: {
                jobId,
                level: "error",
                message: `Row ${rowIndex + 1}: ${errorMessages}`,
                metadata: JSON.stringify({ userErrors: result.userErrors }),
              },
            });
          } else {
            succeeded++;
            const entityId =
              result.product?.id || result.customer?.id || result.order?.id || result.collection?.id;
            await prisma.migrationLog.create({
              data: {
                jobId,
                level: "info",
                message: `Row ${rowIndex + 1}: Created ${job.entityType.slice(0, -1)} (${entityId})`,
              },
            });
          }
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[migration] row ${rowIndex + 1} error:`, msg);
          await prisma.migrationLog.create({
            data: {
              jobId,
              level: "error",
              message: `Row ${rowIndex + 1}: ${msg}`,
            },
          });
        }
      }

      processed += batch.length;
      await prisma.migrationJob.update({
        where: { id: jobId },
        data: { processedItems: processed, successItems: succeeded, failedItems: failed },
      });

      await new Promise((r) => setTimeout(r, 200));
    }

    const finalStatus = failed === parsedRows.length ? "failed" : "completed";
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: finalStatus, completedAt: new Date() },
    });
    await prisma.migrationLog.create({
      data: {
        jobId,
        level: "info",
        message: `Done: ${succeeded} succeeded, ${failed} failed out of ${parsedRows.length}`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[migration] job crashed:", msg);
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: "failed", completedAt: new Date() },
    });
    await prisma.migrationLog.create({
      data: { jobId, level: "error", message: `Job crashed: ${msg}` },
    });
  }
}

async function createShopifyProduct(shop, accessToken, row, sourcePlatform) {
  const input = normalizeProduct(row, sourcePlatform);
  const result = await shopifyGQL(shop, accessToken,
    `mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product { id title handle }
        userErrors { field message }
      }
    }`,
    { input }
  );
  if (!result.data?.productCreate) {
    throw new Error(result.errors?.[0]?.message || "productCreate returned no data");
  }
  return result.data.productCreate;
}

async function createShopifyCustomer(shop, accessToken, row) {
  const input = normalizeCustomer(row);
  if (!input.email) throw new Error("Customer email is required");
  const result = await shopifyGQL(shop, accessToken,
    `mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id email firstName lastName }
        userErrors { field message }
      }
    }`,
    { input }
  );
  if (!result.data?.customerCreate) {
    throw new Error(result.errors?.[0]?.message || "customerCreate returned no data");
  }
  return result.data.customerCreate;
}

async function createShopifyOrder(shop, accessToken, row, sourcePlatform) {
  const input = normalizeOrder(row, sourcePlatform);
  if (!input.lineItems?.length) throw new Error("Order must have at least one line item");
  if (!input.customer?.email) throw new Error("Order customer email is required");

  const draftResult = await shopifyGQL(shop, accessToken,
    `mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id }
        userErrors { field message }
      }
    }`,
    { input }
  );
  if (!draftResult.data?.draftOrderCreate) {
    throw new Error(draftResult.errors?.[0]?.message || "draftOrderCreate returned no data");
  }
  if (draftResult.data.draftOrderCreate.userErrors?.length > 0) {
    return { userErrors: draftResult.data.draftOrderCreate.userErrors };
  }

  const draftOrderId = draftResult.data.draftOrderCreate.draftOrder.id;
  const completeResult = await shopifyGQL(shop, accessToken,
    `mutation draftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        order { id orderNumber }
        userErrors { field message }
      }
    }`,
    { id: draftOrderId }
  );
  if (!completeResult.data?.draftOrderComplete) {
    throw new Error(completeResult.errors?.[0]?.message || "draftOrderComplete returned no data");
  }
  if (completeResult.data.draftOrderComplete.userErrors?.length > 0) {
    return { userErrors: completeResult.data.draftOrderComplete.userErrors };
  }
  return { order: completeResult.data.draftOrderComplete.order, userErrors: [] };
}

async function createShopifyCollection(shop, accessToken, row) {
  const input = normalizeCollection(row);
  if (!input.title) throw new Error("Collection title is required");
  const result = await shopifyGQL(shop, accessToken,
    `mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection { id title handle }
        userErrors { field message }
      }
    }`,
    { input }
  );
  if (!result.data?.collectionCreate) {
    throw new Error(result.errors?.[0]?.message || "collectionCreate returned no data");
  }
  return result.data.collectionCreate;
}
