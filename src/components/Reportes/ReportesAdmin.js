import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaPrint, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';

const ReportesAdmin = () => {
  const [despachos, setDespachos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    ruta_id: '',
    usuario_id: ''
  });
  const [reporteGeneral, setReporteGeneral] = useState(null);
  const [tipoReporte, setTipoReporte] = useState('general'); // 'general', 'ruta', 'usuario'
  const reporteRef = useRef();

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [despachosRes, usuariosRes, rutasRes] = await Promise.all([
          axios.post('http://localhost/sistema-despacho/server/despachos.php', {
            action: 'listar'
          }),
          axios.post('http://localhost/sistema-despacho/server/usuarios.php', {
            action: 'listar'
          }),
          axios.post('http://localhost/sistema-despacho/server/rutas.php', {
            action: 'listar'
          })
        ]);

        if (despachosRes.data.success) {
          setDespachos(despachosRes.data.despachos);
        } else {
          setError(despachosRes.data.mensaje || 'Error al cargar despachos');
        }

        if (usuariosRes.data.success) {
          setUsuarios(usuariosRes.data.usuarios);
        } else {
          setError(usuariosRes.data.mensaje || 'Error al cargar usuarios');
        }

        if (rutasRes.data.success) {
          setRutas(rutasRes.data.rutas);
        } else {
          setError(rutasRes.data.mensaje || 'Error al cargar rutas');
        }
      } catch (error) {
        setError('Error en el servidor');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // Manejar cambios en filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para filtrar despachos
  const filtrarDespachos = () => {
    let despachosFiltrados = [...despachos].filter(d => 
      d.estado === 'completado' || d.estado === 'retorno_tarde'
    );
    
    if (filtros.fechaInicio) {
      despachosFiltrados = despachosFiltrados.filter(d => 
        d.fecha >= filtros.fechaInicio
      );
    }
    
    if (filtros.fechaFin) {
      despachosFiltrados = despachosFiltrados.filter(d => 
        d.fecha <= filtros.fechaFin
      );
    }
    
    if (filtros.ruta_id) {
      despachosFiltrados = despachosFiltrados.filter(d => 
        d.ruta_id === parseInt(filtros.ruta_id)
      );
    }
    
    if (filtros.usuario_id) {
      despachosFiltrados = despachosFiltrados.filter(d => 
        d.usuario_id === parseInt(filtros.usuario_id)
      );
    }
    
    return despachosFiltrados;
  };

  // Generar reporte
  const generarReporte = async () => {
    setLoading(true);
    setError('');
    try {
      const despachosFiltrados = filtrarDespachos();
      
      if (despachosFiltrados.length === 0) {
        setError('No hay datos para generar el reporte con los filtros seleccionados');
        setReporteGeneral(null);
        setLoading(false);
        return;
      }
      
      // Obtener detalles de cada despacho
      const detallesPromises = despachosFiltrados.map(despacho => 
        axios.post('http://localhost/sistema-despacho/server/despachos.php', {
          action: 'obtener',
          id: despacho.id
        })
      );
      
      const detallesResponses = await Promise.all(detallesPromises);
      
      // Procesar detalles para el reporte
      const despachosConDetalles = detallesResponses
        .filter(res => res.data.success)
        .map(res => res.data.despacho);
      
      // Generar resumen de productos vendidos
      const resumenProductos = {};
      const resumenPorRuta = {};
      const resumenPorUsuario = {};
      let totalVendido = 0;
      let totalDinero = 0;
      
      despachosConDetalles.forEach(despacho => {
        // Inicializar resumen por ruta si no existe
        if (!resumenPorRuta[despacho.ruta_id]) {
          resumenPorRuta[despacho.ruta_id] = {
            nombre: despacho.ruta_nombre,
            tipo: despacho.ruta_tipo,
            totalVendido: 0,
            totalDinero: 0,
            despachos: 0
          };
        }
        
        // Inicializar resumen por usuario si no existe
        if (!resumenPorUsuario[despacho.usuario_id]) {
          resumenPorUsuario[despacho.usuario_id] = {
            nombre: despacho.usuario_nombre,
            totalVendido: 0,
            totalDinero: 0,
            despachos: 0
          };
        }
        
        // Incrementar contadores de despachos
        resumenPorRuta[despacho.ruta_id].despachos++;
        resumenPorUsuario[despacho.usuario_id].despachos++;
        
        // Procesar detalles de cada despacho
        if (despacho.detalles && despacho.detalles.length > 0) {
          despacho.detalles.forEach(detalle => {
            const productoKey = `${detalle.producto_id}`;
            
            // Inicializar resumen de producto si no existe
            if (!resumenProductos[productoKey]) {
              resumenProductos[productoKey] = {
                id: detalle.producto_id,
                nombre: detalle.producto_nombre,
                medida: detalle.medida,
                categoria: detalle.categoria_nombre,
                categoria_id: detalle.categoria_id,
                totalVendido: 0,
                totalRetornado: 0,
                valorTotal: 0
              };
            }
            
            // Sumar cantidades al resumen del producto
            resumenProductos[productoKey].totalVendido += parseInt(detalle.total_vendido);
            resumenProductos[productoKey].totalRetornado += parseInt(detalle.retorno_tarde);
            resumenProductos[productoKey].valorTotal += parseFloat(detalle.valor_venta);
            
            // Sumar al total general
            totalVendido += parseInt(detalle.total_vendido);
            totalDinero += parseFloat(detalle.valor_venta);
            
            // Sumar a los totales por ruta
            resumenPorRuta[despacho.ruta_id].totalVendido += parseInt(detalle.total_vendido);
            resumenPorRuta[despacho.ruta_id].totalDinero += parseFloat(detalle.valor_venta);
            
            // Sumar a los totales por usuario
            resumenPorUsuario[despacho.usuario_id].totalVendido += parseInt(detalle.total_vendido);
            resumenPorUsuario[despacho.usuario_id].totalDinero += parseFloat(detalle.valor_venta);
          });
        }
      });
      
      // Convertir objetos a arrays para renderizado
      const productosArray = Object.values(resumenProductos);
      const rutasArray = Object.values(resumenPorRuta);
      const usuariosArray = Object.values(resumenPorUsuario);
      
      // Agrupar productos por categoría
      const productosPorCategoria = {};
      productosArray.forEach(producto => {
        if (!productosPorCategoria[producto.categoria_id]) {
          productosPorCategoria[producto.categoria_id] = {
            nombre: producto.categoria,
            productos: []
          };
        }
        productosPorCategoria[producto.categoria_id].productos.push(producto);
      });
      
      // Ordenar productos por medida dentro de cada categoría
      Object.keys(productosPorCategoria).forEach(categoriaId => {
        productosPorCategoria[categoriaId].productos.sort((a, b) => a.medida.localeCompare(b.medida));
      });
      
      // Generar reporte final
      setReporteGeneral({
        fechaInicio: filtros.fechaInicio || 'Todas',
        fechaFin: filtros.fechaFin || 'Todas',
        totalDespachos: despachosFiltrados.length,
        totalVendido,
        totalDinero,
        productosPorCategoria,
        rutasArray,
        usuariosArray
      });
      
    } catch (error) {
      setError('Error al generar el reporte');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    if (!fechaStr || fechaStr === 'Todas') return fechaStr;
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
    documentTitle: 'Reporte_Sistema_Despacho',
  });

  return (
    <div className="reportes-admin">
      <h2 className="mb-4">Reportes Administrativos</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="my-1">Generar Reportes</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label htmlFor="fechaInicio" className="form-label">Fecha Desde</label>
              <div className="input-group">
                <span className="input-group-text"><FaCalendarAlt /></span>
                <input 
                  type="date" 
                  className="form-control" 
                  id="fechaInicio"
                  name="fechaInicio"
                  value={filtros.fechaInicio}
                  onChange={handleFiltroChange}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label htmlFor="fechaFin" className="form-label">Fecha Hasta</label>
              <div className="input-group">
                <span className="input-group-text"><FaCalendarAlt /></span>
                <input 
                  type="date" 
                  className="form-control" 
                  id="fechaFin"
                  name="fechaFin"
                  value={filtros.fechaFin}
                  onChange={handleFiltroChange}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label htmlFor="ruta_id" className="form-label">Ruta</label>
              <select 
                className="form-select" 
                id="ruta_id"
                name="ruta_id"
                value={filtros.ruta_id}
                onChange={handleFiltroChange}
              >
                <option value="">Todas las rutas</option>
                {rutas.map(ruta => (
                  <option key={ruta.id} value={ruta.id}>{ruta.nombre} - {ruta.tipo}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="usuario_id" className="form-label">Usuario</label>
              <select 
                className="form-select" 
                id="usuario_id"
                name="usuario_id"
                value={filtros.usuario_id}
                onChange={handleFiltroChange}
              >
                <option value="">Todos los usuarios</option>
                {usuarios.map(usuario => (
                  <option key={usuario.id} value={usuario.id}>{usuario.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6">
              <div className="d-flex">
                <div className="form-check me-3">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="tipoReporte" 
                    id="reporteGeneral"
                    checked={tipoReporte === 'general'}
                    onChange={() => setTipoReporte('general')}
                  />
                  <label className="form-check-label" htmlFor="reporteGeneral">
                    Reporte General
                  </label>
                </div>
                <div className="form-check me-3">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="tipoReporte" 
                    id="reporteRuta"
                    checked={tipoReporte === 'ruta'}
                    onChange={() => setTipoReporte('ruta')}
                  />
                  <label className="form-check-label" htmlFor="reporteRuta">
                    Reporte por Ruta
                  </label>
                </div>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="tipoReporte" 
                    id="reporteUsuario"
                    checked={tipoReporte === 'usuario'}
                    onChange={() => setTipoReporte('usuario')}
                  />
                  <label className="form-check-label" htmlFor="reporteUsuario">
                    Reporte por Usuario
                  </label>
                </div>
              </div>
            </div>
            <div className="col-md-6 text-end">
              <button 
                className="btn btn-primary" 
                onClick={generarReporte}
                disabled={loading}
              >
                <FaSearch className="me-1" /> {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {reporteGeneral && (
        <div className="card">
          <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
            <h5 className="my-1">Resultados del Reporte</h5>
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
                <h4>SISTEMA DE CONTROL DE DESPACHO</h4>
                <h5>{tipoReporte === 'general' ? 'REPORTE GENERAL' : 
                     tipoReporte === 'ruta' ? 'REPORTE POR RUTA' : 
                     'REPORTE POR USUARIO'}</h5>
              </div>
              
              <div className="row mb-4">
                <div className="col-md-6">
                  <p><strong>Fecha Desde:</strong> {formatearFecha(reporteGeneral.fechaInicio)}</p>
                  <p><strong>Fecha Hasta:</strong> {formatearFecha(reporteGeneral.fechaFin)}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Total Despachos:</strong> {reporteGeneral.totalDespachos}</p>
                  <p><strong>Fecha del Reporte:</strong> {formatearFecha(new Date().toISOString().split('T')[0])}</p>
                </div>
              </div>
              
              {/* Reporte General - Productos por Categoría */}
              {tipoReporte === 'general' && (
                <>
                  <h6 className="bg-dark text-white p-2 mb-3">PRODUCTOS VENDIDOS POR CATEGORÍA</h6>
                  
                  {Object.values(reporteGeneral.productosPorCategoria).map((categoria, index) => (
                    <div key={index} className="mb-4">
                      <h6 className="bg-secondary text-white p-2">{categoria.nombre}</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>Producto</th>
                              <th>Medida</th>
                              <th>Total Vendido</th>
                              <th>Total Retornado</th>
                              <th>Valor Total ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoria.productos.map((producto, i) => (
                              <tr key={i}>
                                <td>{producto.nombre}</td>
                                <td>{producto.medida}</td>
                                <td>{producto.totalVendido}</td>
                                <td>{producto.totalRetornado}</td>
                                <td>${producto.valorTotal.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              {/* Reporte por Ruta */}
              {tipoReporte === 'ruta' && (
                <>
                  <h6 className="bg-dark text-white p-2 mb-3">DESEMPEÑO POR RUTA</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Ruta</th>
                          <th>Tipo</th>
                          <th>Total Despachos</th>
                          <th>Productos Vendidos</th>
                          <th>Valor Total ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteGeneral.rutasArray.map((ruta, i) => (
                          <tr key={i}>
                            <td>{ruta.nombre}</td>
                            <td>{ruta.tipo}</td>
                            <td>{ruta.despachos}</td>
                            <td>{ruta.totalVendido}</td>
                            <td>${ruta.totalDinero.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Reporte por Usuario */}
              {tipoReporte === 'usuario' && (
                <>
                  <h6 className="bg-dark text-white p-2 mb-3">DESEMPEÑO POR USUARIO</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Usuario</th>
                          <th>Total Despachos</th>
                          <th>Productos Vendidos</th>
                          <th>Valor Total ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteGeneral.usuariosArray.map((usuario, i) => (
                          <tr key={i}>
                            <td>{usuario.nombre}</td>
                            <td>{usuario.despachos}</td>
                            <td>{usuario.totalVendido}</td>
                            <td>${usuario.totalDinero.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              <div className="d-flex justify-content-end mb-4">
                <div className="card bg-light" style={{ width: '250px' }}>
                  <div className="card-body">
                    <h6 className="card-title">RESUMEN GENERAL</h6>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Total productos vendidos:</span>
                      <strong>{reporteGeneral.totalVendido}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Total ventas:</span>
                      <strong>${reporteGeneral.totalDinero.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="firma-container">
                <div className="firma-box">
                  <div className="firma-linea"></div>
                  <div>Generado por</div>
                  <div><strong>Administrador del Sistema</strong></div>
                </div>
                <div className="firma-box">
                  <div className="firma-linea"></div>
                  <div>Autorizado por</div>
                  <div><strong>Jose Antonio Escalante Tobar</strong></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesAdmin;