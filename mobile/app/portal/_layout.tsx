import { Stack } from 'expo-router';

export default function PortalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#05070D' },
      }}
    />
  );
}
