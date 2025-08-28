import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { ticketService, impresionService } from '../services';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [impresionStats, setImpresionStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchImpresionStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await ticketService.getStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchImpresionStats = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      // Solo cargar estadísticas de impresión para el jefe
      if (user && user.rol === 'jefe') {
        const response = await impresionService.getStats();
        setImpresionStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching impresion stats:', error);
      // No mostrar error si el usuario no tiene permisos
    } finally {
      setLoading(false);
    }
  };

  const donutData = {
    labels: ['Entregados', 'Pendientes'],
    datasets: [
      {
        data: stats ? [stats.ticketsImpresos, stats.ticketsRestantes] : [0, 0],
        backgroundColor: ['#28a745', '#ffc107'],
        borderColor: ['#1e7e34', '#e0a800'],
        borderWidth: 2,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Estado de Tickets',
      },
    },
  };

  const lineData = {
    labels: stats?.evolucionDiaria?.map(item => item._id) || [],
    datasets: [
      {
        label: 'Tickets Entregados',
        data: stats?.evolucionDiaria?.map(item => item.count) || [],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Evolución Diaria de Entregas',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Dashboard</h2>
        </Col>
      </Row>

      {/* Estadísticas generales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{stats?.totalTickets || 0}</h3>
              <p className="mb-0">Total Tickets</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{stats?.ticketsImpresos || 0}</h3>
              <p className="mb-0">Entregados</p>
              {stats?.detalles && (
                <small className="text-muted">
                  Tradicional: {stats.detalles.ticketsTradicionales} | 
                  Nuevos: {stats.detalles.impresionRequests}
                </small>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{stats?.ticketsRestantes || 0}</h3>
              <p className="mb-0">Pendientes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{stats?.porcentajeEntregados?.toFixed(1) || 0}%</h3>
              <p className="mb-0">% Entregados</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Doughnut data={donutData} options={donutOptions} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Line data={lineData} options={lineOptions} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Estadísticas de Sistema de Impresión */}
      {impresionStats && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Sistema de Impresión - Estado Actual</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Card className="text-center border-warning">
                      <Card.Body>
                        <h4 className="text-warning">{impresionStats.pendientes || 0}</h4>
                        <p className="mb-0">Pendientes</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-info">
                      <Card.Body>
                        <h4 className="text-info">{impresionStats.enProceso || 0}</h4>
                        <p className="mb-0">En Proceso</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-success">
                      <Card.Body>
                        <h4 className="text-success">{impresionStats.completadas || 0}</h4>
                        <p className="mb-0">Completadas</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="text-center border-danger">
                      <Card.Body>
                        <h4 className="text-danger">{impresionStats.canceladas || 0}</h4>
                        <p className="mb-0">Canceladas</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <Row className="mt-3">
                  <Col md={6}>
                    <Card className="text-center">
                      <Card.Body>
                        <h4 className="text-primary">{impresionStats.totalHoy || 0}</h4>
                        <p className="mb-0">Solicitudes Hoy</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  {impresionStats.porPrioridad && (
                    <Col md={6}>
                      <Card>
                        <Card.Body>
                          <h6>Por Prioridad:</h6>
                          <div className="d-flex justify-content-between">
                            <span>Normal: <strong>{impresionStats.porPrioridad.normal || 0}</strong></span>
                            <span>Alta: <strong className="text-warning">{impresionStats.porPrioridad.alta || 0}</strong></span>
                            <span>Urgente: <strong className="text-danger">{impresionStats.porPrioridad.urgente || 0}</strong></span>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  )}
                </Row>
                {/* Estadísticas por punto de trabajo para jefe */}
                {impresionStats.esJefe && impresionStats.porPuntoTrabajo && impresionStats.porPuntoTrabajo.length > 0 && (
                  <Row className="mt-3">
                    <Col>
                      <h6>Solicitudes de Impresión por Punto de Trabajo:</h6>
                      <Row>
                        {impresionStats.porPuntoTrabajo.map((punto, index) => (
                          <Col md={4} key={index} className="mb-2">
                            <Card className="text-center">
                              <Card.Body className="py-2">
                                <h6 className="text-primary mb-1">{punto.total}</h6>
                                <small className="text-muted">{punto.puntoTrabajo || 'Sin asignar'}</small>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tickets por punto de trabajo */}
      {stats?.ticketsPorPunto && stats.ticketsPorPunto.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Tickets por Punto de Trabajo</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {stats.ticketsPorPunto.map((punto, index) => (
                    <Col md={4} key={index} className="mb-3">
                      <Card className="text-center">
                        <Card.Body>
                          <h4 className="text-primary">{punto.count}</h4>
                          <p className="mb-0">{punto._id || 'Sin asignar'}</p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Dashboard;
