export class Project {
    constructor(data) {
        this.id          = data.id;
        this.title       = data.title;
        this.pm          = data.pm || null;
        this.deadline    = data.deadline || null;
        this.bugCount    = data.bugCount    ?? 0;
        this.memberCount = data.memberCount ?? 0;
        this.memberIds   = data.memberIds   ?? [];
        this.description = data.description ?? null;
    }
}

export class ProjectFactory {
    static create(data) {
        return new Project(data);
    }
}