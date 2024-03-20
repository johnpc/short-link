import {
  Card,
  Image,
  View,
  Heading,
  Flex,
  Text,
  Button,
  useTheme,
} from "@aws-amplify/ui-react";

export const Footer = () => {
  const { tokens } = useTheme();
  return (
    <View
      backgroundColor={tokens.colors.background.secondary}
      padding={tokens.space.medium}
    >
      <Card>
        <Flex direction="row" alignItems="flex-start">
          <Flex
            direction="column"
            alignItems="flex-start"
            gap={tokens.space.xs}
          >
            <Heading level={6}>
              s.jpc.io is free to use, powered completely by your donations.
            </Heading>
            <Text as="span"></Text>
            <Flex direction="row" alignItems="flex-start" gap={tokens.space.xs}>
              <Button
                as="a"
                href="bitcoin:bc1q5k3w6cn9sd263hyv8eamvwrnzm0l6slcn49xd0?label=a2imgur&message=Hosting%20Costs"
              >
                <Image alt="bitcoin" src="/bitcoin.png" /> &nbsp; Bitcoin
              </Button>
              <Button
                as="a"
                href="https://www.paypal.com/donate/?hosted_button_id=3T9XCAW5J5FSL"
              >
                <Image alt="paypal" src="/paypal.png" /> &nbsp; Paypal
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </View>
  );
};
