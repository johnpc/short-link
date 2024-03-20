"use client";
import "@aws-amplify/ui-react/styles.css";
import { useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { useRouter } from "next/navigation";
import config from "../../../amplifyconfiguration.json";
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { Flex, Placeholder } from "@aws-amplify/ui-react";
Amplify.configure(config);
const client = generateClient<Schema>();

export default function Home(props: {params: {hash: string}}) {
	const hash = props?.params?.hash;
	const router = useRouter();
	const [destinationUrl, setDestinationUrl] = useState<string>("");
	const [error, setError] = useState<string>("");
	useEffect(() => {
		const setup = async () => {
			const links = await client.models.Link.listByHash({hash})
			if (links.errors || links.data.length === 0) {
				setError(`Link with hash ${hash} was not found`);
			}
			const link = links.data[0];
			setDestinationUrl(link.destinationUrl);
			router.push(link.destinationUrl);
		}
		setup();
	}, []);

	if (!error && !destinationUrl) {
		return <>
			<Flex direction="column">
				<Placeholder size="large" />
				<Placeholder size="large" />
				<Placeholder size="large" />
			</Flex>
		</>
	}

	if (error) {
		return <>{error}</>
	}

	return <>Redirecting to {destinationUrl}</>
}
