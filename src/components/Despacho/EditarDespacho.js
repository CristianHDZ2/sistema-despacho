import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSave, FaTimes } from 'react-icons/fa';

const EditarDespacho = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [despacho, setDespacho] = useState(null);
  const [estadoAnterior, setEstadoAnterior] = useState('');

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
          const despachoData = response.data.despacho;
          setDespacho(despachoData);
          setEstadoAnterior(despachoData.estado);
          
          // Verificar si el despacho ya está completado
          if (despachoData.estado === 'completado') {
            setError('No se puede editar un despacho completado');
            setTimeout(() => {
              navigate('/despacho/historial');
            }, 2000);
          }
          
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
  }, [id, navigate]);

  // Manejar cambio en estado del despacho
  const handleEstadoChange = (e) => {
    const nuevoEstado = e.target.value;
    
    // Verificar progresión válida de estados
    const estadosValidos = ['salida_manana', 'recarga_mediodia', 'retorno_tarde', 'completado'];
    const indiceActual = estadosValidos.indexOf(estadoAnterior);
    const indiceNuevo = estadosValidos.indexOf(nuevoEstado);
    
    if (indiceNuevo <= indiceActual) {
      setError(`No se puede cambiar de ${estadoAnterior} a ${nuevoEstado}`);
      return;
    }
    
    setDespacho(prev => ({
      ...prev,
      estado: nuevoEstado
    }));
    setError('');
  };

  // Manejar cambio en cantidades de producto
  const handleProductoChange = (index, field, value) => {
    const nuevosDetalles = [...despacho.detalles];
    nuevosDetalles[index][field] = parseInt(value) || 0;
    
    setDespacho(prev => ({
      ...prev,
      detalles: nuevosDetalles
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Preparar datos para enviar
    const productosActualizados = despacho.detalles.map(detalle => ({
      producto_id: detalle.producto_id,
      precio: parseFloat(detalle.precio_unitario),
      salida_manana: parseInt(detalle.salida_manana),
      recarga_mediodia: parseInt(detalle.recarga_mediodia),
      retorno_tarde: parseInt(detalle.retorno_tarde)
    }));

    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
        action: 'crear', // Reusamos la acción "crear" que maneja actualizaciones
        despacho: {
          id: parseInt(id),
          fecha: despacho.fecha,
          ruta_id: despacho.ruta_id,
          usuario_id: despacho.usuario_id,
          estado: despacho.estado,
          productos: productosActualizados
        }
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        setTimeout(() => {
          navigate('/despacho/historial');
        }, 2000);
      } else {
        setError(response.data.mensaje || 'Error al actualizar el despacho');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading && !despacho) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  if (error && !despacho) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!despacho) {
    return <div className="alert alert-warning">Despacho no encontrado</div>;
  }

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

  // Determinar siguiente estado disponible
  const getSiguienteEstado = () => {
    const estadosValidos = ['salida_manana', 'recarga_mediodia', 'retorno_tarde', 'completado'];
    const indiceActual = estadosValidos.indexOf(estadoAnterior);
    
    if (indiceActual < estadosValidos.length - 1) {
      return estadosValidos[indiceActual + 1];
    }
    return estadoAnterior;
  };

  return (
    <div className="editar-despacho">
      <h2 className="mb-4">Actualizar Despacho #{despacho.id}</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="card-header bg-dark text-white">
            <h5 className="my-1">Información General</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="fecha" className="form-label">Fecha</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="fecha"
                    value={formatearFecha(despacho.fecha)}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="ruta" className="form-label">Ruta</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="ruta"
                    value={`${despacho.ruta_nombre} - ${despacho.ruta_tipo}`}
                    readOnly
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="estado" className="form-label">Estado</label>
                  <select 
                    className="form-select" 
                    id="estado"
                    value={despacho.estado}
                    onChange={handleEstadoChange}
                    required
                  >
                    <option value={estadoAnterior}>{estadoAnterior === 'salida_manana' ? 'Salida Mañana' : 
                                                 estadoAnterior === 'recarga_mediodia' ? 'Recarga Mediodía' : 
                                                 estadoAnterior === 'retorno_tarde' ? 'Retorno Tarde' : 
                                                 'Completado'}</option>
                    {getSiguienteEstado() !== estadoAnterior && (
                      <option value={getSiguienteEstado()}>
                        {getSiguienteEstado() === 'recarga_mediodia' ? 'Recarga Mediodía' : 
                         getSiguienteEstado() === 'retorno_tarde' ? 'Retorno Tarde' : 
                         'Completado'}
                      </option>
                    )}
                  </select>
                </div>
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
                      <th>Precio</th>
                      <th>Salida Mañana</th>
                      <th>Recarga Mediodía</th>
                      <th>Retorno Tarde</th>
                      <th>Total Vendido</th>
                      <th>Valor Venta ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.productos.map((detalle, i) => {
                      const detalleIndex = despacho.detalles.findIndex(d => d.id === detalle.id);
                      const totalVendido = (parseInt(detalle.salida_manana) + parseInt(detalle.recarga_mediodia)) - parseInt(detalle.retorno_tarde);
                      const valorVenta = totalVendido * parseFloat(detalle.precio_unitario);
                      
                      return (
                        <tr key={i}>
                          <td>{detalle.producto_nombre}</td>
                          <td>{detalle.medida}</td>
                          <td>${parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm" 
                              value={detalle.salida_manana}
                              onChange={(e) => handleProductoChange(detalleIndex, 'salida_manana', e.target.value)}
                              min="0"
                              disabled={despacho.estado !== 'salida_manana' || estadoAnterior !== 'salida_manana'}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm" 
                              value={detalle.recarga_mediodia}
                              onChange={(e) => handleProductoChange(detalleIndex, 'recarga_mediodia', e.target.value)}
                              min="0"
                              disabled={despacho.estado !== 'recarga_mediodia' || estadoAnterior !== 'salida_manana'}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control form-control-sm" 
                              value={detalle.retorno_tarde}
                              onChange={(e) => handleProductoChange(detalleIndex, 'retorno_tarde', e.target.value)}
                              min="0"
                              disabled={despacho.estado !== 'retorno_tarde' || estadoAnterior !== 'recarga_mediodia'}
                            />
                          </td>
                          <td>{totalVendido}</td>
                          <td>${valorVenta.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        <div className="d-flex justify-content-end">
          <button 
            type="button" 
            className="btn btn-secondary me-2" 
            onClick={() => navigate('/despacho/historial')}
            disabled={loading}
          >
            <FaTimes /> Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || despacho.estado === estadoAnterior}
          >
            <FaSave /> {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarDespacho;