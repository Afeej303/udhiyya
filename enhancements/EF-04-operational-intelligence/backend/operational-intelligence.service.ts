/**
 * EF-04: Operational Intelligence – Service Layer
 * Owned by M3. Loaded via M2's flag-guarded extension hook.
 * Flag: FEATURE_EF_04 (default off)
 *
 * Capabilities:
 * 1. Department status aggregation across slaughter, processing, and distribution.
 * 2. Operational bottleneck detection: overdue tasks, stalled departments,
 *    workload imbalance, and schedule (SLA) delays.
 *
 * Data source: Prisma-like interface so the service can be unit tested
 * without a live database. The controller injects the real Prisma client.
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export interface DepartmentStatus {
  name: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  volunteers: number;
  expectedProgress: number; // 0 - 100
  actualProgress: number;   // 0 - 100
}

export interface OperationalStatusResult {
  programmeId: number;
  programmeTitle: string;
  generatedAt: string;
  departments: DepartmentStatus[];
  slaughterProgress: number;    // percentage
  processingCompletion: number; // percentage
  packagesDistributed: number;
  totalIssues: number;
  highSeverityIssues: number;
}

export interface OperationalIssue {
  id: string;
  department: string;
  type: 'delay' | 'overdue' | 'workload_imbalance' | 'stall';
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  metric: number;
  threshold: number;
  detectedAt: string;
}

// ---------------------------------------------------------------------------
// Prisma Compatibility Interface
// ---------------------------------------------------------------------------

export interface PrismaLike {
  programme: {
    findUnique: (args: any) => Promise<any>;
  };
  department: {
    findMany: (args: any) => Promise<any[]>;
  };
  task: {
    findMany: (args: any) => Promise<any[]>;
  };
  distribution: {
    findMany: (args: any) => Promise<any[]>;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class OperationalIntelligenceService {
  private readonly prisma: PrismaLike;

  constructor(prisma?: PrismaLike) {
    this.prisma = prisma || {
      programme: { findUnique: async () => null },
      department: { findMany: async () => [] },
      task: { findMany: async () => [] },
      distribution: { findMany: async () => [] },
    };
  }

  /**
   * Fetches the current operational status for a programme.
   * Throws NOT_FOUND if the programme does not exist.
   */
  public async getStatus(programmeId: number): Promise<OperationalStatusResult> {
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) {
      throw new Error(`Programme with ID ${programmeId} not found`);
    }

    const departments = await this.prisma.department.findMany({ where: { programmeId } });
    const tasks = await this.prisma.task.findMany({ where: { programmeId } });
    const distributions = await this.prisma.distribution.findMany({ where: { programmeId } });

    const now = new Date();

    const departmentStatuses: DepartmentStatus[] = departments.map((dept: any) => {
      const deptTasks = tasks.filter((t: any) => t.departmentId === dept.id);
      const completed = deptTasks.filter((t: any) => t.status === 'completed').length;
      const overdue = deptTasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed',
      ).length;
      const actualProgress = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;
      return {
        name: dept.name,
        totalTasks: deptTasks.length,
        completedTasks: completed,
        overdueTasks: overdue,
        volunteers: dept.volunteers || 0,
        expectedProgress: dept.expectedProgress || 100,
        actualProgress,
      };
    });

    const slaughter = departmentStatuses.find((d: any) => d.name.toLowerCase().includes('slaughter'));
    const processing = departmentStatuses.find((d: any) => d.name.toLowerCase().includes('processing'));

    const packagesDistributed = distributions.filter((d: any) => d.status === 'delivered').length;

    const issues = await this.getIssues(programmeId);

    return {
      programmeId,
      programmeTitle: programme.title || `Programme ${programmeId}`,
      generatedAt: new Date().toISOString(),
      departments: departmentStatuses,
      slaughterProgress: slaughter
        ? Math.round((slaughter.completedTasks / Math.max(slaughter.totalTasks, 1)) * 100)
        : 0,
      processingCompletion: processing
        ? Math.round((processing.completedTasks / Math.max(processing.totalTasks, 1)) * 100)
        : 0,
      packagesDistributed,
      totalIssues: issues.length,
      highSeverityIssues: issues.filter((i: OperationalIssue) => i.severity === 'high').length,
    };
  }

  /**
   * Detects operational issues: bottlenecks, overdue tasks, workload imbalance.
   */
  public async getIssues(programmeId: number): Promise<OperationalIssue[]> {
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) {
      throw new Error(`Programme with ID ${programmeId} not found`);
    }

    const departments = await this.prisma.department.findMany({ where: { programmeId } });
    const tasks = await this.prisma.task.findMany({ where: { programmeId } });
    const now = new Date();

    const issues: OperationalIssue[] = [];

    // 1. Overdue tasks per department
    for (const dept of departments) {
      const deptTasks = tasks.filter((t: any) => t.departmentId === dept.id);
      const overdue = deptTasks.filter((t: any) =>
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed',
      );
      if (overdue.length > 0) {
        const oldestDays = Math.max(
          ...overdue.map((t: any) =>
            Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / 86400000),
          ),
        );
        issues.push({
          id: `overdue-${dept.id}`,
          department: dept.name,
          type: 'overdue',
          severity: overdue.length >= 5 ? 'high' : overdue.length >= 2 ? 'medium' : 'low',
          title: `${overdue.length} overdue task(s) in ${dept.name}`,
          detail: `Oldest overdue task is ${oldestDays} day(s) past due.`,
          metric: overdue.length,
          threshold: 1,
          detectedAt: now.toISOString(),
        });
      }
    }

    // 2. Stalled department (tasks exist but none completed)
    for (const dept of departments) {
      const deptTasks = tasks.filter((t: any) => t.departmentId === dept.id);
      const completed = deptTasks.filter((t: any) => t.status === 'completed').length;
      if (deptTasks.length > 0 && completed === 0) {
        issues.push({
          id: `stall-${dept.id}`,
          department: dept.name,
          type: 'stall',
          severity: 'high',
          title: `${dept.name} has made no progress`,
          detail: `${deptTasks.length} task(s) assigned but none completed.`,
          metric: 0,
          threshold: 1,
          detectedAt: now.toISOString(),
        });
      }
    }

    // 3. Workload imbalance (tasks per volunteer vs average)
    const totalTasks = tasks.length;
    const totalVolunteers = departments.reduce((sum: number, d: any) => sum + (d.volunteers || 0), 0);
    if (totalTasks > 0 && totalVolunteers > 0) {
      const avgLoad = totalTasks / totalVolunteers;
      for (const dept of departments) {
        const deptTasks = tasks.filter((t: any) => t.departmentId === dept.id);
        if (dept.volunteers > 0) {
          const load = deptTasks.length / dept.volunteers;
          if (load > avgLoad * 1.5) {
            issues.push({
              id: `imbalance-${dept.id}`,
              department: dept.name,
              type: 'workload_imbalance',
              severity: 'medium',
              title: `${dept.name} is overloaded`,
              detail: `Task per volunteer ratio is ${load.toFixed(2)} vs average ${avgLoad.toFixed(2)}.`,
              metric: load,
              threshold: avgLoad * 1.5,
              detectedAt: now.toISOString(),
            });
          }
        }
      }
    }

    // 4. SLA breach (expected progress vs actual)
    for (const dept of departments) {
      const deptTasks = tasks.filter((t: any) => t.departmentId === dept.id);
      const completed = deptTasks.filter((t: any) => t.status === 'completed').length;
      const actualProgress = deptTasks.length > 0 ? (completed / deptTasks.length) * 100 : 0;
      const expected = dept.expectedProgress || 100;
      if (actualProgress < expected - 20) {
        issues.push({
          id: `sla-${dept.id}`,
          department: dept.name,
          type: 'delay',
          severity: actualProgress < expected - 40 ? 'high' : 'medium',
          title: `${dept.name} is behind schedule`,
          detail: `Actual progress ${actualProgress.toFixed(0)}% vs expected ${expected}%.`,
          metric: actualProgress,
          threshold: expected,
          detectedAt: now.toISOString(),
        });
      }
    }

    return issues;
  }
}
