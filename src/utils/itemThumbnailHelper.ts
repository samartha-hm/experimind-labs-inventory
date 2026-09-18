import { WorkItemCategory, WorkItemSourcingChannel } from '../data/projectsDataset';

export interface StemPresetImage {
  id: string;
  name: string;
  category: string;
  url: string;
  emoji: string;
}

export const STEM_PRESET_IMAGES: StemPresetImage[] = [
  {
    id: 'optics-lens',
    name: 'Convex Lens & Optical Bench',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&auto=format&fit=crop&q=80',
    emoji: '🔍'
  },
  {
    id: 'optics-laser',
    name: 'Laser Beam & Ray Box',
    category: 'WORKING_MODEL',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=600&auto=format&fit=crop&q=80',
    emoji: '🔴'
  },
  {
    id: 'chem-beaker',
    name: 'Chemical Solution & Glass Beaker',
    category: 'Chemicals',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=80',
    emoji: '⚗️'
  },
  {
    id: 'chem-dropper',
    name: 'Dropper Bottle & Titration Reagent',
    category: 'Chemicals',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    emoji: '🧪'
  },
  {
    id: 'fab-laser-mdf',
    name: 'Laser Cut MDF Wood Chassis',
    category: 'FABRICATION_LASER_3D',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    emoji: '🪵'
  },
  {
    id: 'fab-3d-bracket',
    name: '3D Printed Mechanical Bracket',
    category: 'FABRICATION_LASER_3D',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    emoji: '🖨️'
  },
  {
    id: 'model-motor',
    name: 'Electric Motor & Dynamo Rig',
    category: 'Electronics',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
    emoji: '⚙️'
  },
  {
    id: 'model-pulley',
    name: 'Pulley System & Gear Train',
    category: 'Prastuti Science',
    url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&auto=format&fit=crop&q=80',
    emoji: '🔩'
  },
  {
    id: 'kit-pouch',
    name: 'Color-Coded Experiment Pouch / Kit',
    category: 'kits',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    emoji: '📦'
  },
  {
    id: 'chart-periodic',
    name: 'Periodic Table & Educational Wall Chart',
    category: 'Stationary',
    url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
    emoji: '📊'
  },
  {
    id: 'hw-caliper',
    name: 'Vernier Caliper & Measure Tools',
    category: 'Prastuti Maths',
    url: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&auto=format&fit=crop&q=80',
    emoji: '📐'
  },
  {
    id: 'hw-electronics',
    name: 'Microcontroller & Sensor Breadboard',
    category: 'Electronics',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    emoji: '🔌'
  },
  {
    id: 'bio-microscope',
    name: 'Microscope & Biology Slide Prep',
    category: 'Prastuti Science',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80',
    emoji: '🔬'
  },
  {
    id: 'maths-geometry',
    name: '3D Geometry Solid Shapes & Compass',
    category: 'Prastuti Maths',
    url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&auto=format&fit=crop&q=80',
    emoji: '📏'
  }
];

/**
 * Returns a suitable image thumbnail URL or SVG representation
 */
export function getItemThumbnailUrl(item: {
  name: string;
  category?: string;
  sourcingChannel?: string;
  imageUrl?: string;
}): string {
  if (item.imageUrl && item.imageUrl.trim()) {
    return item.imageUrl.trim();
  }

  const nameLower = (item.name || '').toLowerCase();
  const catLower = (item.category || '').toLowerCase();

  // Search by name keywords
  if (nameLower.includes('lens') || nameLower.includes('optic') || nameLower.includes('prism') || nameLower.includes('mirror')) {
    return STEM_PRESET_IMAGES[0].url;
  }
  if (nameLower.includes('laser') || nameLower.includes('ray')) {
    return STEM_PRESET_IMAGES[1].url;
  }
  if (nameLower.includes('hcl') || nameLower.includes('naoh') || nameLower.includes('solution') || nameLower.includes('acid') || nameLower.includes('reagent') || nameLower.includes('salt') || nameLower.includes('chemical')) {
    return STEM_PRESET_IMAGES[2].url;
  }
  if (nameLower.includes('dropper') || nameLower.includes('bottle') || nameLower.includes('aliquot') || nameLower.includes('test tube') || nameLower.includes('pipette')) {
    return STEM_PRESET_IMAGES[3].url;
  }
  if (nameLower.includes('mdf') || nameLower.includes('wood') || nameLower.includes('laser cut') || nameLower.includes('acrylic') || nameLower.includes('chassis')) {
    return STEM_PRESET_IMAGES[4].url;
  }
  if (nameLower.includes('3d') || nameLower.includes('bracket') || nameLower.includes('mount') || nameLower.includes('stand') || nameLower.includes('clamp')) {
    return STEM_PRESET_IMAGES[5].url;
  }
  if (nameLower.includes('motor') || nameLower.includes('dynamo') || nameLower.includes('generator') || nameLower.includes('engine')) {
    return STEM_PRESET_IMAGES[6].url;
  }
  if (nameLower.includes('pulley') || nameLower.includes('gear') || nameLower.includes('wheel') || nameLower.includes('belt')) {
    return STEM_PRESET_IMAGES[7].url;
  }
  if (nameLower.includes('chart') || nameLower.includes('poster') || nameLower.includes('table') || nameLower.includes('diagram') || nameLower.includes('flex')) {
    return STEM_PRESET_IMAGES[9].url;
  }
  if (nameLower.includes('caliper') || nameLower.includes('gauge') || nameLower.includes('screw') || nameLower.includes('vernier') || nameLower.includes('ruler')) {
    return STEM_PRESET_IMAGES[10].url;
  }
  if (nameLower.includes('esp32') || nameLower.includes('sensor') || nameLower.includes('wire') || nameLower.includes('board') || nameLower.includes('led') || nameLower.includes('resistor') || nameLower.includes('circuit') || nameLower.includes('battery')) {
    return STEM_PRESET_IMAGES[11].url;
  }
  if (nameLower.includes('microscope') || nameLower.includes('specimen') || nameLower.includes('slide') || nameLower.includes('biology') || nameLower.includes('plant')) {
    return STEM_PRESET_IMAGES[12].url;
  }
  if (nameLower.includes('geometry') || nameLower.includes('sphere') || nameLower.includes('cube') || nameLower.includes('cylinder') || nameLower.includes('cone') || nameLower.includes('math')) {
    return STEM_PRESET_IMAGES[13].url;
  }

  // Fallback by category
  if (catLower.includes('chem') || catLower === 'chemicals' || catLower === 'chemical_reagent') {
    return STEM_PRESET_IMAGES[2].url;
  }
  if (catLower.includes('elect') || catLower === 'electronics') {
    return STEM_PRESET_IMAGES[11].url;
  }
  if (catLower.includes('laser') || catLower.includes('fab') || catLower === 'fabrication_laser_3d') {
    return STEM_PRESET_IMAGES[4].url;
  }
  if (catLower.includes('math') || catLower === 'prastuti maths') {
    return STEM_PRESET_IMAGES[13].url;
  }
  if (catLower.includes('chart') || catLower.includes('stat') || catLower === 'stationary' || catLower === 'educational_chart') {
    return STEM_PRESET_IMAGES[9].url;
  }
  if (catLower.includes('science') || catLower === 'prastuti science' || catLower === 'working_model') {
    return STEM_PRESET_IMAGES[0].url;
  }
  if (catLower.includes('box') || catLower.includes('kit') || catLower === 'activity_kit' || catLower === 'kits') {
    return STEM_PRESET_IMAGES[8].url;
  }

  return STEM_PRESET_IMAGES[8].url;
}
