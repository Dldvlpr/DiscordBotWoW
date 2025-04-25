import { Client, ActivityType } from 'discord.js';
import { Logger } from '../utils/Logger';

interface ResetInfo {
    nextReset: Date;
    timeLeft: string;
}

export class RaidResetService {
    private readonly client: Client;
    private readonly logger: Logger;
    private statusTimer: NodeJS.Timeout | null = null;
    private resetInfo: {
        '3D': ResetInfo;
        '5D': ResetInfo;
        '7D': ResetInfo;
    };
    private statusIndex: number = 0;

    constructor(client: Client) {
        this.client = client;
        this.logger = new Logger('RaidResetService');

        this.resetInfo = {
            '3D': {
                nextReset: this.calculateNextReset(3, new Date('2025-04-22T00:00:00Z')),
                timeLeft: ""
            },
            '5D': {
                nextReset: this.calculateNextReset(5, new Date('2025-04-28T03:00:00Z')),
                timeLeft: ""
            },
            '7D': {
                nextReset: this.calculateNextWednesdayReset(),
                timeLeft: ""
            }
        };

        this.updateAllTimers();
    }

    public start(): void {
        this.updateStatus();
        this.statusTimer = setInterval(() => {
            this.updateStatus();
        }, 30000);
    }

    public stop(): void {
        if (this.statusTimer) {
            clearInterval(this.statusTimer);
            this.statusTimer = null;
        }
    }

    private updateAllTimers(): void {
        const now = new Date();

        if (this.resetInfo['3d'].nextReset <= now) {
            this.resetInfo['3d'].nextReset = this.calculateNextReset(3, new Date('2025-04-22T00:00:00Z'));
        }
        this.resetInfo['3d'].timeLeft = this.formatTimeLeft(this.resetInfo['3d'].nextReset);

        if (this.resetInfo['5d'].nextReset <= now) {
            this.resetInfo['5d'].nextReset = this.calculateNextReset(5, new Date('2025-04-28T03:00:00Z'));
        }
        this.resetInfo['5d'].timeLeft = this.formatTimeLeft(this.resetInfo['5d'].nextReset);

        if (this.resetInfo['7d'].nextReset <= now) {
            this.resetInfo['7d'].nextReset = this.calculateNextWednesdayReset();
        }
        this.resetInfo['7d'].timeLeft = this.formatTimeLeft(this.resetInfo['7d'].nextReset);
    }

    private updateStatus(): void {
        try {
            this.updateAllTimers();

            const statusKeys = ['3d', '5d', '7d'];
            const currentKey = statusKeys[this.statusIndex];
            this.statusIndex = (this.statusIndex + 1) % statusKeys.length;

            this.client.user?.setActivity(`${currentKey.toUpperCase()}: ${this.resetInfo[currentKey].timeLeft}`, {
                type: ActivityType.Watching
            });

            this.logger.debug(`Statut mis à jour: ${currentKey.toUpperCase()}: ${this.resetInfo[currentKey].timeLeft}`);
        } catch (error) {
            this.logger.error('Erreur lors de la mise à jour du statut:', error);
        }
    }

    private calculateNextReset(days: number, baseDate: Date): Date {
        const now = new Date();

        const millisPerDay = 24 * 60 * 60 * 1000;
        const millisPerCycle = days * millisPerDay;
        const millisSinceBase = now.getTime() - baseDate.getTime();
        const completedCycles = Math.floor(millisSinceBase / millisPerCycle);

        const nextReset = new Date(baseDate.getTime() + (completedCycles + 1) * millisPerCycle);

        return nextReset;
    }

    private calculateNextWednesdayReset(): Date {
        const now = new Date();
        const result = new Date(now);

        result.setHours(3, 0, 0, 0);

        const dayOfWeek = result.getDay();
        let daysToAdd = (3 - dayOfWeek + 7) % 7;

        if (daysToAdd === 0 && now.getHours() >= 3) {
            daysToAdd = 7;
        }

        result.setDate(result.getDate() + daysToAdd);
        return result;
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

    public getResetInfo(): { "3D": ResetInfo; "5D": ResetInfo; "7D": ResetInfo } {
        this.updateAllTimers();
        return this.resetInfo;
    }
}