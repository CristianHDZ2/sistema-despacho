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
        // Verificar si se solicita un motorista específico
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id > 0) {
            $stmt = $conexion->prepare("SELECT id, nombre, dui, numero_licencia, tipo_licencia FROM motoristas WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $response = [
                    'success' => true,
                    'motorista' => $result->fetch_assoc()
                ];
            } else {
                $response['mensaje'] = 'Motorista no encontrado';
            }
            $stmt->close();
        } else {
            $stmt = $conexion->prepare("SELECT id, nombre, dui, numero_licencia, tipo_licencia FROM motoristas ORDER BY nombre");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $motoristas = [];
            while ($row = $result->fetch_assoc()) {
                $motoristas[] = $row;
            }
            
            $response = [
                'success' => true,
                'motoristas' => $motoristas
            ];
            $stmt->close();
        }
        break;

    case 'crear':
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $dui = isset($data['dui']) ? $data['dui'] : '';
        $numero_licencia = isset($data['numero_licencia']) ? $data['numero_licencia'] : '';
        $tipo_licencia = isset($data['tipo_licencia']) ? $data['tipo_licencia'] : '';
        
        // Validar datos
        if (empty($nombre) || empty($dui) || empty($numero_licencia) || empty($tipo_licencia)) {
            $response['mensaje'] = 'Todos los campos son obligatorios';
            break;
        }
        
        // Validar DUI formato 00000000-0
        if (!preg_match('/^\d{8}-\d{1}$/', $dui)) {
            $response['mensaje'] = 'Formato de DUI inválido. Debe contener 8 dígitos, un guion y 1 dígito';
            break;
        }
        
        // Validar tipo de licencia
        $tipos_validos = ['liviana', 'pesada', 'particular'];
        if (!in_array($tipo_licencia, $tipos_validos)) {
            $response['mensaje'] = 'Tipo de licencia inválido';
            break;
        }
        
        // Verificar si el DUI ya existe
        $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE dui = ?");
        $stmt->bind_param("s", $dui);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'El DUI ya está registrado';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Verificar si el número de licencia ya existe
        $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE numero_licencia = ?");
        $stmt->bind_param("s", $numero_licencia);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'El número de licencia ya está registrado';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Insertar motorista
        $stmt = $conexion->prepare("INSERT INTO motoristas (nombre, dui, numero_licencia, tipo_licencia) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $nombre, $dui, $numero_licencia, $tipo_licencia);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'id' => $conexion->insert_id,
                'mensaje' => 'Motorista creado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al crear el motorista: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'actualizar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $dui = isset($data['dui']) ? $data['dui'] : '';
        $numero_licencia = isset($data['numero_licencia']) ? $data['numero_licencia'] : '';
        $tipo_licencia = isset($data['tipo_licencia']) ? $data['tipo_licencia'] : '';
        
        // Validar datos
        if ($id <= 0 || empty($nombre) || empty($dui) || empty($numero_licencia) || empty($tipo_licencia)) {
            $response['mensaje'] = 'Todos los campos son obligatorios';
            break;
        }
        
        // Validar DUI formato 00000000-0
        if (!preg_match('/^\d{8}-\d{1}$/', $dui)) {
            $response['mensaje'] = 'Formato de DUI inválido. Debe contener 8 dígitos, un guion y 1 dígito';
            break;
        }
        
        // Validar tipo de licencia
        $tipos_validos = ['liviana', 'pesada', 'particular'];
        if (!in_array($tipo_licencia, $tipos_validos)) {
            $response['mensaje'] = 'Tipo de licencia inválido';
            break;
        }
        
        // Verificar si el DUI ya existe en otro motorista
        $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE dui = ? AND id != ?");
        $stmt->bind_param("si", $dui, $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'El DUI ya está registrado para otro motorista';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Verificar si el número de licencia ya existe en otro motorista
        $stmt = $conexion->prepare("SELECT id FROM motoristas WHERE numero_licencia = ? AND id != ?");
        $stmt->bind_param("si", $numero_licencia, $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'El número de licencia ya está registrado para otro motorista';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Actualizar motorista
        $stmt = $conexion->prepare("UPDATE motoristas SET nombre = ?, dui = ?, numero_licencia = ?, tipo_licencia = ? WHERE id = ?");
        $stmt->bind_param("ssssi", $nombre, $dui, $numero_licencia, $tipo_licencia, $id);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'mensaje' => 'Motorista actualizado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al actualizar el motorista: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'eliminar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id <= 0) {
            $response['mensaje'] = 'ID de motorista inválido';
            break;
        }
        
        // Verificar si el motorista está asignado a alguna ruta
        $stmt = $conexion->prepare("SELECT id FROM rutas WHERE motorista_id = ? LIMIT 1");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'No se puede eliminar el motorista porque está asignado a una o más rutas';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Eliminar motorista
        $stmt = $conexion->prepare("DELETE FROM motoristas WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response = [
                'success' => true,
                'mensaje' => 'Motorista eliminado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al eliminar el motorista o el motorista no existe';
        }
        $stmt->close();
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>