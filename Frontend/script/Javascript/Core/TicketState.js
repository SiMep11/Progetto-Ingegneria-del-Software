// script/core/TicketState.js
class TicketState {
    constructor(ticket) { this.ticket = ticket; }
    advance() { throw new Error("Metodo non implementato"); }
    getStatusName() { throw new Error("Metodo non implementato"); }
    canAdvance()   { return false; }
    getNextStato() { return this.getStatusName(); }
}

export class OpenState extends TicketState {
    advance()       { this.ticket.setState(new ProgressState(this.ticket)); }
    getStatusName() { return "open"; }
    canAdvance()    { return true; }
    getNextStato()  { return "progress"; }
}

export class ProgressState extends TicketState {
    advance()       { this.ticket.setState(new ReviewState(this.ticket)); }
    getStatusName() { return "progress"; }
    canAdvance()    { return true; }
    getNextStato()  { return "review"; }
}

export class ReviewState extends TicketState {
    advance()       { this.ticket.setState(new ConfirmedState(this.ticket)); }
    getStatusName() { return "review"; }
    canAdvance()    { return true; }
    getNextStato()  { return "confirmed"; }
}

export class ConfirmedState extends TicketState {
    advance()       { this.ticket.setState(new ClosedState(this.ticket)); }
    getStatusName() { return "confirmed"; }
    canAdvance()    { return true; }
    getNextStato()  { return "closed"; }
}

export class ClosedState extends TicketState {
    advance()       { console.warn("Il ticket è già chiuso e non può avanzare."); }
    getStatusName() { return "closed"; }
    canAdvance()    { return false; }
    getNextStato()  { return "closed"; }
}
