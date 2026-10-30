import api from '../Core/ApiClient.js';
import { ProjectFactory } from '../Core/ProjectFactory.js';

export class ProjectModel {
    constructor() {
        this.projects = [];
    }

    async createProject(projectData) {
        const response = await api.post('/projects', projectData);
        if (response.error) throw new Error(response.error);
        await this.fetchProjects();
        return response;
    }

    async fetchProjects() {
        const response = await api.get('/projects');
        if (!Array.isArray(response)) throw new Error(response.error ?? 'Errore caricamento progetti');
        this.projects = response.map(item => ProjectFactory.create(item));
        return this.projects;
    }

    async updateProject(projectId, updatedData) {
        const response = await api.put(`/projects/${projectId}`, updatedData);
        if (response.error) throw new Error(response.error);
        await this.fetchProjects();
        return response;
    }

    async deleteProject(projectId) {
        const response = await api.delete(`/projects/${projectId}`);
        if (response.error) throw new Error(response.error);
        this.projects = this.projects.filter(p => p.id !== projectId);
        return true;
    }

    async createTicket(ticketData) {
        const response = await api.post('/tickets', ticketData);
        if (response.error) throw new Error(response.error);
        return response;
    }

    async fetchDevelopers() {
        const response = await api.get('/users');
        if (!Array.isArray(response)) throw new Error(response?.error ?? 'Errore caricamento utenti');
        return response.filter(u => u.role === 'developer');
    }
}