class ApiClient {
    constructor() {
        if (ApiClient.instance) {
            return ApiClient.instance;
        }
        this.baseUrl = window.API_BASE_URL ?? 'http://localhost:8080/api/v1';
        ApiClient.instance = this;
    }

    getHeaders(isPostOrPut = false) {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (isPostOrPut) headers['Content-Type'] = 'application/json';
        return headers;
    }

    _handleUnauthorized() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    async get(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (response.status === 401) { this._handleUnauthorized(); throw new Error('Sessione scaduta'); }
        return await response.json();
    }

    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(data)
        });
        if (response.status === 401) { this._handleUnauthorized(); throw new Error('Sessione scaduta'); }
        return await response.json();
    }

    async put(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(true),
            body: JSON.stringify(data)
        });
        if (response.status === 401) { this._handleUnauthorized(); throw new Error('Sessione scaduta'); }
        return await response.json();
    }

    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (response.status === 401) { this._handleUnauthorized(); throw new Error('Sessione scaduta'); }
        return await response.json();
    }
}

const api = new ApiClient();
export default api;
