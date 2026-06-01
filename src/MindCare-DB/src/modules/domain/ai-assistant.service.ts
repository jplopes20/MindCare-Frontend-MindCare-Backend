/**
 * AI Assistant Service — adaptador para geração assistida de prontuários.
 *
 * Abstrai a integração com provedores de IA (LLM).
 * Quando nenhuma chave de API está configurada, retorna dados simulados
 * realistas para desenvolvimento.
 *
 * Para integrar um LLM real, implemente o provider em `providers/`
 * e aponte a variável de ambiente AI_PROVIDER para o nome desejado.
 * Ex: AI_PROVIDER=openai, AI_PROVIDER=anthropic
 */

// ============================================================================
// Interfaces públicas
// ============================================================================

export interface AiDraftInput {
  patientName?: string
  specialty?: string
  symptoms?: string
  notes?: string
}

export interface AiDraftOutput {
  recordText: string
  suggestedDiagnosis: string[]
}

export interface AiImproveInput {
  currentText: string
  instruction?: string
}

export interface AiImproveOutput {
  improvedText: string
  changes: string[]
}

export interface AiDiagnosisInput {
  clinicalText: string
}

export interface AiDiagnosisOutput {
  diagnoses: Array<{
    cid: string
    description: string
    confidence: number
  }>
}

// ============================================================================
// Simulated provider (fallback)
// ============================================================================

function simulateDraft(input: AiDraftInput): AiDraftOutput {
  const name = input.patientName || 'Paciente'
  const spec = input.specialty || 'Psicologia Clínica'
  const symptoms = input.symptoms?.trim()
    ? input.symptoms
    : 'sintomas de ansiedade generalizada com taquicardia, sudorese e preocupação excessiva'

  const recordText = `**Queixa Principal:**\n${name} comparece para atendimento de ${spec.toLowerCase()} relatando ${symptoms}. ${input.symptoms?.trim() ? '' : 'Refere dificuldade para iniciar e manter o sono, com despertares frequentes. Nega ideação suicida ou sintomas psicóticos. Funcionamento social e profissional parcialmente comprometido.'}

**História da Doença Atual:**
Os sintomas iniciaram-se há aproximadamente 3 meses, com progressão gradual. Paciente associa o quadro a estressores psicossociais recentes.

**Exame Mental:**
Consciente, orientado em tempo e espaço, colaborativo. Humor ansioso, afeto congruente. Pensamento lógico-coerente, sem alterações de sensopercepção. Crítica preservada.

**Hipótese Diagnóstica:**
- Transtorno de Ansiedade Generalizada (CID-10: F41.1)

**Plano Terapêutico:**
1. Psicoterapia cognitivo-comportamental semanal
2. Técnicas de relaxamento e respiração diafragmática
3. Higiene do sono
4. Encaminhamento para avaliação psiquiátrica se necessário
5. Reavaliação em 4 semanas`

  return {
    recordText,
    suggestedDiagnosis: ['F41.1 - Transtorno de Ansiedade Generalizada'],
  }
}

function simulateImprove(input: AiImproveInput): AiImproveOutput {
  const text = input.currentText.trim()
  if (!text) {
    return {
      improvedText: '',
      changes: ['Nenhum texto fornecido para melhoria.'],
    }
  }

  const lines = text.split('\n')
  const improvedLines = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return line
    if (/^[a-z]/.test(trimmed) && trimmed.length > 3) {
      return line.replace(trimmed.charAt(0), trimmed.charAt(0).toUpperCase())
    }
    return line
  })

  const improvedText = improvedLines.join('\n')

  const changes: string[] = []
  if (improvedText !== text) {
    changes.push('Corrigida capitalização no início de frases')
  }
  if (!improvedText.includes('**')) {
    changes.push('Adicionada formatação estruturada por seções')
  }
  changes.push('Revisão ortográfica e gramatical aplicada')
  changes.push('Terminologia padronizada conforme CID-10')

  return { improvedText, changes }
}

function simulateDiagnosis(
  _input: AiDiagnosisInput,
): AiDiagnosisOutput {
  const diagnoses = [
    { cid: 'F41.1', description: 'Transtorno de Ansiedade Generalizada', confidence: 85 },
    { cid: 'F32.0', description: 'Episódio Depressivo Leve', confidence: 62 },
    { cid: 'F51.0', description: 'Insônia Não Orgânica', confidence: 45 },
    { cid: 'F43.2', description: 'Transtorno de Adaptação', confidence: 38 },
    { cid: 'Z73.0', description: 'Síndrome de Burnout (esgotamento)', confidence: 30 },
  ]

  return { diagnoses }
}

// ============================================================================
// Service principal
// ============================================================================

const AI_PROVIDER = process.env.AI_PROVIDER || 'simulated'

export const aiService = {
  async generateDraft(input: AiDraftInput): Promise<AiDraftOutput> {
    if (AI_PROVIDER !== 'simulated') {
      // Placeholder para integração com LLM real
      // Exemplo: return openaiProvider.generateDraft(input)
      throw new Error(`Provider ${AI_PROVIDER} ainda não implementado. Usando fallback simulado.`)
    }
    return simulateDraft(input)
  },

  async improveText(input: AiImproveInput): Promise<AiImproveOutput> {
    if (AI_PROVIDER !== 'simulated') {
      throw new Error(`Provider ${AI_PROVIDER} ainda não implementado. Usando fallback simulado.`)
    }
    return simulateImprove(input)
  },

  async suggestDiagnosis(input: AiDiagnosisInput): Promise<AiDiagnosisOutput> {
    if (AI_PROVIDER !== 'simulated') {
      throw new Error(`Provider ${AI_PROVIDER} ainda não implementado. Usando fallback simulado.`)
    }
    return simulateDiagnosis(input)
  },
}

export default aiService
