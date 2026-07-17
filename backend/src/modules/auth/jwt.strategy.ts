import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fluxmin-jwt-secret',
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    role: string;
    nom?: string;
    prenom?: string;
    directionId?: number;
    directionNom?: string;
    ministereId?: number;
    ministereNom?: string;
    permissions?: Record<string, boolean>;
  }) {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Token invalide');
    }

    return {
      id: payload.sub,
      email: payload.email,
      nom: payload.nom || '',
      prenom: payload.prenom || '',
      role: payload.role,
      permissions: payload.permissions || {},
      directionId: payload.directionId || null,
      directionNom: payload.directionNom || null,
      ministereId: payload.ministereId || null,
      ministereNom: payload.ministereNom || null,
    };
  }
}
