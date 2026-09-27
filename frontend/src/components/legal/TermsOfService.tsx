import React from 'react';
import { LegalPage } from './LegalPage';
import { PolicyPageShell } from './PolicyPageShell';
import { TERMS_AND_CONDITIONS_HTML } from './termsDocument';

/**
 * Public Terms & Conditions route (/terms and /terms-and-conditions).
 * Backed by CMS Legal & Policies system, with an immediate, high-grade,
 * professionally formatted legal document fallback.
 */
const TermsOfService: React.FC = () => {
  return (
    <LegalPage
      slug="terms-of-service"
      defaultTitle="Terms & Conditions"
      fallback={
        <div className="flex min-h-screen flex-col bg-white text-gray-800">
          <PolicyPageShell
            title="Terms & Conditions"
            description="The official platform agreements, responsibilities, and guidelines governing Job Seekers, Employers, and visitors on QuickJobs."
            content={TERMS_AND_CONDITIONS_HTML}
            updatedAt={new Date().toISOString()}
            version={1}
            currentPath="/terms"
          />
        </div>
      }
    />
  );
};

export default TermsOfService;
