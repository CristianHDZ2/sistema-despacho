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
        // Listar todos los despachos (para admin)
        $stmt = $conexion->prepare("
            SELECT d.id, d.fecha, d.estado, d.usuario_id, u.nombre as usuario_nombre, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo,
                   (SELECT COUNT(*) FROM detalles_despacho WHERE despacho_id = d.id) as total_productos,
                   (SELECT SUM(valor_venta) FROM detalles_despacho WHERE despacho_id = d.id) as valor_total
            FROM despachos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN rutas r ON d.ruta_id = r.id
            ORDER BY d.fecha DESC, d.id DESC
        ");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $despachos = [];
        while ($row = $result->fetch_assoc()) {
            $despachos[] = $row;
        }
        
        $response = [
            'success' => true,
            'despachos' => $despachos
        ];
        $stmt->close();
        break;

    case 'listarPorUsuario':
        $usuario_id = isset($data['usuario_id']) ? intval($data['usuario_id']) : 0;
        
        if ($usuario_id <= 0) {
            $response['mensaje'] = 'ID de usuario inválido';
            break;
        }
        
        $stmt = $conexion->prepare("
            SELECT d.id, d.fecha, d.estado, d.usuario_id, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo,
                   (SELECT COUNT(*) FROM detalles_despacho WHERE despacho_id = d.id) as total_productos,
                   (SELECT SUM(valor_venta) FROM detalles_despacho WHERE despacho_id = d.id) as valor_total
            FROM despachos d
            JOIN rutas r ON d.ruta_id = r.id
            WHERE d.usuario_id = ?
            ORDER BY d.fecha DESC, d.id DESC
        ");
        $stmt->bind_param("i", $usuario_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $despachos = [];
        while ($row = $result->fetch_assoc()) {
            $despachos[] = $row;
        }
        
        $response = [
            'success' => true,
            'despachos' => $despachos
        ];
        $stmt->close();
        break;

    case 'obtener':
        $id = isset($data['id']) ? intval($data['id']) : 0;
        
        if ($id <= 0) {
            $response['mensaje'] = 'ID de despacho inválido';
            break;
        }
        
        $stmt = $conexion->prepare("
            SELECT d.id, d.fecha, d.estado, d.usuario_id, u.nombre as usuario_nombre, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo
            FROM despachos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN rutas r ON d.ruta_id = r.id
            WHERE d.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $despacho = $result->fetch_assoc();
            
            // Obtener detalles del despacho
            $stmt = $conexion->prepare("
                SELECT dd.id, dd.producto_id, p.nombre as producto_nombre, p.medida, p.categoria_id,
                       c.nombre as categoria_nombre, dd.precio_unitario,
                       dd.salida_manana, dd.recarga_mediodia, dd.retorno_tarde,
                       dd.total_vendido, dd.valor_venta
                FROM detalles_despacho dd
                JOIN productos p ON dd.producto_id = p.id
                JOIN categorias c ON p.categoria_id = c.id
                WHERE dd.despacho_id = ?
                ORDER BY c.id, p.medida
            ");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $detallesResult = $stmt->get_result();
            
            $detalles = [];
            while ($row = $detallesResult->fetch_assoc()) {
                $detalles[] = $row;
            }
            
            $despacho['detalles'] = $detalles;
            
            $response = [
                'success' => true,
                'despacho' => $despacho
            ];
        } else {
            $response['mensaje'] = 'Despacho no encontrado';
        }
        $stmt->close();
        break;

    case 'crear':
        $despachoData = isset($data['despacho']) ? $data['despacho'] : null;
        
        if (!$despachoData) {
            $response['mensaje'] = 'Datos de despacho no proporcionados';
            break;
        }
        
        $fecha = isset($despachoData['fecha']) ? $despachoData['fecha'] : '';
        $ruta_id = isset($despachoData['ruta_id']) ? intval($despachoData['ruta_id']) : 0;
        $usuario_id = isset($despachoData['usuario_id']) ? intval($despachoData['usuario_id']) : 0;
        $estado = isset($despachoData['estado']) ? $despachoData['estado'] : 'salida_manana';
        $productos = isset($despachoData['productos']) ? $despachoData['productos'] : [];
        
        // Validar datos
        if (empty($fecha) || $ruta_id <= 0 || $usuario_id <= 0 || empty($productos)) {
            $response['mensaje'] = 'Datos incompletos o inválidos';
            break;
        }
        
        // Iniciar transacción
        $conexion->begin_transaction();
        
        try {
            // Verificar si ya existe un despacho para esta ruta, fecha y usuario
            $stmt = $conexion->prepare("
                SELECT id, estado FROM despachos 
                WHERE ruta_id = ? AND fecha = ? AND usuario_id = ?
            ");
            $stmt->bind_param("isi", $ruta_id, $fecha, $usuario_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            // Si existe, actualizamos según el estado
            if ($result->num_rows > 0) {
                $despExistente = $result->fetch_assoc();
                $despacho_id = $despExistente['id'];
                $estadoActual = $despExistente['estado'];
                
                // Validar progresión de estados
                $estadosValidos = ['salida_manana', 'recarga_mediodia', 'retorno_tarde', 'completado'];
                $indiceActual = array_search($estadoActual, $estadosValidos);
                $indiceNuevo = array_search($estado, $estadosValidos);
                
                if ($indiceNuevo <= $indiceActual) {
                    $response['mensaje'] = "No se puede cambiar el estado de {$estadosValidos[$indiceActual]} a {$estadosValidos[$indiceNuevo]}";
                    $conexion->rollback();
                    break;
                }
                
                // Actualizar estado del despacho
                $stmt = $conexion->prepare("
                    UPDATE despachos SET estado = ? WHERE id = ?
                ");
                $stmt->bind_param("si", $estado, $despacho_id);
                $stmt->execute();
                
                // Actualizar detalles según el estado
                foreach ($productos as $producto) {
                    $producto_id = isset($producto['producto_id']) ? intval($producto['producto_id']) : 0;
                    $precio = isset($producto['precio']) ? floatval($producto['precio']) : 0;
                    
                    // Verificar si el detalle ya existe
                    $stmt = $conexion->prepare("
                        SELECT id, salida_manana, recarga_mediodia, retorno_tarde
                        FROM detalles_despacho 
                        WHERE despacho_id = ? AND producto_id = ?
                    ");
                    $stmt->bind_param("ii", $despacho_id, $producto_id);
                    $stmt->execute();
                    $detResult = $stmt->get_result();
                    
                    if ($detResult->num_rows > 0) {
                        $detalle = $detResult->fetch_assoc();
                        $detalle_id = $detalle['id'];
                        
                        // Actualizar según el estado
                        switch ($estado) {
                            case 'recarga_mediodia':
                                $recarga = isset($producto['recarga_mediodia']) ? intval($producto['recarga_mediodia']) : 0;
                                $stmt = $conexion->prepare("
                                    UPDATE detalles_despacho SET recarga_mediodia = ? 
                                    WHERE id = ?
                                ");
                                $stmt->bind_param("ii", $recarga, $detalle_id);
                                break;
                                
                            case 'retorno_tarde':
                                $retorno = isset($producto['retorno_tarde']) ? intval($producto['retorno_tarde']) : 0;
                                $stmt = $conexion->prepare("
                                    UPDATE detalles_despacho SET retorno_tarde = ? 
                                    WHERE id = ?
                                ");
                                $stmt->bind_param("ii", $retorno, $detalle_id);
                                break;
                                
                            case 'completado':
                                $stmt = $conexion->prepare("
                                    UPDATE despachos SET estado = 'completado' 
                                    WHERE id = ?
                                ");
                                $stmt->bind_param("i", $despacho_id);
                                break;
                        }
                        
                        if ($estado != 'completado') {
                            $stmt->execute();
                        }
                    } else if ($estado == 'salida_manana') {
                        // Si no existe el detalle y es salida_mañana, lo creamos
                        $salida = isset($producto['salida_manana']) ? intval($producto['salida_manana']) : 0;
                        
                        if ($salida > 0) {
                            $stmt = $conexion->prepare("
                                INSERT INTO detalles_despacho 
                                (despacho_id, producto_id, salida_manana, recarga_mediodia, retorno_tarde, precio_unitario) 
                                VALUES (?, ?, ?, 0, 0, ?)
                            ");
                            $stmt->bind_param("iiid", $despacho_id, $producto_id, $salida, $precio);
                            $stmt->execute();
                        }
                    }
                }
                
                // Si el estado es 'retorno_tarde', actualizar a completado
                if ($estado == 'retorno_tarde') {
                    $stmt = $conexion->prepare("
                        UPDATE despachos SET estado = 'completado' 
                        WHERE id = ?
                    ");
                    $stmt->bind_param("i", $despacho_id);
                    $stmt->execute();
                }
                
                $response = [
                    'success' => true,
                    'mensaje' => 'Despacho actualizado correctamente',
                    'id' => $despacho_id
                ];
            } else {
                // Crear nuevo despacho
                if ($estado != 'salida_manana') {
                    $response['mensaje'] = 'Para un nuevo despacho, el estado debe ser Salida Mañana';
                    $conexion->rollback();
                    break;
                }
                
                $stmt = $conexion->prepare("
                    INSERT INTO despachos (fecha, ruta_id, usuario_id, estado)
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->bind_param("siis", $fecha, $ruta_id, $usuario_id, $estado);
                $stmt->execute();
                $despacho_id = $conexion->insert_id;
                
                // Insertar detalles de despacho
                foreach ($productos as $producto) {
                    $producto_id = isset($producto['producto_id']) ? intval($producto['producto_id']) : 0;
                    $salida = isset($producto['salida_manana']) ? intval($producto['salida_manana']) : 0;
                    $precio = isset($producto['precio']) ? floatval($producto['precio']) : 0;
                    
                    if ($salida > 0) {
                        $stmt = $conexion->prepare("
                            INSERT INTO detalles_despacho 
                            (despacho_id, producto_id, salida_manana, recarga_mediodia, retorno_tarde, precio_unitario) 
                            VALUES (?, ?, ?, 0, 0, ?)
                        ");
                        $stmt->bind_param("iiid", $despacho_id, $producto_id, $salida, $precio);
                        $stmt->execute();
                    }
                }
                
                $response = [
                    'success' => true,
                    'mensaje' => 'Despacho creado correctamente',
                    'id' => $despacho_id
                ];
            }
            
            // Confirmar transacción
            $conexion->commit();
            
        } catch (Exception $e) {
            // Revertir en caso de error
            $conexion->rollback();
            $response['mensaje'] = 'Error en la operación: ' . $e->getMessage();
        }
        break;

    case 'actualizar':
        // Esta acción es para actualizar un despacho manualmente (no se usa en este flujo)
        break;

    case 'eliminar':
        // Esta acción no se permite por integridad de datos
        $response['mensaje'] = 'No se permite eliminar despachos por integridad de los datos';
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>