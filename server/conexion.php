<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Content-Type: application/json");

$host = "localhost";
$usuario = "root";
$password = "";
$bd = "sistema_despacho_distribuidora_morales";

$conexion = new mysqli($host, $usuario, $password, $bd);

if ($conexion->connect_error) {
    die(json_encode(["error" => "Error de conexión: " . $conexion->connect_error]));
}

$conexion->set_charset("utf8");
?>