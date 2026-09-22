// Standardized role-neutral skill database for all worker and professional categories
// Covers Manpower, Hospitality, Driving, Construction, Agriculture, Cleaning, Office, and IT.

export interface SkillCategoryGroup {
  category: string;
  skills: string[];
}

export const UNIVERSAL_SKILLS_LIBRARY: Record<string, string[]> = {
  'Manpower & General Work': [
    'Loading & Unloading',
    'Packing & Labeling',
    'Material Handling',
    'Cleaning & Sanitation',
    'Housekeeping',
    'Warehouse Operations',
    'Stock Handling',
    'Manual Work',
    'Workplace Safety',
    'Time Management',
    'Dairy Production Support',
    'Milk & Dairy Product Handling',
    'Milk Processing',
    'Food Hygiene',
    'Factory Operations',
    'Assembly Line Work',
    'Packaging Operations',
    'Equipment Maintenance',
    'Quality Inspection',
    'Inventory Management',
    'Pallet Jack Operation',
    'Sorting & Stacking',
  ],
  'Hospitality & Food Service': [
    'Food Service',
    'Table Setting',
    'Customer Service',
    'Kitchen Assistance',
    'Food Preparation',
    'Housekeeping',
    'Food Hygiene',
    'Order Taking',
    'POS Handling',
    'Beverage Service',
    'Dishwashing & Kitchen Sanitation',
    'Buffet Setup',
    'Menu Knowledge',
    'Guest Relations',
    'Barista Skills',
    'Food Safety Compliance',
  ],
  'Driving & Transportation': [
    'Safe Driving',
    'Defensive Driving',
    'Route Planning',
    'Vehicle Maintenance',
    'GPS Navigation',
    'Heavy Vehicle Driving',
    'Forklift Operation',
    'Loading & Cargo Securing',
    'Traffic Law Compliance',
    'Delivery Operations',
    'Logistics Coordination',
    'Passenger Assistance',
  ],
  'Construction & Trades': [
    'Masonry',
    'Bricklaying',
    'Concrete Work',
    'Painting',
    'Carpentry',
    'Welding',
    'Plumbing',
    'Electrical Work',
    'Construction Site Safety',
    'Equipment Handling',
    'Scaffolding',
    'Blueprint Reading',
    'Tile Fixing',
    'Plastering',
    'Site Preparation',
    'Power Tool Operation',
  ],
  'Agriculture & Farming': [
    'Farming',
    'Crop Harvesting',
    'Irrigation',
    'Livestock Handling',
    'Agricultural Equipment',
    'Greenhouse Maintenance',
    'Dairy Farm Operations',
    'Soil Preparation',
    'Pest Control',
    'Animal Care & Feeding',
    'Pruning & Planting',
    'Milking Operations',
  ],
  'Cleaning & Housekeeping': [
    'Housekeeping',
    'Deep Cleaning',
    'Sanitization',
    'Laundry',
    'Waste Management',
    'Floor Cleaning',
    'Industrial Cleaning',
    'Cleaning Equipment Handling',
    'Chemical Safety & Handling',
    'Window Cleaning',
    'Bed Making & Room Prep',
    'Carpet Cleaning',
  ],
  'Office & Administration': [
    'Data Entry',
    'Documentation',
    'Customer Service',
    'Microsoft Office',
    'Microsoft Excel',
    'Communication',
    'Record Keeping',
    'Filing & Archiving',
    'Telephone Etiquette',
    'Scheduling & Calendar Management',
    'Billing & Invoicing',
    'Teamwork',
    'Problem Solving',
  ],
  'IT & Technical': [
    'Java',
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'SQL',
    'MySQL',
    'Git',
    'REST API',
    'Spring Boot',
    'Web Development',
    'Database Management',
    'IT Troubleshooting & Support',
    'Cloud Computing',
    'Computer Hardware Maintenance',
  ],
};

// Flat list of all unique skills sorted alphabetically
export const ALL_PREDEFINED_SKILLS: string[] = Array.from(
  new Set(Object.values(UNIVERSAL_SKILLS_LIBRARY).flat())
).sort((a, b) => a.localeCompare(b));

// Autocomplete search helper
export function searchSkills(query: string, maxResults: number = 12): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_PREDEFINED_SKILLS.slice(0, maxResults);

  // Exact startsWith first, then contains
  const startsWithList: string[] = [];
  const containsList: string[] = [];

  for (const skill of ALL_PREDEFINED_SKILLS) {
    const sLower = skill.toLowerCase();
    if (sLower.startsWith(q)) {
      startsWithList.push(skill);
    } else if (sLower.includes(q)) {
      containsList.push(skill);
    }
  }

  return [...startsWithList, ...containsList].slice(0, maxResults);
}
