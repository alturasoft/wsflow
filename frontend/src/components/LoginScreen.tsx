import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Smartphone,
  ChevronRight,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { authService, AuthSession, AuthTenant } from '../services/auth';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Estados de Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de Registro
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // Selector de Tenant
  const [tenantsToSelect, setTenantsToSelect] = useState<AuthTenant[] | null>(null);

  const fillDemo = () => {
    setEmail('admin@segurosaltura.com');
    setPassword('AdminSecure2026!');
    setErrorMessage(null);
  };

  const handleLogin = async (e?: React.FormEvent, selectedTenantId?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authService.login(email, password, selectedTenantId);

      if (response.requiresTenantSelection && response.tenants) {
        setTenantsToSelect(response.tenants);
      } else if (response.token && response.activeTenant) {
        onLoginSuccess({
          token: response.token,
          user: response.user,
          activeTenant: response.activeTenant,
          tenants: response.tenants,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    await handleLogin(undefined, tenantId);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await authService.registerTenant({
        companyName: companyName.trim(),
        companySlug: '',
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword: adminPassword,
        phoneNumber: whatsappPhone.trim() || undefined,
      });

      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar el nuevo cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#070b14',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Luces ambientales difusas */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.12)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'rgba(14, 165, 233, 0.1)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenedor Central */}
      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Logo y Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37, 211, 102, 0.35)',
              marginBottom: '14px',
            }}
          >
            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff' }}>W</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
              WSFlow Studio
            </h1>
            <span
              style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(37, 211, 102, 0.15)',
                color: '#25d366',
                border: '1px solid rgba(37, 211, 102, 0.35)',
                borderRadius: '20px',
                padding: '2px 8px',
              }}
            >
              Multi-Tenant
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', margin: '6px 0 0' }}>
            Orquestación visual de agentes y flujos inteligentes para WhatsApp
          </p>
        </div>

        {/* Tarjeta Principal */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Mensaje de Error */}
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VISTA A: Selector de Tenants */}
          {tenantsToSelect ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Selecciona tu Empresa
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', margin: '4px 0 0' }}>
                  Tu cuenta tiene permisos en los siguientes inquilinos:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginBottom: '18px' }}>
                {tenantsToSelect.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTenant(t.id)}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10b981',
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>
                          {t.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {t.slug} • Rol: <span style={{ color: '#cbd5e1' }}>{t.role}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748b" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setTenantsToSelect(null)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                ← Volver al login
              </button>
            </div>
          ) : (
            /* VISTA B: Tabs Login / Nuevo Inquilino */
            <div>
              {/* Barra de Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  marginBottom: '22px',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setErrorMessage(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    background: activeTab === 'LOGIN' ? '#10b981' : 'transparent',
                    color: activeTab === 'LOGIN' ? '#04170e' : '#94a3b8',
                    boxShadow: activeTab === 'LOGIN' ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  <Lock size={13} />
                  <span>Iniciar Sesión</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('REGISTER');
                    setErrorMessage(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    background: activeTab === 'REGISTER' ? '#10b981' : 'transparent',
                    color: activeTab === 'REGISTER' ? '#04170e' : '#94a3b8',
                    boxShadow: activeTab === 'REGISTER' ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                  }}
                >
                  <Building2 size={13} />
                  <span>Nuevo Inquilino</span>
                </button>
              </div>

              {activeTab === 'LOGIN' ? (
                /* FORMULARIO DE INICIO DE SESIÓN */
                <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Correo Corporativo
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={15}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@empresa.com"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          padding: '10px 14px 10px 36px',
                          fontSize: '0.825rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={15}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          padding: '10px 38px 10px 36px',
                          fontSize: '0.825rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      marginTop: '6px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px 18px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: isLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{isLoading ? 'Iniciando sesión...' : 'Ingresar al Workspace'}</span>
                    {!isLoading && <ArrowRight size={14} />}
                  </button>

                  {/* Acceso Rápido Demo */}
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      type="button"
                      onClick={fillDemo}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#cbd5e1',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
                    >
                      <Sparkles size={13} color="#10b981" />
                      <span>Ingresar con Inquilino Demo (Seguros Altura)</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* FORMULARIO DE REGISTRO SIMPLIFICADO */
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                      Nombre de la Empresa o Marca <span style={{ color: '#10b981' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Building2
                        size={15}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Ej. Clínica San Lucas, Banco Sol..."
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          padding: '9px 12px 9px 36px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                        Tu Nombre <span style={{ color: '#10b981' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <User
                          size={15}
                          color="#64748b"
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            color: '#f8fafc',
                            padding: '9px 10px 9px 32px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                        WhatsApp (Opcional)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Smartphone
                          size={15}
                          color="#64748b"
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                        />
                        <input
                          type="text"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value)}
                          placeholder="+591 70000000"
                          style={{
                            width: '100%',
                            background: '#1e293b',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            color: '#f8fafc',
                            padding: '9px 10px 9px 32px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                      Correo del Administrador <span style={{ color: '#10b981' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={15}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@empresa.com"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          padding: '9px 12px 9px 36px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                      Contraseña de Acceso <span style={{ color: '#10b981' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={15}
                        color="#64748b"
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          padding: '9px 12px 9px 36px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      marginTop: '6px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px 18px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: isLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <span>{isLoading ? 'Registrando...' : 'Crear Inquilino y Entrar'}</span>
                    {!isLoading && <CheckCircle2 size={15} />}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer de Seguridad */}
        <div
          style={{
            marginTop: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '0.725rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Aislamiento Criptográfico</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#06b6d4" />
            <span>Motor Asíncrono DAG</span>
          </div>
        </div>
      </div>
    </div>
  );
};
