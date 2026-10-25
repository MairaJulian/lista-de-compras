import { fireEvent, render, screen } from '@testing-library/react-native';

import { FirestorePing } from './FirestorePing';

const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
  doc: jest.fn(() => ({})),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

describe('FirestorePing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('escribe y lee el documento ping', async () => {
    mockSetDoc.mockImplementation(async (_ref, data) => {
      mockGetDoc.mockResolvedValue({ data: () => data });
    });
    await render(<FirestorePing />);
    await fireEvent.press(screen.getByText('Probar Firestore'));
    expect(await screen.findByText(/Escribió y leyó ping/)).toBeTruthy();
  });

  it('muestra el error si falla', async () => {
    mockSetDoc.mockRejectedValue(new Error('sin emulador'));
    await render(<FirestorePing />);
    await fireEvent.press(screen.getByText('Probar Firestore'));
    expect(await screen.findByText('sin emulador')).toBeTruthy();
  });
});
