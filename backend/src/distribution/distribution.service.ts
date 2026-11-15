import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { EmailService } from '../email/email.service.js';
import { Prisma, type DistributionPolicy } from '../generated/prisma/client.js';
import { OperationsService } from '../operations/operations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import { RegistrationService } from '../registration/registration.service.js';
import type {
  BeneficiaryDto,
  CollectionWindowDto,
  DistributionAllocationDto,
  DistributionPolicyDto,
  DistributionQuery,
  EligibilityDto,
  HandoffDto,
  TransitionAllocationDto,
  UpdateBeneficiaryDto,
  UpdateCollectionWindowDto,
} from './distribution.dto.js';

type Scope = { organizationId: string; programmeId: string };
type Client = Prisma.TransactionClient;

const reserved = ['confirmed', 'packed', 'collected', 'delivered'] as const;
const inProgress = ['confirmed', 'packed'] as const;
const allocationSelect = {
  id: true,
  recipientType: true,
  registrationId: true,
  beneficiaryId: true,
  quantityGrams: true,
  collectionWindowId: true,
  status: true,
  packedAt: true,
  handedOffAt: true,
  collectionWindow: {
    select: {
      id: true,
      location: true,
      startsAt: true,
      endsAt: true,
      instructions: true,
    },
  },
} satisfies Prisma.DistributionAllocationSelect;

type AllocationView = Prisma.DistributionAllocationGetPayload<{
  select: typeof allocationSelect;
}>;

function allocationView(row: AllocationView) {
  return {
    id: row.id,
    recipientType: row.recipientType,
    recipientId: row.registrationId ?? row.beneficiaryId,
    quantityGrams: row.quantityGrams,
    collectionWindowId: row.collectionWindowId,
    status: row.status,
    packedAt: row.packedAt,
    handedOffAt: row.handedOffAt,
    collectionWindow: row.collectionWindow,
  };
}

function policyView(row: DistributionPolicy | null) {
  return {
    participant: {
      enabled: row?.participantsEnabled ?? false,
      gramsPerShare: row?.gramsPerShare ?? 0,
    },
    public: {
      enabled: row?.beneficiariesEnabled ?? false,
      gramsPerHousehold: row?.gramsPerHousehold ?? 0,
      guidance: row?.publicGuidance ?? '',
    },
  };
}

function page<T extends { id: string }>(rows: T[], limit: number) {
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null,
  };
}

@Injectable()
export class DistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationService,
    private readonly operations: OperationsService,
    private readonly email: EmailService,
  ) {}

  async beneficiaries(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.beneficiary.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: {
        id: true,
        householdId: true,
        eligibility: true,
        reason: true,
        userId: true,
      },
    });
    return page(rows, query.limit);
  }

  async getBeneficiary(scope: Scope, id: string) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const row = await this.findBeneficiary(this.prisma, scope, id);
    return this.beneficiaryView(row);
  }

  async createBeneficiary(
    scope: Scope,
    actorId: string,
    input: BeneficiaryDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      await this.findHousehold(tx, scope, input.householdId);
      const row = await tx.beneficiary.create({
        data: { ...scope, householdId: input.householdId },
        include: { household: true },
      });
      await this.audit(tx, scope, actorId, 'BENEFICIARY_CREATED', row.id);
      return this.beneficiaryView(row);
    });
  }

  async updateBeneficiary(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateBeneficiaryDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const existing = await this.findBeneficiary(tx, scope, id);
      if (input.householdId === null)
        throw new BadRequestException('Household is required');
      if (!input.householdId || input.householdId === existing.householdId)
        return this.beneficiaryView(existing);
      if (
        existing.eligibility !== 'pending' ||
        existing.userId ||
        existing.accessTokenHash
      ) {
        throw new ConflictException(
          'A reviewed or invited beneficiary cannot change households',
        );
      }
      await this.findHousehold(tx, scope, input.householdId);
      const row = await tx.beneficiary.update({
        where: { id, programmeId: scope.programmeId },
        data: { householdId: input.householdId },
        include: { household: true },
      });
      await this.audit(tx, scope, actorId, 'BENEFICIARY_UPDATED', id);
      return this.beneficiaryView(row);
    });
  }

  async eligibility(
    scope: Scope,
    id: string,
    actorId: string,
    input: EligibilityDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const row = await this.findBeneficiary(tx, scope, id);
      const eligibility = input.action === 'approve' ? 'approved' : 'rejected';
      if (row.eligibility === eligibility) return this.beneficiaryView(row);
      if (
        eligibility === 'rejected' &&
        (await tx.distributionAllocation.count({
          where: {
            programmeId: scope.programmeId,
            beneficiaryId: id,
            status: { in: [...reserved] },
          },
        }))
      ) {
        throw new ConflictException(
          'Resolve confirmed allocations before rejecting eligibility',
        );
      }
      const updated = await tx.beneficiary.update({
        where: { id, programmeId: scope.programmeId },
        data: { eligibility, reason: input.reason?.trim() || null },
        include: { household: true },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'BENEFICIARY_' + eligibility.toUpperCase(),
        id,
      );
      return this.beneficiaryView(updated);
    });
  }

  async issueAccess(scope: Scope, id: string, actorId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400_000);
    const email = await this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const row = await this.findBeneficiary(tx, scope, id);
      const email = row.household.contactEmail?.toLowerCase();
      if (!email || row.eligibility !== 'approved' || row.userId) {
        throw new ConflictException(
          'An approved, unlinked beneficiary with an email is required',
        );
      }
      await tx.beneficiary.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          accessEmail: email,
          accessTokenHash: this.digest(token),
          accessExpiresAt: expiresAt,
        },
      });
      await this.audit(tx, scope, actorId, 'BENEFICIARY_ACCESS_ISSUED', id);
      return email;
    });
    this.email.sendBeneficiaryAccessEmail(
      email,
      scope.organizationId,
      scope.programmeId,
      token,
    );
    return { id, status: 'pending', expiresAt };
  }

  async acceptAccess(scope: Scope, actor: AuthenticatedUser, token: string) {
    if (!actor.emailVerifiedAt)
      throw new ForbiddenException('Verified email is required');
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, true, true);
      const accessTokenHash = this.digest(token);
      const row = await tx.beneficiary.findFirst({
        where: { programmeId: scope.programmeId, accessTokenHash },
        include: { household: true },
      });
      if (
        !row ||
        !row.accessExpiresAt ||
        row.accessExpiresAt <= new Date() ||
        row.eligibility !== 'approved' ||
        row.userId
      ) {
        throw new ConflictException(
          'Beneficiary access link is missing, expired or already used',
        );
      }
      const email = actor.email.toLowerCase();
      if (
        row.accessEmail !== email ||
        row.household.contactEmail?.toLowerCase() !== email
      ) {
        throw new ForbiddenException(
          'Access link belongs to a different email address',
        );
      }
      const updated = await tx.beneficiary.updateMany({
        where: { id: row.id, accessTokenHash, userId: null },
        data: {
          userId: actor.id,
          accessEmail: null,
          accessTokenHash: null,
          accessExpiresAt: null,
        },
      });
      if (!updated.count)
        throw new ConflictException(
          'Beneficiary access link has already been used',
        );
      await this.audit(
        tx,
        scope,
        actor.id,
        'BENEFICIARY_ACCESS_ACCEPTED',
        row.id,
      );
      return { id: row.id, eligibility: row.eligibility };
    });
  }

  async ownBeneficiary(scope: Scope, userId: string) {
    return this.beneficiaryView(await this.findOwnBeneficiary(scope, userId));
  }

  async ownDistribution(scope: Scope, userId: string) {
    const beneficiary = await this.findOwnBeneficiary(scope, userId);
    const allocation = await this.prisma.distributionAllocation.findFirst({
      where: {
        programmeId: scope.programmeId,
        beneficiaryId: beneficiary.id,
        status: { in: [...reserved] },
      },
      select: { ...allocationSelect, collectionReference: true },
    });
    return {
      eligibility: beneficiary.eligibility,
      allocation:
        allocation && beneficiary.eligibility === 'approved'
          ? {
              ...allocationView(allocation),
              collectionReference: allocation.collectionReference,
            }
          : null,
    };
  }

  async policy(scope: Scope) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    return policyView(
      await this.prisma.distributionPolicy.findUnique({
        where: { programmeId: scope.programmeId },
      }),
    );
  }

  async savePolicy(
    scope: Scope,
    actorId: string,
    input: DistributionPolicyDto,
  ) {
    if (
      (input.participant.enabled && !input.participant.gramsPerShare) ||
      (input.public.enabled && !input.public.gramsPerHousehold)
    ) {
      throw new BadRequestException(
        'Enabled policies require a positive ration',
      );
    }
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const data = {
        participantsEnabled: input.participant.enabled,
        gramsPerShare: input.participant.gramsPerShare,
        beneficiariesEnabled: input.public.enabled,
        gramsPerHousehold: input.public.gramsPerHousehold,
        publicGuidance: input.public.guidance.trim(),
      };
      const row = await tx.distributionPolicy.upsert({
        where: { programmeId: scope.programmeId },
        create: { ...data, programmeId: scope.programmeId },
        update: data,
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'DISTRIBUTION_POLICY_UPDATED',
        scope.programmeId,
      );
      return policyView(row);
    });
  }

  async inventory(scope: Scope) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    return this.prisma.$transaction((tx) => this.stock(tx, scope), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }

  async allocations(scope: Scope, query: DistributionQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.distributionAllocation.findMany({
      where: {
        programmeId: scope.programmeId,
        status: query.status,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: allocationSelect,
    });
    return page(rows.map(allocationView), query.limit);
  }

  async createAllocation(
    scope: Scope,
    actorId: string,
    input: DistributionAllocationDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      await this.window(tx, scope, input.collectionWindowId);
      await this.validateRation(tx, scope, input);
      const row = await tx.distributionAllocation.create({
        data: {
          programmeId: scope.programmeId,
          recipientType: input.recipientType,
          registrationId:
            input.recipientType === 'participant' ? input.recipientId : null,
          beneficiaryId:
            input.recipientType === 'beneficiary' ? input.recipientId : null,
          quantityGrams: input.quantityGrams,
          collectionWindowId: input.collectionWindowId,
        },
        select: allocationSelect,
      });
      await this.audit(tx, scope, actorId, 'DISTRIBUTION_DRAFTED', row.id);
      return allocationView(row);
    });
  }

  async transition(
    scope: Scope,
    id: string,
    actorId: string,
    input: TransitionAllocationDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const current = await this.findAllocation(tx, scope, id);
      const states = {
        confirm: 'confirmed',
        pack: 'packed',
        cancel: 'cancelled',
      } as const;
      const status = states[input.action];
      if (status === current.status) return allocationView(current);
      if (status === 'confirmed') {
        if (current.status !== 'draft')
          throw new ConflictException(
            'Only draft allocations can be confirmed',
          );
        await this.validateRation(tx, scope, {
          recipientType: current.recipientType,
          recipientId: current.registrationId ?? current.beneficiaryId ?? '',
          quantityGrams: current.quantityGrams,
          collectionWindowId: current.collectionWindowId,
        });
        const inventory = await this.stock(tx, scope);
        if (current.quantityGrams > inventory.availableGrams)
          throw new ConflictException('Insufficient distribution stock');
      }
      if (status === 'packed' && current.status !== 'confirmed')
        throw new ConflictException('Confirm allocation before packing');
      if (
        status === 'cancelled' &&
        !(['draft', 'confirmed', 'packed'] as string[]).includes(current.status)
      ) {
        throw new ConflictException('Completed handoffs cannot be cancelled');
      }

      const row = await tx.distributionAllocation.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          status,
          collectionReference:
            status === 'confirmed'
              ? randomUUID()
              : status === 'cancelled'
                ? null
                : undefined,
          packedAt: status === 'packed' ? new Date() : undefined,
        },
        select: allocationSelect,
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'DISTRIBUTION_' + status.toUpperCase(),
        id,
      );
      return allocationView(row);
    });
  }

  async windows(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.collectionWindow.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows, query.limit);
  }

  async createWindow(
    scope: Scope,
    actorId: string,
    input: CollectionWindowDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const data = this.windowData(input);
      const row = await tx.collectionWindow.create({
        data: { ...data, programmeId: scope.programmeId },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'DISTRIBUTION_WINDOW_CREATED',
        row.id,
      );
      return row;
    });
  }

  async updateWindow(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateCollectionWindowDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const current = await this.window(tx, scope, id);
      if (Object.values(input).includes(null))
        throw new BadRequestException(
          'Collection window fields cannot be null',
        );
      if (
        await tx.distributionAllocation.count({
          where: {
            programmeId: scope.programmeId,
            collectionWindowId: id,
            status: { in: ['collected', 'delivered'] },
          },
        })
      )
        throw new ConflictException(
          'Collection windows with completed handoffs cannot be changed',
        );
      const data = this.windowData({
        location: input.location ?? current.location,
        startsAt: input.startsAt ?? current.startsAt.toISOString(),
        endsAt: input.endsAt ?? current.endsAt.toISOString(),
        instructions: input.instructions ?? current.instructions,
      });
      const row = await tx.collectionWindow.update({
        where: { id, programmeId: scope.programmeId },
        data,
      });
      await this.audit(tx, scope, actorId, 'DISTRIBUTION_WINDOW_UPDATED', id);
      return row;
    });
  }

  async queue(
    scope: Scope,
    actor: AuthenticatedUser,
    query: ProgrammeListQuery,
  ) {
    const volunteer = await this.operations.currentVolunteer(
      this.prisma,
      scope,
      actor,
    );
    if (!volunteer.departments.includes('distribution'))
      throw new ForbiddenException('Distribution assignment is required');
    const assignments = await this.prisma.volunteerTask.findMany({
      where: {
        programmeId: scope.programmeId,
        department: 'distribution',
        assigneeId: volunteer.id,
        resourceId: { not: null },
      },
      select: { resourceId: true },
    });
    const rows = await this.prisma.distributionAllocation.findMany({
      where: {
        programmeId: scope.programmeId,
        status: { in: [...inProgress] },
        id: {
          in: assignments.flatMap((assignment) =>
            assignment.resourceId ? [assignment.resourceId] : [],
          ),
          gt: query.cursor,
        },
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: allocationSelect,
    });
    return page(rows.map(allocationView), query.limit);
  }

  async handoff(
    scope: Scope,
    id: string,
    actor: AuthenticatedUser,
    input: HandoffDto,
  ) {
    return this.serial(async (tx) => {
      const volunteer = await this.operations.currentVolunteer(
        tx,
        scope,
        actor,
      );
      if (!volunteer.departments.includes('distribution'))
        throw new ForbiddenException('Distribution assignment is required');
      const task = await tx.volunteerTask.findFirst({
        where: {
          programmeId: scope.programmeId,
          department: 'distribution',
          assigneeId: volunteer.id,
          resourceId: id,
        },
      });
      if (!task)
        throw new NotFoundException('Distribution assignment not found');
      const row = await tx.distributionAllocation.findFirst({
        where: { id, programmeId: scope.programmeId },
        select: { ...allocationSelect, collectionReference: true },
      });
      if (!row) throw new NotFoundException('Allocation not found');
      if (
        !row.collectionReference ||
        !this.sameProof(row.collectionReference, input.recipientProof)
      ) {
        throw new ForbiddenException('Collection reference does not match');
      }
      if (row.status === input.outcome) return allocationView(row);
      if (row.status !== 'packed')
        throw new ConflictException(
          'Only packed allocations can be handed off',
        );
      const updated = await tx.distributionAllocation.update({
        where: { id, programmeId: scope.programmeId },
        data: { status: input.outcome, handedOffAt: new Date() },
        select: allocationSelect,
      });
      await this.audit(
        tx,
        scope,
        actor.id,
        'DISTRIBUTION_' + input.outcome.toUpperCase(),
        id,
      );
      return allocationView(updated);
    });
  }

  async publicDistribution(organizationId: string, year: number) {
    const programme = await this.prisma.programme.findFirst({
      where: {
        organizationId,
        year,
        status: 'published',
        organization: { status: 'ACTIVE' },
      },
      select: { id: true, distributionPolicy: true },
    });
    if (!programme) throw new NotFoundException('Programme not found');
    const policy = policyView(programme.distributionPolicy).public;
    const windows = policy.enabled
      ? await this.prisma.collectionWindow.findMany({
          where: {
            programmeId: programme.id,
            allocations: {
              some: {
                recipientType: 'beneficiary',
                status: { in: [...reserved] },
              },
            },
          },
          orderBy: { startsAt: 'asc' },
          select: {
            location: true,
            startsAt: true,
            endsAt: true,
            instructions: true,
          },
        })
      : [];
    return {
      eligibilityGuidance: policy.guidance,
      locations: [...new Set(windows.map((window) => window.location))],
      collectionWindows: windows,
    };
  }

  private async findOwnBeneficiary(scope: Scope, userId: string) {
    await this.registrations.getProgramme(this.prisma, scope, true);
    const row = await this.prisma.beneficiary.findUnique({
      where: { programmeId_userId: { programmeId: scope.programmeId, userId } },
      include: { household: true },
    });
    if (!row) throw new NotFoundException('Beneficiary record not found');
    return row;
  }

  private async findBeneficiary(tx: Client, scope: Scope, id: string) {
    const row = await tx.beneficiary.findFirst({
      where: { id, programmeId: scope.programmeId },
      include: { household: true },
    });
    if (!row) throw new NotFoundException('Beneficiary record not found');
    return row;
  }

  private beneficiaryView(
    row: Awaited<ReturnType<DistributionService['findBeneficiary']>>,
  ) {
    return {
      id: row.id,
      householdId: row.householdId,
      eligibility: row.eligibility,
      reason: row.reason,
      linked: row.userId !== null,
      household: {
        name: row.household.name,
        address: row.household.address,
        contact: {
          email: row.household.contactEmail,
          phone: row.household.contactPhone,
        },
      },
    };
  }

  private async findHousehold(tx: Client, scope: Scope, id: string) {
    const row = await tx.household.findFirst({
      where: { id, organizationId: scope.organizationId },
    });
    if (!row) throw new NotFoundException('Household not found');
    return row;
  }

  private async window(tx: Client, scope: Scope, id: string) {
    const row = await tx.collectionWindow.findFirst({
      where: { id, programmeId: scope.programmeId },
    });
    if (!row) throw new NotFoundException('Collection window not found');
    return row;
  }

  private windowData(input: CollectionWindowDto) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const location = input.location?.trim();
    if (
      !location ||
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      throw new BadRequestException(
        'A location and valid collection window are required',
      );
    }
    return {
      location,
      startsAt,
      endsAt,
      instructions: input.instructions.trim(),
    };
  }

  private async validateRation(
    tx: Client,
    scope: Scope,
    input: DistributionAllocationDto,
  ) {
    const policy = policyView(
      await tx.distributionPolicy.findUnique({
        where: { programmeId: scope.programmeId },
      }),
    );
    if (input.recipientType === 'participant') {
      const registration = await tx.registration.findFirst({
        where: { programmeId: scope.programmeId, id: input.recipientId },
        include: { shareAllocation: true },
      });
      if (!registration) throw new NotFoundException('Registration not found');
      if (
        !policy.participant.enabled ||
        registration.status !== 'approved' ||
        !registration.shareAllocation
      ) {
        throw new ConflictException(
          'Participant is not eligible for allocation',
        );
      }
      if (
        input.quantityGrams >
        BigInt(policy.participant.gramsPerShare) *
          BigInt(registration.shareAllocation.shares)
      ) {
        throw new ConflictException('Quantity exceeds the participant ration');
      }
      return;
    }
    const beneficiary = await this.findBeneficiary(
      tx,
      scope,
      input.recipientId,
    );
    if (!policy.public.enabled || beneficiary.eligibility !== 'approved') {
      throw new ConflictException('Beneficiary is not eligible for allocation');
    }
    if (input.quantityGrams > policy.public.gramsPerHousehold)
      throw new ConflictException('Quantity exceeds the beneficiary ration');
  }

  private async stock(tx: Client, scope: Scope) {
    const measured = await tx.schedule.aggregate({
      where: {
        programmeId: scope.programmeId,
        department: 'processing',
        status: 'completed',
      },
      _sum: { measuredGrams: true },
    });
    const allocated = await tx.distributionAllocation.aggregate({
      where: { programmeId: scope.programmeId, status: { in: [...reserved] } },
      _sum: { quantityGrams: true },
    });
    const recordedGrams = measured._sum.measuredGrams ?? 0;
    const allocatedGrams = allocated._sum.quantityGrams ?? 0;
    return {
      recordedGrams,
      allocatedGrams,
      availableGrams: recordedGrams - allocatedGrams,
    };
  }

  private async findAllocation(tx: Client, scope: Scope, id: string) {
    const row = await tx.distributionAllocation.findFirst({
      where: { id, programmeId: scope.programmeId },
      select: allocationSelect,
    });
    if (!row) throw new NotFoundException('Allocation not found');
    return row;
  }

  private sameProof(expected: string, proof: string) {
    const given = Buffer.from(proof.toLowerCase());
    const secret = Buffer.from(expected);
    return given.length === secret.length && timingSafeEqual(given, secret);
  }

  private digest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async serial<T>(work: (tx: Client) => Promise<T>) {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'Duplicate or concurrent distribution change. Refresh and retry.',
        );
      }
      throw error;
    }
  }

  private async audit(
    tx: Client,
    scope: Scope,
    actorId: string,
    action: string,
    targetId: string,
  ) {
    await tx.auditLog.create({
      data: {
        organizationId: scope.organizationId,
        actorId,
        action,
        targetType: 'distribution',
        targetId,
      },
    });
  }
}
