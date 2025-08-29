import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    usuario: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // 🔥 FUNCIÓN DE TEST DIRECTO
  const testAPI = async () => {
    console.log('🔥 TESTING API DIRECT...');
    console.log('🔍 API BASE URL:', api.defaults.baseURL);
    console.log('🔍 Full URL will be:', api.defaults.baseURL + '/health');
    
    try {
      const response = await api.get('/health');
      console.log('✅ API TEST SUCCESS:', response.data);
      alert('API TEST SUCCESS: ' + JSON.stringify(response.data));
    } catch (error) {
      console.error('❌ API TEST FAILED:', error);
      console.error('❌ Error config:', error.config);
      console.error('❌ Error response:', error.response?.data);
      alert('API TEST FAILED: ' + error.message + '\n\nURL: ' + error.config?.url + '\nBase: ' + error.config?.baseURL);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(formData);
      
      if (response.user.primerAcceso) {
        await Swal.fire({
          title: '¡Bienvenido!',
          text: 'Debes cambiar tu contraseña antes de continuar',
          icon: 'info',
          confirmButtonText: 'Cambiar Contraseña'
        });
        navigate('/change-password');
      } else {
        // Redireccionar según el rol del usuario
        const userRole = response.user.role || response.user.rol;
        
        if (userRole === 'jefe') {
          navigate('/dashboard', { replace: true });
        } else if (userRole === 'staff') {
          navigate('/tickets', { replace: true });
        } else if (userRole === 'impresor') {
          navigate('/impresion', { replace: true });
        } else {
          navigate('/', { replace: true }); // Fallback a redirección inteligente
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100">
        <Col xs={12} sm={8} md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h1 className="h3 mb-3 fw-normal">🎵</h1>
                <h2 className="h4 mb-3 fw-normal">Shakira Tickets</h2>
                <p className="text-muted">Sistema de Gestión de Boletos</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="usuario"
                    value={formData.usuario}
                    onChange={handleChange}
                    placeholder="usuario@ejemplo.com"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Contraseña"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </div>
                
                {/* 🔥 BOTÓN DE TEST DIRECTO */}
                <div className="d-grid mt-2">
                  <Button 
                    variant="danger" 
                    onClick={testAPI}
                    size="sm"
                  >
                    🔥 TEST API CONNECTION
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-4">
                <small className="text-muted">
                  Contraseña por defecto: <strong>FTT2025</strong>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
