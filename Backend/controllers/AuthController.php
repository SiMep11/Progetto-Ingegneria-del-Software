<?php
class AuthController {

    public static function login(array $params): void {
        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null || empty($data['email']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email e password sono obbligatorie']);
            return;
        }

        $db = Database::getInstance()->getConnection();
        $stmt = $db->prepare('SELECT * FROM utenti WHERE email = ?');
        $stmt->execute([$data['email']]);
        $utente = $stmt->fetch();

        if (!$utente || !password_verify($data['password'], $utente['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Credenziali non valide']);
            return;
        }

        $token = bin2hex(random_bytes(32));
        $scadenza = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $stmt = $db->prepare('INSERT INTO sessioni (utente_id, token, scadenza) VALUES (?, ?, ?)');
        $stmt->execute([$utente['id'], $token, $scadenza]);

        // Formato risposta allineato al frontend: { token, user: { id, name, email, role } }
        echo json_encode([
            'token' => $token,
            'user'  => [
                'id'    => $utente['id'],
                'name'  => trim($utente['nome'] . ' ' . $utente['cognome']),
                'email' => $utente['email'],
                'role'  => $utente['ruolo'],
            ],
        ]);
    }

    public static function logout(array $params): void {
        AuthMiddleware::check();
        $token = AuthMiddleware::extractToken();

        $db = Database::getInstance()->getConnection();
        $db->prepare('DELETE FROM sessioni WHERE token = ?')->execute([$token]);

        echo json_encode(['message' => 'Logout effettuato con successo']);
    }

    public static function me(array $params): void {
        $utente = AuthMiddleware::check();

        echo json_encode([
            'id'    => $utente['id'],
            'name'  => trim($utente['nome'] . ' ' . $utente['cognome']),
            'email' => $utente['email'],
            'role'  => $utente['ruolo'],
        ]);
    }
}
