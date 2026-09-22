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

// ─────────────────────────────────────────────────────────────────────────────
// TARGET JOB → RECOMMENDED SKILLS DATABASE
// Standardized skill recommendations for manpower, trade, and professional roles
// ─────────────────────────────────────────────────────────────────────────────
export const TARGET_JOB_RECOMMENDED_SKILLS: Record<string, string[]> = {
  'Dairy Production Worker': [
    'Dairy Production Support',
    'Milk & Dairy Product Handling',
    'Animal Care & Feeding',
    'Packing & Labeling',
    'Loading & Unloading',
    'Cleaning & Sanitation',
    'Food Hygiene',
    'Food Safety',
    'Production Line Operation',
    'Chemical Safety & Handling',
    'Beverage Service',
    'Agricultural Equipment',
  ],
  'Cleaner / Housekeeper': [
    'Housekeeping',
    'Deep Cleaning',
    'Cleaning & Sanitation',
    'Laundry',
    'Waste Management',
    'Room Cleaning',
    'Bathroom Cleaning',
    'Chemical Handling',
    'Hygiene & Safety',
    'Time Management',
  ],
  'Driver': [
    'Safe Driving',
    'Defensive Driving',
    'Route Planning',
    'GPS Navigation',
    'Vehicle Maintenance',
    'Vehicle Inspection',
    'Road Safety',
    'Loading & Unloading',
    'Time Management',
  ],
  'Construction Worker': [
    'Masonry',
    'Bricklaying',
    'Concrete Work',
    'Material Handling',
    'Construction Site Safety',
    'Carpentry',
    'Painting',
    'Plastering',
    'Equipment Handling',
    'Manual Labor',
  ],
  'Warehouse Worker': [
    'Loading & Unloading',
    'Material Handling',
    'Packing',
    'Stock Handling',
    'Inventory Management',
    'Warehouse Operations',
    'Order Picking',
    'Barcode Scanning',
    'Packaging',
    'Safety Procedures',
  ],
  'Kitchen Helper': [
    'Food Preparation',
    'Kitchen Cleaning',
    'Food Hygiene',
    'Ingredient Handling',
    'Dishwashing',
    'Food Safety',
    'Kitchen Assistance',
    'Packing',
    'Cleaning & Sanitation',
  ],
  'Waiter / Restaurant Worker': [
    'Customer Service',
    'Food Service',
    'Table Setting',
    'Order Taking',
    'Food Hygiene',
    'POS Handling',
    'Communication',
    'Cleaning & Sanitation',
    'Cash Handling',
  ],
  'Security Guard': [
    'Security Monitoring',
    'Access Control',
    'Patrolling',
    'Emergency Response',
    'Safety Procedures',
    'Surveillance',
    'Incident Reporting',
    'Communication',
  ],
  'Factory Worker': [
    'Production Line Operation',
    'Machine Operation',
    'Quality Control',
    'Packing & Labeling',
    'Material Handling',
    'Loading & Unloading',
    'Workplace Safety',
    'Cleaning & Sanitation',
  ],
  'Farm / Agriculture Worker': [
    'Farming',
    'Crop Harvesting',
    'Planting',
    'Irrigation',
    'Livestock Handling',
    'Animal Care',
    'Agricultural Equipment',
    'Cleaning & Sanitation',
    'Manual Labor',
  ],
  'Electrician': [
    'Electrical Installation',
    'Electrical Maintenance',
    'Wiring',
    'Troubleshooting',
    'Electrical Safety',
    'Equipment Maintenance',
  ],
  'Plumber': [
    'Pipe Installation',
    'Pipe Maintenance',
    'Plumbing Repair',
    'Water Supply Systems',
    'Leak Detection',
    'Plumbing Safety',
  ],
  'Welder': [
    'Arc Welding',
    'MIG Welding',
    'TIG Welding',
    'Metal Fabrication',
    'Equipment Handling',
    'Welding Safety',
    'Quality Inspection',
  ],
  'Data Entry Operator': [
    'Data Entry',
    'Typing',
    'Microsoft Excel',
    'Microsoft Office',
    'Documentation',
    'Data Management',
    'Record Keeping',
    'Computer Operation',
  ],
  'Software Developer': [
    'Java',
    'JavaScript',
    'React',
    'Node.js',
    'Python',
    'SQL',
    'Git',
    'REST API',
    'Database Management',
  ],
};

/**
 * Intelligently retrieves recommended skills for a given target role string
 */
export function getRecommendedSkillsForRole(role?: string): { roleTitle: string; skills: string[] } {
  if (!role || !role.trim()) {
    // Default to Dairy Production Worker / General Manpower
    return {
      roleTitle: 'Dairy Production Worker',
      skills: TARGET_JOB_RECOMMENDED_SKILLS['Dairy Production Worker'],
    };
  }

  const r = role.toLowerCase();

  if (r.includes('dairy') || r.includes('milk')) {
    return { roleTitle: 'Dairy Production Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Dairy Production Worker'] };
  }
  if (r.includes('clean') || r.includes('housekeep') || r.includes('maid') || r.includes('janitor')) {
    return { roleTitle: 'Cleaner / Housekeeper', skills: TARGET_JOB_RECOMMENDED_SKILLS['Cleaner / Housekeeper'] };
  }
  if (r.includes('driver') || r.includes('driving') || r.includes('chauffeur') || r.includes('transport')) {
    return { roleTitle: 'Driver', skills: TARGET_JOB_RECOMMENDED_SKILLS['Driver'] };
  }
  if (r.includes('construct') || r.includes('mason') || r.includes('brick') || r.includes('carpenter') || r.includes('builder')) {
    return { roleTitle: 'Construction Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Construction Worker'] };
  }
  if (r.includes('warehouse') || r.includes('stock') || r.includes('forklift') || r.includes('inventory') || r.includes('handler')) {
    return { roleTitle: 'Warehouse Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Warehouse Worker'] };
  }
  if (r.includes('kitchen') || r.includes('cook') || r.includes('chef') || r.includes('dishwash')) {
    return { roleTitle: 'Kitchen Helper', skills: TARGET_JOB_RECOMMENDED_SKILLS['Kitchen Helper'] };
  }
  if (r.includes('waiter') || r.includes('waitress') || r.includes('restaurant') || r.includes('barista') || r.includes('server') || r.includes('hospitality')) {
    return { roleTitle: 'Waiter / Restaurant Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Waiter / Restaurant Worker'] };
  }
  if (r.includes('security') || r.includes('guard') || r.includes('watchman') || r.includes('patrol')) {
    return { roleTitle: 'Security Guard', skills: TARGET_JOB_RECOMMENDED_SKILLS['Security Guard'] };
  }
  if (r.includes('factory') || r.includes('assembly') || r.includes('machine operator') || r.includes('plant')) {
    return { roleTitle: 'Factory Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Factory Worker'] };
  }
  if (r.includes('farm') || r.includes('agri') || r.includes('crop') || r.includes('harvest') || r.includes('animal')) {
    return { roleTitle: 'Farm / Agriculture Worker', skills: TARGET_JOB_RECOMMENDED_SKILLS['Farm / Agriculture Worker'] };
  }
  if (r.includes('electric') || r.includes('wiring')) {
    return { roleTitle: 'Electrician', skills: TARGET_JOB_RECOMMENDED_SKILLS['Electrician'] };
  }
  if (r.includes('plumb') || r.includes('pipe')) {
    return { roleTitle: 'Plumber', skills: TARGET_JOB_RECOMMENDED_SKILLS['Plumber'] };
  }
  if (r.includes('weld') || r.includes('fabricat')) {
    return { roleTitle: 'Welder', skills: TARGET_JOB_RECOMMENDED_SKILLS['Welder'] };
  }
  if (r.includes('data entry') || r.includes('clerk') || r.includes('typing') || r.includes('office')) {
    return { roleTitle: 'Data Entry Operator', skills: TARGET_JOB_RECOMMENDED_SKILLS['Data Entry Operator'] };
  }
  if (r.includes('developer') || r.includes('software') || r.includes('engineer') || r.includes('programmer') || r.includes('frontend') || r.includes('backend') || r.includes('full stack')) {
    return { roleTitle: 'Software Developer', skills: TARGET_JOB_RECOMMENDED_SKILLS['Software Developer'] };
  }

  // Fallback: check exact key match
  const exact = Object.keys(TARGET_JOB_RECOMMENDED_SKILLS).find(
    (k) => k.toLowerCase() === r
  );
  if (exact) {
    return { roleTitle: exact, skills: TARGET_JOB_RECOMMENDED_SKILLS[exact] };
  }

  // Return Dairy Production Worker as standard default
  return {
    roleTitle: role,
    skills: TARGET_JOB_RECOMMENDED_SKILLS['Dairy Production Worker'],
  };
}

