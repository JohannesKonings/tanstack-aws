# TanStack AWS Examples

This repository contains examples demonstrating how to use [TanStack libraries](https://tanstack.com/) (Start, Router, DB, AI) in combination with AWS services for building serverless web applications.
Provisioning of AWS resources is handled using [AWS CDK](https://aws.amazon.com/cdk/).

## Code quality gates (CI + pre-commit)

### Local checks

- `./node_modules/.bin/vp check`
- `./node_modules/.bin/vp lint --type-aware`
- `./node_modules/.bin/vp exec tsc --noEmit`

### Pre-commit hook (strict)

This repo includes Vite+ hook scripts under `.vite-hooks/` that run `vp check` on every commit.

Enable them locally:

- `git config core.hooksPath .vite-hooks/_`

### CI (required for merging to `main`)

GitHub Actions runs the `vp-check` job (see `.github/workflows/ci.yml`). Configure GitHub branch protection/rulesets for `main` to require the `vp-check` status check before merging.

# Further Reading

- https://johanneskonings.dev/blog/2025-11-30-tanstack-start-aws-serverless/
- https://johanneskonings.dev/blog/2025-12-20-tanstack-start-aws-db-simple/
- https://johanneskonings.dev/blog/2025-12-27-tanstack-start-aws-db-multiple-entities/
- https://johanneskonings.dev/blog/2026-01-08-tanstack-start-aws-db-multiple-entities-sse/
- https://johanneskonings.dev/blog/2026-02-02-tanstack-ai-bedrock-simple/

# Examples

## TanStack Start

Deploys a TanStack Start application on AWS using a serverless architecture with streaming support.

**Architecture:**

- **Lambda** (Node.js 24.x) - Runs server-side rendering via Nitro
- **API Gateway** (REST API) - HTTP endpoint with response streaming
- **CloudFront** - CDN for global distribution
- **S3** - Static assets (JS, CSS, images)

![architecture](./docs/architecture.drawio.svg)

## TanStack DB

Demonstrates TanStack DB as a client-first database synced to DynamoDB on AWS.

**Stack:**

- **TanStack DB** - Client-side database with collections and live queries
- **DynamoDB** - Single-table design with GSI for access patterns
- **ElectroDB** - Type-safe DynamoDB client for entity management
- **TanStack Start Server Functions** - Bridge between collections and DynamoDB

**Data Model (Multi-Entity Example):**

- Person with related entities: Address, BankAccount, ContactInfo, Employment
- Single-table design with composite keys (`pk`/`sk`)
- GSI for listing all persons

![architecture tanstack db](./docs/tanstack-db-architecture.drawio.svg)

## TanStack AI

Chat UI powered by TanStack AI with Amazon Bedrock (streaming, tools, optional daily budget).

**Stack:**

- **TanStack AI** - `useChat`, `fetchServerSentEvents` for streaming chat
- **TanStack Start** - Server route `/demo/api/tanchat` with `chat()` and SSE response
- **Bedrock adapter** - Custom ConverseStream adapter for AWS Bedrock
- **Tools** - Server-side tools (e.g. getGuitars, recommendGuitar) with agent loop
- **Budget** - Optional daily spend check via Bedrock Budget API

The same Lambda and API Gateway serve SSR, DB sync (SSE), and AI chat.
