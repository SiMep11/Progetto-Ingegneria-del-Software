import api from '../Core/ApiClient.js';
import { TicketFactory } from '../Core/TicketFactory.js';

export class TicketModel {
    constructor() {
        this.tickets = [];
    }

    async fetchTickets(params = {}) {
        const query = new URLSearchParams(params).toString();
        const response = await api.get('/tickets' + (query ? '?' + query : ''));
        if (response.error) throw new Error(response.error);
        this.tickets = response.map(item => TicketFactory.create(item));
        return this.tickets;
    }

    async createTicket(ticketData) {
        const response = await api.post('/tickets', ticketData);
        if (response.error) throw new Error(response.error);
        await this.fetchTickets();
        return response;
    }

    async updateTicket(ticketId, updatedData) {
        const response = await api.put(`/tickets/${ticketId}`, updatedData);
        if (response.error) throw new Error(response.error);
        await this.fetchTickets();
        return response;
    }

    async deleteTicket(ticketId) {
        const response = await api.delete(`/tickets/${ticketId}`);
        if (response.error) throw new Error(response.error);
        this.tickets = this.tickets.filter(t => t.id !== ticketId);
        return true;
    }

    async fetchComments(ticketId) {
        const response = await api.get(`/tickets/${ticketId}/commenti`);
        if (response.error) throw new Error(response.error);
        return Array.isArray(response) ? response : [];
    }

    async addComment(ticketId, text) {
        const response = await api.post(`/tickets/${ticketId}/commenti`, { testo: text });
        if (response.error) throw new Error(response.error);
        return response;
    }
}
