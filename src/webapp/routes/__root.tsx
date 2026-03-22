import { AiDevtoolsPanel } from '@tanstack/react-ai-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';
// oxlint-disable func-style
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { TRPCRouter } from '#src/webapp/integrations/trpc/router';
import Header from '../components/Header';
import StoreDevtools from '../lib/demo-store-devtools';
import appCss from '../styles.css?url';

interface MyRouterContext {
  queryClient: QueryClient;

  trpc: TRPCOptionsProxy<TRPCRouter>;
}

const siteTitle = 'TanStack AWS Examples - Deployed with AWS CDK';
const siteDescription =
  'Explore TanStack AWS Examples showcasing TanStack Router, Query, and Start deployed to AWS using CDK. Examples featuring serverless architecture, DynamoDB, CloudFront, Lambda, and infrastructure as code.';
const siteUrl = 'https://tanstack-aws-examples.com';
const siteKeywords =
  'TanStack AWS Examples, TanStack Router, TanStack Query, TanStack Start, AWS CDK, AWS Lambda, DynamoDB, CloudFront, S3, Infrastructure as Code, IaC, TypeScript, React, Serverless, Full-Stack, CDK Constructs, ElectroDB, tRPC';

// JSON-LD structured data for enhanced SEO and GEO
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteTitle,
  description: siteDescription,
  url: siteUrl,
  publisher: {
    '@type': 'Organization',
    name: 'TanStack AWS Examples',
    url: siteUrl,
  },
  about: [
    { '@type': 'Thing', name: 'TanStack Router' },
    { '@type': 'Thing', name: 'TanStack Query' },
    { '@type': 'Thing', name: 'TanStack Start' },
    { '@type': 'Thing', name: 'AWS CDK Deployment' },
    { '@type': 'Thing', name: 'Infrastructure as Code' },
    { '@type': 'Thing', name: 'Serverless Architecture' },
  ],
  mainEntity: {
    '@type': 'SoftwareSourceCode',
    name: 'TanStack AWS Examples',
    description:
      'TanStack AWS Examples - Examples of TanStack applications deployed to AWS using CDK infrastructure as code',
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: ['Node.js', 'AWS Lambda'],
    codeRepository: 'https://github.com/JohannesKonings/tanstack-aws',
  },
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteTitle,
      },
      // SEO meta tags
      {
        name: 'description',
        content: siteDescription,
      },
      {
        name: 'keywords',
        content: siteKeywords,
      },
      {
        name: 'author',
        content: 'TanStack AWS Examples',
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      // Open Graph tags for social sharing
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: siteTitle,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:url',
        content: siteUrl,
      },
      {
        property: 'og:site_name',
        content: 'TanStack AWS Examples',
      },
      {
        property: 'og:image',
        content: `${siteUrl}/images/og-image.png`,
      },
      // Twitter Card tags
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: siteTitle,
      },
      {
        name: 'twitter:description',
        content: siteDescription,
      },
      {
        name: 'twitter:image',
        content: `${siteUrl}/images/og-image.png`,
      },
      // Additional SEO tags for GEO (Generative Engine Optimization)
      {
        name: 'application-name',
        content: 'TanStack AWS Examples',
      },
      {
        name: 'subject',
        content: 'TanStack AWS Examples deployed with CDK infrastructure as code',
      },
      {
        name: 'classification',
        content: 'Software Development, Web Development, Infrastructure as Code',
      },
      {
        name: 'topic',
        content:
          'TanStack Router, TanStack Query, TanStack Start, TansStack DB, AWS, CDK Deployment, Serverless, TypeScript',
      },
      {
        name: 'google-adsense-account',
        content: 'ca-pub-6554177261098317',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'canonical',
        href: siteUrl,
      },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
      {
        src: 'https://cloud.umami.is/script.js',
        defer: true,
        'data-website-id': '5fc7d7d9-ab60-4cd5-9edf-9908509e5705',
        'data-domains': 'tanstack-aws-examples.com',
      },
      {
        src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6554177261098317',
        async: true,
        crossOrigin: 'anonymous',
      },
    ],
  }),
  notFoundComponent: () => <p>Not Found</p>,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
            StoreDevtools,
            {
              name: 'AI Devtools',
              render: <AiDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
