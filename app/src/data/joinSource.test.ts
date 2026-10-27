import { InviteInvalidError } from './joinLogic';
import { joinHousehold, readInvitePreview } from './joinSource';

jest.unmock('./joinSource');

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockRunTransaction = jest.fn();
const mockGetDocFromServer = jest.fn();
let mockCurrentUser: { uid: string } | null = { uid: 'u2' };

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({ currentUser: mockCurrentUser }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: (_db: unknown, ...segments: string[]) => ({
    path: segments.join('/'),
    id: segments[segments.length - 1],
  }),
  getDocFromServer: (...args: unknown[]) => mockGetDocFromServer(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  serverTimestamp: () => 'SERVER_TIME',
}));

const CODE = 'K7P2-9XQ-4MN';
const HOUR = 60 * 60 * 1000;
const snap = (data: object | undefined) => ({ exists: () => !!data, data: () => data });
const validInvite = () => ({
  hogarId: 'h1',
  creadaPor: 'u1',
  estado: 'activa',
  venceEn: { toMillis: () => Date.now() + HOUR },
  hogarNombre: 'Nuestra casa',
  invitadoPorNombre: 'Maira',
});
const account = { name: 'Lucía', photo: null };

/** Documentos que devuelve `transaction.get`, por ruta. */
function documents(byPath: Record<string, object | undefined>) {
  mockGet.mockImplementation(async (ref: { path: string }) => snap(byPath[ref.path]));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { uid: 'u2' };
  mockRunTransaction.mockImplementation((_db, update) =>
    update({ get: mockGet, set: mockSet, update: mockUpdate }),
  );
});

describe('readInvitePreview', () => {
  it('lee la invitación del servidor y devuelve el hogar y quién invitó', async () => {
    mockGetDocFromServer.mockResolvedValue(snap(validInvite()));

    await expect(readInvitePreview(CODE)).resolves.toEqual({
      code: CODE,
      householdName: 'Nuestra casa',
      invitedByName: 'Maira',
    });
    expect(mockGetDocFromServer).toHaveBeenCalledWith(
      expect.objectContaining({ path: `invitaciones/${CODE}` }),
    );
  });

  it.each([
    ['no existe', undefined],
    ['está revocada', { ...validInvite(), estado: 'revocada' }],
    ['venció', { ...validInvite(), venceEn: { toMillis: () => Date.now() - 1 } }],
  ])('rechaza con código inválido si %s', async (_case, data) => {
    mockGetDocFromServer.mockResolvedValue(snap(data));
    await expect(readInvitePreview(CODE)).rejects.toBeInstanceOf(InviteInvalidError);
  });

  it('no lee nada con un código que no puede ser de una invitación (arma rutas raras)', async () => {
    await expect(readInvitePreview('a/b')).rejects.toBeInstanceOf(InviteInvalidError);
    expect(mockGetDocFromServer).not.toHaveBeenCalled();
  });

  it('sin conexión rechaza con el error original (no es un código inválido)', async () => {
    mockGetDocFromServer.mockRejectedValue(new Error('unavailable'));
    await expect(readInvitePreview(CODE)).rejects.toThrow('unavailable');
  });

  it('sin sesión no lee', async () => {
    mockCurrentUser = null;
    await expect(readInvitePreview(CODE)).rejects.toThrow('sesión');
    expect(mockGetDocFromServer).not.toHaveBeenCalled();
  });
});

describe('joinHousehold', () => {
  it('crea el miembro con rol miembro y la invitación, y apunta hogarActualId, en una transacción', async () => {
    documents({ [`invitaciones/${CODE}`]: validInvite(), 'usuarios/u2': { nombre: 'Lucía' } });

    await joinHousehold(CODE, account);

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [ref, data] = mockSet.mock.calls[0];
    expect(ref.path).toBe('hogares/h1/miembros/u2');
    expect(data).toEqual({
      nombre: 'Lucía',
      foto: null,
      colorAvatar: expect.any(String),
      rol: 'miembro',
      estado: 'activo',
      desde: 'SERVER_TIME',
      hasta: null,
      invitacionId: CODE,
      invitadoPor: 'u1',
    });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'usuarios/u2' }), {
      hogarActualId: 'h1',
    });
  });

  it.each(['salio', 'quitado'])(
    'quien había %s vuelve a unirse: se reescribe su miembro como activo',
    async (estado) => {
      documents({
        [`invitaciones/${CODE}`]: validInvite(),
        'hogares/h1/miembros/u2': { estado, rol: 'miembro' },
        'usuarios/u2': { nombre: 'Lucía' },
      });

      await joinHousehold(CODE, account);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'hogares/h1/miembros/u2' }),
        expect.objectContaining({ estado: 'activo', rol: 'miembro', hasta: null }),
      );
    },
  );

  it('si ya figuraba activa en ese hogar solo apunta hogarActualId', async () => {
    documents({
      [`invitaciones/${CODE}`]: validInvite(),
      'hogares/h1/miembros/u2': { estado: 'activo', rol: 'miembro' },
      'usuarios/u2': { nombre: 'Lucía' },
    });

    await joinHousehold(CODE, account);

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ path: 'usuarios/u2' }), {
      hogarActualId: 'h1',
    });
  });

  it.each([
    ['no existe', undefined],
    ['está revocada', { ...validInvite(), estado: 'revocada' }],
    ['venció', { ...validInvite(), venceEn: { toMillis: () => Date.now() - 1 } }],
  ])('si la invitación %s rechaza con código inválido y no escribe nada', async (_case, data) => {
    documents({ [`invitaciones/${CODE}`]: data, 'usuarios/u2': { nombre: 'Lucía' } });

    await expect(joinHousehold(CODE, account)).rejects.toBeInstanceOf(InviteInvalidError);
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('no escribe nada si no existe el documento de la persona', async () => {
    documents({ [`invitaciones/${CODE}`]: validInvite() });
    await expect(joinHousehold(CODE, account)).rejects.toThrow('documento');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('sin conexión la lectura falla y no se escribe nada', async () => {
    mockGet.mockRejectedValue(new Error('unavailable'));
    await expect(joinHousehold(CODE, account)).rejects.toThrow('unavailable');
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('un código que arma rutas raras ni siquiera abre la transacción', async () => {
    await expect(joinHousehold('../x', account)).rejects.toBeInstanceOf(InviteInvalidError);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('sin sesión no hace nada', async () => {
    mockCurrentUser = null;
    await expect(joinHousehold(CODE, account)).rejects.toThrow('sesión');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});
