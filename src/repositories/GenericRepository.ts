import { Model, ModelStatic } from 'sequelize';
import { BaseRepository } from './BaseRepository';

export abstract class GenericRepository<T extends Model, K> implements BaseRepository<T, K> {
    protected model: ModelStatic<T>;

    constructor(model: ModelStatic<T>) {
        this.model = model;
    }

    async findAll(options?: any): Promise<T[]> {
        return this.model.findAll(options);
    }

    async findById(id: K): Promise<T | null> {
        return this.model.findByPk(id as any);
    }

    async create(data: any): Promise<T> {
        return this.model.create(data);
    }

    async update(id: K, data: any): Promise<boolean> {
        const [affectedRows] = await this.model.update(data, {
            where: { id: id as any }
        });
        return affectedRows > 0;
    }

    async delete(id: K): Promise<boolean> {
        const affectedRows = await this.model.destroy({
            where: { id: id as any }
        });
        return affectedRows > 0;
    }
}