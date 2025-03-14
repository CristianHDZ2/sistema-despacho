import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaRoute } from 'react-icons/fa';

const RutasAdmin = () => {
  const [rutas, setRutas] = useState([]);
  const [ruta, setRuta] = useState({
    id: 0,
    nombre: '',
    tipo: ''
  });
  const [modalTitle, setModalTitle] = useState('Nueva Ruta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Tipos de ruta disponibles
  const tiposRuta = ['GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'];

  // Cargar lista de rutas
  const cargarRutas = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/rutas.php', {
        action: 'listar'
      });

      if (response.data.success) {
        setRutas(response.data.rutas);
      } else {
        setError(response.data.mensaje || 'Error al cargar rutas');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRutas();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRuta(prevState => ({
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
      const action = ruta.id === 0 ? 'crear' : 'actualizar';
      const response = await axios.post('http://localhost/sistema-despacho/server/rutas.php', {
        action,
        ...ruta
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        resetForm();
        cargarRutas();
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

  // Manejar edición de ruta
  const handleEdit = (rt) => {
    setRuta({
      id: rt.id,
      nombre: rt.nombre,
      tipo: rt.tipo
    });
    setModalTitle('Editar Ruta');
  };

  // Manejar eliminación de ruta
  const handleDelete = async (id) => {
    if (confirmDelete === id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/rutas.php', {
          action: 'eliminar',
          id
        });

        if (response.data.success) {
          setSuccess(response.data.mensaje);
          cargarRutas();
        } else {
          setError(response.data.mensaje || 'Error al eliminar ruta');
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
    setRuta({
      id: 0,
      nombre: '',
      tipo: ''
    });
    setModalTitle('Nueva Ruta');
  };

  // Obtener clase de color según tipo de ruta
  const getTipoClass = (tipo) => {
    switch (tipo) {
      case 'GRUPO AJE':
        return 'bg-danger text-white';
      case 'LA CONSTANCIA':
        return 'bg-primary text-white';
      case 'PRODUCTOS VARIOS':
        return 'bg-success text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  return (
    <div className="rutas-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Rutas</h2>
        <button 
          className="btn btn-primary" 
          data-bs-toggle="modal" 
          data-bs-target="#rutaModal"
          onClick={resetForm}
        >
          <FaPlus /> Nueva Ruta
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading && <div className="text-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>}

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Nombre de la Ruta</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rutas.length > 0 ? (
              rutas.map(rt => (
                <tr key={rt.id}>
                  <td>{rt.nombre}</td>
                  <td>
                    <span className={`badge ${getTipoClass(rt.tipo)}`}>
                      {rt.tipo}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-warning me-2" 
                      onClick={() => handleEdit(rt)}
                      data-bs-toggle="modal" 
                      data-bs-target="#rutaModal"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button 
                      className={`btn btn-sm ${confirmDelete === rt.id ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => handleDelete(rt.id)}
                    >
                      <FaTrash /> {confirmDelete === rt.id ? '¿Confirmar?' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="3" className="text-center">No hay rutas registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para agregar/editar ruta */}
      <div className="modal fade" id="rutaModal" tabIndex="-1" aria-labelledby="rutaModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="rutaModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="nombre" className="form-label">Nombre de la Ruta</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="nombre"
                    name="nombre"
                    value={ruta.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="tipo" className="form-label">Tipo de Ruta</label>
                  <select 
                    className="form-select" 
                    id="tipo"
                    name="tipo"
                    value={ruta.tipo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione un tipo</option>
                    {tiposRuta.map((tipo, index) => (
                      <option key={index} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" id="closeModalBtn">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Ruta'}
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

export default RutasAdmin;