import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import ApplicationAnswer from "../models/applicationAnswer";

export class ApplicationAnswerRepository extends GenericRepository<ApplicationAnswer, string> {
    constructor() {
        super(ApplicationAnswer);
    }
}