const { createClient } = require('@supabase/supabase-js');

// If env vars aren't present, attempt to load them from the project's
// top-level .env file. Use an explicit path so running Node from `src`
// still resolves the correct file (dotenv resolves relative to process.cwd()).
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  try {
    const path = require('path');
    require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
  } catch (e) {
    // ignore - dotenv is optional if environment is supplied another way
  }
}

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
