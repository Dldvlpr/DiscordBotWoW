import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import PlayerApplication from "../models/playerApplication";

export class PlayerApplicationRepository extends GenericRepository<PlayerApplication, string> {
    constructor() {
        super(PlayerApplication);
    }
}