class wave {
    coolDown:number;
    enemies:Array<enemyWave>;
    constructor (coolDown:number,...enemies:enemyWave[]) {
        this.coolDown = coolDown;
        this.enemies = enemies;
    }
}
class enemyWave{
    typeWave:Array<string>;
    enemyGroup:number;
    constructor (typeWave:Array<string>, enemyGroup:number){
        this.typeWave = typeWave;
        this.enemyGroup = enemyGroup;
    }
}