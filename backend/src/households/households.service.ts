import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Household } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateHouseholdDto,
  HouseholdQuery,
  UpdateHouseholdDto,
} from './households.dto.js';

function project(row: Household) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    contact: {
      ...(row.contactEmail ? { email: row.contactEmail } : {}),
      ...(row.contactPhone ? { phone: row.contactPhone } : {}),
    },
  };
}

function normalize(input: UpdateHouseholdDto) {
  const name = input.name?.trim();
  const address = input.address?.trim();
  const phone = input.contact?.phone?.trim();
  if (
    (input.name !== undefined && !name) ||
    (input.address !== undefined && !address) ||
    (input.contact?.phone != null && !phone) ||
    input.contact === null
  ) {
    throw new BadRequestException('Household fields must be non-blank');
  }

  return {
    name,
    address,
    contactEmail:
      input.contact === undefined
        ? undefined
        : (input.contact.email?.toLowerCase() ?? null),
    contactPhone: input.contact === undefined ? undefined : (phone ?? null),
  };
}

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: HouseholdQuery) {
    const rows = await this.prisma.household.findMany({
      where: {
        organizationId,
        id: query.cursor ? { gt: query.cursor } : undefined,
        OR: query.search
          ? [
              { name: { contains: query.search, mode: 'insensitive' } },
              { address: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    const items = rows.slice(0, query.limit).map(project);
    return {
      items,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async get(organizationId: string, id: string) {
    const row = await this.prisma.household.findFirst({
      where: { organizationId, id },
    });
    if (!row) throw new NotFoundException('Household not found');
    return project(row);
  }

  async create(organizationId: string, input: CreateHouseholdDto) {
    const data = normalize(input);
    const row = await this.prisma.household.create({
      data: {
        ...data,
        organizationId,
        name: input.name.trim(),
        address: input.address.trim(),
      },
    });
    return project(row);
  }

  async update(organizationId: string, id: string, input: UpdateHouseholdDto) {
    try {
      const row = await this.prisma.household.update({
        where: { id, organizationId },
        data: normalize(input),
      });
      return project(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Household not found');
      }
      throw error;
    }
  }

  async import(organizationId: string, rows: CreateHouseholdDto[]) {
    const result = await this.prisma.household.createMany({
      data: rows.map((input) => ({
        ...normalize(input),
        organizationId,
        name: input.name.trim(),
        address: input.address.trim(),
      })),
    });
    return { importedCount: result.count, errors: [] };
  }
}
