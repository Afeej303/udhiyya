import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserStatus } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SupabaseIdentityService } from './supabase-identity.service.js';

describe('SupabaseIdentityService', () => {
  const id = '9cc92916-c427-48f3-86ba-9473eeaf71ed';
  const confirmedAt = '2026-01-01T00:00:00Z';
  const email = 'user@example.com';
  const identity = {
    id,
    email,
    email_confirmed_at: confirmedAt,
    user_metadata: { role: 'super_admin' },
  };
  const profile = {
    id: 'app-user',
    email,
    name: 'user',
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    deletedAt: null,
    emailVerifiedAt: new Date(confirmedAt),
    activeOrganizationId: null,
    tokenVersion: 1,
  };

  const db = {
    user: { findUnique: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  };
  const fetchUser = vi.fn<typeof fetch>();
  const service = new SupabaseIdentityService(
    new ConfigService({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    }),
    db as unknown as PrismaService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchUser);
    fetchUser.mockImplementation(async () => Response.json(identity));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('provisions an ordinary profile keyed to the verified project and user', async () => {
    db.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(profile);
    const appUser = await service.authenticate('Bearer access-token');
    expect(appUser.id).toBe(profile.id);
    expect(fetchUser).toHaveBeenCalledWith(
      new URL('https://project.supabase.co/auth/v1/user'),
      expect.objectContaining({
        headers: {
          apikey: 'publishable-key',
          Authorization: 'Bearer access-token',
        },
      }),
    );
    expect(db.user.createMany).toHaveBeenCalledWith({
      data: {
        supabaseIdentity: `https://project.supabase.co/auth/v1|${id}`,
        email,
        name: 'user',
        emailVerifiedAt: new Date(confirmedAt),
      },
      skipDuplicates: true,
    });
  });

  it('reuses an existing profile and rejects a suspended account', async () => {
    db.user.findUnique.mockResolvedValueOnce(profile).mockResolvedValueOnce({
      ...profile,
      status: UserStatus.SUSPENDED,
    });
    await expect(service.authenticate('Bearer token')).resolves.toMatchObject({
      id: profile.id,
    });
    await expect(service.authenticate('Bearer token')).rejects.toMatchObject({
      status: 403,
    });
    expect(db.user.createMany).not.toHaveBeenCalled();
  });

  it('rejects an email collision without inheriting an existing account', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.authenticate('Bearer token')).rejects.toMatchObject({
      status: 409,
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('rejects invalid and unconfirmed identities before querying app accounts', async () => {
    fetchUser
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ id, email }));
    await expect(service.authenticate(undefined)).rejects.toMatchObject({
      status: 401,
    });
    await expect(service.authenticate('Bearer invalid')).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      service.authenticate('Bearer unconfirmed'),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('reports a verification outage as 503', async () => {
    fetchUser.mockRejectedValue(new Error('network unavailable'));
    await expect(service.authenticate('Bearer token')).rejects.toMatchObject({
      status: 503,
    });
  });
});
