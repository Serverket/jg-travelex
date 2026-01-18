import { useState, useEffect, useRef, useId, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'
import { tripService } from '../services/tripService'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { useToast } from '../context/ToastContext'
import ShareModal from '../components/ShareModal'
import {
  formatDurationBilingual,
  formatPriceLabel,
  buildShareMessage,
  buildWhatsAppLink,
  buildMailtoLink,
  ensureBilingualLocation
} from '../utils/share'

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

const ResponsiveField = ({ displayValue, fullValue }) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [tooltipPlacement, setTooltipPlacement] = useState('bottom')
  const [tooltipStyle, setTooltipStyle] = useState({ top: 0, left: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const hideTimerRef = useRef(null)
  const fieldRef = useRef(null)
  const tooltipRef = useRef(null)
  const tooltipId = useId()

  const resolvedDisplay = displayValue ?? 'N/A'
  const displayText = String(resolvedDisplay)
  const rawText = fullValue != null ? String(fullValue) : displayText
  const showIndicator = rawText.length > 18 && rawText !== 'N/A'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hoverQuery = window.matchMedia ? window.matchMedia('(hover: none)') : null

    const updateTouchState = () => {
      const hoverNone = hoverQuery ? hoverQuery.matches : false
      const hasTouch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)
      const fallbackTouch = typeof window !== 'undefined' && 'ontouchstart' in window
      setIsTouchDevice(Boolean(hoverNone || hasTouch || fallbackTouch))
    }

    updateTouchState()
    const listener = (event) => setIsTouchDevice(event.matches)
    if (hoverQuery) {
      if (typeof hoverQuery.addEventListener === 'function') {
        hoverQuery.addEventListener('change', listener)
        return () => hoverQuery.removeEventListener('change', listener)
      } else if (typeof hoverQuery.addListener === 'function') {
        hoverQuery.addListener(listener)
        return () => hoverQuery.removeListener(listener)
      }
    }
    return undefined
  }, [])

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const showTooltip = (autoHideMs) => {
    if (!showIndicator) return
    clearHideTimer()
    setTooltipPlacement('bottom')
    setIsTooltipVisible(true)
    if (autoHideMs) {
      hideTimerRef.current = setTimeout(() => {
        setIsTooltipVisible(false)
        hideTimerRef.current = null
      }, autoHideMs)
    }
  }

  const hideTooltip = () => {
    clearHideTimer()
    setIsTooltipVisible(false)
  }

  useEffect(() => () => clearHideTimer(), [])

  const updateTooltipPosition = () => {
    if (typeof window === 'undefined') return
    if (!isTooltipVisible || !fieldRef.current || !tooltipRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const preferredPlacement = spaceBelow >= tooltipRect.height + 12 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
    let top = preferredPlacement === 'bottom'
      ? rect.bottom + 8
      : rect.top - tooltipRect.height - 8
    let left = rect.left
    const horizontalPadding = 12
    const verticalPadding = 8

    if (left + tooltipRect.width > window.innerWidth - horizontalPadding) {
      left = window.innerWidth - tooltipRect.width - horizontalPadding
    }
    if (left < horizontalPadding) {
      left = horizontalPadding
    }

    if (top + tooltipRect.height > window.innerHeight - verticalPadding) {
      top = window.innerHeight - tooltipRect.height - verticalPadding
    }
    if (top < verticalPadding) {
      top = verticalPadding
    }

    setTooltipPlacement(preferredPlacement)
    setTooltipStyle({ top, left })
  }

  useLayoutEffect(() => {
    if (!isTooltipVisible) return undefined
    updateTooltipPosition()

    const handleScrollOrResize = () => updateTooltipPosition()
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isTooltipVisible])

  const handleIndicatorClick = (event) => {
    if (!showIndicator) return
    event.preventDefault()
    event.stopPropagation()
    if (isTooltipVisible) {
      hideTooltip()
    } else {
      showTooltip(4000)
    }
  }

  const handleHoverStart = () => showIndicator && showTooltip()
  const handleHoverEnd = () => showIndicator && hideTooltip()

  const handleContainerClick = (event) => {
    if (!showIndicator || !isTouchDevice) return
    handleIndicatorClick(event)
  }

  const showToggleButton = showIndicator && isTouchDevice

  const containerClass = `relative inline-flex max-w-[8rem] items-center gap-1 md:max-w-[12rem] lg:max-w-none ${showIndicator ? 'cursor-help' : ''}`
  const tooltipPlacementClass = tooltipPlacement === 'top'
    ? 'origin-bottom-left'
    : 'origin-top-left'

  const tooltipNode = (showIndicator && isTooltipVisible && typeof document !== 'undefined')
    ? createPortal(
      <span
        id={tooltipId}
        role="tooltip"
        ref={tooltipRef}
        className={`pointer-events-none fixed z-50 max-w-[22rem] rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs font-medium text-blue-50 shadow-lg shadow-blue-900/40 ${tooltipPlacementClass}`}
        style={{ top: tooltipStyle.top, left: tooltipStyle.left }}
      >
        {rawText}
      </span>,
      document.body
    )
    : null

  return (
    <>
      <span
        className={containerClass}
        ref={fieldRef}
        onMouseEnter={handleHoverStart}
        onMouseLeave={handleHoverEnd}
        onFocus={handleHoverStart}
        onBlur={handleHoverEnd}
        onClick={handleContainerClick}
        title={rawText}
        aria-describedby={showIndicator && isTooltipVisible ? tooltipId : undefined}
      >
        <span className="block truncate">{displayText}</span>
        {showToggleButton && (
          <>
            <button
              type="button"
              className="ml-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full border border-blue-200/50 bg-blue-500/10 text-[0.7rem] text-blue-100/80 shadow-sm transition hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/60 lg:hidden"
              onClick={handleIndicatorClick}
              aria-label={`Mostrar texto completo: ${rawText}`}
            >
              <span aria-hidden="true">🔍</span>
            </button>
          </>
        )}
        {showIndicator && !showToggleButton && (
          <span className="ml-1 hidden text-[0.75rem] text-blue-200/70 md:inline-flex" aria-hidden="true">🔍</span>
        )}
      </span>
      {tooltipNode}
    </>
  )
}

const Invoices = () => {
  const { user } = useAppContext()
  const toast = useToast()
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
  const [shareContext, setShareContext] = useState({ open: false, mode: 'whatsapp', payload: null })

  // Sort function that works for both orders and invoices
  const sortedItems = (items) => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      if (sortConfig.key === 'date') {
        // For invoices, prioritize invoice_date; for orders, prioritize created_at
        const dateA = activeTab === 'invoices'
          ? (a.invoice_date || a.created_at || new Date().toISOString())
          : (a.created_at || a.invoice_date || new Date().toISOString());
        const dateB = activeTab === 'invoices'
          ? (b.invoice_date || b.created_at || new Date().toISOString())
          : (b.created_at || b.invoice_date || new Date().toISOString());
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

  const extractTripShareData = (trip, fallbackAmount) => {
    if (!trip) {
      return {
        origin: ensureBilingualLocation(null),
        destination: ensureBilingualLocation(null),
        duration: formatDurationBilingual({ minutes: null }),
        price: formatPriceLabel(fallbackAmount)
      }
    }

    const origin = ensureBilingualLocation(trip.origin_address || trip.origin)
    const destination = ensureBilingualLocation(trip.destination_address || trip.destination)
    const durationMinutes = Number.isFinite(trip.duration_minutes)
      ? Number(trip.duration_minutes)
      : (() => {
        const rawDuration = trip.duration
        if (rawDuration == null) return null
        const numeric = Number.parseFloat(rawDuration)
        return Number.isFinite(numeric) ? numeric * 60 : null
      })()
    const durationLabel = formatDurationBilingual({ minutes: durationMinutes })
    const priceValue = trip.final_price ?? trip.price ?? fallbackAmount
    const priceLabel = formatPriceLabel(priceValue)

    return {
      origin,
      destination,
      duration: durationLabel,
      price: priceLabel
    }
  }

  const handleOpenShare = (mode, payload) => {
    setShareContext({ open: true, mode, payload })
  }

  const handleCloseShare = () => {
    setShareContext((prev) => ({ ...prev, open: false, payload: null }))
  }

  const handleSubmitShare = (recipient) => {
    if (!shareContext.payload) {
      handleCloseShare()
      return
    }
    const message = buildShareMessage(shareContext.payload)
    const link = shareContext.mode === 'whatsapp'
      ? buildWhatsAppLink(recipient, message)
      : buildMailtoLink(recipient, message)
    const target = shareContext.mode === 'whatsapp' ? '_blank' : '_self'
    window.open(link, target, 'noopener')
    handleCloseShare()
  }

  const shareMessagePreview = shareContext.payload ? buildShareMessage(shareContext.payload) : ''

  const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.722.45 3.338 1.237 4.736L2.25 21.75l5.184-1.212A9.708 9.708 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75s-4.365-9.75-9.75-9.75Z"
        strokeLinecap="round"
      />
      <path
        d="M8.97 9.332c.248-.536.59-.553.802-.553.211 0 .424-.005.612.287.248.372.79 1.159.87 1.236.08.077.132.18.026.316-.106.136-.398.458-.516.607-.137.17-.28.192-.51.064-.23-.128-.972-.358-1.852-1.106-.685-.59-1.147-1.319-1.282-1.548-.134-.23-.014-.354.115-.466.118-.1.264-.26.396-.408.132-.148.185-.248.264-.408Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )

  const MailIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.25" />
      <path d="m4.5 6 7.38 6.15a1.125 1.125 0 0 0 1.44 0L20.7 6" />
    </svg>
  )

  // Handle column header click for sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key
        ? prevConfig.direction === 'asc' ? 'desc' : 'asc'
        : key === 'date' ? 'desc' : 'asc' // Default to newest first for dates
    }));
  };

  // Load orders and invoices from API
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch orders based on user role
        let ordersResponse = [];
        if (user.role === 'admin') {
          // Admin sees all orders - pass all: true directly
          ordersResponse = await orderService.getOrders({ all: true });
        } else {
          // Regular users see only their orders
          ordersResponse = await orderService.getOrders({ user_id: user.id });
        }

        console.log('Orders response:', ordersResponse);
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
                const tripData = await tripService.getTripById(processedOrder.items[i].trip_id);
                if (tripData) {
                  console.log(`Fetched trip data for trip_id ${processedOrder.items[i].trip_id}:`, tripData);
                  // Normalize fields for UI compatibility
                  processedOrder.items[i].tripData = {
                    ...tripData,
                    origin: tripData.origin_address ?? tripData.origin,
                    destination: tripData.destination_address ?? tripData.destination,
                    price: tripData.final_price ?? tripData.price ?? processedOrder.items[i].amount ?? processedOrder.total_amount
                  };
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

        // Process and link invoices with orders - ensure complete trip data is included
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
          } else {
            // If no matching order found, try to fetch order data from API
            console.log(`No matching order found for invoice ${processedInvoice.id}, fetching from API...`);
            try {
              const fetchedOrder = await orderService.getOrderById(processedInvoice.orderId);
              if (fetchedOrder) {
                console.log('Fetched order data for invoice:', fetchedOrder);

                // Process the fetched order to ensure it has trip data
                const processedFetchedOrder = { ...fetchedOrder };

                // Fetch order items and trip data
                try {
                  const orderItems = await orderService.getOrderItems(processedFetchedOrder.id);
                  processedFetchedOrder.items = orderItems || [];
                } catch (err) {
                  console.error('Error fetching order items:', err);
                  processedFetchedOrder.items = [];
                }

                // Fetch trip data for each order item
                for (let i = 0; i < processedFetchedOrder.items.length; i++) {
                  if (!processedFetchedOrder.items[i].tripData && processedFetchedOrder.items[i].trip_id) {
                    try {
                      const tripData = await tripService.getTripById(processedFetchedOrder.items[i].trip_id);
                      if (tripData) {
                        console.log(`Fetched trip data for invoice trip_id ${processedFetchedOrder.items[i].trip_id}:`, tripData);
                        processedFetchedOrder.items[i].tripData = {
                          ...tripData,
                          origin: tripData.origin_address ?? tripData.origin,
                          destination: tripData.destination_address ?? tripData.destination,
                          price: tripData.final_price ?? tripData.price ?? processedFetchedOrder.items[i].amount ?? processedFetchedOrder.total_amount
                        };
                      }
                    } catch (tripError) {
                      console.error(`Error fetching trip data for invoice trip_id ${processedFetchedOrder.items[i].trip_id}:`, tripError);
                      processedFetchedOrder.items[i].tripData = {
                        id: processedFetchedOrder.items[i].trip_id,
                        origin: 'Error Loading Data',
                        destination: 'Error Loading Data',
                        distance: 'N/A',
                        duration: 'N/A',
                        price: processedFetchedOrder.items[i].amount || processedFetchedOrder.total_amount
                      };
                    }
                  }
                }

                // Attach processed order data to invoice
                processedInvoice.orderData = processedFetchedOrder;
                processedInvoices.push(processedInvoice);
              }
            } catch (fetchError) {
              console.error('Error fetching order data for invoice:', fetchError);
              // Create a minimal invoice without order data
              processedInvoice.orderData = {
                id: processedInvoice.orderId,
                total_amount: processedInvoice.total_amount || 'N/A',
                items: [{
                  tripData: {
                    origin: 'No disponible',
                    destination: 'No disponible',
                    distance: 'N/A',
                    duration: 'N/A',
                    price: processedInvoice.total_amount || 'N/A'
                  }
                }]
              };
              processedInvoices.push(processedInvoice);
            }
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
    return () => { };
  }, [user]);

  // Generar una nueva factura
  const handleCreateInvoice = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Ensure the order has complete trip data before creating invoice
      let processedOrder = { ...order };

      // If order items don't have trip data, fetch it
      if (processedOrder.items && processedOrder.items.length > 0) {
        for (let i = 0; i < processedOrder.items.length; i++) {
          if (!processedOrder.items[i].tripData && processedOrder.items[i].trip_id) {
            try {
              console.log(`Fetching trip data for order item trip_id ${processedOrder.items[i].trip_id} during invoice creation`);
              const tripData = await tripService.getTripById(processedOrder.items[i].trip_id);
              if (tripData) {
                processedOrder.items[i].tripData = {
                  ...tripData,
                  origin: tripData.origin_address ?? tripData.origin,
                  destination: tripData.destination_address ?? tripData.destination,
                  price: tripData.final_price ?? tripData.price ?? processedOrder.items[i].amount ?? processedOrder.total_amount
                };
                console.log('Trip data attached to order item for invoice creation:', processedOrder.items[i].tripData);
              }
            } catch (tripError) {
              console.error(`Error fetching trip data during invoice creation:`, tripError);
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
      }

      const currentDate = new Date();
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const invoiceData = {
        order_id: orderId,
        invoice_date: currentDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending'
      };

      const newInvoice = await invoiceService.createInvoice(invoiceData);

      // Add the new invoice to the list with complete processed order data
      const processedInvoice = { ...newInvoice, orderData: processedOrder };
      setInvoices(prev => [...prev, processedInvoice]);

      setSelectedOrderId(null);
      toast.success('Factura creada exitosamente');
    } catch (error) {
      console.error('Error al crear la factura:', error);
      toast.error('Error al crear la factura. Por favor intente nuevamente.');
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
      const origin = tripData?.origin_address || tripData?.origin || 'No disponible';
      const destination = tripData?.destination_address || tripData?.destination || 'No disponible';
      const distance = tripData?.distance_miles || tripData?.distance || 'N/A';
      const duration = tripData?.duration_minutes ? `${(tripData.duration_minutes / 60).toFixed(1)}` : (tripData?.duration || 'N/A');
      const price = tripData?.final_price || tripData?.price || orderData?.total_amount || 'N/A';
      const invoiceNumber = invoice.invoice_number || `INV-${invoice.id || 'NEW'}`;

      const doc = new jsPDF()

      // Encabezado
      doc.setFontSize(20)
      doc.text('JG TravelEx - Factura de Viaje', 105, 20, { align: 'center' })

      doc.setFontSize(12)
      doc.text(`Factura #: ${invoiceNumber || 'N/A'}`, 20, 40)
      doc.text(`Fecha: ${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() :
        invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : invoice.date ? new Date(invoice.date).toLocaleDateString() : 'N/A'}`, 20, 50)
      doc.text(`Orden #: ${invoice.order_id || invoice.orderId || 'N/A'}`, 20, 60)

      // Tabla de costos
      doc.setFontSize(14)
      doc.text('Detalles del Viaje', 20, 80)

      const tableColumn = ['Concepto', 'Valor']
      const tableRows = [
        ['Precio Base', `$${price}`],
        ['Distancia', `${distance} millas`],
        ['Duración', `${duration} horas`],
        ['Origen', origin],
        ['Destino', destination]
      ]

      doc.autoTable({
        startY: 90,
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
      doc.save(`factura-${invoiceNumber || 'nuevo'}.pdf`)
      console.log('PDF generated successfully');

    } catch (error) {
      console.error('Error al generar el PDF:', error)
      toast.error('Error al generar el PDF. Por favor intente nuevamente.')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/5 backdrop-blur"
          data-aos="fade-up"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Gestión de Facturas</h1>
              <p className="mt-2 max-w-2xl text-sm text-blue-100/75">
                Centralice todo el flujo de facturación: detecte órdenes listas, genere comprobantes y descargue PDFs con un par de clics.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-4 text-sm text-blue-100/70 shadow-inner shadow-blue-500/10">
              <p className="font-medium text-blue-100">Estado del Servicio</p>
              <p className="mt-1 text-xs text-blue-200/70">Pedidos y facturas se sincronizan cada 10 segundos en segundo plano.</p>
            </div>
          </div>
          {error && (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap ${activeTab === 'orders'
                ? 'border-blue-400/60 bg-blue-500/20 text-white shadow-inner shadow-blue-500/30'
                : 'border-white/10 bg-white/5 text-blue-100/70 hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white'
                }`}
            >
              Órdenes Pendientes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap ${activeTab === 'invoices'
                ? 'border-blue-400/60 bg-blue-500/20 text-white shadow-inner shadow-blue-500/30'
                : 'border-white/10 bg-white/5 text-blue-100/70 hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white'
                }`}
            >
              Facturas Emitidas
            </button>
          </div>
        </div>

        <div
          className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="120"
        >
          {activeTab === 'orders' ? (
            <div>
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold text-white">Órdenes pendientes de facturación</h2>
                <p className="mt-1 text-sm text-blue-100/70">Seleccione una orden para generar una factura al instante.</p>
              </div>

              {loading ? (
                <div className="space-y-3 px-6 py-10">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
                  ))}
                  <p className="text-xs text-blue-200/60">Cargando órdenes...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-blue-100/60">
                  No hay órdenes pendientes de facturación en este momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm text-blue-100/80">
                    <thead className="bg-white/5 text-blue-100 text-sm uppercase tracking-[0.12em]">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">ID</th>
                        <th
                          className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                          onClick={() => handleSort('date')}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            Fecha
                            {sortConfig.key === 'date' && (
                              <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Origen</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Destino</th>
                        <th
                          className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                          onClick={() => handleSort('price')}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            Precio
                            {sortConfig.key === 'price' && (
                              <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Estado</th>
                        <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedItems(orders).map((order) => {
                        const hasInvoice = invoices.some(invoice => invoice.order_id === order.id || invoice.orderId === order.id)
                        const primaryTrip = order.items?.[0]?.tripData
                        const originFull = primaryTrip?.origin ?? 'No disponible'
                        const destinationFull = primaryTrip?.destination ?? 'No disponible'
                        const originDisplay = formatAddress(originFull)
                        const destinationDisplay = formatAddress(destinationFull)
                        const sharePayload = extractTripShareData(primaryTrip, order.total_amount)

                        return (
                          <tr
                            key={order.id}
                            className={selectedOrderId === order.id ? 'bg-blue-500/10' : 'bg-white/5'}
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-white">
                              <ResponsiveField displayValue={order.id} fullValue={order.id} />
                            </td>
                            <td className="px-6 py-4 text-sm text-blue-100/80">
                              {order.created_at ? `${new Date(order.created_at).toLocaleDateString()} ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs text-blue-100/70">
                              <ResponsiveField displayValue={originDisplay} fullValue={originFull} />
                            </td>
                            <td className="px-6 py-4 text-xs text-blue-100/70">
                              <ResponsiveField displayValue={destinationDisplay} fullValue={destinationFull} />
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">
                              ${order.items && order.items[0]?.tripData?.price || order.total_amount || 0}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-inner shadow-blue-500/20 ${hasInvoice
                                  ? 'bg-emerald-500/20 text-emerald-200'
                                  : order.status === 'completed'
                                    ? 'bg-blue-500/20 text-blue-100'
                                    : 'bg-amber-400/20 text-amber-100'
                                  }`}
                              >
                                {hasInvoice ? 'Facturada' : order.status === 'completed' ? 'Completada' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenShare('whatsapp', sharePayload)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-500/25"
                                    title="Compartir por WhatsApp / Share via WhatsApp"
                                    aria-label="Compartir por WhatsApp / Share via WhatsApp"
                                  >
                                    <WhatsAppIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenShare('email', sharePayload)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/15 text-blue-100 transition hover:bg-blue-500/25"
                                    title="Compartir por correo / Share via email"
                                    aria-label="Compartir por correo / Share via email"
                                  >
                                    <MailIcon className="h-4 w-4" />
                                  </button>
                                </div>
                                {hasInvoice ? (
                                  <span className="text-xs text-blue-200/60">Facturada</span>
                                ) : (
                                  <button
                                    onClick={() => handleCreateInvoice(order.id)}
                                    className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20 hover:text-white whitespace-nowrap"
                                  >
                                    Generar factura
                                  </button>
                                )}
                              </div>
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
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold text-white">Facturas emitidas</h2>
                <p className="mt-1 text-sm text-blue-100/70">Revise el histórico de facturas y genere comprobantes en PDF.</p>
              </div>

              {loading ? (
                <div className="space-y-3 px-6 py-10">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="h-12 w-full animate-pulse rounded-xl bg-white/5" />
                  ))}
                  <p className="text-xs text-blue-200/60">Cargando facturas...</p>
                </div>
              ) : invoices.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-blue-100/60">
                  No hay facturas emitidas todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-sm text-blue-100/80">
                    <thead className="bg-white/5 text-blue-100 text-sm uppercase tracking-[0.12em]">
                      <tr>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">ID Factura</th>
                        <th
                          className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                          onClick={() => handleSort('date')}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            Fecha
                            {sortConfig.key === 'date' && (
                              <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Origen</th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Destino</th>
                        <th
                          className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                          onClick={() => handleSort('price')}
                        >
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            Monto
                            {sortConfig.key === 'price' && (
                              <span className="text-xs">
                                {sortConfig.direction === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </th>
                        <th className="px-6 py-4 font-semibold whitespace-nowrap">Estado</th>
                        <th className="px-6 py-4 text-right font-semibold whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedItems(invoices).map((invoice) => {
                        const invoiceIdentifier = invoice.invoice_number || invoice.id
                        const orderTrip = invoice.orderData?.items?.[0]?.tripData
                        const originFull = orderTrip?.origin ?? 'No disponible'
                        const destinationFull = orderTrip?.destination ?? 'No disponible'
                        const originDisplay = formatAddress(originFull)
                        const destinationDisplay = formatAddress(destinationFull)
                        const sharePayload = extractTripShareData(orderTrip, invoice.total_amount || invoice.orderData?.total_amount)

                        return (
                          <tr
                            key={invoice.id}
                            className="bg-white/5"
                          >
                            <td className="px-6 py-4 text-sm font-semibold text-white">#{invoice.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 text-sm text-blue-100/80">
                              {invoice.invoice_date
                                ? `${new Date(invoice.invoice_date).toLocaleDateString()} ${new Date(invoice.invoice_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : invoice.created_at
                                  ? `${new Date(invoice.created_at).toLocaleDateString()} ${new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs text-blue-100/70">
                              <ResponsiveField displayValue={originDisplay} fullValue={originFull} />
                            </td>
                            <td className="px-6 py-4 text-xs text-blue-100/70">
                              <ResponsiveField displayValue={destinationDisplay} fullValue={destinationFull} />
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">
                              ${invoice.total_amount || (invoice.orderData?.items && invoice.orderData.items[0]?.tripData?.price) || invoice.orderData?.total_amount || 0}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-inner shadow-blue-500/20 ${invoice.status === 'paid'
                                  ? 'bg-emerald-500/20 text-emerald-200'
                                  : 'bg-blue-500/20 text-blue-100'
                                  }`}
                              >
                                {invoice.status === 'paid' ? 'Pagada' : 'Emitida'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenShare('whatsapp', sharePayload)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-500/25"
                                    title="Compartir por WhatsApp / Share via WhatsApp"
                                    aria-label="Compartir por WhatsApp / Share via WhatsApp"
                                  >
                                    <WhatsAppIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenShare('email', sharePayload)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/15 text-blue-100 transition hover:bg-blue-500/25"
                                    title="Compartir por correo / Share via email"
                                    aria-label="Compartir por correo / Share via email"
                                  >
                                    <MailIcon className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => generateInvoicePDF(invoice)}
                                  disabled={isGeneratingInvoice}
                                  className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-100 transition hover:bg-blue-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-blue-200/40 whitespace-nowrap"
                                >
                                  {isGeneratingInvoice ? 'Generando…' : 'Descargar PDF'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ShareModal
        open={shareContext.open}
        mode={shareContext.mode}
        onClose={handleCloseShare}
        onSubmit={handleSubmitShare}
        messagePreview={shareMessagePreview}
      />
    </>
  )
}

export default Invoices
