import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function IconoTab({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: () => <IconoTab emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="nuevo"
        options={{
          title: 'Agregar',
          tabBarIcon: () => <IconoTab emoji="➕" />,
        }}
      />
      <Tabs.Screen
        name="grupo"
        options={{
          title: 'Grupos',
          tabBarIcon: () => <IconoTab emoji="👥" />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: () => <IconoTab emoji="👤" />,
        }}
      />
    </Tabs>
  );
}
