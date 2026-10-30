import api from '../Core/ApiClient.js';

export class CommentModel {
    constructor() {
        this.comments = [];
    }

    async fetchFeed() {
        const response = await api.get('/commenti/feed');
        if (response.error) throw new Error(response.error);
        this.comments = Array.isArray(response) ? response : [];
        return this.comments;
    }

    async updateComment(id, text) {
        const response = await api.put(`/commenti/${id}`, { testo: text });
        if (response.error) throw new Error(response.error);
        const idx = this.comments.findIndex(c => c.id === id);
        if (idx !== -1) this.comments[idx] = { ...this.comments[idx], testo: text };
        return response;
    }

    async deleteComment(id) {
        const response = await api.delete(`/commenti/${id}`);
        if (response.error) throw new Error(response.error);
        this.comments = this.comments.filter(c => c.id !== id);
        return true;
    }
}
