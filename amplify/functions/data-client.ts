import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";

/**
 * GraphQL client for calling the Amplify data API from a function that was
 * granted schema access via `a.allow.resource(...)`. The endpoint env var is
 * injected by backend-data at deploy time; requests are signed with the
 * function's own IAM execution role credentials.
 *
 * Note: this beta of backend-data names the env var `${defineData props.name}_GRAPHQL_ENDPOINT`,
 * which is why data/resource.ts sets `name: "amplifyData"`.
 */
const endpoint =
  process.env.amplifyData_GRAPHQL_ENDPOINT ??
  process.env.undefined_GRAPHQL_ENDPOINT;

if (!endpoint) {
  throw new Error(
    "GraphQL endpoint env var is not set; was this function granted schema access with a.allow.resource()?",
  );
}

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint,
        region: process.env.AWS_REGION,
        defaultAuthMode: "iam",
      },
    },
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            sessionToken: process.env.AWS_SESSION_TOKEN!,
          },
        }),
        clearCredentialsAndIdentityId: () => {
          // execution role credentials are managed by the Lambda runtime
        },
      },
    },
  },
);

const client = generateClient();

export type LinkRecord = {
  id: string;
  hash: string;
  destinationUrl: string;
  createdAt: string;
  updatedAt: string;
};

export const listAllLinks = async (): Promise<LinkRecord[]> => {
  const links: LinkRecord[] = [];
  let nextToken: string | null = null;
  do {
    const result = (await client.graphql({
      query: /* GraphQL */ `
        query ListLinks($nextToken: String) {
          listLinks(limit: 1000, nextToken: $nextToken) {
            items {
              id
              hash
              destinationUrl
              createdAt
              updatedAt
            }
            nextToken
          }
        }
      `,
      variables: { nextToken },
      authMode: "iam",
    })) as {
      data: { listLinks: { items: LinkRecord[]; nextToken: string | null } };
    };
    links.push(...result.data.listLinks.items);
    nextToken = result.data.listLinks.nextToken;
  } while (nextToken);
  return links;
};

export const findLinksByHash = async (hash: string): Promise<LinkRecord[]> => {
  const result = (await client.graphql({
    query: /* GraphQL */ `
      query LinksByHash($hash: String!) {
        listLinks(filter: { hash: { eq: $hash } }, limit: 1000) {
          items {
            id
            hash
            destinationUrl
            createdAt
            updatedAt
          }
        }
      }
    `,
    variables: { hash },
    authMode: "iam",
  })) as { data: { listLinks: { items: LinkRecord[] } } };
  return result.data.listLinks.items;
};

export const createLinkRecord = async (
  hash: string,
  destinationUrl: string,
): Promise<LinkRecord> => {
  const result = (await client.graphql({
    query: /* GraphQL */ `
      mutation CreateLink($input: CreateLinkInput!) {
        createLink(input: $input) {
          id
          hash
          destinationUrl
          createdAt
          updatedAt
        }
      }
    `,
    variables: { input: { hash, destinationUrl } },
    authMode: "iam",
  })) as { data: { createLink: LinkRecord } };
  return result.data.createLink;
};

export const deleteLinkRecord = async (id: string): Promise<void> => {
  await client.graphql({
    query: /* GraphQL */ `
      mutation DeleteLink($input: DeleteLinkInput!) {
        deleteLink(input: $input) {
          id
        }
      }
    `,
    variables: { input: { id } },
    authMode: "iam",
  });
};
