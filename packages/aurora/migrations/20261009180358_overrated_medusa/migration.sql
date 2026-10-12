CREATE SCHEMA "default";
--> statement-breakpoint
CREATE TYPE "default"."account_type" AS ENUM('checking', 'savings', 'investment');--> statement-breakpoint
CREATE TYPE "default"."address_type" AS ENUM('home', 'work', 'billing', 'shipping');--> statement-breakpoint
CREATE TYPE "default"."contact_type" AS ENUM('email', 'phone', 'mobile', 'linkedin', 'twitter');--> statement-breakpoint
CREATE TYPE "default"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "default"."addresses" (
	"id" uuid PRIMARY KEY,
	"personId" uuid NOT NULL,
	"type" "default"."address_type" NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postalCode" text NOT NULL,
	"country" text NOT NULL,
	"isPrimary" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "default"."bank_accounts" (
	"id" uuid PRIMARY KEY,
	"personId" uuid NOT NULL,
	"bankName" text NOT NULL,
	"accountType" "default"."account_type" NOT NULL,
	"accountNumberLast4" text NOT NULL,
	"iban" text,
	"bic" text,
	"isPrimary" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "default"."contacts" (
	"id" uuid PRIMARY KEY,
	"personId" uuid NOT NULL,
	"type" "default"."contact_type" NOT NULL,
	"value" text NOT NULL,
	"isPrimary" boolean NOT NULL,
	"isVerified" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "default"."employments" (
	"id" uuid PRIMARY KEY,
	"personId" uuid NOT NULL,
	"companyName" text NOT NULL,
	"position" text NOT NULL,
	"department" text,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone,
	"isCurrent" boolean NOT NULL,
	"salary" numeric,
	"currency" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "default"."persons" (
	"id" uuid PRIMARY KEY,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"dateOfBirth" timestamp with time zone,
	"gender" "default"."gender",
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "default"."addresses" ADD CONSTRAINT "addresses_personId_persons_id_fkey" FOREIGN KEY ("personId") REFERENCES "default"."persons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "default"."bank_accounts" ADD CONSTRAINT "bank_accounts_personId_persons_id_fkey" FOREIGN KEY ("personId") REFERENCES "default"."persons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "default"."contacts" ADD CONSTRAINT "contacts_personId_persons_id_fkey" FOREIGN KEY ("personId") REFERENCES "default"."persons"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "default"."employments" ADD CONSTRAINT "employments_personId_persons_id_fkey" FOREIGN KEY ("personId") REFERENCES "default"."persons"("id") ON DELETE CASCADE;