# Configuração da Comunidade - SNX DieselLab

## Status Atual

A funcionalidade de comunidade foi **refatorada** para integração completa com o Supabase. Anteriormente, os posts eram armazenados apenas em `localStorage` (no navegador do usuário). Agora, a comunidade está conectada ao banco de dados.

## O que foi feito

### 1. **Novo Serviço de Comunidade** (`CommunityService`)
Adicionado em `snx_integration.js` com as seguintes funcionalidades:

- **`getPosts()`** - Busca todos os posts da comunidade ordenados por data (mais recentes primeiro)
- **`createPost({ titulo, corpo, tags })`** - Cria um novo post autenticado
- **`upvotePost(postId)`** - Incrementa o contador de upvotes de um post

### 2. **Integração Frontend** (`painel.html`)
O painel foi atualizado para:

- Usar o `CommunityService` em vez de apenas `localStorage`
- Incluir fallback para `localStorage` caso o Supabase não esteja disponível
- Exibir o nome completo do autor (do perfil) em vez de um username genérico
- Sincronizar posts em tempo real

## Pré-requisitos

Para que a comunidade funcione completamente, você precisa:

1. ✅ **Schema do Supabase configurado** - Execute `supabase_schema.sql` no seu projeto
2. ✅ **RLS (Row Level Security) ativado** - Já está no schema
3. ✅ **Autenticação funcionando** - Usuários precisam estar logados para criar posts

## Como Testar

### Localmente

1. Configure o `config.js` com suas credenciais do Supabase
2. Acesse `http://localhost:8000/painel`
3. Faça login com uma conta
4. Navegue até a aba **Comunidade**
5. Clique em **+ Novo Post**
6. Preencha título, descrição e tags (separadas por vírgula)
7. Clique em **Publicar**

### Na Vercel

1. Após o deploy, acesse seu site
2. Faça login
3. Teste a funcionalidade de comunidade

## Estrutura de Dados

### Tabela `community_posts`

```sql
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id),
  titulo TEXT NOT NULL,
  corpo TEXT,
  tipo TEXT DEFAULT 'texto',
  arquivo_url TEXT,
  transcricao TEXT,
  upvotes INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único do post |
| `author_id` | UUID | ID do usuário que criou o post |
| `titulo` | TEXT | Título do post (obrigatório) |
| `corpo` | TEXT | Conteúdo do post |
| `tipo` | TEXT | Tipo de conteúdo (texto, áudio, foto, pdf) |
| `arquivo_url` | TEXT | URL do arquivo (se aplicável) |
| `transcricao` | TEXT | Transcrição de áudio (futuro) |
| `upvotes` | INTEGER | Número de upvotes |
| `tags` | TEXT[] | Array de tags |
| `created_at` | TIMESTAMPTZ | Data de criação |

## RLS (Row Level Security)

As políticas de segurança estão configuradas assim:

```sql
-- Leitura pública
CREATE POLICY "comm_read" ON public.community_posts FOR SELECT USING (true);

-- Escrita apenas para usuários autenticados
CREATE POLICY "comm_write" ON public.community_posts FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

-- Edição apenas pelo autor
CREATE POLICY "comm_own" ON public.community_posts FOR UPDATE 
  USING (auth.uid() = author_id);
```

Isso significa:
- ✅ Qualquer pessoa pode **ler** posts
- ✅ Apenas usuários autenticados podem **criar** posts
- ✅ Apenas o autor pode **editar** seu próprio post

## Funcionalidades Futuras

### Curto Prazo
- [ ] Editar e deletar posts próprios
- [ ] Responder a posts (comentários)
- [ ] Buscar posts por tag
- [ ] Filtrar posts por data/popularidade

### Médio Prazo
- [ ] Upload de fotos/PDFs em posts
- [ ] Transcrição de áudio
- [ ] Notificações quando alguém responde seu post
- [ ] Perfil de usuário com histórico de posts

### Longo Prazo
- [ ] Moderação de conteúdo
- [ ] Badges/Reputação de usuários
- [ ] Recomendações de posts
- [ ] Integração com WhatsApp/Telegram

## Troubleshooting

### Posts não aparecem
1. Verifique se o Supabase está configurado corretamente
2. Verifique se o schema foi executado
3. Verifique o console do navegador para erros
4. Tente fazer logout e login novamente

### Erro ao publicar post
1. Verifique se você está autenticado
2. Verifique se o título está preenchido
3. Verifique as permissões RLS no Supabase
4. Verifique os logs do Supabase

### Upvotes não funcionam
1. Verifique se o ID do post está correto
2. Verifique se há race conditions (múltiplos upvotes simultâneos)
3. Considere usar uma função RPC para incremento atômico

## Notas Importantes

- **Fallback localStorage**: Se o Supabase não estiver disponível, os posts são salvos localmente
- **Race conditions**: O sistema atual de upvotes é suscetível a race conditions. Para produção, considere usar uma função RPC
- **Moderação**: Não há moderação automática. Implemente validação de conteúdo conforme necessário

## Contato

Para dúvidas ou problemas, abra uma issue no GitHub.
