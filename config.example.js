/**

- CONFIG DE EXEMPLO
- Copie este arquivo como "config.js" e coloque suas credenciais reais
- O config.js NÃO deve ser versionado no Git
- Endpoint: v1 (estável) com modelo gemini-2.5-flash (recomendado para produção)
  */

export const SNX_CONFIG = {
  supabase: {
    url: 'COLE_AQUI_SUA_SUPABASE_URL',
    anonKey: 'COLE_AQUI_SUA_SUPABASE_ANON_KEY',
  },
  googleAI: {
    apiKey: 'COLE_AQUI_SUA_GOOGLE_AI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
  },
};
