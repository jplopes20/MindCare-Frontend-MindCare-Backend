import React, { useState } from 'react'
import { createEmotionLog } from '../services/emotions.js'

const moods = [
  { emoji: '😢', label: 'Muito triste', value: 1 },
  { emoji: '😔', label: 'Triste', value: 2 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '😊', label: 'Feliz', value: 4 },
  { emoji: '😄', label: 'Muito feliz', value: 5 },
]

const btnBase = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '16px 12px',
  border: '1px solid rgba(0,212,255,0.25)',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
  flex: 1,
  minWidth: 80,
  fontSize: 13,
  lineHeight: 1.3,
}

export default function EmotionDiary() {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSelect(value) {
    setSaving(true)
    setError(null)
    try {
      const mood = moods.find(m => m.value === value)
      await createEmotionLog({ moodValue: value, moodLabel: mood?.label })
      setSelected(value)
    } catch (err) {
      setError(err?.message || 'Erro ao salvar registro de humor')
    } finally {
      setSaving(false)
    }
  }

  if (selected) {
    return (
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{moods.find(m => m.value === selected).emoji}</div>
        <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>
          Registro salvo! Cuidar de si mesmo é o primeiro passo.
        </p>
        <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>
          {moods.find(m => m.value === selected).label.toLowerCase()} — {new Date().toLocaleDateString('pt-BR')}
        </p>
        <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setSelected(null)}>
          Novo registro
        </button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}>
        Como você está se sentindo hoje?
      </p>
      {error && (
        <div style={{ color: '#ff8a80', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {moods.map(m => (
          <button
            key={m.value}
            style={{
              ...btnBase,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            onClick={() => handleSelect(m.value)}
            disabled={saving}
            onMouseEnter={e => {
              if (saving) return
              e.currentTarget.style.background = 'rgba(15,185,177,0.15)'
              e.currentTarget.style.borderColor = 'rgba(15,185,177,0.5)'
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
