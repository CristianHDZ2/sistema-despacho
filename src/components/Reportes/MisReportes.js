import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPrint } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

const MisReportes = ({ user }) => {
  const navigate = useNavigate();
  const [despachos, setDespachos] = useState([]);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reporteRef = useRef();

  // Cargar despachos completados del usuario
  useEffect(() => {
    const cargarDespachos = async () => {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
          action: 'listarPorUsuario',
          usuario_id: user.id
        });

        if (response.data.success) {
          // Filtrar solo despachos completados (con retorno)
          const completados = response.data.despachos.filter(d => 
            d.estado === 'completado' || d.estado === 'retorno_tarde'
          );
          setDespachos(completados);
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

  // Cargar detalles de un despacho específico
  const cargarDetallesDespacho = async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
        action: 'obtener',
        id: id
      });

      if (response.data.success) {
        setDespachoSeleccionado(response.data.despacho);
      } else {
        setError(response.data.mensaje || 'Error al cargar detalles del despacho');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
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

  // Función para imprimir
  const handlePrint = useReactToPrint({
    content: () => reporteRef.current,
    documentTitle: `Reporte_Despacho_${despachoSeleccionado?.id || 'N/A'}`,
  });

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

  // Calcular totales
  const calcularTotales = (detalles) => {
    if (!detalles) return { totalVendido: 0, totalVenta: 0 };
    
    return detalles.reduce((acc, detalle) => {
      return {
        totalVendido: acc.totalVendido + parseInt(detalle.total_vendido),
        totalVenta: acc.totalVenta + parseFloat(detalle.valor_venta)
      };
    }, { totalVendido: 0, totalVenta: 0 });
  };

  return (
    <div className="mis-reportes">
      <h2 className="mb-4">Mis Reportes</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}

      {loading && !despachoSeleccionado ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : (
        <>
          {despachos.length > 0 ? (
            <div className="row">
              <div className="col-md-4">
                <div className="card mb-4">
                  <div className="card-header bg-primary text-white">
                    <h5 className="my-1">Seleccione un Despacho</h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group">
                      {despachos.map(despacho => (
                        <button 
                          key={despacho.id}
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          onClick={() => cargarDetallesDespacho(despacho.id)}
                        >
                          <div>
                            <div className="fw-bold">{despacho.ruta_nombre}</div>
                            <small>{formatearFecha(despacho.fecha)}</small>
                          </div>
                          <span className="badge bg-primary rounded-pill">
                            ${parseFloat(despacho.valor_total || 0).toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-8">
                {despachoSeleccionado ? (
                  <div className="card">
                    <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                      <h5 className="my-1">Reporte de Despacho</h5>
                      <button 
                        className="btn btn-sm btn-light" 
                        onClick={handlePrint}
                      >
                        <FaPrint /> Imprimir
                      </button>
                    </div>
                    <div className="card-body">
                      <div className="reporte-container" ref={reporteRef}>
                        <div className="text-center mb-4">
                          <h4>REPORTE DE DESPACHO</h4>
                          <h5>SISTEMA DE CONTROL DE DESPACHO</h5>
                        </div>
                        
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <p><strong>Fecha:</strong> {formatearFecha(despachoSeleccionado.fecha)}</p>
                            <p><strong>Ruta:</strong> {despachoSeleccionado.ruta_nombre}</p>
                            <p><strong>Tipo:</strong> {despachoSeleccionado.ruta_tipo}</p>
                          </div>
                          <div className="col-md-6">
                            <p><strong>Responsable:</strong> {despachoSeleccionado.usuario_nombre}</p>
                            <p><strong>Estado:</strong> Completado</p>
                            <p><strong>Reporte #:</strong> {despachoSeleccionado.id}</p>
                          </div>
                        </div>
                        
                        {despachoSeleccionado.detalles && (
                          <>
                            {Object.values(agruparPorCategoria(despachoSeleccionado.detalles)).map((grupo, index) => (
                              <div key={index} className="mb-4">
                                <h6 className="bg-dark text-white p-2">{grupo.nombre}</h6>
                                <div className="table-responsive">
                                  <table className="table table-sm table-bordered">
                                    <thead className="table-secondary">
                                      <tr>
                                        <th>Producto</th>
                                        <th>Medida</th>
                                        <th>Precio</th>
                                        <th>Salida</th>
                                        <th>Recarga</th>
                                        <th>Retorno</th>
                                        <th>Vendido</th>
                                        <th>Valor ($)</th>
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
                            ))}
                            
                            <div className="d-flex justify-content-end mb-4">
                              <div className="card bg-light" style={{ width: '250px' }}>
                                <div className="card-body">
                                  <h6 className="card-title">RESUMEN</h6>
                                  <div className="d-flex justify-content-between mb-2">
                                    <span>Total productos vendidos:</span>
                                    <strong>{calcularTotales(despachoSeleccionado.detalles).totalVendido}</strong>
                                  </div>
                                  <div className="d-flex justify-content-between">
                                    <span>Total ventas:</span>
                                    <strong>${calcularTotales(despachoSeleccionado.detalles).totalVenta.toFixed(2)}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="firma-container">
                              <div className="firma-box">
                                <div className="firma-linea"></div>
                                <div>Revisado por</div>
                                <div><strong>{despachoSeleccionado.usuario_nombre}</strong></div>
                              </div>
                              <div className="firma-box">
                                <div className="firma-linea"></div>
                                <div>Autorizado por</div>
                                <div><strong>Jose Antonio Escalante Tobar</strong></div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : despachos.length > 0 ? (
                  <div className="alert alert-info">
                    <p className="mb-0">Seleccione un despacho de la lista para ver el reporte</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="alert alert-info">
              <p className="mb-0">No tienes despachos completados para generar reportes.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MisReportes;