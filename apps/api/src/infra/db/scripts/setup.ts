import { closeDatabase, migrateDatabase, seedAppDatabase } from '../database.js';

await migrateDatabase();
await seedAppDatabase();
await closeDatabase();