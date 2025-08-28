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

  // Load orders directly from API to ensure we have the latest data
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch orders based on user role
        let fetchedOrders = [];
        if (user.role === 'admin') {
          // Admin sees all orders
          fetchedOrders = await orderService.getOrders();
        } else {
          // Regular users see only their orders
          fetchedOrders = await orderService.getOrders({
            filters: { user_id: user.id }
          });
        }
        
        // Fetch trip data for each order
        const ordersWithTrips = await Promise.all(
          fetchedOrders.map(async (order) => {
            try {
              // Get order items to find associated trips
              const orderItems = await orderService.getOrderItems(order.id);
              const trips = await Promise.all(
                orderItems.map(item => tripService.getTrip(item.trip_id))
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
        setError('Error loading orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [user]);

  // Filter orders based on status
  useEffect(() => {
    if (orderStatusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === orderStatusFilter));
    }
  }, [orders, orderStatusFilter]);

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
      setError('Failed to update order status');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
      
      {/* Filter Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-gray-700">Filter by status:</span>
        <select 
          value={orderStatusFilter}
          onChange={(e) => setOrderStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>
      
      {/* Orders List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Orders</h2>
          <p className="mt-1 text-sm text-gray-500">Full list of all your orders.</p>
        </div>
        
        {loading && (
          <div className="px-4 py-5 sm:p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading orders...</p>
          </div>
        )}
        
        {error && (
          <div className="px-4 py-5 sm:p-6 text-center text-red-500">
            {error}
          </div>
        )}
        
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
            No orders found.
          </div>
        )}
        
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trips</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs">
                        {order.trips?.length > 0 ? (
                          order.trips.map((trip, index) => (
                            <div key={trip.id} className="text-xs mb-1">
                              {trip.origin} → {trip.destination}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">No trips</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          order.status === 'canceled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {order.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'canceled')}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Cancel
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
