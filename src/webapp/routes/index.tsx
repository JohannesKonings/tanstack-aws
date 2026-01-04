// oxlint-disable func-style
import { createFileRoute } from '@tanstack/react-router';
import {
  Cloud,
  Construction,
  Database,
  ExternalLink,
  Globe,
  RouteIcon,
  Server,
  Shield,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';

export const Route = createFileRoute('/')({ component: App });

function App() {
  const features = [
    {
      icon: <Zap className="w-12 h-12 text-cyan-400" />,
      title: 'Powerful Server Functions',
      description:
        'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
    },
    {
      icon: <Server className="w-12 h-12 text-cyan-400" />,
      title: 'Flexible Server Side Rendering',
      description:
        'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
    },
    {
      icon: <RouteIcon className="w-12 h-12 text-cyan-400" />,
      title: 'API Routes',
      description:
        'Build type-safe API endpoints alongside your application. No separate backend needed.',
    },
    {
      icon: <Shield className="w-12 h-12 text-cyan-400" />,
      title: 'Strongly Typed Everything',
      description:
        'End-to-end type safety from server to client. Catch errors before they reach production.',
    },
    {
      icon: <Waves className="w-12 h-12 text-cyan-400" />,
      title: 'Full Streaming Support',
      description:
        'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
    },
    {
      icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
      title: 'Next Generation Ready',
      description:
        'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
    },
  ];

  const awsFeatures = [
    {
      icon: <Cloud className="w-10 h-10 text-orange-400" />,
      title: 'AWS CDK Infrastructure',
      description:
        'Deploy with AWS CDK constructs. Infrastructure as code with TypeScript for Lambda, CloudFront, S3, and more.',
    },
    {
      icon: <Database className="w-10 h-10 text-orange-400" />,
      title: 'DynamoDB + ElectroDB',
      description:
        'Type-safe database operations with ElectroDB entities. Single-table design patterns made simple.',
    },
    {
      icon: <Globe className="w-10 h-10 text-orange-400" />,
      title: 'CloudFront Distribution',
      description:
        'Global edge caching with CloudFront. Fast, secure, and scalable content delivery worldwide.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img
              src="/images/tanstack-circle-logo.png"
              alt="TanStack Logo"
              className="w-24 h-24 md:w-32 md:h-32"
            />
            <h1 className="text-5xl md:text-6xl font-black text-white [letter-spacing:-0.08em]">
              <span className="text-gray-300">TANSTACK</span>{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent pr-1">
                AWS
              </span>{' '}
              <span className="text-gray-300">EXAMPLES</span>
            </h1>
          </div>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4 font-light">
            TanStack examples deployed with AWS CDK
          </p>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            Explore full-stack examples using TanStack Router, Query, and Start — deployed to AWS
            with CDK infrastructure as code. Learn serverless patterns with Lambda, DynamoDB,
            CloudFront, and S3.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <span className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-full text-sm text-gray-300">
              TanStack Router
            </span>
            <span className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-full text-sm text-gray-300">
              TanStack Query
            </span>
            <span className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-full text-sm text-gray-300">
              TanStack Start
            </span>
            <span className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full text-sm text-orange-300">
              AWS CDK
            </span>
            <span className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full text-sm text-orange-300">
              Lambda
            </span>
            <span className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full text-sm text-orange-300">
              DynamoDB
            </span>
          </div>
          <div className="flex flex-col items-center gap-4">
            <a
              href="https://tanstack.com/start"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/50"
            >
              TanStack Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Work in Progress Section */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-3">
              <Construction className="w-10 h-10 text-yellow-400" />
              <h2 className="text-2xl font-bold text-yellow-400">Work in Progress</h2>
              <Construction className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-gray-300 max-w-2xl mx-auto">
              This project is under active development. New features and examples are being added
              regularly. Follow the progress through the blog posts below.
            </p>
          </div>
          <div className="space-y-3 max-w-2xl mx-auto">
            <a
              href="https://johanneskonings.dev/blog/2025-11-30-tanstack-start-aws-serverless/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-yellow-500/50 hover:bg-slate-800 transition-all group"
            >
              <ExternalLink className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium group-hover:text-yellow-400 transition-colors">
                  TanStack Start AWS Serverless
                </p>
                <p className="text-sm text-gray-400">Initial serverless deployment setup</p>
              </div>
              <span className="text-xs text-gray-500">Nov 2025</span>
            </a>
            <a
              href="https://johanneskonings.dev/blog/2025-12-20-tanstack-start-aws-db-simple/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-yellow-500/50 hover:bg-slate-800 transition-all group"
            >
              <ExternalLink className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium group-hover:text-yellow-400 transition-colors">
                  TanStack Start AWS DB Simple
                </p>
                <p className="text-sm text-gray-400">Simple DynamoDB integration</p>
              </div>
              <span className="text-xs text-gray-500">Dec 2025</span>
            </a>
            <a
              href="https://johanneskonings.dev/blog/2025-12-27-tanstack-start-aws-db-multiple-entities/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-yellow-500/50 hover:bg-slate-800 transition-all group"
            >
              <ExternalLink className="w-5 h-5 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium group-hover:text-yellow-400 transition-colors">
                  TanStack Start AWS DB Multiple Entities
                </p>
                <p className="text-sm text-gray-400">ElectroDB with multiple entity types</p>
              </div>
              <span className="text-xs text-gray-500">Dec 2025</span>
            </a>
          </div>
        </div>
      </section>

      {/* AWS Infrastructure Section */}
      <section className="py-12 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">Deployed with AWS CDK</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            This site demonstrates TanStack applications running on AWS infrastructure, fully
            managed with CDK constructs written in TypeScript.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {awsFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-orange-500/5 backdrop-blur-sm border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-300"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TanStack Features Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">TanStack Start Features</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore the powerful capabilities of TanStack Start for building modern web
            applications.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
