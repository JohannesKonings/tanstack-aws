# TanStack AWS Examples

This repository contains examples demonstrating how to use [TanStack libraries](https://tanstack.com/) (Start, Router, DB) in combination with AWS services for building serverless web applications.
Provisioning of AWS resources is handled using [AWS CDK](https://aws.amazon.com/cdk/).

# Further Reading

* https://johanneskonings.dev/blog/2025-11-30-tanstack-start-aws-serverless/
* https://johanneskonings.dev/blog/2025-12-20-tanstack-start-aws-db-simple/
* https://johanneskonings.dev/blog/2025-12-27-tanstack-start-aws-db-multiple-entities/

# Examples

## TanStack Start 

Deploys a TanStack Start application on AWS using a serverless architecture with streaming support.

**Architecture:**
- **Lambda** (Node.js 24.x) - Runs server-side rendering via Nitro
- **API Gateway** (REST API) - HTTP endpoint with response streaming
- **CloudFront** - CDN for global distribution
- **S3** - Static assets (JS, CSS, images)

![architecture](./docs/architechture.drawio.svg)

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