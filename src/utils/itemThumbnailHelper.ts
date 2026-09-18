import { WorkItemCategory, WorkItemSourcingChannel } from '../data/projectsDataset';

export interface StemPresetImage {
  id: string;
  name: string;
  category: WorkItemCategory;
  url: string;
  emoji: string;
}

export const STEM_PRESET_IMAGES: StemPresetImage[] = [
  {
    id: 'optics-lens',
    name: 'Convex Lens & Optical Bench',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=400&auto=format&fit=crop&q=80',
    emoji: '🔍'
  },
  {
    id: 'optics-laser',
    name: 'Laser Beam & Reflection Mirror',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=400&auto=format&fit=crop&q=80',
    emoji: '🔴'
  },
  {
    id: 'chem-beaker',
    name: 'Chemical Solution & Glass Beaker',
    category: 'CHEMICAL_REAGENT',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&auto=format&fit=crop&q=80',
    emoji: '⚗️'
  },
  {
    id: 'chem-dropper',
    name: 'Dropper Bottle & Titration Reagent',
    category: 'CHEMICAL_REAGENT',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
    emoji: '🧪'
  },
  {
    id: 'fab-laser-mdf',
    name: 'Laser Cut MDF Wood Chassis',
    category: 'FABRICATION_LASER_3D',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=80',
    emoji: '🪵'
  },
  {
    id: 'fab-3d-bracket',
    name: '3D Printed Mechanical Bracket',
    category: 'FABRICATION_LASER_3D',
    url: 'https://images.unsplash.com/photo-1631553127988-34825d194553?w=400&auto=format&fit=crop&q=80',
    emoji: '🖨️'
  },
  {
    id: 'model-motor',
    name: 'Electric Motor & Dynamo Rig',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=400&auto=format&fit=crop&q=80',
    emoji: '⚙️'
  },
  {
    id: 'model-pulley',
    name: 'Pulley System & Gear Train',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&auto=format&fit=crop&q=80',
    emoji: '🔩'
  },
  {
    id: 'kit-pouch',
    name: 'Color-Coded Experiment Pouch',
    category: 'ACTIVITY_KIT',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    emoji: '📦'
  },
  {
    id: 'chart-periodic',
    name: 'Periodic Table & Wall Diagram',
    category: 'EDUCATIONAL_CHART',
    url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&auto=format&fit=crop&q=80',
    emoji: '📊'
  },
  {
    id: 'hw-caliper',
    name: 'Vernier Caliper & Measure Tools',
    category: 'HARDWARE_SUPPLIES',
    url: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=400&auto=format&fit=crop&q=80',
    emoji: '📐'
  },
  {
    id: 'hw-electronics',
    name: 'Sensor Node & Breadboard Wiring',
    category: 'HARDWARE_SUPPLIES',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80',
    emoji: '🔌'
  }
];

/**
 * Returns a suitable image thumbnail URL or SVG representation
 */
export function getItemThumbnailUrl(item: {
  name: string;
  category?: WorkItemCategory;
  sourcingChannel?: WorkItemSourcingChannel;
  imageUrl?: string;
}): string {
  if (item.imageUrl && item.imageUrl.trim()) {
    return item.imageUrl.trim();
  }

  const nameLower = (item.name || '').toLowerCase();

  // Search by name keywords
  if (nameLower.includes('lens') || nameLower.includes('optic') || nameLower.includes('prism') || nameLower.includes('mirror')) {
    return STEM_PRESET_IMAGES[0].url;
  }
  if (nameLower.includes('laser') || nameLower.includes('ray')) {
    return STEM_PRESET_IMAGES[1].url;
  }
  if (nameLower.includes('hcl') || nameLower.includes('naoh') || nameLower.includes('solution') || nameLower.includes('acid') || nameLower.includes('reagent')) {
    return STEM_PRESET_IMAGES[2].url;
  }
  if (nameLower.includes('dropper') || nameLower.includes('bottle') || nameLower.includes('aliquot')) {
    return STEM_PRESET_IMAGES[3].url;
  }
  if (nameLower.includes('mdf') || nameLower.includes('wood') || nameLower.includes('laser cut') || nameLower.includes('acrylic')) {
    return STEM_PRESET_IMAGES[4].url;
  }
  if (nameLower.includes('3d') || nameLower.includes('bracket') || nameLower.includes('mount')) {
    return STEM_PRESET_IMAGES[5].url;
  }
  if (nameLower.includes('motor') || nameLower.includes('dynamo') || nameLower.includes('generator')) {
    return STEM_PRESET_IMAGES[6].url;
  }
  if (nameLower.includes('pulley') || nameLower.includes('gear') || nameLower.includes('wheel')) {
    return STEM_PRESET_IMAGES[7].url;
  }
  if (nameLower.includes('chart') || nameLower.includes('poster') || nameLower.includes('table')) {
    return STEM_PRESET_IMAGES[9].url;
  }
  if (nameLower.includes('caliper') || nameLower.includes('gauge') || nameLower.includes('screw')) {
    return STEM_PRESET_IMAGES[10].url;
  }
  if (nameLower.includes('esp32') || nameLower.includes('sensor') || nameLower.includes('wire') || nameLower.includes('board')) {
    return STEM_PRESET_IMAGES[11].url;
  }

  // Fallback by category
  switch (item.category) {
    case 'CHEMICAL_REAGENT':
      return STEM_PRESET_IMAGES[2].url;
    case 'FABRICATION_LASER_3D':
      return STEM_PRESET_IMAGES[4].url;
    case 'WORKING_MODEL':
      return STEM_PRESET_IMAGES[6].url;
    case 'EDUCATIONAL_CHART':
      return STEM_PRESET_IMAGES[9].url;
    case 'HARDWARE_SUPPLIES':
      return STEM_PRESET_IMAGES[10].url;
    case 'ACTIVITY_KIT':
    default:
      return STEM_PRESET_IMAGES[8].url;
  }
}
