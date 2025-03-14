import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaArrowLeft, FaTag } from 'react-icons/fa';

const CategoriasAdmin = ({ categorias = [], onBack, onUpdate }) => {
  const [listaCategorias, setListaCategorias] = useState(categorias);
  const [categoria, setCategoria] = useState({
    id: 0,
    nombre: ''
  });
  const [modalTitle, setModalTitle] = useState('Nueva Categoría');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Cargar categorías si es necesario
  useEffect(() => {
    if (categorias.length === 0) {
      cargarCategorias();
    } else {
      setListaCategorias(categorias);
    }
  }, [categorias]);

  // Cargar lista de categorías
  const cargarCategorias = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/productos.php', {
        action: 'listarCategorias'
      });

      if (response.data.success) {
        setListaCategorias(response.data.categorias);
      } else {
        setError(response.data.mensaje || 'Error al cargar categorías');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCategoria(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const action = categoria.id === 0 ? 'crearCategoria' : 'actualizarCategoria';
      const response = await axios.post('http://localhost/sistema-despacho/server/productos.php', {
        action,
        ...categoria
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        resetForm();
        cargarCategorias();
        document.getElementById('closeCategoriaModalBtn').click();
        if (onUpdate) onUpdate();
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

  // Manejar edición de categoría
  const handleEdit = (cat) => {
    setCategoria({
      id: cat.id,
      nombre: cat.nombre
    });
    setModalTitle('Editar Categoría');
  };

  // Manejar eliminación de categoría
  const handleDelete = async (id) => {
    if (confirmDelete === id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/productos.php', {
          action: 'eliminarCategoria',
          id
        });

        if (response.data.success) {
          setSuccess(response.data.mensaje);
          cargarCategorias();
          if (onUpdate) onUpdate();
        } else {
          setError(response.data.mensaje || 'Error al eliminar categoría');
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
    setCategoria({
      id: 0,
      nombre: ''
    });
    setModalTitle('Nueva Categoría');
  };

  return (
    <div className="categorias-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary me-3" 
            onClick={onBack}
          >
            <FaArrowLeft /> Volver
          </button>
          <h2>Gestión de Categorías</h2>
        </div>
        <button 
          className="btn btn-primary" 
          data-bs-toggle="modal" 
          data-bs-target="#categoriaModal"
          onClick={resetForm}
        >
          <FaPlus /> Nueva Categoría
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>}

      <div className="card">
        <div className="card-header bg-dark text-white">
          <h5 className="my-1">Lista de Categorías</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaCategorias.length > 0 ? (
                  listaCategorias.map(cat => (
                    <tr key={cat.id}>
                      <td>{cat.id}</td>
                      <td>
                        <span className="d-flex align-items-center">
                          <FaTag className="me-2" />
                          {cat.nombre}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-warning me-2" 
                          onClick={() => handleEdit(cat)}
                          data-bs-toggle="modal" 
                          data-bs-target="#categoriaModal"
                        >
                          <FaEdit /> Editar
                        </button>
                        <button 
                          className={`btn btn-sm ${confirmDelete === cat.id ? 'btn-danger' : 'btn-outline-danger'}`}
                          onClick={() => handleDelete(cat.id)}
                        >
                          <FaTrash /> {confirmDelete === cat.id ? '¿Confirmar?' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : !loading && (
                  <tr>
                    <td colSpan="3" className="text-center">No hay categorías registradas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar categoría */}
      <div className="modal fade" id="categoriaModal" tabIndex="-1" aria-labelledby="categoriaModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="categoriaModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="nombre" className="form-label">Nombre de la Categoría</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="nombre"
                    name="nombre"
                    value={categoria.nombre}
                    onChange={handleChange}
                    required
                  />
                  <small className="form-text text-muted">
                    Ingrese un nombre descriptivo para la categoría de productos.
                  </small>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" id="closeCategoriaModalBtn">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Categoría'}
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

export default CategoriasAdmin;