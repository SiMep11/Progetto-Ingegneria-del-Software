<?php
declare(strict_types=1);

class CommentoTest extends TestBase {

    public function run(): void {
        $this->describe('Modulo Commenti');

        $this->runCM01();
        $this->runCM02();
        $this->runCM03();
        $this->runCM04();
        $this->runCM05();
    }

    private function runCM01(): void {
        $this->db->beginTransaction();
        try {
            [$adminId, $progettoId, $ticketId] = $this->scaffold('cm01');

            $this->db->prepare(
                'INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?,?,?)'
            )->execute(['Commento di test CM01', $ticketId, $adminId]);
            $commentoId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare('SELECT * FROM commenti WHERE id = ?');
            $stmt->execute([$commentoId]);
            $c = $stmt->fetch();

            $this->it(
                'Aggiunta commento a ticket esistente',
                $c !== false && $c['testo'] === 'Commento di test CM01'
            );
        } finally {
            $this->db->rollBack();
        }
    }

    private function runCM02(): void {
        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['User', 'CM02', 'cm02@test.local', $hash, 'tester']);
            $userId = (int) $this->db->lastInsertId();

            $exceptionCaught = false;
            try {
                $this->db->prepare(
                    'INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?,?,?)'
                )->execute(['Commento su ticket inesistente', 999999, $userId]);
            } catch (PDOException $e) {
                $exceptionCaught = true;
            }
            $this->it('Commento su ticket inesistente → eccezione', $exceptionCaught);
        } finally {
            $this->db->rollBack();
        }
    }

    private function runCM03(): void {
        $this->db->beginTransaction();
        try {
            [$userId, $progettoId, $ticketId] = $this->scaffold('cm03');

            $this->db->prepare(
                'INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?,?,?)'
            )->execute(['Testo originale', $ticketId, $userId]);
            $commentoId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare(
                'UPDATE commenti SET testo = ? WHERE id = ? AND utente_id = ?'
            );
            $stmt->execute(['Testo modificato', $commentoId, $userId]);

            $this->it(
                'Modifica commento proprio',
                $stmt->rowCount() === 1
            );
        } finally {
            $this->db->rollBack();
        }
    }

    private function runCM04(): void {
        $this->db->beginTransaction();
        try {
            [$autoreId, $progettoId, $ticketId] = $this->scaffold('cm04a');

            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Altro', 'CM04b', 'cm04b@test.local', $hash, 'developer']);
            $altroUserId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?,?,?)'
            )->execute(['Commento dell\'autore', $ticketId, $autoreId]);
            $commentoId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare(
                'UPDATE commenti SET testo = ? WHERE id = ? AND utente_id = ?'
            );
            $stmt->execute(['Tentativo di modifica', $commentoId, $altroUserId]);

            $this->it(
                'Modifica commento altrui bloccata',
                $stmt->rowCount() === 0
            );
        } finally {
            $this->db->rollBack();
        }
    }

    private function runCM05(): void {
        $this->db->beginTransaction();
        try {
            [$userId, $progettoId, $ticketId] = $this->scaffold('cm05');

            $this->db->prepare(
                'INSERT INTO commenti (testo, ticket_id, utente_id) VALUES (?,?,?)'
            )->execute(['Commento CM05', $ticketId, $userId]);
            $commentoId = (int) $this->db->lastInsertId();

            $this->db->prepare('DELETE FROM ticket WHERE id = ?')->execute([$ticketId]);

            $stmt = $this->db->prepare('SELECT id FROM commenti WHERE id = ?');
            $stmt->execute([$commentoId]);

            $this->it(
                'Eliminazione ticket rimuove commenti associati',
                $stmt->fetch() === false
            );
        } finally {
            $this->db->rollBack();
        }
    }
    
    private function scaffold(string $tag): array {
        $hash = password_hash('pw', PASSWORD_BCRYPT);
        $this->db->prepare(
            'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
        )->execute(['User', strtoupper($tag), "{$tag}@test.local", $hash, 'admin']);
        $userId = (int) $this->db->lastInsertId();

        $this->db->prepare(
            'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
        )->execute(["Progetto {$tag}", $userId]);
        $progettoId = (int) $this->db->lastInsertId();

        $this->db->prepare(
            'INSERT INTO ticket (titolo, tipo, stato, progetto_id, creato_da, severita)
             VALUES (?,?,?,?,?,?)'
        )->execute(["Ticket {$tag}", 'bug', 'open', $progettoId, $userId, 'low']);
        $ticketId = (int) $this->db->lastInsertId();

        return [$userId, $progettoId, $ticketId];
    }
}
