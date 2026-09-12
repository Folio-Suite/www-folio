import * as migration_20260507_221443_initial from './20260507_221443_initial';
import * as migration_20260911_232810_blog_identity from './20260911_232810_blog_identity';
import * as migration_20260911_233519_media_storage from './20260911_233519_media_storage';
import * as migration_20260912_001346_media_publishing from './20260912_001346_media_publishing';
import * as migration_20260912_001846_public_author_profiles from './20260912_001846_public_author_profiles';
import * as migration_20260912_004942_webmention_queues from './20260912_004942_webmention_queues';

export const migrations = [
  {
    up: migration_20260507_221443_initial.up,
    down: migration_20260507_221443_initial.down,
    name: '20260507_221443_initial',
  },
  {
    up: migration_20260911_232810_blog_identity.up,
    down: migration_20260911_232810_blog_identity.down,
    name: '20260911_232810_blog_identity',
  },
  {
    up: migration_20260911_233519_media_storage.up,
    down: migration_20260911_233519_media_storage.down,
    name: '20260911_233519_media_storage',
  },
  {
    up: migration_20260912_001346_media_publishing.up,
    down: migration_20260912_001346_media_publishing.down,
    name: '20260912_001346_media_publishing',
  },
  {
    up: migration_20260912_001846_public_author_profiles.up,
    down: migration_20260912_001846_public_author_profiles.down,
    name: '20260912_001846_public_author_profiles',
  },
  {
    up: migration_20260912_004942_webmention_queues.up,
    down: migration_20260912_004942_webmention_queues.down,
    name: '20260912_004942_webmention_queues'
  },
];
