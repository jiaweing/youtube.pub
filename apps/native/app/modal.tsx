import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Card, useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";

function Modal() {
  const accentForegroundColor = useThemeColor("accent-foreground");

  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View className="flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm p-6" variant="secondary">
          <Card.Body className="items-center gap-4">
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Ionicons
                color={accentForegroundColor}
                name="checkmark"
                size={32}
              />
            </View>
            <Card.Title className="text-center text-xl">
              Modal Screen
            </Card.Title>
            <Card.Description className="text-center">
              This is an example modal screen. You can use this pattern for
              dialogs, confirmations, or any overlay content.
            </Card.Description>
          </Card.Body>
          <Card.Footer className="mt-4">
            <Pressable
              className="w-full rounded-lg bg-accent p-4 active:opacity-70"
              onPress={handleClose}
            >
              <View className="flex-row items-center justify-center">
                <Text className="mr-2 font-semibold text-accent-foreground text-base">
                  Close Modal
                </Text>
                <Ionicons
                  color={accentForegroundColor}
                  name="close-circle"
                  size={20}
                />
              </View>
            </Pressable>
          </Card.Footer>
        </Card>
      </View>
    </Container>
  );
}

export default Modal;
