import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { FaUsers, FaBoxes, FaRoute, FaChartBar, FaSignOutAlt, FaUserTie } from 'react-icons/fa';

import UsuariosAdmin from './UsuariosAdmin';
import ProductosAdmin from '../Productos/ProductosAdmin';
import RutasAdmin from '../Rutas/RutasAdmin';
import ReportesAdmin from '../Reportes/ReportesAdmin';
import MotoristasAdmin from '../Motoristas/MotoristasAdmin';

const AdminDashboard = ({ user, onLogout }) => {
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
          <Link className="navbar-brand" to="/admin">Sistema de Despacho - Admin</Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarAdmin">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarAdmin">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <span className="nav-link">{user.nombre}</span>
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
                to="/admin/usuarios" 
                className={`sidebar-link ${location.pathname.includes('/admin/usuarios') ? 'active' : ''}`}
              >
                <FaUsers /> Usuarios
              </Link>
              <Link 
                to="/admin/productos" 
                className={`sidebar-link ${location.pathname.includes('/admin/productos') ? 'active' : ''}`}
              >
                <FaBoxes /> Productos
              </Link>
              <Link 
                to="/admin/rutas" 
                className={`sidebar-link ${location.pathname.includes('/admin/rutas') ? 'active' : ''}`}
              >
                <FaRoute /> Rutas
              </Link>
              <Link 
                to="/admin/motoristas" 
                className={`sidebar-link ${location.pathname.includes('/admin/motoristas') ? 'active' : ''}`}
              >
                <FaUserTie /> Motoristas
              </Link>
              <Link 
                to="/admin/reportes" 
                className={`sidebar-link ${location.pathname.includes('/admin/reportes') ? 'active' : ''}`}
              >
                <FaChartBar /> Reportes
              </Link>
            </div>
          </div>
          <div className="col-md-10 p-4">
            <Routes>
              <Route path="/" element={<div className="jumbotron">
                <h1>Bienvenido, {user.nombre}</h1>
                <p>Panel de Administración del Sistema de Control de Despacho</p>
              </div>} />
              <Route path="/usuarios/*" element={<UsuariosAdmin />} />
              <Route path="/productos/*" element={<ProductosAdmin />} />
              <Route path="/rutas/*" element={<RutasAdmin />} />
              <Route path="/motoristas/*" element={<MotoristasAdmin />} />
              <Route path="/reportes/*" element={<ReportesAdmin />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;