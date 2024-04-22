"use client";
import "@aws-amplify/ui-react/styles.css";
import { ChangeEvent, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Button, Card, Link, Grid, Input } from "@aws-amplify/ui-react";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import config from "../../amplifyconfiguration.json";
import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
Amplify.configure(config);
const client = generateClient<Schema>();

const makeHash = (length: number): string => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

export default function Home() {
  const [href, setHref] = useState<string>("");
  const [destinationUrl, setDestinationUrl] = useState<string>("");
  const [hash] = useState(makeHash(5));
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState(false);
  const [isValidUrlInput, setIsValidUrlInput] = useState(false);

  useEffect(() => {
    setHref(window.location.href);
  }, []);

  const onCreateShortLink = async () => {
    if (!isValidUrl(destinationUrl)) {
      alert('Destination url is not valid');
      return;
    }

    const createdLink = await client.models.Link.create({
      hash,
      destinationUrl,
    });
    if (createdLink.errors) {
      console.error({ error: createdLink.errors });
      alert("Failed to create link. Try again.");
    }
    setCreated(true);
  };

  const isValidUrl = (url: string): boolean => {
      try {
      	return Boolean(new URL(url));
      }
      catch(e){
      	return false;
      }
  }

  const onDesiredShortLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDestinationUrl(e.target.value)
    if (!isValidUrl(e.target.value)) {
      setIsValidUrlInput(false);
      return;
    }
    setIsValidUrlInput(true);
  }

  const hashUrl = `${href}${href.endsWith("/") ? "" : "/"}${hash}`;
  return (
    <>
      <Header />
      <>
        <Card variation="outlined" textAlign={"center"}>
          <Grid
            columnGap="0.5rem"
            rowGap="0.5rem"
            templateColumns={{ base: "1fr", large: "1fr 1fr" }}
            templateRows={{ base: "1fr 1fr", large: "1fr" }}
          >
            {created ? (
              <>
                <Link
                  padding={"10px"}
                  width={"100%"}
                  margin={"auto"}
                  textAlign={"center"}
                  href={hash}
                  borderStyle={"dotted"}
                >
                  {hashUrl}
                </Link>
                <CopyToClipboard
                  text={hashUrl}
                  onCopy={() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1000);
                  }}
                >
                  <Button colorTheme={copied ? "success" : undefined}>
                    {copied ? "✅" : "Copy to Clipboard"}
                  </Button>
                </CopyToClipboard>
              </>
            ) : (
              <>
                <Input
                  placeholder="https://example.com"
                  size="large"
                  value={destinationUrl}
                  onChange={onDesiredShortLinkChange}
                  hasError={!isValidUrlInput}
                />
                <Button
                  disabled={!isValidUrlInput}
                  onClick={onCreateShortLink}>
                    Create Shortlink
                </Button>
              </>
            )}
          </Grid>
        </Card>
      </>
      <Footer />
    </>
  );
}
