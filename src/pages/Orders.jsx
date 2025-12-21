import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'
import { tripService } from '../services/tripService'
import { invoiceService } from '../services/invoiceService'

const Orders = () => {
  const { user } = useAppContext()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all', 'pending', 'completed', 'canceled'
  const [filteredOrders, setFilteredOrders] = useState([])
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc' // Newest first by default
  })

  // Load orders with periodic refresh
  useEffect(() => {
    const fetchOrders = async (isInitial = true) => {
      if (!user) return;
      
      try {
        if (isInitial) {
          setLoading(true);
        }
        setError(null);
        
        // Fetch orders based on user role
        let fetchedOrders = [];
        if (user.role === 'admin') {
          // Admin sees all orders - pass all: true directly
          fetchedOrders = await orderService.getOrders({ all: true });
        } else {
          // Regular users see only their orders
          fetchedOrders = await orderService.getOrders({ user_id: user.id });
        }
        
        console.log('Fetched orders:', fetchedOrders);
        
        // Fetch trip data for each order
        const ordersWithTrips = await Promise.all(
          fetchedOrders.map(async (order) => {
            try {
              // Get order items to find associated trips
              const orderItems = await orderService.getOrderItems(order.id);
              const trips = await Promise.all(
                orderItems.map(item => tripService.getTripById(item.trip_id))
              );
              return { ...order, trips, orderItems };
            } catch (err) {
              console.error('Error fetching trip data for order:', order.id, err);
              return { ...order, trips: [], orderItems: [] };
            }
          })
        );
        
        setOrders(ordersWithTrips);
      } catch (err) {
        console.error('Error loading orders:', err);
        if (isInitial) {
          setError('Error al cargar pedidos. Por favor intente nuevamente.');
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };
    
    if (user) {
      // Initial fetch with loading indicator
      fetchOrders(true);
      
      // Set up periodic refresh every 10 seconds (silent background updates)
      const intervalId = setInterval(() => {
        console.log('Orders: Background data refresh triggered');
        fetchOrders(false); // Silent refresh - no loading indicator
      }, 10000);
      
      // Cleanup interval on unmount
      return () => {
        console.log('Orders: Cleaning up refresh interval');
        clearInterval(intervalId);
      };
    }
  }, [user]);

  // Sort function that works for both orders and invoices
  const sortedItems = (items) => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = a.created_at || new Date().toISOString();
        const dateB = b.created_at || new Date().toISOString();
        return sortConfig.direction === 'asc' 
          ? new Date(dateA) - new Date(dateB)
          : new Date(dateB) - new Date(dateA);
      } else if (sortConfig.key === 'price') {
        const priceA = a.total_amount || 0;
        const priceB = b.total_amount || 0;
        return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
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

  // Handle order status update
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await orderService.updateOrder(orderId, { status: newStatus });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // If order is completed, create an invoice
      if (newStatus === 'completed') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const currentDate = new Date();
          const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
          const invoiceData = {
            order_id: orderId,
            invoice_date: currentDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending'
          };
          await invoiceService.createInvoice(invoiceData);
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Error al actualizar el estado del pedido');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Gestión de Pedidos</h1>
      
      {/* Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-gray-700">Filtrar por estado:</span>
        <select 
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        >
          <option value="all">Todos los pedidos</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completados</option>
          <option value="canceled">Cancelados</option>
        </select>
      </div>
      
      {/* Orders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Pedidos</h2>
          <p className="mt-1 text-sm text-gray-500">Lista completa de todos tus pedidos.</p>
        </div>
        
        {loading && (
          <div className="px-4 py-5 sm:p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Cargando pedidos...</p>
          </div>
        )}
        
        {error && (
          <div className="px-4 py-5 sm:p-6 text-center text-red-500">
            {error}
          </div>
        )}
        
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No se encontraron pedidos.
          </div>
        )}
        
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido #</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Fecha {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viajes</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      Monto Total {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems(filteredOrders).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 break-words md:px-6 md:whitespace-nowrap">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 md:px-6 md:whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="max-w-xs space-y-1 text-xs md:max-w-sm">
                        {order.trips?.length > 0 ? (
                          order.trips.map((trip, index) => (
                            <div key={index} className="break-words">
                              {trip.origin} → {trip.destination}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">Sin viajes</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 md:px-6 md:whitespace-nowrap">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm md:px-6 md:whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          order.status === 'canceled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {order.status === 'completed' ? 'Completado' : 
                         order.status === 'canceled' ? 'Cancelado' : 
                         'Pendiente'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 text-sm md:px-6 md:whitespace-nowrap">
                        {order.status === 'pending' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Completar
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'canceled')}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders
