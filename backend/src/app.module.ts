import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { TemporalModule } from './infrastructure/temporal/temporal.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { CourrierModule } from './modules/courrier/courrier.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { StatsModule } from './modules/stats/stats.module';
import { AiModule } from './modules/ai/ai.module';
import { GouvernementModule } from './modules/gouvernement/gouvernement.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    AuthModule,
    AdminModule,
    AuditModule,
    NotificationModule,
    TemporalModule,
    CourrierModule,
    ArchiveModule,
    MessagingModule,
    StatsModule,
    AiModule,
    GouvernementModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard – tous les endpoints sont protégés par défaut
    // Utiliser @Public() pour les routes publiques
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global RBAC guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global audit interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
