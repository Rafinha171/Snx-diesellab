#!/usr/bin/env node

/**
 * Script de configuração local para SNX DieselLab
 * Copia config.example.js para config.js e permite edição das variáveis
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function setup() {
  console.log('\n🔧 SNX DieselLab - Configuração Local\n');

  const configPath = path.join(__dirname, 'config.js');
  const examplePath = path.join(__dirname, 'config.example.js');

  // Verificar se config.js já existe
  if (fs.existsSync(configPath)) {
    const overwrite = await question(
      'config.js já existe. Deseja sobrescrever? (s/n): '
    );
    if (overwrite.toLowerCase() !== 's') {
      console.log('Operação cancelada.');
      rl.close();
      return;
    }
  }

  console.log('\nPreencha as seguintes informações:\n');

  const supabaseUrl = await question('Supabase URL: ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');
  const googleAiApiKey = await question('Google AI API Key: ');

  const config = `export const SNX_CONFIG = {
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
  googleAI: {
    apiKey: '${googleAiApiKey}',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  },
};
`;

  fs.writeFileSync(configPath, config);
  console.log('\n✅ config.js criado com sucesso!');
  console.log('⚠️  Certifique-se de adicionar config.js ao .gitignore\n');

  rl.close();
}

setup().catch(console.error);
