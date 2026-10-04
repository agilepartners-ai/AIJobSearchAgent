/**
 * The analytics page is now a view inside the single dashboard. This route is
 * kept so existing links and bookmarks still land in the right place.
 */
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { NoIndex } from '../components/seo/Seo';

function AnalyticsDashboardRedirectContent() {
  const router = useRouter();
  useEffect(() => {
    void router.replace('/dashboard?view=analytics');
  }, [router]);
  return null;
}

export default function AnalyticsDashboardRedirect() {
  return (
    <>
      <NoIndex title="Analytics" />
      <AnalyticsDashboardRedirectContent />
    </>
  );
}
