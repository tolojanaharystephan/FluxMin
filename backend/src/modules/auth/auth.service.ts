import { Injectable, UnauthorizedException, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import { utilisateurs, directions, ministeres } from '../../infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ROLE_PERMISSIONS } from '../../common/types/roles';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.email, dto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await bcrypt.compare(dto.motDePasse, user.motDePasse);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const [existing] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.email, dto.email))
      .limit(1);

    if (existing) {
      throw new UnauthorizedException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);
    const [newUser] = await this.db
      .insert(utilisateurs)
      .values({
        email: dto.email,
        motDePasse: hashedPassword,
        nom: dto.nom,
        prenom: dto.prenom,
        role: dto.role || 'agent',
        directionId: dto.directionId || null,
        permissions: {},
      })
      .returning();

    return this.generateTokens(newUser);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const [user] = await this.db
        .select()
        .from(utilisateurs)
        .where(eq(utilisateurs.id, payload.sub))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  private resolvePermissions(role: string, custom: Record<string, boolean> | null | undefined): string[] {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const customPerms = custom
      ? Object.keys(custom).filter((k) => custom[k] === true)
      : [];
    return [...new Set([...rolePerms, ...customPerms])];
  }

  async getProfile(userId: number) {
    const [user] = await this.db
      .select({
        id: utilisateurs.id,
        email: utilisateurs.email,
        nom: utilisateurs.nom,
        prenom: utilisateurs.prenom,
        role: utilisateurs.role,
        permissions: utilisateurs.permissions,
        directionId: utilisateurs.directionId,
        createdAt: utilisateurs.createdAt,
      })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const permissions = this.resolvePermissions(user.role || '', user.permissions as any);

    // Enrichir avec les infos de direction et ministère
    if (user.directionId) {
      const [direction] = await this.db
        .select({
          id: directions.id,
          nom: directions.nom,
          type: directions.type,
          ministereId: directions.ministereId,
        })
        .from(directions)
        .where(eq(directions.id, user.directionId))
        .limit(1);

      if (direction) {
        const [ministere] = await this.db
          .select({
            id: ministeres.id,
            nom: ministeres.nom,
            code: ministeres.code,
          })
          .from(ministeres)
          .where(eq(ministeres.id, direction.ministereId!))
          .limit(1);

        return {
          ...user,
          permissions,
          directionNom: direction.nom,
          directionType: direction.type,
          ministereId: direction.ministereId,
          ministereNom: ministere?.nom || null,
          ministereCode: ministere?.code || null,
        };
      }
    }

    return {
      ...user,
      permissions,
      directionNom: null,
      directionType: null,
      ministereId: null,
      ministereNom: null,
      ministereCode: null,
    };
  }

  async updateProfile(userId: number, dto: { nom?: string; prenom?: string }) {
    const updateData: Record<string, any> = {};
    if (dto.nom !== undefined) updateData.nom = dto.nom;
    if (dto.prenom !== undefined) updateData.prenom = dto.prenom;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Aucune donnée à modifier');
    }

    const [updated] = await this.db
      .update(utilisateurs)
      .set(updateData)
      .where(eq(utilisateurs.id, userId))
      .returning();

    if (!updated) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return this.getProfile(userId);
  }

  async changePassword(userId: number, dto: { currentPassword: string; newPassword: string }) {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.motDePasse);
    if (!isPasswordValid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.db
      .update(utilisateurs)
      .set({ motDePasse: hashedPassword })
      .where(eq(utilisateurs.id, userId));

    return { message: 'Mot de passe modifié avec succès' };
  }

  private async getUserWithRelations(userId: number) {
    const [user] = await this.db
      .select()
      .from(utilisateurs)
      .where(eq(utilisateurs.id, userId))
      .limit(1);

    if (!user) return null;

    if (user.directionId) {
      const [direction] = await this.db
        .select()
        .from(directions)
        .where(eq(directions.id, user.directionId))
        .limit(1);

      if (direction) {
        const [ministere] = await this.db
          .select()
          .from(ministeres)
          .where(eq(ministeres.id, direction.ministereId!))
          .limit(1);

        return { ...user, direction, ministere };
      }
    }

    return { ...user, direction: null, ministere: null };
  }

  private async generateTokens(user: any) {
    // Enrichir avec direction/ministere
    let directionNom: string | null = null;
    let ministereNom: string | null = null;
    let ministereId: number | null = null;
    let directionId = user.directionId;

    if (user.directionId) {
      const [direction] = await this.db
        .select()
        .from(directions)
        .where(eq(directions.id, user.directionId))
        .limit(1);

      if (direction) {
        directionNom = direction.nom;
        ministereId = direction.ministereId ?? null;
        const [ministere] = await this.db
          .select()
          .from(ministeres)
          .where(eq(ministeres.id, direction.ministereId!))
          .limit(1);
        ministereNom = ministere?.nom || null;
      }
    }

    const permissions = this.resolvePermissions(user.role || '', user.permissions);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
      directionId,
      directionNom,
      ministereId,
      ministereNom,
      permissions: user.permissions || {},
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: 86400,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: 604800,
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        directionId,
        directionNom,
        ministereId,
        ministereNom,
        permissions,
      },
    };
  }
}
