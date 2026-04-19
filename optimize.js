#!/usr/bin/env node

/**
 * Script de Otimização - SNX DieselLab
 * Minifica CSS/JS e prepara assets para lazy loading
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando otimização do projeto SNX DieselLab...\n');

// Função para minificar CSS básico
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários
    .replace(/\s+/g, ' ') // Remove espaços em branco
    .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove espaços ao redor de seletores
    .trim();
}

// Função para minificar JS básico
function minifyJS(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
    .replace(/\/\/.*$/gm, '') // Remove comentários de linha
    .replace(/\s+/g, ' ') // Remove espaços em branco
    .replace(/\s*([{}:;,=()[\]<>!&|?])\s*/g, '$1') // Remove espaços ao redor de operadores
    .trim();
}

// Processar HTML files
const htmlFiles = ['index.html', 'painel.html'];
let totalSavings = 0;

htmlFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalSize = content.length;

  // Minificar CSS inline
  content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (match, css) => {
    const minified = minifyCSS(css);
    return `<style>${minified}</style>`;
  });

  // Minificar JS inline (apenas scripts não-module)
  content = content.replace(/<script(?![\s\S]*?type="module")[^>]*>([\s\S]*?)<\/script>/g, (match, js) => {
    const minified = minifyJS(js);
    return `<script>${minified}</script>`;
  });

  // Remover espaços em branco desnecessários entre tags
  content = content.replace(/>\s+</g, '><');

  const newSize = content.length;
  const savings = originalSize - newSize;
  const savingsPercent = ((savings / originalSize) * 100).toFixed(2);

  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`✅ ${file}`);
  console.log(`   Tamanho original: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`   Tamanho otimizado: ${(newSize / 1024).toFixed(2)} KB`);
  console.log(`   Economia: ${(savings / 1024).toFixed(2)} KB (${savingsPercent}%)\n`);

  totalSavings += savings;
});

// Criar arquivo de configuração de lazy loading
const lazyLoadConfig = {
  images: {
    enabled: true,
    threshold: 0.1,
    rootMargin: '50px',
  },
  scripts: {
    enabled: true,
    defer: true,
  },
  css: {
    enabled: true,
    preload: true,
  },
};

fs.writeFileSync(
  path.join(__dirname, 'lazy-load-config.json'),
  JSON.stringify(lazyLoadConfig, null, 2)
);

console.log('📊 Resumo da Otimização:');
console.log(`   Total economizado: ${(totalSavings / 1024).toFixed(2)} KB`);
console.log(`   Arquivo de config criado: lazy-load-config.json\n`);

console.log('✨ Otimização concluída!');
console.log('💡 Dica: Use um CDN para servir assets estáticos e ative gzip no servidor.\n');
