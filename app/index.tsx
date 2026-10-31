import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const activeStoreId = useAuthStore((s) => s.activeStoreId);
  return activeStoreId ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login" />;
}
