import api from '../Core/ApiClient.js';
import { UserFactory } from '../Core/UserFactory.js';

export class UserModel {
    constructor() {
        this.users = [];
    }

    async fetchUsers() {
        const response = await api.get('/users');
        if (response.error) throw new Error(response.error);
        if (!Array.isArray(response)) throw new Error('Risposta non valida dal server');
        this.users = response.map(item => UserFactory.create(item));
        return this.users;
    }

    async createUser(userData) {
        const payload = {
            nome: userData.firstName,
            cognome: userData.lastName,
            email: userData.email,
            password: userData.password,
            role: userData.role,
        };
        const response = await api.post('/users', payload);
        if (response.error) throw new Error(response.error);
        await this.fetchUsers();
        return response;
    }

    async deleteUser(userId) {
        const response = await api.delete(`/users/${userId}`);
        if (response.error) throw new Error(response.error);
        this.users = this.users.filter(u => u.id !== userId);
    }

    async resetPassword(userId) {
        const response = await api.put(`/users/${userId}/password`, {});
        if (response.error) throw new Error(response.error);
        return response;
    }
}
