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

// Crashlytics es nativo: en los tests no se registra nada.
jest.mock('./src/data/crashReporting', () => ({
  startCrashReporting: jest.fn(),
  setCrashReportingUser: jest.fn(),
  triggerTestCrash: jest.fn(),
}));

// La copia local de Firestore es nativa: en los tests no se configura.
jest.mock('./src/data/firestoreConfig', () => ({ configureFirestore: jest.fn() }));

// Lo mismo con el hogar: la lectura y la creación en Firestore las controla cada prueba (la
// implementación real se prueba en `householdSource.test.ts`).
jest.mock('./src/data/householdSource', () => ({
  watchHousehold: jest.fn(() => () => {}),
  createHousehold: jest.fn(),
  renameHousehold: jest.fn(),
  removeMemberFromHousehold: jest.fn(),
  leaveCurrentHousehold: jest.fn(),
  forgetHousehold: jest.fn(() => Promise.resolve()),
  setHouseholdArchived: jest.fn(() => Promise.resolve()),
  isActiveMember: jest.fn(() => Promise.resolve(true)),
}));

// Los grupos de la persona (`47`, `48`): la lectura y el cambio de grupo los controla cada prueba (la
// implementación real se prueba en `groupSource.test.ts`).
jest.mock('./src/data/groupSource', () => ({
  fetchMyGroups: jest.fn(() => Promise.resolve([])),
  switchToGroup: jest.fn(() => Promise.resolve()),
  currentUserId: jest.fn(() => 'u1'),
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

// Las listas y los ítems del hogar, igual: la lectura y las escrituras en Firestore las controla cada
// prueba (la implementación real se prueba en `listSource.test.ts`).
jest.mock('./src/data/listSource', () => ({
  watchHouseholdData: jest.fn(() => () => {}),
  createList: jest.fn(() => ({ id: 'lista-nueva', saved: Promise.resolve() })),
  addItem: jest.fn(() => ({ id: 'item-nuevo', saved: Promise.resolve() })),
  setItemDone: jest.fn(() => Promise.resolve()),
  updateItemFields: jest.fn(() => Promise.resolve()),
  setItemDeleted: jest.fn(() => Promise.resolve()),
  renameList: jest.fn(() => Promise.resolve()),
  setListDeleted: jest.fn(() => Promise.resolve()),
}));

// La presencia y la purga también hablan con Firestore: cada prueba las controla (la implementación
// real se prueba en `presenceSource.test.ts` y `purgeSource.test.ts`).
jest.mock('./src/data/presenceSource', () => ({
  startPresence: jest.fn(() => () => {}),
  writePresence: jest.fn(() => Promise.resolve()),
  readPresencesFromServer: jest.fn(() => Promise.resolve([])),
  canCleanUpList: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('./src/data/purgeSource', () => ({
  purgeExpired: jest.fn(() => Promise.resolve(0)),
  purgeOncePerOpening: jest.fn(() => Promise.resolve()),
  resetPurgeRuns: jest.fn(),
}));
