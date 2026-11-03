import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const { isInitialized, activeStoreId } = useAuthStore();

  // Prevent premature redirect race condition on cold start
  if (!isInitialized) {
    return null;
  }

  return activeStoreId ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login" />;
}
