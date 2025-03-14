import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaBox } from 'react-icons/fa';

const ProductosAdmin = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [producto, setProducto] = useState({
    id: 0,
    nombre: '',
    precio: '',
    medida: '',
    categoria_id: ''
  });
  const [modalTitle, setModalTitle] = useState('Nuevo Producto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Cargar lista de productos y categorías
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        axios.post('http://localhost/sistema-despacho/server/productos.php', {
          action: 'listar'
        }),
        axios.post('http://localhost/sistema-despacho/server/productos.php', {
          action: 'listarCategorias'
        })
      ]);

      if (productosRes.data.success) {
        setProductos(productosRes.data.productos);
      } else {
        setError(productosRes.data.mensaje || 'Error al cargar productos');
      }

      if (categoriasRes.data.success) {
        setCategorias(categoriasRes.data.categorias);
      } else {
        setError(categoriasRes.data.mensaje || 'Error al cargar categorías');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto(prevState => ({
      ...prevState,
      [name]: name === 'precio' ? parseFloat(value) || '' : value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const action = producto.id === 0 ? 'crear' : 'actualizar';
      const response = await axios.post('http://localhost/sistema-despacho/server/productos.php', {
        action,
        ...producto
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        resetForm();
        cargarDatos();
        document.getElementById('closeModalBtn').click();
      } else {
        setError(response.data.mensaje || 'Error en la operación');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar edición de producto
  const handleEdit = (prod) => {
    setProducto({
      id: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      medida: prod.medida,
      categoria_id: prod.categoria_id
    });
    setModalTitle('Editar Producto');
  };

  // Manejar eliminación de producto
  const handleDelete = async (id) => {
    if (confirmDelete === id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/productos.php', {
          action: 'eliminar',
          id
        });

        if (response.data.success) {
          setSuccess(response.data.mensaje);
          cargarDatos();
        } else {
          setError(response.data.mensaje || 'Error al eliminar producto');
        }
      } catch (error) {
        setError('Error en el servidor');
        console.error('Error:', error);
      } finally {
        setLoading(false);
        setConfirmDelete(null);
      }
    } else {
      setConfirmDelete(id);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setProducto({
      id: 0,
      nombre: '',
      precio: '',
      medida: '',
      categoria_id: ''
    });
    setModalTitle('Nuevo Producto');
  };

  // Obtener nombre de categoría por ID
  const getCategoriaName = (categoriaId) => {
    const categoria = categorias.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nombre : 'N/A';
  };

  // Filtrar productos por categoría
  const productosPorCategoria = {};
  categorias.forEach(cat => {
    productosPorCategoria[cat.id] = productos.filter(
      prod => prod.categoria_id === cat.id
    ).sort((a, b) => a.medida.localeCompare(b.medida));
  });

  return (
    <div className="productos-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Productos</h2>
        <button 
          className="btn btn-primary" 
          data-bs-toggle="modal" 
          data-bs-target="#productoModal"
          onClick={resetForm}
        >
          <FaPlus /> Nuevo Producto
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>}

      {categorias.map(categoria => (
        <div key={categoria.id} className="card mb-4">
          <div className={`card-header ${
            categoria.nombre.includes('AJE') ? 'bg-danger text-white' : 
            categoria.nombre.includes('CONSTANCIA') ? 'bg-primary text-white' : 
            'bg-success text-white'
          }`}>
            <h5 className="my-1">{categoria.nombre}</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Nombre</th>
                    <th>Medida</th>
                    <th>Precio ($)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosPorCategoria[categoria.id] && productosPorCategoria[categoria.id].length > 0 ? (
                    productosPorCategoria[categoria.id].map(prod => (
                      <tr key={prod.id}>
                        <td>{prod.nombre}</td>
                        <td>{prod.medida}</td>
                        <td>${parseFloat(prod.precio).toFixed(2)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-warning me-2" 
                            onClick={() => handleEdit(prod)}
                            data-bs-toggle="modal" 
                            data-bs-target="#productoModal"
                          >
                            <FaEdit /> Editar
                          </button>
                          <button 
                            className={`btn btn-sm ${confirmDelete === prod.id ? 'btn-danger' : 'btn-outline-danger'}`}
                            onClick={() => handleDelete(prod.id)}
                          >
                            <FaTrash /> {confirmDelete === prod.id ? '¿Confirmar?' : 'Eliminar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : !loading && (
                    <tr>
                      <td colSpan="4" className="text-center">No hay productos en esta categoría</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Modal para agregar/editar producto */}
      <div className="modal fade" id="productoModal" tabIndex="-1" aria-labelledby="productoModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="productoModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="nombre" className="form-label">Nombre del Producto</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="nombre"
                    name="nombre"
                    value={producto.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="categoria_id" className="form-label">Categoría</label>
                  <select 
                    className="form-select" 
                    id="categoria_id"
                    name="categoria_id"
                    value={producto.categoria_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione una categoría</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="medida" className="form-label">Medida</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="medida"
                    name="medida"
                    value={producto.medida}
                    onChange={handleChange}
                    required
                    placeholder="Ej: 500ml, 1L, 2.5L"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="precio" className="form-label">Precio Unitario ($)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="precio"
                    name="precio"
                    value={producto.precio}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" id="closeModalBtn">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Producto'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductosAdmin;