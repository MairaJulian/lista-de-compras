// Los glifos vienen de una fuente que jest no puede cargar: se reemplazan por un texto con el nombre.
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

// La sesión de Firebase es nativa: en los tests la controla cada prueba (la implementación real se
// prueba en `sessionSource.test.ts`).
jest.mock('./src/auth/sessionSource', () => ({
  watchSession: jest.fn(() => () => {}),
  signOutEverywhere: jest.fn(async () => {}),
}));

// Lo mismo con el hogar: la lectura y la creación en Firestore las controla cada prueba (la
// implementación real se prueba en `householdSource.test.ts`).
jest.mock('./src/data/householdSource', () => ({
  watchHousehold: jest.fn(() => () => {}),
  createHousehold: jest.fn(),
  renameHousehold: jest.fn(),
}));

// Lo mismo con las invitaciones.
jest.mock('./src/data/inviteSource', () => ({
  watchInvite: jest.fn(() => () => {}),
  createInvite: jest.fn(),
  revokeInvite: jest.fn(),
}));

// Y unirse a un hogar.
jest.mock('./src/data/joinSource', () => ({
  readInvitePreview: jest.fn(),
  joinHousehold: jest.fn(),
}));
