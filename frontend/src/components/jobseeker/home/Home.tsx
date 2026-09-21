import Stats from "./Stats";
import Hero from "./Hero";
import { TrustStatsBar } from "./TrustStatsBar";
import TrendingJobs from "./TrendingJobs";
import RecommendedJobs from "./RecommendedJobs";
import CallToAction from "./CallToAction";
import RecentJobs from "./RecentJobs";
import JobCategories from "./JobCategories";
import ExploreByField from "./ExploreByField";
import BlogCategoriesSection from "./BlogCategoriesSection";
import Testimonials from "./Testimonials";
import { CommunityPostsPreview } from "../../community/CommunityPostsPreview";
import { AdBanner } from "../../common/AdBanner";

// Order matches the reference visual direction: Hero -> real trust stats
// -> platform value -> trending -> recommended -> categories -> recent ->
// testimonials -> community -> CTA. Every section below is the same
// existing, API-backed component — only the ordering changed, nothing was
// rebuilt or replaced.
export const HomePageJobSeeker = () => (
  <>
    <main className="flex-grow">
      <Hero />
      <TrustStatsBar />
      <TrendingJobs />
      {/* Renders nothing for anonymous visitors/employers, or a jobseeker
          with no skill-matched jobs yet. */}
      <RecommendedJobs />
      {/* Job Categories (job listings) and Blog Categories (articles) are
          separate systems/APIs */}
      <JobCategories />
      {/* Renders nothing if no category currently has any active jobs. */}
      <ExploreByField />
      {/* Renders nothing if no admin has published a blog category yet. */}
      <BlogCategoriesSection />
      {/* Renders nothing if no admin has published a homepage ad. */}
      <AdBanner placement="homepage" />
      <RecentJobs />
      {/* Feature showcase */}
      <Stats />
      {/* Renders nothing if no admin has published a testimonial. */}
      <Testimonials />
      <CommunityPostsPreview variant="jobseeker" limit={3} />
      <CallToAction />
    </main>
  </>
);
