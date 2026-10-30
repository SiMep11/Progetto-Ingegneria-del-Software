function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export class TicketView {
    constructor(userRole = 'tester') {
        this.userRole         = userRole;
        this.tableBody        = document.getElementById('ticketsTableBody');
        this.modalNewTicket   = document.getElementById('modalNewTicket');
        this.btnNewTicket     = document.getElementById('btnCreateTicket');
        this.formNewTicket    = document.getElementById('formNewTicket');
        this.modalView        = document.getElementById('modalViewTicket');
        this.modalEdit        = document.getElementById('modalEditTicket');
        this.formEdit         = document.getElementById('formEditTicket');
        this.modalDelete      = document.getElementById('modalDeleteTicket');
        this.btnConfirmDelete = document.getElementById('confirmDeleteBtn');
        this.modalComments    = document.getElementById('modalTicketComments');
        this.commentsLog      = this.modalComments?.querySelector('.read-only-box');
        this.currentTicketId         = null;
        this.currentCommentTicketId  = null;

        this._wireFeatureAssigneeToggle();
        this._initCloseButtons();
    }

    _wireFeatureAssigneeToggle() {
        const typeEl     = document.getElementById('ticketType');
        const assigneeEl = document.getElementById('ticketAssignee');
        if (!typeEl || !assigneeEl) return;
        const label = assigneeEl.closest('.input-group')?.querySelector('label');
        typeEl.addEventListener('change', () => {
            if (typeEl.value === 'feature') {
                assigneeEl.required = true;
                if (label) label.textContent = 'Assegna a (Sviluppatore) *';
            } else {
                assigneeEl.required = false;
                if (label) label.textContent = 'Assegna a (Sviluppatore)';
            }
        });
    }

    _initCloseButtons() {
        document.querySelectorAll('.btn-close-modal, .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
                this.formNewTicket?.reset();
                this.formEdit?.reset();
                const ta = document.getElementById('newTicketComment');
                if (ta) ta.value = '';
                this.currentCommentTicketId = null;
            });
        });
    }

    // ---- New ticket ----
    showNewTicketModal() { this.modalNewTicket?.classList.add('active'); }

    bindOpenNewTicket(handler) { this.btnNewTicket?.addEventListener('click', handler); }

    bindSubmitNewTicket(handler) {
        this.formNewTicket?.addEventListener('submit', e => {
            e.preventDefault();
            const assigneeEl = document.getElementById('ticketAssignee');
            handler({
                title:       document.getElementById('ticketTitle')?.value.trim(),
                type:        document.getElementById('ticketType')?.value,
                project_id:  Number(document.getElementById('ticketProject')?.value),
                assegnato_a: assigneeEl?.value ? Number(assigneeEl.value) : null,
                desc:        document.getElementById('ticketComment')?.value,
            });
        });
    }

    // ---- View modal ----
    showViewModal(ticket) {
        const s = ticket.state.getStatusName();
        const sLabel = TicketView.statusLabel(s);

        const idEl     = document.getElementById('viewDetailId');
        const projEl   = document.getElementById('viewDetailProject');
        const typeEl   = document.getElementById('viewDetailType');
        const statusEl = document.getElementById('viewDetailStatus');
        const userEl   = document.getElementById('viewDetailUser');
        const descEl   = document.getElementById('viewDetailDesc');

        if (idEl)     idEl.innerText     = '#' + ticket.id;
        if (projEl)   projEl.innerText   = ticket.projectName || (ticket.project_id ? `Progetto #${ticket.project_id}` : 'N/D');
        if (typeEl)   { typeEl.innerText = ticket.type; typeEl.className = `type-badge type-${ticket.type}`; }
        if (statusEl) { statusEl.innerText = sLabel; statusEl.className = `status-badge status-${s}`; }
        if (userEl)   userEl.innerText   = ticket.creato_da_nome ? `${ticket.creato_da_nome} ${ticket.creato_da_cognome}` : 'N/D';
        if (descEl)   descEl.innerText   = ticket.desc || '';

        this.modalView?.classList.add('active');
    }

    // ---- Edit modal ----
    showEditModal(ticket) {
        this.currentTicketId = ticket.id;
        const s          = ticket.state.getStatusName();
        const statusEl   = document.getElementById('editTicketStatus');
        const descEl     = document.getElementById('editTicketDesc');
        const assigneeEl = document.getElementById('editTicketAssignee');

        if (statusEl) {
            const labels = TicketView.statusLabels;
            if (this.userRole === 'admin') {
                statusEl.innerHTML = Object.entries(labels)
                    .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
            } else if (this.userRole === 'tester') {
                if (s === 'review') {
                    statusEl.innerHTML =
                        `<option value="review">${labels['review']}</option>` +
                        `<option value="confirmed">${labels['confirmed']}</option>` +
                        `<option value="progress">${labels['progress']}</option>`;
                } else {
                    statusEl.innerHTML = `<option value="${s}">${labels[s] ?? s}</option>`;
                }
            } else {
                // developer: solo transizioni esplicitamente consentite
                const devNext = { open: 'progress', progress: 'review' };
                const next = devNext[s];
                let opts = `<option value="${s}">${labels[s] ?? s}</option>`;
                if (next) opts += `<option value="${next}">${labels[next] ?? next}</option>`;
                statusEl.innerHTML = opts;
            }
            statusEl.value = s;
        }

        const isAdmin = this.userRole === 'admin';
        const descGroup     = descEl?.closest('.input-group');
        const assigneeGroup = assigneeEl?.closest('.input-group');
        if (descGroup)     descGroup.style.display     = isAdmin ? '' : 'none';
        if (assigneeGroup) assigneeGroup.style.display = isAdmin ? '' : 'none';
        if (isAdmin) {
            if (descEl)     descEl.value     = ticket.desc || '';
            if (assigneeEl) assigneeEl.value = ticket.assegnato_a ?? '';
        }
        const span = this.modalEdit?.querySelector('h3 span');
        if (span) span.innerText = '#' + ticket.id;
        this.modalEdit?.classList.add('active');
    }

    bindSubmitEditTicket(handler) {
        this.formEdit?.addEventListener('submit', e => {
            e.preventDefault();
            const data = { status: document.getElementById('editTicketStatus')?.value };
            if (this.userRole === 'admin') {
                const descEl     = document.getElementById('editTicketDesc');
                const assigneeEl = document.getElementById('editTicketAssignee');
                if (descEl)     data.desc        = descEl.value;
                if (assigneeEl) data.assegnato_a = assigneeEl.value ? Number(assigneeEl.value) : null;
            }
            handler(this.currentTicketId, data);
        });
    }

    // ---- Delete modal ----
    showDeleteModal(id) {
        this.currentTicketId = id;
        const strong = this.modalDelete?.querySelector('strong');
        if (strong) strong.innerText = '#' + id;
        this.modalDelete?.classList.add('active');
    }

    bindConfirmDelete(handler) {
        this.btnConfirmDelete?.addEventListener('click', () => handler(this.currentTicketId));
    }

    // ---- Comments modal ----
    showCommentsModal(ticketId, comments) {
        this.currentCommentTicketId = ticketId;
        const span = this.modalComments?.querySelector('h3 span');
        if (span) span.innerText = '#' + ticketId;
        this.renderComments(comments);
        const ta = document.getElementById('newTicketComment');
        if (ta) ta.value = '';
        this.modalComments?.classList.add('active');
    }

    renderComments(comments) {
        if (!this.commentsLog) return;
        if (!comments || !comments.length) {
            this.commentsLog.innerHTML = '<p style="color:#888;font-size:13px;text-align:center;margin:0;">Nessun commento ancora.</p>';
            return;
        }
        this.commentsLog.innerHTML = comments.map(c => {
            const dt = c.created_at
                ? new Date(c.created_at).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
                : '';
            return `<p style="margin:0 0 10px;font-size:13px;">
                <strong>${escapeHtml(c.nome)} ${escapeHtml(c.cognome)}</strong>
                <span style="color:#9BA8B5;margin-left:6px;font-size:11px;">${escapeHtml(c.ruolo)} · ${dt}</span><br>
                <span style="white-space:pre-wrap;">${escapeHtml(c.testo)}</span>
            </p>`;
        }).join('<hr style="border:none;border-top:1px solid #eee;margin:6px 0;">');
        this.commentsLog.scrollTop = this.commentsLog.scrollHeight;
    }

    // ---- Dropdown population ----
    populateProjectSelect(projects) {
        const sel = document.getElementById('ticketProject');
        if (!sel || !Array.isArray(projects)) return;
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.title;
            sel.appendChild(opt);
        });
    }

    populateAssigneeSelects(devs) {
        ['ticketAssignee', 'editTicketAssignee'].forEach(selId => {
            const sel = document.getElementById(selId);
            if (!sel || !Array.isArray(devs)) return;
            devs.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.firstName} ${u.lastName}`;
                sel.appendChild(opt);
            });
        });
    }

    bindSendComment(handler) {
        document.getElementById('sendCommentBtn')?.addEventListener('click', () => {
            const ta   = document.getElementById('newTicketComment');
            const text = ta?.value.trim();
            if (!text) return;
            handler(this.currentCommentTicketId, text, ta);
        });
    }

    // ---- Table actions ----
    bindTableActions(handleView, handleEdit, handleDelete, handleComments) {
        if (!this.tableBody) return;
        this.tableBody.addEventListener('click', e => {
            const btn = e.target.closest('.icon-btn');
            if (!btn) return;
            const id = Number(btn.closest('tr')?.dataset.id);
            if (!id) return;
            if (btn.querySelector('.icon-view'))    handleView(id);
            if (btn.querySelector('.icon-edit'))    handleEdit(id);
            if (btn.querySelector('.icon-delete'))  handleDelete(id);
            if (btn.querySelector('.icon-comment')) handleComments(id);
        });
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        this.formNewTicket?.reset();
        this.formEdit?.reset();
        const ta = document.getElementById('newTicketComment');
        if (ta) ta.value = '';
        this.currentTicketId        = null;
        this.currentCommentTicketId = null;
    }

    // ---- Display ----
    showFilterBanner(projectName) {
        let banner = document.getElementById('filterBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'filterBanner';
            banner.className = 'filter-banner';
            document.querySelector('.full-table-container')?.insertAdjacentElement('beforebegin', banner);
        }
        banner.innerHTML = `Filtro attivo — progetto: <strong>${escapeHtml(projectName)}</strong> &nbsp; <a href="${window.location.pathname}" class="clear-filter">× Rimuovi filtro</a>`;
    }

    displayTickets(tickets) {
        if (!this.tableBody) return;
        const role        = this.userRole;
        const canEdit     = role === 'admin' || role === 'developer';
        const canDelete   = role === 'admin';
        const projectsUrl = role === 'admin' ? 'progettiAdmin.html'
                          : role === 'developer' ? 'progettiDev.html'
                          : 'ProgettiTester.html';

        if (!tickets.length) {
            this.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">Nessun ticket presente</td></tr>';
            return;
        }
        this.tableBody.innerHTML = tickets.map(t => {
            const s        = t.state.getStatusName();
            const sLabel   = TicketView.statusLabel(s);
            const assigned = t.assegnato_a_nome ? `${t.assegnato_a_nome} ${t.assegnato_a_cognome}` : '—';
            const projCell = t.projectName
                ? `<a href="${projectsUrl}" class="project-nav-link">${escapeHtml(t.projectName)}</a>`
                : '—';
            const testerCanEdit = role === 'tester' && s === 'review';
            const editBtn   = (canEdit || testerCanEdit)
                ? `<button class="icon-btn" title="Modifica"><img src="images/edit.png" class="icon-edit" width="20"></button>` : '';
            const deleteBtn = canDelete
                ? `<button class="icon-btn" title="Elimina"><img src="images/delete.png" class="icon-delete" width="20"></button>` : '';
            return `<tr data-id="${t.id}">
                <td><strong>#${t.id}</strong></td>
                <td><span class="type-badge type-${t.type}">${t.type}</span></td>
                <td>${escapeHtml(t.title)}</td>
                <td>${projCell}</td>
                <td>${assigned}</td>
                <td><span class="status-badge status-${s}">${sLabel}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn" title="Visualizza"><img src="images/detail.png" class="icon-view" width="20"></button>
                        ${editBtn}
                        ${deleteBtn}
                        <button class="icon-btn" title="Commenti"><img src="images/comment.png" class="icon-comment" width="20"></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    static get statusLabels() {
        return {
            open:      'Aperto',
            progress:  'In Lavorazione',
            review:    'In Revisione',
            confirmed: 'Confermato',
            closed:    'Chiuso',
        };
    }

    static statusLabel(s) {
        return TicketView.statusLabels[s] ?? s;
    }
}
