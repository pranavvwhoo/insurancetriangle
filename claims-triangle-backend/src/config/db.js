const { createClient } = require('@supabase/supabase-js');
const key = process.env.SUPABASE_SERVICE_KEY;
const url = process.env.SUPABASE_URL;

if (!url || !key) {
  // Fail-fast so we get a clear error instead of 500s downstream
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
}

const supabase = createClient(
  url,
  key
);
module.exports = supabase;
