-- ═══════════════════════════════════════════════════════
-- SNX DIESELLAB — SCHEMA COMPLETO
-- Executar no Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector; -- para RAG futuro

-- ── WORKSHOPS ──────────────────────────────────────────
CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROFILES ───────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'tecnico',
  workshop_id UUID REFERENCES public.workshops(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── VEHICLES (entidade central — tudo gira em torno da placa) ──
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT UNIQUE NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  motor TEXT,
  km_atual INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SERVICE ORDERS ─────────────────────────────────────
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  tecnico_id UUID REFERENCES public.profiles(id),
  workshop_id UUID REFERENCES public.workshops(id),
  queixa TEXT NOT NULL,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta','diagnostico','aguardando','concluida')),
  observacoes TEXT,
  km_entrada INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  concluded_at TIMESTAMPTZ
);

-- ── OS PHOTOS (antes/durante/depois) ───────────────────
CREATE TABLE public.os_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT DEFAULT 'antes' CHECK (tipo IN ('antes','durante','depois')),
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DIAGNOSES (IA + árvore de decisão por OS) ──────────
CREATE TABLE public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  sintoma_inicial TEXT,
  arvore_estado JSONB DEFAULT '{}', -- estado atual do fluxo guiado
  historico_chat JSONB DEFAULT '[]', -- [{role, content, timestamp}]
  conclusao TEXT,
  dtc_codes TEXT[] DEFAULT '{}',
  confianca INTEGER, -- 0-100%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DTC CODES ──────────────────────────────────────────
CREATE TABLE public.dtc_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description_pt TEXT,
  causes TEXT,
  category TEXT,
  sistema TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMUNITY POSTS ────────────────────────────────────
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id),
  titulo TEXT NOT NULL,
  corpo TEXT,
  tipo TEXT DEFAULT 'texto' CHECK (tipo IN ('texto','audio','foto','pdf')),
  arquivo_url TEXT,
  transcricao TEXT, -- áudio transcrito para texto (STT futuro)
  upvotes INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DOCUMENTS (base de conhecimento para RAG) ──────────
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('manual','apostila','dtc','tecnico')),
  arquivo_url TEXT,
  conteudo_texto TEXT,
  embedding VECTOR(768), -- pgvector para busca semântica
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════
-- TRIGGERS
-- ════════════════════════════════════════════════════════

-- Auto-cria perfil no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-atualiza updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_vehicles_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_os_updated_at BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER set_diag_updated_at BEFORE UPDATE ON public.diagnoses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dtc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Perfil: usuário vê e edita o próprio
CREATE POLICY "perfil_own" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Veículos: qualquer autenticado pode ver e criar
CREATE POLICY "vehicles_auth" ON public.vehicles FOR ALL USING (auth.role() = 'authenticated');

-- OS: técnico vê as próprias
CREATE POLICY "os_own" ON public.service_orders FOR ALL USING (auth.uid() = tecnico_id);

-- Fotos de OS
CREATE POLICY "photos_via_os" ON public.os_photos FOR ALL
  USING (os_id IN (SELECT id FROM public.service_orders WHERE tecnico_id = auth.uid()));

-- Diagnósticos
CREATE POLICY "diag_via_os" ON public.diagnoses FOR ALL
  USING (os_id IN (SELECT id FROM public.service_orders WHERE tecnico_id = auth.uid()));

-- DTC: leitura pública
CREATE POLICY "dtc_public" ON public.dtc_codes FOR SELECT USING (true);

-- Comunidade: leitura pública, escrita autenticada
CREATE POLICY "comm_read" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "comm_write" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comm_own" ON public.community_posts FOR UPDATE USING (auth.uid() = author_id);

-- Documentos: leitura para autenticados
CREATE POLICY "docs_auth" ON public.documents FOR SELECT USING (auth.role() = 'authenticated');
