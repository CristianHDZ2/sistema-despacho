<?php
require_once 'conexion.php';

// Obtenemos los datos enviados
$data = json_decode(file_get_contents("php://input"), true);
$action = isset($data['action']) ? $data['action'] : '';

// Variable de respuesta
$response = ['success' => false];

// Manejo de acciones
switch ($action) {
    case 'listar':
        // Verificar si se solicita una ruta específica
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id > 0) {
            $stmt = $conexion->prepare("
                SELECT r.id, r.nombre, r.tipo, r.placa_vehiculo, r.motorista_id, 
                       m.nombre as motorista_nombre, m.dui as motorista_dui,
                       m.numero_licencia, m.tipo_licencia
                FROM rutas r
                LEFT JOIN motoristas m ON r.motorista_id = m.id
                WHERE r.id = ?
            ");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $response = [
                    'success' => true,
                    'ruta' => $result->fetch_assoc()
                ];
            } else {
                $response['mensaje'] = 'Ruta no encontrada';
            }
            $stmt->close();
        } else {
            $stmt = $conexion->prepare("
                SELECT r.id, r.nombre, r.tipo, r.placa_vehiculo, r.motorista_id, 
                       m.nombre as motorista_nombre
                FROM rutas r
                LEFT JOIN motoristas m ON r.motorista_id = m.id
                ORDER BY r.nombre
            ");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $rutas = [];
            while ($row = $result->fetch_assoc()) {
                $rutas[] = $row;
            }
            
            $response = [
                'success' => true,
                'rutas' => $rutas
            ];
            $stmt->close();
        }
        break;

    case 'listarPorTipo':
        $tipo = isset($data['tipo']) ? $data['tipo'] : '';
        
        if (!empty($tipo)) {
            $stmt = $conexion->prepare("
                SELECT r.id, r.nombre, r.tipo, r.placa_vehiculo, r.motorista_id, 
                       m.nombre as motorista_nombre
                FROM rutas r
                LEFT JOIN motoristas m ON r.motorista_id = m.id
                WHERE r.tipo = ? 
                ORDER BY r.nombre
            ");
            $stmt->bind_param("s", $tipo);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $rutas = [];
            while ($row = $result->fetch_assoc()) {
                $rutas[] = $row;
            }
            
            $response = [
                'success' => true,
                'rutas' => $rutas
            ];
            $stmt->close();
        } else {
            $response['mensaje'] = 'Tipo de ruta inválido';
        }
        break;

    case 'crear':
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $tipo = isset($data['tipo']) ? $data['tipo'] : '';
        $placa_vehiculo = isset($data['placa_vehiculo']) ? $data['placa_vehiculo'] : '';
        $motorista_id = isset($data['motorista_id']) ? intval($data['motorista_id']) : null;
        
        // Validar datos
        if (empty($nombre) || empty($tipo) || empty($placa_vehiculo)) {
            $response['mensaje'] = 'Nombre, tipo y placa del vehículo son obligatorios';
            break;
        }
        
        // Validar que el tipo sea válido
        $tipos_validos = ['GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'];
        if (!in_array($tipo, $tipos_validos)) {
            $response['mensaje'] = 'Tipo de ruta inválido';
            break;
        }
        
        // Validar formato de placa (P123-456 o N12345 o CC-12345)
        if (!preg_match('/^[A-Z]{1,2}[-\s]?\d{1,5}([-\s]\d{1,3})?$/', $placa_vehiculo)) {
            $response['mensaje'] = 'Formato de placa inválido';
            break;
        }
        
        // Verificar que el motorista exista si se proporciona un ID
        if ($motorista_id) {
            $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE id = ?");
            $stmt->bind_param("i", $motorista_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                $response['mensaje'] = 'El motorista seleccionado no existe';
                $stmt->close();
                break;
            }
            $stmt->close();
        }
        
        // Insertar ruta
        if ($motorista_id) {
            $stmt = $conexion->prepare("INSERT INTO rutas (nombre, tipo, placa_vehiculo, motorista_id) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("sssi", $nombre, $tipo, $placa_vehiculo, $motorista_id);
        } else {
            $stmt = $conexion->prepare("INSERT INTO rutas (nombre, tipo, placa_vehiculo) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $nombre, $tipo, $placa_vehiculo);
        }
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'id' => $conexion->insert_id,
                'mensaje' => 'Ruta creada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al crear la ruta: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'actualizar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $tipo = isset($data['tipo']) ? $data['tipo'] : '';
        $placa_vehiculo = isset($data['placa_vehiculo']) ? $data['placa_vehiculo'] : '';
        $motorista_id = isset($data['motorista_id']) ? intval($data['motorista_id']) : null;
        
        // Validar datos
        if ($id <= 0 || empty($nombre) || empty($tipo) || empty($placa_vehiculo)) {
            $response['mensaje'] = 'Datos incompletos o inválidos';
            break;
        }
        
        // Validar que el tipo sea válido
        $tipos_validos = ['GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'];
        if (!in_array($tipo, $tipos_validos)) {
            $response['mensaje'] = 'Tipo de ruta inválido';
            break;
        }
        
        // Validar formato de placa (P123-456 o N12345 o CC-12345)
        if (!preg_match('/^[A-Z]{1,2}[-\s]?\d{1,5}([-\s]\d{1,3})?$/', $placa_vehiculo)) {
            $response['mensaje'] = 'Formato de placa inválido';
            break;
        }
        
        // Verificar que el motorista exista si se proporciona un ID
        if ($motorista_id) {
            $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE id = ?");
            $stmt->bind_param("i", $motorista_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                $response['mensaje'] = 'El motorista seleccionado no existe';
                $stmt->close();
                break;
            }
            $stmt->close();
        }
        
        // Actualizar ruta
        if ($motorista_id) {
            $stmt = $conexion->prepare("UPDATE rutas SET nombre = ?, tipo = ?, placa_vehiculo = ?, motorista_id = ? WHERE id = ?");
            $stmt->bind_param("sssii", $nombre, $tipo, $placa_vehiculo, $motorista_id, $id);
        } else {
            $stmt = $conexion->prepare("UPDATE rutas SET nombre = ?, tipo = ?, placa_vehiculo = ?, motorista_id = NULL WHERE id = ?");
            $stmt->bind_param("sssi", $nombre, $tipo, $placa_vehiculo, $id);
        }
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'mensaje' => 'Ruta actualizada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al actualizar la ruta: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'eliminar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        // Verificar si la ruta se ha usado en algún despacho
        $stmt = $conexion->prepare("SELECT id FROM despachos WHERE ruta_id = ? LIMIT 1");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'No se puede eliminar la ruta porque ya ha sido utilizada en despachos';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Eliminar ruta
        $stmt = $conexion->prepare("DELETE FROM rutas WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response = [
                'success' => true,
                'mensaje' => 'Ruta eliminada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al eliminar la ruta o la ruta no existe';
        }
        $stmt->close();
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>