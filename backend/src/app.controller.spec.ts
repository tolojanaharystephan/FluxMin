import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthService } from './health.service';

describe('AppController', () => {
  let appController: AppController;
  let healthService: { check: jest.Mock };

  beforeEach(async () => {
    healthService = {
      check: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: HealthService, useValue: healthService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /', () => {
    it('retourne le ping API', () => {
      expect(appController.getHello()).toEqual({ message: 'FluxMin API' });
    });
  });

  describe('GET /health', () => {
    it('retourne ok quand la DB est up', async () => {
      healthService.check.mockResolvedValue({
        status: 'ok',
        service: 'fluxmin-backend',
        timestamp: '2026-07-18T00:00:00.000Z',
        database: 'up',
        uptimeSeconds: 1,
      });

      await expect(appController.health()).resolves.toMatchObject({
        status: 'ok',
        database: 'up',
      });
    });

    it('lève 503 quand la DB est down', async () => {
      healthService.check.mockResolvedValue({
        status: 'degraded',
        service: 'fluxmin-backend',
        timestamp: '2026-07-18T00:00:00.000Z',
        database: 'down',
        uptimeSeconds: 1,
      });

      await expect(appController.health()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
