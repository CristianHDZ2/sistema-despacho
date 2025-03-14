<?php
require_once 'conexion.php';

// Obtenemos los datos enviados
$data = json_decode(file_get_contents("php://input"), true);
$action = isset($data['action']) ? $data['action'] : '';

// Variable de respuesta
$response = ['success' => false];

// Manejo de acciones
switch ($action) {
    case 'general':
        // Variables para filtros
        $fechaInicio = isset($data['fechaInicio']) && !empty($data['fechaInicio']) ? $data['fechaInicio'] : null;
        $fechaFin = isset($data['fechaFin']) && !empty($data['fechaFin']) ? $data['fechaFin'] : null;
        $ruta_id = isset($data['ruta_id']) && !empty($data['ruta_id']) ? intval($data['ruta_id']) : null;
        $usuario_id = isset($data['usuario_id']) && !empty($data['usuario_id']) ? intval($data['usuario_id']) : null;
        
        // Construir la consulta con filtros opcionales
        $sql = "
            SELECT d.id, d.fecha, d.estado, d.usuario_id, u.nombre as usuario_nombre, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo
            FROM despachos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN rutas r ON d.ruta_id = r.id
            WHERE (d.estado = 'completado' OR d.estado = 'retorno_tarde')
        ";
        
        $params = [];
        $tiposParametros = '';
        
        // Añadir filtros si existen
        if ($fechaInicio) {
            $sql .= " AND d.fecha >= ?";
            $params[] = $fechaInicio;
            $tiposParametros .= 's';
        }
        
        if ($fechaFin) {
            $sql .= " AND d.fecha <= ?";
            $params[] = $fechaFin;
            $tiposParametros .= 's';
        }
        
        if ($ruta_id) {
            $sql .= " AND d.ruta_id = ?";
            $params[] = $ruta_id;
            $tiposParametros .= 'i';
        }
        
        if ($usuario_id) {
            $sql .= " AND d.usuario_id = ?";
            $params[] = $usuario_id;
            $tiposParametros .= 'i';
        }
        
        $sql .= " ORDER BY d.fecha DESC, d.id DESC";
        
        // Ejecutar consulta principal
        $stmt = $conexion->prepare($sql);
        
        if (!empty($params)) {
            $stmt->bind_param($tiposParametros, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $despachos = [];
        while ($row = $result->fetch_assoc()) {
            $despachos[] = $row;
        }
        $stmt->close();
        
        // Verificar si hay resultados
        if (empty($despachos)) {
            $response['mensaje'] = 'No hay despachos que cumplan con los criterios de búsqueda';
            break;
        }
        
        // Obtener detalles de cada despacho
        $despachoIds = array_column($despachos, 'id');
        $idList = implode(',', $despachoIds);
        
        $sql = "
            SELECT dd.id, dd.despacho_id, dd.producto_id, p.nombre as producto_nombre, 
                   p.medida, p.categoria_id, c.nombre as categoria_nombre, 
                   dd.precio_unitario, dd.salida_manana, dd.recarga_mediodia, 
                   dd.retorno_tarde, dd.total_vendido, dd.valor_venta
            FROM detalles_despacho dd
            JOIN productos p ON dd.producto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            WHERE dd.despacho_id IN ($idList)
            ORDER BY c.id, p.medida
        ";
        
        $stmt = $conexion->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $detalles = [];
        while ($row = $result->fetch_assoc()) {
            $detalles[$row['despacho_id']][] = $row;
        }
        $stmt->close();
        
        // Generar resumen por productos
        $resumenProductos = [];
        $totalVendido = 0;
        $totalDinero = 0;
        
        foreach ($detalles as $despachoId => $detallesDespacho) {
            foreach ($detallesDespacho as $detalle) {
                $productoKey = $detalle['producto_id'];
                
                if (!isset($resumenProductos[$productoKey])) {
                    $resumenProductos[$productoKey] = [
                        'id' => $detalle['producto_id'],
                        'nombre' => $detalle['producto_nombre'],
                        'medida' => $detalle['medida'],
                        'categoria' => $detalle['categoria_nombre'],
                        'categoria_id' => $detalle['categoria_id'],
                        'totalVendido' => 0,
                        'totalRetornado' => 0,
                        'valorTotal' => 0
                    ];
                }
                
                $resumenProductos[$productoKey]['totalVendido'] += $detalle['total_vendido'];
                $resumenProductos[$productoKey]['totalRetornado'] += $detalle['retorno_tarde'];
                $resumenProductos[$productoKey]['valorTotal'] += $detalle['valor_venta'];
                
                $totalVendido += $detalle['total_vendido'];
                $totalDinero += $detalle['valor_venta'];
            }
        }
        
        // Generar resumen por rutas
        $resumenRutas = [];
        foreach ($despachos as $despacho) {
            $rutaId = $despacho['ruta_id'];
            
            if (!isset($resumenRutas[$rutaId])) {
                $resumenRutas[$rutaId] = [
                    'id' => $rutaId,
                    'nombre' => $despacho['ruta_nombre'],
                    'tipo' => $despacho['ruta_tipo'],
                    'despachos' => 0,
                    'totalVendido' => 0,
                    'totalDinero' => 0
                ];
            }
            
            $resumenRutas[$rutaId]['despachos']++;
            
            if (isset($detalles[$despacho['id']])) {
                foreach ($detalles[$despacho['id']] as $detalle) {
                    $resumenRutas[$rutaId]['totalVendido'] += $detalle['total_vendido'];
                    $resumenRutas[$rutaId]['totalDinero'] += $detalle['valor_venta'];
                }
            }
        }
        
        // Generar resumen por usuarios
        $resumenUsuarios = [];
        foreach ($despachos as $despacho) {
            $usuarioId = $despacho['usuario_id'];
            
            if (!isset($resumenUsuarios[$usuarioId])) {
                $resumenUsuarios[$usuarioId] = [
                    'id' => $usuarioId,
                    'nombre' => $despacho['usuario_nombre'],
                    'despachos' => 0,
                    'totalVendido' => 0,
                    'totalDinero' => 0
                ];
            }
            
            $resumenUsuarios[$usuarioId]['despachos']++;
            
            if (isset($detalles[$despacho['id']])) {
                foreach ($detalles[$despacho['id']] as $detalle) {
                    $resumenUsuarios[$usuarioId]['totalVendido'] += $detalle['total_vendido'];
                    $resumenUsuarios[$usuarioId]['totalDinero'] += $detalle['valor_venta'];
                }
            }
        }
        
        // Preparar respuesta
        $response = [
            'success' => true,
            'reporte' => [
                'filtros' => [
                    'fechaInicio' => $fechaInicio,
                    'fechaFin' => $fechaFin,
                    'ruta_id' => $ruta_id,
                    'usuario_id' => $usuario_id
                ],
                'totalDespachos' => count($despachos),
                'totalVendido' => $totalVendido,
                'totalDinero' => $totalDinero,
                'productos' => array_values($resumenProductos),
                'rutas' => array_values($resumenRutas),
                'usuarios' => array_values($resumenUsuarios)
            ]
        ];
        break;

    case 'porRuta':
        $ruta_id = isset($data['ruta_id']) ? intval($data['ruta_id']) : 0;
        $fechaInicio = isset($data['fechaInicio']) && !empty($data['fechaInicio']) ? $data['fechaInicio'] : null;
        $fechaFin = isset($data['fechaFin']) && !empty($data['fechaFin']) ? $data['fechaFin'] : null;
        
        if ($ruta_id <= 0) {
            $response['mensaje'] = 'ID de ruta inválido';
            break;
        }
        
        // Construir la consulta con filtros opcionales
        $sql = "
            SELECT d.id, d.fecha, d.estado, d.usuario_id, u.nombre as usuario_nombre, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo
            FROM despachos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN rutas r ON d.ruta_id = r.id
            WHERE d.ruta_id = ? AND (d.estado = 'completado' OR d.estado = 'retorno_tarde')
        ";
        
        $params = [$ruta_id];
        $tiposParametros = 'i';
        
        // Añadir filtros si existen
        if ($fechaInicio) {
            $sql .= " AND d.fecha >= ?";
            $params[] = $fechaInicio;
            $tiposParametros .= 's';
        }
        
        if ($fechaFin) {
            $sql .= " AND d.fecha <= ?";
            $params[] = $fechaFin;
            $tiposParametros .= 's';
        }
        
        $sql .= " ORDER BY d.fecha DESC, d.id DESC";
        
        // Ejecutar consulta principal
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param($tiposParametros, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $despachos = [];
        while ($row = $result->fetch_assoc()) {
            $despachos[] = $row;
        }
        $stmt->close();
        
        // Verificar si hay resultados
        if (empty($despachos)) {
            $response['mensaje'] = 'No hay despachos para esta ruta en el período seleccionado';
            break;
        }
        
        // Obtener detalles de cada despacho
        $despachoIds = array_column($despachos, 'id');
        $idList = implode(',', $despachoIds);
        
        $sql = "
            SELECT dd.id, dd.despacho_id, dd.producto_id, p.nombre as producto_nombre, 
                   p.medida, p.categoria_id, c.nombre as categoria_nombre, 
                   dd.precio_unitario, dd.salida_manana, dd.recarga_mediodia, 
                   dd.retorno_tarde, dd.total_vendido, dd.valor_venta
            FROM detalles_despacho dd
            JOIN productos p ON dd.producto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            WHERE dd.despacho_id IN ($idList)
            ORDER BY c.id, p.medida
        ";
        
        $stmt = $conexion->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $detalles = [];
        while ($row = $result->fetch_assoc()) {
            $detalles[$row['despacho_id']][] = $row;
        }
        $stmt->close();
        
        // Generar resumen por productos para esta ruta
        $resumenProductos = [];
        $totalVendido = 0;
        $totalDinero = 0;
        
        foreach ($detalles as $despachoId => $detallesDespacho) {
            foreach ($detallesDespacho as $detalle) {
                $productoKey = $detalle['producto_id'];
                
                if (!isset($resumenProductos[$productoKey])) {
                    $resumenProductos[$productoKey] = [
                        'id' => $detalle['producto_id'],
                        'nombre' => $detalle['producto_nombre'],
                        'medida' => $detalle['medida'],
                        'categoria' => $detalle['categoria_nombre'],
                        'categoria_id' => $detalle['categoria_id'],
                        'totalVendido' => 0,
                        'totalRetornado' => 0,
                        'valorTotal' => 0
                    ];
                }
                
                $resumenProductos[$productoKey]['totalVendido'] += $detalle['total_vendido'];
                $resumenProductos[$productoKey]['totalRetornado'] += $detalle['retorno_tarde'];
                $resumenProductos[$productoKey]['valorTotal'] += $detalle['valor_venta'];
                
                $totalVendido += $detalle['total_vendido'];
                $totalDinero += $detalle['valor_venta'];
            }
        }
        
        // Preparar resumen de la ruta
        $rutaInfo = [
            'id' => $despachos[0]['ruta_id'],
            'nombre' => $despachos[0]['ruta_nombre'],
            'tipo' => $despachos[0]['ruta_tipo'],
            'totalDespachos' => count($despachos),
            'totalVendido' => $totalVendido,
            'totalDinero' => $totalDinero
        ];
        
        // Preparar respuesta
        $response = [
            'success' => true,
            'reporte' => [
                'filtros' => [
                    'fechaInicio' => $fechaInicio,
                    'fechaFin' => $fechaFin,
                    'ruta_id' => $ruta_id
                ],
                'ruta' => $rutaInfo,
                'productos' => array_values($resumenProductos),
                'despachos' => $despachos
            ]
        ];
        break;

    case 'porUsuario':
        $usuario_id = isset($data['usuario_id']) ? intval($data['usuario_id']) : 0;
        $fechaInicio = isset($data['fechaInicio']) && !empty($data['fechaInicio']) ? $data['fechaInicio'] : null;
        $fechaFin = isset($data['fechaFin']) && !empty($data['fechaFin']) ? $data['fechaFin'] : null;
        
        if ($usuario_id <= 0) {
            $response['mensaje'] = 'ID de usuario inválido';
            break;
        }
        
        // Construir consulta similar al caso de porRuta pero filtrando por usuario_id
        $sql = "
            SELECT d.id, d.fecha, d.estado, d.usuario_id, u.nombre as usuario_nombre, 
                   d.ruta_id, r.nombre as ruta_nombre, r.tipo as ruta_tipo
            FROM despachos d
            JOIN usuarios u ON d.usuario_id = u.id
            JOIN rutas r ON d.ruta_id = r.id
            WHERE d.usuario_id = ? AND (d.estado = 'completado' OR d.estado = 'retorno_tarde')
        ";
        
        $params = [$usuario_id];
        $tiposParametros = 'i';
        
        // Añadir filtros si existen
        if ($fechaInicio) {
            $sql .= " AND d.fecha >= ?";
            $params[] = $fechaInicio;
            $tiposParametros .= 's';
        }
        
        if ($fechaFin) {
            $sql .= " AND d.fecha <= ?";
            $params[] = $fechaFin;
            $tiposParametros .= 's';
        }
        
        $sql .= " ORDER BY d.fecha DESC, d.id DESC";
        
        // Ejecutar consulta principal
        $stmt = $conexion->prepare($sql);
        $stmt->bind_param($tiposParametros, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $despachos = [];
        while ($row = $result->fetch_assoc()) {
            $despachos[] = $row;
        }
        $stmt->close();
        
        // Verificar si hay resultados
        if (empty($despachos)) {
            $response['mensaje'] = 'No hay despachos para este usuario en el período seleccionado';
            break;
        }
        
        // Realizar consultas y procesamiento similar al caso de porRuta
        // Generar resumen por rutas para este usuario
        $resumenRutas = [];
        $totalVendido = 0;
        $totalDinero = 0;
        
        // Obtener detalles de cada despacho
        $despachoIds = array_column($despachos, 'id');
        $idList = implode(',', $despachoIds);
        
        $sql = "
            SELECT dd.id, dd.despacho_id, dd.producto_id, p.nombre as producto_nombre, 
                   p.medida, p.categoria_id, c.nombre as categoria_nombre, 
                   dd.precio_unitario, dd.salida_manana, dd.recarga_mediodia, 
                   dd.retorno_tarde, dd.total_vendido, dd.valor_venta,
                   d.ruta_id
            FROM detalles_despacho dd
            JOIN productos p ON dd.producto_id = p.id
            JOIN categorias c ON p.categoria_id = c.id
            JOIN despachos d ON dd.despacho_id = d.id
            WHERE dd.despacho_id IN ($idList)
            ORDER BY d.fecha, c.id, p.medida
        ";
        
        $stmt = $conexion->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $detalles = [];
        while ($row = $result->fetch_assoc()) {
            $detalles[$row['despacho_id']][] = $row;
            
            // Generar resumen por ruta
            $rutaId = $row['ruta_id'];
            if (!isset($resumenRutas[$rutaId])) {
                $rutaIndex = array_search($rutaId, array_column($despachos, 'ruta_id'));
                $resumenRutas[$rutaId] = [
                    'id' => $rutaId,
                    'nombre' => $despachos[$rutaIndex]['ruta_nombre'],
                    'tipo' => $despachos[$rutaIndex]['ruta_tipo'],
                    'despachos' => 0,
                    'totalVendido' => 0,
                    'totalDinero' => 0
                ];
            }
            
            $resumenRutas[$rutaId]['totalVendido'] += $row['total_vendido'];
            $resumenRutas[$rutaId]['totalDinero'] += $row['valor_venta'];
            
            $totalVendido += $row['total_vendido'];
            $totalDinero += $row['valor_venta'];
        }
        $stmt->close();
        
        // Contar despachos por ruta
        foreach ($despachos as $despacho) {
            $rutaId = $despacho['ruta_id'];
            if (isset($resumenRutas[$rutaId])) {
                $resumenRutas[$rutaId]['despachos']++;
            }
        }
        
        // Preparar resumen del usuario
        $usuarioInfo = [
            'id' => $despachos[0]['usuario_id'],
            'nombre' => $despachos[0]['usuario_nombre'],
            'totalDespachos' => count($despachos),
            'totalVendido' => $totalVendido,
            'totalDinero' => $totalDinero
        ];
        
        // Preparar respuesta
        $response = [
            'success' => true,
            'reporte' => [
                'filtros' => [
                    'fechaInicio' => $fechaInicio,
                    'fechaFin' => $fechaFin,
                    'usuario_id' => $usuario_id
                ],
                'usuario' => $usuarioInfo,
                'rutas' => array_values($resumenRutas),
                'despachos' => $despachos
            ]
        ];
        break;
        
    default:
        $response['mensaje'] = 'Acción no válida';
}

echo json_encode($response);
?>