import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// No incremental cache: every page is prerendered at build time and served as a static asset, and the API
// routes are dynamic. Add the R2 cache override only if ISR or on-demand revalidation is ever introduced.
export default defineCloudflareConfig({});
