import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DELETE FROM "search" WHERE "id" IN (SELECT "parent_id" FROM "search_rels" WHERE "posts_id" IS NOT NULL);
   CREATE TYPE "public"."enum_blog_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "blog_populated_authors" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar
  );

  CREATE TABLE "blog" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "hero_image_id" integer,
    "content" jsonb,
    "meta_title" varchar,
    "meta_image_id" integer,
    "meta_description" varchar,
    "published_at" timestamp(3) with time zone,
    "generate_slug" boolean DEFAULT true,
    "slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_blog_status" DEFAULT 'draft'
  );

  CREATE TABLE "blog_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "blog_id" integer,
    "categories_id" integer,
    "users_id" integer
  );

  CREATE TABLE "_blog_v_version_populated_authors" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "_uuid" varchar,
    "name" varchar
  );

  CREATE TABLE "_blog_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_hero_image_id" integer,
    "version_content" jsonb,
    "version_meta_title" varchar,
    "version_meta_image_id" integer,
    "version_meta_description" varchar,
    "version_published_at" timestamp(3) with time zone,
    "version_generate_slug" boolean DEFAULT true,
    "version_slug" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__blog_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean,
    "autosave" boolean
  );

  CREATE TABLE "_blog_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "blog_id" integer,
    "categories_id" integer,
    "users_id" integer
  );

  ALTER TABLE "posts_populated_authors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_populated_authors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_populated_authors" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_version_populated_authors" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT IF EXISTS "pages_rels_posts_fk";

  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT IF EXISTS "_pages_v_rels_posts_fk";

  ALTER TABLE "redirects_rels" DROP CONSTRAINT IF EXISTS "redirects_rels_posts_fk";

  ALTER TABLE "search_rels" DROP CONSTRAINT IF EXISTS "search_rels_posts_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_posts_fk";

  ALTER TABLE "header_rels" DROP CONSTRAINT IF EXISTS "header_rels_posts_fk";

  ALTER TABLE "footer_rels" DROP CONSTRAINT IF EXISTS "footer_rels_posts_fk";

  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'blog'::text;
  DROP TYPE "public"."enum_pages_blocks_archive_relation_to";
  CREATE TYPE "public"."enum_pages_blocks_archive_relation_to" AS ENUM('blog');
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'blog'::"public"."enum_pages_blocks_archive_relation_to";
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE "public"."enum_pages_blocks_archive_relation_to" USING 'blog'::"public"."enum_pages_blocks_archive_relation_to";
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'blog'::text;
  DROP TYPE "public"."enum__pages_v_blocks_archive_relation_to";
  CREATE TYPE "public"."enum__pages_v_blocks_archive_relation_to" AS ENUM('blog');
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'blog'::"public"."enum__pages_v_blocks_archive_relation_to";
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE "public"."enum__pages_v_blocks_archive_relation_to" USING 'blog'::"public"."enum__pages_v_blocks_archive_relation_to";
  DROP INDEX "pages_rels_posts_id_idx";
  DROP INDEX "_pages_v_rels_posts_id_idx";
  DROP INDEX "redirects_rels_posts_id_idx";
  DROP INDEX "search_rels_posts_id_idx";
  DROP INDEX "payload_locked_documents_rels_posts_id_idx";
  DROP INDEX "header_rels_posts_id_idx";
  DROP INDEX "footer_rels_posts_id_idx";
  ALTER TABLE "pages_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "redirects_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "search_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "footer_rels" ADD COLUMN "blog_id" integer;
  ALTER TABLE "blog_populated_authors" ADD CONSTRAINT "blog_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_version_populated_authors" ADD CONSTRAINT "_blog_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_parent_id_blog_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "blog_populated_authors_order_idx" ON "blog_populated_authors" USING btree ("_order");
  CREATE INDEX "blog_populated_authors_parent_id_idx" ON "blog_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "blog_hero_image_idx" ON "blog" USING btree ("hero_image_id");
  CREATE INDEX "blog_meta_meta_image_idx" ON "blog" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "blog_slug_idx" ON "blog" USING btree ("slug");
  CREATE INDEX "blog_updated_at_idx" ON "blog" USING btree ("updated_at");
  CREATE INDEX "blog_created_at_idx" ON "blog" USING btree ("created_at");
  CREATE INDEX "blog__status_idx" ON "blog" USING btree ("_status");
  CREATE INDEX "blog_rels_order_idx" ON "blog_rels" USING btree ("order");
  CREATE INDEX "blog_rels_parent_idx" ON "blog_rels" USING btree ("parent_id");
  CREATE INDEX "blog_rels_path_idx" ON "blog_rels" USING btree ("path");
  CREATE INDEX "blog_rels_blog_id_idx" ON "blog_rels" USING btree ("blog_id");
  CREATE INDEX "blog_rels_categories_id_idx" ON "blog_rels" USING btree ("categories_id");
  CREATE INDEX "blog_rels_users_id_idx" ON "blog_rels" USING btree ("users_id");
  CREATE INDEX "_blog_v_version_populated_authors_order_idx" ON "_blog_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_blog_v_version_populated_authors_parent_id_idx" ON "_blog_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_blog_v_parent_idx" ON "_blog_v" USING btree ("parent_id");
  CREATE INDEX "_blog_v_version_version_hero_image_idx" ON "_blog_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_blog_v_version_meta_version_meta_image_idx" ON "_blog_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_blog_v_version_version_slug_idx" ON "_blog_v" USING btree ("version_slug");
  CREATE INDEX "_blog_v_version_version_updated_at_idx" ON "_blog_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_v_version_version_created_at_idx" ON "_blog_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_v_version_version__status_idx" ON "_blog_v" USING btree ("version__status");
  CREATE INDEX "_blog_v_created_at_idx" ON "_blog_v" USING btree ("created_at");
  CREATE INDEX "_blog_v_updated_at_idx" ON "_blog_v" USING btree ("updated_at");
  CREATE INDEX "_blog_v_latest_idx" ON "_blog_v" USING btree ("latest");
  CREATE INDEX "_blog_v_autosave_idx" ON "_blog_v" USING btree ("autosave");
  CREATE INDEX "_blog_v_rels_order_idx" ON "_blog_v_rels" USING btree ("order");
  CREATE INDEX "_blog_v_rels_parent_idx" ON "_blog_v_rels" USING btree ("parent_id");
  CREATE INDEX "_blog_v_rels_path_idx" ON "_blog_v_rels" USING btree ("path");
  CREATE INDEX "_blog_v_rels_blog_id_idx" ON "_blog_v_rels" USING btree ("blog_id");
  CREATE INDEX "_blog_v_rels_categories_id_idx" ON "_blog_v_rels" USING btree ("categories_id");
  CREATE INDEX "_blog_v_rels_users_id_idx" ON "_blog_v_rels" USING btree ("users_id");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_blog_id_idx" ON "pages_rels" USING btree ("blog_id");
  CREATE INDEX "_pages_v_rels_blog_id_idx" ON "_pages_v_rels" USING btree ("blog_id");
  CREATE INDEX "redirects_rels_blog_id_idx" ON "redirects_rels" USING btree ("blog_id");
  CREATE INDEX "search_rels_blog_id_idx" ON "search_rels" USING btree ("blog_id");
  CREATE INDEX "payload_locked_documents_rels_blog_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_id");
  CREATE INDEX "header_rels_blog_id_idx" ON "header_rels" USING btree ("blog_id");
  CREATE INDEX "footer_rels_blog_id_idx" ON "footer_rels" USING btree ("blog_id");
  ALTER TABLE "pages_rels" DROP COLUMN "posts_id";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "posts_id";
  ALTER TABLE "redirects_rels" DROP COLUMN "posts_id";
  ALTER TABLE "search_rels" DROP COLUMN "posts_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "posts_id";
  ALTER TABLE "header_rels" DROP COLUMN "posts_id";
  ALTER TABLE "footer_rels" DROP COLUMN "posts_id";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_status";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "posts_populated_authors" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar
  );

  CREATE TABLE "posts" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" varchar,
    "hero_image_id" integer,
    "content" jsonb,
    "meta_title" varchar,
    "meta_image_id" integer,
    "meta_description" varchar,
    "published_at" timestamp(3) with time zone,
    "generate_slug" boolean DEFAULT true,
    "slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_posts_status" DEFAULT 'draft'
  );

  CREATE TABLE "posts_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "posts_id" integer,
    "categories_id" integer,
    "users_id" integer
  );

  CREATE TABLE "_posts_v_version_populated_authors" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "_uuid" varchar,
    "name" varchar
  );

  CREATE TABLE "_posts_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_title" varchar,
    "version_hero_image_id" integer,
    "version_content" jsonb,
    "version_meta_title" varchar,
    "version_meta_image_id" integer,
    "version_meta_description" varchar,
    "version_published_at" timestamp(3) with time zone,
    "version_generate_slug" boolean DEFAULT true,
    "version_slug" varchar,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__posts_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean,
    "autosave" boolean
  );

  CREATE TABLE "_posts_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "posts_id" integer,
    "categories_id" integer,
    "users_id" integer
  );

  ALTER TABLE "blog_populated_authors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blog_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blog_v_version_populated_authors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blog_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_blog_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blog_populated_authors" CASCADE;
  DROP TABLE "blog" CASCADE;
  DROP TABLE "blog_rels" CASCADE;
  DROP TABLE "_blog_v_version_populated_authors" CASCADE;
  DROP TABLE "_blog_v" CASCADE;
  DROP TABLE "_blog_v_rels" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT IF EXISTS "pages_rels_blog_fk";

  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT IF EXISTS "_pages_v_rels_blog_fk";

  ALTER TABLE "redirects_rels" DROP CONSTRAINT IF EXISTS "redirects_rels_blog_fk";

  ALTER TABLE "search_rels" DROP CONSTRAINT IF EXISTS "search_rels_blog_fk";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_blog_fk";

  ALTER TABLE "header_rels" DROP CONSTRAINT IF EXISTS "header_rels_blog_fk";

  ALTER TABLE "footer_rels" DROP CONSTRAINT IF EXISTS "footer_rels_blog_fk";

  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'posts'::text;
  DROP TYPE "public"."enum_pages_blocks_archive_relation_to";
  CREATE TYPE "public"."enum_pages_blocks_archive_relation_to" AS ENUM('posts');
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'posts'::"public"."enum_pages_blocks_archive_relation_to";
  ALTER TABLE "pages_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE "public"."enum_pages_blocks_archive_relation_to" USING "relation_to"::"public"."enum_pages_blocks_archive_relation_to";
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'posts'::text;
  DROP TYPE "public"."enum__pages_v_blocks_archive_relation_to";
  CREATE TYPE "public"."enum__pages_v_blocks_archive_relation_to" AS ENUM('posts');
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DEFAULT 'posts'::"public"."enum__pages_v_blocks_archive_relation_to";
  ALTER TABLE "_pages_v_blocks_archive" ALTER COLUMN "relation_to" SET DATA TYPE "public"."enum__pages_v_blocks_archive_relation_to" USING "relation_to"::"public"."enum__pages_v_blocks_archive_relation_to";
  DROP INDEX "pages_rels_blog_id_idx";
  DROP INDEX "_pages_v_rels_blog_id_idx";
  DROP INDEX "redirects_rels_blog_id_idx";
  DROP INDEX "search_rels_blog_id_idx";
  DROP INDEX "payload_locked_documents_rels_blog_id_idx";
  DROP INDEX "header_rels_blog_id_idx";
  DROP INDEX "footer_rels_blog_id_idx";
  ALTER TABLE "pages_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "redirects_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "search_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "footer_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "posts_populated_authors" ADD CONSTRAINT "posts_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_populated_authors" ADD CONSTRAINT "_posts_v_version_populated_authors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_populated_authors_order_idx" ON "posts_populated_authors" USING btree ("_order");
  CREATE INDEX "posts_populated_authors_parent_id_idx" ON "posts_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "posts_hero_image_idx" ON "posts" USING btree ("hero_image_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_posts_id_idx" ON "posts_rels" USING btree ("posts_id");
  CREATE INDEX "posts_rels_categories_id_idx" ON "posts_rels" USING btree ("categories_id");
  CREATE INDEX "posts_rels_users_id_idx" ON "posts_rels" USING btree ("users_id");
  CREATE INDEX "_posts_v_version_populated_authors_order_idx" ON "_posts_v_version_populated_authors" USING btree ("_order");
  CREATE INDEX "_posts_v_version_populated_authors_parent_id_idx" ON "_posts_v_version_populated_authors" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_hero_image_idx" ON "_posts_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_posts_id_idx" ON "_posts_v_rels" USING btree ("posts_id");
  CREATE INDEX "_posts_v_rels_categories_id_idx" ON "_posts_v_rels" USING btree ("categories_id");
  CREATE INDEX "_posts_v_rels_users_id_idx" ON "_posts_v_rels" USING btree ("users_id");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_posts_id_idx" ON "pages_rels" USING btree ("posts_id");
  CREATE INDEX "_pages_v_rels_posts_id_idx" ON "_pages_v_rels" USING btree ("posts_id");
  CREATE INDEX "redirects_rels_posts_id_idx" ON "redirects_rels" USING btree ("posts_id");
  CREATE INDEX "search_rels_posts_id_idx" ON "search_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "header_rels_posts_id_idx" ON "header_rels" USING btree ("posts_id");
  CREATE INDEX "footer_rels_posts_id_idx" ON "footer_rels" USING btree ("posts_id");
  ALTER TABLE "pages_rels" DROP COLUMN "blog_id";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "blog_id";
  ALTER TABLE "redirects_rels" DROP COLUMN "blog_id";
  ALTER TABLE "search_rels" DROP COLUMN "blog_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blog_id";
  ALTER TABLE "header_rels" DROP COLUMN "blog_id";
  ALTER TABLE "footer_rels" DROP COLUMN "blog_id";
  DROP TYPE "public"."enum_blog_status";
  DROP TYPE "public"."enum__blog_v_version_status";`)
}
