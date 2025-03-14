import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaUser, FaExclamationTriangle } from 'react-icons/fa';

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
  const [errors, setErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

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

  // Validar correo electrónico
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  // Validar contraseña (debe tener al menos una letra, un número y un símbolo)
  const validatePassword = (password) => {
    // Mínimo 8 caracteres, al menos una letra, un número y un símbolo
    const re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return re.test(password);
  };

  // Validar todos los campos
  const validateForm = () => {
    const newErrors = {};
    
    if (!usuario.nombre.trim()) newErrors.nombre = 'Nombre es obligatorio';
    
    // Validar DUI (formato 00000000-0)
    if (!usuario.dui) {
      newErrors.dui = 'DUI es obligatorio';
    } else if (!/^\d{8}-\d{1}$/.test(usuario.dui)) {
      newErrors.dui = 'Formato de DUI inválido (debe ser 00000000-0)';
    }
    
    if (!usuario.telefono.trim()) newErrors.telefono = 'Teléfono es obligatorio';
    
    // Validar correo
    if (!usuario.correo.trim()) {
      newErrors.correo = 'Correo electrónico es obligatorio';
    } else if (!validateEmail(usuario.correo)) {
      newErrors.correo = 'Formato de correo electrónico inválido';
    }
    
    if (!usuario.direccion.trim()) newErrors.direccion = 'Dirección es obligatoria';
    
    // Validar contraseña
    if (usuario.id === 0 && !usuario.password) {
      newErrors.password = 'Contraseña es obligatoria';
    } else if (usuario.id === 0 || (usuario.id !== 0 && usuario.password)) {
      if (!validatePassword(usuario.password)) {
        newErrors.password = 'La contraseña debe tener al menos 8 caracteres, una letra, un número y un símbolo';
      }
    }
    
    // Validar foto
    if (usuario.id === 0 && !usuario.foto) {
      newErrors.foto = 'La fotografía es obligatoria';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formatear DUI automáticamente
  const formatDUI = (value) => {
    // Eliminar caracteres no numéricos
    const cleaned = value.replace(/[^0-9]/g, '');
    
    // Máximo 9 dígitos
    const truncated = cleaned.substring(0, 9);
    
    // Insertar guion después del octavo dígito si hay al menos 9 dígitos
    if (truncated.length > 8) {
      return `${truncated.substring(0, 8)}-${truncated.substring(8, 9)}`;
    } 
    // Insertar guion después del octavo dígito si hay exactamente 8 dígitos
    else if (truncated.length === 8) {
      return `${truncated}-`;
    }
    // Devolver los dígitos sin guion si hay menos de 8 dígitos
    else {
      return truncated;
    }
  };

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormTouched({
      ...formTouched,
      [name]: true
    });
    
    if (name === 'dui') {
      // Aplicar formato automático al DUI
      setUsuario(prev => ({
        ...prev,
        [name]: formatDUI(value)
      }));
    } else {
      setUsuario(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched = {};
    Object.keys(usuario).forEach(key => {
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
    setErrors({});
    setFormTouched({});
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
    setErrors({});
    setFormTouched({});
  };

  // Manejar subida de foto
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    setFormTouched({
      ...formTouched,
      foto: true
    });
    
    if (file) {
      // Validar tipo de archivo (solo imágenes)
      if (!file.type.match('image.*')) {
        setErrors({
          ...errors,
          foto: 'Solo se permiten archivos de imagen'
        });
        return;
      }
      
      // Validar tamaño de archivo (máximo 1MB)
      if (file.size > 1024 * 1024) {
        setErrors({
          ...errors,
          foto: 'La imagen no debe exceder 1MB'
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUsuario(prevState => ({
          ...prevState,
          foto: reader.result
        }));
        
        // Limpiar error si había uno
        if (errors.foto) {
          setErrors({
            ...errors,
            foto: undefined
          });
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Si no se selecciona ningún archivo y es un nuevo usuario
      if (usuario.id === 0) {
        setErrors({
          ...errors,
          foto: 'La fotografía es obligatoria'
        });
      }
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
                      <label htmlFor="nombre" className="form-label">Nombre Completo *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formTouched.nombre && errors.nombre ? 'is-invalid' : ''}`} 
                        id="nombre"
                        name="nombre"
                        value={usuario.nombre}
                        onChange={handleChange}
                        required
                      />
                      {formTouched.nombre && errors.nombre && (
                        <div className="invalid-feedback">{errors.nombre}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="dui" className="form-label">DUI (Formato: 00000000-0) *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formTouched.dui && errors.dui ? 'is-invalid' : ''}`} 
                        id="dui"
                        name="dui"
                        value={usuario.dui}
                        onChange={handleChange}
                        maxLength="10"
                        required
                        readOnly={usuario.id !== 0}
                      />
                      {formTouched.dui && errors.dui ? (
                        <div className="invalid-feedback">{errors.dui}</div>
                      ) : (
                        <small className="form-text text-muted">
                          {usuario.id === 0 ? 'El guion se añadirá automáticamente después del octavo dígito.' : 'El DUI no se puede modificar'}
                        </small>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="telefono" className="form-label">Teléfono *</label>
                      <input 
                        type="text" 
                        className={`form-control ${formTouched.telefono && errors.telefono ? 'is-invalid' : ''}`} 
                        id="telefono"
                        name="telefono"
                        value={usuario.telefono}
                        onChange={handleChange}
                        required
                      />
                      {formTouched.telefono && errors.telefono && (
                        <div className="invalid-feedback">{errors.telefono}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">
                        {usuario.id === 0 ? 'Contraseña *' : 'Contraseña (dejar en blanco para mantener la actual)'}
                      </label>
                      <input 
                        type="password" 
                        className={`form-control ${formTouched.password && errors.password ? 'is-invalid' : ''}`} 
                        id="password"
                        name="password"
                        value={usuario.password}
                        onChange={handleChange}
                        required={usuario.id === 0}
                      />
                      {formTouched.password && errors.password ? (
                        <div className="invalid-feedback">{errors.password}</div>
                      ) : (
                        <small className="form-text text-muted">
                          La contraseña debe tener al menos 8 caracteres, incluir letras, números y al menos un símbolo (@$!%*#?&).
                        </small>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="correo" className="form-label">Correo Electrónico *</label>
                      <input 
                        type="email" 
                        className={`form-control ${formTouched.correo && errors.correo ? 'is-invalid' : ''}`} 
                        id="correo"
                        name="correo"
                        value={usuario.correo}
                        onChange={handleChange}
                        required
                      />
                      {formTouched.correo && errors.correo && (
                        <div className="invalid-feedback">{errors.correo}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="direccion" className="form-label">Dirección *</label>
                      <textarea 
                        className={`form-control ${formTouched.direccion && errors.direccion ? 'is-invalid' : ''}`} 
                        id="direccion"
                        name="direccion"
                        value={usuario.direccion}
                        onChange={handleChange}
                        rows="3"
                        required
                      ></textarea>
                      {formTouched.direccion && errors.direccion && (
                        <div className="invalid-feedback">{errors.direccion}</div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="foto" className="form-label">Foto {usuario.id === 0 ? '*' : ''}</label>
                      <input 
                        type="file" 
                        className={`form-control ${formTouched.foto && errors.foto ? 'is-invalid' : ''}`} 
                        id="foto"
                        accept="image/*"
                        onChange={handleFotoChange}
                        required={usuario.id === 0 && !usuario.foto}
                      />
                      {formTouched.foto && errors.foto ? (
                        <div className="invalid-feedback">{errors.foto}</div>
                      ) : (
                        <small className="form-text text-muted">
                          Formatos permitidos: JPG, PNG. Tamaño máximo: 1MB.
                        </small>
                      )}
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
                    {Object.keys(errors).length > 0 && formTouched.nombre && (
                      <div className="alert alert-warning d-flex align-items-center">
                        <FaExclamationTriangle className="me-2" />
                        <div>Por favor corrige los errores del formulario antes de continuar.</div>
                      </div>
                    )}
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