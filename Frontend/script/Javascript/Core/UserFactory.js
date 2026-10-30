class User {
    constructor(data) {
        this.id        = data.id;
        this.firstName = data.firstName;
        this.lastName  = data.lastName;
        this.email     = data.email;
        this.role      = data.role;
        this.createdAt = data.created_at || null;
    }
}

export class UserFactory {
    static create(data) {
        return new User(data);
    }
}
