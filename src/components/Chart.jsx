import { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const Chart = ({ type = 'line', data, options = {}, height = 300 }) => {
  const chartRef = useRef(null)

  // Opciones por defecto para cada tipo de gráfico
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 6
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        displayColors: true,
        boxPadding: 5
      }
    }
  }

  // Opciones específicas para cada tipo de gráfico
  const typeSpecificOptions = {
    line: {
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      elements: {
        line: {
          tension: 0.4
        },
        point: {
          radius: 3,
          hoverRadius: 5
        }
      }
    },
    bar: {
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    },
    doughnut: {
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  }

  // Combinar opciones por defecto, específicas y personalizadas
  const mergedOptions = {
    ...defaultOptions,
    ...typeSpecificOptions[type],
    ...options
  }

  // Renderizar el tipo de gráfico correspondiente
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={mergedOptions} />
      case 'bar':
        return <Bar data={data} options={mergedOptions} />
      case 'doughnut':
        return <Doughnut data={data} options={mergedOptions} />
      default:
        return <Line data={data} options={mergedOptions} />
    }
  }

  return (
    <div style={{ height: `${height}px`, width: '100%' }} className="bg-white p-4 rounded-lg shadow">
      {renderChart()}
    </div>
  )
}

export default Chart