export class ProjectView {
    constructor() {
        this.tableBody           = document.getElementById('projectsTableBody');
        this.modalNewProject     = document.getElementById('modalNewProject');
        this.btnNewProject       = document.getElementById('btnCreateProject');
        this.formNewProject      = document.getElementById('formNewProject');
        this.modalEdit           = document.getElementById('modalEditProject');
        this.formEdit            = document.getElementById('formEditProject');
        this.modalDelete         = document.getElementById('modalDeleteProject');
        this.btnConfirmDelete    = document.getElementById('confirmDeleteProjectBtn');
        this.modalProjectTicket  = document.getElementById('modalProjectTicket');
        this.formProjectTicket   = document.getElementById('formProjectTicket');
        this.currentProjectId    = null;
        this._initCloseButtons();
    }

    _initCloseButtons() {
        document.querySelectorAll('.btn-close-modal, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                this.formEdit?.reset();
                this.formNewProject?.reset();
                this.formProjectTicket?.reset();
            });
        });
    }

    // ---- Developer checkbox list ----
    _renderDevList(containerId, devs, selectedIds = []) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!devs || !devs.length) {
            container.innerHTML = '<p class="dev-list-empty">Nessuno sviluppatore disponibile.</p>';
            return;
        }
        container.innerHTML = devs.map(u => {
            const initials = ((u.firstName ?? '')[0] ?? '') + ((u.lastName ?? '')[0] ?? '');
            const checked  = selectedIds.includes(Number(u.id)) ? 'checked' : '';
            return `<label class="dev-list-item">
                <input type="checkbox" value="${u.id}" ${checked}>
                <span class="dev-avatar">${initials.toUpperCase()}</span>
                <span class="dev-name">${u.firstName} ${u.lastName}</span>
            </label>`;
        }).join('');
    }

    // ---- New project ----
    showNewProjectModal(devs = []) {
        this._renderDevList('newMemberCheckboxes', devs, []);
        this.modalNewProject?.classList.add('active');
    }
    bindOpenNewProject(handler) { this.btnNewProject?.addEventListener('click', handler); }

    bindSubmitNewProject(handler) {
        this.formNewProject?.addEventListener('submit', e => {
            e.preventDefault();
            const utenti = Array.from(
                document.querySelectorAll('#newMemberCheckboxes input[type="checkbox"]:checked')
            ).map(cb => Number(cb.value));
            handler({
                title:    document.getElementById('newProjectName')?.value.trim(),
                deadline: document.getElementById('newProjectDeadline')?.value,
                utenti,
            });
        });
    }

    // ---- Edit modal ----
    showEditModal(project, devs = []) {
        this.currentProjectId = project.id;
        const nameEl     = document.getElementById('editProjectName');

        const deadlineEl = document.getElementById('editProjectDeadline');
        if (nameEl)     nameEl.value     = project.title;

        if (deadlineEl) deadlineEl.value = project.deadline || '';
        const span = this.modalEdit?.querySelector('h3 span');
        if (span) span.innerText = '#' + project.id;

        this._renderDevList('editMemberCheckboxes', devs, project.memberIds ?? []);

        this.modalEdit?.classList.add('active');
    }

    bindSubmitEditProject(handler) {
        this.formEdit?.addEventListener('submit', e => {
            e.preventDefault();
            const utenti = Array.from(
                document.querySelectorAll('#editMemberCheckboxes input[type="checkbox"]:checked')
            ).map(cb => Number(cb.value));
            handler(this.currentProjectId, {
                title:    document.getElementById('editProjectName')?.value.trim(),
                deadline: document.getElementById('editProjectDeadline')?.value,
                utenti,
            });
        });
    }

    // ---- Delete modal ----
    showDeleteModal(id) {
        this.currentProjectId = id;
        const strong = this.modalDelete?.querySelector('strong');
        if (strong) strong.innerText = '#' + id;
        this.modalDelete?.classList.add('active');
    }

    bindConfirmDeleteProject(handler) {
        this.btnConfirmDelete?.addEventListener('click', () => handler(this.currentProjectId));
    }

    // ---- Project ticket modal ----
    showProjectTicketModal(project) {
        this.currentProjectId = project.id;
        const span = document.getElementById('targetProject');
        if (span) span.textContent = project.title;
        const titleEl = document.getElementById('projectTicketTitle');
        if (titleEl) titleEl.value = '';
        const descEl = document.getElementById('projectTicketDesc');
        if (descEl) descEl.value = '';
        this.modalProjectTicket?.classList.add('active');
    }

    bindSubmitProjectTicket(handler) {
        this.formProjectTicket?.addEventListener('submit', e => {
            e.preventDefault();
            handler({
                project_id: this.currentProjectId,
                title: document.getElementById('projectTicketTitle')?.value.trim(),
                type:  document.getElementById('projectTicketType')?.value || 'bug',
                desc:  document.getElementById('projectTicketDesc')?.value.trim(),
            });
        });
    }

    // ---- Table actions ----
    bindTableActions(handleEdit, handleDelete, handleOpenTicket = null) {
        if (!this.tableBody) return;
        this.tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;
            const id = Number(btn.closest('tr')?.dataset.id);
            if (!id) return;
            if (btn.querySelector('.icon-edit'))       handleEdit(id);
            if (btn.querySelector('.icon-delete'))     handleDelete(id);
            if (btn.querySelector('.icon-add-ticket') && handleOpenTicket) handleOpenTicket(id);
        });
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        this.currentProjectId = null;
    }

    displayProjects(projects, userRole = null) {
        if (!this.tableBody) return;
        const isDeveloper = userRole === 'developer';
        const colspan = isDeveloper ? 4 : 5;
        if (!projects.length) {
            this.tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:2rem;color:#888;">Nessun progetto presente</td></tr>`;
            return;
        }
        const ticketsUrl = userRole === 'admin' ? 'TicketsAdmin.html'
                         : userRole === 'developer' ? 'TicketsDev.html'
                         : 'TicketsTester.html';
        this.tableBody.innerHTML = projects.map(p => {
            let actionCell = '';
            if (userRole === 'admin') {
                actionCell = `<td><div class="action-buttons">
                    <button class="icon-btn" title="Modifica"><img src="images/edit.png" class="icon-edit" width="18"></button>
                    <button class="icon-btn" title="Elimina"><img src="images/delete.png" class="icon-delete" width="18"></button>
                </div></td>`;
            } else if (userRole === 'tester') {
                actionCell = `<td><div class="action-buttons">
                    <button class="icon-btn icon-btn--add" title="Segnala Bug"><img src="images/plus.png" class="icon-add-ticket" width="18"></button>
                </div></td>`;
            }
            const teamLabel = p.memberCount > 0
                ? `${p.memberCount} sviluppatore${p.memberCount > 1 ? 'i' : ''}`
                : '—';
            const bugCell = p.bugCount > 0
                ? `<a href="${ticketsUrl}?project_id=${p.id}" class="bug-count critical" title="Vedi i ticket">${p.bugCount}</a>`
                : `<span class="bug-count warning">0</span>`;
            return `<tr data-id="${p.id}">
                <td>
                    <strong>${p.title}</strong>
                    <small class="project-id-sub">#${p.id}</small>
                </td>
                <td>${teamLabel}</td>
                <td>${bugCell}</td>
                <td>${p.deadline || 'N/D'}</td>
                ${actionCell}
            </tr>`;
        }).join('');
    }
}
