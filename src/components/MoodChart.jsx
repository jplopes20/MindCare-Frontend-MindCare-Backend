import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

export default function MoodChart({ logs = [], loading = false }) {
  const { labels, dataPoints } = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) {
      return { labels: [], dataPoints: [] }
    }

    const dayMap = {}
    logs.forEach((log) => {
      const date = new Date(log.createdAt)
      const key = date.toLocaleDateString('pt-BR')
      if (!dayMap[key]) {
        dayMap[key] = { sum: 0, count: 0 }
      }
      dayMap[key].sum += log.moodValue
      dayMap[key].count += 1
    })

    const sorted = Object.entries(dayMap).sort(([a], [b]) => {
      const [da, ma, ya] = a.split('/').map(Number)
      const [db, mb, yb] = b.split('/').map(Number)
      const dateA = new Date(ya, ma - 1, da)
      const dateB = new Date(yb, mb - 1, db)
      return dateA - dateB
    })

    return {
      labels: sorted.map(([label]) => label),
      dataPoints: sorted.map(([, val]) => Number((val.sum / val.count).toFixed(1))),
    }
  }, [logs])

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Humor',
        data: dataPoints,
        borderColor: '#6bc9b0',
        backgroundColor: 'rgba(107, 201, 176, 0.15)',
        pointBackgroundColor: '#6bc9b0',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Evolução do Humor',
        color: '#4a5568',
        font: { size: 16, weight: 600 },
        padding: { bottom: 20 },
      },
      tooltip: {
        backgroundColor: '#2d3748',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: ctx => `Humor: ${ctx.parsed.y}/5`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#718096', font: { size: 13 } },
      },
      y: {
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: '#718096',
          font: { size: 13 },
          callback: val => `${val}`,
        },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <div className="loading" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Carregando gráfico de humor...
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ height: 280 }}>
        {dataPoints.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: 8 }}>
            <span style={{ fontSize: 14 }}>Nenhum registro de humor encontrado.</span>
            <span style={{ fontSize: 12 }}>Registre suas emoções para acompanhar sua evolução.</span>
          </div>
        )}
      </div>
    </div>
  )
}
