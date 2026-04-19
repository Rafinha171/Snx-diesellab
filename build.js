const fs = require('fs');

const required = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
};

const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error('\n❌ Variáveis de ambiente obrigatórias não definidas:');
  missing.forEach(k => console.error(`   - ${k}`));
  console.error('\nAdicione-as em: Vercel → Settings → Environment Variables\n');
  process.exit(1);
}

const config = `export const SNX_CONFIG = {
  supabase: {
    url: ${JSON.stringify(required.SUPABASE_URL)},
    anonKey: ${JSON.stringify(required.SUPABASE_ANON_KEY)},
  },
  googleAI: {
    apiKey: ${JSON.stringify(required.GOOGLE_AI_API_KEY)},
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
  },
};
`;

fs.writeFileSync('config.js', config);
console.log('✅ config.js gerado com sucesso!');
