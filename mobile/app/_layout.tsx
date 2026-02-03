import { Stack } from 'expo-router';
import { View } from "react-native";

export default function RootLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Stack screenOptions={{
                headerStyle: { backgroundColor: 'white' },
                headerTintColor: '#0f172a',
                headerTitleStyle: { fontWeight: 'bold' },
                contentStyle: { backgroundColor: '#f8fafc' }
            }}>
                <Stack.Screen name="index" options={{ title: 'Safety Dashboard' }} />
            </Stack>
        </View>
    );
}
