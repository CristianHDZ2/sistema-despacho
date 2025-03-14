import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaBox, FaTags } from 'react-icons/fa';
import CategoriasAdmin from './CategoriasAdmin';

const ProductosAdmin = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [producto, setProducto] = useState({
    id: 0,
    nombre: '',
    precio: '',
    medida: '',
    categoria_id: '',
    grupo: '',
    unidades_paquete: ''
  });
  const [modalTitle, setModalTitle] = useState('Nuevo Producto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCategorias, setShowCategorias] = useState(false);
  const [errors, setErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

  // Constantes para grupos
  const GRUPOS = ['GRUPO AJE', 'LA CONSTANCIA', 'OTROS'];

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

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};
    
    if (!producto.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    
    if (!producto.precio || parseFloat(producto.precio) <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    }
    
    if (!producto.medida.trim()) newErrors.medida = 'La medida es obligatoria';
    
    if (!producto.categoria_id) newErrors.categoria_id = 'Debe seleccionar una categoría';
    
    if (!producto.grupo) newErrors.grupo = 'Debe seleccionar un grupo';
    
    if (!producto.unidades_paquete || parseInt(producto.unidades_paquete) <= 0) {
      newErrors.unidades_paquete = 'Debe especificar la cantidad de unidades por paquete';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormTouched({
      ...formTouched,
      [name]: true
    });
    
    setProducto(prevState => ({
      ...prevState,
      [name]: name === 'precio' 
        ? parseFloat(value) || '' 
        : name === 'unidades_paquete' 
          ? parseInt(value) || '' 
          : value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched = {};
    Object.keys(producto).forEach(key => {
      allTouched[key] = true;
    });
    setFormTouched(allTouched);
    
    if (!validateForm()) {
      return;
    }
    
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
      categoria_id: prod.categoria_id,
      grupo: prod.grupo,
      unidades_paquete: prod.unidades_paquete || 1
    });
    setModalTitle('Editar Producto');
    setErrors({});
    setFormTouched({});
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
      categoria_id: '',
      grupo: '',
      unidades_paquete: ''
    });
    setModalTitle('Nuevo Producto');
    setErrors({});
    setFormTouched({});
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

  // Obtener clase de grupo según el nombre
  const getGrupoClass = (grupo) => {
    switch (grupo) {
      case 'GRUPO AJE':
        return 'bg-danger';
      case 'LA CONSTANCIA':
        return 'bg-primary';
      default:
        return 'bg-success';
    }
  };

  // Manejar actualización de categorías
  const handleCategoriasUpdated = () => {
    cargarDatos();
    setShowCategorias(false);
  };

  if (showCategorias) {
    return <CategoriasAdmin 
      categorias={categorias} 
      onBack={() => setShowCategorias(false)}
      onUpdate={handleCategoriasUpdated}
    />;
  }

  return (
    <div className="productos-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Productos</h2>
        <div>
          <button 
            className="btn btn-info me-2" 
            onClick={() => setShowCategorias(true)}
          >
            <FaTags /> Gestionar Categorías
          </button>
          <button 
            className="btn btn-primary" 
            data-bs-toggle="modal" 
            data-bs-target="#productoModal"
            onClick={resetForm}
          >
            <FaPlus /> Nuevo Producto
          </button>
        </div>
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
                    <th>Grupo</th>
                    <th>Precio/Paquete ($)</th>
                    <th>Unid/Paquete</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosPorCategoria[categoria.id] && productosPorCategoria[categoria.id].length > 0 ? (
                    productosPorCategoria[categoria.id].map(prod => (
                      <tr key={prod.id}>
                        <td>{prod.nombre}</td>
                        <td>{prod.medida}</td>
                        <td>
                          <span className={`badge ${getGrupoClass(prod.grupo)} text-white`}>
                            {prod.grupo}
                          </span>
                        </td>
                        <td>${parseFloat(prod.precio).toFixed(2)}</td>
                        <td>{prod.unidades_paquete || 1}</td>
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
                      <td colSpan="6" className="text-center">No hay productos en esta categoría</td>
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
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="productoModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="nombre" className="form-label">Nombre del Producto *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formTouched.nombre && errors.nombre ? 'is-invalid' : ''}`} 
                        id="nombre"
                        name="nombre"
                        value={producto.nombre}
                        onChange={handleChange}
                        required
                      />
                      {formTouched.nombre && errors.nombre && (
                        <div className="invalid-feedback">{errors.nombre}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="categoria_id" className="form-label">Categoría *</label>
                      <select 
                        className={`form-select ${formTouched.categoria_id && errors.categoria_id ? 'is-invalid' : ''}`}
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
                      {formTouched.categoria_id && errors.categoria_id && (
                        <div className="invalid-feedback">{errors.categoria_id}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="grupo" className="form-label">Grupo *</label>
                      <select 
                        className={`form-select ${formTouched.grupo && errors.grupo ? 'is-invalid' : ''}`}
                        id="grupo"
                        name="grupo"
                        value={producto.grupo}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Seleccione un grupo</option>
                        {GRUPOS.map((grupo, idx) => (
                          <option key={idx} value={grupo}>{grupo}</option>
                        ))}
                      </select>
                      {formTouched.grupo && errors.grupo && (
                        <div className="invalid-feedback">{errors.grupo}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="medida" className="form-label">Medida *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formTouched.medida && errors.medida ? 'is-invalid' : ''}`}
                        id="medida"
                        name="medida"
                        value={producto.medida}
                        onChange={handleChange}
                        required
                        placeholder="Ej: 500ml, 1L, 2.5L"
                      />
                      {formTouched.medida && errors.medida && (
                        <div className="invalid-feedback">{errors.medida}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="precio" className="form-label">Precio por Paquete ($) *</label>
                      <input 
                        type="number" 
                        className={`form-control ${formTouched.precio && errors.precio ? 'is-invalid' : ''}`}
                        id="precio"
                        name="precio"
                        value={producto.precio}
                        onChange={handleChange}
                        step="0.01"
                        min="0.01"
                        required
                      />
                      {formTouched.precio && errors.precio && (
                        <div className="invalid-feedback">{errors.precio}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="unidades_paquete" className="form-label">Unidades por Paquete *</label>
                      <input 
                        type="number" 
                        className={`form-control ${formTouched.unidades_paquete && errors.unidades_paquete ? 'is-invalid' : ''}`}
                        id="unidades_paquete"
                        name="unidades_paquete"
                        value={producto.unidades_paquete}
                        onChange={handleChange}
                        min="1"
                        required
                      />
                      {formTouched.unidades_paquete && errors.unidades_paquete && (
                        <div className="invalid-feedback">{errors.unidades_paquete}</div>
                      )}
                      <small className="form-text text-muted">
                        Número de unidades que contiene cada paquete o fardo.
                      </small>
                    </div>
                  </div>
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