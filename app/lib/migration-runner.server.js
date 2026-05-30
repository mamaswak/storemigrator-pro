import prisma from "../db.server";
import {
  normalizeProduct,
  normalizeCustomer,
  normalizeOrder,
  normalizeCollection,
} from "./migration-parser.server";

/**
 * Runs a migration job by processing parsed CSV rows in batches
 * and creating records in Shopify via the Admin GraphQL API.
 *
 * This implementation:
 * - Processes rows in batches with rate-limiting
 * - Captures per-item errors and continues processing
 * - Writes audit logs for every record
 * - Updates job progress in real-time
 * - Handles Shopify userErrors gracefully
 */
export async function runMigrationJob(jobId, admin, parsedRows) {
  const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: "processing",
        startedAt: new Date(),
      },
    });

    const batchSize = 10;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process rows in batches
    while (processed < parsedRows.length) {
      const batch = parsedRows.slice(
        processed,
        Math.min(processed + batchSize, parsedRows.length)
      );

      for (let i = 0; i < batch.length; i++) {
        const rowIndex = processed + i;
        const row = batch[i];

        try {
          let result;

          // Route to appropriate mutation handler based on entity type
          switch (job.entityType) {
            case "products":
              result = await createShopifyProduct(admin, row, job.sourcePlatform);
              break;
            case "customers":
              result = await createShopifyCustomer(admin, row);
              break;
            case "orders":
              result = await createShopifyOrder(admin, row, job.sourcePlatform);
              break;
            case "collections":
              result = await createShopifyCollection(admin, row);
              break;
            default:
              throw new Error(`Unknown entity type: ${job.entityType}`);
          }

          // Check for Shopify userErrors
          if (result.userErrors && result.userErrors.length > 0) {
            failed++;
            const errorMessages = result.userErrors
              .map((err) => `${err.field}: ${err.message}`)
              .join("; ");

            await prisma.migrationLog.create({
              data: {
                jobId,
                level: "error",
                message: `Row ${rowIndex + 1}: ${errorMessages}`,
                metadata: JSON.stringify({ row, userErrors: result.userErrors }),
              },
            });
          } else {
            succeeded++;
            const entityId = result.product?.id || result.customer?.id || result.order?.id || result.collection?.id;
            await prisma.migrationLog.create({
              data: {
                jobId,
                level: "info",
                message: `Row ${rowIndex + 1}: Successfully created ${job.entityType.slice(0, -1)} (ID: ${entityId})`,
                metadata: JSON.stringify({ row, entityId }),
              },
            });
          }
        } catch (err) {
          failed++;
          await prisma.migrationLog.create({
            data: {
              jobId,
              level: "error",
              message: `Row ${rowIndex + 1}: ${err.message}`,
              metadata: JSON.stringify({ row, error: err.message }),
            },
          });
        }
      }

      processed += batch.length;

      // Update progress in real-time
      await prisma.migrationJob.update({
        where: { id: jobId },
        data: {
          processedItems: processed,
          successItems: succeeded,
          failedItems: failed,
          updatedAt: new Date(),
        },
      });

      // Rate limit: 200ms between batches to respect Shopify API limits
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Mark job as completed
    const finalStatus = failed === parsedRows.length ? "failed" : "completed";
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    await prisma.migrationLog.create({
      data: {
        jobId,
        level: "info",
        message: `Migration completed: ${succeeded} succeeded, ${failed} failed out of ${parsedRows.length} total`,
      },
    });
  } catch (error) {
    await prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        completedAt: new Date(),
      },
    });

    await prisma.migrationLog.create({
      data: {
        jobId,
        level: "error",
        message: `Migration job failed: ${error.message}`,
        metadata: JSON.stringify({ error: error.message, stack: error.stack }),
      },
    });
  }
}

/**
 * Creates a product in Shopify via Admin API.
 */
export async function createShopifyProduct(admin, row, sourcePlatform) {
  const productInput = normalizeProduct(row, sourcePlatform);

  const response = await admin.graphql(
    `#graphql
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          handle
          variants(first: 1) {
            edges {
              node {
                id
                sku
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input: productInput } }
  );

  const result = await response.json();
  if (!result.data?.productCreate) {
    const msg = result.errors?.[0]?.message || "GraphQL error creating product";
    throw new Error(msg);
  }
  return result.data.productCreate;
}

/**
 * Creates a customer in Shopify via Admin API.
 */
export async function createShopifyCustomer(admin, row) {
  const customerInput = normalizeCustomer(row);

  // Validate email is present
  if (!customerInput.email) {
    throw new Error("Customer email is required");
  }

  const response = await admin.graphql(
    `#graphql
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          lastName
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input: customerInput } }
  );

  const result = await response.json();
  if (!result.data?.customerCreate) {
    const msg = result.errors?.[0]?.message || "GraphQL error creating customer";
    throw new Error(msg);
  }
  return result.data.customerCreate;
}

/**
 * Creates an order in Shopify via draftOrderComplete mutation.
 * This creates a draft order first, then completes it to become a real order.
 */
export async function createShopifyOrder(admin, row, sourcePlatform) {
  const orderInput = normalizeOrder(row, sourcePlatform);

  // Validate required fields
  if (!orderInput.lineItems || orderInput.lineItems.length === 0) {
    throw new Error("Order must have at least one line item");
  }

  if (!orderInput.customer.email) {
    throw new Error("Order customer email is required");
  }

  // First, create a draft order
  const draftOrderResponse = await admin.graphql(
    `#graphql
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          email
          lineItems(first: 10) {
            edges {
              node {
                id
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input: orderInput } }
  );

  const draftResult = await draftOrderResponse.json();

  if (!draftResult.data?.draftOrderCreate) {
    const msg = draftResult.errors?.[0]?.message || "GraphQL error creating draft order";
    throw new Error(msg);
  }

  if (draftResult.data.draftOrderCreate.userErrors?.length > 0) {
    return {
      userErrors: draftResult.data.draftOrderCreate.userErrors,
    };
  }

  const draftOrderId = draftResult.data.draftOrderCreate.draftOrder.id;

  // Then, complete the draft order to create a real order
  const completeResponse = await admin.graphql(
    `#graphql
    mutation draftOrderComplete($id: ID!) {
      draftOrderComplete(id: $id) {
        order {
          id
          orderNumber
          email
          customer {
            id
            email
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { id: draftOrderId } }
  );

  const completeResult = await completeResponse.json();

  if (!completeResult.data?.draftOrderComplete) {
    const msg = completeResult.errors?.[0]?.message || "GraphQL error completing draft order";
    throw new Error(msg);
  }

  if (completeResult.data.draftOrderComplete.userErrors?.length > 0) {
    return {
      userErrors: completeResult.data.draftOrderComplete.userErrors,
    };
  }

  return {
    order: completeResult.data.draftOrderComplete.order,
    userErrors: [],
  };
}

/**
 * Creates a collection in Shopify via Admin API.
 */
export async function createShopifyCollection(admin, row) {
  const collectionInput = normalizeCollection(row);

  // Validate title is present
  if (!collectionInput.title) {
    throw new Error("Collection title is required");
  }

  const response = await admin.graphql(
    `#graphql
    mutation collectionCreate($input: CollectionInput!) {
      collectionCreate(input: $input) {
        collection {
          id
          title
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { input: collectionInput } }
  );

  const result = await response.json();
  if (!result.data?.collectionCreate) {
    const msg = result.errors?.[0]?.message || "GraphQL error creating collection";
    throw new Error(msg);
  }
  return result.data.collectionCreate;
}
