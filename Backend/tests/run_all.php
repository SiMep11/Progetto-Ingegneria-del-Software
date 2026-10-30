<?php
declare(strict_types=1);

require_once __DIR__ . '/TestBase.php';
require_once __DIR__ . '/AuthTest.php';
require_once __DIR__ . '/TicketTest.php';
require_once __DIR__ . '/ProgettoTest.php';
require_once __DIR__ . '/CommentoTest.php';

// ── Esecuzione ────────────────────────────────────────────────────────────────

$suites = [
    new AuthTest(),
    new TicketTest(),
    new ProgettoTest(),
    new CommentoTest(),
];

$totalPassed = 0;
$totalFailed = 0;
$allResults  = [];

$connectionError = null;

foreach ($suites as $suite) {
    try {
        $suite->run();
    } catch (PDOException $e) {
        $connectionError = $e->getMessage();
        break;
    }
    $totalPassed += $suite->passed;
    $totalFailed += $suite->failed;

    // Raggruppa i risultati per suite
    $grouped = [];
    foreach ($suite->getResults() as $r) {
        $grouped[$r['suite']][] = $r;
    }
    $allResults[] = $grouped;
}

$timestamp = date('d/m/Y H:i:s');
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>FlowCheck Testing</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background: #F4F7F9; display: flex; justify-content: center; padding: 40px 16px; min-height: 100vh; }
        .card {
            background: #FFFFFF;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(10,37,64,0.10);
            width: 100%;
            max-width: 760px;
            overflow: hidden;
        }
        .card-header {
            padding: 28px 32px 20px;
            border-bottom: 1px solid #E6EBF1;
        }
        .card-header h1 { font-size: 22px; color: #0A2540; font-weight: 700; }
        .card-header p  { margin-top: 6px; color: #6B7C93; font-size: 14px; }
        .suite-block { padding: 0 32px; }
        .suite-title {
            font-size: 14px;
            font-weight: 700;
            color: #0A2540;
            background: #F0F4F8;
            padding: 10px 16px;
            margin: 20px -32px 0;
            border-left: 4px solid #0A2540;
            letter-spacing: 0.3px;
        }
        .test-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #F0F4F8;
            font-size: 14px;
            color: #0A2540;
            gap: 12px;
        }
        .test-row:last-child { border-bottom: none; }
        .test-name { flex: 1; }
        .test-detail { font-size: 12px; color: #DE350B; margin-top: 2px; }
        .badge {
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            flex-shrink: 0;
        }
        .badge-pass { background: #E3FCEF; color: #006644; }
        .badge-fail { background: #FFEBE6; color: #DE350B; }
        .summary {
            margin: 24px 32px;
            padding: 14px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .summary-ok   { background: #E3FCEF; color: #006644; border: 1px solid #ABF5D1; }
        .summary-fail { background: #FFEBE6; color: #BF2600; border: 1px solid #FFBDAD; }
        .summary-icon { font-size: 20px; }
        .card-footer {
            text-align: center;
            padding: 16px;
            font-size: 12px;
            color: #9BA8B5;
            border-top: 1px solid #E6EBF1;
        }
        .error-box {
            margin: 24px 32px;
            padding: 16px 20px;
            background: #FFEBE6;
            border: 1px solid #FFBDAD;
            border-radius: 8px;
            color: #BF2600;
            font-size: 14px;
        }
        .error-box strong { display: block; margin-bottom: 6px; }
    </style>
</head>
<body>
<div class="card">
    <div class="card-header">
        <h1>FlowCheck Test Runner</h1>
    </div>

    <?php if ($connectionError !== null): ?>
    <div class="error-box">
        <strong>Errore di connessione al database</strong>
        <?= htmlspecialchars($connectionError) ?><br><br>
        Assicurati che il container sia avviato (<code>podman compose up -d</code>) e che le variabili
        d'ambiente DB_HOST, DB_PORT, DB_USER, DB_PASS siano configurate correttamente.
    </div>
    <?php else: ?>

    <?php foreach ($allResults as $suiteGroup): ?>
        <?php foreach ($suiteGroup as $suiteName => $tests): ?>
        <div class="suite-block">
            <div class="suite-title"><?= htmlspecialchars($suiteName) ?></div>
            <?php foreach ($tests as $t): ?>
            <div class="test-row">
                <div class="test-name">
                    <?= htmlspecialchars($t['description']) ?>
                    <?php if (!$t['pass'] && $t['detail'] !== ''): ?>
                        <div class="test-detail"><?= htmlspecialchars($t['detail']) ?></div>
                    <?php endif; ?>
                </div>
                <span class="badge <?= $t['pass'] ? 'badge-pass' : 'badge-fail' ?>">
                    <?= $t['pass'] ? 'PASS' : 'FAIL' ?>
                </span>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endforeach; ?>
    <?php endforeach; ?>

    <?php
        $allPass = $totalFailed === 0;
        $summaryClass = $allPass ? 'summary-ok' : 'summary-fail';
        $icon  = $allPass ? '✓' : '✗';
        $msg   = $allPass
            ? "Tutti i {$totalPassed} test superati con successo."
            : "{$totalFailed} test falliti su " . ($totalPassed + $totalFailed) . " totali.";
    ?>
    <div class="summary <?= $summaryClass ?>">
        <span class="summary-icon"><?= $icon ?></span>
        <span><?= $msg ?></span>
    </div>

    <?php endif; ?>

    <div class="card-footer">Test completati il <?= $timestamp ?></div>
</div>
</body>
</html>
