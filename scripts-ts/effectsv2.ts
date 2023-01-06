import {Effect} from "./effect"

function createEffect(duration:number,template:string):Effect{
    var effect:Effect;
    switch(template){
        case "slow":{
            effect = new slow(duration);
            break;
        }
        case "poison":{
            effect = new poison(duration);
            break;
        }
        case "regen" :{
            effect = new regen(duration);
            break;
        }
        default :{
            effect = new slow(duration);
        }
    }
    return effect;
}
interface IEffect{
    color: Array<number>;
    name: string;
}
class slow extends Effect implements IEffect{
    color = [68, 108, 79];
    name = "slow";
    onEnd(e){
        e.speed = this.oldSpeed;
    },
    onStart = function(e):EnemyBase {
        this.oldSpeed = e.speed;
        this.speed = e.speed / 2;
        e.speed = this.speed;
    }
}
class poison extends Effect implements IEffect{
    color = [102,204,26];
    name = "poison";
    onTick = function(e):unknown{
        e.dealDamage(1, "poison")
    }
}
class regen extends Effect implements IEffect{
    color = [210, 82, 127];
    name = "regen";
    onTick = function(e):unknown{
        if (e.health < e.maxHealth && random() < 0.2) e.health++;
    }
}
