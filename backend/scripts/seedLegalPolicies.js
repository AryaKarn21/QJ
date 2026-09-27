// One-off content-population script: creates real, published Page
// documents for the 7 core Legal & Policies types, since none exist yet
// in this database (every public legal page currently shows the honest
// "hasn't been published yet" placeholder — that's the actual root cause
// of the "footer legal links have no content" report, not a routing bug).
//
// Safe to re-run: skips any policyType that already has a document
// (manually authored or previously seeded), so it never overwrites real
// admin-authored content.
//
// Every document opens with a clearly labeled DEMO CONTENT notice — this
// is placeholder legal text for demonstration purposes only, not reviewed
// legal advice, and must be replaced by real counsel-reviewed copy before
// relying on it in production.
//
// Usage: node scripts/seedLegalPolicies.js
require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const Page = require("../models/Page");
const User = require("../models/User");
const { sanitizeRichText } = require("../utils/sanitizeHtml");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const DEMO_NOTICE =
  "<blockquote><strong>DEMO / PLACEHOLDER LEGAL CONTENT.</strong> " +
  "This page contains sample content generated for demonstration purposes only. " +
  "It has not been drafted or reviewed by legal counsel and must not be relied upon " +
  "as legal advice. Replace this content with your own reviewed policy before " +
  "using it in production.</blockquote>";

const section = (num, title, bodyHtml) => `<h2>${num}. ${title}</h2>${bodyHtml}`;

const POLICIES = [
  {
    policyType: "terms-conditions",
    defaultSlug: "terms-of-service",
    title: "Terms & Conditions",
    shortDescription: "The rules for using the QuickJobs platform, for job seekers and employers alike.",
    content:
      DEMO_NOTICE +
      section(1, "Introduction", "<p>Welcome to QuickJobs. These Terms & Conditions (\"Terms\") govern your access to and use of the QuickJobs website, mobile applications, and related services (collectively, the \"Platform\"). By creating an account or otherwise using the Platform, you agree to be bound by these Terms.</p>") +
      section(2, "Acceptance of Terms", "<p>By registering for or using QuickJobs, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy. If you do not agree, please do not use the Platform.</p>") +
      section(3, "Eligibility", "<p>You must be at least 18 years old, or the age of legal majority in your jurisdiction, to create an account. Employer accounts must represent a genuine, lawfully operating organization.</p>") +
      section(4, "Account Registration", "<p>You agree to provide accurate, current, and complete information when creating your account, and to keep this information up to date. You are responsible for maintaining the confidentiality of your login credentials.</p>") +
      section(5, "User Responsibilities", "<p>All users agree to use the Platform lawfully, to respect other users, and to refrain from any activity that could damage, disable, or impair QuickJobs or interfere with any other party's use of the Platform.</p>") +
      section(6, "Job Seeker Responsibilities", "<p>Job seekers agree to provide truthful information in their profiles, resumes, and applications, and to represent their skills, qualifications, and experience accurately.</p>") +
      section(7, "Job Provider Responsibilities", "<p>Employers and recruiters agree to post only genuine, currently available positions, to represent their company accurately, and to comply with applicable employment and labor laws in their job listings and hiring practices.</p>") +
      section(8, "Job Listings and Recruitment Content", "<p>QuickJobs does not guarantee the accuracy of job listings submitted by employers. Job seekers are encouraged to exercise their own judgment and due diligence before applying to or accepting any position.</p>") +
      section(9, "Applications", "<p>Submitting an application through QuickJobs does not guarantee an interview or job offer. QuickJobs is not a party to any employment relationship formed between a job seeker and an employer.</p>") +
      section(10, "Interviews and Assessments", "<p>Where the Platform facilitates interview scheduling or skills assessments, both parties agree to participate in good faith and in accordance with the scheduled arrangements.</p>") +
      section(11, "Resume Builder", "<p>The Resume Builder tool is provided to help you create and format your resume. You remain solely responsible for the accuracy of the content you enter into your resume.</p>") +
      section(12, "Community Features", "<p>QuickJobs may offer community features such as posts, comments, and messaging. These features are intended for professional networking and career-related discussion.</p>") +
      section(13, "User-Generated Content", "<p>You retain ownership of content you post on QuickJobs, but you grant QuickJobs a non-exclusive, worldwide license to host, display, and distribute that content as necessary to operate the Platform.</p>") +
      section(14, "Prohibited Activities", "<p>You agree not to post fraudulent, misleading, discriminatory, or abusive content; not to impersonate any person or organization; and not to use the Platform for any unlawful purpose.</p>") +
      section(15, "Intellectual Property", "<p>The QuickJobs name, logo, and Platform design are the property of QuickJobs and may not be used without prior written permission.</p>") +
      section(16, "Third-Party Services", "<p>The Platform may link to or integrate with third-party services. QuickJobs is not responsible for the content, policies, or practices of any third-party service.</p>") +
      section(17, "Notifications and Communications", "<p>By using QuickJobs, you consent to receive service-related notifications (such as application updates and interview reminders) via email and in-app notifications.</p>") +
      section(18, "Account Suspension and Termination", "<p>QuickJobs reserves the right to suspend or terminate any account that violates these Terms, engages in fraudulent activity, or poses a risk to the Platform or its users.</p>") +
      section(19, "Disclaimer of Warranties", "<p>The Platform is provided \"as is\" without warranties of any kind, express or implied, including but not limited to warranties of merchantability or fitness for a particular purpose.</p>") +
      section(20, "Limitation of Liability", "<p>To the maximum extent permitted by law, QuickJobs shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p>") +
      section(21, "Indemnification", "<p>You agree to indemnify and hold QuickJobs harmless from any claims, damages, or expenses arising from your misuse of the Platform or violation of these Terms.</p>") +
      section(22, "Changes to Terms", "<p>QuickJobs may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>") +
      section(23, "Governing Law", "<p>These Terms are governed by the laws of the jurisdiction in which QuickJobs operates, without regard to conflict-of-law principles.</p>") +
      section(24, "Contact Information", "<p>Questions about these Terms can be directed to our support team through the Contact page.</p>"),
  },
  {
    policyType: "privacy-policy",
    defaultSlug: "privacy-policy",
    title: "Privacy Policy",
    shortDescription: "How QuickJobs collects, uses, and protects your personal information.",
    content:
      DEMO_NOTICE +
      section(1, "Information We Collect", "<p>We collect information you provide directly to us, as well as information generated automatically as you use the Platform.</p>") +
      section(2, "Account Information", "<p>This includes your name, email address, phone number, password, and account role (job seeker or employer).</p>") +
      section(3, "Resume/Profile Information", "<p>Details you add to your profile or resume, including work experience, education, skills, certifications, and an optional profile photo.</p>") +
      section(4, "Job Application Information", "<p>Information related to jobs you apply for, application status, and communications with employers through the Platform.</p>") +
      section(5, "Employer Information", "<p>Company name, industry, size, job postings, and recruiter contact details provided by employer accounts.</p>") +
      section(6, "Device and Usage Information", "<p>We automatically collect information such as IP address, browser type, device identifiers, and pages visited, to help us operate and improve the Platform.</p>") +
      section(7, "Cookies", "<p>QuickJobs uses cookies and similar technologies as described in our Cookie Policy.</p>") +
      section(8, "How We Use Information", "<p>We use your information to provide and improve our services, match job seekers with relevant opportunities, communicate with you, and maintain platform security.</p>") +
      section(9, "How We Share Information", "<p>Your profile and application information may be shared with employers when you apply to a job. We do not sell your personal information to third parties.</p>") +
      section(10, "Service Providers", "<p>We work with third-party service providers (such as hosting, email, and analytics providers) who process data on our behalf under appropriate confidentiality obligations.</p>") +
      section(11, "Data Security", "<p>We use industry-standard technical and organizational measures, including encryption in transit, to protect your information from unauthorized access.</p>") +
      section(12, "Data Retention", "<p>We retain your information for as long as your account is active or as needed to provide our services, comply with legal obligations, and resolve disputes.</p>") +
      section(13, "User Rights", "<p>Depending on your jurisdiction, you may have the right to access, correct, or request deletion of your personal information.</p>") +
      section(14, "Account Deletion", "<p>You may request deletion of your account and associated personal data at any time through your account settings or by contacting support.</p>") +
      section(15, "Children's Privacy", "<p>QuickJobs is not intended for individuals under the age of 18, and we do not knowingly collect personal information from children.</p>") +
      section(16, "International Data Transfers", "<p>Your information may be processed in countries other than your own, which may have different data protection laws than your jurisdiction.</p>") +
      section(17, "Changes to Privacy Policy", "<p>We may update this Privacy Policy from time to time. We will notify users of material changes through the Platform.</p>") +
      section(18, "Contact", "<p>For privacy-related questions, please reach out through our Contact page.</p>"),
  },
  {
    policyType: "community-guidelines",
    defaultSlug: "community-guidelines",
    title: "Community Guidelines",
    shortDescription: "Rules for respectful, professional, and safe participation in the QuickJobs community.",
    content:
      DEMO_NOTICE +
      section(1, "Respectful Communication", "<p>Treat every member of the QuickJobs community with courtesy, whether you're commenting on a post, messaging a recruiter, or replying to a job seeker.</p>") +
      section(2, "Professional Behavior", "<p>QuickJobs is a professional networking and career platform. Keep interactions relevant to career, hiring, and professional development topics.</p>") +
      section(3, "No Harassment", "<p>Harassment, bullying, or targeted negative behavior toward any user is strictly prohibited and may result in account suspension.</p>") +
      section(4, "No Hate Speech", "<p>Content that promotes discrimination or hatred based on race, gender, religion, nationality, disability, or any other protected characteristic is not allowed.</p>") +
      section(5, "No Spam", "<p>Repetitive, irrelevant, or unsolicited promotional content is not permitted in posts, comments, or messages.</p>") +
      section(6, "No Scams", "<p>Any attempt to defraud users — including advance-fee schemes, fake payment requests, or phishing links — will result in immediate account termination.</p>") +
      section(7, "No Misleading Job Posts", "<p>Job listings must accurately reflect the role, compensation, and requirements. Bait-and-switch or exaggerated listings are not permitted.</p>") +
      section(8, "No Impersonation", "<p>Do not create an account or post content pretending to be another person, company, or organization.</p>") +
      section(9, "No Fraudulent Recruitment", "<p>Requesting payment from candidates for job placement, or collecting sensitive personal/financial information outside the normal hiring process, is prohibited.</p>") +
      section(10, "No Inappropriate Content", "<p>Sexually explicit, violent, or otherwise inappropriate content has no place on a professional platform like QuickJobs.</p>") +
      section(11, "No Illegal Content", "<p>Content that promotes or facilitates illegal activity will be removed and may be reported to relevant authorities.</p>") +
      section(12, "Reporting Violations", "<p>If you encounter content or behavior that violates these guidelines, please use the report feature so our moderation team can review it.</p>") +
      section(13, "Moderation Actions", "<p>Depending on severity, violations may result in content removal, warnings, temporary suspension, or permanent account termination at QuickJobs' discretion.</p>"),
  },
  {
    policyType: "job-seeker-rules",
    defaultSlug: "job-seeker-rules",
    title: "Job Seeker Rules",
    shortDescription: "Expectations for job seekers using QuickJobs to search and apply for roles.",
    content:
      DEMO_NOTICE +
      section(1, "Accurate Profile Information", "<p>Keep your profile information — contact details, location, and career history — accurate and up to date.</p>") +
      section(2, "Genuine Resumes", "<p>Resumes built or uploaded on QuickJobs must reflect your real work history, education, and skills.</p>") +
      section(3, "No Fake Qualifications", "<p>Do not claim certifications, degrees, or experience you do not actually hold.</p>") +
      section(4, "No Impersonation", "<p>Your account must represent you, not another individual.</p>") +
      section(5, "Professional Communication", "<p>Communicate with employers and recruiters respectfully and professionally, even if a role isn't the right fit.</p>") +
      section(6, "Application Behavior", "<p>Apply to roles you are genuinely interested in and reasonably qualified for, rather than mass-applying indiscriminately.</p>") +
      section(7, "Interview Behavior", "<p>Attend scheduled interviews on time, or notify the employer promptly if you need to reschedule or withdraw.</p>") +
      section(8, "Assessment Integrity", "<p>Complete skills assessments honestly and independently, without impersonation or unauthorized assistance.</p>") +
      section(9, "No Spam Applications", "<p>Do not submit the same application repeatedly to the same listing, or use automated tools to mass-apply outside the Platform's intended use.</p>") +
      section(10, "No Fraudulent Documents", "<p>Do not upload forged or altered certificates, ID documents, or references.</p>") +
      section(11, "Account Security", "<p>Keep your password confidential and notify QuickJobs promptly if you suspect unauthorized access to your account.</p>"),
  },
  {
    policyType: "job-provider-rules",
    defaultSlug: "job-provider-rules",
    title: "Job Provider Rules",
    shortDescription: "Expectations for employers and recruiters posting jobs and hiring on QuickJobs.",
    content:
      DEMO_NOTICE +
      section(1, "Genuine Company Information", "<p>Employer accounts must represent a real, currently operating organization with accurate company details.</p>") +
      section(2, "Accurate Job Descriptions", "<p>Job postings must accurately describe the role, responsibilities, and requirements.</p>") +
      section(3, "Accurate Salary Information", "<p>Where compensation is listed, it should reflect a genuine, good-faith offer range for the role.</p>") +
      section(4, "No Discriminatory Job Listings", "<p>Job postings must not discriminate based on race, gender, age, religion, disability, or other legally protected characteristics.</p>") +
      section(5, "No Misleading Recruitment", "<p>Do not advertise a role that does not exist or misrepresent the nature of the employment relationship (e.g., disguising unpaid work as a paid position).</p>") +
      section(6, "No Fake Vacancies", "<p>Do not post job listings solely to collect resumes or applicant data without a genuine intent to hire.</p>") +
      section(7, "No Recruitment Scams", "<p>Requesting payment from candidates at any stage of the hiring process is strictly prohibited.</p>") +
      section(8, "No Unauthorized Collection of Applicant Data", "<p>Only collect and use applicant information for legitimate recruitment purposes related to the specific role applied for.</p>") +
      section(9, "Professional Communication", "<p>Communicate with candidates respectfully and provide timely updates on application status where possible.</p>") +
      section(10, "Interview Requirements", "<p>Clearly communicate interview format, location (or video link), and expectations to candidates in advance.</p>") +
      section(11, "Candidate Privacy", "<p>Handle candidate resumes and personal information responsibly, and do not share applicant data with unrelated third parties.</p>") +
      section(12, "Employer Account Responsibilities", "<p>Employer account holders are responsible for all job postings and communications made under their account.</p>"),
  },
  {
    policyType: "cookie-policy",
    defaultSlug: "cookie-policy",
    title: "Cookie Policy",
    shortDescription: "How QuickJobs uses cookies and similar technologies.",
    content:
      DEMO_NOTICE +
      section(1, "What Cookies Are", "<p>Cookies are small text files stored on your device that help websites remember information about your visit.</p>") +
      section(2, "Essential Cookies", "<p>These cookies are necessary for core Platform functionality, such as keeping you logged in and securing your session.</p>") +
      section(3, "Authentication Cookies", "<p>Used to verify your identity and maintain your logged-in state as you navigate the Platform.</p>") +
      section(4, "Preference Cookies", "<p>Remember choices you've made, such as display settings, to improve your experience on future visits.</p>") +
      section(5, "Analytics Cookies", "<p>Help us understand how visitors use QuickJobs so we can improve features and performance.</p>") +
      section(6, "How Cookies Are Used", "<p>We use cookies to keep the Platform secure, remember your preferences, and understand aggregate usage patterns.</p>") +
      section(7, "Third-Party Cookies", "<p>Some cookies may be set by third-party services we use, such as analytics providers, subject to their own privacy practices.</p>") +
      section(8, "Cookie Management", "<p>You can manage or delete cookies through your browser settings at any time.</p>") +
      section(9, "Browser Controls", "<p>Most browsers allow you to block or clear cookies; note that disabling essential cookies may affect Platform functionality.</p>") +
      section(10, "Policy Updates", "<p>We may update this Cookie Policy periodically to reflect changes in the technologies we use.</p>"),
  },
  {
    policyType: "disclaimer",
    defaultSlug: "disclaimer",
    title: "Disclaimer",
    shortDescription: "Important disclaimers regarding content, recruitment outcomes, and platform availability.",
    content:
      DEMO_NOTICE +
      section(1, "Platform Purpose", "<p>QuickJobs is a platform that connects job seekers and employers. We do not guarantee employment outcomes for any user.</p>") +
      section(2, "Job Listing Disclaimer", "<p>Job listings are submitted by employers. QuickJobs does not independently verify every detail of every listing.</p>") +
      section(3, "Employer-Generated Content Disclaimer", "<p>Company descriptions, job postings, and related content are provided by employers and reflect their own representations.</p>") +
      section(4, "User-Generated Content Disclaimer", "<p>Posts, comments, and profile content are created by users and do not necessarily reflect the views of QuickJobs.</p>") +
      section(5, "Recruitment Outcome Disclaimer", "<p>QuickJobs does not guarantee that using the Platform will result in a job offer, hire, or successful placement.</p>") +
      section(6, "Third-Party Links Disclaimer", "<p>The Platform may contain links to third-party websites. QuickJobs is not responsible for the content or practices of those sites.</p>") +
      section(7, "AI-Generated Content Disclaimer", "<p>Where AI-assisted features (such as resume summary suggestions) are used, generated text should be reviewed by the user before relying on it.</p>") +
      section(8, "Resume Builder Disclaimer", "<p>The Resume Builder is a formatting tool. QuickJobs does not guarantee that any resume format will be accepted by every employer or applicant tracking system.</p>") +
      section(9, "Assessment Disclaimer", "<p>Skills assessments are provided as an evaluative tool and are not a guarantee of a candidate's on-the-job performance.</p>") +
      section(10, "Platform Availability Disclaimer", "<p>QuickJobs strives for high availability but does not guarantee uninterrupted or error-free access to the Platform.</p>") +
      section(11, "Limitation of Responsibility", "<p>To the extent permitted by law, QuickJobs' responsibility for any losses arising from use of the Platform is limited as described in our Terms & Conditions.</p>"),
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding Legal & Policies demo content...");

  const superadmin = process.env.SUPERADMIN_EMAIL
    ? await User.findOne({ email: process.env.SUPERADMIN_EMAIL })
    : null;

  let created = 0;
  let skipped = 0;

  for (const policy of POLICIES) {
    const existingByType = await Page.findOne({ policyType: policy.policyType });
    if (existingByType) {
      console.log(`SKIP  ${policy.policyType} — a document already exists (slug: ${existingByType.slug}, status: ${existingByType.status}).`);
      skipped++;
      continue;
    }

    // A document may already occupy this slug without policyType set (e.g.
    // an old test/stub created through the legacy generic-Pages flow before
    // this policyType existed). Only ever touch it if its content is
    // trivially short (a placeholder/test stub, not real authored content)
    // — anything substantial is left alone for manual admin review rather
    // than silently overwritten.
    const existingBySlug = await Page.findOne({ slug: policy.defaultSlug });
    if (existingBySlug) {
      const plainLength = existingBySlug.content.replace(/<[^>]*>/g, "").trim().length;
      if (plainLength > 40) {
        console.log(`SKIP  ${policy.policyType} — slug "${policy.defaultSlug}" already holds substantial content (${plainLength} chars); not overwriting. Review manually.`);
        skipped++;
        continue;
      }
      existingBySlug.title = policy.title;
      existingBySlug.content = sanitizeRichText(policy.content);
      existingBySlug.shortDescription = policy.shortDescription;
      existingBySlug.policyType = policy.policyType;
      existingBySlug.status = "published";
      existingBySlug.version = (existingBySlug.version || 1) + 1;
      existingBySlug.updatedBy = superadmin?._id || existingBySlug.updatedBy;
      await existingBySlug.save();
      console.log(`UPGRADE ${policy.policyType} — replaced placeholder stub at slug "${policy.defaultSlug}" (was ${plainLength} chars) with demo content.`);
      created++;
      continue;
    }

    await Page.create({
      slug: policy.defaultSlug,
      title: policy.title,
      content: sanitizeRichText(policy.content),
      shortDescription: policy.shortDescription,
      policyType: policy.policyType,
      status: "published",
      version: 1,
      author: superadmin?._id,
      updatedBy: superadmin?._id,
    });
    console.log(`CREATE ${policy.policyType} — published at slug "${policy.defaultSlug}".`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped} (already existed).`);
}

run()
  .catch((err) => {
    console.error("Error seeding legal policies:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit();
  });
