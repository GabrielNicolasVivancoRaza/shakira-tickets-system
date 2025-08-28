import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Determinar redirección basada en el rol
  const userRole = user.role || user.rol;

  switch (userRole) {
    case 'jefe':
      return <Navigate to="/dashboard" replace />;
    case 'staff':
      return <Navigate to="/tickets" replace />;
    case 'impresor':
      return <Navigate to="/impresion" replace />;
    default:
      return <Navigate to="/tickets" replace />;
  }
};

export default RoleBasedRedirect;
