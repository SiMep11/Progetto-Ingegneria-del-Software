<?php
declare(strict_types=1);

abstract class TestBase {
    protected PDO $db;
    private array $results = [];
    public int $passed = 0;
    public int $failed = 0;
    private string $currentSuite = '';

    public function __construct() {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $name = getenv('DB_NAME') ?: 'flowcheck';
        $user = getenv('DB_USER') ?: 'flowcheck_user';
        $pass = getenv('DB_PASS') ?: 'flowcheck_pass';

        $this->db = new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }

    protected function describe(string $suite): void {
        $this->currentSuite = $suite;
    }

    protected function it(string $description, bool $pass, string $detail = ''): void {
        $this->results[] = [
            'suite'       => $this->currentSuite,
            'description' => $description,
            'pass'        => $pass,
            'detail'      => $detail,
        ];
        if ($pass) {
            $this->passed++;
        } else {
            $this->failed++;
        }
    }

    protected function assertEq(mixed $expected, mixed $actual, string $label): void {
        $this->it($label, $expected === $actual,
            $expected === $actual ? '' : "atteso [{$expected}], ottenuto [{$actual}]");
    }

    abstract public function run(): void;

    public function getResults(): array { return $this->results; }
    public function getSuiteName(): string { return $this->currentSuite; }
}
