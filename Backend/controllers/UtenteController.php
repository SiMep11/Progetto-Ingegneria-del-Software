<?php
class UtenteController {

    public static function index(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $db = Database::getInstance()->getConnection();
        $stmt = $db->query('SELECT id, nome, cognome, email, ruolo AS role, created_at FROM utenti WHERE ruolo != \'admin\' ORDER BY cognome, nome');
        $rows = $stmt->fetchAll();
        $mapped = array_map(fn($u) => [
            'id'        => $u['id'],
            'firstName' => $u['nome'],
            'lastName'  => $u['cognome'],
            'email'     => $u['email'],
            'role'      => $u['role'],
            'createdAt' => $u['created_at'],
        ], $rows);
        echo json_encode($mapped);
    }

    public static function store(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null || empty($data['email']) || empty($data['password']) || empty($data['role'])) {
            http_response_code(400);
            echo json_encode(['error' => 'email, password e role sono obbligatori']);
            return;
        }

        $ruoliValidi = ['developer', 'tester'];
        if (!in_array($data['role'], $ruoliValidi)) {
            http_response_code(400);
            echo json_encode(['error' => 'Ruolo non valido. Usare: developer, tester']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        try {
            $stmt = $db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $data['nome']    ?? '',
                $data['cognome'] ?? '',
                $data['email'],
                password_hash($data['password'], PASSWORD_BCRYPT),
                $data['role'],
            ]);

            http_response_code(201);
            echo json_encode(['id' => (int)$db->lastInsertId(), 'message' => 'Utente creato']);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                http_response_code(409);
                echo json_encode(['error' => 'Email già registrata']);
            } else {
                throw $e;
            }
        }
    }

    public static function update(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Body JSON non valido']);
            return;
        }

        $fields = [];
        $values = [];

        if (isset($data['nome']))    { $fields[] = 'nome = ?';    $values[] = $data['nome']; }
        if (isset($data['cognome'])) { $fields[] = 'cognome = ?'; $values[] = $data['cognome']; }
        if (isset($data['email']))   { $fields[] = 'email = ?';   $values[] = $data['email']; }

        if (isset($data['role'])) {
            $ruoliValidi = ['admin', 'developer', 'tester'];
            if (!in_array($data['role'], $ruoliValidi)) {
                http_response_code(400);
                echo json_encode(['error' => 'Ruolo non valido. Usare: admin, developer, tester']);
                return;
            }
            $fields[] = 'ruolo = ?';
            $values[] = $data['role'];
        }

        if (!empty($data['password'])) {
            $fields[] = 'password_hash = ?';
            $values[] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nessun campo da aggiornare']);
            return;
        }

        $values[] = $params['id'];
        $db = Database::getInstance()->getConnection();
        $db->prepare('UPDATE utenti SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

        echo json_encode(['message' => 'Utente aggiornato']);
    }

    public static function changePassword(array $params): void {
        $utente   = AuthMiddleware::check();
        $data     = json_decode(file_get_contents('php://input'), true) ?? [];
        $targetId = (int)$params['id'];
        $isAdmin  = $utente['ruolo'] === 'admin';
        $isSelf   = (int)$utente['id'] === $targetId;

        if (!$isAdmin && !$isSelf) {
            http_response_code(403);
            echo json_encode(['error' => 'Non autorizzato']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        if ($isSelf) {
            // Chiunque cambi la propria password deve fornire quella attuale
            if (empty($data['currentPassword']) || empty($data['newPassword'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Password attuale e nuova password sono obbligatorie']);
                return;
            }
            $stmt = $db->prepare('SELECT password_hash FROM utenti WHERE id = ?');
            $stmt->execute([$targetId]);
            $row = $stmt->fetch();
            if (!$row || !password_verify($data['currentPassword'], $row['password_hash'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Password attuale non corretta']);
                return;
            }
            $newPassword = $data['newPassword'];
        } else {
            // Admin che resetta la password di un altro utente → temporanea casuale
            $newPassword = bin2hex(random_bytes(8));
        }

        $db->prepare('UPDATE utenti SET password_hash = ? WHERE id = ?')
           ->execute([password_hash($newPassword, PASSWORD_BCRYPT), $targetId]);
        $resp = ['message' => 'Password aggiornata'];
        if (!$isSelf) $resp['newPassword'] = $newPassword;
        echo json_encode($resp);
    }

    public static function destroy(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        if ((int)$params['id'] === (int)$utente['id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Non puoi eliminare il tuo stesso account']);
            return;
        }

        $db = Database::getInstance()->getConnection();
        try {
            $db->beginTransaction();
            $uid = $params['id'];
            // Dissocia l'utente dai ticket (SET NULL preserva la storia)
            $db->prepare('UPDATE ticket SET creato_da   = NULL WHERE creato_da   = ?')->execute([$uid]);
            $db->prepare('UPDATE ticket SET assegnato_a = NULL WHERE assegnato_a = ?')->execute([$uid]);
            $db->prepare('UPDATE progetti SET creato_da = NULL WHERE creato_da   = ?')->execute([$uid]);
            // progetto_utente e sessioni hanno CASCADE, ma esplicito è più sicuro
            $db->prepare('DELETE FROM progetto_utente WHERE utente_id = ?')->execute([$uid]);
            $db->prepare('DELETE FROM sessioni WHERE utente_id = ?')->execute([$uid]);
            $db->prepare('DELETE FROM utenti WHERE id = ?')->execute([$uid]);
            $db->commit();
            echo json_encode(['message' => 'Utente eliminato']);
        } catch (\PDOException $e) {
            $db->rollBack();
            http_response_code(409);
            echo json_encode(['error' => 'Impossibile eliminare l\'utente: vincoli di integrità']);
        }
    }
}
