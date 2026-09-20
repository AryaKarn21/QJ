const { SYMBOL_BY_CODE } = require("../data/currencies");

const UPDATABLE_JOB_FIELDS = [
  "title",
  "country",
  "location",
  "jobtype",
  "salary",
  "experience",
  "jobcategory",
  "level",
  "deadline",
  "openings",
  "istrending",
  "description",
  "department",
  "workMode",
  "minExperience",
  "maxExperience",
  "salaryMin",
  "salaryMax",
  "salaryPeriod",
  "currency",
  "overview",
  "responsibilities",
  "requirements",
  "requiredSkills",
  "preferredSkills",
  "education",
  "benefits",
  "perks",
  "workingHours",
  "companyOverride",
  "status",
];

const deriveSalaryString = ({ salary, salaryMin, salaryMax, currency, salaryPeriod }) => {
  if (salary) return salary;
  if (salaryMin === undefined && salaryMax === undefined) return salary;
  const cur = currency || "NPR";
  const period = salaryPeriod || "Yearly";
  const min = salaryMin !== undefined && salaryMin !== "" ? Number(salaryMin) : undefined;
  const max = salaryMax !== undefined && salaryMax !== "" ? Number(salaryMax) : undefined;
  if (min === undefined && max === undefined) return salary;
  const range = min !== undefined && max !== undefined && min !== max
    ? `${min.toLocaleString()} - ${max.toLocaleString()}`
    : (min ?? max).toLocaleString();
  const symbol = SYMBOL_BY_CODE[cur] || "";
  return `${cur} ${symbol}${range} / ${period}`;
};

const deriveExperienceString = ({ experience, minExperience, maxExperience }) => {
  if (experience) return experience;
  if (minExperience === undefined && maxExperience === undefined) return experience;
  const min = minExperience !== undefined && minExperience !== "" ? Number(minExperience) : undefined;
  const max = maxExperience !== undefined && maxExperience !== "" ? Number(maxExperience) : undefined;
  if (min === undefined && max === undefined) return experience;
  if (min !== undefined && max !== undefined && min !== max) return `${min}-${max} years`;
  return `${min ?? max}+ years`;
};

module.exports = {
  UPDATABLE_JOB_FIELDS,
  deriveSalaryString,
  deriveExperienceString,
};
