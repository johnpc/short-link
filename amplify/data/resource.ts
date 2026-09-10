import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { createLink } from "../functions/create-link/resource";
import { rescanLinks } from "../functions/rescan-links/resource";

const schema = a
  .schema({
    Link: a
      .model({
        hash: a.string().required(),
        destinationUrl: a.string().required(),
      })
      // Read-only for the public: redirects still work, but links can only be
      // created through the moderated createShortLink mutation below.
      .authorization([a.allow.public("iam").to(["read"])])
      .secondaryIndexes([a.index("hash")]),

    createShortLink: a
      .mutation()
      .arguments({
        hash: a.string().required(),
        destinationUrl: a.string().required(),
      })
      .returns(a.ref("Link"))
      .handler(a.handler.function(createLink))
      .authorization([a.allow.public("iam")]),
  })
  .authorization([a.allow.resource(createLink), a.allow.resource(rescanLinks)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  // The name determines the `<name>_GRAPHQL_ENDPOINT` env var injected into
  // functions granted schema access — without it this backend version would
  // name the var `undefined_GRAPHQL_ENDPOINT`.
  name: "amplifyData",
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "iam",
  },
});
