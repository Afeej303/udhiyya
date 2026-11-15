import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Animal,
  type AnimalGroup,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import { RegistrationService } from '../registration/registration.service.js';
import type {
  AllocationQuery,
  CreateAnimalDto,
  CreateAnimalGroupDto,
  CreateShareAllocationDto,
  UpdateAnimalDto,
  UpdateAnimalGroupDto,
} from './animals.dto.js';

type Scope = { organizationId: string; programmeId: string };
type Client = Prisma.TransactionClient;

function animalView(animal: Animal, allocatedShares: number) {
  return {
    id: animal.id,
    reference: animal.reference,
    shareCapacity: animal.shareCapacity,
    supplierName: animal.supplierName,
    procurementCost:
      animal.procurementCostMinor === null
        ? null
        : { amountMinor: animal.procurementCostMinor, currency: 'INR' },
    procuredAt: animal.procuredAt,
    allocatedShares,
  };
}

function groupView(
  group: AnimalGroup & { animal: Animal },
  assignedShares: number,
) {
  return {
    id: group.id,
    name: group.name,
    animalId: group.animalId,
    capacity: group.animal.shareCapacity,
    assignedShares,
  };
}

function page<T extends { id: string }>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1].id : null,
  };
}

@Injectable()
export class AnimalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationService,
  ) {}

  async listAnimals(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.animal.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    const ids = rows.map((row) => row.id);
    const totals = await this.prisma.shareAllocation.groupBy({
      by: ['animalId'],
      where: { programmeId: scope.programmeId, animalId: { in: ids } },
      _sum: { shares: true },
    });
    const totalsById = new Map(
      totals.map((row) => [row.animalId, row._sum.shares ?? 0]),
    );
    return page(
      rows.map((row) => animalView(row, totalsById.get(row.id) ?? 0)),
      query.limit,
    );
  }

  async getAnimal(scope: Scope, id: string) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const animal = await this.findAnimal(this.prisma, scope, id);
    const allocated = await this.sum(this.prisma, scope, { animalId: id });
    return animalView(animal, allocated);
  }

  async createAnimal(scope: Scope, actorId: string, input: CreateAnimalDto) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      const data = this.animalData(input);
      const animal = await tx.animal.create({
        data: {
          ...data,
          programmeId: scope.programmeId,
          reference: input.reference.trim(),
          shareCapacity: input.shareCapacity,
        },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'ANIMAL_CREATED',
        'animal',
        animal.id,
      );
      return animalView(animal, 0);
    });
  }

  async updateAnimal(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateAnimalDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      await this.findAnimal(tx, scope, id);
      const data = this.animalData(input);
      const allocated = await this.sum(tx, scope, { animalId: id });
      if (data.shareCapacity !== undefined && data.shareCapacity < allocated) {
        throw new ConflictException(
          'Capacity cannot be lower than already allocated shares',
        );
      }
      const animal = await tx.animal.update({
        where: { id, programmeId: scope.programmeId },
        data,
      });
      await this.audit(tx, scope, actorId, 'ANIMAL_UPDATED', 'animal', id);
      return animalView(animal, allocated);
    });
  }

  async listGroups(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.animalGroup.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      include: { animal: true },
    });
    const totals = await this.prisma.shareAllocation.groupBy({
      by: ['groupId'],
      where: {
        programmeId: scope.programmeId,
        groupId: { in: rows.map((row) => row.id) },
      },
      _sum: { shares: true },
    });
    const totalsById = new Map(
      totals.map((row) => [row.groupId, row._sum.shares ?? 0]),
    );
    return page(
      rows.map((row) => groupView(row, totalsById.get(row.id) ?? 0)),
      query.limit,
    );
  }

  async getGroup(scope: Scope, id: string) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const group = await this.findGroup(this.prisma, scope, id);
    return groupView(
      group,
      await this.sum(this.prisma, scope, { groupId: id }),
    );
  }

  async createGroup(
    scope: Scope,
    actorId: string,
    input: CreateAnimalGroupDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      await this.findAnimal(tx, scope, input.animalId);
      const group = await tx.animalGroup.create({
        data: {
          programmeId: scope.programmeId,
          name: this.groupName(input.name),
          animalId: input.animalId,
        },
        include: { animal: true },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'ANIMAL_GROUP_CREATED',
        'animal_group',
        group.id,
      );
      return groupView(group, 0);
    });
  }

  async updateGroup(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateAnimalGroupDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      const existing = await this.findGroup(tx, scope, id);
      const assigned = await this.sum(tx, scope, { groupId: id });

      const { animalId } = input;
      if (animalId === null)
        throw new BadRequestException('Animal ID is required');
      if (animalId !== undefined && animalId !== existing.animalId) {
        if (assigned > 0)
          throw new ConflictException(
            'An allocated group cannot change animals',
          );
        await this.findAnimal(tx, scope, animalId);
      }
      const group = await tx.animalGroup.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          name:
            input.name === undefined ? undefined : this.groupName(input.name),
          animalId,
        },
        include: { animal: true },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'ANIMAL_GROUP_UPDATED',
        'animal_group',
        id,
      );
      return groupView(group, assigned);
    });
  }

  async listAllocations(scope: Scope, query: AllocationQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.shareAllocation.findMany({
      where: {
        programmeId: scope.programmeId,
        registrationId: query.registrationId,
        groupId: query.groupId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: {
        id: true,
        registrationId: true,
        groupId: true,
        animalId: true,
        shares: true,
      },
    });
    return page(rows, query.limit);
  }

  async allocate(
    scope: Scope,
    actorId: string,
    input: CreateShareAllocationDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      const registration = await tx.registration.findFirst({
        where: { id: input.registrationId, programmeId: scope.programmeId },
      });
      if (!registration) throw new NotFoundException('Registration not found');
      if (registration.status !== 'approved')
        throw new ConflictException('Registration must be approved');
      if (input.shares > registration.shares)
        throw new ConflictException('Share allocation exceeds approved shares');

      const group = await this.findGroup(tx, scope, input.groupId);
      const allocated = await this.sum(tx, scope, { animalId: group.animalId });
      if (allocated + input.shares > group.animal.shareCapacity)
        throw new ConflictException('Animal capacity exceeded');

      const allocation = await tx.shareAllocation.create({
        data: {
          programmeId: scope.programmeId,
          groupId: group.id,
          animalId: group.animalId,
          registrationId: registration.id,
          shares: input.shares,
        },
        select: {
          id: true,
          registrationId: true,
          groupId: true,
          animalId: true,
          shares: true,
        },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'SHARES_ALLOCATED',
        'share_allocation',
        allocation.id,
      );
      return allocation;
    });
  }

  async release(scope: Scope, id: string, actorId: string) {
    await this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false);
      const allocation = await tx.shareAllocation.findFirst({
        where: { id, programmeId: scope.programmeId },
      });
      if (!allocation)
        throw new NotFoundException('Share allocation not found');
      if (
        await tx.schedule.findFirst({
          where: {
            programmeId: scope.programmeId,
            animalId: allocation.animalId,
            department: 'slaughter',
          },
          select: { id: true },
        })
      ) {
        throw new ConflictException(
          'Cannot release shares after slaughter has been scheduled',
        );
      }
      const deleted = await tx.shareAllocation.deleteMany({
        where: { id, programmeId: scope.programmeId },
      });
      if (!deleted.count)
        throw new NotFoundException('Share allocation not found');
      await this.audit(
        tx,
        scope,
        actorId,
        'SHARES_RELEASED',
        'share_allocation',
        id,
      );
    });
  }

  private async findAnimal(tx: Client, scope: Scope, id: string) {
    const animal = await tx.animal.findFirst({
      where: { id, programmeId: scope.programmeId },
    });
    if (!animal) throw new NotFoundException('Animal not found');
    return animal;
  }

  private async findGroup(tx: Client, scope: Scope, id: string) {
    const group = await tx.animalGroup.findFirst({
      where: { id, programmeId: scope.programmeId },
      include: { animal: true },
    });
    if (!group) throw new NotFoundException('Animal group not found');
    return group;
  }

  private async sum(
    tx: Client,
    scope: Scope,
    filter: { animalId?: string; groupId?: string },
  ) {
    const result = await tx.shareAllocation.aggregate({
      where: { programmeId: scope.programmeId, ...filter },
      _sum: { shares: true },
    });
    return result._sum.shares ?? 0;
  }

  private groupName(value: string) {
    const name = value?.trim();
    if (!name) throw new BadRequestException('Group name is required');
    return name;
  }

  private animalData(input: UpdateAnimalDto) {
    const reference = input.reference?.trim();
    if (input.reference !== undefined && !reference)
      throw new BadRequestException('Animal reference is required');
    if (input.shareCapacity === null)
      throw new BadRequestException('Share capacity is required');
    return {
      reference,
      shareCapacity: input.shareCapacity,
      supplierName:
        input.supplierName === undefined
          ? undefined
          : input.supplierName?.trim() || null,
      procurementCostMinor:
        input.procurementCost === undefined
          ? undefined
          : (input.procurementCost?.amountMinor ?? null),
      procuredAt:
        input.procuredAt == null
          ? input.procuredAt
          : new Date(input.procuredAt),
    };
  }

  private async serial<T>(work: (tx: Client) => Promise<T>) {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException(
            'A record with this reference or registration already exists',
          );
        if (error.code === 'P2034')
          throw new ConflictException(
            'Concurrent allocation change. Refresh and retry.',
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
    targetType: string,
    targetId: string,
  ) {
    await tx.auditLog.create({
      data: {
        organizationId: scope.organizationId,
        actorId,
        action,
        targetType,
        targetId,
      },
    });
  }
}
