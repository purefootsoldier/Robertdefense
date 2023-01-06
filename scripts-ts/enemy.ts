import { Vector } from "p5";
import {p5funcs} from "./sketch";
export interface IEntities{
name:string;
}
export abstract class EnemyBase implements IEntities{
    color: Array<number>;
    radius: number;

    alive: boolean;
    effects: Effect[];
    name: string;
    sound: string;

    pos: Vector;
    vel: Vector;

        cash: number;
        damage: number;
        health: number;
        immune: string[];           // no damage from these damage types
        resistant : string[];        // reduced damage from these damage types
        weak : string[];             // increased damage from these damage types
        speed: number;             // 4 is the max
        taunt: Boolean;

        maxHealth: number;

    constructor(x:number, y:number){

        this.color = [0,0,0];
        this.radius = 0.5;

        this.alive = true;
        this.effects = [];
        this.name = "enemy";
        this.sound = "pop";

        this.pos = p5funcs.createVector(x, y);
        this.vel = p5funcs.createVector(0, 0);
        
        // Stats
        this.cash = 0;
        this.damage = 1;
        this.health = 1;
        this.immune = [];           // no damage from these damage types
        this.resistant = [];        // reduced damage from these damage types
        this.weak = [];             // increased damage from these damage types
        this.speed = 1;             // 4 is the max
        this.taunt = false;
        this.maxHealth = 0;
    }
    applyEffect(name:string, duration:number):any{
        if (this.immune.includes(name)) return;
        if (getByName(this.effects, name).lenght > 0) return;
        var e = createEffect(duration, this.effects[name]);
        e.onStart(this);
        this.effects.push(e);
    }

    draw() {
        stroke(0);
        fill(this.getColor());
        ellipse(this.pos.x, this.pos.y, this.radius * ts, this.radius * ts);
    }

    dealDamage(amt:number, type:string) {
        var mult;
        if (this.immune.includes(type)) {
            mult = 0;
        } else if (this.resistant.includes(type)) {
            mult = 1 - resistance;
        } else if (this.weak.includes(type)) {
            mult = 1 + weakness;
        } else {
            mult = 1;
        }

        if (this.health > 0) this.health -= amt * mult;
        if (this.health <= 0) this.onKilled();
    }

    drawHealth() {
        var percent = 1 - this.health / this.maxHealth;
        if (percent === 0) return;
        
        push();
        translate(this.pos.x, this.pos.y);

        stroke(255);
        fill(207, 0, 15);
        var edge = 0.7 * ts / 2;
        var width = floor(edge * percent * 2);
        var top = 0.2 * ts;
        var height = 0.15 * ts;
        rect(-edge, top, edge * percent * 2, height);

        pop();
    }
    //------
    getColor() {
        var l = this.effects.length;
        if (l > 0) return this.effects[l - 1].color;
        return this.color;
    }

    isDead() {
        return !this.alive;
    }

    kill() {
        this.alive = false;
    }

    onCreate() {
        this.maxHealth = this.health;
    }

    onExit() {
        if (!godMode) health -= this.damage;
        this.kill();
    }

    onKilled() {
        if (this.alive) {
            cash += this.cash;
            this.kill();
            if (!muteSounds && sounds.hasOwnProperty(this.sound)) {
                sounds[this.sound].play();
            }
        }
    }

    onTick() {}

    // Return speed in pixels per tick
    // Adjusted to not be affected by zoom level
    pxSpeed() {
        return this.speed * ts / 24;
    }

    // Change direction based on pathfinding map
    steer() {
        var t = gridPos(this.pos.x, this.pos.y);
        if (outsideRect(t.x, t.y, 0, 0, cols, rows)) return;
        var dir = paths[t.x][t.y];
        if (atTileCenter(this.pos.x, this.pos.y, t.x, t.y)) {
            if (dir === null) return;
            // Adjust velocity
            var speed = this.pxSpeed();
            if (dir === 1) this.vel = createVector(-speed, 0);
            if (dir === 2) this.vel = createVector(0, -speed);
            if (dir === 3) this.vel = createVector(speed, 0);
            if (dir === 4) this.vel = createVector(0, speed);
        }
    }

    update() {
        // Apply status effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            let e = this.effects[i];
            e.update(this);

            if (e.isDead()) this.effects.splice(i, 1);
        }
        
        // Movement
        this.vel.limit(96 / ts);
        this.vel.limit(this.pxSpeed());
        this.pos.add(this.vel);
    }



}