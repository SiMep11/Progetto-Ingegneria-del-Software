CREATE DATABASE IF NOT EXISTS flowcheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flowcheck;

CREATE TABLE utenti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    ruolo ENUM('admin', 'developer', 'tester') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessioni (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utente_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    scadenza TIMESTAMP NOT NULL,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

CREATE TABLE progetti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descrizione TEXT,
    pm VARCHAR(255),
    deadline DATE,
    creato_da INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (creato_da) REFERENCES utenti(id) ON DELETE SET NULL
);

-- Relazione N:M: quali utenti partecipano a quali progetti
CREATE TABLE progetto_utente (
    progetto_id INT NOT NULL,
    utente_id INT NOT NULL,
    PRIMARY KEY (progetto_id, utente_id),
    FOREIGN KEY (progetto_id) REFERENCES progetti(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

-- Tabella unificata per bug e feature (discriminatore: campo tipo).
-- severita è rilevante solo per bug, priorita solo per feature.
-- I nomi delle colonne restano in italiano; il mapping verso i nomi JSON inglesi
-- è eseguito dal layer PHP tramite mapTicket().
CREATE TABLE ticket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    descrizione TEXT,
    tipo ENUM('bug', 'feature') NOT NULL,
    stato ENUM('open', 'progress', 'review', 'confirmed', 'closed') NOT NULL DEFAULT 'open',
    progetto_id INT NOT NULL,
    creato_da INT,
    assegnato_a INT,
    severita ENUM('low', 'medium', 'high', 'critical'),
    priorita ENUM('low', 'medium', 'high'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (progetto_id) REFERENCES progetti(id) ON DELETE CASCADE,
    FOREIGN KEY (creato_da) REFERENCES utenti(id) ON DELETE SET NULL,
    FOREIGN KEY (assegnato_a) REFERENCES utenti(id) ON DELETE SET NULL
);

CREATE INDEX idx_ticket_stato ON ticket(stato);
CREATE INDEX idx_ticket_tipo  ON ticket(tipo);

CREATE TABLE commenti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    testo TEXT NOT NULL,
    ticket_id INT NOT NULL,
    utente_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES ticket(id) ON DELETE CASCADE,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

-- Admin di default (password: password)
INSERT INTO utenti (nome, cognome, email, password_hash, ruolo)
VALUES ('Admin', 'FlowCheck', 'admin@flowcheck.local',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
