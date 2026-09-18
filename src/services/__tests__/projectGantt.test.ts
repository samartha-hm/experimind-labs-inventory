import { describe, it, expect } from 'vitest';
import { ProjectGanttService } from '../ProjectGanttService';

describe('ProjectGanttService', () => {
  it('generates multi-project chronological milestone timelines', () => {
    const timeline = ProjectGanttService.getTimelineSchedule();
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].projectCode).toBeDefined();
    expect(timeline[0].phases.length).toBeGreaterThanOrEqual(4);
    expect(timeline[0].phases[0].startDate).toBeDefined();
    expect(timeline[0].phases[0].endDate).toBeDefined();
  });

  it('calculates daily workstation loads and flags bottlenecks', () => {
    const capacity = ProjectGanttService.getWorkstationCapacity();
    expect(capacity.workstations.length).toBe(3);

    const laserStation = capacity.workstations.find(w => w.workstationId === 'FABLAB_LASER');
    expect(laserStation).toBeDefined();
    expect(laserStation?.maxDailyCapacityHours).toBe(8);
    expect(laserStation?.dailyLoads.length).toBeGreaterThan(0);

    expect(capacity.bottleneckAlerts).toBeDefined();
  });
});
