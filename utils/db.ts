import { openDB } from 'idb';
import { Project } from '../types';

const DB_NAME = 'see-factory-db';
const STORE_NAME = 'projects';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveProject = async (project: Project) => {
  const db = await initDB();
  return db.put(STORE_NAME, project);
};

export const getProjects = async (): Promise<Project[]> => {
  const db = await initDB();
  // Reverse sort by creation time manually after fetch since getAll returns key order
  const projects = await db.getAll(STORE_NAME);
  return projects.sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteProject = async (id: string) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};