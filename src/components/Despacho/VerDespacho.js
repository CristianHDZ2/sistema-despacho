import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';

const VerDespacho = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [despacho, setDespacho] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar detalles del despacho
  useEffect(() => {
    const cargarDespacho = async () => {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
          action: 'obtener',
          id: parseInt(id)
        });

        if (response.data.success) {
          setDespacho(response.data.despacho);
        } else {
          setError(response.data.mensaje || 'Error al cargar el despacho');
        }
      } catch (error) {
        setError('Error en el servidor');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDespacho();
  }, [id]);

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
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcular valor total del despacho
  const calcularTotal = (detalles) => {
    if (!detalles) return 0;
    return detalles.reduce((sum, detalle) => sum + parseFloat(detalle.valor_venta || 0), 0);
  };

  // Agrupar productos por categoría
  const agruparPorCategoria = (detalles) => {
    if (!detalles) return {};
    
    const grupos = {};
    detalles.forEach(detalle => {
      const categoriaId = detalle.categoria_id;
      if (!grupos[categoriaId]) {
        grupos[categoriaId] = {
          nombre: detalle.categoria_nombre,
          productos: []
        };
      }
      grupos[categoriaId].productos.push(detalle);
    });
    
    // Ordenar productos por medida en cada categoría
    Object.keys(grupos).forEach(categoriaId => {
      grupos[categoriaId].productos.sort((a, b) => a.medida.localeCompare(b.medida));
    });
    
    return grupos;
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!despacho) {
    return <div className="alert alert-warning">Despacho no encontrado</div>;
  }

  return (
    <div className="ver-despacho">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Detalles del Despacho #{despacho.id}</h2>
        <div>
          <button 
            className="btn btn-secondary me-2"
            onClick={() => navigate('/despacho/historial')}
          >
            <FaArrowLeft /> Volver
          </button>
          {(despacho.estado === 'retorno_tarde' || despacho.estado === 'completado') && (
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/despacho/reportes`)}
            >
              <FaPrint /> Generar Reporte
            </button>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-dark text-white">
          <h5 className="my-1">Información General</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Fecha:</strong> {formatearFecha(despacho.fecha)}</p>
              <p><strong>Ruta:</strong> {despacho.ruta_nombre}</p>
              <p><strong>Tipo:</strong> {despacho.ruta_tipo}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Responsable:</strong> {despacho.usuario_nombre}</p>
              <p><strong>Estado:</strong> {getEstadoBadge(despacho.estado)}</p>
              <p><strong>Total Venta:</strong> ${calcularTotal(despacho.detalles).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {despacho.detalles && Object.values(agruparPorCategoria(despacho.detalles)).map((grupo, index) => (
        <div key={index} className="card mb-4">
          <div className={`card-header ${
            grupo.nombre.includes('AJE') ? 'bg-danger text-white' : 
            grupo.nombre.includes('CONSTANCIA') ? 'bg-primary text-white' : 
            'bg-success text-white'
          }`}>
            <h5 className="my-1">{grupo.nombre}</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Producto</th>
                    <th>Medida</th>
                    <th>Precio Unitario</th>
                    <th>Salida Mañana</th>
                    <th>Recarga Mediodía</th>
                    <th>Retorno Tarde</th>
                    <th>Total Vendido</th>
                    <th>Valor Venta ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.productos.map((detalle, i) => (
                    <tr key={i}>
                      <td>{detalle.producto_nombre}</td>
                      <td>{detalle.medida}</td>
                      <td>${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                      <td>{detalle.salida_manana}</td>
                      <td>{detalle.recarga_mediodia}</td>
                      <td>{detalle.retorno_tarde}</td>
                      <td>{detalle.total_vendido}</td>
                      <td>${parseFloat(detalle.valor_venta).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VerDespacho;