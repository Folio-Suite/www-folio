import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_webmentions_verification" AS ENUM('pending', 'verified', 'invalid', 'error');
  CREATE TYPE "public"."enum_webmentions_moderation" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_webmention_deliveries_state" AS ENUM('pending', 'sent', 'no-endpoint', 'failed', 'canceled');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'verifyWebmention' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'sendWebmention' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'verifyWebmention' BEFORE 'schedulePublish';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'sendWebmention' BEFORE 'schedulePublish';
  CREATE TABLE "webmentions" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "source" varchar NOT NULL,
    "target_id" integer NOT NULL,
    "source_title" varchar,
    "fingerprint" varchar,
    "verification" "enum_webmentions_verification" DEFAULT 'pending' NOT NULL,
    "moderation" "enum_webmentions_moderation" DEFAULT 'pending' NOT NULL,
    "error" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "webmention_limits" (
    "id" serial PRIMARY KEY NOT NULL,
    "bucket" varchar NOT NULL,
    "count" numeric NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "webmention_deliveries" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "entry_id" integer NOT NULL,
    "source" varchar NOT NULL,
    "target" varchar NOT NULL,
    "endpoint" varchar,
    "state" "enum_webmention_deliveries_state" DEFAULT 'pending' NOT NULL,
    "attempts" numeric DEFAULT 0,
    "error" varchar,
    "retry" boolean,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "webmention_publications" (
    "id" serial PRIMARY KEY NOT NULL,
    "entry_id" integer NOT NULL,
    "fingerprint" varchar NOT NULL,
    "revision" numeric NOT NULL,
    "targets" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_jobs" ADD COLUMN "concurrency_key" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webmentions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webmention_limits_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webmention_deliveries_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webmention_publications_id" integer;
  ALTER TABLE "webmentions" ADD CONSTRAINT "webmentions_target_id_blog_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "webmention_deliveries" ADD CONSTRAINT "webmention_deliveries_entry_id_blog_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "webmention_publications" ADD CONSTRAINT "webmention_publications_entry_id_blog_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "webmentions_key_idx" ON "webmentions" USING btree ("key");
  CREATE INDEX "webmentions_target_idx" ON "webmentions" USING btree ("target_id");
  CREATE INDEX "webmentions_updated_at_idx" ON "webmentions" USING btree ("updated_at");
  CREATE INDEX "webmentions_created_at_idx" ON "webmentions" USING btree ("created_at");
  CREATE UNIQUE INDEX "webmention_limits_bucket_idx" ON "webmention_limits" USING btree ("bucket");
  CREATE INDEX "webmention_limits_updated_at_idx" ON "webmention_limits" USING btree ("updated_at");
  CREATE INDEX "webmention_limits_created_at_idx" ON "webmention_limits" USING btree ("created_at");
  CREATE UNIQUE INDEX "webmention_deliveries_key_idx" ON "webmention_deliveries" USING btree ("key");
  CREATE INDEX "webmention_deliveries_entry_idx" ON "webmention_deliveries" USING btree ("entry_id");
  CREATE INDEX "webmention_deliveries_updated_at_idx" ON "webmention_deliveries" USING btree ("updated_at");
  CREATE INDEX "webmention_deliveries_created_at_idx" ON "webmention_deliveries" USING btree ("created_at");
  CREATE UNIQUE INDEX "webmention_publications_entry_idx" ON "webmention_publications" USING btree ("entry_id");
  CREATE INDEX "webmention_publications_updated_at_idx" ON "webmention_publications" USING btree ("updated_at");
  CREATE INDEX "webmention_publications_created_at_idx" ON "webmention_publications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webmentions_fk" FOREIGN KEY ("webmentions_id") REFERENCES "public"."webmentions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webmention_limits_fk" FOREIGN KEY ("webmention_limits_id") REFERENCES "public"."webmention_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webmention_deliveries_fk" FOREIGN KEY ("webmention_deliveries_id") REFERENCES "public"."webmention_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webmention_publications_fk" FOREIGN KEY ("webmention_publications_id") REFERENCES "public"."webmention_publications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_jobs_concurrency_key_idx" ON "payload_jobs" USING btree ("concurrency_key");
  CREATE INDEX "payload_locked_documents_rels_webmentions_id_idx" ON "payload_locked_documents_rels" USING btree ("webmentions_id");
  CREATE INDEX "payload_locked_documents_rels_webmention_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("webmention_limits_id");
  CREATE INDEX "payload_locked_documents_rels_webmention_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("webmention_deliveries_id");
  CREATE INDEX "payload_locked_documents_rels_webmention_publications_id_idx" ON "payload_locked_documents_rels" USING btree ("webmention_publications_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "webmentions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webmention_limits" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webmention_deliveries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webmention_publications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "webmentions" CASCADE;
  DROP TABLE "webmention_limits" CASCADE;
  DROP TABLE "webmention_deliveries" CASCADE;
  DROP TABLE "webmention_publications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webmentions_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webmention_limits_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webmention_deliveries_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webmention_publications_fk";

  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_jobs_concurrency_key_idx";
  DROP INDEX "payload_locked_documents_rels_webmentions_id_idx";
  DROP INDEX "payload_locked_documents_rels_webmention_limits_id_idx";
  DROP INDEX "payload_locked_documents_rels_webmention_deliveries_id_idx";
  DROP INDEX "payload_locked_documents_rels_webmention_publications_id_idx";
  ALTER TABLE "payload_jobs" DROP COLUMN "concurrency_key";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webmentions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webmention_limits_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webmention_deliveries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webmention_publications_id";
  DROP TYPE "public"."enum_webmentions_verification";
  DROP TYPE "public"."enum_webmentions_moderation";
  DROP TYPE "public"."enum_webmention_deliveries_state";`)
}
