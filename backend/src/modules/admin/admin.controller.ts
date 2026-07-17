import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateMinistereDto,
  UpdateMinistereDto,
  CreateDirectionDto,
  UpdateDirectionDto,
  CreateUtilisateurDto,
  UpdateUtilisateurDto,
} from './dto/admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Permission } from '../../common/types/roles';
import { RequirePermissions } from '../../common/types/roles';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Stats ───
  @Get('stats')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  async getStats() {
    return this.adminService.getStats();
  }

  // ═══════════════════════════════════════════
  // MINISTERES
  // ═══════════════════════════════════════════

  @Get('ministeres')
  async findAllMinisteres(@Query('search') search?: string) {
    return this.adminService.findAllMinisteres(search);
  }

  @Get('ministeres/:id')
  async findMinistereById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findMinistereById(id);
  }

  @Post('ministeres')
  @RequirePermissions(Permission.MANAGE_MINISTERES)
  async createMinistere(@Body() dto: CreateMinistereDto) {
    return this.adminService.createMinistere(dto);
  }

  @Put('ministeres/:id')
  @RequirePermissions(Permission.MANAGE_MINISTERES)
  async updateMinistere(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMinistereDto,
  ) {
    return this.adminService.updateMinistere(id, dto);
  }

  @Delete('ministeres/:id')
  @RequirePermissions(Permission.MANAGE_MINISTERES)
  async deleteMinistere(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteMinistere(id);
  }

  // ═══════════════════════════════════════════
  // DIRECTIONS
  // ═══════════════════════════════════════════

  @Get('directions')
  async findAllDirections(@Query('ministereId') ministereId?: string) {
    return this.adminService.findAllDirections(
      ministereId ? parseInt(ministereId) : undefined,
    );
  }

  @Get('directions/:id')
  async findDirectionById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findDirectionById(id);
  }

  @Post('directions')
  @RequirePermissions(Permission.MANAGE_DIRECTIONS)
  async createDirection(@Body() dto: CreateDirectionDto) {
    return this.adminService.createDirection(dto);
  }

  @Put('directions/:id')
  @RequirePermissions(Permission.MANAGE_DIRECTIONS)
  async updateDirection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDirectionDto,
  ) {
    return this.adminService.updateDirection(id, dto);
  }

  @Delete('directions/:id')
  @RequirePermissions(Permission.MANAGE_DIRECTIONS)
  async deleteDirection(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteDirection(id);
  }

  // ═══════════════════════════════════════════
  // UTILISATEURS
  // ═══════════════════════════════════════════

  @Get('utilisateurs')
  async findAllUtilisateurs(
    @Query('search') search?: string,
    @Query('directionId') directionId?: string,
  ) {
    return this.adminService.findAllUtilisateurs(
      search,
      directionId ? parseInt(directionId) : undefined,
    );
  }

  @Get('utilisateurs/:id')
  async findUtilisateurById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findUtilisateurById(id);
  }

  @Post('utilisateurs')
  @RequirePermissions(Permission.MANAGE_UTILISATEURS)
  async createUtilisateur(@Body() dto: CreateUtilisateurDto) {
    return this.adminService.createUtilisateur(dto);
  }

  @Put('utilisateurs/:id')
  @RequirePermissions(Permission.MANAGE_UTILISATEURS)
  async updateUtilisateur(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUtilisateurDto,
  ) {
    return this.adminService.updateUtilisateur(id, dto);
  }

  @Delete('utilisateurs/:id')
  @RequirePermissions(Permission.MANAGE_UTILISATEURS)
  async deleteUtilisateur(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUtilisateur(id);
  }
}
