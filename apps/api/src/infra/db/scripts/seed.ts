import { closeDatabase, seedAppDatabase } from '../database.js';

await seedAppDatabase();
await closeDatabase();