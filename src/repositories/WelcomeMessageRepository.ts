import {Op, WhereOptions} from 'sequelize';
import { GenericRepository } from './GenericRepository';
import WelcomeMessage from "../models/welcomeMessage";

export class WelcomeMessageRepository extends GenericRepository<WelcomeMessage, string> {
    constructor() {
        super(WelcomeMessage);
    }
}