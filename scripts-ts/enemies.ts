import { EnemyBase } from "./enemy";
function createEnemy(x:number, y:number, Ename: string): EnemyBase {
    var enemy: EnemyBase;
    switch (Ename) {
        case "weak": {
            enemy = new weak(x, y);
            break
        }
        case "strong": {
            enemy = new strong(x, y)
            break
        }
        case "fast": {
            enemy = new fast(x, y)
            break
        }
        case "strongFast": {
            enemy = new strongFast(x, y)
            break
        }
        case "medic": {
            enemy = new medic(x, y)
            break
        }
        case "stronger": {
            enemy = new stronger(x, y)
            break
        }
        case "faster": {
            enemy = new faster(x, y)
            break
        }
        case "tank": {
            enemy = new tank(x, y)
            break
        }
        case "taunt": {
            enemy = new taunt(x, y)
            break
        }
        case "spawner": {
            enemy = new spawner(x, y)
            break
        }
        default: {
            enemy = new weak(x, y);
        }
    }
    enemy.onCreate()
    return enemy;
}

interface IEnemy {
    color: Array<number>;
    name: string;
    cash: number;
    health: number;
}
interface vectorCoords {
    x: number
    y: number
}

class weak extends EnemyBase implements IEnemy {
    color: number[] = [189, 195, 199];
    name: string = 'weak';
    cash: number = 1;
    health: number = 35;
}
class strong extends EnemyBase implements IEnemy {
    color: number[] = [108, 122, 137];
    radious: number = 0.6;
    name: string = 'strong';
    cash: number = 1;
    health: number = 75;
}

class fast extends EnemyBase implements IEnemy {
    color: number[] = [61, 251, 255];
    name: string = 'fast';
    cash: number = 2;
    health: number = 75;
    speed: number = 2;
    draw = () => {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
    }
}

class strongFast extends EnemyBase implements IEnemy {
    color: number[] = [30, 139, 195];
    name: string = "stongFast";
    cash: number = 2;
    health: number = 135;
    speed: number = 2;
    draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = -0.8 * ts / 3;
    var front = back + 0.8 * ts;
    var side = ts / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
}
}

class medic extends EnemyBase implements IEnemy {
    color: number[] = [192, 57, 43];
    radious: number = 0.7;
    name: string = "medic";
    cash: number = 4;
    health: number = 375;
    immune: string[] = ["regen"];
    onTick() {
    var affected = getInRange(this.pos.x, this.pos.y, 2, enemies);
    for (var i = 0; i < affected.length; i++) {
        affected[i].applyEffect('regen', 1);
    }
}
}

class stronger extends EnemyBase implements IEnemy {
    color: number[] = [52, 73, 94];
    radious: number = 0.8;
    name: string = 'stronger';
    cash: number = 4;
    health: number = 375;
}
class faster extends EnemyBase implements IEnemy {
    color: number[] = [249, 105, 14];
    name: string = 'faster';
    cash: number = 4;
    health: number = 375;
    resistant: string[] = ["explosion"]
    speed: number = 3;
    override draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var back = -0.7 * ts / 3;
    var front = back + 0.7 * ts;
    var side = 0.9 * ts / 2;
    quad(back, -side, 0, 0, back, side, front, 0);

    pop();
}
}
class tank extends EnemyBase implements IEnemy {
    color: number[] = [30, 130, 76];
    radius: number = 1;
    name: string = 'tank';
    cash: number = 4;
    health: number = 750;
    immune: string[] = ["poison", "slow"];
    resistant: string[] = ["energy", "physical"];
    weak: string[] = ["explosion", "piercing"];
    draw = () => {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var front = this.radius * ts / 2;
    var side = 0.7 * ts / 2;
    var barrel = 0.15 * ts / 2;
    var length = 0.7 * ts;
    var curve = 0.2 * ts;
    rect(-front, -side, front * 2, side * 2, curve);
    fill(149, 165, 166);
    rect(0, -barrel, length, barrel * 2);
    ellipse(0, 0, 0.2 * ts * 2, 0.2 * ts * 2);

    pop();
}
}
class taunt extends EnemyBase implements IEnemy {
    color: number[] = [102, 51, 153];
    radius: number = 0.8;
    name: string = 'taunt';
    sound: string = 'taunt';
    cash: number = 8;
    health: number = 1500;
    immune: string[] = ["poison", "slow"]:
    resistant: string[] = ["energy", "physical"]
    taunt: boolean = true;

    draw = () =>{
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    stroke(0);
    fill(this.getColor());
    var edge = this.radius * ts / 2;
    rect(-edge, -edge, this.radius * ts, this.radius * ts);
    stroke(232, 126, 4);
    noFill();
    rect(-0.3 * ts, -0.3 * ts, 0.6 * ts, 0.6 * ts);
    rect(-0.2 * ts, -0.2 * ts, 0.4 * ts, 0.4 * ts);

    pop();
}
}

class spawner extends EnemyBase implements IEnemy {
    color: number[] = [244, 235, 66];
    radius: number = 0.7;
    name: string = 'spawner';
    cash: number = 10;
    health: number = 1150;
    onKilled() {
    if (this.alive) {
        cash += this.cash;
        this.kill();
        if (!muteSounds && sounds.hasOwnProperty(this.sound)) {
            sounds[this.sound].play();
        }

        // Add new temporary spawnpoint
        var c = gridPos(this.pos.x, this.pos.y);
        if (c.equals(exit)) return;
        for (var i = 0; i < tempSpawns.length; i++) {
            if (c.equals(tempSpawns[i][0])) return;
        }
        tempSpawns.push([createVector(c.x, c.y), tempSpawnCount]);
    }
}
};