<?php
// Pattern State: ogni stato incapsula la propria logica di transizione.
// I valori stringa corrispondono ai valori ENUM del DB e ai nomi usati dal frontend JS.

interface TicketStateInterface {
    public function getStatoName(): string;
    public function canAdvance(): bool;
    public function getNextStato(): string;
}

class StatoAperto implements TicketStateInterface {
    public function getStatoName(): string { return 'open'; }
    public function canAdvance(): bool { return true; }
    public function getNextStato(): string { return 'progress'; }
}

class StatoInLavorazione implements TicketStateInterface {
    public function getStatoName(): string { return 'progress'; }
    public function canAdvance(): bool { return true; }
    public function getNextStato(): string { return 'review'; }
}

class StatoInRevisione implements TicketStateInterface {
    public function getStatoName(): string { return 'review'; }
    public function canAdvance(): bool { return true; }
    public function getNextStato(): string { return 'confirmed'; }
}

class StatoConfermato implements TicketStateInterface {
    public function getStatoName(): string { return 'confirmed'; }
    public function canAdvance(): bool { return true; }
    public function getNextStato(): string { return 'closed'; }
}

class StatoChiuso implements TicketStateInterface {
    public function getStatoName(): string { return 'closed'; }
    public function canAdvance(): bool { return false; }
    public function getNextStato(): string { return 'closed'; }
}

class TicketStateContext {
    private static array $map = [
        'open'           => StatoAperto::class,
        'progress'       => StatoInLavorazione::class,
        'review'         => StatoInRevisione::class,
        'confirmed'      => StatoConfermato::class,
        'closed'         => StatoChiuso::class,
    ];

    public static function fromString(string $stato): TicketStateInterface {
        $class = self::$map[$stato] ?? StatoAperto::class;
        return new $class();
    }
}
