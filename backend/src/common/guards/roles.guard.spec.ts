import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../types/roles';

function mockContext(user?: { role?: string; permissions?: Record<string, boolean> }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('autorise les routes @Public()', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });

    expect(guard.canActivate(mockContext())).toBe(true);
  });

  it('refuse sans utilisateur authentifié', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(() => guard.canActivate(mockContext())).toThrow(ForbiddenException);
  });

  it('autorise un rôle requis', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['gouvernement'];
      return undefined;
    });

    expect(
      guard.canActivate(mockContext({ role: 'gouvernement' })),
    ).toBe(true);
  });

  it('refuse un rôle insuffisant', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['gouvernement'];
      return undefined;
    });

    expect(() =>
      guard.canActivate(mockContext({ role: 'agent_courrier' })),
    ).toThrow(ForbiddenException);
  });
});
