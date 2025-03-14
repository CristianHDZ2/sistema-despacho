import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FaTruck, FaClipboardList, FaSignOutAlt, FaUser } from 'react-icons/fa';

import DespachoForm from './DespachoForm';
import MisDespachos from './MisDespachos';
import MisReportes from '../Reportes/MisReportes';

const UserDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/despacho">Sistema de Despacho</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarUser">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarUser">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">
                  {user.foto ? (
                    <img 
                      src={user.foto} 
                      alt={user.nombre} 
                      className="rounded-circle me-2" 
                      style={{ width: '25px', height: '25px', objectFit: 'cover' }}
                    />
                  ) : (
                    <FaUser className="me-1" />
                  )}
                  {user.nombre}
                </span>
              </li>
              <li className="nav-item">
                <button className="btn btn-link nav-link" onClick={handleLogout}>
                  <FaSignOutAlt /> Salir
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          <div className="col-md-2 sidebar p-0">
            <div className="list-group list-group-flush">
              <Link 
                to="/despacho/nuevo" 
                className={`sidebar-link ${location.pathname === '/despacho/nuevo' ? 'active' : ''}`}
              >
                <FaTruck /> Nuevo Despacho
              </Link>
              <Link 
                to="/despacho/historial" 
                className={`sidebar-link ${location.pathname === '/despacho/historial' ? 'active' : ''}`}
              >
                <FaClipboardList /> Mis Despachos
              </Link>
              <Link 
                to="/despacho/reportes" 
                className={`sidebar-link ${location.pathname === '/despacho/reportes' ? 'active' : ''}`}
              >
                <FaClipboardList /> Mis Reportes
              </Link>
            </div>
          </div>
          <div className="col-md-10 p-4">
            <Routes>
              <Route path="/" element={<div className="jumbotron">
                <h1>Bienvenido, {user.nombre}</h1>
                <p>Sistema de Control de Despacho</p>
                <div className="d-grid gap-2 d-md-block mt-4">
                  <button 
                    className="btn btn-primary btn-lg me-md-2" 
                    onClick={() => navigate('/despacho/nuevo')}
                  >
                    <FaTruck className="me-2" />
                    Iniciar Nuevo Despacho
                  </button>
                  <button 
                    className="btn btn-outline-primary btn-lg" 
                    onClick={() => navigate('/despacho/historial')}
                  >
                    <FaClipboardList className="me-2" />
                    Ver Mis Despachos
                  </button>
                </div>
              </div>} />
              <Route path="/nuevo" element={<DespachoForm user={user} />} />
              <Route path="/historial" element={<MisDespachos user={user} />} />
              <Route path="/reportes" element={<MisReportes user={user} />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;