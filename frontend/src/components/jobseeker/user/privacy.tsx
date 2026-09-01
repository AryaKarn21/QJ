import { LegalPage } from '../../legal/LegalPage';

// Was 100% hardcoded static JSX, ignoring the CMS "Legal" admin tab
// entirely (which already reads/writes real content via
// GET/PUT /api/cms/pages/privacy-policy) — an admin editing Privacy Policy
// there had no visible effect anywhere. Now renders real CMS content the
// moment an admin saves one, and falls back to exactly this same static
// copy (preserved below, unchanged) until they do — so nothing regresses
// for an install where the page was never edited in the CMS.
const StaticFallback = () => (
  <>
    <p className="text-gray-600  text-lg mb-8">
      This Privacy Policy explains how Quick Jobs collects, uses, and discloses information from both Employers and Candidates who use our job posting and job search platform.
    </p>

    {/* Section 1 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">1. Information We Collect</h2>
      <p className="text-gray-600 mb-4">
        We collect information to provide and improve our services, including:
      </p>

      <div className="bg-gray-50 p-6 rounded-lg mb-4">
        <h3 className="text-xl font-semibold mb-3">For Candidates (Job Seekers)</h3>
        <p className="text-gray-600 mb-2">
          <span className="font-semibold">Personal Data:</span> Name, email address, phone number, physical address, professional title, and password for account access.
        </p>
        <p className="text-gray-600">
          <span className="font-semibold">Application Materials:</span> Resume/CV, cover letter, employment history, educational background, skills, current/expected salary, and any other information you choose to provide.
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-4">
        <h3 className="text-xl font-semibold mb-3">For Employers (Companies)</h3>
        <p className="text-gray-600 mb-2">
          <span className="font-semibold">Company Information:</span> Company name, size, industry, contact person's name, email, phone number, and billing information if applicable.
        </p>
        <p className="text-gray-600">
          <span className="font-semibold">Job Posting Data:</span> Details of the job vacancies posted on the Platform.
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-3">Usage Data</h3>
        <p className="text-gray-600">
          Non-personal information collected automatically, such as IP address, device type, operating system, and pages viewed, for performance analysis and improving the user experience.
        </p>
      </div>
    </section>

    {/* Section 2 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">2. How We Use Your Information</h2>
      <p className="text-gray-600 mb-4">
        We use the collected information for the following purposes:
      </p>
      <div className="space-y-4">
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold mb-2">To Provide the Service</h3>
          <p className="text-gray-600">
            To operate the Platform, process job applications, and allow Employers and Candidates to connect.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold mb-2">Connecting Users</h3>
          <p className="text-gray-600">
            To share Candidate resumes and application details with Employers for the specific jobs they apply to.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold mb-2">Service Improvement</h3>
          <p className="text-gray-600">
            To analyze usage trends, fix technical issues, and improve the functionality of the Platform.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold mb-2">Communication</h3>
          <p className="text-gray-600">
            To send Users service-related notifications, updates, and job alerts for Candidates or billing information for Employers.
          </p>
        </div>
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold mb-2">Legal Compliance</h3>
          <p className="text-gray-600">
            To comply with legal obligations and enforce our Terms and Conditions.
          </p>
        </div>
      </div>
    </section>

    {/* Section 3 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">3. Sharing and Disclosure of Information</h2>
      <p className="text-gray-600 mb-4">
        We may share your information in the following circumstances:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-xl font-semibold mb-2">With Employers/Candidates</h3>
          <p className="text-gray-600">
            We share Candidate application materials with the Employers to whom they apply. We share Employer job posting details with Candidates.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-xl font-semibold mb-2">Service Providers</h3>
          <p className="text-gray-600">
            We use third-party companies to facilitate our services (e.g., hosting, payment processing, analytics). They maintain confidentiality and only use data for directed purposes.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 md:col-span-2">
          <h3 className="text-xl font-semibold mb-2">Legal Requirements</h3>
          <p className="text-gray-600">
            If required by law, governmental request, or to protect the rights, property, or safety of Quick Jobs, our Users, or the public.
          </p>
        </div>
      </div>
    </section>

    {/* Section 4 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">4. Data Security</h2>
      <p className="text-gray-600">
        Quick Jobs implements appropriate technical and organizational measures to protect the security of your Personal Data. However, no method of transmission over the Internet is 100% secure. You are also responsible for keeping your password confidential.
      </p>
    </section>

    {/* Section 5 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">5. Data Retention</h2>
      <p className="text-gray-600">
        We retain your Personal Data for as long as your account is active or as needed to provide you with the services. We may also retain data for a longer period as necessary to comply with legal obligations, resolve disputes, or enforce our agreements.
      </p>
    </section>

    {/* Section 6 */}
    <section className="mb-10">
      <h2 className="text-3xl font-bold mb-4">6. Changes to this Privacy Policy</h2>
      <p className="text-gray-600">
        Quick Jobs reserves the right to update this Privacy Policy at any time. We will notify you of any significant changes by posting the new policy on the Platform. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised policy.
      </p>
    </section>

    {/* Contact Section */}
    <section className="bg-gray-50 p-8 rounded-lg">
      <h2 className="text-3xl font-bold mb-4">7. Contact Us</h2>
      <p className="text-gray-600 mb-4">
        If you have any questions or concerns about this Privacy Policy, please contact us:
      </p>
      <div className="space-y-2 text-gray-600">
        <p><span className="font-semibold">Email:</span> quickjobs0000@gmail.com</p>
        <p><span className="font-semibold">Phone:</span> +97430075999</p>
        <p><span className="font-semibold">Address:</span> Kathmandu, Nepal</p>
      </div>
    </section>
  </>
);

const PrivacyPolicy = () => (
  <LegalPage slug="privacy-policy" defaultTitle="Privacy Policy" fallback={<StaticFallback />} />
);

export default PrivacyPolicy;
