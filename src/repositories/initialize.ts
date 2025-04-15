import { repositories } from './index';

export function initializeRepositories() {
    console.log('Repositories initialized');
    return repositories;
}

export { repositories };