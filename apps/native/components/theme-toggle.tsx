import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { withUniwind } from "uniwind";

import { useAppTheme } from "@/contexts/app-theme-context";

const StyledIonicons = withUniwind(Ionicons);

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme();

  return (
    <Pressable
      className="px-2.5"
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        toggleTheme();
      }}
    >
      {isLight ? (
        <Animated.View entering={ZoomIn} exiting={FadeOut} key="moon">
          <StyledIonicons className="text-foreground" name="moon" size={20} />
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn} exiting={FadeOut} key="sun">
          <StyledIonicons className="text-foreground" name="sunny" size={20} />
        </Animated.View>
      )}
    </Pressable>
  );
}
