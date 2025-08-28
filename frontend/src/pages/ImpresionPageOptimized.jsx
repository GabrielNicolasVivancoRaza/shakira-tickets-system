import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const ImpresionPage = React.memo(() => {
  const { user } = useAuth();
  const [peticiones, setPeticiones] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState('pendiente');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [error, setError] = useState('');

  // Estados permitidos para impresor - memoizado
  const estadosPermitidos = useMemo(() => [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'completada', label: 'Impresos' },
    { value: 'cancelada', label: 'Cancelados' }
  ], []);

  // Función memoizada para obtener badge de estado
  const getEstadoBadge = useCallback((estado) => {
    const badges = {
      'pendiente': 'bg-warning text-dark',
      'en_proceso': 'bg-info text-white',
      'completada': 'bg-success text-white',
      'completado': 'bg-success text-white', // Alias
      'cancelada': 'bg-danger text-white',
      'cancelado': 'bg-danger text-white' // Alias
    };
    return badges[estado] || 'bg-secondary';
  }, []);

  // Funciones optimizadas con useCallback
  const fetchPeticiones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/impresion/queue', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          estado: estadoFiltro
        }
      });

      if (response.data.success) {
        setPeticiones(response.data.data.peticiones);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.totalItems,
          pages: response.data.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching petitions:', error);
      setError('Error al cargar peticiones');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, estadoFiltro]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/impresion/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const updateEstado = useCallback(async (peticionId, nuevoEstado, notas = '') => {
    try {
      const response = await api.put(`/impresion/${peticionId}/status`, {
        estado: nuevoEstado,
        notas
      });

      if (response.data.success) {
        // Actualizar solo la petición específica en lugar de recargar todo
        setPeticiones(prev => prev.map(p => 
          p._id === peticionId 
            ? { ...p, estado: nuevoEstado, notas }
            : p
        ));
        fetchStats(); // Solo recargar stats
        setError('');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Error al actualizar estado');
    }
  }, [fetchStats]);

  const handleImprimir = useCallback((peticion) => {
    // Obtener el Transaction ID del ticket
    const transactionId = peticion.transactionId;
    
    if (!transactionId) {
      setError('No se encontró el Transaction ID para imprimir');
      return;
    }

    // Construir la URL de SquadUp
    const printUrl = `https://www.squadup.com/api/dashboard/payments/print_boca_tickets?ids=${transactionId}`;
    
    // Abrir en nueva ventana
    window.open(printUrl, '_blank');
    
    // Marcar como completado
    updateEstado(peticion._id, 'completada', 'Impreso a través de SquadUp');
  }, [updateEstado]);

  const handleCancelar = useCallback((peticion) => {
    const motivo = prompt('Motivo de cancelación:');
    if (motivo) {
      updateEstado(peticion._id, 'cancelada', motivo);
    }
  }, [updateEstado]);

  // Effect optimizado con dependencias específicas
  useEffect(() => {
    if (user?.rol === 'impresor') {
      fetchPeticiones();
      fetchStats();
    }
  }, [user?.rol, fetchPeticiones, fetchStats]);

  // Effect separado para el polling
  useEffect(() => {
    if (user?.rol === 'impresor') {
      const interval = setInterval(() => {
        fetchPeticiones();
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.rol, fetchPeticiones, fetchStats]);

  // Componente memoizado para las filas de la tabla
  const PeticionRow = React.memo(({ peticion }) => (
    <tr key={peticion._id}>
      <td>
        <small>
          {new Date(peticion.createdAt).toLocaleString()}
        </small>
      </td>
      <td>
        <strong>{peticion.nombreCliente}</strong>
      </td>
      <td>
        <span className="badge bg-info">{peticion.asiento}</span>
      </td>
      <td>
        <code style={{fontSize: '0.8em'}}>{peticion.ticketId}</code>
      </td>
      <td>
        <code style={{fontSize: '0.8em'}}>{peticion.transactionId}</code>
      </td>
      <td>
        <small>{peticion.nombreSolicitante}</small>
      </td>
      <td>
        <span className={`badge ${getEstadoBadge(peticion.estado)}`}>
          {peticion.estado.replace('_', ' ')}
        </span>
      </td>
      <td>
        <div className="btn-group btn-group-sm">
          {(peticion.estado === 'pendiente' || peticion.estado === 'en_proceso') && (
            <button
              className="btn btn-success"
              onClick={() => handleImprimir(peticion)}
              title="Imprimir"
            >
              <i className="fas fa-print"></i> Imprimir
            </button>
          )}
          {(peticion.estado === 'pendiente' || peticion.estado === 'en_proceso') && (
            <button
              className="btn btn-danger ms-1"
              onClick={() => handleCancelar(peticion)}
              title="Cancelar"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </td>
    </tr>
  ));

  if (user?.rol !== 'impresor') {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          No tiene permisos para acceder a esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="fas fa-print me-2"></i>
              Cola de Impresión
              <small className="text-muted ms-2">
                - {user?.puntoTrabajo || 'Punto de trabajo no asignado'}
              </small>
            </h2>
            <button
              className="btn btn-outline-primary"
              onClick={() => {
                fetchPeticiones();
                fetchStats();
              }}
              disabled={loading}
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

          {/* Estadísticas */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="card text-center bg-warning text-dark">
                <div className="card-body">
                  <h5 className="card-title">{stats.pendientes || 0}</h5>
                  <p className="card-text">Pendientes</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center bg-success text-white">
                <div className="card-body">
                  <h5 className="card-title">{stats.completadas || 0}</h5>
                  <p className="card-text">Completadas</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center bg-danger text-white">
                <div className="card-body">
                  <h5 className="card-title">{stats.canceladas || 0}</h5>
                  <p className="card-text">Canceladas</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card text-center bg-primary text-white">
                <div className="card-body">
                  <h5 className="card-title">{stats.totalHoy || 0}</h5>
                  <p className="card-text">Total Hoy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Filtros</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    value={estadoFiltro}
                    onChange={(e) => {
                      setEstadoFiltro(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    {estadosPermitidos.map(estado => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de peticiones */}
          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <>
              {peticiones.length === 0 ? (
                <div className="card">
                  <div className="card-body text-center">
                    <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>No hay peticiones de impresión</h5>
                    <p className="text-muted">
                      No se encontraron peticiones con el filtro seleccionado.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card">
                    <div className="card-header">
                      <h5 className="mb-0">
                        Peticiones de Impresión ({peticiones.length})
                      </h5>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>Fecha</th>
                              <th>Cliente</th>
                              <th>Asiento</th>
                              <th>Ticket ID</th>
                              <th>Transaction ID</th>
                              <th>Solicitado por</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {peticiones.map(peticion => (
                              <PeticionRow key={peticion._id} peticion={peticion} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Paginación */}
                  {pagination.pages > 1 && (
                    <nav className="mt-4">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                          >
                            Anterior
                          </button>
                        </li>
                        
                        {[...Array(pagination.pages)].map((_, i) => (
                          <li
                            key={i + 1}
                            className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}

                        <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page === pagination.pages}
                          >
                            Siguiente
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default ImpresionPage;
