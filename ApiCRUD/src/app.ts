
import express, { type Application } from 'express';

export class App {
    private app: Application;
    private port = 0;
    constructor() {
        this.settings();
        this.app = express();
    }
    async listen() {
        await this.app.listen(this.port);
        console.log("escuchando en puerto"+this.port);

    }
    settings() {
        console.log(process.env.PORT);
        
        this.port = Number.parseInt(process.env.PORT ?? "3000");
    }
}
