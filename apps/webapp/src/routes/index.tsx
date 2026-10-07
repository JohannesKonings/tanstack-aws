import {
  ArrowSquareOutIcon,
  CloudIcon,
  DatabaseIcon,
  GlobeIcon,
  HardDrivesIcon,
  HardHatIcon,
  LightningIcon,
  PathIcon,
  ShieldIcon,
  SparkleIcon,
  WavesIcon,
} from '@phosphor-icons/react';
// oxlint-disable jsx-max-depth
// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import { PageHeader } from '#apps/webapp/components/ui/page-header';
import { StatsSection } from '#apps/webapp/components/ui/stats-section';

export const Route = createFileRoute('/')({ component: App });

function App() {
  const features = [
    {
      icon: <LightningIcon className="size-12 text-lib-start" />,
      title: 'Powerful Server Functions',
      description:
        'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
    },
    {
      icon: <HardDrivesIcon className="size-12 text-lib-start" />,
      title: 'Flexible Server Side Rendering',
      description:
        'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
    },
    {
      icon: <PathIcon className="size-12 text-lib-start" />,
      title: 'API Routes',
      description:
        'Build type-safe API endpoints alongside your application. No separate backend needed.',
    },
    {
      icon: <ShieldIcon className="size-12 text-lib-start" />,
      title: 'Strongly Typed Everything',
      description:
        'End-to-end type safety from server to client. Catch errors before they reach production.',
    },
    {
      icon: <WavesIcon className="size-12 text-lib-start" />,
      title: 'Full Streaming Support',
      description:
        'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
    },
    {
      icon: <SparkleIcon className="size-12 text-lib-start" />,
      title: 'Next Generation Ready',
      description:
        'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
    },
  ];

  const awsFeatures = [
    {
      icon: <CloudIcon className="size-10 text-accent-warm" />,
      title: 'AWS CDK Infrastructure',
      description:
        'Deploy with AWS CDK constructs. Infrastructure as code with TypeScript for Lambda, CloudFront, S3, and more.',
    },
    {
      icon: <DatabaseIcon className="size-10 text-accent-warm" />,
      title: 'DynamoDB + ElectroDB',
      description:
        'Type-safe database operations with ElectroDB entities. Single-table design patterns made simple.',
    },
    {
      icon: <GlobeIcon className="size-10 text-accent-warm" />,
      title: 'CloudFront Distribution',
      description:
        'Global edge caching with CloudFront. Fast, secure, and scalable content delivery worldwide.',
    },
  ];

  const blogPosts = [
    {
      href: 'https://johanneskonings.dev/blog/2025-11-30-tanstack-start-aws-serverless/',
      title: 'TanStack Start AWS Serverless',
      description:
        'Deploy TanStack Start to AWS with Lambda, CloudFront, and S3 using CDK infrastructure',
      date: 'Nov 2025',
    },
    {
      href: 'https://johanneskonings.dev/blog/2025-12-20-tanstack-start-aws-db-simple/',
      title: 'TanStack DB with DynamoDb - Todo List',
      description:
        'Build a basic todo app with DynamoDB, server functions, and type-safe API routes',
      date: 'Dec 2025',
    },
    {
      href: 'https://johanneskonings.dev/blog/2025-12-27-tanstack-start-aws-db-multiple-entities/',
      title: 'TanStack DB with DynamoDb - Multiple Entities',
      description:
        'Advanced DynamoDB patterns with ElectroDB for managing complex entity relationships',
      date: 'Dec 2025',
    },
    {
      href: 'https://johanneskonings.dev/blog/2026-01-08-tanstack-start-aws-db-multiple-entities-sse/',
      title: 'TanStack DB with DynamoDb - Multiple Entities SSE',
      description: 'Real-time data synchronization with Server-Sent Events and DynamoDB Streams',
      date: 'Jan 2026',
    },
  ];

  return (
    <div className="min-h-screen bg-background-default">
      <section className="relative overflow-hidden px-6 py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-lib-start/10 via-ds-blue-500/10 to-ds-purple-400/10" />
        <div className="relative mx-auto max-w-5xl text-center">
          <PageHeader
            align="center"
            title={
              <>
                <span className="text-text-secondary">TanStack </span>
                <em>AWS</em>
                <span className="text-text-secondary"> Examples</span>
              </>
            }
            lede="Explore full-stack examples using TanStack Router, Query, and Start — deployed to AWS with CDK infrastructure as code."
            icon={null}
          />
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <Badge variant="teal">TanStack Router</Badge>
            <Badge variant="info">TanStack Query</Badge>
            <Badge variant="purple">TanStack Start</Badge>
            <Badge variant="orange">AWS CDK</Badge>
            <Badge variant="orange">Lambda</Badge>
            <Badge variant="orange">DynamoDB</Badge>
          </div>
          <StatsSection
            page="home"
            layout="landscape"
            className="mb-8"
            stats={[
              {
                key: 'demos',
                value: '10+',
                label: 'Live demos',
                icon: <LightningIcon className="size-6 text-lib-start" />,
              },
              {
                key: 'services',
                value: '5',
                label: 'AWS services',
                icon: <CloudIcon className="size-6 text-accent-warm" />,
              },
              {
                key: 'libraries',
                value: '6',
                label: 'TanStack libraries',
                icon: <SparkleIcon className="size-6 text-ds-purple-400" />,
              },
            ]}
          />
          <div className="flex flex-col items-center gap-4">
            <Button
              as="a"
              href="https://tanstack.com/start"
              target="_blank"
              rel="noopener noreferrer"
              color="cyan"
              size="lg"
            >
              TanStack Documentation
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <Card className="border-status-warning/30 bg-status-warning-bg/30 p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-4">
              <HardHatIcon className="size-10 text-text-warning" />
              <h2 className="text-2xl font-bold text-text-warning">Work in Progress</h2>
              <HardHatIcon className="size-10 text-text-warning" />
            </div>
            <p className="mx-auto max-w-2xl text-text-secondary">
              This project is under active development. New features and examples are being added
              regularly. Follow the progress through the blog posts below.
            </p>
          </div>
          <div className="mx-auto max-w-2xl space-y-3">
            {blogPosts.map((post) => (
              <a
                key={post.href}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <Card className="flex items-center gap-3 p-4 transition-all hover:border-border-focus">
                  <ArrowSquareOutIcon className="size-5 shrink-0 text-text-warning" />
                  <div className="flex-1">
                    <p className="font-medium text-text-primary transition-colors group-hover:text-text-warning">
                      {post.title}
                    </p>
                    <p className="text-sm text-text-muted">{post.description}</p>
                  </div>
                  <span className="text-xs text-text-muted">{post.date}</span>
                </Card>
              </a>
            ))}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-text-primary">Deployed with AWS CDK</h2>
          <p className="mx-auto max-w-2xl text-text-muted">
            This site demonstrates TanStack applications running on AWS infrastructure, fully
            managed with CDK constructs written in TypeScript.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {awsFeatures.map((feature) => (
            <Card
              key={feature.title}
              className="border-accent-warm/20 bg-accent-warm/5 p-6 transition-all duration-300 hover:border-accent-warm/50"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-text-primary">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-text-primary">TanStack Start Features</h2>
          <p className="mx-auto max-w-2xl text-text-muted">
            Explore the powerful capabilities of TanStack Start for building modern web
            applications.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="p-6 transition-all duration-300 hover:border-lib-start/50 hover:shadow-lg"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="mb-3 text-xl font-semibold text-text-primary">{feature.title}</h3>
              <p className="leading-relaxed text-text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
