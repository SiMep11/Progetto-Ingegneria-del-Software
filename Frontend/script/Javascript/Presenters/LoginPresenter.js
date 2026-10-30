// script/Javascript/Presenters/LoginPresenter.js
export class LoginPresenter {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.view.bindLoginSubmit(this.handleLogin.bind(this));
    }

    async handleLogin(email, password) {
        try {
            const response = await this.model.authenticate(email, password);

            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            const role = response.user.role;
            if (role === 'admin') {
                window.location.href = 'homepageAdmin.html';
            } else if (role === 'developer') {
                window.location.href = 'homepageDev.html';
            } else if (role === 'tester') {
                window.location.href = 'homepageTester.html';
            } else {
                throw new Error("Ruolo non riconosciuto");
            }

        } catch (error) {
            console.error("Login fallito:", error);
            this.view.showError("Email o password non validi. Riprova.");
        }
    }
}