import jsPDF from 'jspdf'
import 'jspdf-autotable'

/**
 * Genera un PDF de factura para un viaje
 * @param {Object} invoice - Datos de la factura
 * @param {Object} trip - Datos del viaje
 * @param {Object} settings - Configuración de tarifas
 * @returns {jsPDF} - Documento PDF generado
 */
export const generateInvoicePDF = (invoice, trip, settings) => {
  // Crear nuevo documento PDF
  const doc = new jsPDF()
  
  // Configuración de fuentes y colores
  const primaryColor = '#4F46E5'
  const secondaryColor = '#6B7280'
  
  // Añadir título
  doc.setFontSize(20)
  doc.setTextColor(primaryColor)
  doc.text('FACTURA', 105, 20, { align: 'center' })
  
  // Añadir información de la factura
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text('Factura #:', 20, 40)
  doc.text('Fecha:', 20, 45)
  doc.text('Estado:', 20, 50)
  
  doc.setTextColor(0, 0, 0)
  doc.text(invoice.id.toString(), 60, 40)
  doc.text(new Date(invoice.date).toLocaleDateString(), 60, 45)
  doc.text(invoice.status, 60, 50)
  
  // Añadir información del viaje
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Detalles del Viaje', 20, 65)
  
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text('Origen:', 20, 75)
  doc.text('Destino:', 20, 80)
  doc.text('Distancia:', 20, 85)
  doc.text('Duración:', 20, 90)
  doc.text('Fecha del viaje:', 20, 95)
  
  doc.setTextColor(0, 0, 0)
  doc.text(trip.origin.address, 60, 75)
  doc.text(trip.destination.address, 60, 80)
  doc.text(`${trip.distance.toFixed(2)} millas`, 60, 85)
  doc.text(formatDuration(trip.duration), 60, 90)
  doc.text(new Date(trip.date).toLocaleDateString(), 60, 95)
  
  // Añadir tabla de costos
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Desglose de Costos', 20, 110)
  
  const tableColumn = ['Concepto', 'Detalle', 'Importe']
  const tableRows = []
  
  // Tarifa base por distancia
  tableRows.push([
    'Tarifa por distancia',
    `${trip.distance.toFixed(2)} millas x $${settings.baseMileRate.toFixed(2)}`,
    `$${(trip.distance * settings.baseMileRate).toFixed(2)}`
  ])
  
  // Tarifa base por tiempo
  const hours = trip.duration / 3600 // Convertir segundos a horas
  tableRows.push([
    'Tarifa por tiempo',
    `${hours.toFixed(2)} horas x $${settings.baseHourRate.toFixed(2)}`,
    `$${(hours * settings.baseHourRate).toFixed(2)}`
  ])
  
  // Factores de recargo aplicados
  if (trip.appliedSurcharges && trip.appliedSurcharges.length > 0) {
    trip.appliedSurcharges.forEach(surcharge => {
      const amount = surcharge.type === 'percentage'
        ? (trip.basePrice * surcharge.rate / 100)
        : surcharge.rate
      
      tableRows.push([
        `Recargo: ${surcharge.name}`,
        surcharge.type === 'percentage' ? `${surcharge.rate}%` : 'Monto fijo',
        `$${amount.toFixed(2)}`
      ])
    })
  }
  
  // Descuentos aplicados
  if (trip.appliedDiscounts && trip.appliedDiscounts.length > 0) {
    trip.appliedDiscounts.forEach(discount => {
      const amount = discount.type === 'percentage'
        ? (trip.basePrice * discount.rate / 100)
        : discount.rate
      
      tableRows.push([
        `Descuento: ${discount.name}`,
        discount.type === 'percentage' ? `${discount.rate}%` : 'Monto fijo',
        `-$${amount.toFixed(2)}`
      ])
    })
  }
  
  // Añadir total
  tableRows.push([
    'TOTAL',
    '',
    `$${trip.finalPrice.toFixed(2)}`
  ])
  
  // Generar tabla
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 115,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: function(data) {
      // Estilo para la fila del total
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        if (data.column.index === 2) {
          data.cell.styles.fillColor = [240, 240, 250]
        }
      }
    }
  })
  
  // Añadir pie de página
  const finalY = doc.lastAutoTable.finalY || 200
  
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text('Gracias por su preferencia', 105, finalY + 20, { align: 'center' })
  doc.text('Este documento es informativo y no tiene valor fiscal', 105, finalY + 25, { align: 'center' })
  
  // Añadir información de contacto
  doc.setFontSize(8)
  doc.text('Trip Distance Calculator - Generado automáticamente', 105, 280, { align: 'center' })
  
  return doc
}

/**
 * Genera un PDF con el resumen de viajes para un período
 * @param {Array} trips - Lista de viajes
 * @param {string} period - Período del reporte (día, semana, mes)
 * @returns {jsPDF} - Documento PDF generado
 */
export const generateTripReportPDF = (trips, period) => {
  // Crear nuevo documento PDF
  const doc = new jsPDF()
  
  // Configuración de fuentes y colores
  const primaryColor = '#4F46E5'
  const secondaryColor = '#6B7280'
  
  // Añadir título
  doc.setFontSize(20)
  doc.setTextColor(primaryColor)
  doc.text(`REPORTE DE VIAJES - ${period.toUpperCase()}`, 105, 20, { align: 'center' })
  
  // Añadir fecha del reporte
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' })
  
  // Calcular estadísticas
  const totalTrips = trips.length
  const totalDistance = trips.reduce((sum, trip) => sum + trip.distance, 0)
  const totalRevenue = trips.reduce((sum, trip) => sum + trip.finalPrice, 0)
  
  // Añadir resumen
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Resumen', 20, 45)
  
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text('Total de viajes:', 20, 55)
  doc.text('Distancia total:', 20, 60)
  doc.text('Ingresos totales:', 20, 65)
  
  doc.setTextColor(0, 0, 0)
  doc.text(totalTrips.toString(), 80, 55)
  doc.text(`${totalDistance.toFixed(2)} millas`, 80, 60)
  doc.text(`$${totalRevenue.toFixed(2)}`, 80, 65)
  
  // Añadir tabla de viajes
  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text('Detalle de Viajes', 20, 80)
  
  const tableColumn = ['Fecha', 'Origen', 'Destino', 'Distancia', 'Duración', 'Precio']
  const tableRows = trips.map(trip => [
    new Date(trip.date).toLocaleDateString(),
    shortenAddress(trip.origin.address),
    shortenAddress(trip.destination.address),
    `${trip.distance.toFixed(2)} mi`,
    formatDuration(trip.duration),
    `$${trip.finalPrice.toFixed(2)}`
  ])
  
  // Generar tabla
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 85,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    }
  })
  
  // Añadir pie de página
  doc.setFontSize(8)
  doc.setTextColor(secondaryColor)
  doc.text('Trip Distance Calculator - Generado automáticamente', 105, 280, { align: 'center' })
  
  return doc
}

/**
 * Formatea la duración en segundos a un formato legible
 * @param {number} seconds - Duración en segundos
 * @returns {string} - Duración formateada
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

/**
 * Acorta una dirección para mostrarla en tablas
 * @param {string} address - Dirección completa
 * @returns {string} - Dirección acortada
 */
const shortenAddress = (address) => {
  if (!address) return ''
  if (address.length <= 30) return address
  
  // Intentar extraer solo la ciudad y estado
  const parts = address.split(',')
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`.trim()
  }
  
  return address.substring(0, 30) + '...'
}