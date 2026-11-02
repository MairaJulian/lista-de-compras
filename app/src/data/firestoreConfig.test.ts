import { FIRESTORE_CACHE_BYTES, configureFirestore } from './firestoreConfig';

jest.unmock('./firestoreConfig');

const mockInitialize = jest.fn();

jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({ name: '[DEFAULT]' }) }));
jest.mock('@react-native-firebase/firestore', () => ({
  initializeFirestore: (...args: unknown[]) => mockInitialize(...args),
}));

describe('configureFirestore', () => {
  it('deja la copia local activada y con un tamaño definido, una sola vez', () => {
    configureFirestore();
    configureFirestore();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith(
      { name: '[DEFAULT]' },
      { persistence: true, cacheSizeBytes: FIRESTORE_CACHE_BYTES },
    );
  });

  it('el tamaño es de 100 MB, por encima del mínimo de 1 MB que acepta Firestore', () => {
    expect(FIRESTORE_CACHE_BYTES).toBe(100 * 1024 * 1024);
  });
});
