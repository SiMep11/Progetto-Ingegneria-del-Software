import { TicketModel }     from './Models/TicketModel.js';
import { TicketView }      from './Views/TicketView.js';
import { TicketPresenter } from './Presenters/TicketPresenter.js';

import { ProjectModel }     from './Models/ProjectModel.js';
import { ProjectView }      from './Views/ProjectView.js';
import { ProjectPresenter } from './Presenters/ProjectPresenter.js';

import { LoginModel }     from './Models/LoginModel.js';
import { LoginView }      from './Views/LoginView.js';
import { LoginPresenter } from './Presenters/LoginPresenter.js';

import { UserModel }     from './Models/UserModel.js';
import { UserView }      from './Views/UserView.js';
import { UserPresenter } from './Presenters/UserPresenter.js';

import { CommentModel } from './Models/CommentModel.js';

import api from './Core/ApiClient.js';
import { showToast } from './Core/Toast.js';

window.addEventListener('pageshow', e => { if (e.persisted) window.location.reload(); });

function statusLabel(s) {
    return { open: 'Aperto', progress: 'In Lavorazione', review: 'In Revisione', confirmed: 'Confermato', closed: 'Chiuso' }[s] ?? s;
}
function escHtml(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.addEventListener('DOMContentLoaded', () => {

    // ================================================================
    // 1. GUARDIA ACCESSO
    // ================================================================
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');
    const currentPage = window.location.pathname.split('/').pop() || 'login.html';

    const pagePermissions = {
        'homepageAdmin.html':  ['admin'],
        'progettiAdmin.html':  ['admin'],
        'TicketsAdmin.html':   ['admin'],
        'UtentiAdmin.html':    ['admin'],

        'homepageDev.html':    ['developer', 'admin'],
        'progettiDev.html':    ['developer', 'admin'],
        'TicketsDev.html':     ['developer', 'admin'],

        'homepageTester.html': ['tester', 'admin'],
        'ProgettiTester.html': ['tester', 'admin'],
        'TicketsTester.html':  ['tester', 'admin'],

        'commentiDev.html':    ['developer', 'admin'],
        'commentiTester.html': ['tester', 'admin'],
    };

    const dashboardByRole = {
        admin:     'homepageAdmin.html',
        developer: 'homepageDev.html',
        tester:    'homepageTester.html',
    };

    if (!token && currentPage !== 'login.html') {
        window.location.href = 'login.html'; return;
    }
    if (token && currentPage === 'login.html' && user?.role) {
        window.location.href = dashboardByRole[user.role] || 'login.html'; return;
    }
    if (token && user && pagePermissions[currentPage]) {
        if (!pagePermissions[currentPage].includes(user.role)) {
            window.location.href = dashboardByRole[user.role] || 'login.html'; return;
        }
    }

    // ================================================================
    // 2. TOPBAR
    // ================================================================
    if (user) {
        const nameEl   = document.getElementById('loggedUserName');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl)   nameEl.textContent = user.name;
        if (avatarEl) avatarEl.src = 'images/profile.png';

        const userControls = document.querySelector('.user-controls');
        if (userControls && !document.getElementById('profileDropdown')) {
            userControls.style.position = 'relative';
            const escHtml = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const dropdown = document.createElement('div');
            dropdown.id = 'profileDropdown';
            dropdown.style.cssText =
                'display:none;position:absolute;top:66px;right:20px;background:#fff;' +
                'border:1px solid #E6EBF1;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);' +
                'padding:16px 20px;min-width:220px;z-index:999;line-height:1.6;';
            dropdown.innerHTML = `
                <p style="margin:0 0 4px;font-weight:600;color:#1A2B3C;">${escHtml(user.name)}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#6B7C93;">${escHtml(user.email ?? '')}</p>
                <p style="margin:0 0 12px;font-size:12px;color:#9BA8B5;text-transform:uppercase;">${escHtml(user.role)}</p>
                <hr style="border:none;border-top:1px solid #E6EBF1;margin:0 0 12px;">
                <button id="dropdownChangePw" style="background:none;border:none;cursor:pointer;color:#0A2540;font-size:14px;padding:0;display:block;width:100%;text-align:left;margin-bottom:10px;">Cambia password</button>
                <button id="dropdownLogout" style="background:none;border:none;cursor:pointer;color:#E53E3E;font-size:14px;padding:0;display:block;width:100%;text-align:left;">Esci</button>
            `;

            // Modal cambio password (inserito una volta sola nel body)
            if (!document.getElementById('modalChangePw')) {
                const mEl = document.createElement('div');
                mEl.id = 'modalChangePw';
                mEl.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,37,64,.6);align-items:center;justify-content:center;z-index:2000;';
                mEl.innerHTML = `
                    <div style="background:#fff;border-radius:8px;padding:32px;width:100%;max-width:400px;box-shadow:0 10px 30px rgba(0,0,0,.15);">
                        <h3 style="color:#0A2540;margin:0 0 20px;">Cambia Password</h3>
                        <form id="formChangePw">
                            <div style="margin-bottom:16px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:14px;color:#0A2540;">Password attuale</label>
                                <input type="password" id="cpwCurrent" placeholder="••••••••" style="width:100%;padding:11px 14px;border:1px solid #D3DCE6;border-radius:6px;font-size:15px;background:#FAFBFC;" required>
                            </div>
                            <div style="margin-bottom:16px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:14px;color:#0A2540;">Nuova password</label>
                                <input type="password" id="cpwNew" placeholder="••••••••" style="width:100%;padding:11px 14px;border:1px solid #D3DCE6;border-radius:6px;font-size:15px;background:#FAFBFC;" required>
                            </div>
                            <div style="margin-bottom:24px;">
                                <label style="display:block;margin-bottom:6px;font-weight:600;font-size:14px;color:#0A2540;">Conferma nuova password</label>
                                <input type="password" id="cpwConfirm" placeholder="••••••••" style="width:100%;padding:11px 14px;border:1px solid #D3DCE6;border-radius:6px;font-size:15px;background:#FAFBFC;" required>
                            </div>
                            <div id="cpwError" style="display:none;color:#DE350B;font-size:13px;margin-bottom:12px;"></div>
                            <div style="display:flex;justify-content:flex-end;gap:12px;">
                                <button type="button" id="cpwCancel" style="padding:10px 18px;border-radius:6px;border:none;background:#E6EBF1;color:#0A2540;font-weight:600;cursor:pointer;">Annulla</button>
                                <button type="submit" style="padding:10px 18px;border-radius:6px;border:none;background:#0A2540;color:#fff;font-weight:600;cursor:pointer;">Salva</button>
                            </div>
                        </form>
                    </div>`;
                document.body.appendChild(mEl);

                document.getElementById('cpwCancel').addEventListener('click', () => {
                    mEl.style.display = 'none';
                    document.getElementById('formChangePw').reset();
                });
                document.getElementById('formChangePw').addEventListener('submit', async e => {
                    e.preventDefault();
                    const currentPw = document.getElementById('cpwCurrent').value;
                    const newPw     = document.getElementById('cpwNew').value;
                    const confirm   = document.getElementById('cpwConfirm').value;
                    const errEl     = document.getElementById('cpwError');
                    errEl.style.display = 'none';
                    if (newPw !== confirm) {
                        errEl.textContent = 'Le password non coincidono.';
                        errEl.style.display = 'block';
                        return;
                    }
                    try {
                        await api.put(`/users/${user.id}/password`, { currentPassword: currentPw, newPassword: newPw });
                        mEl.style.display = 'none';
                        document.getElementById('formChangePw').reset();
                        showToast('Password aggiornata con successo');
                    } catch (err) {
                        errEl.textContent = err.message || 'Errore aggiornamento password.';
                        errEl.style.display = 'block';
                    }
                });
            }
            document.body.appendChild(dropdown);

            document.getElementById('dropdownChangePw')?.addEventListener('click', () => {
                dropdown.style.display = 'none';
                const mEl = document.getElementById('modalChangePw');
                if (mEl) mEl.style.display = 'flex';
            });

            [avatarEl, nameEl].forEach(el => { if (el) el.style.cursor = 'pointer'; });
            userControls.addEventListener('click', e => {
                if (e.target.closest('#btnLogout')) return;
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
            document.addEventListener('click', e => {
                if (!userControls.contains(e.target) && !dropdown.contains(e.target))
                    dropdown.style.display = 'none';
            });
            document.getElementById('dropdownLogout')?.addEventListener('click', () => {
                localStorage.clear(); window.location.href = 'login.html';
            });
        }
    }

    // ================================================================
    // 3. LOGOUT
    // ================================================================
    document.getElementById('btnLogout')?.addEventListener('click', e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // ================================================================
    // 3b. RICERCA IN-TABELLA (filtra righe visibili in tempo reale)
    // ================================================================
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase().trim();
            document.querySelectorAll('.data-table tbody tr').forEach(tr => {
                tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    // ================================================================
    // 4. LOGIN
    // ================================================================
    if (document.getElementById('login-form')) {
        new LoginPresenter(new LoginModel(), new LoginView());
        return; // nessun'altra logica necessaria sulla pagina di login
    }

    // ================================================================
    // 5. DASHBOARD ADMIN
    // ================================================================
    if (document.getElementById('dashAdminProjects')) {
        document.getElementById('btnGoProjects')?.addEventListener('click',
            () => window.location.href = 'progettiAdmin.html');
        document.getElementById('btnGoTickets')?.addEventListener('click',
            () => window.location.href = 'TicketsAdmin.html');

        api.get('/projects').then(projects => {
            const tbody = document.getElementById('dashAdminProjects');
            if (!tbody || !Array.isArray(projects)) return;
            tbody.innerHTML = !projects.length
                ? '<tr><td colspan="3" style="text-align:center;padding:1rem;color:#888;">Nessun progetto</td></tr>'
                : projects.slice(0, 5).map(p => `<tr>
                        <td>${p.id}</td><td>${p.title}</td>
                        <td><span class="bug-count ${p.bugCount > 0 ? 'critical' : 'warning'}">${p.bugCount}</span></td>
                    </tr>`).join('');
        }).catch(() => {
            const el = document.getElementById('dashAdminProjects');
            if (el) el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#e53e3e;">Errore caricamento dati.</td></tr>';
        });

        api.get('/tickets').then(tickets => {
            const tbody = document.getElementById('dashAdminTickets');
            if (!tbody || !Array.isArray(tickets)) return;
            const confermati = tickets.filter(t => t.status === 'confirmed');
            tbody.innerHTML = !confermati.length
                ? '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888;">Nessun ticket confermato da chiudere</td></tr>'
                : confermati.slice(0, 8).map(t => `<tr>
                        <td><strong>#${t.id}</strong></td>
                        <td>${escHtml(t.title)}</td>
                        <td><span class="type-badge type-${t.type}">${t.type}</span></td>
                        <td><a href="TicketsAdmin.html" class="btn-table-action">Chiudi</a></td>
                    </tr>`).join('');
        }).catch(() => {
            const el = document.getElementById('dashAdminTickets');
            if (el) el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#e53e3e;">Errore caricamento dati.</td></tr>';
        });
    }

    // ================================================================
    // 6. DASHBOARD DEV
    // ================================================================
    if (document.getElementById('dashDevProjects')) {
        document.getElementById('btnGoTickets')?.addEventListener('click',
            () => window.location.href = 'TicketsDev.html');

        api.get('/projects').then(projects => {
            const tbody = document.getElementById('dashDevProjects');
            if (!tbody || !Array.isArray(projects)) return;
            tbody.innerHTML = !projects.length
                ? '<tr><td colspan="3" style="text-align:center;padding:1rem;color:#888;">Nessun progetto assegnato</td></tr>'
                : projects.slice(0, 5).map(p => `<tr>
                        <td>${p.id}</td><td><strong>${p.title}</strong></td>
                        <td><span class="bug-count ${p.bugCount > 0 ? 'critical' : 'warning'}">${p.bugCount}</span></td>
                    </tr>`).join('');
        }).catch(() => {
            const el = document.getElementById('dashDevProjects');
            if (el) el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#e53e3e;">Errore caricamento dati.</td></tr>';
        });

        api.get('/tickets').then(tickets => {
            const tbody = document.getElementById('dashDevTickets');
            if (!tbody || !Array.isArray(tickets) || !user) return;
            const attivi = tickets
                .filter(t => t.assegnato_a === user.id && !['closed', 'confirmed'].includes(t.status))
                .slice(0, 8);
            tbody.innerHTML = !attivi.length
                ? '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888;">Nessun ticket attivo assegnato</td></tr>'
                : attivi.map(t => {
                    const s = t.status;
                    const sLabel = statusLabel(s);
                    return `<tr>
                        <td><strong>#${t.id}</strong></td><td>${escHtml(t.title)}</td>
                        <td><span class="status-badge status-${s}">${sLabel}</span></td>
                        <td><span class="type-badge type-${t.type}">${t.type}</span></td>
                    </tr>`;
                }).join('');
        }).catch(() => {
            const el = document.getElementById('dashDevTickets');
            if (el) el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#e53e3e;">Errore caricamento dati.</td></tr>';
        });
    }

    // ================================================================
    // 7. DASHBOARD TESTER
    // ================================================================
    if (document.getElementById('dashTesterReview') || document.getElementById('dashTesterTickets')) {
        api.get('/tickets').then(tickets => {
            if (!Array.isArray(tickets) || !user) return;

            // Sezione 1: ticket da revisionare (tutti i progetti visibili al tester)
            const reviewBody = document.getElementById('dashTesterReview');
            if (reviewBody) {
                const daRevis = tickets.filter(t => t.status === 'review').slice(0, 8);
                reviewBody.innerHTML = !daRevis.length
                    ? '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888;">Nessun ticket in attesa di revisione</td></tr>'
                    : daRevis.map(t => `<tr>
                            <td><strong>#${t.id}</strong></td>
                            <td>${escHtml(t.title)}</td>
                            <td><span class="type-badge type-${t.type}">${t.type}</span></td>
                            <td><a href="TicketsTester.html" class="btn-table-action btn-review">Revisiona</a></td>
                        </tr>`).join('');
            }

            // Sezione 2: le mie segnalazioni
            const mineBody = document.getElementById('dashTesterTickets');
            if (mineBody) {
                const mine = tickets.filter(t => t.creato_da === user.id).slice(0, 5);
                mineBody.innerHTML = !mine.length
                    ? '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#888;">Nessuna segnalazione inviata</td></tr>'
                    : mine.map(t => {
                        const s = t.status;
                        return `<tr>
                            <td><strong>#${t.id}</strong></td><td>${escHtml(t.title)}</td>
                            <td><span class="type-badge type-${t.type}">${t.type}</span></td>
                            <td><span class="status-badge status-${s}">${statusLabel(s)}</span></td>
                        </tr>`;
                    }).join('');
            }
        }).catch(() => {
            ['dashTesterReview','dashTesterTickets'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:1rem;color:#e53e3e;">Errore caricamento dati.</td></tr>';
            });
        });
    }

    // ================================================================
    // 8. PAGINA PROGETTI
    // ================================================================
    if (document.getElementById('projectsTableBody')) {
        const projectModel = new ProjectModel();
        const projectView  = new ProjectView();
        new ProjectPresenter(projectModel, projectView, user?.role || null);

    }

    // ================================================================
    // 9. PAGINA TICKET
    // ================================================================
    if (document.getElementById('ticketsTableBody')) {
        const canLoadUsers = user?.role === 'admin';
        new TicketPresenter(
            new TicketModel(),
            new TicketView(user?.role || 'tester'),
            new ProjectModel(),
            canLoadUsers ? new UserModel() : null
        );
    }

    // ================================================================
    // 10. PAGINA UTENTI
    // ================================================================
    if (document.getElementById('usersTableBody')) {
        new UserPresenter(new UserModel(), new UserView());
    }

    // ================================================================
    // 11. PAGINA COMMENTI (commentiDev.html / commentiTester.html)
    // ================================================================
    if (document.getElementById('myCommentsTableBody')) {
        const commentModel  = new CommentModel();
        const tbody         = document.getElementById('myCommentsTableBody');
        const searchInput   = document.getElementById('searchInput');
        const isAdmin       = user?.role === 'admin';
        let editingId       = null;

        const roleLabel = { admin: 'Admin', developer: 'Dev', tester: 'Tester' };

        function esc(s) {
            return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        function renderComments(comments) {
            if (!comments.length) {
                tbody.innerHTML = '<p class="feed-empty">Nessun commento ancora.</p>';
                return;
            }
            tbody.innerHTML = comments.map(c => {
                const stato      = statusLabel(c.ticket_stato);
                const statoClass = `status-${c.ticket_stato}`;
                const tipo = c.ticket_tipo === 'bug'
                    ? '<span class="type-badge type-bug">bug</span>'
                    : '<span class="type-badge type-feature">feature</span>';
                const dt = c.created_at
                    ? new Date(c.created_at).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                    : '';
                const isMine     = user && (parseInt(c.utente_id) === parseInt(user.id));
                const canAct     = isMine || isAdmin;
                const autoreHtml = isMine
                    ? `<strong style="color:#0A2540;">Tu</strong>`
                    : `${esc(c.autore_nome)} ${esc(c.autore_cognome)} <span style="color:#9BA8B5;">· ${roleLabel[c.autore_ruolo] ?? esc(c.autore_ruolo)}</span>`;
                const actions = canAct
                    ? `<div class="action-buttons">
                           <button class="icon-btn btn-edit-comment" data-id="${c.id}" title="Modifica"><img src="images/edit.png" class="icon-edit" width="18"></button>
                           <button class="icon-btn btn-delete-comment" data-id="${c.id}" title="Elimina"><img src="images/delete.png" class="icon-delete" width="18"></button>
                       </div>`
                    : '';
                return `<div class="comment-card${isMine ? ' comment-card--mine' : ''}" data-comment-id="${c.id}">
                    <div class="comment-card-header">
                        ${tipo}
                        <span class="comment-card-ticket">#${c.ticket_id} — ${esc(c.ticket_titolo)}</span>
                        <span class="status-badge ${statoClass}">${stato}</span>
                    </div>
                    <div class="comment-card-body">${esc(c.testo)}</div>
                    <div class="comment-card-footer">
                        <span class="comment-card-author">${autoreHtml}</span>
                        <span class="comment-card-date">${dt}</span>
                        ${actions}
                    </div>
                </div>`;
            }).join('');
        }

        // Caricamento iniziale
        commentModel.fetchFeed()
            .then(() => renderComments(commentModel.comments))
            .catch(() => {
                tbody.innerHTML = '<p class="feed-error">Errore nel caricamento dei commenti.</p>';
            });

        // Filtro di ricerca
        searchInput?.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            renderComments(commentModel.comments.filter(c =>
                c.ticket_titolo?.toLowerCase().includes(q) ||
                c.testo?.toLowerCase().includes(q) ||
                c.autore_nome?.toLowerCase().includes(q) ||
                c.autore_cognome?.toLowerCase().includes(q)
            ));
        });

        // Delegazione click su edit/delete
        tbody.addEventListener('click', e => {
            const editBtn   = e.target.closest('.btn-edit-comment');
            const deleteBtn = e.target.closest('.btn-delete-comment');

            if (editBtn) {
                const id      = Number(editBtn.dataset.id);
                const comment = commentModel.comments.find(c => c.id === id);
                if (!comment) return;
                editingId = id;
                const ta = document.getElementById('editCommentText');
                if (ta) ta.value = comment.testo;
                document.getElementById('modalEditComment')?.classList.add('active');
            }

            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.id);
                if (!id || !confirm('Eliminare definitivamente questo commento?')) return;
                commentModel.deleteComment(id)
                    .then(() => { renderComments(commentModel.comments); showToast('Commento eliminato', 'info'); })
                    .catch(err => showToast('Errore: ' + err.message, 'error'));
            }
        });

        // Modal modifica commento
        ['closeEditCommentModal', 'cancelEditCommentBtn'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                document.getElementById('modalEditComment')?.classList.remove('active');
                editingId = null;
            });
        });

        document.getElementById('saveEditCommentBtn')?.addEventListener('click', () => {
            const text = document.getElementById('editCommentText')?.value.trim();
            if (!text || !editingId) return;
            commentModel.updateComment(editingId, text)
                .then(() => {
                    renderComments(commentModel.comments);
                    document.getElementById('modalEditComment')?.classList.remove('active');
                    editingId = null;
                    showToast('Commento aggiornato');
                })
                .catch(err => showToast('Errore: ' + err.message, 'error'));
        });
    }
});
