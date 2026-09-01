import React from 'react';
import type { Resume } from '../resumeApi';
import { getTemplateById } from './registry';
import { ModernTemplate } from './ModernTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';
import { ExecutiveTemplate } from './ExecutiveTemplate';

/**
 * Looks up resume.layout (a template id, e.g. "ats-harvard") in the
 * template registry. Falls back to the original 3 layouts for resumes
 * created before the registry existed, so nothing breaks for older data.
 */
export const TemplateRenderer: React.FC<{ resume: Resume }> = ({ resume }) => {
  const definition = getTemplateById(resume.layout);
  if (definition) {
    const Template = definition.component;
    return <Template resume={resume} />;
  }

  switch (resume.layout) {
    case 'professional':
      return <ProfessionalTemplate resume={resume} />;
    case 'executive':
      return <ExecutiveTemplate resume={resume} />;
    case 'modern':
    default:
      return <ModernTemplate resume={resume} />;
  }
};

export default TemplateRenderer;