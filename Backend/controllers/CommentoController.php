<?php
class CommentoController {

    public static function index(array $params): void {
        $utente = AuthMiddleware::check();
        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare(
            'SELECT c.*, u.nome, u.cognome, u.ruolo
             FROM commenti c
             JOIN utenti u ON c.utente_id = u.id
             WHERE c.ticket_id = ?
             ORDER BY c.created_at ASC'
        );
        $stmt->execute([$params['ticket_id']]);
        echo json_encode($stmt->fetchAll());
    }

    public static function store(array $params): void {
        $utente = AuthMiddleware::check();
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['testo'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Il testo del commento è obbligatorio']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        $chk = $db->prepare('SELECT id, progetto_id FROM ticket WHERE id = ?');
        $chk->execute([$params['ticket_id']]);
        $ticket = $chk->fetch();
        if (!$ticket) {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket non trovato']);
            return;
        }

        if ($utente['ruolo'] === 'developer') {
            $chkProj = $db->prepare('SELECT 1 FROM progetto_utente WHERE progetto_id = ? AND utente_id = ?');
            $chkProj->execute([$ticket['progetto_id'], $utente['id']]);
            if (!$chkProj->fetch()) {
                http_response_code(403);
                echo json_encode(['error' => 'Non hai accesso a questo ticket']);
                return;
            }
        }

        $stmt = $db->prepare('INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?, ?, ?)');
        $stmt->execute([$data['testo'], $params['ticket_id'], $utente['id']]);

        http_response_code(201);
        echo json_encode(['id' => (int)$db->lastInsertId(), 'message' => 'Commento aggiunto']);
    }

    public static function update(array $params): void {
        $utente = AuthMiddleware::check();
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['testo'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Il testo del commento è obbligatorio']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare('SELECT * FROM commenti WHERE id = ?');
        $stmt->execute([$params['id']]);
        $commento = $stmt->fetch();

        if (!$commento) {
            http_response_code(404);
            echo json_encode(['error' => 'Commento non trovato']);
            return;
        }

        if ($utente['ruolo'] !== 'admin' && (int)$commento['utente_id'] !== (int)$utente['id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Non puoi modificare questo commento']);
            return;
        }

        $db->prepare('UPDATE commenti SET testo = ? WHERE id = ?')->execute([$data['testo'], $params['id']]);
        echo json_encode(['message' => 'Commento aggiornato']);
    }

    // Feed commenti: tutti i commenti sui ticket dei propri progetti (dev)
    // oppure di tutti i ticket (tester/admin).
    public static function feed(array $params): void {
        $utente = AuthMiddleware::check();
        $db     = Database::getInstance()->getConnection();

        $base = 'SELECT c.id, c.testo, c.created_at, c.ticket_id, c.utente_id,
                         t.titolo AS ticket_titolo, t.tipo AS ticket_tipo, t.stato AS ticket_stato,
                         t.progetto_id,
                         u.nome AS autore_nome, u.cognome AS autore_cognome, u.ruolo AS autore_ruolo
                  FROM commenti c
                  JOIN ticket  t ON c.ticket_id  = t.id
                  JOIN utenti  u ON c.utente_id  = u.id';

        if ($utente['ruolo'] === 'developer') {
            $stmt = $db->prepare(
                $base . '
                  JOIN progetto_utente pu ON t.progetto_id = pu.progetto_id AND pu.utente_id = ?
                  ORDER BY c.created_at DESC
                  LIMIT 200'
            );
            $stmt->execute([$utente['id']]);
        } else {
            // tester e admin: tutti i commenti
            $stmt = $db->query($base . ' ORDER BY c.created_at DESC LIMIT 200');
        }

        echo json_encode($stmt->fetchAll());
    }

    public static function destroy(array $params): void {
        $utente = AuthMiddleware::check();
        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare('SELECT * FROM commenti WHERE id = ?');
        $stmt->execute([$params['id']]);
        $commento = $stmt->fetch();

        if (!$commento) {
            http_response_code(404);
            echo json_encode(['error' => 'Commento non trovato']);
            return;
        }

        // Admin elimina qualsiasi commento; gli altri solo i propri
        if ($utente['ruolo'] !== 'admin' && (int)$commento['utente_id'] !== (int)$utente['id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Non puoi eliminare questo commento']);
            return;
        }

        $db->prepare('DELETE FROM commenti WHERE id = ?')->execute([$params['id']]);
        echo json_encode(['message' => 'Commento eliminato']);
    }
}
