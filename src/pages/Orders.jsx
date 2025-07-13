import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'

const Orders = () => {
  const { currentUser, orders: contextOrders, setOrders } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all', 'pending', 'completed'
  const [filteredOrders, setFilteredOrders] = useState([])

  // Load orders directly from API to ensure we have the latest data
  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching orders for user:', currentUser.id);
        const response = await orderService.getOrdersByUserId(currentUser.id);
        console.log('Orders fetched:', response);
        
        // Update both local state and context
        setOrders(response); // Update the context
      } catch (err) {
        console.error('Error loading orders:', err);
        setError('Error loading orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [currentUser, setOrders]);

  // Filter orders based on status
  useEffect(() => {
    if (orderStatusFilter === 'all') {
      setFilteredOrders(contextOrders);
    } else {
      setFilteredOrders(contextOrders.filter(order => order.status === orderStatusFilter));
    }
  }, [contextOrders, orderStatusFilter]);

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Origin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
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
                        {order.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
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
