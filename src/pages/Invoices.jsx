import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'
import { tripService } from '../services/tripService'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Invoices = () => {
  const { currentUser, orders, invoices, createInvoice, setOrders, setInvoices } = useAppContext()
  const [activeTab, setActiveTab] = useState('orders') // 'orders' o 'invoices'
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load orders and invoices directly from API when component mounts or currentUser changes
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch orders
        console.log('Fetching orders for user:', currentUser.id);
        const ordersResponse = await orderService.getOrdersByUserId(currentUser.id);
        console.log('Orders fetched:', ordersResponse);
        
        // Process orders - make sure trip data is attached and accessible
        const processedOrders = [];
        for (const order of ordersResponse) {
          // Make a copy of the order to avoid reference issues
          const processedOrder = { ...order };
          
          // Initialize items array if needed
          if (!processedOrder.items) {
            processedOrder.items = [];
          }
          
          // Fetch trip data for each order item if missing
          for (let i = 0; i < processedOrder.items.length; i++) {
            if (!processedOrder.items[i].tripData && processedOrder.items[i].trip_id) {
              try {
                // Actually fetch trip data from API
                const tripData = await tripService.getTripById(processedOrder.items[i].trip_id);
                if (tripData) {
                  console.log(`Fetched trip data for trip_id ${processedOrder.items[i].trip_id}:`, tripData);
                  processedOrder.items[i].tripData = tripData;
                } else {
                  // Fallback if trip not found
                  console.warn(`No trip data found for trip_id ${processedOrder.items[i].trip_id}, using placeholder`);
                  processedOrder.items[i].tripData = {
                    id: processedOrder.items[i].trip_id,
                    origin: 'Pending Data',
                    destination: 'Pending Data',
                    distance: 'N/A',
                    duration: 'N/A',
                    price: processedOrder.items[i].amount || processedOrder.total_amount
                  };
                }
              } catch (tripError) {
                console.error(`Error fetching trip data for trip_id ${processedOrder.items[i].trip_id}:`, tripError);
                // Fallback on error
                processedOrder.items[i].tripData = {
                  id: processedOrder.items[i].trip_id,
                  origin: 'Error Loading Data',
                  destination: 'Error Loading Data',
                  distance: 'N/A',
                  duration: 'N/A',
                  price: processedOrder.items[i].amount || processedOrder.total_amount
                };
              }
            }
          }
          
          // Add processed order
          processedOrders.push(processedOrder);
        }

        // Update orders in context with processed data
        setOrders(processedOrders);

        // Fetch all invoices
        const invoicesResponse = await invoiceService.getAllInvoices();
        console.log('Invoices fetched:', invoicesResponse);

        // Process and link invoices with orders
        const processedInvoices = [];
        for (const invoice of invoicesResponse) {
          // Make a copy of the invoice
          const processedInvoice = { ...invoice };
          
          // Convert orderIds to be consistent across frontend and API
          processedInvoice.orderId = invoice.order_id || invoice.orderId;
          
          // Find the matching order
          const matchingOrder = processedOrders.find(order => order.id === processedInvoice.orderId);
          
          if (matchingOrder) {
            // Attach order data to invoice
            processedInvoice.orderData = matchingOrder;
            processedInvoices.push(processedInvoice);
          }
        }

        // Update invoices in context with processed data
        setInvoices(processedInvoices);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error loading orders and invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up regular refresh interval (every 30 seconds)
    const refreshInterval = setInterval(fetchData, 30000);
    
    // Clean up the interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [currentUser, setOrders, setInvoices]);

  // Generar una nueva factura
  const handleCreateInvoice = (orderId) => {
    createInvoice(orderId)
    setSelectedOrderId(null)
  }

  // Generar PDF de la factura
  const generateInvoicePDF = async (invoice) => {
    setIsGeneratingInvoice(true)
    
    try {
      console.log('Generating PDF for invoice:', invoice);
      
      // First, ensure we have full order and trip data
      let orderData = invoice.orderData;
      let tripData = null;
      
      // If orderData is missing, try to fetch it from the API
      if (!orderData) {
        console.log('OrderData missing, fetching from API...');
        try {
          // First get the order
          const fetchedOrder = await orderService.getOrderById(invoice.order_id || invoice.orderId);
          if (fetchedOrder) {
            orderData = fetchedOrder;
            console.log('Fetched order data:', orderData);
          }
        } catch (fetchError) {
          console.error('Error fetching order data for PDF:', fetchError);
        }
      }
      
      // Now get the trip data from order items
      if (orderData?.items && orderData.items.length > 0) {
        const orderItem = orderData.items[0]; // Get first item
        
        // Check if tripData already exists on the item
        if (orderItem.tripData) {
          tripData = orderItem.tripData;
          console.log('Found tripData in order item:', tripData);
        }
        // If not, try to fetch it
        else if (orderItem.trip_id) {
          try {
            tripData = await tripService.getTripById(orderItem.trip_id);
            console.log(`Fetched trip data for trip_id ${orderItem.trip_id}:`, tripData);
          } catch (tripError) {
            console.error(`Error fetching trip data for trip_id ${orderItem.trip_id}:`, tripError);
          }
        }
      }
      
      // Safety fallbacks for missing data
      const origin = tripData?.origin || 'No disponible';
      const destination = tripData?.destination || 'No disponible';
      const distance = tripData?.distance || 'N/A';
      const duration = tripData?.duration || 'N/A';
      const price = tripData?.price || orderData?.total_amount || 'N/A';
      const invoiceNumber = invoice.invoice_number || `INV-${invoice.id || 'NEW'}`;
      
      const doc = new jsPDF()
      
      // Encabezado
      doc.setFontSize(20)
      doc.text('JGEx - Factura de Viaje', 105, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`Factura #: ${invoice.id || invoice.invoice_number || 'N/A'}`, 20, 40)
      doc.text(`Fecha: ${invoice.date ? new Date(invoice.date).toLocaleDateString() : 
               invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A'}`, 20, 50)
      doc.text(`Orden #: ${invoice.order_id || invoice.orderId || 'N/A'}`, 20, 60)
      
      // Información del viaje
      doc.setFontSize(14)
      doc.text('Detalles del Viaje', 20, 80)
      
      doc.setFontSize(12)
      doc.text(`Origen: ${origin}`, 20, 90)
      doc.text(`Destino: ${destination}`, 20, 100)
      doc.text(`Distancia: ${distance} millas`, 20, 110)
      doc.text(`Duración: ${duration} horas`, 20, 120)
      
      // Tabla de costos
      doc.setFontSize(14)
      doc.text('Resumen de Costos', 20, 140)
      
      const tableColumn = ['Concepto', 'Valor']
      const tableRows = [
        ['Precio Base', `$${price}`],
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
      doc.text(`Total: $${price}`, 150, finalY, { align: 'right' })
      
      // Pie de página
      doc.setFontSize(10)
      doc.text('Esta factura es un documento informativo y no tiene valor fiscal.', 105, 280, { align: 'center' })
      
      // Guardar o abrir el PDF
      doc.save(`factura-${invoice.id || invoice.invoice_number || 'nuevo'}.pdf`)
      console.log('PDF generated successfully');
      
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
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.items && order.items[0]?.tripData?.origin || 'No origin'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.items && order.items[0]?.tripData?.destination || 'No destination'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${order.items && order.items[0]?.tripData?.price || order.total_amount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${hasInvoice ? 'bg-green-100 text-green-800' : (order.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800')}`}>
                              {hasInvoice ? 'Facturada' : (order.status === 'completed' ? 'Completada' : 'Pendiente')}
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
                          {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : (invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.order_id || invoice.orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.origin || 'No origin'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.destination || 'No destination'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.price || invoice.orderData?.total_amount || 0}
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