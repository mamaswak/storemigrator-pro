import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Link,
  Button,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export default function Support() {
  return (
    <Page
      title="Support & help"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Get help with your migration
              </Text>
              <Text variant="bodyMd" as="p">
                Our support team typically responds within 24 hours (Pro users
                get priority response within 4 business hours).
              </Text>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">
                  Email support
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="mailto:support@storemigrator.app">
                    support@storemigrator.app
                  </Link>
                </Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text variant="headingSm" as="h3">
                  Documentation
                </Text>
                <Text variant="bodyMd" as="p">
                  <Link url="https://docs.storemigrator.app" external>
                    docs.storemigrator.app
                  </Link>
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Common questions
              </Text>
              <BlockStack gap="300">
                <FAQ
                  question="My migration is stuck in 'processing' — what should I do?"
                  answer="Large migrations can take up to 30 minutes. If a job has been processing for more than an hour, contact support with your job ID."
                />
                <FAQ
                  question="Some of my product images didn't import"
                  answer="This usually happens when the source platform blocks image hotlinking. Contact support — we can help you re-import images via direct upload."
                />
                <FAQ
                  question="How do I handle 301 redirects after migration?"
                  answer="Pro users get automatic redirect file generation. Upload the generated CSV to Shopify Admin > Online Store > Navigation > URL Redirects."
                />
                <FAQ
                  question="Can I re-run a migration?"
                  answer="Yes. If you re-upload the same file, duplicate items will be skipped automatically based on SKU or email."
                />
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function FAQ({ question, answer }) {
  return (
    <BlockStack gap="100">
      <Text variant="headingSm" as="h3">
        {question}
      </Text>
      <Text variant="bodyMd" as="p">
        {answer}
      </Text>
    </BlockStack>
  );
}
