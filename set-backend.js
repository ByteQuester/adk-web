/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const path = './src/assets/config/runtime-config.json';

const backendUrl = process.env.npm_config_backend;
const supabaseUrl = process.env.npm_config_supabase_url || '';
const supabaseAnonKey = process.env.npm_config_supabase_anon_key || '';

if (!backendUrl) {
    console.error('Missing --backend argument');
    console.error('Usage: npm run serve --backend=http://localhost:8000');
    process.exit(1);
}

const config = {
    backendUrl,
    supabaseUrl,
    supabaseAnonKey,
};

fs.writeFileSync(path, JSON.stringify(config, null, 2));

console.log(`Backend URL injected: ${backendUrl}`);
if (supabaseUrl) console.log(`Supabase URL injected: ${supabaseUrl}`);
if (supabaseAnonKey) console.log(`Supabase anon key injected: [set]`);
