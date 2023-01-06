import { Tower } from "./tower";
import { vts , stv, copyArray, neighbors, randint ,mouseInMap, gridPos, buildArray, replaceArray, center, copyToClipboard, removeTempSpawns, outsideRect} from "./utils";
import p5, { Vector } from "p5";
import "p5/lib/addons/p5.sound"
import { createTower } from "./towers";
import LZString from "lz-string";
import { EnemyBase } from "./enemy";

export var ts:number = 24;   
export var dists:number[][];
export var tempSpawns:number[][] = [];
export const sketch = (p5:p5) => {
var enemies: [];
var projectiles:Array<Object> = [];
var systems:Array<SharpnelExplosion | RocketExplosion | bombExplosion> = [];
var towers:Array<Tower> = [];
var newEnemies:Array<string | number> = [];
var newProjectiles:Array<Object> = [];
var newTowers:Array<Tower> = [];

var cols:number = 0;
var rows:number = 0;
var tileZoom:number = 2;         // tile size
var zoomDefault:number = ts;

var particleAmt:number = 32;   // number of particles to draw per explosion

var tempSpawnCount:number = 40;

var custom:any ;             // custom map JSON
var display:unknown = {};            // graphical display tiles
var displayDir:number[][];         // direction display tiles are facing
                         // (0 = none, 1 = left, 2 = up, 3 = right, 4 = down)              // distance to exit
var grid:Array<any> = [];               // tile type
                         // (0 = empty, 1 = wall, 2 = path, 3 = tower,
                         //  4 = enemy-only pathing)
var metadata:unknown = {};           // tile metadata
var paths:number[][] = [];              // direction to reach exit
var visitMap: Array<number> = [];           // whether exit can be reached
var walkMap: any;            // walkability map

var exit:p5.Vector;
var spawnpoints:Array<p5.Vector> = [];


var cash:number = 0;
var health:number = 0;
var maxHealth:number = 0;
var currentWave:number = 0;

var spawnCool:number = 0;          // number of ticks between spawning enemies

var bg: Array<number> = [];                 // background color
var border:number;             // color to draw on tile borders
var borderAlpha:number;        // alpha of tile borders

var selected: Tower | null;
var towerType:string | Tower;

var sounds:any = {};             // dict of all sounds
var boomSound:any = {};          // explosion sound effect

// TODO add more functionality to god mode
var godMode:boolean = false;    // make player immortal for test purposes
var healthBar:boolean = true;   // display enemy health bar
var muteSounds:boolean = false; // whether to mute sounds
var paused:boolean = false;             // whether to update or not
var randomWaves:boolean = true; // whether to do random or custom waves
var scd:number;                // number of ticks until next spawn cycle
var showEffects:boolean = true; // whether or not to display particle effects
var showFPS:boolean = false;    // whether or not to display FPS
var skipToNext:boolean = false; // whether or not to immediately start next currentWave
var stopFiring:boolean = false; // whether or not to pause towers firing
var toCooldown:boolean = true;         // flag to reset spawning cooldown
var toPathfind:boolean = false;         // flag to update enemy pathfinding
var toPlace:boolean = true;            // flag to place a tower
var toWait:boolean;             // flag to wait before next currentWave
var wcd:number;                // number of ticks until next currentWave

var avgFPS:number = 0;         // current average of all FPS values
var numFPS:number = 0;         // number of FPS values calculated so far

var minDist:number = 15;       // minimum distance between spawnpoint and exit
var resistance:number = 0.5;   // percentage of damage blocked by resistance
var sellConst:number = 0.8;    // ratio of tower cost to sell price
var wallCover:number = 0.1;    // percentage of map covered by walls
var waveCool:number = 120;     // number of ticks between waves
var weakness:number = 0.5;
//problema aqui que afecta a la funcion en la linea 96
function addGroup(group:enemyWave) {
    var count = group.enemyGroup;
    //negacion para verificar que no sea undefined
    if (count != undefined){
        for (var i = 0; i < count; i++) {
            for (var j = 0; j < group.typeWave.length; j++) {
                newEnemies.push(group.typeWave[j]);
            }
        }
    }
}

function addWave(pattern: wave ) {
    spawnCool = pattern.coolDown;
    for (var i = 0; i < pattern.enemies.length; i++) {
        addGroup(pattern.enemies[i]);
    }

}
function buy(t:Tower) {
    if (godMode || cash >= t.cost) {
        if (!godMode) {
            cash -= t.cost;
            toPlace = false;
        }
        selected = t;
        if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
        updateInfo(t);
        newTowers.push(t);
    }
}
function calcFPS() {
    var fps = p5.frameRate();
    avgFPS += (fps - avgFPS) / ++numFPS;

    // Draw black rect under text
    p5.noStroke();
    p5.fill(0);
    p5.rect(0, p5.height - 40, 70, 40);

    // Update FPS meter
    p5.fill(255);
    var fpsText = 'FPS: ' + fps.toFixed(2) + '\nAvg: ' + avgFPS.toFixed(2);
    p5.text(fpsText, 5, p5.height - 25);
}
function canPlace(col:number, row:number) {
    if (!toPlace) return false;
    var g = grid[col][row];
    if (g === 3) return true;
    if (g === 1 || g === 2 || g === 4) return false;
    if (!empty(col, row) || !placeable(col, row)) return false;
    return true;
}
function canSpawn() {
    return newEnemies.length > 0 && scd === 0;
}
function clearInfo() {
    const infodiv = document.getElementById('info-div')
    if (infodiv != null){
        infodiv.style.display = 'none';
    }
}

function customWave() {}

function doRange() {
    return mouseInMap() && toPlace && typeof towerType !== 'undefined';
}
function empty(col:number, row:number) {
    // Check if not walkable
    if (!walkable(col, row)) return false;

    // Check if spawnpoint
    for (var i = 0; i < spawnpoints.length; i++) {
        var s = spawnpoints[i];
        if (s.x === col && s.y === row) return false;
    }

    // Check if exit
    if (typeof exit !== 'undefined') {
        if (exit.x === col && exit.y === row) return false;
    }
    
    return true;
}

function exportMap() {
    // Convert spawnpoints into a JSON-friendly format
    var spawns = [];
    for (var i = 0; i < spawnpoints.length; i++) {
        var s = spawnpoints[i];
        spawns.push([s.x, s.y]);
    }
    return LZString.compressToBase64(JSON.stringify({
        // Grids
        display: display,
        displayDir: displayDir,
        grid: grid,
        metadata: metadata,
        paths: paths,
        // Important tiles
        exit: [exit.x, exit.y],
        spawnpoints: spawns,
        // Colors
        bg: bg,
        border: border,
        borderAlpha: borderAlpha,
        // Misc
        cols: cols,
        rows: rows
    }));
}

function getEmpty() {
    while (true) {
        var t = randomTile();
        if (empty(t.x, t.y)) return t;
    }
}

function getTower(col:number, row:number) {
    for (var i = 0; i < towers.length; i++) {
        var t = towers[i];
        if (t.gridPos.x === col && t.gridPos.y === row) return t;
    }
    return null;
}

function getVisitMap(walkMap:number[][]) {
    var frontier = [];
    var target = vts(exit);
    frontier.push(target);
    var visited:any = {};
    visited[target] = true;

    // Fill visited for every tile
    while (frontier.length !== 0){
        var current:string | undefined = frontier.shift();
        if (current != undefined){
            //--------no se si este bien
        var t = stv(current);
        var adj = neighbors(walkMap, t.x, t.y, true);

        for (var i = 0; i < adj.length; i++) {
            var next = adj[i];
            if (!(next in visited)) {
                frontier.push(next);
                visited[next] = true;
            }
        }
        }
    }
    return visited;
}

function getWalkMap() {
    var walkMap:Array<any> = [];
    for (var x = 0; x < cols; x++) {
        walkMap[x] = [];
        for (var y = 0; y < rows; y++) {
            walkMap[x][y] = walkable(x, y);
        }
    }
    return walkMap;
}
//JSON
function importMap(str:string) {
    try {
        var customCheck = LZString.decompressFromBase64(str)
        if (customCheck != null){
            custom = JSON.parse(customCheck);
        }
        const customOptioncheck = document.getElementById('custom');
        if (customOptioncheck != null){
            customOptioncheck.setAttribute("selected","selected");
        }
        resetGame();
    } catch (err) {}
}

function isWave(min:number, max?:number) {
    if (typeof max === 'undefined') return currentWave >= min;
    return currentWave >= min && currentWave < max;
}

function loadMap() {
    //????

    var selector:HTMLSelectElement | null = document.getElementById('map') as HTMLSelectElement;
    var name:string = "";
    if (selector != null){
        name = selector.value;
    }

    health = 40;
    cash = 55;
    //custom que es?
    if (name === 'custom' && custom) {
        // Grids
        display = copyArray(custom.display);
        displayDir = copyArray(custom.displayDir);
        grid = copyArray(custom.grid);
        metadata = copyArray(custom.metadata);
        paths = copyArray(custom.paths);
        // Important tiles
        exit = p5.createVector(custom.exit[0], custom.exit[1]);
        spawnpoints = [];
        for (var i = 0; i < custom.spawnpoints.length; i++) {
            var s = custom.spawnpoints[i];
            spawnpoints.push(p5.createVector(s[0], s[1]));
        }
        // Colors
        bg = custom.bg;
        border = custom.border;
        borderAlpha = custom.borderAlpha;
        // Misc
        cols = custom.cols;
        rows = custom.rows;

        resizeFit();
    } else if (name in maps) {
        var m = maps[name];

        // Grids
        display = copyArray(m.display);
        displayDir = copyArray(m.displayDir);
        grid = copyArray(m.grid);
        metadata = copyArray(m.metadata);
        paths = copyArray(m.paths);
        // Important tiles
        exit = p5.createVector(m.exit[0], m.exit[1]);
        spawnpoints = [];
        for (var i = 0; i < m.spawnpoints.length; i++) {
            var s = m.spawnpoints[i];
            spawnpoints.push(p5.createVector(s[0], s[1]));
        }
        // Colors
        bg = m.bg;
        border = m.border;
        borderAlpha = m.borderAlpha;
        // Misc
        cols = m.cols;
        rows = m.rows;

        resizeFit();
    } else {
        resizeMax();
        var numSpawns;
        wallCover = 0.1;
        if (name[name.length - 1] === '3') {
            cash = 65;
            numSpawns = 3;
        } else {
            numSpawns = 2;
        }
        if (name === 'empty2' || name === 'empty3') {
            wallCover = 0;
        }
        if (name === 'sparse2' || name === 'sparse3') {
            wallCover = 0.1;
        }
        if (name === 'dense2' || name === 'dense3') {
            wallCover = 0.2;
        }
        if (name === 'solid2' || name === 'solid3') {
            wallCover = 0.3;
        }
        randomMap(numSpawns);
        display = replaceArray(
            grid, [0, 1, 2, 3, 4], ['empty', 'wall', 'empty', 'tower', 'empty']
        );
        displayDir = buildArray(cols, rows, 0);
        // Colors
        bg = [0, 0, 0];
        border = 255;
        borderAlpha = 31;
        // Misc
        metadata = buildArray(cols, rows, null);
    }

    tempSpawns = [];

    recalculate();
}
function loadSounds() {
    //se necesita p5.sound.
    sounds = {};
    //commander CTA
    sounds.callTA = p5funcs.loadSound('sounds/CTA.wav');
    sounds.callTA.setVolume(0.3);
    // Missile explosion
    sounds.boom = p5funcs.loadSound('sounds/boom.wav');
    sounds.boom.setVolume(0.3);

    // Missile launch
    sounds.missile = p5funcs.loadSound('sounds/missile.wav');
    sounds.missile.setVolume(0.3);

    // Enemy death
    sounds.pop = p5funcs.loadSound('sounds/pop.wav');
    sounds.pop.setVolume(0.4);

    // Railgun
    sounds.railgun = p5funcs.loadSound('sounds/railgun.wav');
    sounds.railgun.setVolume(0.3);

    // Sniper rifle shot
    sounds.sniper = p5funcs.loadSound('sounds/sniper.wav');
    sounds.sniper.setVolume(0.2);

    // Tesla coil
    sounds.spark = p5funcs.loadSound('sounds/spark.wav');
    sounds.spark.setVolume(0.3);

    // Taunt enemy death
    sounds.taunt = p5funcs.loadSound('sounds/taunt.wav');
    sounds.taunt.setVolume(0.3);
}
function nextWave() {
    addWave(randomWaves ? randomWave() : customWave());
    currentWave++;
}
function noMoreEnemies() {
    return enemies.length === 0 && newEnemies.length === 0;
}

function outsideMap(e:EnemyBase) {
    return outsideRect(e.pos.x, e.pos.y, 0, 0, p5.width, p5.height);
}

function pause(){
    paused = !paused;
}

function placeable(col:number, row:number) {
    var walkMap = getWalkMap();
    walkMap[col][row] = false;
    var visitMap = getVisitMap(walkMap);

    for(var i = 0; i < spawnpoints.length; i++) {
        if (!visitMap[vts(spawnpoints[i])]) return false;
    }

    for (var i = 0; i < enemies.length; i++) {
        var e:EnemyBase = enemies[i];
        var p = gridPos(e.pos.x, e.pos.y);
        if (p.equals(col, row)) continue;
        if (!visitMap[vts(p)]) return false;
    }
    return true;
};
function randomMap(numSpawns:number) {
    // Generate empty tiles and walls
    grid = [];
    for (var x = 0; x < cols; x++) {
        grid[x] = [];
        for (var y = 0; y < rows; y++) {
            grid[x][y] = p5.random() < wallCover ? 1 : 0;
        }
    }
    walkMap = getWalkMap();

    // Generate exit and remove walls that are adjacent
    exit = getEmpty();
    var adj = neighbors(walkMap, exit.x, exit.y, false);
    for (var i = 0; i < adj.length; i++) {
        var n = stv(adj[i]);
        grid[n.x][n.y] = 0;
    }

    spawnpoints = [];
    visitMap = getVisitMap(walkMap);
    for (var i = 0; i < numSpawns; i++) {
        var s:p5.Vector;
        // Try to place spawnpoint
        for (var j = 0; j < 100; j++) {
            s = getEmpty();
            while (!visitMap[vts(s)]) s = getEmpty();
            if (s.dist(exit) >= minDist) break;
        }
        spawnpoints.push(s);
    }

}

function randomTile() {
    return p5.createVector(randint(cols), randint(rows));
}
function randomWave() {
    var waves:Array<wave> = [];

    if (isWave(0, 3)) {
        waves.push(new wave(40, new enemyWave(['weak',"tank","medic"],60)));
    }

    /*if (isWave(0, 3)) {
        waves.push([40, ['weak', 50]]);
    }*/
    if (isWave(2, 4)) {
        waves.push(new wave(20, new enemyWave(['weak'],25)));
    }
    if (isWave(2, 7)) {
        waves.push(new wave(30, new enemyWave(['weak'],25), new enemyWave(['strong'], 25)));
        waves.push(new wave(20, new enemyWave(['strong'],25)));
    }
    if (isWave(3, 7)) {
        waves.push(new wave(40, new enemyWave(['fast'], 25)));
    }
    if (isWave(4, 14)) {
        waves.push(new wave(20, new enemyWave(['fast'], 50)));
    }
    if (isWave(5, 6)) {
        waves.push(new wave(20, new enemyWave(['strong'], 50), new enemyWave(['fast'], 25)));
    }
    if (isWave(8, 12)) {
        waves.push(new wave(20, new enemyWave(['medic', 'strong', 'strong'],25)));
    }
    if (isWave(10, 13)) {
        waves.push(new wave(20, new enemyWave(['medic', 'strong', 'strong'], 50)));
        waves.push(new wave(30, new enemyWave(['medic', 'strong', 'strong'],50), new enemyWave (['fast'],50)));
        waves.push(new wave(5, new enemyWave(['fast'],50)));
    }
    if (isWave(12, 16)) {
        waves.push(new wave(20, new enemyWave(['medic', 'strong', 'strong'],50), new enemyWave (['strongFast'],50)));
        waves.push(new wave(10, new enemyWave(['strong'],50), new enemyWave(['strongFast'],50)));
        waves.push(new wave(10, new enemyWave(['medic', 'strongFast'],50)));
        waves.push(new wave(10, new enemyWave(['strong'],25), new enemyWave (['stronger'],25), new enemyWave (['strongFast'],50)));
        waves.push(new wave(10, new enemyWave(['strong'],25), new enemyWave(['medic'],25), new enemyWave(['strongFast'],25)));
        waves.push(new wave(20, new enemyWave(['medic', 'stronger', 'stronger'],50)));
        waves.push(new wave(10, new enemyWave(['medic', 'stronger', 'strong'],50)));
        waves.push(new wave(10, new enemyWave(['medic', 'strong'],50), new enemyWave(['medic', 'strongFast'],50)));
        waves.push(new wave(5,  new enemyWave(['strongFast'],100)));
        waves.push(new wave(20, new enemyWave(['stronger'],50)));
    }
    if (isWave(13, 20)) {
        waves.push(new wave(40, new enemyWave(['tank', 'stronger', 'stronger', 'stronger'],10)));
        waves.push(new wave(10, new enemyWave(['medic', 'stronger', 'stronger'],50)));
        waves.push(new wave(40, new enemyWave(['tank'],25)));
        waves.push(new wave(20, new enemyWave(['tank', 'stronger', 'stronger'],50)));
        waves.push(new wave(20, new enemyWave(['tank', 'medic'],50), new enemyWave(['strongFast'],25)));
    }
    if (isWave(14, 20)) {
        waves.push(new wave(20, new enemyWave(['tank', 'stronger', 'stronger'],50)));
        waves.push(new wave(20, new enemyWave(['tank', 'medic', 'medic'],50)));
        waves.push(new wave(20, new enemyWave(['tank', 'medic'],50), new enemyWave(['strongFast'],25)));
        waves.push(new wave(10, new enemyWave(['tank'],50), new enemyWave(['strongFast'],25)));
        waves.push(new wave(10, new enemyWave(['faster'],50)));
        waves.push(new wave(20, new enemyWave(['tank'],50), new enemyWave(['faster'],25)));
    }
    if (isWave(17, 25)) {
        waves.push(new wave(20, new enemyWave(['taunt', 'stronger', 'stronger', 'stronger'],25)));
        waves.push(new wave(20, new enemyWave(['spawner', 'stronger', 'stronger', 'stronger'],25)));
        waves.push(new wave(20, new enemyWave(['taunt', 'tank', 'tank', 'tank'], 25)));
        waves.push(new wave(40, new enemyWave(['taunt', 'tank', 'tank', 'tank'], 25)));
    }
    if (isWave(19)) {
        waves.push(new wave(20, new enemyWave(['spawner'],1), new enemyWave(['tank'],20), new enemyWave(['stronger'],25)));
        waves.push(new wave(20, new enemyWave(['spawner'],1), new enemyWave(['faster'],25)));
    }
    if (isWave(23)) {
        waves.push(new wave(20, new enemyWave(['taunt', 'medic', 'tank'],25)));
        waves.push(new wave(20, new enemyWave(['spawner'],2), new enemyWave(['taunt', 'medic', 'tank'],25)));
        waves.push(new wave(10, new enemyWave(['spawner'],1), new enemyWave(['faster'],100)));
        waves.push(new wave(5,  new enemyWave(['faster'],100)));
        waves.push(new wave(20, new enemyWave(['tank'],100), new enemyWave(['faster'],50),new enemyWave(['taunt', 'tank', 'tank', 'tank'],50)));
        waves.push(new wave(10, new enemyWave(['taunt', 'stronger', 'tank', 'stronger'],50),new enemyWave(['faster'],50)));
    }
    if (isWave(25)) {
        waves.push(new wave(5, new enemyWave(['taunt', 'medic', 'tank'],50), new enemyWave(['faster'],50)));
        waves.push(new wave(5, new enemyWave(['taunt', 'faster', 'faster', 'faster'],50)));
        waves.push(new wave(10, new enemyWave(['taunt', 'tank', 'tank', 'tank'],50), new enemyWave(['faster'],50)));
    }
    if (isWave(30)) {
        waves.push(new wave(5, new enemyWave(['taunt', 'faster', 'faster', 'faster'],50)));
        waves.push(new wave(5, new enemyWave(['taunt', 'tank', 'tank', 'tank'],50)));
        waves.push(new wave(5, new enemyWave(['taunt', 'medic', 'tank', 'tank'],50)));
        waves.push(new wave(1, new enemyWave(['faster'],200)));
    }
    if (isWave(35)) {
        waves.push(new wave(0, new enemyWave(['taunt', 'faster'],200)));
    }

    return p5.random(waves);
}

function recalculate() {
    walkMap = getWalkMap();
    var frontier = [];
    var target:any = vts(exit);
    frontier.push(target);
    var cameFrom:any = {};
    var distance:any = {};
    cameFrom[target] = null;
    distance[target] = 0;

    // Fill cameFrom and distance for every tile
    while (frontier.length !== 0) {
        //es type any por que se redeclara
        var current:any = frontier.shift();
        if (current != undefined){
            var t = stv(current);
            var adj = neighbors(walkMap, t.x, t.y, true);
            for (var i = 0; i < adj.length; i++) {
                var next = adj[i];
                if (!(next in cameFrom) || !(next in distance)) {
                    frontier.push(next);
                    cameFrom[next] = current;
                    distance[next] = distance[current] + 1;
                }
            }
        }
    }

    // Generate usable maps
    dists = buildArray(cols, rows, null);
    var newPaths = buildArray(cols, rows, 0);
    var keys = Object.keys(cameFrom);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var current:any = stv(key);

        // Distance map
        dists[current.x][current.y] = distance[key];

        // Generate path direction for every tile
        var val = cameFrom[key];
        if (val !== null) {
            // Subtract vectors to determine direction
            var next = stv(val);
            var dir = next.sub(current);
            // Fill tile with direction
            if (dir.x < 0) newPaths[current.x][current.y] = 1;
            if (dir.y < 0) newPaths[current.x][current.y] = 2;
            if (dir.x > 0) newPaths[current.x][current.y] = 3;
            if (dir.y > 0) newPaths[current.x][current.y] = 4;
        }
    }
    // Preserve old paths on path tiles
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            if (grid[x][y] === 2) newPaths[x][y] = paths[x][y];
        }
    }

    paths = newPaths;
}

function resetGame() {
    loadMap();
    // Clear all entities
    enemies = [];
    projectiles = [];
    systems = [];
    towers = [];
    newEnemies = [];
    newProjectiles = [];
    newTowers = [];
    // Reset all stats
    health = 40;
    maxHealth = health;
    currentWave = 0;
    // Reset all flags
    paused = true;
    scd = 0;
    toCooldown = false;
    toPathfind = false;
    toPlace = false;
    // Start game
    nextWave();
}

function resizeFit() {
    var div = document.getElementById('sketch-holder');
    if (div != null){
    var ts1 = p5.floor(div.offsetWidth / cols);
    var ts2 = p5.floor(div.offsetHeight / rows);
    ts = Math.min(ts1, ts2);
    p5.resizeCanvas(cols * ts, rows * ts, true);
    }
}

function resizeMax() {
    var div = document.getElementById('sketch-holder');
    if (div != null){
    cols = p5.floor(div.offsetWidth / ts);
    rows = p5.floor(div.offsetHeight / ts);
    p5.resizeCanvas(cols * ts, rows * ts, true);
    }
}

function sell(t:Tower) {
    selected = null;
    if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
    clearInfo();
    cash += t.sellPrice();
    t.kill();
}

function setPlace(t:string) {
    towerType = t;
    toPlace = true;
    updateInfo(createTower(0, 0, tower[towerType]));
}
function showRange(t:Tower, cx:Vector, cy:Vector) {
    p5.stroke(255);
    p5.fill(t.color[0], t.color[1], t.color[2], 63);
    var r = (t.range + 0.5) * ts * 2;
    p5.ellipse(cx, cy, r, r);
}

function updateInfo(t:Tower) {
    var name = document.getElementById('name');
    if (name != null){
        name.innerHTML = '<span style="color:rgb(' + t.color + ')">' + t.title +
    '</span>';
    }

    const checkcost = document.getElementById('cost')
    if (checkcost != null){
        checkcost.innerHTML = 'Cost: $' + t.totalCost;
    }

    const checksellPrice = document.getElementById('sellPrice');
    if (checksellPrice != null)
    {
        checksellPrice.innerHTML = 'Sell price: $' +
        t.sellPrice();
    }

    const checkupPrice = document.getElementById('upPrice');
    if (checkupPrice != null){
        checkupPrice.innerHTML = 'Upgrade price: ' +
        (t.upgrades.length > 0 ? '$' + t.upgrades[0].cost : 'N/A');
    }

    const checkdamage = document.getElementById('damage');
    if (checkdamage != null){
        checkdamage.innerHTML = 'Damage: ' + t.getDamage();
    }

    const checktype = document.getElementById('type');
    if (checktype != null){
        checktype.innerHTML = 'Type: ' +
        t.type.toUpperCase();
    }

    const checkrange = document.getElementById('range');
    if (checkrange != null){
        checkrange.innerHTML = 'Range: ' + t.range;
    }

    const checkcooldown = document.getElementById('cooldown');
    if (checkcooldown != null){
        checkcooldown.innerHTML = 'Avg. Cooldown: ' +
        t.getCooldown().toFixed(2) + 's';
    }

    var buttons = document.getElementById('info-buttons');
    if (buttons != null){
        buttons.style.display = toPlace ? 'none' : 'flex';
    }

    const checkinfodiv = document.getElementById('info-div')
    if (checkinfodiv != null){
        checkinfodiv.style.display = 'block';
    }
}

function updatePause() {
    const checkpause = document.getElementById("pause")
    if (checkpause != null){
        checkpause.innerHTML = paused ? 'Start' : 'Pause';
    }
}

function updateStatus() {
    const checkwave = document.getElementById('wave');
    if (checkwave != null){
        checkwave.innerHTML = 'Wave ' + currentWave;
    }

    const checkhealth = document.getElementById('health')
    if (checkhealth != null){
        checkhealth.innerHTML = 'Health: ' +
        health + '/' + maxHealth;
    }
    const checkcash = document.getElementById('cash');
    if (checkcash != null){
        checkcash.innerHTML = '$' + cash;
    }
}

function upgrade(t:Tower) {
    if (godMode || cash >= t.cost) {
        if (!godMode) cash -= t.cost;
        if (selected != null){
        selected.upgrade(t);
        selected.upgrades = t.upgrades ? t.upgrades : [];
        updateInfo(selected);
        }
    }
}

// Return whether tile is walkable
function walkable(col:number, row:number) {
    // Check if wall or tower-only tile
    if (grid[col][row] === 1 || grid[col][row] === 3) return false;
    // Check if tower
    if (getTower(col, row)) return false;
    return true;
}

p5.preload = () => {
    loadSounds();
};


p5.setup = () => {
    var div:HTMLElement | null = document.getElementById('sketch-holder');
    if (div != null){
        var canvas = p5.createCanvas(div.offsetWidth, div.offsetHeight);
        canvas.parent('sketch-holder');
        resetGame();
    }
}

// TODO show range of selected tower
p5.draw = () => {
    p5.background(bg);

    // Update game status
    updatePause();
    updateStatus();

    // Update spawn and currentWave cooldown
    if (!paused) {
        if (scd > 0) scd--;
        if (wcd > 0 && toWait) wcd--;
    }

    // Draw basic tiles
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            var t = tiles[display[x][y]];
            if (typeof t === 'function') {
                t(x, y, displayDir[x][y]);
            } else {
                p5.stroke(border, borderAlpha);
                t ? p5.fill(t) : p5.noFill();
                p5.rect(x * ts, y * ts, ts, ts);
            }
        }
    }

    // Draw spawnpoints
    for (var i = 0; i < spawnpoints.length; i++) {
        p5.stroke(255);
        p5.fill(0, 230, 64);
        var s = spawnpoints[i];
        p5.rect(s.x * ts, s.y * ts, ts, ts);
    }

    // Draw exit
    p5.stroke(255);
    p5.fill(207, 0, 15);
    p5.rect(exit.x * ts, exit.y * ts, ts, ts);

    // Draw temporary spawnpoints
    for (var i = 0; i < tempSpawns.length; i++) {
        p5.stroke(255);
        p5.fill(155, 32, 141);
        var s = tempSpawns[i][0];
        p5.rect(s.x * ts, s.y * ts, ts, ts);
    }

    // Spawn enemies
    if (canSpawn() && !paused) {
        // Spawn same enemy for each spawnpoint
        var name = newEnemies.shift();
        for (var i = 0; i < spawnpoints.length; i++) {
            var s = spawnpoints[i];
            var c = center(s.x, s.y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Temporary spawnpoints
        for (var i = 0; i < tempSpawns.length; i++) {
            var s = tempSpawns[i];
            if (s[1] === 0) continue;
            s[1]--;
            var c = center(s[0].x, s[0].y);
            enemies.push(createEnemy(c.x, c.y, enemy[name]));
        }

        // Reset cooldown
        toCooldown = true;
    }

    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e:EnemyBase = enemies[i];

        // Update direction and position
        if (!paused) {
            e.steer();
            e.update();
            e.onTick();
        }

        // Kill if outside map
        if (outsideMap(e)) e.kill();

        // If at exit tile, kill and reduce player health
        if (atTileCenter(e.pos.x, e.pos.y, exit.x, exit.y)) e.onExit();

        // Draw
        e.draw();

        if (e.isDead()) enemies.splice(i, 1);
    }

    // Draw health bars
    if (healthBar) {
        for (var i = 0; i < enemies.length; i++) {
            enemies[i].drawHealth();
        }
    }

    // Update and draw towers
    for (let i = towers.length - 1; i >= 0; i--) {
        let t = towers[i];

        // Target enemies and update cooldowns
        if (!paused) {
            /*if (tower == ){
                t.target(towers);   
               }
               else{*/
                 t.target(enemies)    
            t.update();
        }

        // Kill if outside map
        if (outsideMap(t)) t.kill();

        // Draw
        t.draw();

        if (t.isDead()) towers.splice(i, 1);
    }

    // Update and draw particle systems
    for (let i = systems.length - 1; i >= 0; i--) {
        let ps = systems[i];
        ps.run();
        if (ps.isDead()) systems.splice(i, 1);
    }

    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];

        if (!paused) {
            p.steer();
            p.update();
        }

        // Attack target
        if (p.reachedTarget()) p.explode()

        // Kill if outside map
        if (outsideMap(p)) p.kill();

        p.draw();

        if (p.isDead()) projectiles.splice(i, 1);
    }

    // Draw range of tower being placed
    if (doRange()) {
        var p = gridPos(p5.mouseX, p5.mouseY);
        var c = center(p.x, p.y);
        var t = createTower(0, 0, tower[towerType]);
        showRange(t, c.x, c.y);

        // Draw a red X if tower cannot be placed
        if (!canPlace(p.x, p.y)) {
            p5.push();
            p5.translate(c.x, c.y);
            p5.rotate(p5.PI / 4);

            // Draw a red X
            p5.noStroke();
            p5.fill(207, 0, 15);
            var edge = 0.1 * ts;
            var len = 0.9 * ts / 2;
            p5.rect(-edge, len, edge * 2, -len * 2);
            p5.rotate(p5.PI / 2);
            p5.rect(-edge, len, edge * 2, -len * 2);

            p5.pop();
        }
    }

    // Update FPS meter
    if (showFPS) calcFPS();

    // Show if god mode active
    if (godMode) {
        // Draw black rect under text
        p5.noStroke();
        p5.fill(0);
        p5.rect(0, 0, 102, 22);

        p5.fill(255);
        p5.text('God Mode Active', 5, 15);
    }

    // Show if towers are disabled
    if (stopFiring) {
        // Draw black rect under text
        p5.noStroke();
        p5.fill(0);
        p5.rect(p5.width - 60, 0, 60, 22);
        
        p5.fill(255);
        p5.text('Firing off', p5.width - 55, 15);
    }

    removeTempSpawns();

    projectiles = projectiles.concat(newProjectiles);
    towers = towers.concat(newTowers);
    newProjectiles = [];
    newTowers = [];

    // If player is dead, reset game
    if (health <= 0) resetGame();

    // Start next currentWave
    if (toWait && wcd === 0 || skipToNext && newEnemies.length === 0) {
        toWait = false;
        wcd = 0;
        nextWave();
    }

    // Wait for next currentWave
    if (noMoreEnemies() && !toWait) {
        wcd = waveCool;
        toWait = true;
    }

    // Reset spawn cooldown
    if (toCooldown) {
        scd = spawnCool;
        toCooldown = false;
    }

    // Recalculate pathfinding
    if (toPathfind) {
        recalculate();
        toPathfind = false;
    }

}
function keyPressed() {
    switch (p5.keyCode) {
        case 27:
            // Esc
            toPlace = false;
            clearInfo();
            break;
        case 32:
            // Space
            pause();
            break;
        case 49:
            // 1
            setPlace('gun');
            break;
        case 50:
            // 2
            setPlace('laser');
            break;
        case 51:
            // 3
            setPlace('slow');
            break;
        case 52:
            // 4
            setPlace('sniper');
            break;
        case 53:
            // 5
            setPlace('rocket');
            break;
        case 54:
            // 6
            setPlace('bomb');
            break;
        case 55:
            // 7
            setPlace('tesla');
            break;
        case 56:
            // 7
            setPlace('commander');
            break;
        case 70:
            // F
            showFPS = !showFPS;
            break;
        case 71:
            // G
            godMode = !godMode;
            break;
        case 72:
            // H
            healthBar = !healthBar;
            break;
        case 77:
            // M
            var promptCheck = prompt('Input map string:');
            if (promptCheck != null){
                importMap(promptCheck);
            }
        case 80:
            // P
            showEffects = !showEffects;
            if (!showEffects) systems = [];
            break;
        case 81:
            // Q
            stopFiring = !stopFiring;
            break;
        case 82:
            // R
            resetGame();
            break;
        case 83:
            // S
            if (selected) sell(selected);
            break;
        case 85:
            // U
            if (selected && selected.upgrades.length > 0) {
                upgrade(selected.upgrades[0]);
            }
            break;
        case 86:
            // V
            muteSounds = !muteSounds;
            break;
        case 87:
            // W
            skipToNext = !skipToNext;
            break;
        case 88:
            // X
            copyToClipboard(exportMap());
            break;
        case 90:
            // Z
            ts = zoomDefault;
            resizeMax();
            resetGame();
            break;
        case 219:
            // Left bracket
            if (ts > 16) {
                ts -= tileZoom;
                resizeMax();
                resetGame();
            }
            break;
        case 221:
            // Right bracket
            if (ts < 40) {
                ts += tileZoom;
                resizeMax();
                resetGame();
            }
            break;
    }
}

function mousePressed() {
    if (!mouseInMap()) return;
    var p = gridPos(p5.mouseX, p5.mouseY);
    var t = getTower(p.x, p.y);
    
    if (t) {
        // Clicked on tower
        selected = t;
        toPlace = false;
        updateInfo(selected);
    } else if (canPlace(p.x, p.y)) {
        buy(createTower(p.x, p.y, tower[towerType]));
    }
}
var Input = document.getElementById('map');
if (Input != null){
    Input.addEventListener('change', resetGame);   
}
}
export var p5funcs = new p5(sketch)