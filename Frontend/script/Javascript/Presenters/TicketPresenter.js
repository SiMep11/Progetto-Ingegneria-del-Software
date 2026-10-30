import { showToast } from '../Core/Toast.js';

export class TicketPresenter {
    constructor(model, view, projectModel = null, userModel = null) {
        this.model        = model;
        this.view         = view;
        this.projectModel = projectModel;
        this.userModel    = userModel;

        this.view.bindOpenNewTicket(this.handleOpenNewModal.bind(this));
        this.view.bindSubmitNewTicket(this.handleSaveTicket.bind(this));
        this.view.bindTableActions(
            this.handleOpenView.bind(this),
            this.handleOpenEdit.bind(this),
            this.handleOpenDelete.bind(this),
            this.handleOpenComments.bind(this)
        );
        this.view.bindSubmitEditTicket(this.handleUpdateTicket.bind(this));
        this.view.bindConfirmDelete(this.handleDeleteTicket.bind(this));
        this.view.bindSendComment(this.handleSendComment.bind(this));

        this.init();
    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const filter = {};
        if (urlParams.has('project_id')) filter.project_id = urlParams.get('project_id');

        try {
            await this.model.fetchTickets(filter);
            this.view.displayTickets(this.model.tickets);
            if (filter.project_id && this.model.tickets.length > 0) {
                this.view.showFilterBanner(this.model.tickets[0].projectName || `#${filter.project_id}`);
            }
        } catch (error) {
            console.error('Errore caricamento ticket:', error);
        }

        // Popola select progetto e assegnatari nel form di creazione
        if (this.projectModel) {
            try {
                const projects = await this.projectModel.fetchProjects();
                this.view.populateProjectSelect(projects);
            } catch (e) {}
        }
        if (this.userModel) {
            try {
                const users = await this.userModel.fetchUsers();
                this.view.populateAssigneeSelects(users.filter(u => u.role === 'developer'));
            } catch (e) {}
        }
    }

    handleOpenNewModal() { this.view.showNewTicketModal(); }

    async handleSaveTicket(ticketData) {
        try {
            await this.model.createTicket(ticketData);
            this.view.hideAllModals();
            this.view.displayTickets(this.model.tickets);
            showToast('Ticket creato con successo');
        } catch (error) {
            showToast('Errore nella creazione del ticket: ' + error.message, 'error');
        }
    }

    handleOpenView(id) {
        const ticket = this.model.tickets.find(t => t.id === id);
        if (ticket) this.view.showViewModal(ticket);
    }

    handleOpenEdit(id) {
        const ticket = this.model.tickets.find(t => t.id === id);
        if (ticket) this.view.showEditModal(ticket);
    }

    async handleUpdateTicket(id, updatedData) {
        try {
            await this.model.updateTicket(id, updatedData);
            this.view.hideAllModals();
            this.view.displayTickets(this.model.tickets);
            showToast('Ticket aggiornato');
        } catch (error) {
            showToast("Errore nell'aggiornamento: " + error.message, 'error');
        }
    }

    handleOpenDelete(id) { this.view.showDeleteModal(id); }

    async handleDeleteTicket(id) {
        try {
            await this.model.deleteTicket(id);
            this.view.hideAllModals();
            this.view.displayTickets(this.model.tickets);
            showToast('Ticket eliminato', 'info');
        } catch (error) {
            showToast("Errore nell'eliminazione: " + error.message, 'error');
        }
    }

    async handleOpenComments(id) {
        try {
            const comments = await this.model.fetchComments(id);
            this.view.showCommentsModal(id, comments);
        } catch (error) {
            console.error('Errore caricamento commenti:', error);
            this.view.showCommentsModal(id, []);
        }
    }

    async handleSendComment(ticketId, text, textarea) {
        if (!ticketId || !text) return;
        try {
            await this.model.addComment(ticketId, text);
            const comments = await this.model.fetchComments(ticketId);
            this.view.renderComments(comments);
            if (textarea) textarea.value = '';
            showToast('Commento inviato');
        } catch (error) {
            showToast("Errore nell'invio del commento: " + error.message, 'error');
        }
    }
}
