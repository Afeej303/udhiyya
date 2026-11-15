import { EmailService } from '../email/email.service.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { FinanceService } from '../finance/finance.service.js';
import {
  Prisma,
  type Department,
  type ProcessingStage,
  type Schedule,
  type Volunteer,
  type WorkState,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import { RegistrationService } from '../registration/registration.service.js';
import {
  processingStages,
  workStates,
  type CashSubmissionDto,
  type CreateIssueDto,
  type CreateScheduleDto,
  type CreateTaskDto,
  type CreateVolunteerDto,
  type OperationProgressDto,
  type OperationsQuery,
  type TaskProgressDto,
  type UpdateIssueDto,
  type UpdateScheduleDto,
  type UpdateTaskDto,
  type UpdateVolunteerDto,
} from './operations.dto.js';

type Scope = { organizationId: string; programmeId: string };
type Client = Prisma.TransactionClient;

const teamInclude = {
  team: { select: { volunteer: { select: { id: true, name: true } } } },
} satisfies Prisma.ScheduleInclude;

type FullSchedule = Prisma.ScheduleGetPayload<{ include: typeof teamInclude }>;

function scheduleView(row: FullSchedule) {
  return {
    id: row.id,
    department: row.department,
    animalId: row.animalId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    location: row.location,
    status: row.status,
    stage: row.stage,
    measuredGrams: row.measuredGrams,
    packageCount: row.packageCount,
    teamMemberIds: row.team.map((member) => member.volunteer.id),
    team: row.team.map((member) => member.volunteer),
  };
}

function volunteerView(row: Volunteer) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    departments: row.departments,
    active: row.active,
    status: row.active ? (row.userId ? 'active' : 'pending') : 'inactive',
  };
}

function page<T extends { id: string }>(items: T[], limit: number) {
  return {
    items: items.slice(0, limit),
    nextCursor: items.length > limit ? items[limit - 1].id : null,
  };
}

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationService,
    private readonly finance: FinanceService,
    private readonly email: EmailService,
  ) {}

  async volunteers(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.volunteer.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows.map(volunteerView), query.limit);
  }

  async createVolunteer(
    scope: Scope,
    actorId: string,
    input: CreateVolunteerDto,
  ) {
    const volunteer = await this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const row = await tx.volunteer.create({
        data: {
          programmeId: scope.programmeId,
          name: this.text(input.name),
          email: input.email.trim().toLowerCase(),
          departments: input.departments,
        },
      });
      await this.audit(tx, scope, actorId, 'VOLUNTEER_PROVISIONED', row.id);
      return row;
    });
    this.email.sendWelcomeEmail(volunteer.email, volunteer.name);
    return volunteerView(volunteer);
  }

  async updateVolunteer(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateVolunteerDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      await this.findVolunteer(tx, scope, id);
      if (input.departments === null || input.active === null)
        throw new BadRequestException('Volunteer fields cannot be null');
      const row = await tx.volunteer.update({
        where: { id, programmeId: scope.programmeId },
        data: { departments: input.departments, active: input.active },
      });
      await this.audit(tx, scope, actorId, 'VOLUNTEER_UPDATED', row.id);
      return volunteerView(row);
    });
  }

  async workspace(scope: Scope, actor: AuthenticatedUser) {
    const volunteer = await this.currentVolunteer(this.prisma, scope, actor);
    const [taskCount, scheduleCount] = await Promise.all([
      this.prisma.volunteerTask.count({
        where: {
          programmeId: scope.programmeId,
          assigneeId: volunteer.id,
          department: { in: volunteer.departments },
          status: { not: 'completed' },
        },
      }),
      this.prisma.schedule.count({
        where: {
          programmeId: scope.programmeId,
          department: { in: volunteer.departments },
          team: { some: { volunteerId: volunteer.id } },
          status: { not: 'completed' },
        },
      }),
    ]);
    return { volunteer: volunteerView(volunteer), taskCount, scheduleCount };
  }

  async listSchedules(
    scope: Scope,
    query: OperationsQuery,
    actor?: AuthenticatedUser,
    operationsOnly = false,
  ) {
    const volunteer = actor
      ? await this.currentVolunteer(this.prisma, scope, actor)
      : null;
    if (!volunteer)
      await this.registrations.getProgramme(this.prisma, scope, false);
    const allowed = volunteer?.departments ?? [
      'slaughter',
      'processing',
      'distribution',
      'finance',
    ];
    const departments = allowed.filter(
      (department) =>
        (!operationsOnly ||
          department === 'slaughter' ||
          department === 'processing') &&
        (!query.department || query.department === department),
    );
    const rows = await this.prisma.schedule.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
        department: { in: departments as Department[] },
        status: this.workState(query.status),
        team: volunteer ? { some: { volunteerId: volunteer.id } } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      include: teamInclude,
    });
    return page(rows.map(scheduleView), query.limit);
  }

  async createSchedule(
    scope: Scope,
    actorId: string,
    input: CreateScheduleDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const data = await this.scheduleData(tx, scope, input);
      const row = await tx.schedule.create({ data, select: { id: true } });
      await tx.scheduleMember.createMany({
        data: input.teamMemberIds.map((volunteerId) => ({
          programmeId: scope.programmeId,
          scheduleId: row.id,
          volunteerId,
        })),
      });
      await this.audit(tx, scope, actorId, 'OPERATION_SCHEDULED', row.id);
      return scheduleView(await this.findSchedule(tx, scope, row.id));
    });
  }

  async updateSchedule(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateScheduleDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const current = await this.findSchedule(tx, scope, id);
      if (current.status !== 'pending')
        throw new ConflictException('Only pending schedules can be edited');
      if (
        input.department === null ||
        input.startsAt === null ||
        input.endsAt === null ||
        input.location === null ||
        input.teamMemberIds === null
      ) {
        throw new BadRequestException(
          'Supplied schedule fields must have a value',
        );
      }
      const merged = {
        department: input.department ?? current.department,
        animalId:
          input.animalId === undefined ? current.animalId : input.animalId,
        startsAt: input.startsAt ?? current.startsAt.toISOString(),
        endsAt: input.endsAt ?? current.endsAt.toISOString(),
        location: input.location ?? current.location,
        teamMemberIds:
          input.teamMemberIds ??
          current.team.map((member) => member.volunteer.id),
      };
      const data = await this.scheduleData(tx, scope, merged);
      if (
        data.department !== current.department &&
        (await tx.volunteerTask.count({ where: { scheduleId: id } }))
      ) {
        throw new ConflictException(
          'A schedule with tasks cannot change departments',
        );
      }
      await tx.schedule.update({
        where: { id, programmeId: scope.programmeId },
        data,
      });
      if (input.teamMemberIds) {
        await tx.scheduleMember.deleteMany({
          where: { programmeId: scope.programmeId, scheduleId: id },
        });
        await tx.scheduleMember.createMany({
          data: merged.teamMemberIds.map((volunteerId) => ({
            programmeId: scope.programmeId,
            scheduleId: id,
            volunteerId,
          })),
        });
      }
      await this.audit(tx, scope, actorId, 'OPERATION_SCHEDULE_UPDATED', id);
      return scheduleView(await this.findSchedule(tx, scope, id));
    });
  }

  async listTasks(
    scope: Scope,
    query: OperationsQuery,
    actor?: AuthenticatedUser,
    financeOnly = false,
  ) {
    const volunteer = actor
      ? await this.currentVolunteer(this.prisma, scope, actor)
      : null;
    if (!volunteer)
      await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.volunteerTask.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
        department: {
          equals: financeOnly ? 'finance' : query.department,
          in: volunteer ? volunteer.departments : undefined,
        },
        status: this.workState(query.status),
        assigneeId: volunteer?.id,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows, query.limit);
  }

  async createTask(scope: Scope, actorId: string, input: CreateTaskDto) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const data = await this.taskData(tx, scope, input);
      const row = await tx.volunteerTask.create({ data });
      await this.audit(tx, scope, actorId, 'TASK_CREATED', row.id);
      return row;
    });
  }

  async updateTask(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateTaskDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const current = await this.findTask(tx, scope, id);
      if (current.status !== 'pending')
        throw new ConflictException('Only pending tasks can be edited');
      if (
        input.department === null ||
        input.assigneeId === null ||
        input.title === null
      ) {
        throw new BadRequestException('Supplied task fields must have a value');
      }
      const data = await this.taskData(tx, scope, {
        department: input.department ?? current.department,
        assigneeId: input.assigneeId ?? current.assigneeId,
        title: input.title ?? current.title,
        scheduleId:
          input.scheduleId === undefined
            ? current.scheduleId
            : input.scheduleId,
        resourceId:
          input.resourceId === undefined
            ? current.resourceId
            : input.resourceId,
      });
      if (
        data.department !== current.department ||
        data.resourceId !== current.resourceId
      ) {
        if (await tx.payment.count({ where: { cashAssignmentId: id } })) {
          throw new ConflictException(
            'A task with cash submissions cannot be reassigned to another registration',
          );
        }
      }
      const row = await tx.volunteerTask.update({
        where: { id, programmeId: scope.programmeId },
        data,
      });
      await this.audit(tx, scope, actorId, 'TASK_UPDATED', id);
      return row;
    });
  }

  async taskProgress(
    scope: Scope,
    id: string,
    actor: AuthenticatedUser,
    input: TaskProgressDto,
  ) {
    return this.serial(async (tx) => {
      const volunteer = await this.currentVolunteer(tx, scope, actor, true);
      const current = await this.assignedTask(tx, scope, volunteer, id);
      this.validateProgress(current.status, input.status);
      if (
        current.status === input.status &&
        (input.note === undefined || input.note === current.note)
      )
        return current;
      if (current.status === 'completed')
        throw new ConflictException('Completed tasks cannot be changed');
      const row = await tx.volunteerTask.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          status: input.status,
          note:
            input.note === undefined ? undefined : input.note?.trim() || null,
          updatedAt: new Date(),
        },
      });
      await this.audit(tx, scope, actor.id, 'TASK_PROGRESS_RECORDED', id);
      return row;
    });
  }

  async operationProgress(
    scope: Scope,
    id: string,
    actor: AuthenticatedUser,
    input: OperationProgressDto,
  ) {
    return this.serial(async (tx) => {
      const volunteer = await this.currentVolunteer(tx, scope, actor, true);
      const current = await this.assignedSchedule(tx, scope, volunteer, id);
      if (
        current.department !== 'slaughter' &&
        current.department !== 'processing'
      ) {
        throw new ConflictException(
          'Only slaughter or processing schedules have operational progress',
        );
      }
      this.validateProgress(current.status, input.status);
      const data = await this.progressData(tx, current, input);
      const unchanged =
        current.status === data.status &&
        current.stage === data.stage &&
        current.measuredGrams === data.measuredGrams &&
        current.packageCount === data.packageCount;
      if (unchanged) return scheduleView(current);
      if (current.status === 'completed')
        throw new ConflictException('Completed operations cannot be changed');

      const row = await tx.schedule.update({
        where: { id, programmeId: scope.programmeId },
        data,
        include: teamInclude,
      });
      await this.audit(tx, scope, actor.id, 'OPERATION_PROGRESS_RECORDED', id);
      return scheduleView(row);
    });
  }

  async issues(
    scope: Scope,
    query: OperationsQuery,
    actor?: AuthenticatedUser,
  ) {
    const volunteer = actor
      ? await this.currentVolunteer(this.prisma, scope, actor)
      : null;
    if (!volunteer)
      await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.operationIssue.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
        reporterId: volunteer?.id,
        department: query.department,
        status:
          query.status === 'open' || query.status === 'resolved'
            ? query.status
            : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows, query.limit);
  }

  async createIssue(
    scope: Scope,
    actor: AuthenticatedUser,
    input: CreateIssueDto,
  ) {
    return this.serial(async (tx) => {
      const volunteer = await this.currentVolunteer(tx, scope, actor, true);
      const task = input.taskId
        ? await this.assignedTask(tx, scope, volunteer, input.taskId)
        : null;
      const operation = input.operationId
        ? await this.assignedSchedule(tx, scope, volunteer, input.operationId)
        : null;
      if (
        task &&
        operation &&
        (task.department !== operation.department ||
          (task.scheduleId && task.scheduleId !== operation.id))
      ) {
        throw new BadRequestException(
          'Task and operation references must describe the same work',
        );
      }
      const row = await tx.operationIssue.create({
        data: {
          programmeId: scope.programmeId,
          reporterId: volunteer.id,
          department: task?.department ?? operation?.department ?? null,
          taskId: task?.id,
          operationId: operation?.id,
          description: this.text(input.description),
        },
      });
      await this.audit(tx, scope, actor.id, 'OPERATION_ISSUE_REPORTED', row.id);
      return row;
    });
  }

  async updateIssue(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateIssueDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const current = await tx.operationIssue.findFirst({
        where: { id, programmeId: scope.programmeId },
      });
      if (!current) throw new NotFoundException('Issue not found');
      const row = await tx.operationIssue.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          status: input.status,
          resolution:
            input.resolution === undefined
              ? undefined
              : input.resolution?.trim() || null,
        },
      });
      await this.audit(tx, scope, actorId, 'OPERATION_ISSUE_UPDATED', id);
      return row;
    });
  }

  async collections(
    scope: Scope,
    query: OperationsQuery,
    actor: AuthenticatedUser,
  ) {
    const tasks = await this.listTasks(scope, query, actor, true);
    const taskIds = tasks.items.map((task) => task.id);
    const registrationIds = tasks.items.flatMap((task) =>
      task.resourceId ? [task.resourceId] : [],
    );
    const [registrations, payments] = await Promise.all([
      this.prisma.registration.findMany({
        where: { programmeId: scope.programmeId, id: { in: registrationIds } },
        select: {
          id: true,
          status: true,
          feeMinor: true,
          applicant: { select: { name: true } },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          programmeId: scope.programmeId,
          cashAssignmentId: { in: taskIds },
          cashSubmittedById: actor.id,
        },
        select: {
          id: true,
          cashAssignmentId: true,
          amountMinor: true,
          status: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: 'desc' },
      }),
    ]);
    const registrationsById = new Map(
      registrations.map((registration) => [registration.id, registration]),
    );
    return {
      nextCursor: tasks.nextCursor,
      items: tasks.items.map((task) => ({
        ...task,
        registration: task.resourceId
          ? (registrationsById.get(task.resourceId) ?? null)
          : null,
        submissions: payments
          .filter((payment) => payment.cashAssignmentId === task.id)
          .map((payment) => ({
            id: payment.id,
            amount: { amountMinor: payment.amountMinor, currency: 'INR' },
            status: payment.status,
            receivedAt: payment.receivedAt,
          })),
      })),
    };
  }

  async submitCash(
    scope: Scope,
    actor: AuthenticatedUser,
    input: CashSubmissionDto,
  ) {
    return this.serial(async (tx) => {
      const volunteer = await this.currentVolunteer(tx, scope, actor, true);
      const task = await this.assignedTask(
        tx,
        scope,
        volunteer,
        input.assignmentId,
      );
      if (task.department !== 'finance' || !task.resourceId)
        throw new NotFoundException('Collection assignment not found');
      return this.finance.recordInTransaction(
        tx,
        scope,
        actor.id,
        {
          registrationId: task.resourceId,
          amount: input.amount,
          method: 'cash',
          reference: input.reference,
          receivedAt: input.receivedAt,
        },
        task.id,
      );
    });
  }

  async currentVolunteer(
    client: Client,
    scope: Scope,
    actor: AuthenticatedUser,
    writable = false,
  ) {
    await this.registrations.getProgramme(client, scope, false, writable);
    if (!actor.emailVerifiedAt)
      throw new ForbiddenException('Verified email is required');
    const row = await client.volunteer.findFirst({
      where: {
        programmeId: scope.programmeId,
        active: true,
        OR: [
          { userId: actor.id },
          { userId: null, email: actor.email.toLowerCase() },
        ],
      },
    });
    if (!row)
      throw new ForbiddenException('Active volunteer assignment is required');
    if (row.userId) return row;

    const linked = await client.volunteer.updateMany({
      where: {
        id: row.id,
        active: true,
        userId: null,
        email: actor.email.toLowerCase(),
      },
      data: { userId: actor.id },
    });
    if (!linked.count) {
      const current = await client.volunteer.findFirst({
        where: {
          programmeId: scope.programmeId,
          userId: actor.id,
          active: true,
        },
      });
      if (!current)
        throw new ForbiddenException('Volunteer assignment is unavailable');
      return current;
    }
    return { ...row, userId: actor.id };
  }

  private async scheduleData(
    tx: Client,
    scope: Scope,
    input: CreateScheduleDto,
  ) {
    const startsAt = this.date(input.startsAt);
    const endsAt = this.date(input.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException('Schedule end must follow start');
    const isOperation =
      input.department === 'slaughter' || input.department === 'processing';
    if (isOperation && !input.animalId)
      throw new BadRequestException(
        'Animal is required for slaughter and processing',
      );
    if (input.animalId) {
      const animal = await tx.animal.findFirst({
        where: { id: input.animalId, programmeId: scope.programmeId },
      });
      if (!animal) throw new NotFoundException('Animal not found');
      if (
        input.department === 'slaughter' &&
        !(await tx.shareAllocation.findFirst({
          where: { programmeId: scope.programmeId, animalId: animal.id },
          select: { id: true },
        }))
      ) {
        throw new ConflictException(
          'Slaughter requires a confirmed animal assignment',
        );
      }
    }
    const assigned = await tx.volunteer.count({
      where: {
        programmeId: scope.programmeId,
        active: true,
        departments: { has: input.department },
        id: { in: input.teamMemberIds },
      },
    });
    if (assigned !== input.teamMemberIds.length)
      throw new ConflictException(
        'Every team member must belong to the selected department',
      );
    return {
      programmeId: scope.programmeId,
      department: input.department,
      animalId: input.animalId ?? null,
      startsAt,
      endsAt,
      location: this.text(input.location),
    };
  }

  private async taskData(tx: Client, scope: Scope, input: CreateTaskDto) {
    const volunteer = await this.findVolunteer(tx, scope, input.assigneeId);
    if (
      !volunteer.active ||
      !volunteer.departments.includes(input.department)
    ) {
      throw new ConflictException(
        'Assignee must be active in the selected department',
      );
    }
    if (input.scheduleId) {
      const schedule = await this.findSchedule(tx, scope, input.scheduleId);
      if (
        schedule.department !== input.department ||
        !schedule.team.some((member) => member.volunteer.id === volunteer.id)
      ) {
        throw new ConflictException(
          'Assignee is not part of the selected schedule',
        );
      }
    }
    if (input.resourceId) {
      const resource =
        input.department === 'finance'
          ? await tx.registration.findFirst({
              where: {
                id: input.resourceId,
                programmeId: scope.programmeId,
                status: 'approved',
              },
            })
          : input.department === 'distribution'
            ? await tx.distributionAllocation.findFirst({
                where: {
                  id: input.resourceId,
                  programmeId: scope.programmeId,
                  status: { in: ['confirmed', 'packed'] },
                },
                select: { id: true },
              })
            : await tx.animal.findFirst({
                where: { id: input.resourceId, programmeId: scope.programmeId },
              });
      if (!resource) throw new NotFoundException('Assigned resource not found');
    }
    return {
      programmeId: scope.programmeId,
      department: input.department,
      assigneeId: input.assigneeId,
      title: this.text(input.title),
      scheduleId: input.scheduleId ?? null,
      resourceId: input.resourceId ?? null,
    };
  }

  private async progressData(
    tx: Client,
    current: Schedule,
    input: OperationProgressDto,
  ) {
    if (current.department === 'slaughter') {
      if (
        input.stage != null ||
        input.measuredGrams != null ||
        input.packageCount != null
      ) {
        throw new BadRequestException(
          'Processing fields require a processing schedule',
        );
      }
      return {
        status: input.status,
        stage: null,
        measuredGrams: null,
        packageCount: null,
      };
    }
    if (
      input.status !== 'pending' &&
      !(await tx.schedule.findFirst({
        where: {
          programmeId: current.programmeId,
          animalId: current.animalId,
          department: 'slaughter',
          status: 'completed',
        },
        select: { id: true },
      }))
    ) {
      throw new ConflictException(
        'Complete slaughter before starting processing',
      );
    }
    const stage =
      input.stage ??
      current.stage ??
      (input.status !== 'pending' ? 'cutting' : null);
    if (stage && input.status === 'pending')
      throw new ConflictException('Start processing before recording a stage');
    if (
      stage &&
      current.stage &&
      processingStages.indexOf(stage) < processingStages.indexOf(current.stage)
    ) {
      throw new ConflictException(
        'Processing cannot return to an earlier stage',
      );
    }
    if (
      input.measuredGrams != null &&
      stage !== 'weighing' &&
      stage !== 'packaging'
    ) {
      throw new ConflictException('Record weight during weighing or packaging');
    }
    if (input.packageCount != null && stage !== 'packaging')
      throw new ConflictException('Record packages during packaging');
    const measuredGrams = input.measuredGrams ?? current.measuredGrams;
    const packageCount = input.packageCount ?? current.packageCount;
    if (
      input.status === 'completed' &&
      (stage !== 'packaging' || measuredGrams === null || packageCount === null)
    ) {
      throw new ConflictException(
        'Complete packaging and record actual weight and package count',
      );
    }
    return {
      status: input.status,
      stage: stage as ProcessingStage | null,
      measuredGrams,
      packageCount,
    };
  }

  private async findVolunteer(tx: Client, scope: Scope, id: string) {
    const row = await tx.volunteer.findFirst({
      where: { id, programmeId: scope.programmeId },
    });
    if (!row) throw new NotFoundException('Volunteer not found');
    return row;
  }

  private async findSchedule(tx: Client, scope: Scope, id: string) {
    const row = await tx.schedule.findFirst({
      where: { id, programmeId: scope.programmeId },
      include: teamInclude,
    });
    if (!row) throw new NotFoundException('Schedule not found');
    return row;
  }

  private async findTask(tx: Client, scope: Scope, id: string) {
    const row = await tx.volunteerTask.findFirst({
      where: { id, programmeId: scope.programmeId },
    });
    if (!row) throw new NotFoundException('Task not found');
    return row;
  }

  private async assignedTask(
    tx: Client,
    scope: Scope,
    volunteer: Volunteer,
    id: string,
  ) {
    const row = await this.findTask(tx, scope, id);
    if (
      row.assigneeId !== volunteer.id ||
      !volunteer.departments.includes(row.department)
    )
      throw new NotFoundException('Task not found');
    return row;
  }

  private async assignedSchedule(
    tx: Client,
    scope: Scope,
    volunteer: Volunteer,
    id: string,
  ) {
    const row = await this.findSchedule(tx, scope, id);
    if (
      !volunteer.departments.includes(row.department) ||
      !row.team.some((member) => member.volunteer.id === volunteer.id)
    ) {
      throw new NotFoundException('Schedule not found');
    }
    return row;
  }

  private text(value: string) {
    const text = value?.trim();
    if (!text) throw new BadRequestException('Value must be non-blank');
    return text;
  }

  private date(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Invalid timestamp');
    return date;
  }

  private workState(value: OperationsQuery['status']) {
    if (value === 'open' || value === 'resolved')
      throw new BadRequestException('Invalid work status filter');
    return value;
  }

  private validateProgress(current: WorkState, next: WorkState) {
    const difference = workStates.indexOf(next) - workStates.indexOf(current);
    if (difference < 0 || difference > 1)
      throw new ConflictException('Invalid status transition');
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
          'Duplicate or concurrent operations change. Refresh and retry.',
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
        targetType: 'programme_operation',
        targetId,
      },
    });
  }
}
