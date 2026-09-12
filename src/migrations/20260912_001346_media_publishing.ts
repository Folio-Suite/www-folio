import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "media_caption_tracks" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar,
    "language" varchar,
    "url" varchar
  );

  ALTER TABLE "pages_blocks_media_block" ADD COLUMN "decorative" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_media_block" ADD COLUMN "autoplay" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_media_block" ADD COLUMN "loop" boolean DEFAULT false;
  ALTER TABLE "pages_blocks_media_block" ADD COLUMN "muted" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_media_block" ADD COLUMN "decorative" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_media_block" ADD COLUMN "autoplay" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_media_block" ADD COLUMN "loop" boolean DEFAULT false;
  ALTER TABLE "_pages_v_blocks_media_block" ADD COLUMN "muted" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "title" varchar;
  ALTER TABLE "media" ADD COLUMN "description" varchar;
  ALTER TABLE "media" ADD COLUMN "poster_id" integer;
  ALTER TABLE "media_caption_tracks" ADD CONSTRAINT "media_caption_tracks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_caption_tracks_order_idx" ON "media_caption_tracks" USING btree ("_order");
  CREATE INDEX "media_caption_tracks_parent_id_idx" ON "media_caption_tracks" USING btree ("_parent_id");
  ALTER TABLE "media" ADD CONSTRAINT "media_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_poster_idx" ON "media" USING btree ("poster_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_caption_tracks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_caption_tracks" CASCADE;
  ALTER TABLE "media" DROP CONSTRAINT "media_poster_id_media_id_fk";

  DROP INDEX "media_poster_idx";
  ALTER TABLE "pages_blocks_media_block" DROP COLUMN "decorative";
  ALTER TABLE "pages_blocks_media_block" DROP COLUMN "autoplay";
  ALTER TABLE "pages_blocks_media_block" DROP COLUMN "loop";
  ALTER TABLE "pages_blocks_media_block" DROP COLUMN "muted";
  ALTER TABLE "_pages_v_blocks_media_block" DROP COLUMN "decorative";
  ALTER TABLE "_pages_v_blocks_media_block" DROP COLUMN "autoplay";
  ALTER TABLE "_pages_v_blocks_media_block" DROP COLUMN "loop";
  ALTER TABLE "_pages_v_blocks_media_block" DROP COLUMN "muted";
  ALTER TABLE "media" DROP COLUMN "title";
  ALTER TABLE "media" DROP COLUMN "description";
  ALTER TABLE "media" DROP COLUMN "poster_id";`)
}
