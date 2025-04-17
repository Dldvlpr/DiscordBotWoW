import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import ApplicationForm from "../models/applicationForm";

export class ApplicationFormRepository extends GenericRepository<ApplicationForm, string> {
    constructor() {
        super(ApplicationForm);
    }
}