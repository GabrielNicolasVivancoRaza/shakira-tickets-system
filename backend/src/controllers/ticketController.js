const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');

// @desc    Obtener todos los tickets con filtros
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { 
      search, 
      puntoTrabajo, 
      impreso, 
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Filtro de búsqueda
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'First Name': searchRegex },
        { 'Last Name': searchRegex },
        { 'Email': searchRegex },
        { 'Seat': searchRegex },
        { 'Numero de Cedula:': searchRegex },
        { 'Ticket ID': searchRegex }
      ];
    }

    // Filtro por punto de trabajo (para staff e impresor)
    if (req.user.rol === 'staff' && req.user.puntoTrabajo) {
      query.puntoTrabajo = req.user.puntoTrabajo;
    } else if (req.user.rol === 'impresor') {
      // Impresor solo ve tickets impresos de su punto de trabajo
      query.impreso = true;
      query.puntoTrabajo = req.user.puntoTrabajo;
    } else if (puntoTrabajo && req.user.rol === 'jefe') {
      query.puntoTrabajo = puntoTrabajo;
    }

    // Filtro por estado de impresión
    if (impreso !== undefined) {
      query.impreso = impreso === 'true';
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('usuarioResponsable', 'nombre usuario')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Imprimir ticket
// @route   POST /api/tickets/:id/print
// @access  Private
const printTicket = async (req, res) => {
  try {
    const { quienRetira, quienOtro, celular } = req.body;
    const ticketId = req.params.id;

    if (!quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira y celular son campos obligatorios'
      });
    }

    if (quienRetira === 'Otro' && !quienOtro) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar quién retira cuando selecciona "Otro"'
      });
    }

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Solo jefe puede reimprimir tickets ya impresos
    if (ticket.impreso && req.user.rol !== 'jefe') {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya fue impreso'
      });
    }

    // Actualizar ticket
    ticket.impreso = true;
    ticket.fechaImpresion = new Date();
    ticket.usuarioResponsable = req.user._id;
    ticket.puntoTrabajo = req.user.puntoTrabajo;
    ticket.quienRetira = quienRetira;
    ticket.quienOtro = quienRetira === 'Otro' ? quienOtro : undefined;
    ticket.celular = celular;

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket impreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Reimprimir ticket
// @route   POST /api/tickets/:id/reprint
// @access  Private (solo jefe e impresor)
const reprintTicket = async (req, res) => {
  try {
    const { motivo } = req.body;
    const ticketId = req.params.id;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de reimpresión es obligatorio'
      });
    }

    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    if (!ticket.impreso) {
      return res.status(400).json({
        success: false,
        message: 'No se puede reimprimir un ticket que no ha sido impreso'
      });
    }

    // Agregar reimpresión al historial
    ticket.reimpresiones.push({
      fecha: new Date(),
      motivo,
      usuario: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket reimpreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al reimprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener tickets por transaction ID
// @route   GET /api/tickets/transaction/:transactionId
// @access  Private
const getTicketsByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const tickets = await Ticket.find({ transactionId })
      .populate('usuarioResponsable', 'nombre usuario')
      .sort({ seat: 1 });

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron tickets para esta transacción'
      });
    }

    res.json({
      success: true,
      tickets
    });

  } catch (error) {
    console.error('Error al obtener tickets por transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de tickets (INTEGRADO CON IMPRESION REQUESTS)
// @route   GET /api/tickets/stats
// @access  Private (solo jefe)
const getTicketStats = async (req, res) => {
  try {
    const ImpresionRequest = require('../models/ImpresionRequest');
    const { puntoTrabajo, fechaInicio, fechaFin } = req.query;

    const matchQuery = {};
    const impresionMatchQuery = {};
    
    if (puntoTrabajo) {
      matchQuery.puntoTrabajo = puntoTrabajo;
      impresionMatchQuery.puntoTrabajo = puntoTrabajo;
    }

    // Filtros de fecha para tickets tradicionales
    if (fechaInicio || fechaFin) {
      matchQuery.fechaImpresion = {};
      if (fechaInicio) {
        matchQuery.fechaImpresion.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        matchQuery.fechaImpresion.$lte = new Date(fechaFin);
      }
    }

    // Filtros de fecha para impresion requests
    if (fechaInicio || fechaFin) {
      impresionMatchQuery.fechaProcesado = {};
      if (fechaInicio) {
        impresionMatchQuery.fechaProcesado.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        impresionMatchQuery.fechaProcesado.$lte = new Date(fechaFin);
      }
    }

    const [
      totalTickets, 
      ticketsImpresosTradicional, 
      impresionRequestsCompletadas,
      ticketsPorDiaTradicional,
      impresionRequestsPorDia,
      ticketsPorPuntoTradicional,
      impresionRequestsPorPunto
    ] = await Promise.all([
      // Total de tickets en el sistema
      Ticket.countDocuments(),
      
      // Tickets impresos de forma tradicional
      Ticket.countDocuments({ impreso: true, ...matchQuery }),
      
      // Peticiones de impresión completadas
      ImpresionRequest.countDocuments({ 
        estado: 'completada', 
        ...impresionMatchQuery 
      }),
      
      // Evolución diaria tickets tradicionales
      Ticket.aggregate([
        { $match: { impreso: true, ...matchQuery } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$fechaImpresion" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Evolución diaria impresion requests
      ImpresionRequest.aggregate([
        { 
          $match: { 
            estado: 'completada', 
            fechaProcesado: { $exists: true },
            ...impresionMatchQuery 
          } 
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$fechaProcesado" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Tickets por punto de trabajo tradicional
      Ticket.aggregate([
        { $match: { impreso: true } },
        {
          $group: {
            _id: "$puntoTrabajo",
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Impresion requests por punto de trabajo
      ImpresionRequest.aggregate([
        { $match: { estado: 'completada' } },
        {
          $group: {
            _id: "$puntoTrabajo",
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Combinar datos de ambas fuentes
    const ticketsImpresos = ticketsImpresosTradicional + impresionRequestsCompletadas;
    const porcentajeEntregados = totalTickets > 0 ? (ticketsImpresos / totalTickets) * 100 : 0;
    const ticketsRestantes = totalTickets - ticketsImpresos;

    // Combinar evolución diaria
    const evolucionDiariaMap = new Map();
    
    ticketsPorDiaTradicional.forEach(item => {
      evolucionDiariaMap.set(item._id, (evolucionDiariaMap.get(item._id) || 0) + item.count);
    });
    
    impresionRequestsPorDia.forEach(item => {
      evolucionDiariaMap.set(item._id, (evolucionDiariaMap.get(item._id) || 0) + item.count);
    });

    const evolucionDiaria = Array.from(evolucionDiariaMap.entries())
      .map(([fecha, count]) => ({ _id: fecha, count }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Combinar tickets por punto de trabajo
    const ticketsPorPuntoMap = new Map();
    
    ticketsPorPuntoTradicional.forEach(item => {
      const punto = item._id || 'Sin asignar';
      ticketsPorPuntoMap.set(punto, (ticketsPorPuntoMap.get(punto) || 0) + item.count);
    });
    
    impresionRequestsPorPunto.forEach(item => {
      const punto = item._id || 'Sin asignar';
      ticketsPorPuntoMap.set(punto, (ticketsPorPuntoMap.get(punto) || 0) + item.count);
    });

    const ticketsPorPunto = Array.from(ticketsPorPuntoMap.entries())
      .map(([punto, count]) => ({ _id: punto, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      stats: {
        totalTickets,
        ticketsImpresos,
        ticketsRestantes,
        porcentajeEntregados: Math.round(porcentajeEntregados * 100) / 100,
        evolucionDiaria,
        ticketsPorPunto,
        detalles: {
          ticketsTradicionales: ticketsImpresosTradicional,
          impresionRequests: impresionRequestsCompletadas
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getTickets,
  printTicket,
  reprintTicket,
  getTicketsByTransaction,
  getTicketStats
};
