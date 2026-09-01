import Stats from "./Stats";
import Hero from "./Hero";
import { TrustStatsBar } from "./TrustStatsBar";
import TrendingJobs from "./TrendingJobs";
import CallToAction from "./CallToAction";
import RecentJobs from "./RecentJobs";
import JobCategories from "./JobCategories";
import { CommunityPostsPreview } from "../../community/CommunityPostsPreview";
import { AdBanner } from "../../common/AdBanner";

// Order matches the reference visual direction: Hero -> real trust stats
// -> platform value -> trending -> categories -> recent -> community ->
// CTA. Every section below is the same existing, API-backed component —
// only the ordering changed, nothing was rebuilt or replaced.
export const HomePageJobSeeker = () => (
  <>
    <main className="flex-grow">
      <Hero />
      <TrustStatsBar />
      <Stats />
      <TrendingJobs />
      <JobCategories />
      {/* Renders nothing if no admin has published a homepage ad. */}
      <AdBanner placement="homepage" />
      <RecentJobs />
      <CommunityPostsPreview variant="jobseeker" limit={3} />
      <CallToAction />
    </main>
  </>
);
