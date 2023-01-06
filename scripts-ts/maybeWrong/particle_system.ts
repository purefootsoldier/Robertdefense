abstract class ParticleSystem{
    origin:Array<number>;
    particles:Array<object>;
    constructor(x:number, y:number){
        this.origin = crateVector(x, y);
        this.particles = [];
    }

    addParticle() {
        this.particles.push(new Particle(this.origin, 1))
    }

    isDead() {
        return this.particles.length === 0;
    }

    run() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.run();

            if (p.isDead()) this.particles.splice(i, 1);
        }
    }
}

class RocketExplosion extends ParticleSystem implements vector{
    x: number;
    y: number;
    constructor(x:number, y:number) {
        super(x , y)
        this.x = x;
        this.y = y;
    }
    addParticle(): void {
        this.particles.push(new Fire(this.origin, 5));
    }
}
class bombExplosion extends ParticleSystem implements vector{
    x: number;
    y: number;
    constructor(x:number, y:number){
        super(x,y);
            this.x = x;
            this.y = y;
    }
    addParticle(): void {
        this.particles.push(new Bomb(this.origin, 2));
    }

}
class SharpnelExplosion extends ParticleSystem {
    x: number;
    y: number;
    constructor(x:number, y:number){
        super(x, y);
        this.x = x;
        this.y = y;
    }
    addParticle() {
        this.particles.push(new Shrapnel(this.origin, 5));
    }
}