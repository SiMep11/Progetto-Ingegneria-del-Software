<?php
// Pattern Factory Method: istanzia il tipo corretto di ticket e ne valida i dati.
// Legge i campi con i nomi inglesi usati dal frontend (type, title, desc, severity, priority).

abstract class BaseTicket {
    protected array $data;

    public function __construct(array $data) {
        $this->data = $data;
    }

    abstract public function getTipo(): string;

    public function validate(): bool {
        $hasTitle   = !empty($this->data['title']);
        $hasProject = !empty($this->data['project_id']) || !empty($this->data['project']);
        return $hasTitle && $hasProject;
    }

    public function getData(): array {
        return $this->data;
    }
}

class BugTicket extends BaseTicket {
    public function getTipo(): string { return 'bug'; }

    public function getSeverita(): string {
        return $this->data['severity'] ?? 'high';
    }
}

class FeatureTicket extends BaseTicket {
    public function getTipo(): string { return 'feature'; }

    public function validate(): bool {
        // La feature deve essere sempre assegnata a uno sviluppatore
        return parent::validate() && !empty($this->data['assegnato_a']);
    }

    public function getPriorita(): string {
        return $this->data['priority'] ?? 'medium';
    }
}

class TicketFactory {
    public static function create(array $data): BaseTicket {
        return match($data['type'] ?? '') {
            'bug'     => new BugTicket($data),
            'feature' => new FeatureTicket($data),
            default   => throw new InvalidArgumentException(
                "Tipo di ticket non valido: '" . ($data['type'] ?? '') . "'. Usare 'bug' o 'feature'."
            )
        };
    }
}
