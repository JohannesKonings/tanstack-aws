#!/usr/bin/env node
/**
 * Generates public/robots.txt with stage-aware Sitemap directive.
 *
 * - Production (APP_STAGE=prod): Uses absolute URL with production domain
 * - Non-production stages: Omits the Sitemap directive entirely
 *
 * Usage:
 *   APP_STAGE=prod node scripts/generate-robots-txt.ts
 *   APP_STAGE=dev node scripts/generate-robots-txt.ts
 */

import fs from 'node:fs';
import path from 'node:path';

const appStage = process.env.APP_STAGE || 'dev';
const productionDomain = 'https://tanstack-aws-examples.com';

const getSitemapSection = (): string => {
  if (appStage === 'prod') {
    return `
# Sitemap
Sitemap: ${productionDomain}/sitemap.xml
`;
  }
  return '';
};

const robotsTxtContent = `# https://www.robotstxt.org/robotstxt.html
# TanStack AWS Examples - Deployed with AWS CDK

User-agent: *
Allow: /
Disallow: /api/
${getSitemapSection()}
# Crawl-delay for polite crawling
Crawl-delay: 1

# AI/LLM Crawlers - Allow for GEO (Generative Engine Optimization)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Anthropic-AI
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Cohere-ai
Allow: /
`;

const outputPath = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '../public/robots.txt',
);

fs.writeFileSync(outputPath, robotsTxtContent, 'utf-8');

// oxlint-disable-next-line no-console
console.log(`Generated robots.txt for stage: ${appStage}`);
if (appStage === 'prod') {
  // oxlint-disable-next-line no-console
  console.log(`  Sitemap: ${productionDomain}/sitemap.xml`);
} else {
  // oxlint-disable-next-line no-console
  console.log('  Sitemap directive omitted for non-production stage');
}
