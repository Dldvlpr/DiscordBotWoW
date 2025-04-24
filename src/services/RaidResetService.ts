import { Client } from 'discord.js';
import { Logger } from '../utils/Logger';

export class RaidResetService {
    private readonly client: Client;
    private readonly logger: Logger;
    private statusTimer: NodeJS.Timeout | null = null;
    private nextReset: Date;

    constructor(client: Client) {
        this.client = client;
        this.logger = new Logger('RaidResetService');
        this.nextReset = this.calculateNextReset(3);
    }

    public start(): void {
        this.updateStatus();
        this.statusTimer = setInterval(() => {
            this.updateStatus();
        }, 60000);
    }

    public stop(): void {
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
            this.statusTimer = null;
        }
    }

    private updateStatus(): void {
        try {
            const now = new Date();
            if (this.nextReset <= now) {
                this.nextReset = this.calculateNextReset(3);
            }

            const timeLeft = this.formatTimeLeft(this.nextReset);

            this.client.user?.setActivity(`Reset 3j: ${timeLeft}`, { type: 4 }); // Type 4 = Watching
            this.logger.debug(`Statut mis à jour: Reset 3j: ${timeLeft}`);
        } catch (error) {
            this.logger.error('Erreur lors de la mise à jour du statut:', error);
        }
    }

    private calculateNextReset(days: number): Date {
        const baseReset = new Date('2025-04-22T00:00:00Z');
        const now = new Date();

        const millisPerDay = 24 * 60 * 60 * 1000;
        const millisPerCycle = days * millisPerDay;
        const millisSinceBase = now.getTime() - baseReset.getTime();
        const completedCycles = Math.floor(millisSinceBase / millisPerCycle);

        const nextReset = new Date(baseReset.getTime() + (completedCycles + 1) * millisPerCycle);

        return nextReset;
    }

    private formatTimeLeft(date: Date): string {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();

        if (diffMs <= 0) {
            return "Maintenant!";
        }

        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

        if (days > 0) {
            return `${days}j ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    public getResetInfo(): { nextReset: Date; timeLeft: string } {
        return {
            nextReset: this.nextReset,
            timeLeft: this.formatTimeLeft(this.nextReset)
        };
    }
}