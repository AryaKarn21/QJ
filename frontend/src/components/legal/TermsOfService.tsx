import { LegalPage } from './LegalPage';

// No prior static content existed for this route at all (it wasn't even
// reachable — the footer linked to /terms with no matching route). No
// fallback is passed since there's nothing legitimate to fall back to;
// LegalPage shows an honest "not published yet" state until an admin
// writes real content in the CMS Legal tab.
const TermsOfService = () => <LegalPage slug="terms-of-service" defaultTitle="Terms of Service" />;

export default TermsOfService;
