// script/Javascript/Views/LoginView.js
export class LoginView {
    constructor() {
        this.loginForm = document.getElementById('login-form');
        this.emailInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.errorDisplay = document.getElementById('loginError'); // Crea un div vuoto per gli errori se non l'hai fatto
    }

    bindLoginSubmit(handler) {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', event => {
                event.preventDefault();
                if (this.errorDisplay) this.errorDisplay.style.display = 'none';
                const email = this.emailInput.value;
                const password = this.passwordInput.value;
                handler(email, password);
            });
        }
    }

    showError(message) {
        // Se hai un div per l'errore lo mostra, altrimenti usa un alert
        if (this.errorDisplay) {
            this.errorDisplay.innerText = message;
            this.errorDisplay.style.display = 'block';
            this.errorDisplay.style.color = '#DE350B';
            this.errorDisplay.style.marginBottom = '15px';
        } else {
            alert(message);
        }
    }
}