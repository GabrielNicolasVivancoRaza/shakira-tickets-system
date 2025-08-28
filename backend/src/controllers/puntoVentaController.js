const PuntoVenta = require('../models/PuntoVenta');
const Ticket = require('../models/Ticket');
const { createAuditLog } = require('../utils/auditLogger');

// Obtener todos los puntos de venta
const getPuntosVenta = async (req, res) => {
  try {
    const puntosVenta = await PuntoVenta.find({ activo: true })
      .populate('creadoPor', 'nombre usuario')
      .sort({ nombre: 1 });
    
    res.json({
      success: true,
      data: puntosVenta
    });
  } catch (error) {
    console.error('Error al obtener puntos de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo punto de venta
const createPuntoVenta = async (req, res) => {
  try {
    const { nombre, descripcion, localidades } = req.body;

    // Validar datos requeridos
    if (!nombre || !localidades || localidades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y al menos una localidad son requeridos'
      });
    }

    // Verificar que no exista un punto de venta con el mismo nombre
    const existingPunto = await PuntoVenta.findOne({ nombre: nombre.trim() });
    if (existingPunto) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un punto de venta con ese nombre'
      });
    }

    const puntoVenta = new PuntoVenta({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      localidades,
      creadoPor: req.user._id
    });

    await puntoVenta.save();
    await puntoVenta.populate('creadoPor', 'nombre usuario');

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'CREATE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta creado: ${nombre}`
    );

    res.status(201).json({
      success: true,
      data: puntoVenta,
      message: 'Punto de venta creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar punto de venta
const updatePuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, localidades } = req.body;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (nombre && nombre.trim() !== puntoVenta.nombre) {
      const existingPunto = await PuntoVenta.findOne({ 
        nombre: nombre.trim(),
        _id: { $ne: id }
      });
      if (existingPunto) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un punto de venta con ese nombre'
        });
      }
    }

    // Actualizar campos
    if (nombre) puntoVenta.nombre = nombre.trim();
    if (descripcion !== undefined) puntoVenta.descripcion = descripcion?.trim();
    if (localidades) puntoVenta.localidades = localidades;

    await puntoVenta.save();
    await puntoVenta.populate('creadoPor', 'nombre usuario');

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'UPDATE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta actualizado: ${puntoVenta.nombre}`
    );

    res.json({
      success: true,
      data: puntoVenta,
      message: 'Punto de venta actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Desactivar punto de venta
const deletePuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    puntoVenta.activo = false;
    await puntoVenta.save();

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'DELETE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta desactivado: ${puntoVenta.nombre}`
    );

    res.json({
      success: true,
      message: 'Punto de venta desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener tickets por punto de venta
const getTicketsByPuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '', seatSearch = '', sortBy = '', sortOrder = 'asc' } = req.query;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para buscar tickets que contengan las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = {
      $or: localidadFilters
    };

    // Construir filtros de búsqueda
    const searchFilters = [];

    // Agregar filtro de búsqueda general si se proporciona
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Usar búsqueda de texto de MongoDB si es posible, sino usar regex
      try {
        // Intentar búsqueda de texto primero (más rápida)
        const textSearchQuery = {
          $and: [
            { $or: localidadFilters },
            { $text: { $search: searchTerm } }
          ]
        };
        
        const testCount = await Ticket.countDocuments(textSearchQuery);
        if (testCount > 0) {
          query = textSearchQuery;
        } else {
          throw new Error('No text search results, fallback to regex');
        }
      } catch (error) {
        // Fallback a búsqueda regex si falla la búsqueda de texto
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        const generalSearchFilters = [
          { 'First Name': searchRegex },
          { 'Last Name': searchRegex },
          { 'Email': searchRegex },
          { 'Ticket ID': searchRegex },
          { 'Transaction ID': searchRegex },
          { 'Numero de Cedula:': searchRegex }
        ];

        searchFilters.push({ $or: generalSearchFilters });
      }
    }

    // Agregar filtro específico de asiento si se proporciona
    if (seatSearch && seatSearch.trim()) {
      const seatSearchTerm = seatSearch.trim();
      const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
      searchFilters.push({ 'Seat': seatRegex });
    }

    // Combinar filtros
    if (searchFilters.length > 0) {
      if (query.$text) {
        // Si ya tenemos búsqueda de texto, agregar filtro de asiento adicional
        if (seatSearch && seatSearch.trim()) {
          const seatSearchTerm = seatSearch.trim();
          const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
          query = {
            $and: [
              query,
              { 'Seat': seatRegex }
            ]
          };
        }
      } else {
        // Usar filtros regex
        query = {
          $and: [
            { $or: localidadFilters },
            ...searchFilters
          ]
        };
      }
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100); // Limitar máximo 100 por página

    // Configurar ordenamiento
    let sortObj = { 'First Name': 1, 'Last Name': 1 }; // Ordenamiento por defecto
    
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      sortObj = { [sortBy]: sortDirection };
    }

    // Ejecutar consultas en paralelo para mejor performance
    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort(sortObj)
        .lean(), // usar lean() para mejor performance
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        puntoVenta: puntoVenta.nombre
      }
    });
  } catch (error) {
    console.error('Error al obtener tickets por punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas por punto de venta
const getEstadisticasPuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    const query = { $or: localidadFilters };

    // Contar total de tickets
    const totalTickets = await Ticket.countDocuments(query);

    // Estadísticas por localidad
    const estadisticasPorLocalidad = await Promise.all(
      puntoVenta.localidades.map(async (localidad) => {
        const count = await Ticket.countDocuments({
          'Ticket': { $regex: localidad, $options: 'i' }
        });
        return {
          localidad,
          cantidad: count
        };
      })
    );

    res.json({
      success: true,
      data: {
        puntoVenta: puntoVenta.nombre,
        totalTickets,
        localidades: puntoVenta.localidades,
        estadisticasPorLocalidad
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener tickets para staff (solo su punto de trabajo)
const getTicketsForStaff = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', seatSearch = '', sortBy = '', sortOrder = 'asc' } = req.query;
    
    // El staff solo puede ver tickets relacionados con su punto de trabajo
    const userPuntoTrabajo = req.user.puntoTrabajo;
    
    if (!userPuntoTrabajo) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene punto de trabajo asignado'
      });
    }

    // Buscar el punto de venta que coincida con el punto de trabajo del usuario
    const puntoVenta = await PuntoVenta.findOne({ 
      nombre: userPuntoTrabajo,
      activo: true 
    });

    let localidadesAsignadas = [];
    
    if (puntoVenta) {
      // Si encontramos el punto de venta, usar sus localidades
      localidadesAsignadas = puntoVenta.localidades;
    } else {
      // Fallback al mapeo antiguo si no se encuentra el punto de venta
      const puntoTrabajoLocalidades = {
        'boletería norte': ['GENERAL', 'PREFERENCIA'],
        'boletería sur': ['TRIBUNA', 'PALCO'],
        'centro comercial': ['Las Mujeres Facturan BOX', 'Antología GOLDEN'],
        'punto central': ['Hips Don\'t Lie PLATINUM', 'SOLTERA FAN ZONE'],
        'entrada principal': ['GENERAL', 'PREFERENCIA', 'TRIBUNA']
      };
      localidadesAsignadas = puntoTrabajoLocalidades[userPuntoTrabajo] || ['GENERAL'];
    }
    
    // Crear filtros para las localidades asignadas al punto de trabajo
    const localidadFilters = localidadesAsignadas.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = {
      $or: localidadFilters
    };

    // Construir filtros de búsqueda
    const searchFilters = [];

    // Agregar filtro de búsqueda general si se proporciona
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      
      const generalSearchFilters = [
        { 'First Name': searchRegex },
        { 'Last Name': searchRegex },
        { 'Email': searchRegex },
        { 'Ticket ID': searchRegex },
        { 'Transaction ID': searchRegex },
        { 'Numero de Cedula:': searchRegex }
      ];

      searchFilters.push({ $or: generalSearchFilters });
    }

    // Agregar filtro específico de asiento si se proporciona
    if (seatSearch && seatSearch.trim()) {
      const seatSearchTerm = seatSearch.trim();
      const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
      searchFilters.push({ 'Seat': seatRegex });
    }

    // Combinar filtros
    if (searchFilters.length > 0) {
      query = {
        $and: [
          { $or: localidadFilters },
          ...searchFilters
        ]
      };
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100);

    // Configurar ordenamiento
    let sortObj = { 'First Name': 1, 'Last Name': 1 }; // Ordenamiento por defecto
    
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      sortObj = { [sortBy]: sortDirection };
    }

    // Ejecutar consultas en paralelo
    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort(sortObj)
        .lean(),
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        puntoTrabajo: userPuntoTrabajo,
        localidadesAsignadas
      }
    });
  } catch (error) {
    console.error('Error al obtener tickets para staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  deletePuntoVenta,
  getTicketsByPuntoVenta,
  getEstadisticasPuntoVenta,
  getTicketsForStaff
};
