import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Invoices = () => {
  const { orders, invoices, createInvoice } = useAppContext()
  const [activeTab, setActiveTab] = useState('orders') // 'orders' o 'invoices'
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)

  // Generar una nueva factura
  const handleCreateInvoice = (orderId) => {
    createInvoice(orderId)
    setSelectedOrderId(null)
  }

  // Generar PDF de la factura
  const generateInvoicePDF = (invoice) => {
    setIsGeneratingInvoice(true)
    
    try {
      const doc = new jsPDF()
      
      // Encabezado
      doc.setFontSize(20)
      doc.text('JGEx - Factura de Viaje', 105, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`Factura #: ${invoice.id}`, 20, 40)
      doc.text(`Fecha: ${new Date(invoice.date).toLocaleDateString()}`, 20, 50)
      doc.text(`Orden #: ${invoice.orderId}`, 20, 60)
      
      // Información del viaje
      doc.setFontSize(14)
      doc.text('Detalles del Viaje', 20, 80)
      
      doc.setFontSize(12)
      doc.text(`Origen: ${invoice.orderData.tripData.origin}`, 20, 90)
      doc.text(`Destino: ${invoice.orderData.tripData.destination}`, 20, 100)
      doc.text(`Distancia: ${invoice.orderData.tripData.distance} millas`, 20, 110)
      doc.text(`Duración: ${invoice.orderData.tripData.duration} horas`, 20, 120)
      
      // Tabla de costos
      doc.setFontSize(14)
      doc.text('Resumen de Costos', 20, 140)
      
      const tableColumn = ['Concepto', 'Valor']
      const tableRows = [
        ['Precio Base', `$${invoice.orderData.tripData.price}`],
      ]
      
      doc.autoTable({
        startY: 150,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [66, 135, 245] }
      })
      
      // Total
      const finalY = doc.lastAutoTable.finalY + 10
      doc.setFontSize(16)
      doc.text(`Total: $${invoice.orderData.tripData.price}`, 150, finalY, { align: 'right' })
      
      // Pie de página
      doc.setFontSize(10)
      doc.text('Esta factura es un documento informativo y no tiene valor fiscal.', 105, 280, { align: 'center' })
      
      // Guardar o abrir el PDF
      doc.save(`factura-${invoice.id}.pdf`)
    } catch (error) {
      console.error('Error al generar el PDF:', error)
      alert('Error al generar el PDF. Por favor intente nuevamente.')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Gestión de Facturas</h1>
      
      {/* Pestañas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Órdenes Pendientes
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'invoices' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Facturas Emitidas
          </button>
        </nav>
      </div>
      
      {/* Contenido de la pestaña activa */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {activeTab === 'orders' ? (
          <div>
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Órdenes Pendientes de Facturación</h2>
              <p className="mt-1 text-sm text-gray-500">Seleccione una orden para generar una factura.</p>
            </div>
            
            {orders.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No hay órdenes pendientes de facturación.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => {
                      // Verificar si ya existe una factura para esta orden
                      const hasInvoice = invoices.some(invoice => invoice.orderId === order.id)
                      
                      return (
                        <tr key={order.id} className={selectedOrderId === order.id ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.tripData.origin}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.tripData.destination}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${order.tripData.price}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {order.status === 'completed' ? 'Completada' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {hasInvoice ? (
                              <span className="text-gray-400">Facturada</span>
                            ) : (
                              <button
                                onClick={() => handleCreateInvoice(order.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Generar Factura
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Facturas Emitidas</h2>
              <p className="mt-1 text-sm text-gray-500">Listado de todas las facturas generadas.</p>
            </div>
            
            {invoices.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No hay facturas emitidas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Factura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Orden</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invoice.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.orderData.tripData.origin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.orderData.tripData.destination}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${invoice.orderData.tripData.price}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {invoice.status === 'paid' ? 'Pagada' : 'Emitida'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => generateInvoicePDF(invoice)}
                            disabled={isGeneratingInvoice}
                            className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                          >
                            {isGeneratingInvoice ? 'Generando...' : 'Descargar PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Invoices