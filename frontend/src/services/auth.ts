import { API_BASE } from '../config';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  role: string;
  whatsappAccounts?: Array<{
    id: string;
    name: string;
    displayPhoneNumber: string;
    phoneNumberId: string;
    isActive: boolean;
    defaultFlowId?: string | null;
  }>;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  activeTenant: AuthTenant;
  tenants: AuthTenant[];
}

export interface LoginResponse {
  requiresTenantSelection?: boolean;
  token?: string;
  user: AuthUser;
  activeTenant?: AuthTenant;
  tenants: AuthTenant[];
}

const TOKEN_KEY = 'wsflow_auth_token';
const SESSION_KEY = 'wsflow_auth_session';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(session: AuthSession) {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
  },

  async login(email: string, password: string, tenantId?: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }

    const data: LoginResponse = await res.json();
    if (data.token && data.activeTenant) {
      this.setSession({
        token: data.token,
        user: data.user,
        activeTenant: data.activeTenant,
        tenants: data.tenants,
      });
    }
    return data;
  },

  async switchTenant(tenantId: string): Promise<AuthSession> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/auth/switch-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tenantId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al cambiar de empresa');
    }

    const data: AuthSession = await res.json();
    this.setSession(data);
    return data;
  },

  async getMe(): Promise<AuthSession | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        this.clearSession();
        return null;
      }

      const data = await res.json();
      const currentSession = this.getSession();
      const updatedSession: AuthSession = {
        token,
        user: data.user,
        activeTenant: data.activeTenant || currentSession?.activeTenant,
        tenants: data.tenants || [],
      };
      this.setSession(updatedSession);
      return updatedSession;
    } catch {
      return this.getSession();
    }
  },

  async registerTenant(data: {
    companyName: string;
    companySlug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    phoneNumber?: string;
    phoneNumberId?: string;
  }): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/register-tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al registrar nueva empresa');
    }

    const authData: AuthSession = await res.json();
    if (authData.token && authData.activeTenant) {
      this.setSession(authData);
    }
    return authData;
  },

  /**
   * Helper fetch para enviar el JWT automáticamente
   */
  async authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(init?.headers || {});

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    if (response.status === 401) {
      this.clearSession();
      window.location.reload();
    }

    return response;
  },
};

