const ImpresionRequest = require('../models/ImpresionRequest');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { createAuditLog } = require('../utils/auditLogger');

// @desc    Crear nueva petición de impresión (Staff)
// @route   POST /api/impresion/request
// @access  Private (staff)
const createImpresionRequest = async (req, res) => {
  try {
    const { ticketId, transactionId, nombreCliente, asiento, quienRetira, parentesco, quienOtro, celular } = req.body;

    if (!ticketId || !transactionId || !nombreCliente || !asiento || !quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (ticketId, transactionId, nombreCliente, asiento, quienRetira, celular)'
      });
    }

    // Validar campos adicionales cuando quienRetira es "Otro"
    if (quienRetira === 'Otro') {
      if (!parentesco || !quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Cuando selecciona "Otro", el parentesco y el nombre de quien retira son requeridos'
        });
      }
    }

    // Verificar que el usuario tenga punto de trabajo (solo para staff)
    if ((req.user.rol === 'staff') && !req.user.puntoTrabajo) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene punto de trabajo asignado'
      });
    }

    // Buscar impresor del mismo punto de trabajo (solo para staff)
    let impresor = null;
    let puntoTrabajoAsignado = req.user.puntoTrabajo;

    if (req.user.rol === 'staff') {
      impresor = await User.findOne({
        rol: 'impresor',
        puntoTrabajo: req.user.puntoTrabajo,
        activo: true
      });
    }

    // Verificar si ya existe una petición para este transactionId en esta localidad
    const existingRequest = await ImpresionRequest.findOne({
      transactionId,
      puntoTrabajo: puntoTrabajoAsignado
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una petición de impresión para esta transacción en esta localidad',
        data: existingRequest
      });
    }

    // Crear las notas con la información completa
    let notas = `Quien retira: ${quienRetira}`;
    if (quienRetira === 'Otro') {
      notas += ` | Parentesco: ${parentesco} | Nombre: ${quienOtro}`;
    }
    notas += ` | Celular: ${celular}`;

    // Crear la petición de impresión (será válida para todos los tickets del mismo transactionId)
    const impresionRequest = new ImpresionRequest({
      ticketId, // Ticket principal que inició la petición
      transactionId,
      nombreCliente,
      asiento,
      solicitadoPor: req.user._id,
      nombreSolicitante: req.user.nombre,
      puntoTrabajo: puntoTrabajoAsignado,
      asignadoA: impresor?._id,
      estado: 'pendiente',
      notas,
      prioridad: 'normal',
      quienRetira,
      parentesco,
      quienOtro,
      celular
    });

    await impresionRequest.save();

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'CREATE',
      'ImpresionRequest',
      impresionRequest._id,
      `Petición de impresión creada para transacción ${transactionId} - Retira: ${quienRetira}${quienRetira === 'Otro' ? ` (${parentesco}: ${quienOtro})` : ''}`
    );

    res.status(201).json({
      success: true,
      message: 'Petición de impresión enviada exitosamente para todos los tickets de la transacción',
      data: impresionRequest
    });

  } catch (error) {
    console.error('Error al crear petición de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener peticiones de impresión para impresor (OPTIMIZADO)
// @route   GET /api/impresion/queue
// @access  Private (impresor)
const getImpresionQueue = async (req, res) => {
  try {
    const { page = 1, limit = 50, estado = 'pendiente' } = req.query;

    if (req.user.rol !== 'impresor') {
      return res.status(403).json({
        success: false,
        message: 'Solo los impresores pueden acceder a la cola de impresión'
      });
    }

    if (!req.user.puntoTrabajo) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene punto de trabajo asignado'
      });
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100);

    let query = { puntoTrabajo: req.user.puntoTrabajo };
    
    if (estado !== 'todos') {
      query.estado = estado;
    }

    // Pipeline de agregación optimizado para mejor rendimiento
    const pipeline = [
      { $match: query },
      { $sort: { prioridad: -1, createdAt: -1 } }, // Prioridad primero, luego fecha
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'users',
          localField: 'solicitadoPor',
          foreignField: '_id',
          as: 'solicitadoPor',
          pipeline: [{ $project: { nombre: 1, usuario: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'procesadoPor',
          foreignField: '_id',
          as: 'procesadoPor',
          pipeline: [{ $project: { nombre: 1, usuario: 1 } }]
        }
      },
      {
        $unwind: {
          path: '$solicitadoPor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$procesadoPor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          ticketId: 1,
          transactionId: 1,
          nombreCliente: 1,
          asiento: 1,
          quienRetira: 1,
          celular: 1,
          estado: 1,
          prioridad: 1,
          notas: 1,
          createdAt: 1,
          fechaProcesado: 1,
          nombreSolicitante: { $ifNull: ['$solicitadoPor.nombre', '$nombreSolicitante'] },
          'solicitadoPor.nombre': 1,
          'solicitadoPor.usuario': 1,
          'procesadoPor.nombre': 1,
          'procesadoPor.usuario': 1
        }
      }
    ];

    const [peticiones, totalResult] = await Promise.all([
      ImpresionRequest.aggregate(pipeline),
      ImpresionRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        peticiones,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalResult / limitNum),
          totalItems: totalResult,
          itemsPerPage: limitNum
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener cola de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar estado de petición de impresión
// @route   PUT /api/impresion/:id/status
// @access  Private (impresor)
const updateImpresionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { estado, notas } = req.body;

    // Normalizar el estado - convertir 'completado' a 'completada' para consistencia
    if (estado === 'completado') {
      estado = 'completada';
    }
    if (estado === 'cancelado') {
      estado = 'cancelada';
    }

    if (!['pendiente', 'en_proceso', 'completada', 'cancelada'].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido'
      });
    }

    const peticion = await ImpresionRequest.findById(id);
    if (!peticion) {
      return res.status(404).json({
        success: false,
        message: 'Petición de impresión no encontrada'
      });
    }

    // Verificar que el impresor pertenezca al mismo punto de trabajo
    if (peticion.puntoTrabajo !== req.user.puntoTrabajo) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para procesar esta petición'
      });
    }

    peticion.estado = estado;
    if (notas) peticion.notas = notas;
    
    if (estado === 'completada' || estado === 'en_proceso') {
      peticion.procesadoPor = req.user._id;
      peticion.fechaProcesado = new Date();
    }

    await peticion.save();

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'UPDATE',
      'ImpresionRequest',
      peticion._id,
      `Estado cambiado a ${estado} para ticket ${peticion.ticketId}`
    );

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: peticion
    });

  } catch (error) {
    console.error('Error al actualizar estado de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de impresión (OPTIMIZADO)
// @route   GET /api/impresion/stats
// @access  Private (impresor, jefe)
const getImpresionStats = async (req, res) => {
  try {
    if (!['impresor', 'jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo los impresores y jefes pueden acceder a las estadísticas'
      });
    }

    let query = {};
    
    // Si es impresor, solo ver su punto de trabajo
    if (req.user.rol === 'impresor') {
      if (!req.user.puntoTrabajo) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no tiene punto de trabajo asignado'
        });
      }
      query.puntoTrabajo = req.user.puntoTrabajo;
    }
    
    // Si es jefe, puede filtrar por punto de trabajo específico
    if (req.user.rol === 'jefe' && req.query.puntoTrabajo) {
      query.puntoTrabajo = req.query.puntoTrabajo;
    }

    const hoyInicio = new Date(new Date().setHours(0, 0, 0, 0));

    // Pipeline de agregación optimizado para obtener todas las estadísticas en una consulta
    const statsResults = await ImpresionRequest.aggregate([
      { $match: query },
      {
        $facet: {
          estadoStats: [
            {
              $group: {
                _id: '$estado',
                count: { $sum: 1 }
              }
            }
          ],
          totalHoy: [
            { $match: { createdAt: { $gte: hoyInicio } } },
            { $count: 'count' }
          ],
          prioridadStats: [
            {
              $group: {
                _id: '$prioridad',
                count: { $sum: 1 }
              }
            }
          ],
          puntoTrabajoStats: [
            {
              $group: {
                _id: '$puntoTrabajo',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = statsResults[0];
    
    // Procesar resultados de estado
    const estadoMap = {};
    result.estadoStats.forEach(stat => {
      estadoMap[stat._id] = stat.count;
    });

    // Procesar resultados de prioridad
    const prioridadMap = {};
    result.prioridadStats.forEach(stat => {
      prioridadMap[stat._id] = stat.count;
    });

    // Procesar resultados por punto de trabajo
    const puntoTrabajoStats = result.puntoTrabajoStats.map(stat => ({
      puntoTrabajo: stat._id,
      total: stat.count
    }));

    res.json({
      success: true,
      data: {
        pendientes: estadoMap.pendiente || 0,
        enProceso: estadoMap.en_proceso || 0,
        completadas: estadoMap.completada || 0,
        canceladas: estadoMap.cancelada || 0,
        totalHoy: result.totalHoy[0]?.count || 0,
        porPrioridad: {
          normal: prioridadMap.normal || 0,
          alta: prioridadMap.alta || 0,
          urgente: prioridadMap.urgente || 0
        },
        puntoTrabajo: req.user.puntoTrabajo,
        porPuntoTrabajo: puntoTrabajoStats,
        esJefe: req.user.rol === 'jefe'
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de impresión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener peticiones de impresión del staff/jefe
// @route   GET /api/impresion/my-requests
// @access  Private (staff, jefe)
const getMyImpresionRequests = async (req, res) => {
  try {
    const { page = 1, limit = 50, estado } = req.query;

    if (!['staff', 'jefe'].includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Solo el staff y jefes pueden acceder a sus peticiones de impresión'
      });
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100);

    let query = {};
    
    // Si es staff, solo ver sus propias peticiones del mismo punto de trabajo
    if (req.user.rol === 'staff') {
      if (!req.user.puntoTrabajo) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no tiene punto de trabajo asignado'
        });
      }
      query.puntoTrabajo = req.user.puntoTrabajo;
    }
    
    // Si es jefe, puede filtrar por punto de trabajo específico
    if (req.user.rol === 'jefe' && req.query.puntoTrabajo) {
      query.puntoTrabajo = req.query.puntoTrabajo;
    }
    
    if (estado && estado !== 'todos') {
      query.estado = estado;
    }

    const [peticiones, total] = await Promise.all([
      ImpresionRequest.find(query)
        .populate('solicitadoPor', 'nombre usuario', null, { lean: true })
        .populate('procesadoPor', 'nombre usuario', null, { lean: true })
        .sort({ createdAt: -1 }) // Más recientes primero
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ImpresionRequest.countDocuments(query)
    ]);

    // Agregar nombreSolicitante para compatibilidad con frontend
    const peticionesConNombre = peticiones.map(peticion => ({
      ...peticion,
      nombreSolicitante: peticion.solicitadoPor?.nombre || peticion.nombreSolicitante || 'N/A'
    }));

    res.json({
      success: true,
      data: {
        peticiones: peticionesConNombre,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener peticiones de impresión del staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener peticiones de impresión por transactionId
const getImpresionByTransactionId = async (req, res) => {
  try {
    const { transactionId, puntoTrabajo } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID es requerido'
      });
    }

    // Construir query
    let query = { transactionId };
    
    // Si se especifica punto de trabajo, añadirlo al filtro
    if (puntoTrabajo) {
      query.puntoTrabajo = puntoTrabajo;
    }

    const impresionRequest = await ImpresionRequest.findOne(query)
      .populate('solicitadoPor', 'nombre email')
      .populate('asignadoA', 'nombre email')
      .populate('procesadoPor', 'nombre email')
      .sort({ fechaCreacion: -1 }); // Más reciente primero

    res.json({
      success: true,
      data: impresionRequest
    });

  } catch (error) {
    console.error('Error al obtener petición por transaction ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  createImpresionRequest,
  getImpresionQueue,
  getMyImpresionRequests,
  updateImpresionStatus,
  getImpresionStats,
  getImpresionByTransactionId
};
