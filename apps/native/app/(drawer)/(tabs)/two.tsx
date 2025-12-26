import { Card } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";

export default function TabTwo() {
  return (
    <Container className="p-6">
      <View className="flex-1 items-center justify-center">
        <Card className="items-center p-8" variant="secondary">
          <Card.Title className="mb-2 text-3xl">TabTwo</Card.Title>
        </Card>
      </View>
    </Container>
  );
}
