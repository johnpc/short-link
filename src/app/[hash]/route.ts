export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { Amplify } from "aws-amplify";
import config from "../../../amplifyconfiguration.json";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

Amplify.configure(config);
const client = generateClient<Schema>();
export async function GET(
  req: Request,
  { params }: { params: { hash: string } },
) {
  const hash = params.hash;
  console.log({ url: req.url });
  const links = await client.models.Link.listByHash({ hash });
  if (links.errors || links.data.length === 0) {
    console.error({ errors: links.errors });
    return NextResponse.redirect(`${req.url}/notfound`, {
      url: `${req.url}/notfound`,
    });
  }
  const link = links.data[0];
  return NextResponse.redirect(link.destinationUrl, {
    url: link.destinationUrl,
  });
}
