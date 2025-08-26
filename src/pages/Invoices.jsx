import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'
import { tripService } from '../services/tripService'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Helper function to format address for display, showing lot number and street name
const formatAddress = (address, maxLength = 30) => {
  if (!address) return 'No disponible';
  
  // For addresses like "8904, West Dallas Street, Menomonee River Hills"
  // We want to show "8904, West Dallas Street..."
  const parts = address.split(',');
  
  if (parts.length > 1) {
    // Show first two parts (lot number + street name) if available
    const displayPart = parts.length >= 2 ? 
      `${parts[0].trim()}${parts[1] ? ', ' + parts[1].trim() : ''}` : 
      parts[0].trim();
      
    if (displayPart.length > maxLength) {
      return `${displayPart.substring(0, maxLength)}...`;
    }
    
    return parts.length > 2 ? `${displayPart}...` : displayPart;
  }
  
  // If no commas, just truncate if too long
  return address.length > maxLength ? 
    `${address.substring(0, maxLength)}...` : 
    address;
};

const Invoices = () => {
  const { user } = useAppContext()
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [activeTab, setActiveTab] = useState('orders')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Sorting states
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc' // Newest first by default
  })

  // Sort function that works for both orders and invoices
  const sortedItems = (items) => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      if (sortConfig.key === 'date') {
        // For orders and invoices, prioritize created_at for accurate creation time
        const dateA = a.created_at || a.issue_date || new Date().toISOString();
        const dateB = b.created_at || b.issue_date || new Date().toISOString();
        return sortConfig.direction === 'asc' 
          ? new Date(dateA) - new Date(dateB)
          : new Date(dateB) - new Date(dateA);
      } else if (sortConfig.key === 'price') {
        // Price sorting needs to handle both orders and invoices differently
        if (activeTab === 'orders') {
          // For orders
          const priceA = a.items && a.items[0]?.tripData?.price || a.total_amount || 0;
          const priceB = b.items && b.items[0]?.tripData?.price || b.total_amount || 0;
          return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
        } else {
          // For invoices - use invoice-specific price path
          const priceA = a.total_amount || (a.orderData?.items && a.orderData.items[0]?.tripData?.price) || 
                        (a.orderData?.total_amount) || 0;
          const priceB = b.total_amount || (b.orderData?.items && b.orderData.items[0]?.tripData?.price) || 
                        (b.orderData?.total_amount) || 0;
          return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
        }
      }
      return 0;
    });
  };

  // Handle column header click for sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key 
        ? prevConfig.direction === 'asc' ? 'desc' : 'asc'
        : key === 'date' ? 'desc' : 'asc' // Default to newest first for dates
    }));
  };
  
  // Load orders and invoices directly from API when component mounts or user changes
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch orders based on user role
        let ordersResponse = [];
        if (user.role === 'admin') {
          ordersResponse = await orderService.getOrders();
        } else {
          ordersResponse = await orderService.getOrders({
            filters: { user_id: user.id }
          });
        }
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
          
          // Fetch order items and trip data
          if (processedOrder.id) {
            try {
              const orderItems = await orderService.getOrderItems(processedOrder.id);
              processedOrder.items = orderItems || [];
            } catch (err) {
              console.error('Error fetching order items:', err);
              processedOrder.items = [];
            }
          }
          
          // Fetch trip data for each order item if missing
          for (let i = 0; i < processedOrder.items.length; i++) {
            if (!processedOrder.items[i].tripData && processedOrder.items[i].trip_id) {
              try {
                // Actually fetch trip data from API
                const tripData = await tripService.getTrip(processedOrder.items[i].trip_id);
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

        // Fetch invoices based on user role
        let invoicesResponse = [];
        if (user.role === 'admin') {
          invoicesResponse = await invoiceService.getInvoices();
        } else {
          // Filter invoices by user's orders
          invoicesResponse = await invoiceService.getInvoices();
          const userOrderIds = processedOrders.map(o => o.id);
          invoicesResponse = invoicesResponse.filter(inv => 
            userOrderIds.includes(inv.order_id)
          );
        }
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
    
    // Clean up function (removed auto-refresh for now)
    return () => {};
  }, [user]);

  // Generar una nueva factura
  const handleCreateInvoice = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      const invoiceData = {
        order_id: orderId,
        invoice_number: `INV-${Date.now()}`,
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        total_amount: order.total_amount || order.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
      };
      
      const newInvoice = await invoiceService.createInvoice(invoiceData);
      
      // Add the new invoice to the list with order data
      const processedInvoice = { ...newInvoice, orderData: order };
      setInvoices(prev => [...prev, processedInvoice]);
      
      setSelectedOrderId(null);
      alert('Invoice created successfully');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    }
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
          const fetchedOrders = await orderService.getOrders({
            filters: { id: invoice.order_id || invoice.orderId }
          });
          const fetchedOrder = fetchedOrders?.[0];
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
            tripData = await tripService.getTrip(orderItem.trip_id);
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
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('date')}
                      >
                        Fecha {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('price')}
                      >
                        Precio {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedItems(orders).map((order) => {
                      // Check if order already has an invoice
                      const hasInvoice = invoices.some(invoice => invoice.order_id === order.id || invoice.orderId === order.id);
                      
                      return (
                        <tr key={order.id} className={selectedOrderId === order.id ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() + ' ' + new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={order.items && order.items[0]?.tripData?.origin || 'No origin'}>
                            {formatAddress(order.items && order.items[0]?.tripData?.origin)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={order.items && order.items[0]?.tripData?.destination || 'No destination'}>
                            {formatAddress(order.items && order.items[0]?.tripData?.destination)}
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
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('date')}
                      >
                        Fecha {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('price')}
                      >
                        Monto {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedItems(invoices).map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() + ' ' + new Date(invoice.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() + ' ' + new Date(invoice.issue_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.origin || 'No origin'}>
                          {formatAddress(invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.origin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.destination || 'No destination'}>
                          {formatAddress(invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.destination)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${invoice.total_amount || (invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.price) || invoice.orderData?.total_amount || 0}
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
