import { requireOptionalNativeModule } from 'expo-modules-core';

export type Insets = { top: number; bottom: number; left: number; right: number };

type SystemInsetsModule = { getInsets(): Insets | null };

/** `null` si no está el módulo nativo (tests, Expo Go) */
export const SystemInsets = requireOptionalNativeModule<SystemInsetsModule>('SystemInsets');
