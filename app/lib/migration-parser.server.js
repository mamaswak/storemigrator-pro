import { parse } from "csv-parse/sync";

/**
 * Parses a migration file (CSV or JSON) and returns structured data.
 */
export async function parseMigrationFile(fileContent, entityType) {
  try {
    // Try CSV first
    if (fileContent.trim().startsWith("[") || fileContent.trim().startsWith("{")) {
      const data = JSON.parse(fileContent);
      const rows = Array.isArray(data) ? data : [data];
      return {
        totalRows: rows.length,
        rows,
        format: "json",
      };
    }

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    return {
      totalRows: records.length,
      rows: records,
      format: "csv",
    };
  } catch (error) {
    return {
      error: `Could not parse file: ${error.message}. Please ensure it's valid CSV or JSON.`,
    };
  }
}

/**
 * Normalizes a product row from various platform formats to Shopify format.
 */
export function normalizeProduct(row, sourcePlatform) {
  // Common field mappings across platforms
  const title =
    row.Name ||
    row.name ||
    row.Title ||
    row.title ||
    row.product_name ||
    row["Product Name"] ||
    "";

  const description =
    row.Description ||
    row.description ||
    row["Short description"] ||
    row.body_html ||
    "";

  const rawPrice =
    row.Price ||
    row.price ||
    row["Regular price"] ||
    row.regular_price ||
    row.variant_price ||
    "0";
  const price = parseFloat(rawPrice) || 0;

  const sku = row.SKU || row.sku || row.Sku || "";
  const inventory = parseInt(
    row.Stock || row.stock || row.inventory_quantity || row.Quantity || 0
  );

  const vendor = row.Vendor || row.vendor || row.Brand || row.brand || "";
  const productType =
    row.Type || row.type || row["Product type"] || row.Categories || "";

  const images = extractImages(row);

  return {
    title: title.toString().trim(),
    descriptionHtml: description.toString(),
    vendor: vendor.toString().trim(),
    productType: productType.toString().trim(),
    variants: [
      {
        sku: sku.toString().trim(),
        price: price.toFixed(2),
      },
    ],
    images: images.map((src) => ({ src })),
  };
}

/**
 * Normalizes a customer row to Shopify format.
 */
export function normalizeCustomer(row) {
  return {
    firstName: (row.first_name || row["First Name"] || row.firstname || "").toString().trim(),
    lastName: (row.last_name || row["Last Name"] || row.lastname || "").toString().trim(),
    email: (row.email || row.Email || "").toString().trim().toLowerCase(),
    phone: (row.phone || row.Phone || row.telephone || "").toString().trim(),
    acceptsMarketing:
      row.accepts_marketing === "yes" ||
      row.accepts_marketing === "true" ||
      row.accepts_marketing === true,
  };
}

/**
 * Normalizes an order row from various platform formats to Shopify draft order format.
 * Supports WooCommerce, BigCommerce, and generic CSV formats.
 */
export function normalizeOrder(row, sourcePlatform) {
  // Extract customer info
  const customerEmail = (
    row.customer_email ||
    row["Customer Email"] ||
    row.email ||
    row.Email ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  const customerFirstName = (
    row.customer_first_name ||
    row["Customer First Name"] ||
    row.first_name ||
    row["First Name"] ||
    ""
  )
    .toString()
    .trim();

  const customerLastName = (
    row.customer_last_name ||
    row["Customer Last Name"] ||
    row.last_name ||
    row["Last Name"] ||
    ""
  )
    .toString()
    .trim();

  // Extract order items (line items)
  // For single-item orders, parse directly from row
  const lineItems = [];

  // Try to extract product title and quantity
  const productTitle =
    row.product_title ||
    row["Product Title"] ||
    row.product_name ||
    row["Product Name"] ||
    row.title ||
    row.Title ||
    "";

  const quantity = parseInt(
    row.quantity ||
      row.Quantity ||
      row.qty ||
      row.line_quantity ||
      1
  );

  const price = parseFloat(
    row.price ||
      row.Price ||
      row.line_price ||
      row["Line Price"] ||
      row.product_price ||
      0
  );

  const sku = row.sku || row.SKU || row.Sku || "";

  if (productTitle) {
    lineItems.push({
      title: productTitle.toString().trim(),
      quantity,
      price: price.toFixed(2),
      sku: sku.toString().trim(),
    });
  }

  // Extract order totals
  const subtotalPrice = parseFloat(
    row.subtotal ||
    row.Subtotal ||
    row.subtotal_price ||
    row["Subtotal Price"] ||
    row.total ||
    row.Total ||
    0
  );

  const taxPrice = parseFloat(
    row.tax ||
    row.Tax ||
    row.tax_price ||
    row["Tax Price"] ||
    row.total_tax ||
    row["Total Tax"] ||
    0
  );

  const shippingPrice = parseFloat(
    row.shipping ||
    row.Shipping ||
    row.shipping_price ||
    row["Shipping Price"] ||
    row.total_shipping ||
    row["Total Shipping"] ||
    0
  );

  // Extract order date
  const orderDate =
    row.order_date ||
    row["Order Date"] ||
    row.date ||
    row.Date ||
    row.created_at ||
    row["Created At"] ||
    new Date().toISOString();

  // Extract order number/ID
  const orderNumber =
    row.order_number ||
    row["Order Number"] ||
    row.order_id ||
    row["Order ID"] ||
    row.id ||
    row.ID ||
    "";

  // Extract billing address
  const billingAddress = {
    firstName: customerFirstName,
    lastName: customerLastName,
    address1: (
      row.billing_address_1 ||
      row["Billing Address 1"] ||
      row.address_1 ||
      row["Address 1"] ||
      ""
    )
      .toString()
      .trim(),
    address2: (
      row.billing_address_2 ||
      row["Billing Address 2"] ||
      row.address_2 ||
      row["Address 2"] ||
      ""
    )
      .toString()
      .trim(),
    city: (
      row.billing_city ||
      row["Billing City"] ||
      row.city ||
      row.City ||
      ""
    )
      .toString()
      .trim(),
    province: (
      row.billing_state ||
      row["Billing State"] ||
      row.state ||
      row.State ||
      row.province ||
      row.Province ||
      ""
    )
      .toString()
      .trim(),
    zip: (
      row.billing_postcode ||
      row["Billing Postcode"] ||
      row.postcode ||
      row.Postcode ||
      row.zip ||
      row.Zip ||
      ""
    )
      .toString()
      .trim(),
    country: (
      row.billing_country ||
      row["Billing Country"] ||
      row.country ||
      row.Country ||
      ""
    )
      .toString()
      .trim(),
    phone: (row.phone || row.Phone || "").toString().trim(),
  };

  return {
    lineItems,
    customer: {
      firstName: customerFirstName,
      lastName: customerLastName,
      email: customerEmail,
    },
    billingAddress,
    shippingAddress: billingAddress, // Use billing as shipping if not specified
    email: customerEmail,
    note: (row.note || row.Note || row.order_notes || row["Order Notes"] || "")
      .toString()
      .trim(),
    tags: (row.tags || row.Tags || "").toString().trim(),
    customAttributes: [
      {
        key: "source_order_number",
        value: orderNumber.toString(),
      },
    ],
  };
}

/**
 * Normalizes a collection row to Shopify format.
 */
export function normalizeCollection(row) {
  const title =
    row.Title ||
    row.title ||
    row.Name ||
    row.name ||
    row.collection_title ||
    "";

  const description =
    row.Description ||
    row.description ||
    row.body_html ||
    row.collection_description ||
    "";

  const images = extractImages(row);

  return {
    title: title.toString().trim(),
    descriptionHtml: description.toString(),
    image: images.length > 0 ? { src: images[0] } : undefined,
  };
}

function extractImages(row) {
  const images = [];
  const imageFields = [
    "Images",
    "images",
    "Image",
    "image",
    "image_url",
    "Image URL",
    "featured_image",
  ];

  for (const field of imageFields) {
    if (row[field]) {
      const value = row[field].toString();
      // Images often comma-separated
      images.push(
        ...value
          .split(/[,|]/)
          .map((url) => url.trim())
          .filter((url) => url.startsWith("http"))
      );
    }
  }

  return images;
}
