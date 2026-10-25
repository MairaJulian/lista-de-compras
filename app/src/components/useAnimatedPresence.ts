import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { motion } from '../theme';

/**
 * Mantiene montado un panel o aviso mientras dura la animación de salida.
 * Devuelve `mounted` (si hay que renderizarlo) y `progress` (0 = oculto, 1 = visible).
 */
export function useAnimatedPresence(visible: boolean, duration: number) {
  const [progress] = useState(() => new Animated.Value(0));
  const [hidden, setHidden] = useState(!visible);

  if (visible && hidden) {
    setHidden(false);
  }

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration : motion.overlayDuration,
      easing: visible ? Easing.bezier(0.2, 0.8, 0.2, 1) : Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setHidden(true);
      }
    });
    return () => animation.stop();
  }, [visible, duration, progress]);

  return { mounted: visible || !hidden, progress };
}
