import { defineBackend } from "@aws-amplify/backend";
import { Duration, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Function } from "aws-cdk-lib/aws-lambda";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { createLink } from "./functions/create-link/resource";
import { rescanLinks } from "./functions/rescan-links/resource";

const backend = defineBackend({
  auth,
  data,
  createLink,
  rescanLinks,
});

const createLinkLambda = backend.createLink.resources.lambda as Function;
const rescanLinksLambda = backend.rescanLinks.resources.lambda as Function;

// Everything below lives in the functions stack to avoid cross-stack cycles
// with the data stack (which already references these functions as handlers).
const functionsStack = Stack.of(createLinkLambda);

const rateLimitTable = new Table(functionsStack, "CreateLinkRateLimit", {
  partitionKey: { name: "pk", type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: "expiresAt",
});
rateLimitTable.grantReadWriteData(createLinkLambda);
createLinkLambda.addEnvironment(
  "RATE_LIMIT_TABLE_NAME",
  rateLimitTable.tableName,
);

new Rule(Stack.of(rescanLinksLambda), "DailyLinkRescan", {
  schedule: Schedule.rate(Duration.hours(24)),
  targets: [new LambdaFunction(rescanLinksLambda)],
});
