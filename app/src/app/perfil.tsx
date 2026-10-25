import { router } from 'expo-router';
import { Alert } from 'react-native';

import { signOut } from '../auth/sessionStore';
import { ProfileScreen } from '../screens/ProfileScreen';

export default function ProfileRoute() {
  // Al cerrarse la sesión, las rutas protegidas llevan solas a Bienvenida.
  const onSignOut = () =>
    signOut().catch(() =>
      Alert.alert('No pudimos cerrar la sesión', 'Probá de nuevo en unos segundos.'),
    );

  return <ProfileScreen onBack={() => router.back()} onSignOut={onSignOut} />;
}
