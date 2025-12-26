import { Card, useThemeColor } from "heroui-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { authClient } from "@/lib/auth-client";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const foregroundColor = useThemeColor("foreground");
  const dangerColor = useThemeColor("danger");

  async function handleLogin() {
    setIsLoading(true);
    setError(null);

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError(error) {
          setError(error.error?.message || "Failed to sign in");
          setIsLoading(false);
        },
        onSuccess() {
          setEmail("");
          setPassword("");
        },
        onFinished() {
          setIsLoading(false);
        },
      }
    );
  }

  return (
    <Card className="mt-6 p-4" variant="secondary">
      <Card.Title className="mb-4">Sign In</Card.Title>

      {error ? (
        <View className="mb-4 rounded-lg bg-danger/10 p-3">
          <Text className="text-danger text-sm">{error}</Text>
        </View>
      ) : null}

      <TextInput
        autoCapitalize="none"
        className="mb-3 rounded-lg border border-divider bg-surface px-4 py-3 text-foreground"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={mutedColor}
        value={email}
      />

      <TextInput
        className="mb-4 rounded-lg border border-divider bg-surface px-4 py-3 text-foreground"
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={mutedColor}
        secureTextEntry
        value={password}
      />

      <Pressable
        className="flex-row items-center justify-center rounded-lg bg-accent p-4 active:opacity-70"
        disabled={isLoading}
        onPress={handleLogin}
      >
        {isLoading ? (
          <ActivityIndicator color={foregroundColor} size="small" />
        ) : (
          <Text className="font-medium text-foreground">Sign In</Text>
        )}
      </Pressable>
    </Card>
  );
}

export { SignIn };
