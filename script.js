// i love js and all but why is everything asynchronous only, i can't simply sync
/*  goals:   
        reinplement smooth jump
        better collision detection
        different spawn method for more dynamic gameplay
        
    bugs: 
        smooth jump broke after previous patch, wth and goes from really good to almost unusable and first jump is low 
        Partial FIX:
        WHY DID I USE A GLOBAL VARIABLE I, I've never done that before in c# why did i do it now
        issue where jump eventualy stops working is still there
        PATTERN:
        it seems gravity is getting stronger over jumps not time but does not correlate to smooth jump
        
    patches:
        no more than 1 obstacle can be rendered at a time; reason found possibly (PATCHED)
        FIX:
        see the big paragraph as they correlated

        speed for obstacles increases; pattern found of increment of ~21 per second; x of obstacle0 resets????; Debug tool found a pattern
        PATTERN: 
        every time a new obstacle is found 'speed' increments by one; looks like it is moving the same one obstacleArray.length times
        .map() or for of may solve issues ; 
        FIX: in the for of adding 'break' in the end fixed it; something to do with reusing generators
        
        IT IS USING THE SAME X AS obstacle0? obstacle1 has same x as 0
        for some reason when x is created for one it updates all of them the whole object needs to be references not altered
        discovered obstacle creator is completly broken, 
        WHY:
        updating one updates every property in the array, need to fix that, most likely reason for render issue
        https://www.samanthaming.com/tidbits/70-3-ways-to-clone-objects/ <= problem noted here
        using "JSON.parse(JSON.stringify(Obstacle))" or "Object.assign({}, Obstacle)" fixes it but then every obstacle after won't move
        CAUSE: 
        obstacleArray.push(Obstacle); only made a reference so they shared the same memory making them all technicaly one and not independent
        FIX:
        used the new clone method and changed the obstacle movement script from for in to just for i as it is more specific and works

*/
var c = document.getElementById("Canvas");          
Canvas.width = 512;                                 // be divisible by 8    
Canvas.height = 288;                                // please be divisible by 8
Canvas.style = "outline: 1px solid black;";
document.getElementById("resolution").innerHTML = "width: " + Canvas.width + " height: " + Canvas.height;
var ctx = c.getContext("2d");
ctx.font = "30px Arial";                            // fonst style
var Player = {                                      // I like js objects
    x: (Math.floor(Canvas.width / 7)), 
    y: (Canvas.height / 2),                         // co ordinates; Y-axis seems flipped on the canvas
    width: 25,                                      // width of player box
    height: 20,                                     // height of player box
    jump: Math.floor(Canvas.height / 8),            // Increment for each move cycle
    colour: '#FFB347',                              // colour of player box
    strokeStyle: '#A57011',                         // colour for outline of player box
    score: 0,                                       // score 
    hurt: false                                     // when true the next frame will show player differently for the duration of that frame
};
const playerJumpAirtime = .4;                       // how long a player should 'jump' for
var obstacleCreationTimer = 3.8;                    // timing in seconds for obstacle spawning 
var obstacleArray = [];                             // array for all obstacles
const gravityScale = Canvas.height / 175;           // strength of gravity PHYSICS UPDATE DEPENDENT
var fps = 60;                                       // Canvas update cycle
var pps = 60;                                       // physics [update] per second    
var fpsCounter;
var colourFill = ['#F0A0A0', '#A0F0A0', '#A0C0F0', '#F0F0AF'];      // possible fill colours
var speed;
var previousSpeed;
var speed1;
var previousSpeed1;
var previousFall;
var physicsCheck;

const timer = ms => new Promise(res => setTimeout(res, ms))     // sync delay; credit: Jonas Wilms

function getRandomInt(max) {                // very nice stolen code block
    return Math.floor(Math.random() * Math.floor(max));
}

function getRandomIntFrom(min, max) {       // min and max included, also stolen    credit: khr055 from stack overflow
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/*#################################### keyboard stuff ####################################*/

document.getElementById("body").addEventListener("keydown", keyboardEventController, true);     // keyboard event listener
async function keyboardEventController(event) {         // Takes keyboard event then does something
    console.log(event.code);                            // logs pressed key
    switch (event.code) {
        case "Space":                                   // "flaps" / "jump"
            if (Player.y > Player.height) {
                Player.y -= Player.jump;
                console.log("jump");
            }
            else {
                Player.y = 0;
                console.log("$jump");
            }
            break;
    }
}

// smooth jump
async function playerJump() {      
    for(var i = 0; i < Player.jump; i++) {
        if(Player.y > 0) {
            Player.y -= 1;                                          
            await timer((playerJumpAirtime * 1000) / Player.jump);          // timer
            document.getElementById("jump").innerHTML = "Debug 'jump': " + (i + 1);
        }
    }
}

/*################################## obstacle controller ##################################*/

var Obstacle = {
    width: Math.floor(Player.width / 2),
    height: Canvas.height / 2,
    x: Canvas.width,                        // x for obstacle
    y: 0,                                   // y coord of the bottom obstacle
    gap: 0,                                 // gap between each obstacle
    colour: 'red',                          // colour of obstacle; will be randomized
    speed: 1,                               // speed of obstacles
};
Object.seal(Obstacle);                      // ease of life, makes it impossible to add new properties 

obstacleInstantiate();                      // instantiates an obstacle as soon as the script is made
var obstacleInstantiateCycleID = setTimeout(obstacleInstantiate, (obstacleCreationTimer * 1000));
function obstacleInstantiate() {
    obstacleArray.push(JSON.parse(JSON.stringify(Obstacle)));                                                       // makes obstacle
    obstacleArray[(obstacleArray.length - 1)].y = getRandomIntFrom((Canvas.height / 4), (Canvas.height - (Canvas.height / 20)));    // creates y location
    obstacleArray[(obstacleArray.length - 1)].gap = getRandomIntFrom((Player.height * 3.5), (Player.height * 4));   // creates gap
    obstacleArray[(obstacleArray.length - 1)].colour = colourFill[getRandomInt(colourFill.length)];     // creates colour
    console.log("obstacle" + (obstacleArray.length - 1) + ":\t" + obstacleArray[(obstacleArray.length - 1)].x + " " + obstacleArray[(obstacleArray.length - 1)].y + " " + obstacleArray[(obstacleArray.length - 1)].gap + " " + obstacleArray[(obstacleArray.length - 1)].colour);           // logs all details of obstacle
    // updates collision detection
    physicsCheck = false;
    collisionUpdate(obstacleArray.length - 2);
}

var obstacleMoverCycleID = setInterval(obstacleMoveCaller, (1000 / pps));
function obstacleMoveCaller() {                 // moves each obstacle individualy to the left
    for(var i = 0; i < obstacleArray.length; i++){
        obstacleArray[i].x -= Obstacle.speed;
        if(obstacleArray[i].x == 0){
            obstacleInstantiate();
        }
    }
}

/*################################## Frame & Physics Update Cycles and misc. ##################################*/

// collision and score
async function collisionUpdate(obstacleIndex) {         // really good collision detector though is more static than i want it to be, can be solved by new spawn method with x = 0
    physicsCheck = true;
    try{
        while(physicsCheck){
            if((Player.x > (obstacleArray[obstacleIndex].x - Player.width)) && (Player.x < (obstacleArray[obstacleIndex].x + obstacleArray[obstacleIndex].width))) {
                if((Player.y < obstacleArray[obstacleIndex].y) && (Player.y > (obstacleArray[obstacleIndex].y - obstacleArray[obstacleIndex].gap))){
                    // intended to be blank
                }
                else{
                    setScore(-1);
                    physicsCheck = false;
                }
            }
            if(Player.x > obstacleArray[obstacleIndex].x + obstacleArray[obstacleIndex].width){
                setScore(1);
                physicsCheck = false;
            }
            await timer(50);
        }
    } catch{}
}

// gravity
var gravityIntervalID = setInterval(gravityUpdate, (1000 / pps));           // had to seperate from collision/physics for smooth jump to not no-clip
async function gravityUpdate() {
    // gravity
    //Player.y < (Canvas.height - Player.height) ? Player.y += gravityScale ** airtime : null;
    Player.y += gravityScale;
}     

// FPS
var frameUpdateCycleID = setInterval(frameUpdate, (1000 / fps));      // custom fps update cycle for canvas
function frameUpdate() {                                            
    // clear frame stage
    ctx.clearRect(0, 0, Canvas.width, Canvas.height);               // clears canvas

    // draw frame stage
    drawPlayer();                                                   // draws player
    drawObstacles();                                                // draws obstacles
    document.getElementById("coords").innerHTML = "X: " + Math.floor(Player.x) + " Y: " + Math.floor(Player.y);
    fpsCounter++;

    // debug
    try {
        /*
        speed = obstacleArray[0].x;
        document.getElementById("speed").innerHTML = "Debug 'speed': " + previousSpeed + "  " + speed + "  " + (previousSpeed - speed);
        previousSpeed = speed;
        speed1 = obstacleArray[1].x;
        document.getElementById("speed1").innerHTML = "Debug 'speed1': " + previousSpeed1 + "  " + speed1 + "  " + (previousSpeed1 - speed1);
        previousSpeed1 = speed1;
        */
        document.getElementById("Collision").innerHTML = (obstacleArray[0].x - Player.width) + " " + Player.x + " " + (obstacleArray[0].x + obstacleArray[0].width) + " = " + (obstacleArray[0].x - Player.width) - (obstacleArray[0].x + obstacleArray[0].width);
        //document.getElementById("fall").innerHTML = "Debug 'y-velocity': " + Math.floor(previousFall - Player.y);
        //previousFall = Player.y;

    } catch{}
}

function scene_GameOver() {
    clearIntervals();
    ctx.clearRect(0, 0, Canvas.width, Canvas.height);   // clears canvas
    ctx.fillStyle = "black";
    ctx.strokeStyle = "red";
    ctx.strokeText("GAME OVER!", (Canvas.height / 1.8), (Canvas.height / 1.8));
    ctx.fillText("GAME OVER!", (Canvas.height / 1.8), (Canvas.height / 1.8));

}

function drawPlayer() {
    Player.y > (Canvas.height - Player.height) ? Player.y = (Canvas.height - Player.height) : null;     // checks y co-ordinate legality
    ctx.fillStyle = !Player.hurt ? Player.colour : "red";
    ctx.strokeStyle = Player.strokeStyle;
    ctx.fillRect(Player.x, Player.y, Player.width, Player.height);                          // draws player box
    ctx.strokeRect(Player.x + 1, Player.y + 1, Player.width - 1, Player.height - 1);        // draws outline for player
    ctx.stroke();
    Player.hurt = false;
}

function drawObstacles() {
    for (const obstacle of obstacleArray) {
        ctx.fillStyle = obstacle.colour;
        ctx.fillRect(obstacle.x, obstacle.y, Obstacle.width, Canvas.height);        // initial box
        ctx.fillRect(obstacle.x, 0, Obstacle.width, (obstacle.y - obstacle.gap));   // 2nd box above initial to form gap
    }
}

var uiIntervalID = setInterval(uiCounterReset, 1000);           // resets fps counter to make it work
function uiCounterReset() {
    document.getElementById("fps").innerHTML = "FPS: " + fpsCounter;
    fpsCounter = 0;
}

function clearIntervals() {
    try{
        clearInterval(frameUpdateCycleID);      // stops frame update and then other intervals
        clearInterval(gravityIntervalID);      
        clearInterval(obstacleMoverCycleID);
        clearInterval(uiIntervalID);
        clearInterval(uiIntervalID);
        clearInterval(obstacleInstantiateCycleID);
    } catch{}
}

function getTime() {                                        // gets live time
    var d = new Date();
    return d.toLocaleTimeString();
}

function setScore(scoreChange) {                            // sets the score
    Player.score += scoreChange;
    console.log("+ " + scoreChange + " point = " + Player.score);
    document.getElementById("score").innerHTML = "Score: " + Player.score;
    if(scoreChange < 0){
        Player.hurt = true;
    }
    if(Player.score < 0) {
        console.log("Game Over!");
        scene_GameOver();
    }
}