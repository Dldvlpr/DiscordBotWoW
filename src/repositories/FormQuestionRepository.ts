import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import FormQuestion from "../models/formQuestion";

export class FormQuestionRepository extends GenericRepository<FormQuestion, string> {
    constructor() {
        super(FormQuestion);
    }
}