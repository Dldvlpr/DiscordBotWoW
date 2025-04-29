import { Client } from 'discord.js';
import { Logger } from '../utils/Logger';

interface ResetInfo {
    nextReset: Date;
    timeLeft: string;
}

export class RaidResetService {
    private readonly client: Client;
    private readonly logger: Logger;
    private statusTimer: NodeJS.Timeout | null = null;
    private resetInfo3d: ResetInfo;
    private resetInfo5d: ResetInfo;
    private resetInfo7d: ResetInfo;
    private statusIndex: number = 0;

    constructor(client: Client) {
        this.client = client;
        this.logger = new Logger('RaidResetService');

        this.resetInfo3d = {
            nextReset: this.calculateNextReset(3, new Date('2025-04-22T03:00:00Z')),
            timeLeft: ""
        };

        this.resetInfo5d = {
            nextReset: this.calculateNextReset(5, new Date('2025-04-28T03:00:00Z')),
            timeLeft: ""
        };

        this.resetInfo7d = {
            nextReset: this.calculateNextWednesdayReset(),
            timeLeft: ""
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

        if (this.resetInfo3d.nextReset <= now) {
            this.resetInfo3d.nextReset = this.calculateNextReset(3, new Date('2025-04-22T03:00:00Z'));
        }
        this.resetInfo3d.timeLeft = this.formatTimeLeft(this.resetInfo3d.nextReset);

        if (this.resetInfo5d.nextReset <= now) {
            this.resetInfo5d.nextReset = this.calculateNextReset(5, new Date('2025-04-28T03:00:00Z'));
        }
        this.resetInfo5d.timeLeft = this.formatTimeLeft(this.resetInfo5d.nextReset);

        if (this.resetInfo7d.nextReset <= now) {
            this.resetInfo7d.nextReset = this.calculateNextWednesdayReset();
        }
        this.resetInfo7d.timeLeft = this.formatTimeLeft(this.resetInfo7d.nextReset);
    }

    private updateStatus(): void {
            this.updateAllTimers();

            const statusText = `3D: ${this.resetInfo3d.timeLeft} | 5D: ${this.resetInfo5d.timeLeft} | 7D: ${this.resetInfo7d.timeLeft}`;

            this.client.user?.setActivity(statusText, { type: 4 });
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

    public getResetInfo(): {
        '3d': ResetInfo;
        '5d': ResetInfo;
        '7d': ResetInfo;
    } {
        this.updateAllTimers();
        return {
            '3d': this.resetInfo3d,
            '5d': this.resetInfo5d,
            '7d': this.resetInfo7d
        };
    }
}