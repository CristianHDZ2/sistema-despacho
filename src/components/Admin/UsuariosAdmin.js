import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaUser } from 'react-icons/fa';

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [usuario, setUsuario] = useState({
    id: 0,
    nombre: '',
    dui: '',
    telefono: '',
    correo: '',
    direccion: '',
    password: '',
    foto: ''
  });
  const [modalTitle, setModalTitle] = useState('Nuevo Usuario');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Cargar lista de usuarios
  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/usuarios.php', {
        action: 'listar'
      });

      if (response.data.success) {
        setUsuarios(response.data.usuarios);
      } else {
        setError(response.data.mensaje || 'Error al cargar usuarios');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUsuario(prevState => ({
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
      const action = usuario.id === 0 ? 'crear' : 'actualizar';
      const response = await axios.post('http://localhost/sistema-despacho/server/usuarios.php', {
        action,
        ...usuario
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        resetForm();
        cargarUsuarios();
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

  // Manejar edición de usuario
  const handleEdit = (usr) => {
    setUsuario({
      id: usr.id,
      nombre: usr.nombre,
      dui: usr.dui,
      telefono: usr.telefono,
      correo: usr.correo,
      direccion: usr.direccion,
      password: '',
      foto: usr.foto || ''
    });
    setModalTitle('Editar Usuario');
  };

  // Manejar eliminación de usuario
  const handleDelete = async (id) => {
    if (confirmDelete === id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/usuarios.php', {
          action: 'eliminar',
          id
        });

        if (response.data.success) {
          setSuccess(response.data.mensaje);
          cargarUsuarios();
        } else {
          setError(response.data.mensaje || 'Error al eliminar usuario');
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
    setUsuario({
      id: 0,
      nombre: '',
      dui: '',
      telefono: '',
      correo: '',
      direccion: '',
      password: '',
      foto: ''
    });
    setModalTitle('Nuevo Usuario');
  };

  // Manejar subida de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUsuario(prevState => ({
          ...prevState,
          foto: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="usuarios-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Usuarios</h2>
        <button 
          className="btn btn-primary" 
          data-bs-toggle="modal" 
          data-bs-target="#userModal"
          onClick={resetForm}
        >
          <FaPlus /> Nuevo Usuario
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
              <th>Foto</th>
              <th>Nombre</th>
              <th>DUI</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.length > 0 ? (
              usuarios.map(usr => (
                <tr key={usr.id}>
                  <td>
                    {usr.foto ? (
                      <img 
                        src={usr.foto} 
                        alt={usr.nombre} 
                        className="img-thumbnail" 
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="text-center">
                        <FaUser size={30} />
                      </div>
                    )}
                  </td>
                  <td>{usr.nombre}</td>
                  <td>{usr.dui}</td>
                  <td>{usr.telefono}</td>
                  <td>{usr.correo}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-warning me-2" 
                      onClick={() => handleEdit(usr)}
                      data-bs-toggle="modal" 
                      data-bs-target="#userModal"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button 
                      className={`btn btn-sm ${confirmDelete === usr.id ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => handleDelete(usr.id)}
                    >
                      <FaTrash /> {confirmDelete === usr.id ? '¿Confirmar?' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="6" className="text-center">No hay usuarios registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para agregar/editar usuario */}
      <div className="modal fade" id="userModal" tabIndex="-1" aria-labelledby="userModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="userModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="nombre" className="form-label">Nombre Completo</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="nombre"
                        name="nombre"
                        value={usuario.nombre}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="dui" className="form-label">DUI (Formato: 00000000-0)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="dui"
                        name="dui"
                        value={usuario.dui}
                        onChange={handleChange}
                        required
                        pattern="^\d{8}-\d{1}$"
                        title="Formato requerido: 00000000-0"
                        readOnly={usuario.id !== 0}
                      />
                      <small className="form-text text-muted">
                        {usuario.id === 0 ? 'El sistema agregará automáticamente el guion si no lo incluye.' : 'El DUI no se puede modificar'}
                      </small>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="telefono" className="form-label">Teléfono</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="telefono"
                        name="telefono"
                        value={usuario.telefono}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">
                        {usuario.id === 0 ? 'Contraseña' : 'Contraseña (dejar en blanco para mantener la actual)'}
                      </label>
                      <input 
                        type="password" 
                        className="form-control" 
                        id="password"
                        name="password"
                        value={usuario.password}
                        onChange={handleChange}
                        required={usuario.id === 0}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="correo" className="form-label">Correo Electrónico</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        id="correo"
                        name="correo"
                        value={usuario.correo}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="direccion" className="form-label">Dirección</label>
                      <textarea 
                        className="form-control" 
                        id="direccion"
                        name="direccion"
                        value={usuario.direccion}
                        onChange={handleChange}
                        rows="3"
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="foto" className="form-label">Foto</label>
                      <input 
                        type="file" 
                        className="form-control" 
                        id="foto"
                        accept="image/*"
                        onChange={handleFotoChange}
                      />
                      {usuario.foto && (
                        <div className="mt-2 text-center">
                          <img 
                            src={usuario.foto} 
                            alt="Vista previa" 
                            className="img-thumbnail" 
                            style={{ maxHeight: '150px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" id="closeModalBtn">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Usuario'}
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

export default UsuariosAdmin;