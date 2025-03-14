import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaEye, FaPrint, FaEdit } from 'react-icons/fa';

const MisDespachos = ({ user }) => {
  const navigate = useNavigate();
  const [despachos, setDespachos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar despachos del usuario
  useEffect(() => {
    const cargarDespachos = async () => {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
          action: 'listarPorUsuario',
          usuario_id: user.id
        });

        if (response.data.success) {
          setDespachos(response.data.despachos);
        } else {
          setError(response.data.mensaje || 'Error al cargar despachos');
        }
      } catch (error) {
        setError('Error en el servidor');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDespachos();
  }, [user.id]);

  // Mostrar estado con badge
  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'salida_manana':
        return <span className="badge bg-primary">Salida Mañana</span>;
      case 'recarga_mediodia':
        return <span className="badge bg-warning text-dark">Recarga Mediodía</span>;
      case 'retorno_tarde':
        return <span className="badge bg-success">Retorno Tarde</span>;
      case 'completado':
        return <span className="badge bg-info">Completado</span>;
      default:
        return <span className="badge bg-secondary">Pendiente</span>;
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="mis-despachos">
      <h2 className="mb-4">Mis Despachos</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : (
        <>
          {despachos.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Fecha</th>
                    <th>Ruta</th>
                    <th>Estado</th>
                    <th>Total Productos</th>
                    <th>Valor Total ($)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {despachos.map(despacho => (
                    <tr key={despacho.id}>
                      <td>{formatearFecha(despacho.fecha)}</td>
                      <td>{despacho.ruta_nombre}</td>
                      <td>{getEstadoBadge(despacho.estado)}</td>
                      <td>{despacho.total_productos || 0}</td>
                      <td>${parseFloat(despacho.valor_total || 0).toFixed(2)}</td>
                      <td>
                        <button 
                          className="btn btn-sm btn-info me-1" 
                          onClick={() => navigate(`/despacho/ver/${despacho.id}`)}
                        >
                          <FaEye /> Ver
                        </button>
                        
                        {despacho.estado !== 'completado' && (
                          <button 
                            className="btn btn-sm btn-warning me-1" 
                            onClick={() => navigate(`/despacho/editar/${despacho.id}`)}
                          >
                            <FaEdit /> Actualizar
                          </button>
                        )}
                        
                        {despacho.estado === 'retorno_tarde' || despacho.estado === 'completado' ? (
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => navigate(`/despacho/reporte/${despacho.id}`)}
                          >
                            <FaPrint /> Reporte
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-info">
              <p className="mb-0">No tienes despachos registrados. <Link to="/despacho/nuevo">Crear nuevo despacho</Link></p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MisDespachos;