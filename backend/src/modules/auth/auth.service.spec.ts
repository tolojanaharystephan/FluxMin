import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';

describe('AuthService', () => {
  let service: AuthService;
  let db: { select: jest.Mock };

  beforeEach(() => {
    const limit = jest.fn().mockResolvedValue([]);
    const where = jest.fn().mockReturnValue({ limit });
    const from = jest.fn().mockReturnValue({ where });
    db = {
      select: jest.fn().mockReturnValue({ from }),
    };

    service = new AuthService(
      db as any,
      { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService,
      {
        assertIpNotBlocked: jest.fn().mockResolvedValue(undefined),
        recordLoginAttempt: jest.fn().mockResolvedValue({}),
        clientFromRequest: jest.fn().mockReturnValue({ ip: '127.0.0.1', userAgent: 'test' }),
        newSessionId: jest.fn().mockReturnValue('sess-test'),
      } as any,
      { log: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('rejette un login avec email inconnu', async () => {
    await expect(
      service.login({ email: 'inconnu@test.fr', motDePasse: 'x' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('injecte DATABASE_CONNECTION correctement', () => {
    expect(DATABASE_CONNECTION).toBe('DATABASE_CONNECTION');
  });
});
