export class CommandHandler {
    private commands: Map<string, Function>;

    constructor() {
        this.commands = new Map();
        this.loadCommands();
    }

    private loadCommands(): void {
        this.commands.set('ping', this.pingCommand);
    }

    private pingCommand(args: string[]): void {
        console.log('Pong!', args);
    }

    public handleCommand(command: string, args: string[]): void {
        const cmd = this.commands.get(command);
        if (cmd) {
            cmd(args);
        } else {
            console.log(`Commande inconnue: ${command}`);
        }
    }
}