import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { impresionService } from '../services';
import 'bootstrap/dist/css/bootstrap.min.css';

const TicketsPage = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [selectedPuntoVenta, setSelectedPuntoVenta] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [seatSearch, setSeatSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' o 'desc'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printRequests, setPrintRequests] = useState([]); // Estado de peticiones de impresión
  const [printForm, setPrintForm] = useState({
    quienRetira: '',
    parentesco: '',
    quienOtro: '',
    celular: ''
  });
  const [error, setError] = useState('');

  // Determinar si el usuario es jefe
  const isJefe = user?.role === 'jefe' || user?.rol === 'jefe';
  
  // Función para manejar ordenamiento
  const handleSort = (field) => {
    if (sortBy === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un campo nuevo, empezar con ascendente
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Función para obtener el ícono de ordenamiento
  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <i className="fas fa-sort text-muted"></i>;
    }
    return sortOrder === 'asc' 
      ? <i className="fas fa-sort-up text-primary"></i>
      : <i className="fas fa-sort-down text-primary"></i>;
  };
  
  // Solo jefes pueden seleccionar puntos de venta
  useEffect(() => {
    if (isJefe) {
      fetchPuntosVenta();
    }
  }, [isJefe]);

  // Cargar tickets cuando cambia la selección, búsqueda u ordenamiento
  useEffect(() => {
    if (isJefe && selectedPuntoVenta) {
      fetchTicketsByPuntoVenta();
    } else if (!isJefe) {
      fetchTicketsForStaff();
    } else {
      setTickets([]);
    }
  }, [selectedPuntoVenta, pagination.page, sortBy, sortOrder, isJefe]);

  // Búsqueda con debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      if (isJefe && selectedPuntoVenta) {
        fetchTicketsByPuntoVenta();
      } else if (!isJefe) {
        fetchTicketsForStaff();
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [search, seatSearch]);

  const fetchPuntosVenta = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/puntos-venta', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setPuntosVenta(result.data);
      }
    } catch (error) {
      console.error('Error fetching puntos de venta:', error);
      setError('Error al cargar puntos de venta');
    }
  };

  const fetchTicketsByPuntoVenta = async () => {
    if (!selectedPuntoVenta) return;

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search.trim() && { search: search.trim() }),
        ...(seatSearch.trim() && { seatSearch: seatSearch.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortBy && { sortOrder })
      });

      const response = await fetch(
        `http://localhost:5002/api/puntos-venta/${selectedPuntoVenta}/tickets?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setTickets(result.data.tickets);
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.totalItems,
          pages: result.data.pagination.totalPages
        }));
      } else {
        setError(result.message || 'Error al cargar tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Error de conexión al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketsForStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search.trim() && { search: search.trim() }),
        ...(seatSearch.trim() && { seatSearch: seatSearch.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortBy && { sortOrder })
      });

      const response = await fetch(
        `http://localhost:5002/api/puntos-venta/staff/tickets?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        setTickets(result.data.tickets);
        setPagination(prev => ({
          ...prev,
          total: result.data.pagination.totalItems,
          pages: result.data.pagination.totalPages
        }));
      } else {
        setError(result.message || 'Error al cargar tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets for staff:', error);
      setError('Error de conexión al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (ticket) => {
    // Si es staff, enviar petición de impresión en lugar de imprimir directamente
    if (user?.rol === 'staff' || user?.role === 'staff') {
      handleSendToPrint(ticket);
    } else {
      setSelectedTicket(ticket);
      setShowPrintModal(true);
    }
  };

  const handleSendToPrint = async (ticket) => {
    // Esta función se usa solo para reimpresiones de staff
    // Las impresiones nuevas usan el modal con formulario
    setSelectedTicket(ticket);
    setShowPrintModal(true);
  };

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    
    const userRole = user?.role || user?.rol;
    
    try {
      if (userRole === 'staff' || userRole === 'jefe') {
        // Staff y Jefe: enviar petición de impresión con datos del formulario
        await api.post('/impresion/request', {
          ticketId: selectedTicket['Ticket ID'],
          transactionId: selectedTicket['Transaction ID'],
          nombreCliente: `${selectedTicket['First Name']} ${selectedTicket['Last Name']}`,
          asiento: selectedTicket['Seat'],
          quienRetira: printForm.quienRetira,
          parentesco: printForm.parentesco,
          quienOtro: printForm.quienOtro,
          celular: printForm.celular
        });
        alert('Petición de impresión enviada exitosamente al impresor');
      } else {
        // Impresor: impresión directa (mantener funcionalidad original)
        await api.post(`/tickets/${selectedTicket['Ticket ID']}/print`, printForm);
        alert('Ticket impreso exitosamente');
      }
      
      setShowPrintModal(false);
      setPrintForm({ quienRetira: '', parentesco: '', quienOtro: '', celular: '' });
      
      // Refrescar tickets
      if (isJefe && selectedPuntoVenta) {
        fetchTicketsByPuntoVenta();
      } else if (!isJefe) {
        fetchTicketsForStaff();
      }
    } catch (error) {
      console.error('Error en proceso de impresión:', error);
      alert(error.response?.data?.message || 'Error en el proceso de impresión');
    }
  };

  const handleReprint = async (ticket, motivo) => {
    try {
      await api.post(`/tickets/${ticket['Ticket ID']}/reprint`, { motivo });
      alert('Ticket reimpreso exitosamente');
      // Refrescar tickets
      if (isJefe && selectedPuntoVenta) {
        fetchTicketsByPuntoVenta();
      } else if (!isJefe) {
        fetchTicketsForStaff();
      }
    } catch (error) {
      console.error('Error reprinting ticket:', error);
      alert(error.response?.data?.message || 'Error al reimprimir ticket');
    }
  };

  const canPrint = (ticket) => {
    const userRole = user?.role || user?.rol;
    
    // Jefes pueden imprimir directamente sin restricciones
    if (userRole === 'jefe') return true;
    
    // Para staff, verificar si ya hay una petición para esta transacción
    if (userRole === 'staff') {
      // Si el ticket ya está impreso, no pueden solicitar más impresión
      if (ticket.impreso) return false;
      
      // Verificar si ya hay una petición pendiente para esta transacción
      const existingRequest = printRequests.find(req => 
        req.transactionId === ticket['Transaction ID'] && 
        (req.estado === 'pendiente' || req.estado === 'completada')
      );
      
      // Solo puede imprimir si no hay petición existente
      return !existingRequest;
    }
    
    // Impresores pueden reimprimir tickets ya impresos
    if (userRole === 'impresor' && ticket.impreso) return true;
    
    return false;
  };

  const getPrintButtonText = (ticket) => {
    const userRole = user?.role || user?.rol;
    
    if (userRole === 'jefe') {
      // Jefe puede imprimir directamente siempre
      return ticket.impreso ? 'Reimprimir Directamente' : 'Imprimir Directamente';
    }
    
    if (userRole === 'staff') {
      // Verificar si ya hay una petición para esta transacción
      const existingRequest = printRequests.find(req => 
        req.transactionId === ticket['Transaction ID']
      );
      
      if (existingRequest) {
        switch (existingRequest.estado) {
          case 'pendiente':
            return 'Petición Pendiente';
          case 'completada':
            return 'Ya Impreso';
          case 'cancelada':
            return 'Petición Cancelada';
          default:
            return 'En Proceso';
        }
      }
      
      return ticket.impreso ? 'Ya Impreso' : 'Enviar a Imprimir';
    }
    
    if (userRole === 'impresor') {
      return 'Reimprimir';
    }
    
    return ticket.impreso ? 'Reimprimir' : 'Imprimir';
  };

  const handleRefresh = () => {
    if (isJefe && selectedPuntoVenta) {
      fetchTicketsByPuntoVenta();
    } else if (!isJefe) {
      fetchTicketsForStaff();
    }
  };

  // Función para obtener el estado de impresión de un ticket
  const getTicketPrintStatus = (ticket) => {
    if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
      // Buscar por transaction ID en lugar de ticket ID individual
      const request = printRequests.find(req => req.transactionId === ticket['Transaction ID']);
      console.log('Buscando transacción:', ticket['Transaction ID']);
      console.log('Peticiones disponibles:', printRequests.map(r => ({ transactionId: r.transactionId, estado: r.estado })));
      console.log('Petición encontrada para transacción:', request);
      
      if (request) {
        switch (request.estado) {
          case 'pendiente':
            return 'pending'; // Amarillo
          case 'completada':
          case 'completado':
            return 'completed'; // Verde
          case 'cancelada':
          case 'cancelado':
            return 'cancelled'; // Rojo
          default:
            return 'normal';
        }
      }
    }
    return ticket.impreso ? 'printed' : 'normal';
  };

  // Función para obtener las clases CSS según el estado
  const getRowClasses = (ticket) => {
    const status = getTicketPrintStatus(ticket);
    
    switch (status) {
      case 'pending':
        return 'table-warning'; // Amarillo
      case 'completed':
      case 'printed':
        return 'table-success'; // Verde para impresos
      case 'cancelled':
        return 'table-danger'; // Rojo
      default:
        return '';
    }
  };

  // Función para obtener información de impresión de un ticket
  const getTicketPrintInfo = (ticket) => {
    if (ticket.impreso) {
      const retiraInfo = ticket.quienRetira === 'Otro' && ticket.quienOtro ? 
        `${ticket.quienRetira} (${ticket.parentesco || 'N/A'}: ${ticket.quienOtro})` : 
        ticket.quienRetira || 'N/A';
      
      return {
        estado: 'Impreso',
        fecha: ticket.fechaImpresion ? new Date(ticket.fechaImpresion).toLocaleDateString() : 'N/A',
        responsable: ticket.usuarioResponsable?.nombre || 'N/A',
        quienRetira: retiraInfo,
        celular: ticket.celular || 'N/A'
      };
    }
    
    if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
      // Buscar por transaction ID en lugar de ticket ID individual
      const request = printRequests.find(req => req.transactionId === ticket['Transaction ID']);
      if (request) {
        const retiraInfo = request.quienRetira === 'Otro' && request.quienOtro ? 
          `${request.quienRetira} (${request.parentesco || 'N/A'}: ${request.quienOtro})` : 
          request.quienRetira || 'N/A';
        
        return {
          estado: request.estado === 'completada' ? 'Completado' : 
                 request.estado === 'pendiente' ? 'Pendiente' :
                 request.estado === 'cancelada' ? 'Cancelado' : 'En proceso',
          fecha: request.fechaProcesado ? new Date(request.fechaProcesado).toLocaleDateString() : 'N/A',
          responsable: request.nombreSolicitante || 'N/A',
          quienRetira: retiraInfo,
          celular: request.celular || 'N/A'
        };
      }
    }
    
    return null;
  };

  // Función para cargar peticiones de impresión (para staff y jefe)
  const fetchPrintRequests = async () => {
    if (user?.rol !== 'staff' && user?.role !== 'staff' && user?.rol !== 'jefe' && user?.role !== 'jefe') return;
    
    try {
      const response = await impresionService.getMyRequests();
      if (response.success) {
        setPrintRequests(response.data.peticiones || []);
      }
    } catch (error) {
      console.error('Error fetching print requests:', error);
    }
  };

  // Cargar peticiones de impresión para staff y jefe
  useEffect(() => {
    if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
      fetchPrintRequests();
      // Actualizar cada 30 segundos
      const interval = setInterval(fetchPrintRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [user, tickets]); // Agregar tickets como dependencia

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              Gestión de Tickets 
              {!isJefe && (
                <small className="text-muted ms-2">
                  - Punto de trabajo: {user?.puntoTrabajo || 'No asignado'}
                </small>
              )}
            </h2>
            <button
              className="btn btn-outline-primary"
              onClick={handleRefresh}
              disabled={loading || (isJefe && !selectedPuntoVenta)}
            >
              <i className="fas fa-sync"></i> Actualizar
            </button>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
              ></button>
            </div>
          )}

          {/* Solo mostrar selector de punto de venta para jefes */}
          {isJefe && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Seleccionar Punto de Venta</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">Punto de Venta *</label>
                    <select
                      className="form-select"
                      value={selectedPuntoVenta}
                      onChange={(e) => {
                        setSelectedPuntoVenta(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                      }}
                    >
                      <option value="">Seleccione un punto de venta</option>
                      {puntosVenta.map(punto => (
                        <option key={punto._id} value={punto._id}>
                          {punto.nombre} ({punto.localidades.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barra de búsqueda */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Búsqueda</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">
                    Búsqueda general 
                    <small className="text-muted">
                      (nombre, email, cédula, ticket ID, transaction ID)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ejemplo: Juan Pérez, juan@email.com..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    Búsqueda por asiento 
                    <small className="text-muted">
                      (específico para asientos)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ejemplo: A, A 10, A 10 12..."
                    value={seatSearch}
                    onChange={(e) => setSeatSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setSearch('');
                      setSeatSearch('');
                      setSortBy('');
                      setSortOrder('asc');
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-12">
                  <small className="text-muted">
                    <strong>Nota:</strong> Puedes usar ambos campos simultáneamente. 
                    El campo de asiento busca específicamente en los asientos (A, B, C, etc.) 
                    y no distingue entre mayúsculas y minúsculas.
                    {sortBy && (
                      <span className="ms-3">
                        <strong>Ordenando por:</strong> {sortBy} ({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
                      </span>
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Validaciones para mostrar contenido */}
          {isJefe && !selectedPuntoVenta ? (
            <div className="alert alert-info text-center">
              <h5>Seleccione un punto de venta</h5>
              <p>Debe seleccionar un punto de venta para ver los tickets correspondientes.</p>
              {puntosVenta.length === 0 && (
                <p>
                  <small>
                    <strong>Nota:</strong> No hay puntos de venta disponibles. 
                    Debe crearlos primero en la sección "Puntos de Venta".
                  </small>
                </p>
              )}
            </div>
          ) : !isJefe && !user?.puntoTrabajo ? (
            <div className="alert alert-warning text-center">
              <h5>Sin punto de trabajo asignado</h5>
              <p>Su usuario no tiene un punto de trabajo asignado. Contacte al administrador.</p>
            </div>
          ) : (
            /* Tabla de tickets */
            <div className="card">
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center p-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Cargando tickets...</span>
                    </div>
                    <span className="ms-3">Buscando tickets...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="alert alert-warning text-center">
                    <h5>No se encontraron tickets</h5>
                    <p>
                      {search.trim() 
                        ? `No hay tickets que coincidan con "${search}"` 
                        : 'No hay tickets disponibles para mostrar'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Información de resultados */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted">
                        Mostrando {tickets.length} de {pagination.total} tickets
                        {search.trim() && ` (filtrados por "${search}")`}
                      </span>
                      <span className="badge bg-primary">
                        Página {pagination.page} de {pagination.pages}
                      </span>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead className="table-dark">
                          <tr>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Seat')}
                              title="Hacer clic para ordenar por asiento"
                            >
                              Asiento {getSortIcon('Seat')}
                            </th>
                            <th>Categoría</th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Ticket ID')}
                              title="Hacer clic para ordenar por Ticket ID"
                            >
                              Ticket ID {getSortIcon('Ticket ID')}
                            </th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Transaction ID')}
                              title="Hacer clic para ordenar por Transaction ID"
                            >
                              Transaction ID {getSortIcon('Transaction ID')}
                            </th>
                            <th>Estado</th>
                            <th>Información de Impresión</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map(ticket => {
                            const printInfo = getTicketPrintInfo(ticket);
                            return (
                              <tr 
                                key={ticket['Ticket ID']} 
                                className={getRowClasses(ticket)}
                              >
                                <td>
                                  <strong>{`${ticket['First Name']} ${ticket['Last Name']}`}</strong>
                                </td>
                                <td>
                                  <small>{ticket['Email']}</small>
                                </td>
                                <td>
                                  <span className="badge bg-info">{ticket['Seat']}</span>
                                </td>
                                <td>
                                  <small>{ticket['Ticket']}</small>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Ticket ID']}</code>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Transaction ID']}</code>
                                </td>
                                <td>
                                  {ticket.impreso ? (
                                    <span className="badge bg-success">Impreso</span>
                                  ) : printInfo ? (
                                    <span className={`badge ${
                                      printInfo.estado === 'Pendiente' ? 'bg-warning text-dark' :
                                      printInfo.estado === 'Completado' ? 'bg-success' :
                                      printInfo.estado === 'Cancelado' ? 'bg-danger' : 'bg-info'
                                    }`}>
                                      {printInfo.estado}
                                    </span>
                                  ) : (
                                    <span className="badge bg-secondary">Pendiente</span>
                                  )}
                                </td>
                                <td>
                                  {printInfo ? (
                                    <div style={{fontSize: '0.8em'}}>
                                      <div><strong>Responsable:</strong> {printInfo.responsable}</div>
                                      <div><strong>Fecha:</strong> {printInfo.fecha}</div>
                                      <div><strong>Retira:</strong> {printInfo.quienRetira}</div>
                                      <div><strong>Celular:</strong> {printInfo.celular}</div>
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {canPrint(ticket) && (
                                    <>
                                      {!ticket.impreso ? (
                                        <button
                                          className="btn btn-primary btn-sm me-1"
                                          onClick={() => handlePrint(ticket)}
                                        >
                                          <i className="fas fa-print"></i> {getPrintButtonText(ticket)}
                                        </button>
                                      ) : (
                                        <button
                                          className="btn btn-warning btn-sm me-1"
                                          onClick={() => {
                                            const userRole = user?.role || user?.rol;
                                            
                                            if (userRole === 'staff') {
                                              // Staff usa el modal para reimpresiones también
                                              handleSendToPrint(ticket);
                                            } else {
                                              // Jefe/Impresor reimprimen directamente
                                              const motivo = prompt('Motivo de reimpresión:');
                                              if (motivo) {
                                                handleReprint(ticket, motivo);
                                              }
                                            }
                                          }}
                                        >
                                          <i className="fas fa-redo"></i> {getPrintButtonText(ticket)}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación mejorada */}
                    {pagination.pages > 1 && (
                      <nav className="mt-4">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({...prev, page: 1}))}
                              disabled={pagination.page === 1}
                            >
                              Primera
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                              disabled={pagination.page === 1}
                            >
                              Anterior
                            </button>
                          </li>
                          
                          {/* Páginas numéricas */}
                          {(() => {
                            const start = Math.max(1, pagination.page - 2);
                            const end = Math.min(pagination.pages, pagination.page + 2);
                            const pages = [];
                            
                            for (let i = start; i <= end; i++) {
                              pages.push(
                                <li key={i} className={`page-item ${pagination.page === i ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => setPagination(prev => ({...prev, page: i}))}
                                  >
                                    {i}
                                  </button>
                                </li>
                              );
                            }
                            return pages;
                          })()}
                          
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                              disabled={pagination.page === pagination.pages}
                            >
                              Siguiente
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({...prev, page: pagination.pages}))}
                              disabled={pagination.page === pagination.pages}
                            >
                              Última
                            </button>
                          </li>
                        </ul>
                        <div className="text-center text-muted mt-2">
                          <small>
                            Página {pagination.page} de {pagination.pages} | 
                            Total: {pagination.total} tickets | 
                            Mostrando hasta {pagination.limit} por página
                          </small>
                        </div>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Modal de impresión */}
          {showPrintModal && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {(user?.role === 'staff' || user?.rol === 'staff') ? 'Enviar a Imprimir' : 'Imprimir Ticket'}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPrintModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handlePrintSubmit}>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <strong>Ticket:</strong> {`${selectedTicket['First Name']} ${selectedTicket['Last Name']}`}<br />
                        <strong>Asiento:</strong> {selectedTicket['Seat']}<br />
                        <strong>Ticket ID:</strong> {selectedTicket['Ticket ID']}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">¿Quién retira? *</label>
                        <select
                          className="form-select"
                          value={printForm.quienRetira}
                          onChange={(e) => setPrintForm({...printForm, quienRetira: e.target.value, parentesco: '', quienOtro: ''})}
                          required
                        >
                          <option value="">Seleccione una opción</option>
                          <option value="Titular">Titular</option>
                          <option value="Titular Compra">Titular Compra</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {printForm.quienRetira === 'Otro' && (
                        <>
                          <div className="mb-3">
                            <label className="form-label">Parentesco *</label>
                            <select
                              className="form-select"
                              value={printForm.parentesco}
                              onChange={(e) => setPrintForm({...printForm, parentesco: e.target.value})}
                              required
                            >
                              <option value="">Seleccione el parentesco</option>
                              <option value="Esposo/a">Esposo/a</option>
                              <option value="Hijo/a">Hijo/a</option>
                              <option value="Padre/Madre">Padre/Madre</option>
                              <option value="Hermano/a">Hermano/a</option>
                              <option value="Amigo/a">Amigo/a</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Nombre completo de quien retira *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Nombre completo de quien retira"
                              value={printForm.quienOtro}
                              onChange={(e) => setPrintForm({...printForm, quienOtro: e.target.value})}
                              required
                            />
                          </div>
                        </>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Celular *</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={printForm.celular}
                          onChange={(e) => setPrintForm({...printForm, celular: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPrintModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {(user?.role === 'staff' || user?.rol === 'staff') ? 'Enviar a Imprimir' : 'Imprimir'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
