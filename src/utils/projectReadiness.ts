import {
  Project,
  ProjectWorkItem,
  WorkItemSourcingChannel,
  WorkItemStatus
} from '../data/projectsDataset';

export interface ProjectReadinessSummary {
  totalItems: number;
  readyItems: number;
  pendingItems: number;
  inPrepItems: number;
  packedItems: number;
  readinessPercent: number;
  byChannel: Record<WorkItemSourcingChannel, number>;
  nextActions: Array<{
    channel: WorkItemSourcingChannel;
    label: string;
    count: number;
  }>;
}

const CHANNEL_LABELS: Record<WorkItemSourcingChannel, string> = {
  BUY_LOCAL: 'Buy locally',
  ORDER_ONLINE: 'Create purchase orders',
  LASER_CUT: 'Send to laser cutting',
  '3D_PRINT': 'Send to 3D printing',
  FOAM_CUT: 'Send to foam cutting',
  CHEMICAL_PREP: 'Prepare chemicals',
  CHART_PRINT: 'Print charts',
  MODEL_ASSEMBLY: 'Assemble models',
  IN_STOCK: 'Pick from stock'
};

const ACTION_ORDER: WorkItemSourcingChannel[] = [
  'ORDER_ONLINE',
  'CHEMICAL_PREP',
  'LASER_CUT',
  'MODEL_ASSEMBLY',
  'BUY_LOCAL',
  'IN_STOCK'
];

function flattenItems(project: Project): ProjectWorkItem[] {
  return (project.classes || []).flatMap((projectClass) => projectClass.items || []);
}

function countByStatus(items: ProjectWorkItem[], status: WorkItemStatus): number {
  return items.filter((item) => item.status === status).length;
}

export function getProjectReadinessSummary(project: Project): ProjectReadinessSummary {
  const items = flattenItems(project);
  const totalItems = items.length;
  const readyItems = countByStatus(items, 'READY');
  const packedItems = countByStatus(items, 'PACKED');
  const pendingItems = countByStatus(items, 'PENDING');
  const inPrepItems = countByStatus(items, 'IN_PREP');
  const byChannel = items.reduce<Record<WorkItemSourcingChannel, number>>((counts, item) => {
    counts[item.sourcingChannel] = (counts[item.sourcingChannel] || 0) + 1;
    return counts;
  }, {} as Record<WorkItemSourcingChannel, number>);

  const nextActions = ACTION_ORDER
    .map((channel) => ({
      channel,
      label: CHANNEL_LABELS[channel],
      count: items.filter((item) =>
        item.sourcingChannel === channel &&
        item.status !== 'READY' &&
        item.status !== 'PACKED'
      ).length
    }))
    .filter((action) => action.count > 0);

  return {
    totalItems,
    readyItems,
    pendingItems,
    inPrepItems,
    packedItems,
    readinessPercent: totalItems === 0 ? 0 : Math.round(((readyItems + packedItems) / totalItems) * 100),
    byChannel,
    nextActions
  };
}
