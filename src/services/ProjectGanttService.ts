import { INITIAL_PROJECTS, Project } from '../data/projectsDataset';

export interface GanttPhase {
  phaseId: string;
  phaseName: string;
  workstation: 'PROCUREMENT' | 'FABLAB_LASER' | 'WET_LAB_CHEM' | 'PACKING_LINE' | 'QA_DISPATCH';
  startDate: string;
  endDate: string;
  durationDays: number;
  estimatedHours: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'BLOCKED';
  progressPercentage: number;
}

export interface ProjectGanttItem {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  startDate: string;
  deliveryDate: string;
  progressPercentage: number;
  phases: GanttPhase[];
}

export interface DailyWorkstationLoad {
  date: string;
  requiredHours: number;
  availableCapacityHours: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  contributingProjects: { projectCode: string; hours: number }[];
}

export interface WorkstationCapacity {
  workstationId: 'FABLAB_LASER' | 'WET_LAB_CHEM' | 'PACKING_LINE';
  workstationName: string;
  maxDailyCapacityHours: number;
  dailyLoads: DailyWorkstationLoad[];
}

export interface BottleneckAlert {
  date: string;
  workstationName: string;
  overloadHours: number;
  utilizationPercentage: number;
  involvedProjects: string[];
  recommendation: string;
}

class ProjectGanttServiceClass {
  public getTimelineSchedule(): ProjectGanttItem[] {
    return INITIAL_PROJECTS.map(project => {
      const baseStart = new Date(project.startDate || '2026-09-20');
      const startIso = baseStart.toISOString().split('T')[0];
      const deliveryIso = project.targetDeliveryDate || '2026-10-25';

      const phases: GanttPhase[] = [
        {
          phaseId: `${project.id}-PH1`,
          phaseName: 'BOM Freeze & Vendor Sourcing',
          workstation: 'PROCUREMENT',
          startDate: startIso,
          endDate: this.addDays(startIso, 4),
          durationDays: 4,
          estimatedHours: 16,
          status: project.status === 'PLANNING' ? 'IN_PROGRESS' : 'COMPLETED',
          progressPercentage: project.status === 'PLANNING' ? 50 : 100
        },
        {
          phaseId: `${project.id}-PH2`,
          phaseName: 'Wet Lab Chemical Aliquots',
          workstation: 'WET_LAB_CHEM',
          startDate: this.addDays(startIso, 5),
          endDate: this.addDays(startIso, 12),
          durationDays: 7,
          estimatedHours: 28,
          status: project.status === 'IN_PREP' ? 'IN_PROGRESS' : project.status === 'PLANNING' ? 'SCHEDULED' : 'COMPLETED',
          progressPercentage: project.status === 'IN_PREP' ? 65 : project.status === 'PLANNING' ? 0 : 100
        },
        {
          phaseId: `${project.id}-PH3`,
          phaseName: 'FabLab Laser Cutting & 2D Nesting',
          workstation: 'FABLAB_LASER',
          startDate: this.addDays(startIso, 8),
          endDate: this.addDays(startIso, 15),
          durationDays: 7,
          estimatedHours: 24,
          status: project.status === 'IN_PREP' ? 'IN_PROGRESS' : project.status === 'PLANNING' ? 'SCHEDULED' : 'COMPLETED',
          progressPercentage: project.status === 'IN_PREP' ? 40 : project.status === 'PLANNING' ? 0 : 100
        },
        {
          phaseId: `${project.id}-PH4`,
          phaseName: 'Color Pouch Bagging & Master Crating',
          workstation: 'PACKING_LINE',
          startDate: this.addDays(startIso, 16),
          endDate: this.addDays(startIso, 22),
          durationDays: 6,
          estimatedHours: 36,
          status: project.status === 'ASSEMBLY_QC' ? 'IN_PROGRESS' : 'SCHEDULED',
          progressPercentage: project.status === 'ASSEMBLY_QC' ? 30 : 0
        },
        {
          phaseId: `${project.id}-PH5`,
          phaseName: '21 CFR Part 11 Electronic QA Sign-Off & Dispatch',
          workstation: 'QA_DISPATCH',
          startDate: this.addDays(startIso, 23),
          endDate: deliveryIso,
          durationDays: 3,
          estimatedHours: 12,
          status: project.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED',
          progressPercentage: project.status === 'COMPLETED' ? 100 : 0
        }
      ];

      const completedPhases = phases.filter(p => p.status === 'COMPLETED').length;
      const progress = Math.round((completedPhases / phases.length) * 100);

      return {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        clientName: project.clientName,
        startDate: startIso,
        deliveryDate: deliveryIso,
        progressPercentage: progress,
        phases
      };
    });
  }

  public getWorkstationCapacity(): { workstations: WorkstationCapacity[]; bottleneckAlerts: BottleneckAlert[] } {
    const timelines = this.getTimelineSchedule();
    const stations: { id: 'FABLAB_LASER' | 'WET_LAB_CHEM' | 'PACKING_LINE'; name: string; maxHours: number }[] = [
      { id: 'FABLAB_LASER', name: 'FabLab Laser Cutting & CNC', maxHours: 8 },
      { id: 'WET_LAB_CHEM', name: 'Wet Lab Chemical Prep Benches', maxHours: 12 },
      { id: 'PACKING_LINE', name: 'Color Pouch & Crate Packing Line', maxHours: 20 }
    ];

    // Build 30-day window starting today
    const dateRange: string[] = [];
    const baseDate = new Date('2026-09-20');
    for (let i = 0; i < 30; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dateRange.push(d.toISOString().split('T')[0]);
    }

    const bottleneckAlerts: BottleneckAlert[] = [];

    const workstations: WorkstationCapacity[] = stations.map(st => {
      const dailyLoads: DailyWorkstationLoad[] = dateRange.map(date => {
        let requiredHours = 0;
        const contributing: { projectCode: string; hours: number }[] = [];

        timelines.forEach(p => {
          p.phases.forEach(ph => {
            if (ph.workstation === st.id && date >= ph.startDate && date <= ph.endDate) {
              const dailyRate = ph.estimatedHours / Math.max(1, ph.durationDays);
              requiredHours += dailyRate;
              contributing.push({ projectCode: p.projectCode, hours: Number(dailyRate.toFixed(1)) });
            }
          });
        });

        const util = Math.round((requiredHours / st.maxHours) * 100);
        const isOverloaded = requiredHours > st.maxHours;

        if (isOverloaded) {
          bottleneckAlerts.push({
            date,
            workstationName: st.name,
            overloadHours: Number((requiredHours - st.maxHours).toFixed(1)),
            utilizationPercentage: util,
            involvedProjects: contributing.map(c => c.projectCode),
            recommendation: `Stagger start date of ${contributing[0]?.projectCode || 'conflicting batch'} by 2 days or add a secondary operator shift.`
          });
        }

        return {
          date,
          requiredHours: Number(requiredHours.toFixed(1)),
          availableCapacityHours: st.maxHours,
          utilizationPercentage: util,
          isOverloaded,
          contributingProjects: contributing
        };
      });

      return {
        workstationId: st.id,
        workstationName: st.name,
        maxDailyCapacityHours: st.maxHours,
        dailyLoads
      };
    });

    return { workstations, bottleneckAlerts };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}

export const ProjectGanttService = new ProjectGanttServiceClass();
