import { Client } from 'discord.js';
import { Logger } from '../utils/Logger';

export abstract class BaseHandler {
    protected client: Client;
    protected logger: Logger;

    protected constructor(client: Client) {
        this.client = client;
        this.logger = new Logger(this.constructor.name);
    }

    abstract initialize(): Promise<void>;
}