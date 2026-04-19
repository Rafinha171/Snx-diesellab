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
      NotificationSystem.success('Login realizado! Redirecionando…', 1200);
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

      // Validação
      const validation = Validators.validateLogin({ email, password });
      if (!validation.isValid) {
        NotificationSystem.error(validation.errors[0]);
        return;
      }

      const btn = loginForm.querySelector('.fs');
      btn.textContent = 'Entrando…';
      btn.disabled = true;
      try {
        await Auth.login({ email, password });
      } catch (err) {
        NotificationSystem.error(getAuthErrorMessage(err));
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

      // Validação robusta
      const validation = Validators.validateRegister({
        fullName,
        email,
        password,
        workshopName,
      });
      if (!validation.isValid) {
        NotificationSystem.error(validation.errors[0]);
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
        NotificationSystem.success('Conta criada! Redirecionando…', 1500);
        setTimeout(() => {
          window.location.href = '/painel';
        }, 1500);
      } catch (err) {
        NotificationSystem.error(getAuthErrorMessage(err));
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

// Funções legadas mantidas para compatibilidade
function showError(msg) {
  NotificationSystem.error(msg);
}

function showSuccess(msg) {
  NotificationSystem.success(msg);
}

function createToast(type) {
  // Mantido para compatibilidade, mas NotificationSystem é preferido
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

export const CommunityService = {
  async getPosts() {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar posts da comunidade:', error);
      return [];
    }
  },

  async createPost({ titulo, corpo, tags }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          titulo,
          corpo,
          tags,
          author_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      throw error;
    }
  },

  async upvotePost(postId) {
    try {
      // Nota: No Supabase, idealmente usaríamos uma função RPC para incrementar
      // Para simplificar, faremos um update direto (sujeito a race conditions)
      const { data: post, error: fetchError } = await supabase
        .from('community_posts')
        .select('upvotes')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('community_posts')
        .update({ upvotes: (post.upvotes || 0) + 1 })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao dar upvote:', error);
      throw error;
    }
  }
};

/**
 * ═══════════════════════════════════════════════════════════
 * VALIDAÇÕES E UTILITÁRIOS
 * ═══════════════════════════════════════════════════════════
 */

export const Validators = {
  /**
   * Valida formato de email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },

  /**
   * Valida força da senha
   * Requer: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número
   */
  isStrongPassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const isLongEnough = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
  },

  /**
   * Valida nome (mínimo 3 caracteres, sem números)
   */
  isValidName(name) {
    const nameRegex = /^[a-záàâãéèêíïóôõöúçñ\s'-]{3,}$/i;
    return nameRegex.test(name.trim());
  },

  /**
   * Valida nome de oficina/workshop
   */
  isValidWorkshopName(name) {
    return name.trim().length >= 3 && name.trim().length <= 100;
  },

  /**
   * Sanitiza entrada de texto (remove caracteres perigosos)
   */
  sanitizeInput(input) {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .substring(0, 500);
  },

  /**
   * Valida um conjunto completo de dados de registro
   */
  validateRegister(data) {
    const errors = [];

    if (!data.fullName || !this.isValidName(data.fullName)) {
      errors.push('Nome deve ter pelo menos 3 caracteres e conter apenas letras');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Email inválido');
    }

    if (!data.password || !this.isStrongPassword(data.password)) {
      errors.push(
        'Senha deve ter mínimo 8 caracteres, 1 maiúscula, 1 minúscula e 1 número'
      );
    }

    if (data.workshopName && !this.isValidWorkshopName(data.workshopName)) {
      errors.push('Nome da oficina deve ter entre 3 e 100 caracteres');
    }

    return { isValid: errors.length === 0, errors };
  },

  /**
   * Valida um conjunto completo de dados de login
   */
  validateLogin(data) {
    const errors = [];

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push('Email inválido');
    }

    if (!data.password || data.password.length < 8) {
      errors.push('Senha inválida');
    }

    return { isValid: errors.length === 0, errors };
  },
};

/**
 * ═══════════════════════════════════════════════════════════
 * SISTEMA CENTRALIZADO DE ERROS E NOTIFICAÇÕES
 * ═══════════════════════════════════════════════════════════
 */

export const NotificationSystem = {
  queue: [],
  isShowing: false,

  /**
   * Mostra notificação com tipo específico
   */
  show(message, type = 'info', duration = 4000) {
    const notification = { message, type, duration };
    this.queue.push(notification);

    if (!this.isShowing) {
      this._processQueue();
    }
  },

  /**
   * Processa fila de notificações
   */
  _processQueue() {
    if (this.queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const notification = this.queue.shift();
    this._display(notification);
  },

  /**
   * Exibe notificação na tela
   */
  _display({ message, type, duration }) {
    const el = document.createElement('div');
    const bgColor = {
      success: '#14532d',
      error: '#7a0f0a',
      warning: '#92400e',
      info: '#1e3a8a',
    }[type] || '#1e3a8a';

    const icon = {
      success: '✓',
      error: '⚠',
      warning: '⚡',
      info: 'ℹ',
    }[type] || 'ℹ';

    el.style.cssText = `
      position: fixed;
      bottom: calc(24px + var(--sab, 0px));
      left: 50%;
      transform: translateX(-50%);
      background: ${bgColor};
      color: #fff;
      padding: 12px 24px;
      border-radius: 3px;
      font-family: sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease-out;
      max-width: 90vw;
      word-wrap: break-word;
    `;

    el.textContent = `${icon} ${message}`;
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => {
        el.remove();
        this._processQueue();
      }, 300);
    }, duration);
  },

  success(message, duration = 4000) {
    this.show(message, 'success', duration);
  },

  error(message, duration = 5000) {
    this.show(message, 'error', duration);
  },

  warning(message, duration = 4000) {
    this.show(message, 'warning', duration);
  },

  info(message, duration = 4000) {
    this.show(message, 'info', duration);
  },
};

// Adicionar estilos de animação
if (!document.querySelector('style[data-snx-animations]')) {
  const style = document.createElement('style');
  style.setAttribute('data-snx-animations', 'true');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
    @keyframes slideDown {
      from {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      to {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
    }
  `;
  document.head.appendChild(style);
}
