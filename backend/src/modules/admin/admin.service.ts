import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../infrastructure/database/database.provider';
import type { DrizzleDB } from '../../infrastructure/database/database.provider';
import {
  ministeres,
  directions,
  utilisateurs,
} from '../../infrastructure/database/schema';
import { eq, like, sql, desc, count } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import {
  CreateMinistereDto,
  UpdateMinistereDto,
  CreateDirectionDto,
  UpdateDirectionDto,
  CreateUtilisateurDto,
  UpdateUtilisateurDto,
} from './dto/admin.dto';
import { UserRole } from '../../common/types/roles';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: DrizzleDB,
  ) {}

  /** Directeur de ministère : ministère obligatoire, jamais de direction */
  private normalizeUtilisateurRattachement(dto: {
    role?: string;
    directionId?: number | null;
    ministereId?: number | null;
  }) {
    if (dto.role === UserRole.DIRECTEUR_MINISTERE) {
      if (!dto.ministereId) {
        throw new BadRequestException(
          'Un directeur de ministère doit être rattaché à un ministère (sans direction)',
        );
      }
      return { directionId: null as null, ministereId: dto.ministereId };
    }
    return {
      directionId: dto.directionId ?? null,
      ministereId: dto.ministereId ?? null,
    };
  }

  // MINISTERES

  async findAllMinisteres(search?: string) {
    if (search) {
      return this.db
        .select()
        .from(ministeres)
        .where(like(ministeres.nom, `%${search}%`))
        .orderBy(ministeres.nom);
    }
    return this.db.select().from(ministeres).orderBy(ministeres.nom);
  }

  async findMinistereById(id: number) {
    const [result] = await this.db
      .select()
      .from(ministeres)
      .where(eq(ministeres.id, id))
      .limit(1);
    if (!result) throw new NotFoundException(`Ministère #${id} introuvable`);
    return result;
  }

  async createMinistere(dto: CreateMinistereDto) {
    try {
      const [result] = await this.db
        .insert(ministeres)
        .values(dto)
        .returning();
      return result;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Un ministère avec ce nom ou code existe déjà');
      }
      throw err;
    }
  }

  async updateMinistere(id: number, dto: UpdateMinistereDto) {
    await this.findMinistereById(id);
    const [result] = await this.db
      .update(ministeres)
      .set(dto)
      .where(eq(ministeres.id, id))
      .returning();
    return result;
  }

  async deleteMinistere(id: number) {
    await this.findMinistereById(id);
    await this.db.delete(ministeres).where(eq(ministeres.id, id));
    return { deleted: true };
  }

  // DIRECTIONS

  async findAllDirections(ministereId?: number) {
    if (ministereId) {
      return this.db
        .select()
        .from(directions)
        .where(eq(directions.ministereId, ministereId))
        .orderBy(directions.nom);
    }
    return this.db.select().from(directions).orderBy(directions.nom);
  }

  async findDirectionById(id: number) {
    const [result] = await this.db
      .select()
      .from(directions)
      .where(eq(directions.id, id))
      .limit(1);
    if (!result) throw new NotFoundException(`Direction #${id} introuvable`);
    return result;
  }

  async createDirection(dto: CreateDirectionDto) {
    await this.findMinistereById(dto.ministereId);

    try {
      const [result] = await this.db
        .insert(directions)
        .values(dto)
        .returning();
      return result;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Une direction avec ce nom existe déjà dans ce ministère');
      }
      throw err;
    }
  }

  async updateDirection(id: number, dto: UpdateDirectionDto) {
    await this.findDirectionById(id);
    const [result] = await this.db
      .update(directions)
      .set(dto)
      .where(eq(directions.id, id))
      .returning();
    return result;
  }

  async deleteDirection(id: number) {
    await this.findDirectionById(id);
    await this.db.delete(directions).where(eq(directions.id, id));
    return { deleted: true };
  }

  // UTILISATEURS

  async findAllUtilisateurs(search?: string, directionId?: number) {
    let whereClause: any = undefined;

    if (search && directionId) {
      whereClause = sql`(${utilisateurs.nom} ILIKE ${'%' + search + '%'} OR ${utilisateurs.prenom} ILIKE ${'%' + search + '%'} OR ${utilisateurs.email} ILIKE ${'%' + search + '%'}) AND ${utilisateurs.directionId} = ${directionId}`;
    } else if (search) {
      whereClause = sql`(${utilisateurs.nom} ILIKE ${'%' + search + '%'} OR ${utilisateurs.prenom} ILIKE ${'%' + search + '%'} OR ${utilisateurs.email} ILIKE ${'%' + search + '%'})`;
    } else if (directionId) {
      whereClause = eq(utilisateurs.directionId, directionId);
    }

    return this.db
      .select({
        id: utilisateurs.id,
        email: utilisateurs.email,
        nom: utilisateurs.nom,
        prenom: utilisateurs.prenom,
        role: utilisateurs.role,
        permissions: utilisateurs.permissions,
        directionId: utilisateurs.directionId,
        ministereId: utilisateurs.ministereId,
        createdAt: utilisateurs.createdAt,
      })
      .from(utilisateurs)
      .where(whereClause)
      .orderBy(desc(utilisateurs.createdAt));
  }

  async findUtilisateurById(id: number) {
    const [result] = await this.db
      .select({
        id: utilisateurs.id,
        email: utilisateurs.email,
        nom: utilisateurs.nom,
        prenom: utilisateurs.prenom,
        role: utilisateurs.role,
        permissions: utilisateurs.permissions,
        directionId: utilisateurs.directionId,
        ministereId: utilisateurs.ministereId,
        createdAt: utilisateurs.createdAt,
      })
      .from(utilisateurs)
      .where(eq(utilisateurs.id, id))
      .limit(1);
    if (!result) throw new NotFoundException(`Utilisateur #${id} introuvable`);
    return result;
  }

  async createUtilisateur(dto: CreateUtilisateurDto) {
    const rattachement = this.normalizeUtilisateurRattachement(dto);
    if (rattachement.ministereId) {
      await this.findMinistereById(rattachement.ministereId);
    }
    const hashedPassword = await bcrypt.hash(dto.motDePasse, 10);
    try {
      const [result] = await this.db
        .insert(utilisateurs)
        .values({
          email: dto.email,
          nom: dto.nom,
          prenom: dto.prenom,
          role: dto.role,
          permissions: dto.permissions,
          directionId: rattachement.directionId,
          ministereId: rattachement.ministereId,
          motDePasse: hashedPassword,
        })
        .returning();

      const { motDePasse: _, ...rest } = result;
      return rest;
    } catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('Un utilisateur avec cet email existe déjà');
      }
      throw err;
    }
  }

  async updateUtilisateur(id: number, dto: UpdateUtilisateurDto) {
    const existing = await this.findUtilisateurById(id);
    const role = dto.role ?? existing.role ?? undefined;
    const rattachement = this.normalizeUtilisateurRattachement({
      role,
      directionId: dto.directionId !== undefined ? dto.directionId : existing.directionId,
      ministereId: dto.ministereId !== undefined ? dto.ministereId : existing.ministereId,
    });
    if (rattachement.ministereId) {
      await this.findMinistereById(rattachement.ministereId);
    }

    const updateData: any = {
      ...dto,
      directionId: rattachement.directionId,
      ministereId: rattachement.ministereId,
    };

    if (dto.motDePasse) {
      updateData.motDePasse = await bcrypt.hash(dto.motDePasse, 10);
    } else {
      delete updateData.motDePasse;
    }

    const [result] = await this.db
      .update(utilisateurs)
      .set(updateData)
      .where(eq(utilisateurs.id, id))
      .returning();

    const { motDePasse: _, ...rest } = result;
    return rest;
  }

  async deleteUtilisateur(id: number) {
    await this.findUtilisateurById(id);
    await this.db.delete(utilisateurs).where(eq(utilisateurs.id, id));
    return { deleted: true };
  }

  // STATS

  async getStats() {
    const [ministereCount] = await this.db
      .select({ value: count() })
      .from(ministeres);

    const [directionCount] = await this.db
      .select({ value: count() })
      .from(directions);

    const [utilisateurCount] = await this.db
      .select({ value: count() })
      .from(utilisateurs);

    return {
      ministeres: ministereCount.value,
      directions: directionCount.value,
      utilisateurs: utilisateurCount.value,
    };
  }
}
