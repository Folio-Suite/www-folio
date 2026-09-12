import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_site" AS ENUM('product', 'development');
  CREATE TYPE "public"."enum__pages_v_version_site" AS ENUM('product', 'development');
  CREATE TYPE "public"."enum_redirects_site" AS ENUM('product', 'development');
  CREATE TYPE "public"."enum_header_development_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_footer_development_nav_items_link_type" AS ENUM('reference', 'custom');
  CREATE TABLE "header_development_nav_items" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "link_type" "enum_header_development_nav_items_link_type" DEFAULT 'reference',
    "link_new_tab" boolean,
    "link_url" varchar,
    "link_label" varchar NOT NULL
  );

  CREATE TABLE "footer_development_nav_items" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "link_type" "enum_footer_development_nav_items_link_type" DEFAULT 'reference',
    "link_new_tab" boolean,
    "link_url" varchar,
    "link_label" varchar NOT NULL
  );

  DROP INDEX "pages_slug_idx";
  DROP INDEX "redirects_from_idx";
  ALTER TABLE "pages" ADD COLUMN "site" "enum_pages_site" DEFAULT 'product';
  ALTER TABLE "_pages_v" ADD COLUMN "version_site" "enum__pages_v_version_site" DEFAULT 'product';
  ALTER TABLE "redirects" ADD COLUMN "site" "enum_redirects_site" DEFAULT 'product' NOT NULL;
  ALTER TABLE "header_development_nav_items" ADD CONSTRAINT "header_development_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_development_nav_items" ADD CONSTRAINT "footer_development_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "header_development_nav_items_order_idx" ON "header_development_nav_items" USING btree ("_order");
  CREATE INDEX "header_development_nav_items_parent_id_idx" ON "header_development_nav_items" USING btree ("_parent_id");
  CREATE INDEX "footer_development_nav_items_order_idx" ON "footer_development_nav_items" USING btree ("_order");
  CREATE INDEX "footer_development_nav_items_parent_id_idx" ON "footer_development_nav_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_slug_idx" ON "pages" USING btree ("site","slug");
  CREATE INDEX "version_site_version_slug_idx" ON "_pages_v" USING btree ("version_site","version_slug");
  CREATE UNIQUE INDEX "site_from_idx" ON "redirects" USING btree ("site","from");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "header_development_nav_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_development_nav_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "header_development_nav_items" CASCADE;
  DROP TABLE "footer_development_nav_items" CASCADE;
  DROP INDEX "site_slug_idx";
  DROP INDEX "version_site_version_slug_idx";
  DROP INDEX "site_from_idx";
  DROP INDEX "pages_slug_idx";
  DROP INDEX "redirects_from_idx";
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  ALTER TABLE "pages" DROP COLUMN "site";
  ALTER TABLE "_pages_v" DROP COLUMN "version_site";
  ALTER TABLE "redirects" DROP COLUMN "site";
  DROP TYPE "public"."enum_pages_site";
  DROP TYPE "public"."enum__pages_v_version_site";
  DROP TYPE "public"."enum_redirects_site";
  DROP TYPE "public"."enum_header_development_nav_items_link_type";
  DROP TYPE "public"."enum_footer_development_nav_items_link_type";`)
}
