<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/TicketFactory.php';
require_once __DIR__ . '/../core/TicketState.php';

class TicketTest extends TestBase {

    public function run(): void {
        $this->describe('Ticket');

        $bug = TicketFactory::create([
            'type'       => 'bug',
            'title'      => 'Pagina non carica',
            'project_id' => 1,
            'severity'   => 'high',
        ]);
        $this->it('Creazione Bug Ticket', $bug->validate());

        $feature = TicketFactory::create([
            'type'       => 'feature',
            'title'      => 'Nuova dashboard',
            'project_id' => 1,
        ]);
        $this->it('Creazione Feature Ticket senza assegnarlo fallisce', !$feature->validate());

        $featureOk = TicketFactory::create([
            'type'        => 'feature',
            'title'       => 'Export CSV',
            'project_id'  => 1,
            'assegnato_a' => 2,
        ]);
        $this->it('Creazione Feature Ticket', $featureOk->validate());

        $exceptionCaught = false;
        try {
            TicketFactory::create(['type' => 'hotfix', 'title' => 'X', 'project_id' => 1]);
        } catch (InvalidArgumentException $e) {
            $exceptionCaught = true;
        }
        $this->it('Creazione Ticket di un tipo inesistente causa eccezione', $exceptionCaught);

        $statoAperto = TicketStateContext::fromString('open');
        $this->it(
            'Transizione Ticket da “open” a “progress”',
            $statoAperto->canAdvance() && $statoAperto->getNextStato() === 'progress'
        );

        $statoProgress = TicketStateContext::fromString('progress');
        $this->it(
            'Transizione Ticket da “progress” a “review”',
            $statoProgress->canAdvance() && $statoProgress->getNextStato() === 'review'
        );

        $statoChiuso = TicketStateContext::fromString('closed');
        $this->it(
            'Stato chiuso non avanzabile',
            !$statoChiuso->canAdvance()
        );

        $statoApertoNext = TicketStateContext::fromString('open');
        $this->it(
            'Salto di stato bloccato',
            $statoApertoNext->getNextStato() !== 'closed'
        );

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Tester', 'TK09', 'tk09@test.local', $hash, 'tester']);
            $testerId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto Test TK09', $testerId]);
            $progettoId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO ticket (titolo, tipo, stato, progetto_id, creato_da, severita)
                 VALUES (?,?,?,?,?,?)'
            )->execute(['Bug di test', 'bug', 'open', $progettoId, $testerId, 'high']);
            $ticketId = (int) $this->db->lastInsertId();

            $stmt = $this->db->prepare('SELECT * FROM ticket WHERE id = ?');
            $stmt->execute([$ticketId]);
            $ticket = $stmt->fetch();

            $this->it(
                'Inserimento bug ticket in DB',
                $ticket !== false &&
                $ticket['titolo'] === 'Bug di test' &&
                $ticket['stato'] === 'open' &&
                $ticket['tipo'] === 'bug'
            );
        } finally {
            $this->db->rollBack();
        }

        $this->db->beginTransaction();
        try {
            $hash = password_hash('pw', PASSWORD_BCRYPT);
            $this->db->prepare(
                'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?,?,?,?,?)'
            )->execute(['Admin', 'TK10', 'tk10@test.local', $hash, 'admin']);
            $adminId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO progetti (nome, creato_da) VALUES (?,?)'
            )->execute(['Progetto Cascade TK10', $adminId]);
            $progettoId = (int) $this->db->lastInsertId();

            $this->db->prepare(
                'INSERT INTO ticket (titolo, tipo, stato, progetto_id, creato_da, severita)
                 VALUES (?,?,?,?,?,?)'
            )->execute(['Ticket Cascade', 'bug', 'open', $progettoId, $adminId, 'low']);
            $ticketId = (int) $this->db->lastInsertId();

            $this->db->prepare('DELETE FROM progetti WHERE id = ?')->execute([$progettoId]);

            $stmt = $this->db->prepare('SELECT id FROM ticket WHERE id = ?');
            $stmt->execute([$ticketId]);
            $this->it(
                'Eliminazione del progetto e ticket associati',
                $stmt->fetch() === false
            );
        } finally {
            $this->db->rollBack();
        }
    }
}
