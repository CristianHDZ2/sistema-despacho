import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaIdCard, FaUserTie } from 'react-icons/fa';

const MotoristasAdmin = () => {
  const [motoristas, setMotoristas] = useState([]);
  const [motorista, setMotorista] = useState({
    id: 0,
    nombre: '',
    dui: '',
    numero_licencia: '',
    tipo_licencia: ''
  });
  const [modalTitle, setModalTitle] = useState('Nuevo Motorista');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});

  // Tipos de licencia disponibles
  const tiposLicencia = ['liviana', 'pesada', 'particular'];

  // Cargar lista de motoristas
  const cargarMotoristas = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/motoristas.php', {
        action: 'listar'
      });

      if (response.data.success) {
        setMotoristas(response.data.motoristas);
      } else {
        setError(response.data.mensaje || 'Error al cargar motoristas');
      }
    } catch (error) {
      setError('Error en el servidor');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMotoristas();
  }, []);

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

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};
    
    if (!motorista.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    
    // Validar DUI (formato 00000000-0)
    if (!motorista.dui) {
      newErrors.dui = 'DUI es obligatorio';
    } else if (!/^\d{8}-\d{1}$/.test(motorista.dui)) {
      newErrors.dui = 'Formato de DUI inválido (debe ser 00000000-0)';
    }
    
    if (!motorista.numero_licencia.trim()) {
      newErrors.numero_licencia = 'El número de licencia es obligatorio';
    }
    
    if (!motorista.tipo_licencia) {
      newErrors.tipo_licencia = 'Debe seleccionar un tipo de licencia';
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
    
    if (name === 'dui') {
      // Aplicar formato automático al DUI
      setMotorista(prev => ({
        ...prev,
        [name]: formatDUI(value)
      }));
    } else {
      setMotorista(prev => ({
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
    Object.keys(motorista).forEach(key => {
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
      const action = motorista.id === 0 ? 'crear' : 'actualizar';
      const response = await axios.post('http://localhost/sistema-despacho/server/motoristas.php', {
        action,
        ...motorista
      });

      if (response.data.success) {
        setSuccess(response.data.mensaje);
        resetForm();
        cargarMotoristas();
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

  // Manejar edición de motorista
  const handleEdit = (mot) => {
    setMotorista({
      id: mot.id,
      nombre: mot.nombre,
      dui: mot.dui,
      numero_licencia: mot.numero_licencia,
      tipo_licencia: mot.tipo_licencia
    });
    setModalTitle('Editar Motorista');
    setErrors({});
    setFormTouched({});
  };

  // Manejar eliminación de motorista
  const handleDelete = async (id) => {
    if (confirmDelete === id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.post('http://localhost/sistema-despacho/server/motoristas.php', {
          action: 'eliminar',
          id
        });

        if (response.data.success) {
          setSuccess(response.data.mensaje);
          cargarMotoristas();
        } else {
          setError(response.data.mensaje || 'Error al eliminar motorista');
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
    setMotorista({
      id: 0,
      nombre: '',
      dui: '',
      numero_licencia: '',
      tipo_licencia: ''
    });
    setModalTitle('Nuevo Motorista');
    setErrors({});
    setFormTouched({});
  };

  return (
    <div className="motoristas-admin">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Motoristas</h2>
        <button 
          className="btn btn-primary" 
          data-bs-toggle="modal" 
          data-bs-target="#motoristaModal"
          onClick={resetForm}
        >
          <FaPlus /> Nuevo Motorista
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
              <th>Nombre</th>
              <th>DUI</th>
              <th>Número de Licencia</th>
              <th>Tipo de Licencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {motoristas.length > 0 ? (
              motoristas.map(mot => (
                <tr key={mot.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <FaUserTie className="me-2" />
                      {mot.nombre}
                    </div>
                  </td>
                  <td>{mot.dui}</td>
                  <td>{mot.numero_licencia}</td>
                  <td>
                    <span className={`badge ${
                      mot.tipo_licencia === 'liviana' ? 'bg-info' : 
                      mot.tipo_licencia === 'pesada' ? 'bg-warning' : 
                      'bg-secondary'
                    }`}>
                      {mot.tipo_licencia.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-warning me-2" 
                      onClick={() => handleEdit(mot)}
                      data-bs-toggle="modal" 
                      data-bs-target="#motoristaModal"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button 
                      className={`btn btn-sm ${confirmDelete === mot.id ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => handleDelete(mot.id)}
                    >
                      <FaTrash /> {confirmDelete === mot.id ? '¿Confirmar?' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            ) : !loading && (
              <tr>
                <td colSpan="5" className="text-center">No hay motoristas registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para agregar/editar motorista */}
      <div className="modal fade" id="motoristaModal" tabIndex="-1" aria-labelledby="motoristaModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="motoristaModalLabel">{modalTitle}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="nombre" className="form-label">Nombre Completo</label>
                  <input 
                    type="text" 
                    className={`form-control ${formTouched.nombre && errors.nombre ? 'is-invalid' : ''}`} 
                    id="nombre"
                    name="nombre"
                    value={motorista.nombre}
                    onChange={handleChange}
                    required
                  />
                  {formTouched.nombre && errors.nombre && (
                    <div className="invalid-feedback">{errors.nombre}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="dui" className="form-label">DUI (Formato: 00000000-0)</label>
                  <input 
                    type="text" 
                    className={`form-control ${formTouched.dui && errors.dui ? 'is-invalid' : ''}`} 
                    id="dui"
                    name="dui"
                    value={motorista.dui}
                    onChange={handleChange}
                    maxLength="10"
                    required
                  />
                  {formTouched.dui && errors.dui ? (
                    <div className="invalid-feedback">{errors.dui}</div>
                  ) : (
                    <small className="form-text text-muted">
                      El guion se añadirá automáticamente después del octavo dígito.
                    </small>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="numero_licencia" className="form-label">Número de Licencia</label>
                  <input 
                    type="text" 
                    className={`form-control ${formTouched.numero_licencia && errors.numero_licencia ? 'is-invalid' : ''}`} 
                    id="numero_licencia"
                    name="numero_licencia"
                    value={motorista.numero_licencia}
                    onChange={handleChange}
                    required
                  />
                  {formTouched.numero_licencia && errors.numero_licencia && (
                    <div className="invalid-feedback">{errors.numero_licencia}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="tipo_licencia" className="form-label">Tipo de Licencia</label>
                  <select 
                    className={`form-select ${formTouched.tipo_licencia && errors.tipo_licencia ? 'is-invalid' : ''}`} 
                    id="tipo_licencia"
                    name="tipo_licencia"
                    value={motorista.tipo_licencia}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione un tipo</option>
                    {tiposLicencia.map((tipo, index) => (
                      <option key={index} value={tipo}>{tipo.toUpperCase()}</option>
                    ))}
                  </select>
                  {formTouched.tipo_licencia && errors.tipo_licencia && (
                    <div className="invalid-feedback">{errors.tipo_licencia}</div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" id="closeModalBtn">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Motorista'}
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

export default MotoristasAdmin;