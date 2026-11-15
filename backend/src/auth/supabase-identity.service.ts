import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { UserStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';

interface SupabaseUser {
  id?: string;
  email?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
}

@Injectable()
export class SupabaseIdentityService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticate(header: string | undefined): Promise<AuthenticatedUser> {
    const token = /^Bearer ([^\s,]+)$/i.exec(header ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException('A Supabase access token is required');
    }

    const project = new URL(this.config.getOrThrow<string>('SUPABASE_URL'));
    const apiKey = this.config.getOrThrow<string>('SUPABASE_PUBLISHABLE_KEY');
    let identity: SupabaseUser;
    try {
      const response = await fetch(new URL('/auth/v1/user', project), {
        headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      if ([400, 401, 403, 404].includes(response.status)) {
        throw new UnauthorizedException(
          'Invalid or expired Supabase access token',
        );
      }
      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Supabase Auth is temporarily unavailable',
        );
      }
      identity = (await response.json()) as SupabaseUser;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Supabase Auth is temporarily unavailable',
      );
    }

    const email =
      typeof identity?.email === 'string'
        ? identity.email.trim().toLowerCase()
        : '';
    const confirmedAt = new Date(identity?.email_confirmed_at ?? '');
    if (
      !identity?.id ||
      !isUUID(identity.id) ||
      identity.is_anonymous ||
      !email ||
      Number.isNaN(confirmedAt.getTime())
    ) {
      throw new ForbiddenException('A confirmed email account is required');
    }

    // The project and the verified user ID bind this identity to an app account.
    // Email is profile data and must never link an identity to existing privileges.
    const supabaseIdentity = `${project.origin}/auth/v1|${identity.id.toLowerCase()}`;
    const profileQuery = {
      where: { supabaseIdentity },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        status: true,
        deletedAt: true,
        emailVerifiedAt: true,
        activeOrganizationId: true,
        tokenVersion: true,
      },
    } as const;
    let user = await this.prisma.user.findUnique(profileQuery);
    if (!user) {
      await this.prisma.user.createMany({
        data: {
          supabaseIdentity,
          email,
          name: email.split('@')[0],
          emailVerifiedAt: confirmedAt,
        },
        skipDuplicates: true,
      });
      user = await this.prisma.user.findUnique(profileQuery);
      if (!user) {
        throw new ConflictException(
          'This email belongs to a different app account',
        );
      }
    }

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new ForbiddenException('App account is inactive');
    }
    if (
      user.email !== email ||
      user.emailVerifiedAt?.getTime() !== confirmedAt.getTime()
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { email, emailVerifiedAt: confirmedAt },
      });
    }

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      status: user.status,
      activeOrganizationId: user.activeOrganizationId,
      tokenVersion: user.tokenVersion,
      email,
      emailVerifiedAt: confirmedAt,
      sessionId: '',
    };
  }
}
