import { pool } from './db.js';

// Reset alerts back to active status
await pool.query(`
  UPDATE alerts 
  SET status = 'active', triggered_at = NULL 
  WHERE user_id = 'test-quinton'
`);

console.log('✅ Alerts reset to active status\n');

await pool.end();

