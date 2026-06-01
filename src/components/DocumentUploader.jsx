import React, { useState, useRef } from 'react'
import { uploadDocument } from '../services/documents.js'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const MAX_SIZE = 20 * 1024 * 1024

const documentTypeOptions = [
  { value: 'exam_result', label: 'Exame/Resultado' },
  { value: 'prescription', label: 'Receita' },
  { value: 'medical_record', label: 'Prontuário' },
  { value: 'certificate', label: 'Atestado' },
  { value: 'report', label: 'Relatório' },
  { value: 'other', label: 'Outro' },
]

export default function DocumentUploader({ onClose, onSuccess, patientId }) {
  const [activeTab, setActiveTab] = useState('device')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('other')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [progress, setProgress] = useState(0)

  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [driveFile, setDriveFile] = useState(null)
  const [url, setUrl] = useState('')

  function resetForm() {
    setTitle('')
    setDocType('other')
    setDescription('')
    setSelectedFile(null)
    setDriveFile(null)
    setUrl('')
    setError(null)
    setSuccess(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      const ext = file.name.split('.').pop()
      return `Tipo de arquivo ".${ext}" não permitido. Aceitos: PDF, DOC, DOCX, TXT, JPEG, PNG`
    }
    if (file.size > MAX_SIZE) {
      return `Arquivo muito grande (máx. 20MB). Este tem ${(file.size / 1024 / 1024).toFixed(1)}MB`
    }
    return null
  }

  async function uploadToServer(formData) {
    setUploading(true)
    setProgress(30)
    try {
      const result = await uploadDocument(formData)
      setProgress(100)
      setSuccess('Documento enviado com sucesso!')
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 1500)
    } catch (err) {
      setError(err?.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeviceUpload() {
    if (!selectedFile) { setError('Selecione um arquivo'); return }
    if (!title.trim()) { setError('Informe um título para o documento'); return }

    const validationError = validateFile(selectedFile)
    if (validationError) { setError(validationError); return }

    setError(null)
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', title.trim())
    formData.append('documentType', docType)
    if (description) formData.append('description', description)
    if (patientId) formData.append('patientId', String(patientId))

    await uploadToServer(formData)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
      setError(null)
    }
  }

  function openGooglePicker() {
    if (typeof window === 'undefined' || typeof window.gapi === 'undefined') {
      loadGoogleApi()
    } else {
      createPicker()
    }
  }

  function loadGoogleApi() {
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.onload = () => {
      window.gapi.load('picker', { callback: createPicker })
    }
    document.body.appendChild(script)
  }

  function createPicker() {
    const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY
    const clientId = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID

    if (!apiKey || !clientId) {
      setError(
        'Google Drive não configurado. Adicione VITE_GOOGLE_DRIVE_API_KEY e VITE_GOOGLE_DRIVE_CLIENT_ID no .env',
      )
      return
    }

    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(clientId)
      .setDeveloperKey(apiKey)
      .setCallback(pickerCallback)
      .build()
    picker.setVisible(true)
  }

  function pickerCallback(data) {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0]
      setDriveFile({
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        url: doc.url,
        downloadUrl: doc.downloadUrl || doc.url,
      })
      if (!title) setTitle(doc.name.replace(/\.[^.]+$/, ''))
      setError(null)
    }
  }

  async function handleDriveUpload() {
    if (!driveFile) { setError('Selecione um arquivo do Google Drive'); return }
    if (!title.trim()) { setError('Informe um título'); return }

    setError(null)
    setUploading(true)
    setProgress(10)

    try {
      const token = localStorage.getItem('mindcare:auth_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/documents/upload-from-drive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            googleFileId: driveFile.id,
            googleFileName: driveFile.name,
            googleMimeType: driveFile.mimeType,
            title: title.trim(),
            documentType: docType,
            description: description || undefined,
            patientId: patientId ? Number(patientId) : undefined,
          }),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao importar do Google Drive')
      }

      setProgress(100)
      setSuccess('Documento importado do Google Drive com sucesso!')
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 1500)
    } catch (err) {
      setError(err?.message || 'Erro ao importar do Google Drive')
    } finally {
      setUploading(false)
    }
  }

  async function handleUrlUpload() {
    if (!url.trim()) { setError('Informe uma URL'); return }
    if (!title.trim()) { setError('Informe um título'); return }

    setError(null)
    setUploading(true)
    setProgress(10)

    try {
      const token = localStorage.getItem('mindcare:auth_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/documents/upload-from-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url: url.trim(),
            title: title.trim(),
            documentType: docType,
            description: description || undefined,
            patientId: patientId ? Number(patientId) : undefined,
          }),
        },
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao importar da URL')
      }

      setProgress(100)
      setSuccess('Documento importado da URL com sucesso!')
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 1500)
    } catch (err) {
      setError(err?.message || 'Erro ao importar da URL')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: 24,
        marginBottom: 16,
        border: '1px solid rgba(0,212,255,0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h3 style={{ margin: 0 }}>Upload de Documento</h3>
        <button className="btn-ghost" onClick={onClose} style={{ fontSize: 12 }}>
          Fechar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['device', 'drive', 'url'].map((tab) => (
          <button
            key={tab}
            className="btn"
            onClick={() => { setActiveTab(tab); setError(null); setSuccess(null) }}
            style={{
              flex: 1,
              background: activeTab === tab ? '#0fb9b1' : 'transparent',
              color: activeTab === tab ? '#fff' : '#4a5568',
              border: '1px solid #0fb9b1',
              fontSize: 12,
              padding: '8px 12px',
              opacity: activeTab === tab ? 1 : 0.7,
            }}
          >
            {tab === 'device' ? 'Dispositivo' : tab === 'drive' ? 'Google Drive' : 'Link Externo'}
          </button>
        ))}
      </div>

      <div className="form-group">
        <label>Título *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nome do documento"
        />
      </div>

      <div className="form-group">
        <label>Tipo de Documento</label>
        <select value={docType} onChange={e => setDocType(e.target.value)}>
          {documentTypeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Descrição (opcional)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descrição breve do documento"
          rows={2}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'transparent',
            color: '#fff',
            resize: 'vertical',
          }}
        />
      </div>

      {activeTab === 'device' && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              border: '2px dashed rgba(0,212,255,0.3)',
              borderRadius: 10,
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(0,212,255,0.03)',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedFile.name}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  Clique para selecionar ou arraste um arquivo
                </div>
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                  PDF, DOC, DOCX, TXT, JPEG, PNG — máx. 20MB
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
          />
          {selectedFile && (
            <button
              className="btn"
              onClick={handleDeviceUpload}
              disabled={uploading}
              style={{ marginTop: 12, width: '100%' }}
            >
              {uploading ? 'Enviando...' : 'Enviar Arquivo'}
            </button>
          )}
        </div>
      )}

      {activeTab === 'drive' && (
        <div style={{ marginTop: 16 }}>
          {!driveFile ? (
            <button
              className="btn"
              onClick={openGooglePicker}
              disabled={uploading}
              style={{ width: '100%', padding: 14 }}
            >
              Selecionar do Google Drive
            </button>
          ) : (
            <div
              style={{
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 10,
                padding: 16,
                background: 'rgba(0,212,255,0.04)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>{driveFile.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{driveFile.mimeType}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={handleDriveUpload} disabled={uploading} style={{ flex: 1 }}>
                  {uploading ? 'Importando...' : 'Importar do Drive'}
                </button>
                <button className="btn-ghost" onClick={() => setDriveFile(null)}>
                  Trocar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'url' && (
        <div style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>URL do Arquivo *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://exemplo.com/documento.pdf"
            />
          </div>
          <button
            className="btn"
            onClick={handleUrlUpload}
            disabled={uploading || !url.trim()}
            style={{ marginTop: 12, width: '100%' }}
          >
            {uploading ? 'Importando...' : 'Importar da URL'}
          </button>
        </div>
      )}

      {uploading && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0fb9b1, #ff8a3d)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', marginTop: 6 }}>
            {progress < 100 ? 'Enviando...' : 'Concluído'}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            color: '#ff8a80',
            fontSize: 13,
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(255,138,128,0.1)',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            color: '#0fb9b1',
            fontSize: 13,
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(15,185,177,0.1)',
            borderRadius: 8,
          }}
        >
          {success}
        </div>
      )}
    </div>
  )
}
