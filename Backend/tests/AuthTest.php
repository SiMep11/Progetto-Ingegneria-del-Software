<?php
declare(strict_types=1);

class AuthTest extends TestBase {

    public function run(): void {
        $this->describe('Autenticazione');

        $this->db->beginTransaction();
        try {
            $hash = password_hash('test_password_123', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Test', 'Admin', 'au01@test.local', $hash, 'admin']);

            $stmt = $this->db->prepare('SELECT * FROM utenti WHERE email = ?');
            $stmt->execute(['au01@test.local']);
            $utente = $stmt->fetch();

            $this->it(
                'Login con credenziali valide',
                $utente !== false && password_verify('test_password_123', $utente['password_hash'])
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('password_corretta', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Test', 'Dev', 'au02@test.local', $hash, 'developer']);

            $stmt = $this->db->prepare('SELECT * FROM utenti WHERE email = ?');
            $stmt->execute(['au02@test.local']);
            $utente = $stmt->fetch();

            $this->it(
                'Login con password errata rifiutato',
                $utente !== false && !password_verify('password_sbagliata', $utente['password_hash'])
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('password', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Token', 'Test', 'au03@test.local', $hash, 'tester']);
            $userId = (int) $this->db->lastInsertId();

            $token    = bin2hex(random_bytes(32));
            $scadenza = date('Y-m-d H:i:s', strtotime('+24 hours'));
            $this->db->prepare(
                'INSERT INTO sessioni (utente_id, token, scadenza) VALUES (?,?,?)'
            )->execute([$userId, $token, $scadenza]);

            $stmt = $this->db->prepare(
                'SELECT u.* FROM utenti u
                 JOIN sessioni s ON u.id = s.utente_id
                 WHERE s.token = ? AND s.scadenza > NOW()'
            );
            $stmt->execute([$token]);
            $found = $stmt->fetch();

            $this->it(
                'Token valido recuperato da sessioni',
                $found !== false && $found['email'] === 'au03@test.local'
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('password', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Expired', 'User', 'au04@test.local', $hash, 'tester']);
            $userId = (int) $this->db->lastInsertId();

            $token          = bin2hex(random_bytes(32));
            $scadenzaPassata = date('Y-m-d H:i:s', strtotime('-1 hour'));
            $this->db->prepare(
                'INSERT INTO sessioni (utente_id, token, scadenza) VALUES (?,?,?)'
            )->execute([$userId, $token, $scadenzaPassata]);

            $stmt = $this->db->prepare(
                'SELECT u.* FROM utenti u
                 JOIN sessioni s ON u.id = s.utente_id
                 WHERE s.token = ? AND s.scadenza > NOW()'
            );
            $stmt->execute([$token]);
            $found = $stmt->fetch();

            $this->it('Token scaduto non riconosciuto', $found === false);
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('password', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Logout', 'User', 'au05@test.local', $hash, 'admin']);
            $userId = (int) $this->db->lastInsertId();

            $token    = bin2hex(random_bytes(32));
            $scadenza = date('Y-m-d H:i:s', strtotime('+24 hours'));
            $this->db->prepare(
                'INSERT INTO sessioni (utente_id, token, scadenza) VALUES (?,?,?)'
            )->execute([$userId, $token, $scadenza]);

            $this->db->prepare('DELETE FROM sessioni WHERE token = ?')->execute([$token]);

            $stmt = $this->db->prepare('SELECT id FROM sessioni WHERE token = ?');
            $stmt->execute([$token]);
            $this->it('Logout - token eliminato da sessioni', $stmt->fetch() === false);
        } finally {
            $this->db->rollBack();
        }
    }
}
