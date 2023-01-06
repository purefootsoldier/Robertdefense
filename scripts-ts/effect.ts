import { IEntities } from "./enemy";


export abstract class Effect implements IEntities{
    color: Array<Number>;

    alive: boolean;
    duration: number;
    name: string;
    constructor(duration: number) {
        // Display
        this.color = [0, 0, 0];
        this.alive = true;
        this.duration = duration;
        this.name = "status";
    }
    isDead(): boolean {
        return !this.alive;
    }
    kill(): void {
        this.alive = false;
    }

    onEnd(e: object): void { }
    onStart(e: object): void { }
    onTick(e: object): void { }

    update(e: object) {
        this.onTick(e);
        if (this.duration > 0) this.duration--;
        if (this.duration === 0) {
            this.onEnd(e);
            this.kill();
        }
    }
}