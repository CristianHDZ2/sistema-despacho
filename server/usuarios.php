<?php
require_once 'conexion.php';

// Obtenemos los datos enviados
$data = json_decode(file_get_contents("php://input"), true);
$action = isset($data['action']) ? $data['action'] : '';

// Variable de respuesta
$response = ['success' => false];

// Manejo de acciones
switch ($action) {
    case 'login':
        $dui = isset($data['dui']) ? $data['dui'] : '';
        $password = isset($data['password']) ? $data['password'] : '';

        // Verificar si es admin
        if ($dui === 'admin' && $password === 'admin') {
            $response = [
                'success' => true,
                'usuario' => [
                    'id' => 1,
                    'nombre' => 'Administrador',
                    'dui' => 'admin',
                    'rol' => 'admin'
                ]
            ];
        } else {
            // Consulta para usuario normal
            $stmt = $conexion->prepare("SELECT id, nombre, dui, telefono, correo, direccion, foto, rol, password FROM usuarios WHERE dui = ?");
            $stmt->bind_param("s", $dui);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows > 0) {
                $usuario = $result->fetch_assoc();
                
                // Verificar contraseña
                if (password_verify($password, $usuario['password'])) {
                    // Eliminar la contraseña antes de enviar
                    unset($usuario['password']);
                    
                    $response = [
                        'success' => true,
                        'usuario' => $usuario
                    ];
                } else {
                    $response['mensaje'] = 'Contraseña incorrecta';
                }
            } else {
                $response['mensaje'] = 'Usuario no encontrado';
            }
            $stmt->close();
        }
        break;

    case 'listar':
        // Verificar si se solicita un usuario específico
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id > 0) {
            $stmt = $conexion->prepare("SELECT id, nombre, dui, telefono, correo, direccion, foto, rol FROM usuarios WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $response = [
                    'success' => true,
                    'usuario' => $result->fetch_assoc()
                ];
            } else {
                $response['mensaje'] = 'Usuario no encontrado';
            }
            $stmt->close();
        } else {
            $stmt = $conexion->prepare("SELECT id, nombre, dui, telefono, correo, direccion, foto, rol FROM usuarios WHERE rol != 'admin'");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $usuarios = [];
            while ($row = $result->fetch_assoc()) {
                $usuarios[] = $row;
            }
            
            $response = [
                'success' => true,
                'usuarios' => $usuarios
            ];
            $stmt->close();
        }
        break;
        case 'crear':
            $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
            $telefono = isset($data['telefono']) ? trim($data['telefono']) : '';
            $correo = isset($data['correo']) ? trim($data['correo']) : '';
            $direccion = isset($data['direccion']) ? trim($data['direccion']) : '';
            $password = isset($data['password']) ? $data['password'] : '';
            $dui = isset($data['dui']) ? trim($data['dui']) : '';
            $rol = 'user'; // Por defecto todos son usuarios excepto el admin
            $foto = isset($data['foto']) ? $data['foto'] : '';
            
            // Validar campos obligatorios
            if (empty($nombre) || empty($telefono) || empty($correo) || empty($direccion) || empty($password) || empty($dui) || empty($foto)) {
                $response['mensaje'] = 'Todos los campos son obligatorios, incluida la fotografía';
                echo json_encode($response);
                exit;
            }
            
            // Validar correo electrónico
            if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                $response['mensaje'] = 'Formato de correo electrónico inválido';
                echo json_encode($response);
                exit;
            }
            
            // Validar contraseña (debe tener letras, números y símbolos)
            if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/', $password)) {
                $response['mensaje'] = 'La contraseña debe tener al menos 8 caracteres, incluir letras, números y al menos un símbolo (@$!%*#?&)';
                echo json_encode($response);
                exit;
            }
            
            // Validar DUI formato 00000000-0
            if (!preg_match('/^\d{8}-\d{1}$/', $dui)) {
                // Formatear DUI automáticamente
                $dui = preg_replace('/[^0-9]/', '', $dui);
                if (strlen($dui) === 9) {
                    $dui = substr($dui, 0, 8) . '-' . substr($dui, 8);
                } else {
                    $response['mensaje'] = 'Formato de DUI inválido. Debe contener 8 dígitos, un guion y 1 dígito';
                    echo json_encode($response);
                    exit;
                }
            }
            
            // Validar formato de imagen (base64)
            if (empty($foto) || !preg_match('/^data:image\/(\w+);base64,/', $foto)) {
                $response['mensaje'] = 'La fotografía es obligatoria y debe ser una imagen válida';
                echo json_encode($response);
                exit;
            }
            
            // Verificar que el DUI no exista
            $stmt = $conexion->prepare("SELECT id FROM usuarios WHERE dui = ?");
            $stmt->bind_param("s", $dui);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $response['mensaje'] = 'El DUI ya está registrado';
            } else {
                // Generar hash seguro de la contraseña
                $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                
                // Intentar la operación en un bloque try-catch para capturar errores
                try {
                    $stmt = $conexion->prepare("INSERT INTO usuarios (nombre, dui, telefono, correo, direccion, password, rol, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmt->bind_param("ssssssss", $nombre, $dui, $telefono, $correo, $direccion, $passwordHash, $rol, $foto);
                    
                    if ($stmt->execute()) {
                        $response = [
                            'success' => true,
                            'id' => $conexion->insert_id,
                            'mensaje' => 'Usuario creado correctamente'
                        ];
                    } else {
                        throw new Exception($stmt->error);
                    }
                } catch (Exception $e) {
                    $response['mensaje'] = 'Error al crear el usuario: ' . $e->getMessage();
                    
                    // Si es un error de tamaño de datos, proporcionar un mensaje más claro
                    if (strpos($e->getMessage(), 'Data too long') !== false) {
                        $response['mensaje'] = 'La imagen es demasiado grande. Por favor, utiliza una imagen más pequeña o de menor resolución.';
                    }
                }
            }
            $stmt->close();
            break;
            case 'actualizar':
                $id = isset($data['id']) ? intval($data['id']) : 0;
                $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
                $telefono = isset($data['telefono']) ? trim($data['telefono']) : '';
                $correo = isset($data['correo']) ? trim($data['correo']) : '';
                $direccion = isset($data['direccion']) ? trim($data['direccion']) : '';
                $foto = isset($data['foto']) ? $data['foto'] : '';
                
                // Validar campos obligatorios
                if (empty($nombre) || empty($telefono) || empty($correo) || empty($direccion)) {
                    $response['mensaje'] = 'Todos los campos son obligatorios';
                    echo json_encode($response);
                    exit;
                }
                
                // Validar correo electrónico
                if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    $response['mensaje'] = 'Formato de correo electrónico inválido';
                    echo json_encode($response);
                    exit;
                }
                
                // Verificar si hay cambio de contraseña
                $passwordSql = '';
                $tiposParametros = 'ssssi';
                $parametros = [$nombre, $telefono, $correo, $direccion, $id];
                
                if (isset($data['password']) && !empty($data['password'])) {
                    // Validar contraseña (debe tener letras, números y símbolos)
                    if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/', $data['password'])) {
                        $response['mensaje'] = 'La contraseña debe tener al menos 8 caracteres, incluir letras, números y al menos un símbolo (@$!%*#?&)';
                        echo json_encode($response);
                        exit;
                    }
                    
                    $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
                    $passwordSql = ', password = ?';
                    $tiposParametros = 'sssssi';
                    array_splice($parametros, 4, 0, [$passwordHash]);
                }
                
                try {
                    $stmt = $conexion->prepare("UPDATE usuarios SET nombre = ?, telefono = ?, correo = ?, direccion = ? $passwordSql WHERE id = ?");
                    $stmt->bind_param($tiposParametros, ...$parametros);
                    
                    if ($stmt->execute()) {
                        // Si hay foto nueva, actualizar por separado
                        if (!empty($foto)) {
                            // Validar formato de imagen (base64)
                            if (!preg_match('/^data:image\/(\w+);base64,/', $foto)) {
                                $response['mensaje'] = 'La fotografía debe ser una imagen válida';
                                echo json_encode($response);
                                exit;
                            }
                            
                            try {
                                $stmtFoto = $conexion->prepare("UPDATE usuarios SET foto = ? WHERE id = ?");
                                $stmtFoto->bind_param("si", $foto, $id);
                                $stmtFoto->execute();
                                $stmtFoto->close();
                            } catch (Exception $e) {
                                $response['mensaje'] = 'Error al actualizar la foto: ' . $e->getMessage();
                                
                                // Si es un error de tamaño de datos, proporcionar un mensaje más claro
                                if (strpos($e->getMessage(), 'Data too long') !== false) {
                                    $response['mensaje'] = 'La imagen es demasiado grande. Por favor, utiliza una imagen más pequeña o de menor resolución.';
                                }
                                
                                echo json_encode($response);
                                exit;
                            }
                        }
                        
                        $response = [
                            'success' => true,
                            'mensaje' => 'Usuario actualizado correctamente'
                        ];
                    } else {
                        throw new Exception($stmt->error);
                    }
                } catch (Exception $e) {
                    $response['mensaje'] = 'Error al actualizar el usuario: ' . $e->getMessage();
                }
                
                $stmt->close();
                break;
        
            case 'eliminar':
                $id = isset($data['id']) ? intval($data['id']) : 0;
                
                if ($id <= 0) {
                    $response['mensaje'] = 'ID de usuario inválido';
                    break;
                }
                
                // Primero verificar si el usuario tiene despachos
                $stmt = $conexion->prepare("SELECT id FROM despachos WHERE usuario_id = ? LIMIT 1");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows > 0) {
                    $response['mensaje'] = 'No se puede eliminar el usuario porque tiene despachos asociados';
                    $stmt->close();
                    break;
                }
                $stmt->close();
                
                try {
                    // Eliminar usuario
                    $stmt = $conexion->prepare("DELETE FROM usuarios WHERE id = ? AND rol != 'admin'");
                    $stmt->bind_param("i", $id);
                    
                    if ($stmt->execute() && $stmt->affected_rows > 0) {
                        $response = [
                            'success' => true,
                            'mensaje' => 'Usuario eliminado correctamente'
                        ];
                    } else {
                        $response['mensaje'] = 'Error al eliminar el usuario o el usuario es administrador';
                    }
                    $stmt->close();
                } catch (Exception $e) {
                    $response['mensaje'] = 'Error al eliminar el usuario: ' . $e->getMessage();
                }
                break;
                
            default:
                $response['mensaje'] = 'Acción no válida';
        }
        
        echo json_encode($response);
        ?>