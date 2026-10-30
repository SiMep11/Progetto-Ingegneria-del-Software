import { showToast } from '../Core/Toast.js';

export class ProjectPresenter {
    constructor(model, view, userRole = null) {
        this.model       = model;
        this.view        = view;
        this.userRole    = userRole;
        this.canEdit     = userRole === 'admin';
        this.devs        = [];
        this._devsLoaded = false;

        this.view.bindOpenNewProject(this.handleOpenNewProject.bind(this));
        this.view.bindSubmitNewProject(this.handleSaveProject.bind(this));
        this.view.bindTableActions(
            this.handleOpenEdit.bind(this),
            this.handleOpenDelete.bind(this),
            this.handleOpenTicket.bind(this)
        );
        this.view.bindSubmitEditProject(this.handleUpdateProject.bind(this));
        this.view.bindConfirmDeleteProject(this.handleDeleteProject.bind(this));
        this.view.bindSubmitProjectTicket(this.handleCreateProjectTicket.bind(this));
        this.init();
    }

    async init() {
        try {
            await this.model.fetchProjects();
            this.view.displayProjects(this.model.projects, this.userRole);
        } catch (err) {
            console.error('Errore caricamento progetti:', err);
        }
    }

    async _loadDevs() {
        if (this._devsLoaded) return;
        try {
            this.devs = await this.model.fetchDevelopers();
        } catch (e) {}
        this._devsLoaded = true;
    }

    async handleOpenNewProject() {
        await this._loadDevs();
        this.view.showNewProjectModal(this.devs);
    }

    async handleSaveProject(projectData) {
        try {
            await this.model.createProject(projectData);
            this.view.hideAllModals();
            this.view.displayProjects(this.model.projects, this.userRole);
            showToast('Progetto creato con successo');
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        }
    }

    async handleOpenEdit(id) {
        await this._loadDevs();
        const project = this.model.projects.find(p => p.id === id);
        if (project) this.view.showEditModal(project, this.devs);
    }

    async handleUpdateProject(id, updatedData) {
        try {
            await this.model.updateProject(id, updatedData);
            this.view.hideAllModals();
            this.view.displayProjects(this.model.projects, this.userRole);
            showToast('Progetto aggiornato');
        } catch (err) {
            showToast('Errore aggiornamento: ' + err.message, 'error');
        }
    }

    handleOpenDelete(id) { this.view.showDeleteModal(id); }

    async handleDeleteProject(id) {
        try {
            await this.model.deleteProject(id);
            this.view.hideAllModals();
            this.view.displayProjects(this.model.projects, this.userRole);
            showToast('Progetto eliminato', 'info');
        } catch (err) {
            showToast('Errore eliminazione: ' + err.message, 'error');
        }
    }

    handleOpenTicket(id) {
        const project = this.model.projects.find(p => p.id === id);
        if (project) this.view.showProjectTicketModal(project);
    }

    async handleCreateProjectTicket(data) {
        try {
            await this.model.createTicket(data);
            this.view.hideAllModals();
            await this.model.fetchProjects();
            this.view.displayProjects(this.model.projects, this.userRole);
            showToast('Ticket aperto con successo');
        } catch (err) {
            showToast('Errore apertura ticket: ' + err.message, 'error');
        }
    }
}
