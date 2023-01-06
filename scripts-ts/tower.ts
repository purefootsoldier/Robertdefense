import { sketch } from "./sketch";
import p5, { Vector }  from "p5";
var p5funcs:p5 = new p5(sketch);
export class Tower{
    baseOnTop:boolean;
    border:Array<number>;
    color:Array<number>;
    drawLine:boolean;
    follow:boolean;
    hasBarrel:boolean;
    hasBase:boolean;
    length:number;
    radius:number;
    secondary:Array<number>;
    weight:number;
    width:number;

    alive:boolean;
    name:string;
    sound:any;
    title:string;

    angle:number;
    gridPos:Vector;
    pos:Vector;

    cooldownMax:number;
    cooldownMin:number;
    cost:number;
    damageMax:number;
    damageMin:number;
    range:number;
    totalCost:number;
    type:string;
    upgrades:Array<any>;
    constructor(col:number, row:number){
        // Display
        this.baseOnTop = true;      // render base over barrel
        this.border = [0, 0, 0];    // border color
        this.color = [0, 0, 0];     // main color
        this.drawLine = true;       // draw line to enemy on attack
        this.follow = true;         // follow target even when not firing
        this.hasBarrel = true;
        this.hasBase = true;
        this.length = 0.7;          // barrel length in tiles
        this.radius = 1;            // radius in tiles
        this.secondary = [0, 0, 0]; // secondary color
        this.weight = 2;            // laser stroke weight
        this.width = 0.3;           // barrel width in tiles

        // Misc
        this.alive = true;
        this.name = 'tower';
        this.sound = null;          // sound to play on fire
        this.title = 'Tower';

        // Position
        this.angle = 0;
        this.gridPos = p5funcs.createVector(col, row);
        this.pos = p5funcs.createVector(col*ts + ts/2, row*ts + ts/2);
        
        // Stats
        this.cooldownMax = 0;
        this.cooldownMin = 0;
        this.cost = 0;
        this.damageMax = 20;
        this.damageMin = 1;
        this.range = 3;
        this.totalCost = 0;
        this.type = 'physical';     // damage type
        this.upgrades = [];

    }
    attack(e:EnemyBase) {
        var damage = p5funcs.round(p5funcs.random(this.damageMin, this.damageMax));
        e.dealDamage(damage, this.type);
        if (!muteSounds && sounds.hasOwnProperty(this.sound)) {
            sounds[this.sound].play();
        }
        this.onHit(e);
    }

    // Check if cooldown is completed
    canFire() {
        return this.cd === 0;
    }

    draw() {
        // Draw turret base
        if (this.hasBase && !this.baseOnTop) this.drawBase();
        // Draw barrel
        if (this.hasBarrel) {
            p5funcs.push();
            p5funcs.translate(this.pos.x, this.pos.y);
            p5funcs.rotate(this.angle);
            this.drawBarrel();
            p5funcs.pop();
        }
        // Draw turret base
        if (this.hasBase && this.baseOnTop) this.drawBase();
    }

    // Draw barrel of tower (moveable part)
    drawBarrel() {
        p5funcs.stroke(this.border);
        p5funcs.fill(this.secondary);
        p5funcs.rect(0, -this.width * ts / 2, this.length * ts, this.width * ts);
    }

    // Draw base of tower (stationary part)
    drawBase() {
        p5funcs.stroke(this.border);
        p5funcs.fill(this.color);
        p5funcs.ellipse(this.pos.x, this.pos.y, this.radius * ts, this.radius * ts);
    }

    // Returns damage range
    getDamage() {
        return rangeText(this.damageMin, this.damageMax);
    }

    // Returns average cooldown in seconds
    getCooldown() {
        /*if (inCommanderRadious){
            return (this.cooldownMin + this.cooldownMax) / (120 * commanderFactor);
        }
        else{*/
        return (this.cooldownMin + this.cooldownMax) / 120;
        
    }

    kill() {
        this.alive = false;
    }

    isDead() {
        return !this.alive;
    }

    // Functionality once entity has been targeted
    onAim(e:EnemyBase) {
        if (this.canFire() || this.follow) this.aim(e.pos.x, e.pos.y);
        if (stopFiring) return;
        if (!this.canFire()) return;
        this.resetCooldown();
        this.attack(e);
        // Draw line to target
        if (!this.drawLine) return;
        p5funcs.stroke(this.color);
        p5funcs.strokeWeight(this.weight);
        p5funcs.line(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
        p5funcs.strokeWeight(1);
    }

    onCreate() {
        this.cd = 0;                // current cooldown left
    }

    onHit(e) {}

    resetCooldown() {
        var cooldown = round(random(this.cooldownMin, this.cooldownMax));
        this.cd = cooldown;
    }

    // Sell price
    sellPrice() {
        return p5funcs.floor(this.totalCost * sellConst);
    }

    // Target correct enemy
    target(entities:Array<Object>) {
        entities = this.visible(entities);
        if (entities.length === 0) return;
        var t = getTaunting(entities);
        if (t.length > 0) entities = t;
        var e = getFirst(entities);
        if (typeof e === 'undefined') return;
        this.onAim(e);
    }

    update() {
        if (this.cd > 0) this.cd--;
    }

    // Use template to set attributes
    upgrade(template:Object) {
        template = typeof template === 'undefined' ? {} : template;
        var keys = Object.keys(template);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this[key] = template[key];
        }
        if (template.cost) this.totalCost += template.cost;
    }

    // Returns array of visible entities out of passed array
    visible(entities:Array<Object>) {
        return getInRange(this.pos.x, this.pos.y, this.range, entities);
    }
}