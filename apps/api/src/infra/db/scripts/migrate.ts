import { closeDatabase, migrateDatabase } from '../database.js';

await migrateDatabase();
await closeDatabase();