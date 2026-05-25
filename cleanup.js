const db = require('./db');

db.prepare(`
  DELETE FROM competitor_requests
  WHERE id NOT IN (
    SELECT MIN(id) FROM competitor_requests
    GROUP BY from_user, to_user
  )
`).run();

console.log('Cleaned up duplicate rows');