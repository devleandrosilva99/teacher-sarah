import "server-only";
import { getDriver } from "./driver";
import type {
  AppNotification,
  Activity,
  Assignment,
  ClassGroup,
  Invitation,
  Lesson,
  Passage,
  Question,
  Student,
  Submission,
  Teacher,
  User,
} from "@/lib/types";

// Acesso aos dados. Coleções de conteúdo ficam em chaves "t:<teacherId>:<nome>",
// então uma função que recebe o teacherId só alcança os dados daquele professor.

let ready: Promise<void> | null = null;
let seeding = false;

async function db() {
  const d = getDriver();
  if (seeding) return d;
  if (!ready) {
    ready = (async () => {
      if (await d.setnx("meta:seeded", new Date().toISOString())) {
        seeding = true;
        try {
          const { seed } = await import("./seed");
          await seed();
        } finally {
          seeding = false;
        }
      }
    })();
  }
  await ready;
  return d;
}

/** Coleção global (sem escopo de professor). */
function globalCollection<T extends object>(key: string, idOf: (v: T) => string) {
  return {
    async all(): Promise<T[]> {
      const h = await (await db()).hgetall(key);
      return Object.values(h).map((v) => JSON.parse(v) as T);
    },
    async get(id: string): Promise<T | null> {
      const v = await (await db()).hget(key, id);
      return v ? (JSON.parse(v) as T) : null;
    },
    async put(value: T): Promise<T> {
      await (await db()).hset(key, idOf(value), JSON.stringify(value));
      return value;
    },
    async remove(id: string): Promise<void> {
      await (await db()).hdel(key, id);
    },
  };
}

/** Coleção com escopo de professor. */
function teacherCollection<T extends { id: string; teacherId: string }>(name: string) {
  const key = (teacherId: string) => {
    if (!teacherId) throw new Error("teacherId obrigatório");
    return `t:${teacherId}:${name}`;
  };
  return {
    async all(teacherId: string): Promise<T[]> {
      const h = await (await db()).hgetall(key(teacherId));
      return Object.values(h).map((v) => JSON.parse(v) as T);
    },
    async get(teacherId: string, id: string): Promise<T | null> {
      const v = await (await db()).hget(key(teacherId), id);
      return v ? (JSON.parse(v) as T) : null;
    },
    async put(value: T): Promise<T> {
      await (await db()).hset(key(value.teacherId), value.id, JSON.stringify(value));
      return value;
    },
    async remove(teacherId: string, id: string): Promise<void> {
      await (await db()).hdel(key(teacherId), id);
    },
  };
}

const usersCol = globalCollection<User>("users", (u) => u.id);
const teachersCol = globalCollection<Teacher>("teachers", (t) => t.id);

export const users = {
  ...usersCol,
  async byEmail(email: string): Promise<User | null> {
    const id = await (await db()).hget("users:email", email.trim().toLowerCase());
    return id ? usersCol.get(id) : null;
  },
  async create(user: User): Promise<User> {
    await (await db()).hset("users:email", user.email.toLowerCase(), user.id);
    return usersCol.put(user);
  },
  async delete(user: User): Promise<void> {
    await (await db()).hdel("users:email", user.email.toLowerCase());
    await usersCol.remove(user.id);
  },
  async changeEmail(user: User, newEmail: string): Promise<User> {
    const d = await db();
    await d.hdel("users:email", user.email.toLowerCase());
    await d.hset("users:email", newEmail.toLowerCase(), user.id);
    return usersCol.put({ ...user, email: newEmail.toLowerCase() });
  },
};

export const teachers = {
  ...teachersCol,
  async bySlug(slug: string): Promise<Teacher | null> {
    const id = await (await db()).hget("teachers:slug", slug.toLowerCase());
    return id ? teachersCol.get(id) : null;
  },
  async save(teacher: Teacher, previousSlug?: string): Promise<Teacher> {
    const d = await db();
    if (previousSlug && previousSlug !== teacher.slug) await d.hdel("teachers:slug", previousSlug);
    await d.hset("teachers:slug", teacher.slug, teacher.id);
    return teachersCol.put(teacher);
  },
};

export const invitations = globalCollection<Invitation>("invites", (i) => i.token);

export const students = teacherCollection<Student>("students");
export const classes = teacherCollection<ClassGroup>("classes");
export const passages = teacherCollection<Passage>("passages");
export const questions = teacherCollection<Question>("questions");
export const activities = teacherCollection<Activity>("activities");
export const assignments = teacherCollection<Assignment>("assignments");
export const submissions = teacherCollection<Submission>("submissions");
export const lessons = teacherCollection<Lesson>("lessons");

export const notifications = {
  async list(userId: string): Promise<AppNotification[]> {
    const h = await (await db()).hgetall(`n:${userId}`);
    return Object.values(h)
      .map((v) => JSON.parse(v) as AppNotification)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async put(n: AppNotification): Promise<void> {
    await (await db()).hset(`n:${n.userId}`, n.id, JSON.stringify(n));
  },
};

export const loginAttempts = {
  async get(email: string): Promise<{ count: number; first: number }> {
    const v = await (await db()).hget("login_attempts", email);
    return v ? JSON.parse(v) : { count: 0, first: 0 };
  },
  async set(email: string, value: { count: number; first: number }): Promise<void> {
    await (await db()).hset("login_attempts", email, JSON.stringify(value));
  },
  async clear(email: string): Promise<void> {
    await (await db()).hdel("login_attempts", email);
  },
};

export const meta = {
  async secret(): Promise<string> {
    const d = await db();
    const existing = await d.get("meta:secret");
    if (existing) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const fresh = Buffer.from(bytes).toString("base64url");
    await d.setnx("meta:secret", fresh);
    return (await d.get("meta:secret")) ?? fresh;
  },
  storageKind(): string {
    return getDriver().kind;
  },
};
