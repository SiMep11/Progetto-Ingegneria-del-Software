<?php
class TicketController {

    // Converte una riga DB (nomi colonne italiani) nel formato JSON atteso dal frontend.
    private static function mapTicket(array $t): array {
        return [
            'id'                  => $t['id'],
            'title'               => $t['titolo'],
            'desc'                => $t['descrizione'],
            'type'                => $t['tipo'],
            'status'              => $t['stato'],
            'project_id'          => $t['progetto_id'],
            'severity'            => $t['severita'],
            'priority'            => $t['priorita'],
            'assegnato_a'         => $t['assegnato_a'],
            'creato_da'           => $t['creato_da'],
            'created_at'          => $t['created_at'],
            'updated_at'          => $t['updated_at'],
            'creato_da_nome'      => $t['creato_da_nome'] ?? null,
            'creato_da_cognome'   => $t['creato_da_cognome'] ?? null,
            'assegnato_a_nome'    => $t['assegnato_a_nome'] ?? null,
            'assegnato_a_cognome' => $t['assegnato_a_cognome'] ?? null,
            'project_name'        => $t['progetto_nome'] ?? null,
        ];
    }

    public static function index(array $params): void {
        $utente = AuthMiddleware::check();
        $db = Database::getInstance()->getConnection();

        $where  = [];
        $values = [];

        // Developer vede solo i ticket dei propri progetti
        if ($utente['ruolo'] === 'developer') {
            $where[]  = 't.progetto_id IN (SELECT pu.progetto_id FROM progetto_utente pu WHERE pu.utente_id = ?)';
            $values[] = $utente['id'];
        }

        if (!empty($_GET['project_id'])) {
            $where[]  = 't.progetto_id = ?';
            $values[] = $_GET['project_id'];
        }
        if (!empty($_GET['type'])) {
            $where[]  = 't.tipo = ?';
            $values[] = $_GET['type'];
        }
        if (!empty($_GET['status'])) {
            $where[]  = 't.stato = ?';
            $values[] = $_GET['status'];
        }
        if (!empty($_GET['assegnato_a'])) {
            $where[]  = 't.assegnato_a = ?';
            $values[] = $_GET['assegnato_a'];
        }

        $sql = 'SELECT t.*,
                       u1.nome AS creato_da_nome, u1.cognome AS creato_da_cognome,
                       u2.nome AS assegnato_a_nome, u2.cognome AS assegnato_a_cognome,
                       p.nome AS progetto_nome
                FROM ticket t
                LEFT JOIN utenti u1 ON t.creato_da  = u1.id
                LEFT JOIN utenti u2 ON t.assegnato_a = u2.id
                LEFT JOIN progetti p ON t.progetto_id = p.id';

        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY t.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($values);
        echo json_encode(array_map([self::class, 'mapTicket'], $stmt->fetchAll()));
    }

    public static function store(array $params): void {
        $utente = AuthMiddleware::check();
        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Body JSON non valido']);
            return;
        }

        // Solo admin può creare feature; developer e tester creano bug
        if (($data['type'] ?? '') === 'feature') {
            AuthMiddleware::requireRole($utente, ['admin']);
        }

        try {
            $ticketObj = TicketFactory::create($data);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
            return;
        }

        if (!$ticketObj->validate()) {
            http_response_code(400);
            echo json_encode(['error' => 'Dati mancanti. La feature richiede assegnato_a; tutti i ticket richiedono title e project_id']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        // Developer può creare ticket solo nei propri progetti
        if ($utente['ruolo'] === 'developer') {
            $pid = $data['project_id'] ?? $data['project'] ?? null;
            if ($pid) {
                $chkMember = $db->prepare('SELECT 1 FROM progetto_utente WHERE progetto_id = ? AND utente_id = ?');
                $chkMember->execute([$pid, $utente['id']]);
                if (!$chkMember->fetch()) {
                    http_response_code(403);
                    echo json_encode(['error' => 'Non sei assegnato a questo progetto']);
                    return;
                }
            }
        }

        if (!empty($data['assegnato_a'])) {
            $chk = $db->prepare('SELECT ruolo FROM utenti WHERE id = ?');
            $chk->execute([$data['assegnato_a']]);
            $assignee = $chk->fetch();
            if (!$assignee || $assignee['ruolo'] !== 'developer') {
                http_response_code(400);
                echo json_encode(['error' => 'assegnato_a deve essere un developer']);
                return;
            }
        }

        $stmt = $db->prepare(
            'INSERT INTO ticket (titolo, descrizione, tipo, stato, progetto_id, creato_da, assegnato_a, severita, priorita)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['title'],
            $data['desc'] ?? $data['description'] ?? null,
            $ticketObj->getTipo(),
            'open',
            $data['project_id'] ?? $data['project'] ?? null,
            $utente['id'],
            $data['assegnato_a'] ?? null,
            $data['severity']   ?? null,
            $data['priority']   ?? null,
        ]);

        http_response_code(201);
        echo json_encode(['id' => (int)$db->lastInsertId(), 'message' => 'Ticket creato']);
    }

    public static function update(array $params): void {
        $utente = AuthMiddleware::check();
        $data = json_decode(file_get_contents('php://input'), true);

        if ($data === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Body JSON non valido']);
            return;
        }

        $db = Database::getInstance()->getConnection();

        $stmt = $db->prepare('SELECT * FROM ticket WHERE id = ?');
        $stmt->execute([$params['id']]);
        $current = $stmt->fetch();

        if (!$current) {
            http_response_code(404);
            echo json_encode(['error' => 'Ticket non trovato']);
            return;
        }

        $fields = [];
        $values = [];

        // Aggiornamento stato: tabella di transizioni permesse per ruolo
        if (isset($data['status'])) {
            $statoAttuale = $current['stato'];
            $nuovoStato   = $data['status'];
            $statiValidi  = ['open', 'progress', 'review', 'confirmed', 'closed'];

            if (!in_array($nuovoStato, $statiValidi)) {
                http_response_code(400);
                echo json_encode(['error' => 'Stato non valido']);
                return;
            }

            // Valida la transizione solo se lo stato cambia effettivamente
            if ($nuovoStato !== $statoAttuale) {
                $transizioni = [
                    'admin' => [
                        'open'      => ['progress', 'review', 'confirmed', 'closed'],
                        'progress'  => ['open', 'review', 'confirmed', 'closed'],
                        'review'    => ['progress', 'confirmed', 'closed', 'open'],
                        'confirmed' => ['closed', 'progress', 'open'],
                        'closed'    => ['open', 'progress'],
                    ],
                    'developer' => [
                        'open'     => ['progress'],
                        'progress' => ['review'],
                    ],
                    'tester' => [
                        'review' => ['confirmed', 'progress'],
                    ],
                ];

                $ruolo   = $utente['ruolo'];
                $ammesse = $transizioni[$ruolo][$statoAttuale] ?? [];

                if (!in_array($nuovoStato, $ammesse)) {
                    http_response_code(400);
                    echo json_encode([
                        'error'          => 'Transizione di stato non permessa per il tuo ruolo',
                        'current_status' => $statoAttuale,
                        'allowed'        => $ammesse,
                    ]);
                    return;
                }
                $fields[] = 'stato = ?';
                $values[] = $nuovoStato;
            }
        }

        // Solo l'admin può modificare tutti gli altri campi
        if ($utente['ruolo'] === 'admin') {
            if (isset($data['title']))       { $fields[] = 'titolo = ?';      $values[] = $data['title']; }
            $desc = $data['desc'] ?? $data['description'] ?? null;
            if ($desc !== null)              { $fields[] = 'descrizione = ?'; $values[] = $desc; }
            if (isset($data['assegnato_a'])) { $fields[] = 'assegnato_a = ?'; $values[] = $data['assegnato_a']; }
            if (isset($data['severity']))    { $fields[] = 'severita = ?';    $values[] = $data['severity']; }
            if (isset($data['priority']))    { $fields[] = 'priorita = ?';    $values[] = $data['priority']; }
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nessun campo da aggiornare']);
            return;
        }

        $values[] = $params['id'];
        try {
            $db->prepare('UPDATE ticket SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
        } catch (\PDOException $e) {
            http_response_code(400);
            echo json_encode(['error' => 'Aggiornamento fallito: valore non valido per il campo stato. Assicurarsi che la migrazione del DB sia stata eseguita.']);
            return;
        }

        echo json_encode(['message' => 'Ticket aggiornato']);
    }

    public static function destroy(array $params): void {
        $utente = AuthMiddleware::check();
        AuthMiddleware::requireRole($utente, ['admin']);

        $db = Database::getInstance()->getConnection();
        $db->prepare('DELETE FROM ticket WHERE id = ?')->execute([$params['id']]);

        echo json_encode(['message' => 'Ticket eliminato']);
    }
}
