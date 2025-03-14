import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEdit, FaTrash, FaPlus, FaRoute, FaCarAlt, FaUserTie, FaExclamationCircle } from 'react-icons/fa';

const RutasAdmin = () => {
  const [rutas, setRutas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [ruta, setRuta] = useState({
    id: 0,
    nombre: '',
    tipo: '',
    placa_vehiculo: '',
    motorista_id: ''
  });
  const [modalTitle, setModalTitle] = useState('Nueva Ruta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});
  const [disponibilidad, setDisponibilidad] = useState({
    motorista: true,
    placa: true,
    rutaMotorista: '',
    rutaPlaca: ''
  });

  // Tipos de ruta disponibles
  const tiposRuta = ['GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'];

  // Cargar lista de rutas y motoristas
  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Cargar rutas y motoristas en paralelo
      const [rutasResponse, motoristasResponse] = await Promise.all([
        axios.post('http://localhost/sistema-despacho/server/rutas.php', {
          action: 'listar'
        }),
        axios.post('http://localhost/sistema-despacho/server/motoristas.php', {
          action: 'listar'
        })
      ]);

      if (rutasResponse.data.success) {
        setRutas(rutasResponse.data.rutas);
      } else {
        setError(rutasResponse.data.mensaje || 'Error al cargar rutas');
      }

      if (motoristasResponse.data.success) {
        setMotoristas(motoristasResponse.data.motoristas);
      } else {
        setError(motoristasResponse.data.mensaje || 'Error al cargar motoristas');
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

  // Validar placa de vehículo
  const validarPlaca = (placa) => {
    // Formato válido: P123-456 o N12345 o CC-12345
    return /^[A-Z]{1,2}[-\s]?\d{1,5}([-\s]\d{1,3})?$/.test(placa);
  };

  // Verificar disponibilidad de motorista y placa
  const verificarDisponibilidad = async (motorista_id, placa_vehiculo, ruta_id = 0) => {
    try {
      const response = await axios.post('http://localhost/sistema-despacho/server/rutas.php', {
        action: 'verificarDisponibilidad',
        motorista_id,
        placa_vehiculo,
        ruta_id
      });

      if (response.data.success) {
        const disponible = {
          motorista: response.data.disponibilidad.motorista,
          placa: response.data.disponibilidad.placa,
          rutaMotorista: response.data.rutaMotorista || '',
          rutaPlaca: response.data.rutaPlaca || ''
        };
        setDisponibilidad(disponible);
        return disponible;
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
    }

    // Por defecto, asumir que están disponibles
    return {
      motorista: true,
      placa: true,
      rutaMotorista: '',
      rutaPlaca: ''
    };
  };

  // Validar formulario
  const validateForm = async () => {
    const newErrors = {};
    
    if (!ruta.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    
    if (!ruta.tipo) {
      newErrors.tipo = 'Debe seleccionar un tipo de ruta';
    }
    
    if (!ruta.placa_vehiculo.trim()) {
      newErrors.placa_vehiculo = 'La placa del vehículo es obligatoria';
    } else if (!validarPlaca(ruta.placa_vehiculo)) {
      newErrors.placa_vehiculo = 'Formato de placa inválido (Ej: P123-456, N12345, CC-12345)';
    }
    
    // Verificar disponibilidad en tiempo real
    if (ruta.motorista_id || ruta.placa_vehiculo) {
      const disponible = await verificarDisponibilidad(
        ruta.motorista_id, 
        ruta.placa_vehiculo,
        ruta.id
      );
      
      if (ruta.motorista_id && !disponible.motorista) {
        newErrors.motorista_id = `Este motorista ya está asignado a la ruta: ${disponible.rutaMotorista}`;
      }
      
      if (ruta.placa_vehiculo && !disponible.placa) {
        newErrors.placa_vehiculo = `Esta placa ya está asignada a la ruta: ${disponible.rutaPlaca}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleChange = async (e) => {
    const { name, value } = e.target;
    
    setFormTouched({
      ...formTouched,
      [name]: true
    });
    
    let newValue = value;
    
    if (name === 'placa_vehiculo') {
      // Convertir a mayúsculas para las placas
      newValue = value.toUpperCase();
    }
    
    setRuta(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Verificar disponibilidad en tiempo real cuando cambia motorista o placa
    if ((name === 'motorista_id' && value) || (name === 'placa_vehiculo' && value.trim())) {
      const motorista_id = name === 'motorista_id' ? value : ruta.motorista_id;
      const placa_vehiculo = name === 'placa_vehiculo' ? newValue : ruta.placa_vehiculo;
      
      if (motorista_id || placa_vehiculo) {
        await verificarDisponibilidad(motorista_id, placa_vehiculo, ruta.id);
      }
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados para mostrar errores
    const allTouched = {};
    Object.keys(ruta).forEach(key => {
      allTouched[key] = true;
    });
    setFormTouched(allTouched);
    
    if (!(await validateForm())) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const action = ruta.id === 0 ? 'crear' : 'actualizar';
      
      // Si motorista_id está vacío, enviarlo como null para que el backend lo maneje correctamente
      const rutaData = {
        ...ruta,
        motorista_id: ruta.motorista_id || null
      };
      
      const response = await axios.post('http://localhost/sistema-despacho/server/rutas.php', {
        action,
        ...rutaData
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

  // Manejar edición de ruta
  const handleEdit = async (rt) => {
    setRuta({
      id: rt.id,
      nombre: rt.nombre,
      tipo: rt.tipo,
      placa_vehiculo: rt.placa_vehiculo || '',
      motorista_id: rt.motorista_id || ''
    });
    setModalTitle('Editar Ruta');
    setErrors({});
    setFormTouched({});
    
    // Resetear estado de disponibilidad
    setDisponibilidad({
      motorista: true,
      placa: true,
      rutaMotorista: '',
      rutaPlaca: ''
    });
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
          cargarDatos();
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
      tipo: '',
      placa_vehiculo: '',
      motorista_id: ''
    });
    setModalTitle('Nueva Ruta');
    setErrors({});
    setFormTouched({});
    // Resetear estado de disponibilidad
    setDisponibilidad({
      motorista: true,
      placa: true,
      rutaMotorista: '',
      rutaPlaca: ''
    });
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
  
  // Obtener nombre de motorista por ID
  const getMotoristaName = (id) => {
    const motorista = motoristas.find(m => m.id === parseInt(id));
    return motorista ? motorista.nombre : 'No asignado';
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
              <th>Placa del Vehículo</th>
              <th>Motorista</th>
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
                    <span className="d-flex align-items-center">
                      <FaCarAlt className="me-2" />
                      {rt.placa_vehiculo || 'Sin placa'}
                    </span>
                  </td>
                  <td>
                    <span className="d-flex align-items-center">
                      <FaUserTie className="me-2" />
                      {rt.motorista_id ? getMotoristaName(rt.motorista_id) : 'No asignado'}
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
                <td colSpan="5" className="text-center">No hay rutas registradas</td>
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
                    className={`form-control ${formTouched.nombre && errors.nombre ? 'is-invalid' : ''}`} 
                    id="nombre"
                    name="nombre"
                    value={ruta.nombre}
                    onChange={handleChange}
                    required
                  />
                  {formTouched.nombre && errors.nombre && (
                    <div className="invalid-feedback">{errors.nombre}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="tipo" className="form-label">Tipo de Ruta</label>
                  <select 
                    className={`form-select ${formTouched.tipo && errors.tipo ? 'is-invalid' : ''}`} 
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
                  {formTouched.tipo && errors.tipo && (
                    <div className="invalid-feedback">{errors.tipo}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="placa_vehiculo" className="form-label">Placa del Vehículo</label>
                  <div className="input-group">
                    <span className="input-group-text"><FaCarAlt /></span>
                    <input 
                      type="text" 
                      className={`form-control ${formTouched.placa_vehiculo && errors.placa_vehiculo ? 'is-invalid' : ''}`} 
                      id="placa_vehiculo"
                      name="placa_vehiculo"
                      value={ruta.placa_vehiculo}
                      onChange={handleChange}
                      placeholder="Ej: P123-456"
                      required
                    />
                    {formTouched.placa_vehiculo && errors.placa_vehiculo && (
                      <div className="invalid-feedback">{errors.placa_vehiculo}</div>
                    )}
                  </div>
                  <small className="form-text text-muted">
                    Formatos válidos: P123-456, N12345, CC-12345
                  </small>
                  {!errors.placa_vehiculo && formTouched.placa_vehiculo && ruta.placa_vehiculo && !disponibilidad.placa && (
                    <div className="alert alert-warning mt-2">
                      <FaExclamationCircle className="me-2" />
                      Esta placa ya está asignada a la ruta: {disponibilidad.rutaPlaca}
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label htmlFor="motorista_id" className="form-label">Motorista Asignado</label>
                  <select 
                    className={`form-select ${formTouched.motorista_id && errors.motorista_id ? 'is-invalid' : ''}`}
                    id="motorista_id"
                    name="motorista_id"
                    value={ruta.motorista_id}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione un motorista (opcional)</option>
                    {motoristas.map(mot => (
                      <option key={mot.id} value={mot.id}>
                        {mot.nombre} - {mot.tipo_licencia.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {formTouched.motorista_id && errors.motorista_id && (
                    <div className="invalid-feedback">{errors.motorista_id}</div>
                  )}
                  <small className="form-text text-muted">
                    Si no selecciona un motorista, la ruta quedará sin asignación.
                  </small>
                  {!errors.motorista_id && formTouched.motorista_id && ruta.motorista_id && !disponibilidad.motorista && (
                    <div className="alert alert-warning mt-2">
                      <FaExclamationCircle className="me-2" />
                      Este motorista ya está asignado a la ruta: {disponibilidad.rutaMotorista}
                    </div>
                  )}
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