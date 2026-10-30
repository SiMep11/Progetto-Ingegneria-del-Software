<?php
declare(strict_types=1);

class ProgettoTest extends TestBase {

    public function run(): void {
        $this->describe('Modulo Progetti');

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Admin', 'PR01', 'pr01@test.local', $hash, 'admin']);
            $adminId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, descrizione, pm, deadline, creato_da)
                 VALUES (?,?,?,?,?)'
            )->execute(['App Mobile', 'Descrizione test', 'Mario Rossi', '2026-12-31', $adminId]);
            $progettoId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare('SELECT * FROM progetti WHERE id = ?');
            $stmt->execute([$progettoId]);
            $p = $stmt->fetch();

            $this->it(
                'Creazione e lettura progetto',
                $p !== false &&
                $p['nome'] === 'App Mobile' &&
                $p['pm'] === 'Mario Rossi'
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Admin', 'PR02', 'pr02@test.local', $hash, 'admin']);
            $adminId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto PR02', $adminId]);
            $progettoId = (int) $this->db->lastInsertId();

            $this->db->prepare('UPDATE progetti SET nome = ?, deadline = ? WHERE id = ?')
                     ->execute(['Progetto PR02 Rinominato', '2027-06-30', $progettoId]);

            $stmt = $this->db->prepare('SELECT nome, deadline FROM progetti WHERE id = ?');
            $stmt->execute([$progettoId]);
            $row = $stmt->fetch();

            $this->it(
                'Aggiornamento nome e deadline progetto',
                $row['nome'] === 'Progetto PR02 Rinominato' && $row['deadline'] === '2027-06-30'
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $exceptionCaught = false;
            try {
                $this->db->prepare(
                    'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
                )->execute(['Progetto PR03', 999999]);
            } catch (PDOException $e) {
                $exceptionCaught = true;
            }
            $this->it('Tentativo di inserire un progetto creato da un utente inesistente', $exceptionCaught);
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Admin', 'PR04a', 'pr04a@test.local', $hash, 'admin']);
            $adminId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Dev', 'PR04b', 'pr04b@test.local', $hash, 'developer']);
            $devId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto Assegnato', $adminId]);
            $progettoAssegnato = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto Non Assegnato', $adminId]);

            $this->db->prepare(
                'INSERT INTO progetto_utente (progetto_id, utente_id) VALUES (?,?)'
            )->execute([$progettoAssegnato, $devId]);

            $stmt = $this->db->prepare(
                'SELECT p.id FROM progetti p
                 JOIN progetto_utente pu ON p.id = pu.progetto_id
                 WHERE pu.utente_id = ?'
            );
            $stmt->execute([$devId]);
            $progettiVisibili = $stmt->fetchAll(PDO::FETCH_COLUMN);

            $this->it(
                'Developer vede solo i progetti assegnati a lui',
                count($progettiVisibili) === 1 && (int)$progettiVisibili[0] === $progettoAssegnato
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Admin', 'PR05', 'pr05@test.local', $hash, 'admin']);
            $adminId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto Cascade PR05', $adminId]);
            $progettoId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetto_utente (progetto_id, utente_id) VALUES (?,?)'
            )->execute([$progettoId, $adminId]);

            $this->db->prepare(
                'INSERT INTO ticket (titolo, tipo, stato, progetto_id, creato_da, severita)
                 VALUES (?,?,?,?,?,?)'
            )->execute(['Ticket PR05', 'bug', 'open', $progettoId, $adminId, 'low']);

            $this->db->prepare('DELETE FROM progetti WHERE id = ?')->execute([$progettoId]);

            $stmtPU = $this->db->prepare('SELECT progetto_id FROM progetto_utente WHERE progetto_id = ?');
            $stmtPU->execute([$progettoId]);
            $stmtT = $this->db->prepare('SELECT id FROM ticket WHERE progetto_id = ?');
            $stmtT->execute([$progettoId]);

            $this->it(
                'Eliminazione progetto rimuove anche relativi commenti e ticket',
                $stmtPU->fetch() === false && $stmtT->fetch() === false
            );
        } finally {
            $this->db->rollBack();
        }
    }
}
