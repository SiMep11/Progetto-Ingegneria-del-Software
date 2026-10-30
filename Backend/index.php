<?php
declare(strict_types=1);

// Headers CORS e content-type
header('Content-Type: application/json; charset=utf-8');
$corsOrigin = getenv('CORS_ORIGIN') ?: 'http://localhost:3000';
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Risponde subito alle preflight OPTIONS senza logica
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/Database.php';
require_once __DIR__ . '/core/Router.php';
require_once __DIR__ . '/core/TicketFactory.php';
require_once __DIR__ . '/core/TicketState.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/UtenteController.php';
require_once __DIR__ . '/controllers/ProgettoController.php';
require_once __DIR__ . '/controllers/TicketController.php';
require_once __DIR__ . '/controllers/CommentoController.php';

// Gestione globale degli errori: restituisce sempre JSON
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    error_log('[FlowCheck] ' . $e->getMessage());
    echo json_encode(['error' => 'Errore interno del server']);
});

$router = new Router();

$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri    = str_replace('/api/v1', '', $uri);
$uri    = rtrim($uri, '/') ?: '/';


if ($uri === '/run_all.php') {
    header('Content-Type: text/html; charset=utf-8');    
    require_once __DIR__ . '/tests/run_all.php';
    exit;
}

// --- Rotte ---

// Autenticazione
$router->add('POST', '/login',       [AuthController::class, 'login']);
$router->add('POST', '/auth/logout', [AuthController::class, 'logout']);
$router->add('GET',  '/auth/me',     [AuthController::class, 'me']);

// Utenti (solo admin)
$router->add('GET',    '/users',               [UtenteController::class, 'index']);
$router->add('POST',   '/users',               [UtenteController::class, 'store']);
$router->add('PUT',    '/users/{id}/password', [UtenteController::class, 'changePassword']);
$router->add('PUT',    '/users/{id}',          [UtenteController::class, 'update']);
$router->add('DELETE', '/users/{id}',          [UtenteController::class, 'destroy']);

// Progetti
$router->add('GET',    '/projects',      [ProgettoController::class, 'index']);
$router->add('POST',   '/projects',      [ProgettoController::class, 'store']);
$router->add('PUT',    '/projects/{id}', [ProgettoController::class, 'update']);
$router->add('DELETE', '/projects/{id}', [ProgettoController::class, 'destroy']);

// Ticket
$router->add('GET',    '/tickets',      [TicketController::class, 'index']);
$router->add('POST',   '/tickets',      [TicketController::class, 'store']);
$router->add('PUT',    '/tickets/{id}', [TicketController::class, 'update']);
$router->add('DELETE', '/tickets/{id}', [TicketController::class, 'destroy']);

// Commenti (annidati sotto ticket)
$router->add('GET',    '/commenti/feed',                [CommentoController::class, 'feed']);
$router->add('GET',    '/tickets/{ticket_id}/commenti', [CommentoController::class, 'index']);
$router->add('POST',   '/tickets/{ticket_id}/commenti', [CommentoController::class, 'store']);
$router->add('PUT',    '/commenti/{id}',                [CommentoController::class, 'update']);
$router->add('DELETE', '/commenti/{id}',                [CommentoController::class, 'destroy']);

$router->dispatch($method, $uri);
