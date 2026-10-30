import { OpenState, ProgressState, ReviewState, ConfirmedState, ClosedState } from './TicketState.js';

class BaseTicket {
    constructor(id, title, desc, statusStr) {
        this.id = id;
        this.title = title;
        this.desc = desc;
        this.state = this.initState(statusStr);
    }

    initState(statusStr) {
        switch(statusStr) {
            case 'open':      return new OpenState(this);
            case 'progress':  return new ProgressState(this);
            case 'review':    return new ReviewState(this);
            case 'confirmed': return new ConfirmedState(this);
            case 'closed':    return new ClosedState(this);
            default:          return new OpenState(this);
        }
    }

    setState(newState) { this.state = newState; }
    advanceStatus()    { this.state.advance(); }
}

class BugTicket extends BaseTicket {
    constructor(data) {
        super(data.id, data.title, data.desc, data.status);
        this.type               = 'bug';
        this.severity           = data.severity || 'high';
        this.project_id         = data.project_id         ?? null;
        this.projectName        = data.project_name       ?? null;
        this.creato_da          = data.creato_da          ?? null;
        this.assegnato_a        = data.assegnato_a        ?? null;
        this.assegnato_a_nome   = data.assegnato_a_nome   ?? null;
        this.assegnato_a_cognome= data.assegnato_a_cognome?? null;
        this.creato_da_nome     = data.creato_da_nome     ?? null;
        this.creato_da_cognome  = data.creato_da_cognome  ?? null;
    }
}

class FeatureTicket extends BaseTicket {
    constructor(data) {
        super(data.id, data.title, data.desc, data.status);
        this.type               = 'feature';
        this.priority           = data.priority || 'medium';
        this.project_id         = data.project_id         ?? null;
        this.projectName        = data.project_name       ?? null;
        this.creato_da          = data.creato_da          ?? null;
        this.assegnato_a        = data.assegnato_a        ?? null;
        this.assegnato_a_nome   = data.assegnato_a_nome   ?? null;
        this.assegnato_a_cognome= data.assegnato_a_cognome?? null;
        this.creato_da_nome     = data.creato_da_nome     ?? null;
        this.creato_da_cognome  = data.creato_da_cognome  ?? null;
    }
}

export class TicketFactory {
    static create(data) {
        if (data.type === 'bug')     return new BugTicket(data);
        if (data.type === 'feature') return new FeatureTicket(data);
        throw new Error("Tipo di ticket non valido");
    }
}
