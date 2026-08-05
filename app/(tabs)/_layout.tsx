import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export const TAB_BAR_HEIGHT = 62;
export const TAB_BAR_MARGIN = 20;

const TABS: Record<string, { icon: IoniconName; outline: IoniconName; label: string }> = {
  index:       { icon: 'home',       outline: 'home-outline',       label: 'Inicio'      },
  grupo:       { icon: 'people',     outline: 'people-outline',     label: 'Grupos'      },
  actividad:   { icon: 'pulse',      outline: 'pulse-outline',      label: 'Actividad'   },
  presupuesto: { icon: 'bar-chart',  outline: 'bar-chart-outline',  label: 'Presupuestos' },
  perfil:      { icon: 'ellipsis-horizontal-circle', outline: 'ellipsis-horizontal-circle-outline', label: 'Más' },
};

type TabBarProps = {
  state: { routes: Array<{ key: string; name: string }>; index: number };
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (o: { name: string; merge: boolean }) => void;
  };
  t: Theme;
  bottom: number;
};

function CustomTabBar({ state, navigation, t, bottom }: TabBarProps) {
  return (
    <View
      style={[
        styles.bar,
        {
          bottom,
          backgroundColor: t.tabBarBg,
          shadowColor: t.isDark ? '#000' : '#1A1A2E',
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true });
              }
            }}
            onLongPress={() =>
              navigation.emit({ type: 'tabLongPress', target: route.key })
            }
            style={[styles.item, route.name === 'presupuesto' && { flex: 1.4 }]}
            android_ripple={{ color: 'transparent' }}
          >
            <View style={[styles.pill, focused && { backgroundColor: t.primary + '30' }]}>
              <Ionicons
                name={focused ? tab.icon : tab.outline}
                size={22}
                color={focused ? t.tabBarActive : t.tabBarInactive}
              />
              <Text
                style={[styles.label, { color: focused ? t.tabBarActive : t.tabBarInactive }, focused && styles.labelFocused]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const barBottom = 16;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <CustomTabBar
          state={props.state as TabBarProps['state']}
          navigation={props.navigation as TabBarProps['navigation']}
          t={t}
          bottom={barBottom}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="nuevo" options={{ href: null }} />
      <Tabs.Screen name="grupo" options={{ title: 'Grupos' }} />
      <Tabs.Screen name="actividad" options={{ title: 'Actividad' }} />
      <Tabs.Screen name="presupuesto" options={{ title: 'Presupuesto' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: TAB_BAR_MARGIN,
    right: TAB_BAR_MARGIN,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    borderRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 24,
  },
  item: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 6,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    gap: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelFocused: {
    fontWeight: '700',
  },
});
