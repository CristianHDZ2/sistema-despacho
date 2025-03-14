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
        // Verificar si se solicita un producto específico
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id > 0) {
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre 
                                        FROM productos p 
                                        JOIN categorias c ON p.categoria_id = c.id 
                                        WHERE p.id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $response = [
                    'success' => true,
                    'producto' => $result->fetch_assoc()
                ];
            } else {
                $response['mensaje'] = 'Producto no encontrado';
            }
            $stmt->close();
        } else {
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre 
                                        FROM productos p 
                                        JOIN categorias c ON p.categoria_id = c.id 
                                        ORDER BY p.nombre");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $productos = [];
            while ($row = $result->fetch_assoc()) {
                $productos[] = $row;
            }
            
            $response = [
                'success' => true,
                'productos' => $productos
            ];
            $stmt->close();
        }
        break;

    case 'listarCategorias':
        $stmt = $conexion->prepare("SELECT id, nombre FROM categorias ORDER BY id");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $categorias = [];
        while ($row = $result->fetch_assoc()) {
            $categorias[] = $row;
        }
        
        $response = [
            'success' => true,
            'categorias' => $categorias
        ];
        $stmt->close();
        break;

    case 'listarPorCategoria':
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        
        if ($categoria_id > 0) {
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre 
                                        FROM productos p 
                                        JOIN categorias c ON p.categoria_id = c.id 
                                        WHERE p.categoria_id = ? 
                                        ORDER BY p.medida");
            $stmt->bind_param("i", $categoria_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $productos = [];
            while ($row = $result->fetch_assoc()) {
                $productos[] = $row;
            }
            
            $response = [
                'success' => true,
                'productos' => $productos
            ];
            $stmt->close();
        } else {
            $response['mensaje'] = 'ID de categoría inválido';
        }
        break;

    case 'crear':
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0;
        $medida = isset($data['medida']) ? $data['medida'] : '';
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        
        // Validar datos
        if (empty($nombre) || $precio <= 0 || empty($medida) || $categoria_id <= 0) {
            $response['mensaje'] = 'Datos incompletos o inválidos';
            break;
        }
        
        // Verificar que la categoría exista
        $stmt = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $categoria_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $response['mensaje'] = 'La categoría seleccionada no existe';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Insertar producto
        $stmt = $conexion->prepare("INSERT INTO productos (nombre, precio, medida, categoria_id) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("sdsi", $nombre, $precio, $medida, $categoria_id);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'id' => $conexion->insert_id,
                'mensaje' => 'Producto creado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al crear el producto: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'actualizar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? $data['nombre'] : '';
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0;
        $medida = isset($data['medida']) ? $data['medida'] : '';
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        
        // Validar datos
        if ($id <= 0 || empty($nombre) || $precio <= 0 || empty($medida) || $categoria_id <= 0) {
            $response['mensaje'] = 'Datos incompletos o inválidos';
            break;
        }
        
        // Verificar que la categoría exista
        $stmt = $conexion->prepare("SELECT id FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $categoria_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $response['mensaje'] = 'La categoría seleccionada no existe';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Actualizar producto
        $stmt = $conexion->prepare("UPDATE productos SET nombre = ?, precio = ?, medida = ?, categoria_id = ? WHERE id = ?");
        $stmt->bind_param("sdsii", $nombre, $precio, $medida, $categoria_id, $id);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'mensaje' => 'Producto actualizado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al actualizar el producto: ' . $stmt->error;
        }
        $stmt->close();
        break;

    case 'eliminar':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        // Verificar si el producto se ha usado en algún despacho
        $stmt = $conexion->prepare("SELECT id FROM detalles_despacho WHERE producto_id = ? LIMIT 1");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'No se puede eliminar el producto porque ya ha sido utilizado en despachos';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Eliminar producto
        $stmt = $conexion->prepare("DELETE FROM productos WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response = [
                'success' => true,
                'mensaje' => 'Producto eliminado correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al eliminar el producto o el producto no existe';
        }
        $stmt->close();
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>