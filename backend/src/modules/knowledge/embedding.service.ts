import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly geminiApiKey: string | undefined;
  private readonly openaiApiKey: string | undefined;
  private readonly openaiModel: string;
  private readonly vectorDim: number;

  constructor(private readonly config: ConfigService) {
    this.geminiApiKey =
      this.config.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      undefined;
    this.openaiApiKey =
      this.config.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY ||
      undefined;
    this.openaiModel =
      this.config.get<string>('OPENAI_MODEL') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o';
    const rawDim = this.config.get<string>('EMBEDDING_DIMENSIONS') || '768';
    this.vectorDim = parseInt(rawDim, 10);
  }

  hasApiKey(): boolean {
    return !!(this.geminiApiKey?.trim() || this.openaiApiKey?.trim());
  }

  getAiProvider(): 'gemini' | 'openai' | 'none' {
    if (this.geminiApiKey?.trim()) return 'gemini';
    if (this.openaiApiKey?.trim()) return 'openai';
    return 'none';
  }

  /**
   * Genera el vector de embedding para un texto individual con reintentos y tolerancia a fallos
   */
  async getEmbedding(text: string): Promise<number[]> {
    const cleaned = text.replace(/\n+/g, ' ').trim();
    if (!cleaned) {
      return new Array(this.vectorDim).fill(0);
    }

    if (this.openaiApiKey) {
      try {
        return await this.getOpenAiEmbedding(cleaned);
      } catch (err: any) {
        this.logger.warn(`Fallback de OpenAI embedding por error (${err.message})...`);
      }
    }

    if (this.geminiApiKey) {
      try {
        return await this.getGeminiEmbedding(cleaned);
      } catch (err: any) {
        this.logger.warn(`Fallback de Gemini embedding por error (${err.message})...`);
      }
    }

    this.logger.warn(
      'Usando embedding sintético normalizado como respaldo seguro...',
    );
    return this.generateSyntheticEmbedding(cleaned, this.vectorDim);
  }

  /**
   * Genera embeddings para un lote de textos (optimizando batch directo si es OpenAI)
   */
  async getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    if (this.openaiApiKey && texts.length > 0) {
      try {
        return await this.getOpenAiEmbeddingsBatch(texts);
      } catch (err: any) {
        this.logger.warn(`Error en lote OpenAI (${err.message}), procesando individualmente con fallback...`);
      }
    }

    const results: number[][] = [];
    const chunkSize = 10;
    for (let i = 0; i < texts.length; i += chunkSize) {
      const slice = texts.slice(i, i + chunkSize);
      const batchPromises = slice.map((t) => this.getEmbedding(t));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    return results;
  }

  /**
   * Llamada por lotes a OpenAI Embedding API (text-embedding-3-small)
   */
  async getOpenAiEmbeddingsBatch(texts: string[], maxRetries = 2): Promise<number[][]> {
    const cleanedList = texts.map((t) => t.replace(/\n+/g, ' ').trim() || ' ');
    const url = 'https://api.openai.com/v1/embeddings';

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          url,
          {
            model: 'text-embedding-3-small',
            input: cleanedList,
            dimensions: this.vectorDim,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 20000,
          },
        );

        const data = response.data?.data;
        if (Array.isArray(data) && data.length === cleanedList.length) {
          return data.map((d: any) => d.embedding);
        }
        throw new Error('Respuesta incompleta de OpenAI Embedding en lote');
      } catch (err: any) {
        const isNetworkErr =
          err.code === 'EAI_AGAIN' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          (err.response?.status && err.response.status >= 500);

        if (attempt <= maxRetries && isNetworkErr) {
          this.logger.warn(
            `Reintentando embedding OpenAI en lote (${err.code || err.response?.status}), intento ${attempt}/${maxRetries}...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('No se pudo generar lote de embeddings');
  }

  /**
   * Llamada a Google Gemini Embedding API con reintentos
   */
  private async getGeminiEmbedding(text: string, maxRetries = 2): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.geminiApiKey}`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          url,
          {
            model: 'models/text-embedding-004',
            content: {
              parts: [{ text }],
            },
          },
          { timeout: 10000 },
        );

        const values = response.data?.embedding?.values;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
        throw new Error('Respuesta inválida de Gemini Embedding');
      } catch (err: any) {
        const isNetworkErr =
          err.code === 'EAI_AGAIN' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          (err.response?.status && err.response.status >= 500);

        if (attempt <= maxRetries && isNetworkErr) {
          this.logger.warn(
            `Reintentando Gemini embedding (${err.code || err.response?.status}), intento ${attempt}/${maxRetries}...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Error persistente generando embedding con Gemini');
  }

  /**
   * Llamada a OpenAI Embedding API (text-embedding-3-small) con reintentos
   */
  private async getOpenAiEmbedding(text: string, maxRetries = 2): Promise<number[]> {
    const url = 'https://api.openai.com/v1/embeddings';

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          url,
          {
            model: 'text-embedding-3-small',
            input: text,
            dimensions: this.vectorDim,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        );

        const values = response.data?.data?.[0]?.embedding;
        if (Array.isArray(values) && values.length > 0) {
          return values;
        }
        throw new Error('Respuesta inválida de OpenAI Embedding');
      } catch (err: any) {
        const isNetworkErr =
          err.code === 'EAI_AGAIN' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          (err.response?.status && err.response.status >= 500);

        if (attempt <= maxRetries && isNetworkErr) {
          this.logger.warn(
            `Reintentando OpenAI embedding (${err.code || err.response?.status}), intento ${attempt}/${maxRetries}...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Error persistente generando embedding con OpenAI');
  }

  /**
   * Limpia y remueve preámbulos, saludos repetitivos y fórmulas de cortesía vacías
   * para asegurar que el Bot responda directamente a la pregunta realizada.
   */
  public cleanDirectAnswer(text: string): string {
    if (!text) return text;
    let cleaned = text.trim();

    // Eliminar agradecimientos típicos de inicio ("Gracias por tu consulta/interés/preguntar...")
    cleaned = cleaned.replace(
      /^(¡?hola[!,\s]*)?(muchas\s+)?gracias\s+por\s+(tu\s+|su\s+)?(inter[eé]s|consulta|pregunta[rt]?|contactarnos|escribirnos)[^.\n]*[.:,\n]+\s*/i,
      '',
    );

    // Eliminar frases como "Con gusto te cuento/respondo/explico..."
    cleaned = cleaned.replace(
      /^(¡?hola[!,\s]*)?(con\s+gusto\s+(te\s+|le\s+)?(cuento|explico|respondo|informo|detallo|brindo\s+informaci[oó]n))[^.\n]*[.:,\n]+\s*/i,
      '',
    );

    // Eliminar "Es un placer atenderte/saludarte..."
    cleaned = cleaned.replace(
      /^(¡?hola[!,\s]*)?(es\s+un\s+placer\s+(atenderte|saludarte|ayudarte))[^.\n]*[.:,\n]+\s*/i,
      '',
    );

    // Eliminar saludos simples que queden al inicio de respuestas a preguntas en curso ("¡Hola! ", "Hola, ")
    cleaned = cleaned.replace(/^(¡?hola[!,\s]+)+/i, '');

    return cleaned.trim();
  }

  /**
   * Análisis semántico y expansión de intenciones para mejorar la búsqueda en la base vectorial
   */
  public analyzeAndExpandSemanticQuery(question: string): {
    normalizedQuery: string;
    expandedTerms: string[];
    semanticQueryForEmbedding: string;
  } {
    const raw = question.trim();
    const normalized = this.normalizeText(raw);

    // Mapa de relaciones semánticas de dominio
    const semanticConcepts: Record<string, string[]> = {
      empleados: [
        'empleados',
        'empleos directos',
        'empleos indirectos',
        'colaboradores',
        'personal',
        'nomina',
        'equipo',
        'trabajadores',
        'recursos humanos',
      ],
      oficinas: [
        'oficina',
        'oficinas',
        'sucursal',
        'sucursales',
        'direccion',
        'direcciones',
        'donde queda',
        'donde estan',
        'ciudades',
        'la paz',
        'santa cruz',
        'cochabamba',
        'tarija',
        'telefono',
      ],
      salud: [
        'seguro de salud',
        'gastos medicos',
        'clinicas',
        'hospital',
        'enfermedades',
        'medicina prepagada',
        'consultas medicas',
      ],
      vida: [
        'seguro de vida',
        'fallecimiento',
        'beneficiarios',
        'indemnizacion',
        'proteccion financiera',
      ],
      automotor: [
        'seguro automotor',
        'autos',
        'vehiculos',
        'choque',
        'robo',
        'asistencia mecanica',
        'danos materiales',
      ],
      empresa: [
        'historia',
        'trayectoria',
        'presidente',
        'directorio',
        'liderazgo',
        'fundacion',
        'sudamericana',
        'tubroker',
      ],
      siniestros: [
        'siniestro',
        'ajustador',
        'accidente',
        'reclamo',
        'asistencia inmediata',
      ],
      precios: [
        'precio',
        'cotizacion',
        'cuanto cuesta',
        'tarifa',
        'prima',
        'costos',
      ],
    };

    const expandedTerms: string[] = [];
    for (const [key, terms] of Object.entries(semanticConcepts)) {
      if (terms.some((term) => normalized.includes(term))) {
        for (const t of terms) {
          if (!expandedTerms.includes(t)) {
            expandedTerms.push(t);
          }
        }
      }
    }

    const semanticQueryForEmbedding =
      expandedTerms.length > 0
        ? `${raw} (Conceptos clave: ${expandedTerms.slice(0, 5).join(', ')})`
        : raw;

    return {
      normalizedQuery: normalized,
      expandedTerms,
      semanticQueryForEmbedding,
    };
  }

  /**
   * Genera una respuesta conversacional basada en el contexto recuperado (RAG Synthesis)
   * Asegura respuestas directas a la pregunta, eliminando agradecimientos y rodeos.
   */
  async synthesizeAnswer(params: {
    question: string;
    contextChunks: string[];
    companyName?: string;
    customPrompt?: string;
  }): Promise<string> {
    const { question, contextChunks, companyName, customPrompt } = params;

    const joinedContext = contextChunks
      .map((c, i) => `[Documento Fragmento ${i + 1}]:\n${c}`)
      .join('\n\n');

    const directnessRules = `
REGLAS OBLIGATORIAS DE COMUNICACIÓN EN WHATSAPP:
1. RESPUESTA DIRECTA A LA PREGUNTA REALIZADA:
   - Responde DIRECTAMENTE a la pregunta formulada por el usuario desde la primera palabra.
   - PROHIBIDO usar frases de cortesía iniciales, saludos repetidos o agradecimientos como: "Gracias por tu interés", "Gracias por tu consulta", "Gracias por preguntar", "Muchas gracias por comunicarte", "¡Hola! Con gusto te cuento...", "Es un placer atenderte".
   - Inicia de inmediato entregando los datos o la respuesta concreta solicitada.
2. FORMATO CLARO Y RESUMIDO:
   - Transforma datos técnicos en explicaciones claras, directas y fáciles de leer en pantalla de celular.
   - Párrafos cortos (máximo 2 a 3 líneas).
   - Usa negritas con asteriscos (*así*) para resaltar números, cifras clave, nombres de coberturas o ciudades.
   - Usa viñetas limpias con emojis útiles cuando listes opciones (📍 direcciones, 📞 teléfonos, 🛡️ seguros, 💼 servicios).
3. FIDELIDAD ESTRICTA AL CONTEXTO:
   - Basa tu respuesta exclusivamente en la información provista en el CONTEXTO OFICIAL.
   - Si un dato solicitado no está presente en los documentos, indícalo de forma directa y clara: "Actualmente no disponemos de información sobre ese detalle específico en nuestros registros oficiales. Si deseas, te comunico con un asesor ejecutivo para orientarte."
4. TONO PROFESIONAL Y NATURAL:
   - Habla en primera persona plural ("En TuBroker te ofrecemos...", "Nuestra red de oficinas...").
   - NUNCA menciones tecnicismos de IA como "según el contexto provisto", "en el fragmento 1", "en el archivo adjunto".`;

    const fullSystemPrompt = customPrompt
      ? `${customPrompt}\n\n${directnessRules}`
      : `Eres el asesor virtual oficial y humano ${companyName ? 'de ' + companyName : 'de la empresa'} en WhatsApp.\n${directnessRules}`;

    let rawAnswer = '';

    // Priorizar OpenAI si está configurado, o Gemini como alternativa
    if (this.openaiApiKey) {
      try {
        rawAnswer = await this.synthesizeWithOpenAi(fullSystemPrompt, joinedContext, question);
      } catch (err: any) {
        this.logger.warn(`Fallback de OpenAI a extractivo/Gemini: ${err.message}`);
      }
    }

    if (!rawAnswer && this.geminiApiKey) {
      try {
        rawAnswer = await this.synthesizeWithGemini(fullSystemPrompt, joinedContext, question);
      } catch (err: any) {
        this.logger.warn(`Fallback de Gemini a extractivo: ${err.message}`);
      }
    }

    // Síntesis extractiva inteligente (sin requerir API key externa)
    if (!rawAnswer) {
      rawAnswer = this.buildExtractiveAnswer(question, contextChunks);
    }

    // Asegurar que la respuesta empiece directo al grano sin fórmulas de agradecimiento
    return this.cleanDirectAnswer(rawAnswer);
  }

  private async synthesizeWithGemini(
    systemPrompt: string,
    context: string,
    question: string,
    maxRetries = 2,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const userMessage = `CONTEXTO OFICIAL DE LA EMPRESA:\n${context}\n\nPREGUNTA DEL CLIENTE:\n${question}`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          url,
          {
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userMessage }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 600,
            },
          },
          { timeout: 15000 },
        );

        const candidate =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return candidate || 'No se pudo generar una respuesta con el contexto provisto.';
      } catch (err: any) {
        const isNetworkErr =
          err.code === 'EAI_AGAIN' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          (err.response?.status && err.response.status >= 500);

        if (attempt <= maxRetries && isNetworkErr) {
          this.logger.warn(
            `Reintentando síntesis Gemini (${err.code || err.response?.status}), intento ${attempt}/${maxRetries}...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }

        this.logger.error(
          `Error en síntesis con Gemini: ${err.response?.data?.error?.message || err.message}`,
        );
        throw err;
      }
    }
    throw new Error('Error persistente en síntesis con Gemini');
  }

  private async synthesizeWithOpenAi(
    systemPrompt: string,
    context: string,
    question: string,
    maxRetries = 2,
  ): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const userMessage = `CONTEXTO OFICIAL DE LA EMPRESA:\n${context}\n\nPREGUNTA DEL CLIENTE:\n${question}`;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await axios.post(
          url,
          {
            model: this.openaiModel || 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.25,
            max_tokens: 650,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 18000,
          },
        );

        return (
          response.data?.choices?.[0]?.message?.content ||
          'No se pudo sintetizar la respuesta con OpenAI.'
        );
      } catch (err: any) {
        const isNetworkErr =
          err.code === 'EAI_AGAIN' ||
          err.code === 'ETIMEDOUT' ||
          err.code === 'ECONNRESET' ||
          (err.response?.status && err.response.status >= 500);

        if (attempt <= maxRetries && isNetworkErr) {
          this.logger.warn(
            `Reintentando síntesis OpenAI (${err.code || err.response?.status}), intento ${attempt}/${maxRetries}...`,
          );
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }

        this.logger.error(
          `Error en síntesis con OpenAI: ${err.response?.data?.error?.message || err.message}`,
        );
        throw err;
      }
    }
    throw new Error('Error persistente en síntesis con OpenAI');
  }

  private static readonly STOPWORDS = new Set([
    'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'quien', 'quienes',
    'cuanto', 'cuantos', 'cuanta', 'cuantas', 'por', 'para', 'con', 'sin',
    'sobre', 'entre', 'hacia', 'hasta', 'desde', 'del', 'las', 'los', 'una',
    'uno', 'unos', 'unas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
    'esos', 'esas', 'aquel', 'aquella', 'mi', 'tu', 'su', 'mis', 'tus', 'sus',
    'nuestro', 'nuestra', 'nuestros', 'nuestras', 'pero', 'mas', 'sino',
    'porque', 'pues', 'como', 'cuando', 'donde', 'si', 'no', 'ni', 'o', 'u',
    'y', 'e', 'a', 'ante', 'bajo', 'cabe', 'contra', 'de', 'en', 'el', 'la',
    'lo', 'al', 'se', 'le', 'les', 'me', 'te', 'nos', 'os', 'es', 'son', 'fue',
    'era', 'ser', 'estar', 'esta', 'estan', 'tiene', 'tienen', 'tener', 'hay',
    'hacer', 'hace', 'hacen', 'puedo', 'puede', 'pueden', 'quiero', 'quisiera',
    'saber', 'decir', 'dime', 'favor', 'hola', 'buenas', 'buenos', 'dias',
    'tardes', 'noches', 'informacion', 'consulta', 'pregunta',
  ]);

  public normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public extractKeywords(text: string): string[] {
    const norm = this.normalizeText(text);
    if (!norm) return [];
    const tokens = norm.split(' ').filter((w) => w.length >= 2 && !EmbeddingService.STOPWORDS.has(w));
    return tokens.length > 0 ? tokens : norm.split(' ').filter((w) => w.length >= 2);
  }

  private stemSpanish(word: string): string {
    if (word.length <= 4) return word;
    return word.replace(/(aciones|iciones|amiento|imiento|adoras|adores|ancias|encias|mente|idades|acion|icion|adora|ador|ancia|encia|ibles|ables|idad|ales|ares|ores|ices|eses|era|ero|ava|avo|iva|ivo|osa|oso|es|as|os|a|o|e)$/, '');
  }

  /**
   * Calcula similitud léxica y por raíces entre una consulta y un fragmento de documento
   */
  public computeLexicalScore(question: string, chunkContent: string, title?: string): number {
    const qKeywords = this.extractKeywords(question);
    if (qKeywords.length === 0) return 0;

    const normChunk = this.normalizeText(`${title || ''} ${chunkContent}`);
    const chunkWords = normChunk.split(' ').filter((w) => w.length >= 2);
    const chunkStems = new Set(chunkWords.map((w) => this.stemSpanish(w)));

    let matchedScore = 0;
    for (const kw of qKeywords) {
      const kwStem = this.stemSpanish(kw);
      if (normChunk.includes(` ${kw} `) || normChunk.startsWith(`${kw} `) || normChunk.endsWith(` ${kw}`)) {
        matchedScore += 1.0;
      } else if (normChunk.includes(kw)) {
        matchedScore += 0.85;
      } else if (kwStem.length >= 3 && (chunkStems.has(kwStem) || normChunk.includes(kwStem))) {
        matchedScore += 0.7;
      }
    }

    // Bono por frase exacta de 2+ palabras
    if (qKeywords.length >= 2) {
      const phrase = qKeywords.join(' ');
      if (normChunk.includes(phrase)) {
        matchedScore += 0.6;
      }
    }

    // Si es una pregunta general ("qué es X", "quiénes somos", "sobre la empresa") priorizar el inicio del documento
    const isGeneralIntro =
      /que es|quienes son|quienes somos|historia|perfil|empresa|dedica|acerca/.test(
        this.normalizeText(question),
      );
    if (isGeneralIntro && /resumen ejecutivo|historia|fundad|trayectoria|lider|perfil corporativo/.test(normChunk)) {
      matchedScore += 0.5;
    }

    return matchedScore / qKeywords.length;
  }

  /**
   * Construye una respuesta limpia y bien formateada a partir de los fragmentos recuperados
   */
  private buildExtractiveAnswer(question: string, contextChunks: string[]): string {
    if (!contextChunks || contextChunks.length === 0) {
      return 'No se encontró información específica sobre esa consulta en los documentos oficiales.';
    }

    const qKeywords = this.extractKeywords(question);

    // Limpiar encabezados repetitivos de PDF ("... | Perfil Corporativo", "Página X de Y")
    const cleanedChunks = contextChunks.map((raw) => {
      return raw
        .replace(/^.*\|\s*Perfil Corporativo.*$/gim, '')
        .replace(/^P[áa]gina\s+\d+\s+de\s+\d+\s*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    });

    // Dividir en bloques o párrafos con sentido completo
    const candidateParagraphs: Array<{ text: string; score: number; order: number }> = [];
    let orderIdx = 0;

    for (let cIdx = 0; cIdx < cleanedChunks.length; cIdx++) {
      const chunk = cleanedChunks[cIdx];
      // Separar por doble salto de línea o numeración de secciones
      const blocks = chunk
        .split(/\n\s*\n/)
        .map((b) => b.replace(/\s*\n\s*/g, ' ').trim())
        .filter((b) => b.length >= 25);

      for (const block of blocks) {
        const lexical = this.computeLexicalScore(question, block);
        // Dar peso adicional al primer fragmento más relevante
        const rankBonus = cIdx === 0 ? 0.35 : cIdx === 1 ? 0.15 : 0;
        candidateParagraphs.push({
          text: block,
          score: lexical + rankBonus,
          order: orderIdx++,
        });
      }
    }

    if (candidateParagraphs.length === 0) {
      const fallbackText = cleanedChunks[0] || contextChunks[0];
      return `📄 *Información Oficial:*\n\n${fallbackText}`;
    }

    // Ordenar párrafos por relevancia y seleccionar los mejores (hasta ~750 caracteres)
    candidateParagraphs.sort((a, b) => b.score - a.score);
    const selected: Array<{ text: string; score: number; order: number }> = [];
    let totalLen = 0;

    for (const p of candidateParagraphs) {
      // Evitar duplicados por solapamiento entre fragmentos (overlap)
      const isDuplicate = selected.some((s) => {
        const a = this.normalizeText(s.text);
        const b = this.normalizeText(p.text);
        return a.includes(b.slice(0, 50)) || b.includes(a.slice(0, 50));
      });
      if (isDuplicate) continue;

      if (selected.length > 0 && (p.score < 0.25 || totalLen + p.text.length > 800)) {
        break;
      }
      selected.push(p);
      totalLen += p.text.length;
      if (selected.length >= 2) break;
    }

    // Ordenar por aparición natural para que la lectura sea coherente
    selected.sort((a, b) => a.order - b.order);

    const body = selected
      .map((s) => {
        // Limpiar fragmentos truncados al inicio por el chunker (ej. "atro veces el...")
        let t = s.text.replace(/^[a-záéíóúñ]{1,5}\s+(?=[a-záéíóúñ])/i, (m) => {
          return /^[A-ZÁÉÍÓÚÑ]/.test(s.text) ? m : '';
        });
        // Cortar numeración huérfana al final (ej. "...del país. 3.")
        t = t.replace(/\s+\d+(\.\d+)?\.?\s*$/, '.');
        return t.trim();
      })
      .join('\n\n');

    void qKeywords;
    return `📄 *Información Oficial:*\n\n${body}`;
  }

  /**
   * Embedding determinístico basado en palabras, raíces y n-gramas para entornos sin API Key externa
   */
  private generateSyntheticEmbedding(text: string, dimensions: number): number[] {
    const vector = new Array(dimensions).fill(0);
    const keywords = this.extractKeywords(text);

    const hashToken = (token: string, weight: number) => {
      let h1 = 2166136261;
      let h2 = 16777619;
      for (let i = 0; i < token.length; i++) {
        const c = token.charCodeAt(i);
        h1 ^= c;
        h1 = Math.imul(h1, 16777619);
        h2 ^= c * (i + 1);
        h2 = Math.imul(h2, 2166136261);
      }
      const idx1 = Math.abs(h1) % dimensions;
      const idx2 = Math.abs(h2) % dimensions;
      vector[idx1] += weight;
      vector[idx2] += weight * 0.7;
    };

    for (const word of keywords) {
      hashToken(word, 2.0);
      const stem = this.stemSpanish(word);
      if (stem.length >= 3) {
        hashToken(`stem_${stem}`, 1.8);
      }
      // Trigramas de caracteres para tolerancia a variaciones y plurales
      for (let i = 0; i <= word.length - 3; i++) {
        hashToken(`tri_${word.slice(i, i + 3)}`, 0.5);
      }
    }

    // Normalizar vector L2
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((v) => v / norm);
  }
}
