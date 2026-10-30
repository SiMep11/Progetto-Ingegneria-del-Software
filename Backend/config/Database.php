<?php
// Pattern Singleton: garantisce un'unica connessione PDO condivisa in tutta l'applicazione
class Database {
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct() {
        $host = $_ENV['DB_HOST'] ?? 'db';
        $name = $_ENV['DB_NAME'] ?? 'flowcheck';
        $user = $_ENV['DB_USER'] ?? 'flowcheck_user';
        $pass = $_ENV['DB_PASS'] ?? 'flowcheck_pass';

        $this->pdo = new PDO(
            "mysql:host={$host};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->pdo;
    }

    private function __clone() {}
}
