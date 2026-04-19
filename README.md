# SNX DieselLab — Diagnóstico Inteligente Diesel

**SNX DieselLab** é uma plataforma web para diagnóstico inteligente de sistemas de injeção eletrônica diesel. Combina **IA conversacional** (Google Gemini), **fluxo guiado** e **base de conhecimento técnico** para mecânicos e técnicos especializados.

## 🎯 Funcionalidades

- **Autenticação Segura:** Integração com Supabase Auth
- **Chat com IA:** Diagnóstico assistido por Gemini
- **Gerenciamento de Ordens de Serviço (OS):** Rastreamento completo de manutenções
- **Base de Códigos DTC:** Busca rápida de códigos de diagnóstico
- **Comunidade Técnica:** Fórum para compartilhar conhecimento
- **Painel Administrativo:** Dashboard com KPIs e estatísticas

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- API Key do [Google AI (Gemini)](https://ai.google.dev)

## 🚀 Setup Local

### 1. Clonar o repositório

```bash
git clone https://github.com/Rafinha171/Snx-diesellab.git
cd Snx-diesellab
```

### 2. Configurar variáveis de ambiente

Execute o script de setup:

```bash
node setup-local.js
```

Ou crie manualmente um arquivo `config.js` baseado em `config.example.js`:

```bash
cp config.example.js config.js
```

Edite `config.js` com suas credenciais:

```javascript
export const SNX_CONFIG = {
  supabase: {
    url: 'https://seu-projeto.supabase.co',
    anonKey: 'sua-anon-key',
  },
  googleAI: {
    apiKey: 'sua-google-ai-key',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  },
};
```

### 3. Configurar banco de dados Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Crie um novo projeto
3. Vá para **SQL Editor** e execute o script `supabase_schema.sql`
4. Copie a **URL** e **Anon Key** para o arquivo `config.js`

### 4. Servir localmente

Use um servidor HTTP local (recomendado):

```bash
# Com Python 3
python3 -m http.server 8000

# Com Node.js (http-server)
npx http-server -p 8000
```

Acesse `http://localhost:8000` no navegador.

## 🔧 Estrutura do Projeto

```
├── index.html              # Landing page
├── painel.html             # Dashboard principal
├── snx_integration.js      # Integração Supabase + Gemini
├── config.example.js       # Template de configuração
├── config.js               # Configuração (não versionado)
├── build.js                # Script de build para Vercel
├── supabase_schema.sql     # Schema do banco de dados
├── setup-local.js          # Script de configuração local
└── README.md               # Este arquivo
```

## 🚀 Deploy na Vercel

### 1. Fazer push para GitHub

```bash
git add .
git commit -m "Deploy SNX DieselLab"
git push origin main
```

### 2. Conectar Vercel

1. Acesse [Vercel](https://vercel.com)
2. Clique em **New Project**
3. Selecione o repositório `Snx-diesellab`
4. Configure as **Environment Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GOOGLE_AI_API_KEY`
5. Clique em **Deploy**

## 🔐 Segurança

- **config.js** está no `.gitignore` e nunca deve ser versionado
- Variáveis de ambiente são injetadas no build (Vercel)
- Chaves de API são protegidas no lado do servidor (build.js)
- RLS (Row Level Security) ativado no Supabase

## 📚 Documentação da API

### Auth

```javascript
import { Auth } from './snx_integration.js';

// Registrar
await Auth.register({
  fullName: 'João Silva',
  email: 'joao@oficina.com',
  password: 'senha123',
  workshopName: 'Diesel Tech',
});

// Login
await Auth.login({
  email: 'joao@oficina.com',
  password: 'senha123',
});

// Logout
await Auth.logout();

// Obter sessão
const session = await Auth.getSession();

// Obter perfil
const profile = await Auth.getProfile();
```

### Diagnóstico com IA

```javascript
import { DiagnosisService } from './snx_integration.js';

// Chat com IA
const response = await DiagnosisService.freeChat({
  message: 'Qual é o problema com pressão de rail baixa?',
});
console.log(response.message);
```

### Busca de DTC Codes

```javascript
import { DTCService } from './snx_integration.js';

// Buscar códigos
const codes = await DTCService.search('P0087');
```

## 🐛 Correções Recentes

### v1.1.0 (2025-04-19)

- ✅ Corrigidas aspas tipográficas em todos os arquivos
- ✅ Melhorado fluxo de registro com associação de workshop
- ✅ Adicionado tratamento de erros na API Gemini
- ✅ Criado script de setup local (`setup-local.js`)
- ✅ Expandido `.gitignore` com padrões comuns
- ✅ Refatorado `snx_integration.js` com melhor estrutura

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou problemas, abra uma [issue](https://github.com/Rafinha171/Snx-diesellab/issues) no GitHub.

---

**Desenvolvido com ❤️ para mecânicos e técnicos diesel**
