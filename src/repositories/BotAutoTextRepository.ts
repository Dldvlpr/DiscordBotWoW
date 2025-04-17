import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import ApplicationForm from "../models/applicationForm";
import BotAutoText from "../models/botAutoText";

export class BotAutoTextRepository extends GenericRepository<BotAutoText, string> {
    constructor() {
        super(BotAutoText);
    }
}