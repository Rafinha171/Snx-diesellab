/**
 * SNX DieselLab — Integração Supabase Auth + Google AI (Gemini)
 * VERSÃO SEGURA - chaves vêm de config.js
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SNX_CONFIG } from './config.js';

export const supabase = createClient(
  SNX_CONFIG.supabase.url,
  SNX_CONFIG.supabase.anonKey
);

export const Auth = {
  async register({ fullName, email, password, workshopName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/painel`,
      },
    });
    if (error) throw error;

    // Criar workshop e associar ao usuário
    if (data.user && workshopName) {
      try {
        const { data: workshopData, error: workshopError } = await supabase
          .from('workshops')
          .insert({ name: workshopName, owner_id: data.user.id })
          .select()
          .single();

        if (workshopError) throw workshopError;

        // Atualizar perfil do usuário com o workshop_id
        if (workshopData) {
          await supabase
            .from('profiles')
            .update({ workshop_id: workshopData.id })
            .eq('id', data.user.id);
        }
      } catch (e) {
        console.warn('Erro ao criar workshop:', e);
      }
    }
    return data;
  },

  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { id: 'dev', full_name: 'Desenvolvedor', role: 'ADMIN' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*, workshops(*)')
      .eq('id', user.id)
      .single();

    if (error) return { id: user.id, full_name: user.email };
    return data;
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) =>
      callback(event, session)
    );
  },

  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      // DEV MODE — auth desativado temporariamente
      return { user: { id: 'dev', email: 'dev@local' } };
    }
    return session;
  },
};

export const DiagnosisService = {
  async callGemini(prompt, systemPrompt = '') {
    try {
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const response = await fetch(
        `${SNX_CONFIG.googleAI.endpoint}?key=${SNX_CONFIG.googleAI.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error: ${response.status} - ${
            errorData.error?.message || 'Unknown error'
          }`
        );
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.error('Erro ao chamar Gemini:', error);
      throw error;
    }
  },

  async freeChat({ message }) {
    try {
      const aiResponse = await this.callGemini(
        message,
        'Você é um especialista em sistemas diesel. Responda de forma técnica e útil para mecânicos.'
      );
      return { message: aiResponse };
    } catch (error) {
      console.error('Erro no chat:', error);
      throw error;
    }
  },
};

export const DTCService = {
  async search(query) {
    try {
      const { data, error } = await supabase
        .from('dtc_codes')
        .select('*')
        .or(`code.ilike.%${query}%,description_pt.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar DTC codes:', error);
      return [];
    }
  },
};

export function initLandingAuth() {
  Auth.onAuthChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showSuccess('Login realizado! Redirecionando…');
      setTimeout(() => {
        window.location.href = '/painel';
      }, 1200);
    }
  });

  const loginForm = document.getElementById('content-login');
  if (loginForm) {
    loginForm.querySelector('.fs')?.addEventListener('click', async () => {
      const email = loginForm.querySelector('#l-email')?.value?.trim();
      const password = loginForm.querySelector('#l-pass')?.value;
      if (!email || !password) {
        showError('Preencha e-mail e senha.');
        return;
      }
      const btn = loginForm.querySelector('.fs');
      btn.textContent = 'Entrando…';
      btn.disabled = true;
      try {
        await Auth.login({ email, password });
      } catch (err) {
        showError(getAuthErrorMessage(err));
        btn.textContent = 'Entrar na Plataforma';
        btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('content-register');
  if (registerForm) {
    registerForm.querySelector('.fs')?.addEventListener('click', async () => {
      const fullName = registerForm
        .querySelector('#r-name')
        ?.value?.trim();
      const email = registerForm.querySelector('#r-email')?.value?.trim();
      const workshopName = registerForm
        .querySelector('#r-shop')
        ?.value?.trim();
      const password = registerForm.querySelector('#r-pass')?.value;
      if (!fullName || !email || !password) {
        showError('Preencha todos os campos.');
        return;
      }
      if (password.length < 8) {
        showError('Senha deve ter pelo menos 8 caracteres.');
        return;
      }
      const btn = registerForm.querySelector('.fs');
      btn.textContent = 'Criando conta…';
      btn.disabled = true;
      try {
        await Auth.register({
          fullName,
          email,
          password,
          workshopName,
        });
        showSuccess('Conta criada! Redirecionando…');
        setTimeout(() => {
          window.location.href = '/painel';
        }, 1500);
      } catch (err) {
        showError(getAuthErrorMessage(err));
        btn.textContent = 'Criar Conta Gratuita';
        btn.disabled = false;
      }
    });
  }
}

export async function initPanel() {
  const session = await Auth.requireAuth();
  if (!session) return;
  const profile = await Auth.getProfile();
  if (profile) {
    const nameStr = profile.full_name || 'Usuário';
    const initials = nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    document.querySelectorAll('.avatar').forEach((el) => {
      el.textContent = initials;
    });
    const sfName = document.querySelector('.sf-name');
    if (sfName) sfName.textContent = nameStr;
    const sfRole = document.querySelector('.sf-role');
    if (sfRole) sfRole.textContent = (profile.role || 'TÉCNICO').toUpperCase();
  }
}

function showError(msg) {
  const el = createToast('error');
  el.textContent = '⚠ ' + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function showSuccess(msg) {
  const el = createToast('success');
  el.textContent = '✓ ' + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function createToast(type) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%); background:${
    type === 'error' ? '#7a0f0a' : '#14532d'
  }; color:#fff;padding:12px 24px;border-radius:3px; font-family:sans-serif;font-size:14px;font-weight:500; z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.4);`;
  return el;
}

function getAuthErrorMessage(err) {
  const msg = err?.message || '';
  if (msg.includes('Invalid login')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))
    return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('already registered'))
    return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should'))
    return 'Senha deve ter pelo menos 8 caracteres.';
  return 'Erro inesperado. Tente novamente.';
}
