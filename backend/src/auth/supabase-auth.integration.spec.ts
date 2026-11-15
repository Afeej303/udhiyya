import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { UserStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const subject = '9cc92916-c427-48f3-86ba-9473eeaf71ed';
const id = 'ad9830e6-bbe4-4034-88e1-21e8e7d13225';
const confirmedAt = '2026-01-01T00:00:00Z';
const profile = {
  id,
  email: 'user@example.com',
  name: 'user',
  status: UserStatus.ACTIVE,
  deletedAt: null,
  emailVerifiedAt: new Date(confirmedAt),
};
const assignments = vi.fn().mockResolvedValue([]);
const orgId = 'ae73944a-acf7-4e07-b566-d14d9dc36199';
const programme = {
  id: '3eb12077-1049-4c77-a607-39f45b27fd42',
  organizationId: orgId,
  year: 2027,
  title: 'Annual programme',
  status: 'published',
  registrationLimit: 50,
  priceMinor: 100,
};
const findProgramme = vi.fn();
const findMembership = vi.fn().mockResolvedValue(null);
let app: NestFastifyApplication;

beforeAll(async () => {
  vi.stubEnv('AUTH_MODE', 'supabase');
  vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test');
  vi.stubEnv('API_PREFIX', '');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        id: subject,
        email: profile.email,
        email_confirmed_at: confirmedAt,
      }),
    ),
  );

  const { AppModule } = await import('../app.module.js');
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({
      user: {
        findUnique: vi.fn().mockResolvedValue(profile),
        findFirst: vi.fn().mockResolvedValue(profile),
      },
      userRole: { findMany: assignments },
      organizationMember: { findFirst: findMembership },
      programme: { findFirst: findProgramme },
      role: { findMany: vi.fn().mockResolvedValue([]) },
    })
    .compile();
  const { configureFastifyApp, setupSwagger } = await import('../main.js');
  app = module.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { logger: false },
  );
  const appConfig = await configureFastifyApp(app);
  setupSwagger(app, appConfig);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app?.close();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('connects Supabase identity to the profile and database-backed permission guard', async () => {
  const client = request(app.getHttpServer());
  await client
    .get('/users/me')
    .expect(401)
    .expect(({ body }) => {
      expect(body).toMatchObject({ statusCode: 401, path: '/users/me' });
    });
  await client
    .get('/users/me')
    .set('Authorization', 'Bearer token')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({ id, roles: [], permissions: [] });
    });
  await client.get('/roles').set('Authorization', 'Bearer token').expect(403);
  assignments.mockResolvedValueOnce([
    {
      role: {
        slug: 'reviewer',
        rolePermissions: [{ permission: { key: 'role:read' } }],
      },
    },
  ]);
  await client.get('/roles').set('Authorization', 'Bearer token').expect(200);
  await client.post('/auth/login').expect(404);
  await client
    .get('/sessions')
    .set('Authorization', 'Bearer token')
    .expect(404);
});

it('limits the anonymous programme response to published records and public fields', async () => {
  const client = request(app.getHttpServer());
  const url = `/public/organisations/${orgId}/programmes/2027`;
  findProgramme.mockResolvedValueOnce(null);
  await client.get(url).expect(404);
  expect(findProgramme).toHaveBeenLastCalledWith({
    where: {
      organizationId: orgId,
      year: 2027,
      status: 'published',
      organization: { status: 'ACTIVE' },
    },
  });
  findProgramme.mockResolvedValueOnce(programme);
  await client
    .get(url)
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        title: programme.title,
        price: { amountMinor: 100, currency: 'INR' },
      });
      expect(body).not.toHaveProperty('registrationLimit');
      expect(body).not.toHaveProperty('organisationId');
    });
});

it('denies committee programme reads without active membership', async () => {
  findProgramme.mockClear();
  await request(app.getHttpServer())
    .get(`/organisations/${orgId}/programmes/${programme.id}`)
    .set('Authorization', 'Bearer token')
    .expect(403);
  expect(findMembership).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        organizationId: orgId,
        status: 'ACTIVE',
      }),
    }),
  );
  expect(findProgramme).not.toHaveBeenCalled();
});

it('serves Swagger UI assets with the Fastify adapter', async () => {
  const client = request(app.getHttpServer());
  await client
    .get('/docs-json')
    .expect(200)
    .expect(({ body }) => {
      expect(body.paths).toHaveProperty(['/organisations/{orgId}/programmes']);
    });
  await client.get('/docs/swagger-ui.css').expect(200);
});
