import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Search,
  BookOpen,
  ArrowRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import { API_BASE } from '../config';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  tenantName?: string;
}

interface KnowledgeDocument {
  id: string;
  tenantId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  chunkCount: number;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
}

interface QueryResult {
  answer: string;
  sources: Array<{
    documentId: string;
    title: string;
    pageNumber: number;
    score: number;
    content: string;
  }>;
  totalFound: number;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName = 'Seguros Altura',
}) => {
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'TESTER' | 'GUIDE'>('DOCUMENTS');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [engineStatus, setEngineStatus] = useState<any>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RAG Simulator / Tester state
  const [testQuestion, setTestQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchStatusAndDocs = async () => {
    setIsLoading(true);
    try {
      const [statusRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/knowledge/status`).catch(() => null),
        fetch(`${API_BASE}/knowledge/documents${tenantId ? `?tenantId=${tenantId}` : ''}`).catch(() => null),
      ]);

      if (statusRes && statusRes.ok) {
        const sData = await statusRes.json();
        setEngineStatus(sData);
      }

      if (docsRes && docsRes.ok) {
        const dData = await docsRes.json();
        setDocuments(Array.isArray(dData) ? dData : []);
      }
    } catch (e) {
      console.error('Error fetching knowledge data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndDocs();
      setUploadSuccess(null);
      setUploadError(null);
      setQueryResult(null);
    }
  }, [isOpen, tenantId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pdf')) {
        setUploadError('Solo se permiten documentos en formato PDF.');
        return;
      }
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.pdf$/i, ''));
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Por favor selecciona un archivo PDF.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (uploadTitle.trim()) {
      formData.append('title', uploadTitle.trim());
    }
    if (tenantId) {
      formData.append('tenantId', tenantId);
    }

    try {
      const res = await fetch(`${API_BASE}/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al procesar y vectorizar el archivo PDF');
      }

      setUploadSuccess(`¡Documento "${uploadTitle || uploadFile.name}" procesado y vectorizado con éxito!`);
      setUploadFile(null);
      setUploadTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchStatusAndDocs();
    } catch (err: any) {
      setUploadError(err.message || 'Fallo de conexión al cargar PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este documento y purgar todos sus vectores de Qdrant?')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/knowledge/documents/${id}${tenantId ? `?tenantId=${tenantId}` : ''}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        fetchStatusAndDocs();
      }
    } catch (e) {
      console.error('Error eliminando documento', e);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim()) return;

    setIsQuerying(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await fetch(`${API_BASE}/knowledge/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion.trim(),
          tenantId,
          companyName: tenantName,
          limit: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al consultar la base de conocimiento');
      }
      setQueryResult(data);
    } catch (err: any) {
      setQueryError(err.message || 'Error realizando consulta RAG.');
    } finally {
      setIsQuerying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#0d131f',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(168, 85, 247, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.35)',
              }}
            >
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Base de Conocimiento RAG
                </h2>
                <span
                  style={{
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  Qdrant Vector Engine
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Carga archivos PDF corporativos para alimentar la IA conversacional en WhatsApp ({tenantName}).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Engine Status Bar */}
        <div
          style={{
            padding: '8px 24px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: engineStatus?.connected ? '#10b981' : '#f59e0b',
                  boxShadow: engineStatus?.connected ? '0 0 8px #10b981' : 'none',
                }}
              />
              <span style={{ color: engineStatus?.connected ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                {engineStatus?.connected ? 'Qdrant Vector DB: Activo' : 'Qdrant: Conectando...'}
              </span>
            </div>
            {engineStatus?.collection?.points_count !== undefined && (
              <span>
                Vectores Indexados:{' '}
                <strong style={{ color: '#e2e8f0' }}>{engineStatus.collection.points_count}</strong>
              </span>
            )}
            <span>
              Modo:{' '}
              <strong style={{ color: '#c084fc' }}>Memmap en Disco (Zero-RAM Leak)</strong>
            </span>
            {engineStatus?.hasAiKey === false && (
              <span
                title="Configura GEMINI_API_KEY en .env para análisis neuronal y generación con IA"
                style={{
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <AlertCircle size={12} />
                <span>IA: Modo Prueba (Sin API Key)</span>
              </span>
            )}
            {engineStatus?.hasAiKey === true && (
              <span
                style={{
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <Sparkles size={12} />
                <span>IA: {String(engineStatus.aiProvider).toUpperCase()} Activo</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
            <Database size={13} />
            <span>Colección: tenant_knowledge_bases</span>
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 24px 0 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'DOCUMENTS' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'DOCUMENTS' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'DOCUMENTS' ? '#c084fc' : '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <FileText size={16} />
            <span>Documentos Indexados ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TESTER')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'TESTER' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'TESTER' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'TESTER' ? '#c084fc' : '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <Search size={16} />
            <span>Simulador Semántico RAG</span>
          </button>

          <button
            onClick={() => setActiveTab('GUIDE')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'GUIDE' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'GUIDE' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'GUIDE' ? '#c084fc' : '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <HelpCircle size={16} />
            <span>Cómo usar en Flujos</span>
          </button>
        </div>

        {/* Contenido según Tab Activo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* TAB 1: GESTIÓN DOCUMENTAL */}
          {activeTab === 'DOCUMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Formulario de Carga */}
              <form
                onSubmit={handleUploadSubmit}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'border 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 4px 0' }}>
                      Cargar Nuevo Documento PDF
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: 0 }}>
                      Extracción automática de texto embebido, segmentación semántica y vectorización en Qdrant.
                    </p>
                  </div>
                  <UploadCloud size={28} color="#a855f7" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Archivo PDF (.pdf)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                        background: '#151d2f',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                      Título o Referencia (Opcional)
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Ej. Coberturas y Póliza Automotriz 2026"
                      style={{
                        width: '100%',
                        fontSize: '0.825rem',
                        color: '#f8fafc',
                        background: '#151d2f',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    />
                  </div>
                </div>

                {uploadError && (
                  <div
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#f43f5e',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.775rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.775rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: isUploading
                        ? '#64748b'
                        : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: isUploading || !uploadFile ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 12px rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <Sparkles size={16} />
                    <span>{isUploading ? 'Extrayendo y Vectorizando...' : 'Indexar PDF en Qdrant'}</span>
                  </button>
                </div>
              </form>

              {/* Listado de Documentos */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>
                  Documentos Corporativos Activos en la Base de Conocimiento
                </h4>

                {documents.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <BookOpen size={32} color="#64748b" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                      Aún no hay documentos cargados en este tenant.
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      Sube un manual, folleto o política en formato PDF arriba para comenzar.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'border 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <FileText size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                                {doc.title}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  padding: '1px 7px',
                                  borderRadius: '8px',
                                  background:
                                    doc.status === 'INDEXED'
                                      ? 'rgba(16, 185, 129, 0.2)'
                                      : doc.status === 'FAILED'
                                      ? 'rgba(244, 63, 94, 0.2)'
                                      : 'rgba(245, 158, 11, 0.2)',
                                  color:
                                    doc.status === 'INDEXED'
                                      ? '#34d399'
                                      : doc.status === 'FAILED'
                                      ? '#f43f5e'
                                      : '#fbbf24',
                                }}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.725rem',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginTop: '3px',
                              }}
                            >
                              <span>{doc.fileName}</span>
                              <span>•</span>
                              <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                              <span>•</span>
                              <span>
                                {doc.pageCount} página(s) | {doc.chunkCount} vectores
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          title="Eliminar documento y vectores de Qdrant"
                          style={{
                            background: 'rgba(244, 63, 94, 0.1)',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            color: '#f43f5e',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)')}
                        >
                          <Trash2 size={14} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SIMULADOR SEMÁNTICO RAG */}
          {activeTab === 'TESTER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0' }}>
                  Prueba de Búsqueda y Generación Aumentada (RAG)
                </h3>
                <p style={{ fontSize: '0.775rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
                  Escribe una consulta de cliente tal como llegaría por WhatsApp para verificar la respuesta sintetizada y los fragmentos recuperados de Qdrant.
                </p>

                <form onSubmit={handleTestQuery} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={testQuestion}
                    onChange={(e) => setTestQuestion(e.target.value)}
                    placeholder="Ej. ¿Cuáles son las coberturas del seguro en caso de siniestro?"
                    style={{
                      flex: 1,
                      background: '#151d2f',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isQuerying || !testQuestion.trim()}
                    style={{
                      background: isQuerying
                        ? '#64748b'
                        : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 20px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: isQuerying || !testQuestion.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 10px rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    <Send size={15} />
                    <span>{isQuerying ? 'Buscando...' : 'Consultar'}</span>
                  </button>
                </form>
              </div>

              {queryError && (
                <div
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#f43f5e',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{queryError}</span>
                </div>
              )}

              {queryResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Respuesta Sintetizada */}
                  <div
                    style={{
                      background: 'rgba(37, 211, 102, 0.08)',
                      border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Sparkles size={16} color="#25d366" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                        Respuesta Generada para WhatsApp:
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: '#f8fafc',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                        background: '#0d131f',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {queryResult.answer}
                    </div>
                  </div>

                  {/* Citas / Fuentes Recuperadas */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', margin: '0 0 10px 0' }}>
                      Fuentes Recuperadas de Qdrant ({queryResult.sources.length} fragmentos con mayor similitud):
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {queryResult.sources.map((src, i) => (
                        <div
                          key={i}
                          style={{
                            background: '#151d2f',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '0.775rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, color: '#c084fc' }}>
                              📄 {src.title} (Página {src.pageNumber})
                            </span>
                            <span style={{ color: '#34d399', fontWeight: 700 }}>
                              Similitud: {(src.score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p style={{ color: '#cbd5e1', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                            "{src.content}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GUÍA DE INTEGRACIÓN */}
          {activeTab === 'GUIDE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <h4 style={{ color: '#c084fc', fontWeight: 700, margin: '0 0 6px 0' }}>
                  ¿Cómo conectar la Base de Conocimiento a tu Flujo de WhatsApp?
                </h4>
                <p style={{ margin: 0 }}>
                  Ahora dispones del nuevo nodo <strong>"Consulta RAG / IA"</strong> en la paleta izquierda del Diseñador No-Code.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#a855f7', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <strong>Agrega un nodo de Captura previo:</strong>
                    <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>
                      Pregúntale al usuario "¿En qué puedo asesorarte hoy?" y guarda la entrada en la variable <code>pregunta_cliente</code>.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#a855f7', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <strong>Arrastra el nodo "Consulta RAG / IA":</strong>
                    <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>
                      Conecta la salida de la Captura al nodo RAG. En el Inspector, define la consulta como <code>{`{{pregunta_cliente}}`}</code>.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ background: '#a855f7', color: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <strong>Respuesta Automática a WhatsApp:</strong>
                    <div style={{ color: '#94a3b8', fontSize: '0.775rem' }}>
                      El motor consulta Qdrant, sintetiza la respuesta con IA basándose en tus PDFs oficiales y la envía directamente al cliente en segundos.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
