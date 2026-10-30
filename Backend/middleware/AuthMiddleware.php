<?php
require_once __DIR__ . '/../config/Database.php';

class AuthMiddleware {

    public static function check(): array {
        $token = self::extractToken();

        if (empty($token)) {
            http_response_code(401);
            echo json_encode(['error' => 'Autenticazione richiesta']);
            exit;
        }

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare(
            'SELECT u.* FROM utenti u
             JOIN sessioni s ON u.id = s.utente_id
             WHERE s.token = ? AND s.scadenza > NOW()'
        );
        $stmt->execute([$token]);
        $utente = $stmt->fetch();

        if (!$utente) {
            http_response_code(401);
            echo json_encode(['error' => 'Token non valido o scaduto']);
            exit;
        }

        return $utente;
    }

    public static function requireRole(array $utente, array $ruoli): void {
        if (!in_array($utente['ruolo'], $ruoli)) {
            http_response_code(403);
            echo json_encode(['error' => 'Permessi insufficienti per questa operazione']);
            exit;
        }
    }

    // Esposto pubblicamente per AuthController::logout
    public static function extractToken(): string {
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        } else {
            $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        }

        return str_replace('Bearer ', '', $auth);
    }
}
