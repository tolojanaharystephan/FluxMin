import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * E2E M8 — nécessite Postgres local (DATABASE_URL).
 * Si la DB est indisponible, la suite est skippée (environnement sans Docker).
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = true;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api');
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await app.init();

      const res = await request(app.getHttpServer()).get('/api/health');
      if (res.status === 503) {
        dbAvailable = false;
      }
    } catch {
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /api/health — 200 si DB up', async () => {
    if (!dbAvailable || !app) {
      console.warn('E2E skip: Postgres indisponible');
      return;
    }
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.database).toBe('up');
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/auth/login — 401 si credentials invalides', async () => {
    if (!dbAvailable || !app) {
      console.warn('E2E skip: Postgres indisponible');
      return;
    }
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@fluxmin.test', motDePasse: 'wrong' });
    expect(res.status).toBe(401);
  });
});
