"use client";
import "@aws-amplify/ui-react/styles.css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Button, Card, Link, Grid, Input } from "@aws-amplify/ui-react";

import { Footer } from "../../components/footer";
import { Header } from "../../components/header";
const css = `.custom-card-class {
  border: 3px solid red;
  color: red
}`;
export default function NotFound(props: {params: {hash: string}}) {
  console.log(props)
  return (
    <>
      <Header />
      <>
        <style>{css}</style>
        <Card variation="elevated" className="custom-card-class">
          Error: No link exists for hash {props.params.hash}
        </Card>
      </>
      <Footer />
    </>
  );
}
