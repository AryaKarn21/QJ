/**
 * backend/data/occupations.js
 *
 * Occupation knowledge base for AI resume generation (spec section 9).
 *
 * This is NOT meant to cover every possible job on its own — it's a small,
 * hand-curated set of common manpower/recruitment roles that anchors the AI
 * with real, reviewed skills/tools/responsibilities instead of generating
 * everything from scratch every time. For any job role NOT in this list,
 * resumeAI.service.js falls back to pure Gemini generation, guided by the
 * `category` hint if one is provided.
 *
 * To add a new occupation: add one object to OCCUPATIONS below. Nothing
 * else needs to change — findOccupation() picks it up automatically via
 * jobTitle or alternativeTitles matching.
 */

const OCCUPATIONS = [
  {
    jobTitle: "Plumber",
    category: "Construction",
    alternativeTitles: ["Pipe Fitter", "Plumbing Technician", "Maintenance Plumber"],
    skills: [
      "Pipe Installation", "PVC/CPVC Pipe Fitting", "GI Pipe Fitting", "Water Supply Systems",
      "Drainage Systems", "Leak Detection and Repair", "Sanitary Fixture Installation", "Plumbing Maintenance",
    ],
    tools: [
      "Pipe Cutter", "Pipe Wrench", "Adjustable Wrench", "Pipe Threading Machine",
      "Measuring Tape", "Drain Cleaning Tools", "PVC/CPVC Solvent Cement", "Pressure Testing Equipment",
    ],
    responsibilities: [
      "Install and repair water supply and drainage pipes",
      "Identify and fix leaks and damaged pipe connections",
      "Install sanitary fixtures including sinks, toilets, taps, and showers",
      "Follow workplace health and safety procedures",
    ],
    keywords: ["plumbing", "pipe fitting", "water supply", "drainage", "sanitary fixtures"],
    certifications: ["Plumbing Trade Certificate", "Basic Safety Training (BST)"],
    workplaceEnvironments: ["Residential", "Commercial", "Construction Site"],
  },
  {
    jobTitle: "Electrician",
    category: "Construction",
    alternativeTitles: ["Electrical Technician", "Wireman"],
    skills: [
      "Electrical Wiring", "Circuit Installation", "Panel Installation", "Fault Diagnosis",
      "Cable Laying", "Load Calculation", "Earthing/Grounding", "Electrical Safety Procedures",
    ],
    tools: [
      "Multimeter", "Insulation Tester", "Circuit Tester", "MCB",
      "Distribution Board", "Conduit Systems", "Wire Stripper", "Voltage Tester",
    ],
    responsibilities: [
      "Install and maintain electrical wiring, panels, and fixtures",
      "Diagnose and repair electrical faults",
      "Read and follow electrical circuit diagrams",
      "Follow electrical safety and workplace procedures",
    ],
    keywords: ["electrical wiring", "circuit installation", "panel work", "fault finding"],
    certifications: ["Electrician Trade Certificate", "Basic Safety Training (BST)"],
    workplaceEnvironments: ["Residential", "Commercial", "Industrial", "Construction Site"],
  },
  {
    jobTitle: "Welder",
    category: "Construction",
    alternativeTitles: ["Welding Technician", "Fabrication Welder"],
    skills: [
      "MIG Welding", "TIG Welding", "ARC Welding", "Metal Cutting",
      "Blueprint Reading", "Structural Fabrication", "Weld Inspection", "Workplace Safety",
    ],
    tools: [
      "MIG Welding Machine", "TIG Welding Machine", "ARC Welding Machine",
      "Angle Grinder", "Cutting Machine", "Welding Electrodes", "Welding Helmet", "Clamps",
    ],
    responsibilities: [
      "Join and fabricate metal parts using MIG/TIG/ARC welding",
      "Read blueprints and technical drawings",
      "Inspect welds for quality and structural integrity",
      "Maintain welding equipment and follow safety procedures",
    ],
    keywords: ["welding", "fabrication", "metal work", "structural steel"],
    certifications: ["Welding Trade Certificate"],
    workplaceEnvironments: ["Construction Site", "Workshop", "Manufacturing Plant"],
  },
  {
    jobTitle: "Carpenter",
    category: "Construction",
    alternativeTitles: ["Wood Worker", "Furniture Carpenter"],
    skills: [
      "Wood Cutting", "Framing", "Furniture Making", "Measuring and Marking",
      "Door/Window Installation", "Finishing and Polishing", "Blueprint Reading",
    ],
    tools: [
      "Circular Saw", "Hand Saw", "Drill Machine", "Measuring Tape", "Wood Cutting Tools", "Power Tools", "Chisel", "Hammer",
    ],
    responsibilities: [
      "Cut, shape, and install wood structures and fixtures",
      "Build and repair furniture, doors, and frames",
      "Measure and mark materials accurately",
      "Follow safety procedures when using power tools",
    ],
    keywords: ["carpentry", "woodwork", "furniture making", "framing"],
    certifications: ["Carpentry Trade Certificate"],
    workplaceEnvironments: ["Construction Site", "Workshop", "Residential"],
  },
  {
    jobTitle: "Mason",
    category: "Construction",
    alternativeTitles: ["Bricklayer", "Mistri"],
    skills: [
      "Brickwork", "Plastering", "Concrete Work", "Tiling",
      "Reading Construction Drawings", "Foundation Work", "Workplace Safety",
    ],
    tools: [
      "Trowel", "Spirit Level", "Concrete Mixer", "Measuring Tape", "Plumb Bob", "Chisel and Hammer",
    ],
    responsibilities: [
      "Lay bricks, blocks, and stones to construct walls and structures",
      "Mix and apply plaster, mortar, and concrete",
      "Read and follow construction drawings",
      "Follow site safety procedures",
    ],
    keywords: ["masonry", "bricklaying", "concrete work", "construction"],
    certifications: ["Basic Safety Training (BST)"],
    workplaceEnvironments: ["Construction Site"],
  },
  {
    jobTitle: "HVAC Technician",
    category: "Construction",
    alternativeTitles: ["AC Technician", "Air Conditioning Mechanic"],
    skills: [
      "AC Installation", "AC Repair and Maintenance", "Refrigerant Handling", "Ductwork Installation",
      "Electrical Troubleshooting", "Compressor Servicing", "Workplace Safety",
    ],
    tools: [
      "Refrigerant Gauges", "Vacuum Pump", "Pipe Bender", "Multimeter", "Brazing Torch", "Leak Detector",
    ],
    responsibilities: [
      "Install, service, and repair air conditioning and cooling systems",
      "Diagnose faults in compressors and electrical components",
      "Handle refrigerants safely",
      "Perform routine maintenance checks",
    ],
    keywords: ["HVAC", "AC repair", "cooling systems", "refrigeration"],
    certifications: ["HVAC Trade Certificate", "Refrigerant Handling Certification"],
    workplaceEnvironments: ["Residential", "Commercial", "Industrial"],
  },
  {
    jobTitle: "Machine Operator",
    category: "Manufacturing",
    alternativeTitles: ["Production Machine Operator", "CNC Operator"],
    skills: [
      "Machine Operation", "Quality Checking", "Production Line Work", "Basic Machine Maintenance",
      "Reading Work Orders", "Workplace Safety",
    ],
    tools: [
      "CNC Machine", "Production Line Equipment", "Measuring Instruments", "Safety Gear", "Hand Tools",
    ],
    responsibilities: [
      "Operate production machinery according to specifications",
      "Monitor output for quality and consistency",
      "Perform basic maintenance and report faults",
      "Follow factory safety procedures",
    ],
    keywords: ["machine operation", "production", "manufacturing", "CNC"],
    certifications: [],
    workplaceEnvironments: ["Factory", "Manufacturing Plant"],
  },
  {
    jobTitle: "Warehouse Worker",
    category: "Logistics",
    alternativeTitles: ["Loader", "Packer", "Storekeeper"],
    skills: [
      "Inventory Management", "Order Picking and Packing", "Stock Organization", "Loading and Unloading",
      "Barcode Scanning", "Workplace Safety",
    ],
    tools: [
      "Barcode Scanner", "Inventory Management System", "Pallet Jack", "Forklift", "Hand Truck", "Packing Equipment",
    ],
    responsibilities: [
      "Receive, store, and organize warehouse stock",
      "Pick, pack, and prepare orders for dispatch",
      "Load and unload delivery vehicles",
      "Maintain accurate inventory records",
    ],
    keywords: ["warehouse", "inventory", "logistics", "packing"],
    certifications: ["Forklift Operation Certificate (if applicable)"],
    workplaceEnvironments: ["Warehouse", "Distribution Center"],
  },
  {
    jobTitle: "Driver",
    category: "Logistics",
    alternativeTitles: ["Heavy Vehicle Driver", "Light Vehicle Driver", "Delivery Driver"],
    skills: [
      "Safe Driving", "Route Planning", "Vehicle Maintenance Checks", "Traffic Rules Compliance",
      "Load Securing", "Customer Service",
    ],
    tools: [
      "GPS Navigation", "Vehicle Inspection Checklist", "Delivery Documentation",
    ],
    responsibilities: [
      "Drive vehicles safely to deliver goods or transport passengers",
      "Perform routine vehicle checks before trips",
      "Follow traffic laws and company safety policy",
      "Maintain delivery/trip records",
    ],
    keywords: ["driving", "delivery", "transport", "logistics"],
    certifications: ["Valid Driving License (relevant category)"],
    workplaceEnvironments: ["On-road", "Logistics/Distribution"],
  },
  {
    jobTitle: "Cook",
    category: "Hospitality",
    alternativeTitles: ["Chef", "Kitchen Staff"],
    skills: [
      "Food Preparation", "Cooking Techniques", "Menu Planning", "Food Safety and Hygiene",
      "Kitchen Equipment Handling", "Portion Control",
    ],
    tools: [
      "Commercial Stove", "Oven", "Food Processor", "Kitchen Equipment", "Food Safety Procedures", "Food Preparation Tools",
    ],
    responsibilities: [
      "Prepare and cook meals following recipes and standards",
      "Maintain kitchen cleanliness and food hygiene",
      "Manage stock of ingredients and supplies",
      "Follow food safety regulations",
    ],
    keywords: ["cooking", "kitchen", "food preparation", "hospitality"],
    certifications: ["Food Safety/Hygiene Certificate"],
    workplaceEnvironments: ["Restaurant", "Hotel Kitchen", "Catering"],
  },
  {
    jobTitle: "Housekeeping Worker",
    category: "Hospitality",
    alternativeTitles: ["Hotel Cleaner", "Room Attendant", "Cleaner"],
    skills: [
      "Room Cleaning", "Laundry Handling", "Cleaning Chemical Safety", "Inventory of Cleaning Supplies",
      "Attention to Detail", "Time Management",
    ],
    tools: [
      "Cleaning Equipment", "Vacuum Cleaner", "Cleaning Chemicals", "Laundry Machines",
    ],
    responsibilities: [
      "Clean and maintain rooms, common areas, or facilities",
      "Handle laundry and linen changes",
      "Restock supplies and report maintenance issues",
      "Follow hygiene and safety standards",
    ],
    keywords: ["housekeeping", "cleaning", "hotel", "hygiene"],
    certifications: [],
    workplaceEnvironments: ["Hotel", "Residential", "Commercial Facility"],
  },
  {
    jobTitle: "Security Guard",
    category: "Domestic / General Work",
    alternativeTitles: ["Security Officer", "Watchman"],
    skills: [
      "Surveillance", "Access Control", "Patrolling", "Incident Reporting",
      "Emergency Response", "Alertness and Vigilance",
    ],
    tools: [
      "CCTV Monitoring System", "Metal Detector", "Walkie-Talkie", "Visitor Log Book",
    ],
    responsibilities: [
      "Monitor premises to prevent unauthorized access",
      "Patrol assigned areas and report suspicious activity",
      "Control entry/exit and check visitor credentials",
      "Respond to emergencies following protocol",
    ],
    keywords: ["security", "guard", "surveillance", "safety"],
    certifications: ["Security Guard Training Certificate"],
    workplaceEnvironments: ["Commercial", "Residential", "Industrial"],
  },
  {
    jobTitle: "Cleaner",
    category: "Domestic / General Work",
    alternativeTitles: ["General Cleaner", "Janitor", "Sanitation Worker"],
    skills: [
      "Floor and Surface Cleaning", "Waste Disposal", "Cleaning Chemical Handling",
      "Sanitization", "Time Management",
    ],
    tools: [
      "Mop and Bucket", "Vacuum Cleaner", "Cleaning Chemicals", "Cleaning Trolley",
    ],
    responsibilities: [
      "Clean and sanitize floors, surfaces, and facilities",
      "Dispose of waste following procedures",
      "Restock cleaning supplies",
      "Follow workplace hygiene and safety standards",
    ],
    keywords: ["cleaning", "sanitation", "janitorial", "hygiene"],
    certifications: [],
    workplaceEnvironments: ["Commercial", "Residential", "Industrial"],
  },
  {
    jobTitle: "Data Entry Operator",
    category: "Technical / Professional",
    alternativeTitles: ["Computer Operator", "Office Assistant"],
    skills: [
      "Typing Speed and Accuracy", "MS Excel", "MS Word", "Data Verification",
      "File Organization", "Basic Computer Skills",
    ],
    tools: [
      "MS Office (Excel, Word)", "Computer", "Data Entry Software", "Scanner",
    ],
    responsibilities: [
      "Enter and update data accurately into systems",
      "Verify and correct data discrepancies",
      "Maintain organized digital records",
      "Follow data confidentiality procedures",
    ],
    keywords: ["data entry", "typing", "MS Excel", "office work"],
    certifications: ["Basic Computer Course Certificate"],
    workplaceEnvironments: ["Office"],
  },
];

/**
 * Finds an occupation by exact/alternative title match (case-insensitive).
 * Returns null if nothing matches — callers should fall back to pure AI
 * generation using the raw jobRole string, optionally with a categoryHint.
 */
function findOccupation(jobRole) {
  if (!jobRole) return null;
  const normalized = jobRole.trim().toLowerCase();

  return (
    OCCUPATIONS.find(
      (occ) =>
        occ.jobTitle.toLowerCase() === normalized ||
        occ.alternativeTitles.some((alt) => alt.toLowerCase() === normalized)
    ) || null
  );
}

/** Returns the distinct list of categories currently represented, for UI filter dropdowns. */
function listCategories() {
  return [...new Set(OCCUPATIONS.map((o) => o.category))];
}

module.exports = { OCCUPATIONS, findOccupation, listCategories };