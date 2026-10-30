export class UserView {
    constructor() {
        this.tableBody     = document.getElementById('usersTableBody');
        this.modalNewUser  = document.getElementById('modalNewUser');
        this.btnCreateUser = document.getElementById('btnCreateUser');
        this.formNewUser   = document.getElementById('formNewUser');
        this.modalProfile  = document.getElementById('modalViewProfile');
        this.modalDelete   = document.getElementById('modalDeleteUser');
        this.btnConfirmDel = document.getElementById('confirmDeleteUserBtn');
        this._pendingDeleteId  = null;
        this._pendingProfileId = null;

        this._initCloseButtons();
    }

    _initCloseButtons() {
        document.querySelectorAll('.btn-close-modal, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            });
        });
    }

    bindOpenCreateModal(handler) {
        this.btnCreateUser?.addEventListener('click', handler);
    }

    bindSubmitUser(handler) {
        this.formNewUser?.addEventListener('submit', e => {
            e.preventDefault();
            handler({
                firstName: document.getElementById('userName').value.trim(),
                lastName:  document.getElementById('userSurname').value.trim(),
                email:     document.getElementById('userEmail').value.trim(),
                password:  document.getElementById('userPassword').value,
                role:      document.getElementById('userRole').value,
            });
        });
    }

    bindResetPassword(handler) {
        document.getElementById('resetUserPasswordBtn')?.addEventListener('click', () => {
            if (this._pendingProfileId !== null) handler(this._pendingProfileId);
        });
    }

    // ---- Profile modal ----
    showProfileModal(user) {
        this._pendingProfileId = user.id;
        const roleMap = {
            admin:     { label: 'Amministratore', cls: 'role-admin' },
            developer: { label: 'Sviluppatore',   cls: 'role-dev' },
            tester:    { label: 'Tester',          cls: 'role-reporter' },
        };
        const { label, cls } = roleMap[user.role] ?? { label: user.role, cls: 'role-reporter' };

        const nameEl  = document.getElementById('viewProfileName');
        const roleEl  = document.getElementById('viewProfileRole');
        const emailEl = document.getElementById('viewProfileEmail');
        const dateEl  = document.getElementById('viewProfileDate');

        if (nameEl)  nameEl.textContent  = `${user.firstName} ${user.lastName}`;
        if (roleEl)  { roleEl.textContent = label; roleEl.className = `role-badge ${cls}`; }
        if (emailEl) emailEl.textContent  = user.email;
        if (dateEl)  dateEl.textContent   = user.createdAt
            ? new Date(user.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'N/D';

        this.modalProfile?.classList.add('active');
    }

    // ---- Delete modal ----
    showDeleteModal(user) {
        this._pendingDeleteId = user.id;
        const nameEl = document.getElementById('deleteUserName');
        if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
        this.modalDelete?.classList.add('active');
    }

    bindConfirmDeleteUser(handler) {
        this.btnConfirmDel?.addEventListener('click', () => {
            if (this._pendingDeleteId !== null) handler(this._pendingDeleteId);
        });
    }

    // ---- Table actions ----
    bindTableActions(handleView, handleDelete) {
        if (!this.tableBody) return;
        this.tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;
            const id = Number(btn.closest('tr')?.dataset.id);
            if (!id) return;
            if (btn.querySelector('.icon-profile')) handleView(id);
            if (btn.querySelector('.icon-delete'))  handleDelete(id);
        });
    }

    displayUsers(users) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.dataset.id = user.id;
            const roleMap = {
                admin:     { label: 'Amministratore', cls: 'role-admin' },
                developer: { label: 'Sviluppatore',   cls: 'role-dev' },
                tester:    { label: 'Tester',          cls: 'role-reporter' },
            };
            const { label, cls } = roleMap[user.role] ?? { label: user.role, cls: 'role-reporter' };
            tr.innerHTML = `
                <td><strong>${user.firstName}</strong></td>
                <td><strong>${user.lastName}</strong></td>
                <td>${user.email}</td>
                <td><span class="role-badge ${cls}">${label}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn" title="Visualizza Profilo"><img src="images/profile.png" class="icon-profile" alt="Profilo" width="20"></button>
                        <button class="icon-btn" title="Elimina"><img src="images/delete.png" class="icon-delete" alt="Elimina" width="20"></button>
                    </div>
                </td>`;
            this.tableBody.appendChild(tr);
        });
    }
}
