import { getMockCurrentMember, mockAccountEmail } from '../mock/data';

export type Account = {
  name: string;
  email: string;
  photo: string | null;
};

/** Cuenta de la sesión de ejemplo de desarrollo. */
export const demoAccount: Account = {
  name: getMockCurrentMember().name,
  email: mockAccountEmail,
  photo: null,
};

/** Lo que se sabe de la sesión de Firebase, o la sesión de ejemplo de desarrollo (`demo`). */
export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; account: Account; hasHousehold: boolean }
  | { status: 'demo' };

export type Session =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; account: Account; hasHousehold: boolean; demo: boolean };

export type StartRoute = '/' | '/sin-hogar' | '/listas';

type FirebaseUser = { displayName: string | null; email: string | null; photoURL: string | null };
type UserData = { nombre?: unknown; email?: unknown; foto?: unknown; hogarActualId?: unknown };

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Arma la sesión con la cuenta de Firebase y el documento `usuarios/{uid}`. Si el documento todavía
 * no existe (se crea justo después de entrar) o no se pudo leer, usa los datos de la cuenta.
 */
export function signedInState(user: FirebaseUser, data: UserData | undefined): AuthState {
  return {
    status: 'signedIn',
    account: {
      name: text(data?.nombre) ?? user.displayName ?? '',
      email: text(data?.email) ?? user.email ?? '',
      photo: text(data?.foto) ?? user.photoURL ?? null,
    },
    // `hogarActualId` vacío (null, ausente o texto vacío) = "sin hogar".
    hasHousehold: text(data?.hogarActualId) !== undefined,
  };
}

/** En la sesión de ejemplo el hogar lo marcan los datos de ejemplo; en la real, `hogarActualId`. */
export function deriveSession(auth: AuthState, demoHasHousehold: boolean): Session {
  if (auth.status === 'demo') {
    return {
      status: 'signedIn',
      account: demoAccount,
      hasHousehold: demoHasHousehold,
      demo: true,
    };
  }
  if (auth.status === 'signedIn') return { ...auth, demo: false };
  return auth;
}

/** Pantalla con la que arranca cada estado de la sesión; `undefined` mientras se averigua. */
export function startRoute(session: Session): StartRoute | undefined {
  switch (session.status) {
    case 'loading':
      return undefined;
    case 'signedOut':
      return '/';
    case 'signedIn':
      return session.hasHousehold ? '/listas' : '/sin-hogar';
  }
}
