import { Card, useThemeColor } from "heroui-native";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session } = authClient.useSession();

  const mutedColor = useThemeColor("muted");
  const successColor = useThemeColor("success");
  const dangerColor = useThemeColor("danger");
  const foregroundColor = useThemeColor("foreground");

  return (
    <Container className="p-6">
      <View className="mb-6 py-4">
        <Text className="mb-2 font-bold text-4xl text-foreground">
          BETTER T STACK
        </Text>
      </View>

      {session?.user ? (
        <Card className="mb-6 p-4" variant="secondary">
          <Text className="mb-2 text-base text-foreground">
            Welcome, <Text className="font-medium">{session.user.name}</Text>
          </Text>
          <Text className="mb-4 text-muted text-sm">{session.user.email}</Text>
          <Pressable
            className="self-start rounded-lg bg-danger px-4 py-3 active:opacity-70"
            onPress={() => {
              authClient.signOut();
            }}
          >
            <Text className="font-medium text-foreground">Sign Out</Text>
          </Pressable>
        </Card>
      ) : null}

      {!session?.user && (
        <>
          <SignIn />
          <SignUp />
        </>
      )}
    </Container>
  );
}
