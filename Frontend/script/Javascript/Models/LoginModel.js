// script/Javascript/Models/LoginModel.js
import api from '../Core/ApiClient.js';

export class LoginModel {
    async authenticate(email, password) {
        const response = await api.post('/login', { email, password });
        if (response.error) {
            throw new Error(response.error);
        }
        return response;
    }
}