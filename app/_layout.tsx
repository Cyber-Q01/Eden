import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { UserProvider } from "../context/UserContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade'
          }}
        />
      </UserProvider>
    </ThemeProvider>
  );
}
