<?php
class ProgettoController {

    // Converte una riga DB nel formato JSON atteso dal frontend (ProjectFactory.js).
    private static function mapProject(array $p): array {
        return [
            'id'          => $p['id'],
            'title'       => $p['nome'],
            'description' => $p['descrizione'],
            'pm'          => $p['pm'] ?? null,
            'deadline'    => $p['deadline'] ?? null,
            'bugCount'    => (int)($p['bug_count'] ?? 0),
            'memberCount' => (int)($p['member_count'] ?? 0),
            'memberIds'   => !empty($p['member_ids'])
                             ? array_map('intval', explode(',', $p['member_ids']))
                             : [],
            'created_at'  => $p['created_at'],
            'creato_da'   => $p['creato_da'],
        ];
    }

    public static function index(array $params): void {
        $utente = AuthMiddleware::check();
        $db = Database::getInstance()->getConnection();

        $bugSubquery    = '(SELECT COUNT(*) FROM ticket t WHERE t.progetto_id = p.id AND t.tipo = \'bug\') AS bug_count';
        $memberCount    = '(SELECT COUNT(*) FROM progetto_utente mc WHERE mc.progetto_id = p.id) AS member_count';
        $memberIds      = '(SELECT GROUP_CONCAT(mi.utente_id ORDER BY mi.utente_id) FROM progetto_utente mi WHERE mi.progetto_id = p.id) AS member_ids';

        if ($utente['ruolo'] === 'admin' || $utente['ruolo'] === 'tester') {
            // Admin e tester vedono tutti i progetti
            $stmt = $db->query(
                "SELECT p.*, u.nome AS creato_da_nome, u.cognome AS creato_da_cognome,
                        {$bugSubquery}, {$memberCount}, {$memberIds}
                 FROM progetti p
                 LEFT JOIN utenti u ON p.creato_da = u.id
                 ORDER BY p.created_at DESC"
            );
        } else {
            // Developer: solo i progetti a cui è assegnato
            $stmt = $db->prepare(
                "SELECT p.*, u.nome AS creato_da_nome, u.cognome AS creato_da_cognome,
                        {$bugSubquery}, {$memberCount}, {$memberIds}
                 FROM progetti p
                 LEFT JOIN utenti u ON p.creato_da = u.id
                 JOIN progetto_utente pu ON p.id = pu.progetto_id
                 WHERE pu.utente_id = ?
                 ORDER BY p.created_at DESC"
            );
            $stmt->execute([$utente['id']]);
        }

        echo json_encode(array_map([self::class, 'mapProject'], $stmt->fetchAll()));
    }

    public static function store(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null || empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Il nome del progetto è obbligatorio']);
            return;
        }

        $db = Database::getInstance()->getConnection();
        $db->beginTransaction();

        try {
            $stmt = $db->prepare(
                'INSERT INTO progetti (nome, descrizione, pm, deadline, creato_da) VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $data['title'],
                $data['description'] ?? null,
                $data['pm']          ?? null,
                $data['deadline']    ?? null,
                $utente['id'],
            ]);
            $id = (int)$db->lastInsertId();

            if (!empty($data['utenti']) && is_array($data['utenti'])) {
                $stmtPU = $db->prepare('INSERT IGNORE INTO progetto_utente (progetto_id, utente_id) VALUES (?, ?)');
                foreach ($data['utenti'] as $uid) {
                    $stmtPU->execute([$id, $uid]);
                }
            }

            $db->commit();
            http_response_code(201);
            echo json_encode(['id' => $id, 'message' => 'Progetto creato']);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
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

        $db = Database::getInstance()->getConnection();

        $db->beginTransaction();

        try {
            $fields = [];
            $values = [];

            if (isset($data['title']))       { $fields[] = 'nome = ?';       $values[] = $data['title']; }
            if (isset($data['description'])) { $fields[] = 'descrizione = ?'; $values[] = $data['description']; }
            if (isset($data['pm']))          { $fields[] = 'pm = ?';          $values[] = $data['pm']; }
            if (isset($data['deadline']))    { $fields[] = 'deadline = ?';    $values[] = $data['deadline']; }

            if (!empty($fields)) {
                $values[] = $params['id'];
                $db->prepare('UPDATE progetti SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
            }

            if (isset($data['utenti']) && is_array($data['utenti'])) {
                $db->prepare('DELETE FROM progetto_utente WHERE progetto_id = ?')->execute([$params['id']]);
                $stmtPU = $db->prepare('INSERT INTO progetto_utente (progetto_id, utente_id) VALUES (?, ?)');
                foreach ($data['utenti'] as $uid) {
                    $stmtPU->execute([$params['id'], $uid]);
                }
            }

            $db->commit();
            echo json_encode(['message' => 'Progetto aggiornato']);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public static function destroy(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $db = Database::getInstance()->getConnection();
        try {
            // Il DB gestisce in cascade: ticket → commenti, progetto_utente
            $db->prepare('DELETE FROM progetti WHERE id = ?')->execute([$params['id']]);
            echo json_encode(['message' => 'Progetto eliminato']);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Errore durante l\'eliminazione del progetto']);
        }
    }
}
