import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSave, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';

const DespachoForm = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rutas, setRutas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [despacho, setDespacho] = useState({
    ruta_id: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'salida_manana',
    productos: []
  });

  // Cargar rutas y productos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [rutasRes, productosRes] = await Promise.all([
          axios.post('http://localhost/sistema-despacho/server/rutas.php', {
            action: 'listar'
          }),
          axios.post('http://localhost/sistema-despacho/server/productos.php', {
            action: 'listar'
          })
        ]);

        if (rutasRes.data.success) {
          setRutas(rutasRes.data.rutas);
        } else {
          setError(rutasRes.data.mensaje || 'Error al cargar rutas');
        }

        if (productosRes.data.success) {
          setProductos(productosRes.data.productos);
        } else {
          setError(productosRes.data.mensaje || 'Error al cargar productos');
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

  // Manejar selección de ruta
  const handleRutaChange = (e) => {
    const rutaId = e.target.value;
    setDespacho(prev => ({
      ...prev,
      ruta_id: rutaId,
      productos: []
    }));

    if (rutaId) {
      // Obtener tipo de ruta seleccionada
      const rutaSeleccionada = rutas.find(r => r.id === parseInt(rutaId));
      if (rutaSeleccionada) {
        let productosFiltrados = [];
        
        switch (rutaSeleccionada.tipo) {
          case 'GRUPO AJE':
            // Solo productos de Grupo AJE (categoría 1)
            productosFiltrados = productos.filter(p => p.categoria_id === 1);
            break;
          case 'LA CONSTANCIA':
            // Solo productos de La Constancia (categoría 2)
            productosFiltrados = productos.filter(p => p.categoria_id === 2);
            break;
          case 'PRODUCTOS VARIOS':
            // Todos los productos (ya están ordenados por la API)
            productosFiltrados = productos;
            break;
          default:
            productosFiltrados = [];
        }

        // Inicializar productos seleccionados con cantidad 0
        const productosIniciales = productosFiltrados.map(p => ({
          producto_id: p.id,
          nombre: p.nombre,
          precio: parseFloat(p.precio),
          medida: p.medida,
          categoria_id: p.categoria_id,
          salida_manana: 0,
          recarga_mediodia: 0,
          retorno_tarde: 0
        }));

        setDespacho(prev => ({
          ...prev,
          productos: productosIniciales
        }));
      }
    }
  };

  // Manejar cambio en cantidades de producto
  const handleProductoChange = (index, field, value) => {
    const nuevosProductos = [...despacho.productos];
    nuevosProductos[index][field] = parseInt(value) || 0;

    setDespacho(prev => ({
      ...prev,
      productos: nuevosProductos
    }));
  };

  // Calcular total vendido
  const calcularTotalVendido = (producto) => {
    return (producto.salida_manana + producto.recarga_mediodia) - producto.retorno_tarde;
  };

  // Calcular valor de venta
  const calcularValorVenta = (producto) => {
    const totalVendido = calcularTotalVendido(producto);
    return totalVendido * producto.precio;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Filtrar productos que tengan al menos un valor > 0
    const productosActivos = despacho.productos.filter(p => 
      p.salida_manana > 0 || p.recarga_mediodia > 0 || p.retorno_tarde > 0
    );

    if (productosActivos.length === 0) {
      setError('Debe ingresar al menos un producto con cantidades');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/despachos.php', {
        action: 'crear',
        despacho: {
          ...despacho,
          usuario_id: user.id,
          productos: productosActivos
        }
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        setTimeout(() => {
          navigate('/despacho/historial');
        }, 2000);
      } else {
        setError(response.data.mensaje || 'Error al guardar el despacho');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar productos por categoría
  const productosPorCategoria = {};
  despacho.productos.forEach(producto => {
    if (!productosPorCategoria[producto.categoria_id]) {
      productosPorCategoria[producto.categoria_id] = [];
    }
    productosPorCategoria[producto.categoria_id].push(producto);
  });

  // Ordenar productos por medida
  Object.keys(productosPorCategoria).forEach(categoriaId => {
    productosPorCategoria[categoriaId].sort((a, b) => a.medida.localeCompare(b.medida));
  });

  return (
    <div className="despacho-form">
      <h2 className="mb-4">Nuevo Despacho</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="fecha" className="form-label">Fecha</label>
              <input 
                type="date" 
                className="form-control" 
                id="fecha"
                value={despacho.fecha}
                onChange={(e) => setDespacho(prev => ({ ...prev, fecha: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="ruta_id" className="form-label">Ruta</label>
              <select 
                className="form-select" 
                id="ruta_id"
                value={despacho.ruta_id}
                onChange={handleRutaChange}
                required
              >
                <option value="">Seleccione una ruta</option>
                {rutas.map(ruta => (
                  <option key={ruta.id} value={ruta.id}>{ruta.nombre} - {ruta.tipo}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="estado" className="form-label">Estado</label>
              <select 
                className="form-select" 
                id="estado"
                value={despacho.estado}
                onChange={(e) => setDespacho(prev => ({ ...prev, estado: e.target.value }))}
                required
              >
                <option value="salida_manana">Salida Mañana</option>
                <option value="recarga_mediodia">Recarga Mediodía</option>
                <option value="retorno_tarde">Retorno Tarde</option>
              </select>
            </div>
          </div>
        </div>

        {despacho.ruta_id && despacho.productos.length > 0 ? (
          <>
            <div className="card mb-4">
              <div className="card-header bg-secondary text-white">
                <h5 className="my-1">Lista de Productos</h5>
              </div>
              <div className="card-body">
                {Object.keys(productosPorCategoria).map(categoriaId => {
                  const categoriaNombre = categoriaId === '1' ? 'PRODUCTOS GRUPO AJE' : 
                                        categoriaId === '2' ? 'PRODUCTOS LA CONSTANCIA' : 
                                        'PRODUCTOS VARIOS';
                  
                  const categoriaClass = categoriaId === '1' ? 'bg-danger text-white' : 
                                       categoriaId === '2' ? 'bg-primary text-white' : 
                                       'bg-success text-white';
                  
                  return (
                    <div key={categoriaId} className="mb-4">
                      <h6 className={`p-2 ${categoriaClass}`}>{categoriaNombre}</h6>
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
                            {productosPorCategoria[categoriaId].map((producto, index) => {
                              const totalIndex = despacho.productos.findIndex(p => p.producto_id === producto.producto_id);
                              return (
                                <tr key={producto.producto_id}>
                                  <td>{producto.nombre}</td>
                                  <td>{producto.medida}</td>
                                  <td>${parseFloat(producto.precio).toFixed(2)}</td>
                                  <td>
                                    <input 
                                      type="number" 
                                      className="form-control form-control-sm" 
                                      value={producto.salida_manana}
                                      onChange={(e) => handleProductoChange(totalIndex, 'salida_manana', e.target.value)}
                                      min="0"
                                      disabled={despacho.estado !== 'salida_manana'}
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      type="number" 
                                      className="form-control form-control-sm" 
                                      value={producto.recarga_mediodia}
                                      onChange={(e) => handleProductoChange(totalIndex, 'recarga_mediodia', e.target.value)}
                                      min="0"
                                      disabled={despacho.estado !== 'recarga_mediodia'}
                                    />
                                  </td>
                                  <td>
                                    <input 
                                      type="number" 
                                      className="form-control form-control-sm" 
                                      value={producto.retorno_tarde}
                                      onChange={(e) => handleProductoChange(totalIndex, 'retorno_tarde', e.target.value)}
                                      min="0"
                                      disabled={despacho.estado !== 'retorno_tarde'}
                                    />
                                  </td>
                                  <td>
                                    {calcularTotalVendido(producto)}
                                  </td>
                                  <td>
                                    ${calcularValorVenta(producto).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button 
                type="button" 
                className="btn btn-secondary me-2" 
                onClick={() => navigate('/despacho')}
                disabled={loading}
              >
                <FaTimes /> Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
              >
                <FaSave /> {loading ? 'Guardando...' : 'Guardar Despacho'}
              </button>
            </div>
          </>
        ) : despacho.ruta_id && (
          <div className="alert alert-info">
            <p className="mb-0">Cargando productos para esta ruta...</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default DespachoForm;