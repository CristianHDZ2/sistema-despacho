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
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre, 
                                        p.grupo, p.unidades_paquete
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
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre, 
                                        p.grupo, p.unidades_paquete
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

    case 'crearCategoria':
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        
        // Validar datos
        if (empty($nombre)) {
            $response['mensaje'] = 'El nombre de la categoría es obligatorio';
            break;
        }
        
        // Verificar si ya existe una categoría con ese nombre
        $stmt = $conexion->prepare("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)");
        $stmt->bind_param("s", $nombre);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'Ya existe una categoría con ese nombre';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Insertar nueva categoría
        $stmt = $conexion->prepare("INSERT INTO categorias (nombre) VALUES (?)");
        $stmt->bind_param("s", $nombre);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'id' => $conexion->insert_id,
                'mensaje' => 'Categoría creada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al crear la categoría: ' . $stmt->error;
        }
        $stmt->close();
        break;
        
    case 'actualizarCategoria':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        
        // Validar datos
        if ($id <= 0 || empty($nombre)) {
            $response['mensaje'] = 'Datos incompletos o inválidos';
            break;
        }
        
        // Verificar si ya existe otra categoría con ese nombre
        $stmt = $conexion->prepare("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id != ?");
        $stmt->bind_param("si", $nombre, $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'Ya existe otra categoría con ese nombre';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Actualizar categoría
        $stmt = $conexion->prepare("UPDATE categorias SET nombre = ? WHERE id = ?");
        $stmt->bind_param("si", $nombre, $id);
        
        if ($stmt->execute()) {
            $response = [
                'success' => true,
                'mensaje' => 'Categoría actualizada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al actualizar la categoría: ' . $stmt->error;
        }
        $stmt->close();
        break;
        
    case 'eliminarCategoria':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id <= 0) {
            $response['mensaje'] = 'ID de categoría inválido';
            break;
        }
        
        // Verificar que no tenga productos asociados
        $stmt = $conexion->prepare("SELECT id FROM productos WHERE categoria_id = ? LIMIT 1");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $response['mensaje'] = 'No se puede eliminar la categoría porque tiene productos asociados';
            $stmt->close();
            break;
        }
        $stmt->close();
        
        // Eliminar categoría
        $stmt = $conexion->prepare("DELETE FROM categorias WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response = [
                'success' => true,
                'mensaje' => 'Categoría eliminada correctamente'
            ];
        } else {
            $response['mensaje'] = 'Error al eliminar la categoría o la categoría no existe';
        }
        $stmt->close();
        break;

    case 'listarPorCategoria':
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        
        if ($categoria_id > 0) {
            $stmt = $conexion->prepare("SELECT p.id, p.nombre, p.precio, p.medida, p.categoria_id, c.nombre as categoria_nombre,
                                        p.grupo, p.unidades_paquete 
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
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0;
        $medida = isset($data['medida']) ? trim($data['medida']) : '';
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        $grupo = isset($data['grupo']) ? trim($data['grupo']) : '';
        $unidades_paquete = isset($data['unidades_paquete']) ? intval($data['unidades_paquete']) : 1;
        
        // Validar datos
        if (empty($nombre) || $precio <= 0 || empty($medida) || $categoria_id <= 0 || empty($grupo) || $unidades_paquete <= 0) {
            $response['mensaje'] = 'Todos los campos son obligatorios y deben tener valores válidos';
            break;
        }
        
        // Validar que el grupo sea válido
        $grupos_validos = ['GRUPO AJE', 'LA CONSTANCIA', 'OTROS'];
        if (!in_array($grupo, $grupos_validos)) {
            $response['mensaje'] = 'El grupo seleccionado no es válido';
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
        $stmt = $conexion->prepare("INSERT INTO productos (nombre, precio, medida, categoria_id, grupo, unidades_paquete) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sdsiis", $nombre, $precio, $medida, $categoria_id, $grupo, $unidades_paquete);
        
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
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0;
        $medida = isset($data['medida']) ? trim($data['medida']) : '';
        $categoria_id = isset($data['categoria_id']) ? intval($data['categoria_id']) : 0;
        $grupo = isset($data['grupo']) ? trim($data['grupo']) : '';
        $unidades_paquete = isset($data['unidades_paquete']) ? intval($data['unidades_paquete']) : 1;
        
        // Validar datos
        if ($id <= 0 || empty($nombre) || $precio <= 0 || empty($medida) || $categoria_id <= 0 || empty($grupo) || $unidades_paquete <= 0) {
            $response['mensaje'] = 'Todos los campos son obligatorios y deben tener valores válidos';
            break;
        }
        
        // Validar que el grupo sea válido
        $grupos_validos = ['GRUPO AJE', 'LA CONSTANCIA', 'OTROS'];
        if (!in_array($grupo, $grupos_validos)) {
            $response['mensaje'] = 'El grupo seleccionado no es válido';
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
        $stmt = $conexion->prepare("UPDATE productos SET nombre = ?, precio = ?, medida = ?, categoria_id = ?, grupo = ?, unidades_paquete = ? WHERE id = ?");
        $stmt->bind_param("sdsisii", $nombre, $precio, $medida, $categoria_id, $grupo, $unidades_paquete, $id);
        
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