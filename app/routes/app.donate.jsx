import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useActionData,
  useNavigation,
} from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  TextField,
  Divider,
  Box,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 2000; // hard cap to avoid typos turning into nightmares

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const donations = await prisma.donation.findMany({
    where: { shopDomain, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

  return json({ donations, totalDonated });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const rawAmount = formData.get("amount");
  const amount = Number(rawAmount);

  // Validate
  if (!amount || Number.isNaN(amount) || amount < MIN_AMOUNT) {
    return json(
      { error: `Please enter an amount of at least $${MIN_AMOUNT}` },
      { status: 400 }
    );
  }
  if (amount > MAX_AMOUNT) {
    return json(
      { error: `Maximum donation amount is $${MAX_AMOUNT}` },
      { status: 400 }
    );
  }

  // Round to 2 decimals
  const cleanAmount = Math.round(amount * 100) / 100;

  // Create one-time charge via Shopify billing
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
        name: `Support StoreMigrator Pro - $${cleanAmount.toFixed(2)} tip`,
        price: { amount: cleanAmount, currencyCode: "USD" },
        returnUrl: `${process.env.SHOPIFY_APP_URL}/app/donate/callback?shop=${shopDomain}&amount=${cleanAmount}`,
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
    // Save a PENDING donation record so we can match the callback
    const purchaseId = data.appPurchaseOneTime?.id;
    if (purchaseId) {
      await prisma.donation.create({
        data: {
          shopDomain,
          amount: cleanAmount,
          chargeId: purchaseId,
          status: "PENDING",
        },
      });
    }
    return redirect(data.confirmationUrl);
  }

  return json({ error: "Unable to start donation. Please try again." }, { status: 500 });
};

export default function Donate() {
  const { donations, totalDonated } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [amount, setAmount] = useState("10");

  const handlePreset = (val) => setAmount(String(val));

  const numericAmount = Number(amount);
  const isValid =
    !Number.isNaN(numericAmount) &&
    numericAmount >= MIN_AMOUNT &&
    numericAmount <= MAX_AMOUNT;

  return (
    <Page
      title="Support StoreMigrator Pro 💛"
      subtitle="If this app saved you time or money, you can leave a tip"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {actionData?.error && (
          <Layout.Section>
            <Banner tone="critical" title="Could not start donation">
              <p>{actionData.error}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Leave a tip
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Charged to your Shopify billing — same method you use for
                  your monthly Shopify invoice. Pick a preset or enter any
                  amount in USD.
                </Text>
              </BlockStack>

              <InlineStack gap="200" wrap>
                {PRESET_AMOUNTS.map((preset) => (
                  <Button
                    key={preset}
                    onClick={() => handlePreset(preset)}
                    pressed={Number(amount) === preset}
                  >
                    ${preset}
                  </Button>
                ))}
              </InlineStack>

              <Form method="post">
                <BlockStack gap="400">
                  <TextField
                    label="Amount (USD)"
                    type="number"
                    name="amount"
                    value={amount}
                    onChange={setAmount}
                    prefix="$"
                    min={MIN_AMOUNT}
                    max={MAX_AMOUNT}
                    step={1}
                    autoComplete="off"
                    helpText={`Min $${MIN_AMOUNT} · Max $${MAX_AMOUNT}`}
                  />
                  <Button
                    submit
                    variant="primary"
                    size="large"
                    loading={isSubmitting}
                    disabled={!isValid || isSubmitting}
                  >
                    {isValid
                      ? `Donate $${numericAmount.toFixed(2)}`
                      : "Enter a valid amount"}
                  </Button>
                  <Text variant="bodySm" as="p" tone="subdued">
                    You'll be redirected to Shopify to confirm the charge,
                    then back to this app. Charge appears on your next
                    Shopify invoice.
                  </Text>
                </BlockStack>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        {totalDonated > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Your support so far
                </Text>
                <Text variant="heading2xl" as="p">
                  ${totalDonated.toFixed(2)}
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Total contributed across {donations.length}{" "}
                  {donations.length === 1 ? "donation" : "donations"}.
                  Thank you 🙏
                </Text>

                {donations.length > 0 && (
                  <>
                    <Divider />
                    <BlockStack gap="200">
                      {donations.map((d) => (
                        <InlineStack
                          key={d.id}
                          align="space-between"
                          blockAlign="center"
                        >
                          <Text variant="bodyMd" as="p">
                            ${d.amount.toFixed(2)}
                          </Text>
                          <Text variant="bodySm" as="p" tone="subdued">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Where the money goes
              </Text>
              <Text variant="bodyMd" as="p">
                Tips go directly to the team behind StoreMigrator Pro to keep
                the app running, fund new features, and support customer
                service. Donations are completely optional — the app's
                features are not affected by tipping.
              </Text>
              <Box>
                <Text variant="bodySm" as="p" tone="subdued">
                  Charges are processed by Shopify and appear on your next
                  Shopify subscription invoice. There is no recurring charge
                  — each tip is a one-time payment.
                </Text>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
