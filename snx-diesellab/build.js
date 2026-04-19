const fs = require('fs');

const config = `export const SNX_CONFIG = {
  supabase: {
    url: ${JSON.stringify(process.env.SUPABASE_URL || '')},
    anonKey: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')},
  },
  googleAI: {
    apiKey: ${JSON.stringify(process.env.GOOGLE_AI_API_KEY || '')},
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  },
};
`;

fs.writeFileSync('config.js', config);
console.log('config.js gerado com sucesso!');
