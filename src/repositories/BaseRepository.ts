export interface BaseRepository<T, K> {
    findAll(options?: any): Promise<T[]>;
    findById(id: K): Promise<T | null>;
    create(data: any): Promise<T>;
    update(id: K, data: any): Promise<boolean>;
    delete(id: K): Promise<boolean>;
}