import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
const schema = a.schema({
  Link: a
    .model({
      hash: a.string().required(),
      destinationUrl: a.string().required(),
    })
    .authorization([a.allow.public("iam")])
    .secondaryIndexes([a.index("hash")]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
  },
});
