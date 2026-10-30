import { showToast } from '../Core/Toast.js';

export class UserPresenter {
    constructor(model, view) {
        this.model = model;
        this.view  = view;

        this.view.bindOpenCreateModal(() => {
            this.view.modalNewUser?.classList.add('active');
        });
        this.view.bindSubmitUser(this.handleCreateUser.bind(this));
        this.view.bindTableActions(
            this.handleViewUser.bind(this),
            this.handleOpenDelete.bind(this)
        );
        this.view.bindConfirmDeleteUser(this.handleConfirmDelete.bind(this));
        this.view.bindResetPassword(this.handleResetPassword.bind(this));

        this.init();
    }

    async init() {
        try {
            await this.model.fetchUsers();
            this.view.displayUsers(this.model.users);
        } catch (err) {
            console.error("Errore caricamento utenti:", err);
        }
    }

    async handleCreateUser(data) {
        try {
            await this.model.createUser(data);
            this.view.displayUsers(this.model.users);
            this.view.modalNewUser?.classList.remove('active');
            this.view.formNewUser?.reset();
            showToast('Utente creato con successo');
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        }
    }

    handleViewUser(id) {
        const user = this.model.users.find(u => u.id === id);
        if (user) this.view.showProfileModal(user);
    }

    handleOpenDelete(id) {
        const user = this.model.users.find(u => u.id === id);
        if (user) this.view.showDeleteModal(user);
    }

    async handleResetPassword(id) {
        try {
            const res = await this.model.resetPassword(id);
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            const msg = res.newPassword
                ? `Password reimpostata. Nuova password temporanea: ${res.newPassword}`
                : 'Password aggiornata';
            showToast(msg, 'info');
        } catch (err) {
            showToast('Errore: ' + err.message, 'error');
        }
    }

    async handleConfirmDelete(id) {
        try {
            await this.model.deleteUser(id);
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            this.view.displayUsers(this.model.users);
            showToast('Utente eliminato', 'info');
        } catch (err) {
            showToast('Errore eliminazione: ' + err.message, 'error');
        }
    }
}
