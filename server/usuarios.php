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
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $telefono = isset($data['telefono']) ? $data['telefono'] : '';
        $correo = isset($data['correo']) ? $data['correo'] : '';
        $direccion = isset($data['direccion']) ? $data['direccion'] : '';
        $password = isset($data['password']) ? password_hash($data['password'], PASSWORD_DEFAULT) : '';
        $dui = isset($data['dui']) ? $data['dui'] : '';
        $rol = 'user'; // Por defecto todos son usuarios excepto el admin
        $foto = isset($data['foto']) ? $data['foto'] : '';
        
        // Validar DUI formato 00000000-0
        if (!preg_match('/^\d{8}-\d{1}$/', $dui)) {
            // Formatear DUI automáticamente
            $dui = preg_replace('/[^0-9]/', '', $dui);
            if (strlen($dui) === 9) {
                $dui = substr($dui, 0, 8) . '-' . substr($dui, 8);
            } else {
                $response['mensaje'] = 'Formato de DUI inválido';
                echo json_encode($response);
                exit;
            }
        }
        
        // Verificar que el DUI no exista
        $stmt = $conexion->prepare("SELECT id FROM usuarios WHERE dui = ?");
        $stmt->bind_param("s", $dui);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'El DUI ya está registrado';
        } else {
            $stmt = $conexion->prepare("INSERT INTO usuarios (nombre, dui, telefono, correo, direccion, password, rol, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssssss", $nombre, $dui, $telefono, $correo, $direccion, $password, $rol, $foto);
            
            if ($stmt->execute()) {
                $response = [
                    'success' => true,
                    'id' => $conexion->insert_id,
                    'mensaje' => 'Usuario creado correctamente'
                ];
            } else {
                $response['mensaje'] = 'Error al crear el usuario: ' . $stmt->error;
            }
        }
        $stmt->close();
        break;

    case 'actualizar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $telefono = isset($data['telefono']) ? $data['telefono'] : '';
        $correo = isset($data['correo']) ? $data['correo'] : '';
        $direccion = isset($data['direccion']) ? $data['direccion'] : '';
        $foto = isset($data['foto']) ? $data['foto'] : '';
        
        // Verificar si hay cambio de contraseña
        $passwordSql = '';
        $tiposParametros = 'ssssi';
        $parametros = [$nombre, $telefono, $correo, $direccion, $id];
        
        if (isset($data['password']) && !empty($data['password'])) {
            $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
            $passwordSql = ', password = ?';
            $tiposParametros = 'sssssi';
            array_splice($parametros, 4, 0, [$passwordHash]);
        }
        
        $stmt = $conexion->prepare("UPDATE usuarios SET nombre = ?, telefono = ?, correo = ?, direccion = ? $passwordSql WHERE id = ?");
        $stmt->bind_param($tiposParametros, ...$parametros);
        
        if ($stmt->execute()) {
            // Si hay foto, actualizar por separado
            if (!empty($foto)) {
                $stmtFoto = $conexion->prepare("UPDATE usuarios SET foto = ? WHERE id = ?");
                $stmtFoto->bind_param("si", $foto, $id);
                $stmtFoto->execute();
                $stmtFoto->close();
            }
            
            $response = [
                'success' => true,
                'mensaje' => 'Usuario actualizado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al actualizar el usuario: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'eliminar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        // Primero verificar si el usuario tiene despachos
        $stmt = $conexion->prepare("SELECT id FROM despachos WHERE usuario_id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'No se puede eliminar el usuario porque tiene despachos asociados';
        } else {
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
        }
        $stmt->close();
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>