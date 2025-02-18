// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new PIXI.Application({
    //resolution: window.devicePixelRatio || 1,
    width: 640, // window.innerWidth,
    height: 480, // window.innerHeight,
    // resizeTo: window,
});

// The application will create a canvas element for you that you
// can then insert into the DOM
document.body.appendChild(app.view);

let map = [
    [2, 2, 2, 1, 1, 1, 0, 0],
    [3, 3, 2, 1, 1, 1, 0, 0],
    [2, 2, 2, 1, 1, 1, 1, 1],
    [2, 1, 2, 1, 1, 1, 2, 1],
    [2, 1, 1, 1, 0, 1, 1, 1],
    [2, 1, 1, 1, 0, 1, 1, 1],
    [2, 2, 2, 1, 1, 1, 1, 1],
    [2, 2, 2, 1, 1, 1, 1, 1],
] // 7, 7

/**
 * Uniformise all the map
 */
function uniformiseMap()
{
    for (let x = 0; x < config.ROWS; x++) {
        for (let y = 0; y < config.COLS; y++) {
            // Uniformise one point
            uniformisePoint(x, y);
        }
    }
}

/**
 * 8 values around a given point
 * cannot have 2 levels of difference
 */
function uniformisePointUpDown(baseX, baseY, dir = 1)
{
    // Dig at sea level ?
    if (map[baseX][baseY] == 0 && dir == -1) {
        // console.log('Cant dig under sea level');
        return;
    }

    // Elevate too much ?
    if (map[baseX][baseY] == 6 && dir == 1) {
        // console.log('Cant elevate over Everest :p');
        return;
    }

    map[baseX][baseY] += dir;
    // Value of baseX, baseY
    let baseMapValue = map[baseX][baseY];

    for (let x = baseX - 1; x <= baseX + 1; x++) {
        for (let y = baseY - 1; y <= baseY + 1; y++) {
            // Out of offset
            if (x < 0 || x > config.ROWS) {
                // console.log('Out of map x')
            }
            else if (y < 0 || y > config.COLS) {
                // console.log('Out of map y')
            }
            else if (x == baseX && y == baseY) {
                // console.log('Central point');
            }
            else {
                // Value of x, y
                let mapValue = map[x][y];
                // Difference of 2 or more ?
                let diff = mapValue - baseMapValue;
                // console.log('diff', diff);
                // Update adjacents points, up
                if (diff == -2) {
                    // Update adjacents to adjacents points, recursively
                    uniformisePointUpDown(x, y, dir);
                }
                // Update adjacents points, down
                if (diff == 2) {
                    // Update adjacents to adjacents points, recursively
                    uniformisePointUpDown(x, y, dir);
                }
            }
        }
    }
}

const config = {
    COLS: 40,
    ROWS: 40,
    BLOCK_SIZE: 32, // Côté du losange final
    BLOCK_OFFSET_Y: -32,
    BLOCK_OFFSET_Y_PLUS: 16,

}

const cursor = {
    x: 0,
    y: 0,
}

const camera = {
    stepX: -32 * 2,
    stepY: 32,
    offsetY: 16,
    x: 0,
    y: 0,
    worldX: function () {
        return camera.x * camera.stepX;
    },
    worldY: function () {
        return camera.y * camera.stepY + camera.offsetY;
    },
    worldOffsetY() {
        return camera.offsetY * camera.stepY;
    },
    width: 10,
    height: 10,
}

// For sprites
const container = new PIXI.Container();
container.x = 0;
container.y = 240;
app.stage.addChild(container);

// For polygons
const graphics = new PIXI.Graphics();
graphics.x = 0;
graphics.y = 240;
app.stage.addChild(graphics);

// For cursor
const cursorGraphics = new PIXI.Graphics();
cursorGraphics.x = 0;
cursorGraphics.y = 240;
app.stage.addChild(cursorGraphics);

// Generate sea level map
function clearMap()
{
    map = [];
    for (let x = 0; x < config.ROWS + 1; x++) {
        let row = [];
        for (let y = 0; y < config.COLS + 1; y++) {
            row.push(0);
            // row.push(getRandomInt(0, 1));
        }
        map.push(row);
    }
    // console.log(map);
}

// uniformiseMap();
// uniformisePointUpDown(3, 3);
// uniformisePointUpDown(3, 3);
// uniformisePointUpDown(3, 3);
// uniformisePointUpDown(3, 3, -1);
// uniformisePointUpDown(3, 3, -1);
// uniformisePointUpDown(3, 3, -1);


function generateProceduralMap()
{
    // Random generation based on land modify function
    const directions = [-1, 1];

    for (let mod = 1; mod <= config.ROWS * config.COLS / 2; mod++) {
        let randomDir = directions[getRandomInt(0, 1)];
        let randomX = getRandomInt(0, config.ROWS);
        let randomY = getRandomInt(0, config.COLS);
        uniformisePointUpDown(randomX, randomY, randomDir);
    }
}

// Used to get the opposite point of a polygon
const opposites = {
    3: 1,
    2: 0,
    1: 3,
    0: 2
}

clearMap();
generateProceduralMap();

function redrawMap()
{
    container.removeChildren();
    graphics.clear();

    drawMap();
    // requestAnimationFrame(generateProceduralMap);

    drawCursor();
}

document.querySelector('.buttons__new-map').addEventListener('click', function () {
    clearMap();
    generateProceduralMap();
    redrawMap();
});


const loader = PIXI.Loader.shared;
loader.add("images/sprites.json").load(setup);

let sheet;

function setup() {
    sheet = loader.resources['images/sprites.json'];
    redrawMap();
}

// const loader = PIXI.Loader.shared;
// const textures = {};
// loader.add('b1111', 'images/b1111.png');
// loader.add('b1100', 'images/b1100.png');
// loader.add('b0110', 'images/b0110.png');
// loader.add('b0100', 'images/b0100.png');
// loader.add('b0010', 'images/b0010.png');
// loader.add('b0001', 'images/b0001.png');
// loader.load((loader, resources) => {
//     textures.b1111 = resources.b1111.texture;
//     textures.b1100 = resources.b1100.texture;
//     textures.b0110 = resources.b0110.texture;
//     textures.b0100 = resources.b0100.texture;
//     textures.b0010 = resources.b0010.texture;
//     textures.b0001 = resources.b0001.texture;
//     redrawMap();
// });

// setInterval(redrawMap, 500);

document.addEventListener('keydown', manageKeys);

function manageKeys(event) {

    const k = event.key;
    // console.log(k);

    moveCamera = false;
    
    if (k == 'ArrowUp' && camera.y != 0) {
        camera.y--;
        moveCamera = true;
    }
    if (k == 'ArrowDown' && camera.y != (config.ROWS - camera.height)) {
        camera.y++;
        moveCamera = true;
    }
    if (k == 'ArrowLeft' && camera.x != 0) {
        camera.x--;
        moveCamera = true;
    }
    if (k == 'ArrowRight' && camera.x != (config.COLS - camera.width)) {
        camera.x++;
        moveCamera = true;
    }
    if (moveCamera) {
        redrawMap();
        doGetCursorFromMouse();
    }

    moveCursor = false;

    if (k == 'z') {
        cursor.y--;
        moveCursor = true;
    }
    if (k == 's') {
        cursor.y++;
        moveCursor = true;
    }
    if (k == 'q') {
        cursor.x--;
        moveCursor = true;
    }
    if (k == 'd') {
        cursor.x++;
        moveCursor = true;
    }
    if (moveCursor) {
        drawCursor();
    }
}

// Modify land by left and right click
document.querySelector('canvas').addEventListener('click', modifyLand);
document.querySelector('canvas').addEventListener('contextmenu', modifyLand);

function modifyLand(event) {
    // Modify land
    // Up = left click
    if (event.type == 'click') {
        console.log(cursor);
        uniformisePointUpDown(cursor.x, cursor.y);
        redrawMap();
    }
    // Down = right click
    if (event.type == 'contextmenu') {
        // Do not display the context menu
        event.preventDefault();
        console.log(cursor);
        uniformisePointUpDown(cursor.x, cursor.y, -1);
        redrawMap();
    }
}

// Draw cursor
function drawCursor() {
    // Dots
    // console.log('dot');
    let point = point3dIso(cursor.x - camera.x, cursor.y - camera.y, map[cursor.x][cursor.y])
    cursorGraphics.clear();
    cursorGraphics.lineStyle(1, 0xFF0000);
    cursorGraphics.drawRect(point.x - 2, point.y - 2, 4, 4);
}

// Get cursor from mouse
document.querySelector('canvas').addEventListener('mousemove', handleGetCursorFromMouse);

const mouse = {};
// Transfer event to separate function
function handleGetCursorFromMouse(event) {
    mouse.x = event.x;
    mouse.y = event.y;
    getCursorFromMouse(mouse);
}

function getCursorFromMouse(mouse) {
    // console.log('mouse', event.x, event.y - 240);
    // Get the vertical column (on screen)
    let column = Math.floor((mouse.x + config.BLOCK_SIZE / 2) / config.BLOCK_SIZE);
    // console.log('column', column);
    // Get all the map points on that column
    // From 3,0 to 2,1 to 1,2 to 0,3 for example
    // Search for the shortest deltaY between mouse and z line point
    let nearestY = 1000;
    let nearestPoint = new PIXI.Point(0, 0);
    for (let line = 0; line <= column; line++) {
        // Go forward (up)
        let x = line;
        // Go reverse (down)
        let y = column - line;
        // Validates x <= camera.width (viewport x max)
        // Validates y <= camera.height (viewport y max)
        if (x > camera.width || y > camera.height) {
            continue;
        }
        // Adjusted by the camera position
        x += camera.x;
        y += camera.y;
        // console.log('point', x, y);
        // Get the z at xy index
        // screenCoords are calculated at drawMap()
        if (screenCoords[x + '@' + y] != undefined) {            
            let z = screenCoords[x + '@' + y];
            // console.log('z point', z);
            // Get the y distance from mouse to point
            let deltaY = Math.abs(mouse.y - 240 - z);
            // console.log('deltaY', deltaY);
            // Compare with actual nearest
            if (deltaY < nearestY) {
                nearestY = deltaY;
                nearestPoint = new PIXI.Point(x, y);
            }
        }
    }

    cursor.x = nearestPoint.x;
    cursor.y = nearestPoint.y;
    drawCursor();
}

// Possibly useless : manually call get cursor from mouse
function doGetCursorFromMouse() {
    getCursorFromMouse(mouse);
}


// Draw map
const screenCoords = [];
function drawMap()
{
    for (let x = camera.x; x < camera.x + camera.width; x++) {
        for (let y = camera.y; y < camera.y + camera.height; y++) {
    // for (let x = config.ROWS - 1; x >= 0; x--) {
    //     for (let y = 0; y < config.COLS; y++) {
            // Corners coordonnées
            let z1 = map[x][y];
            let z2 = map[x + 1][y];
            let z3 = map[x + 1][y + 1];
            let z4 = map[x][y + 1];

            // Corners
            const corners = [z1, z2, z3, z4];

            // Détection du type de bloc xxxx (0 et 1)
            // Valeur max
            let zMax = Math.max(...corners) - 1;
            // On réduit chaque coin de zMax -1
            // Ex. 2 2 2 3 => 0 0 0 1
            let blockType = [z1 - zMax, z2 - zMax, z3 - zMax, z4 - zMax].join('');
            // console.log('block type', blockType);
            // Cas particulier du 0, 0, 0, 0 => sea level = 0000
            if (z1 === 0 && z2 === 0 && z3 === 0 && z4 === 0) {
                // Sea level block
                blockType = '0000';
            }

            // Traçage du polygone
            // Pour chacun des 4 points
            // Copy corners
            let sortedCorners = [...corners];
            // Polygon
            let polygon = getPolygonFromPoint(x, y, corners);
 
            // Stocke screen coords pour la souris/curseur
            // => dans getPolygonFromPoint()
            // screenCoords[String(x) + '@' + String(y)] = polygon.points[0].y;

            // Blocks !
            if (true || blockType === '1111' ||
                blockType === '1100' ||
                blockType === '0110' ||
                blockType === '0100' ||
                blockType === '0010' ||
                blockType === '0001'
            ) {
                // let blockSprite = new PIXI.Sprite(textures['b' + blockType]);
                let blockSprite = new PIXI.Sprite(sheet.textures['b' + blockType + '.png']);

                blockSprite.x = polygon.points[0].x;
                blockSprite.y = polygon.points[0].y + config.BLOCK_OFFSET_Y;
                // Cas des sprites qui démarrent à 1
                if (blockType[0] == '1') {
                    blockSprite.y += config.BLOCK_OFFSET_Y_PLUS;
                }
                // blockSprite.alpha = .5;
                container.addChild(blockSprite);
            }

            // Diagonale !
            // Dès que 1 est différent des 3 autres
            // Trace une ligne entre lui et son opposé

            let sortedKeys = getSortedKeys(corners);
            sortedCorners = getSortedArray(sortedCorners);
            // console.log('corners    ', corners, blockType);
            // console.log('sorted keys', sortedKeys);
            // console.log('sorted     ', sortedCorners);
            
            // Point inférieur
            // corners     [1, 1, 1, 0]
            // sorted keys ["0", "1", "2", "3"]
            // sorted      [0, 1, 1, 1]

            // Point supérieur
            // corners     [1, 1, 2, 1]
            // sorted keys ["2", "0", "1", "3"]
            // sorted      [1, 1, 1, 2]

            // Test du cas particulier 0, 1, 0, 1
            // => diagonale façe à la caméra
            if (corners[0] == corners[2] &&
                corners[1] == corners[3] &&
                corners[0] < corners[1]) {
                // console.log('creux');
                let cornerSource = polygon.points[1];
                // On prend le coin opposé (opposites)
                let cornerDestination = polygon.points[3];
                // On trace une ligne entre ces deux points
                graphics.lineStyle(1, 0x005500);
                graphics.moveTo(cornerSource.x, cornerSource.y);
                graphics.lineTo(cornerDestination.x, cornerDestination.y);
            }

            // On compare les deux premiers "sorted" et les deux derniers
            const firstDifferent = sortedCorners[0] != sortedCorners[1];
            const secondDifferent = sortedCorners[2] != sortedCorners[3];
            // Si un des deux différents pareils
            if (firstDifferent || secondDifferent) {

                // Si les premiers sont différents (pt inférieur)
                if (firstDifferent) {
                    // console.log('1st different');
                    // On prend la clé sorted #3
                    var sortedKey = Number(sortedKeys[3]);
                }

                // Si les derniers sont différents (pt supérieur)
                if (secondDifferent) {
                    // console.log('2nd different');
                    // On prend la clé sorted #0
                    var sortedKey = Number(sortedKeys[0]);
                }
                // console.log(polygon);
                // console.log(polygon.points[sortedKey]);
                // console.log('sorted key', sortedKey);
                // On prend le corner sur la clé identifiée
                let cornerSource = polygon.points[sortedKey];
                // console.log('source', cornerSource);
                // On prend le coin opposé (opposites)
                let cornerDestination = polygon.points[opposites[sortedKey]];
                // console.log('destination', cornerDestination);
                
                // On trace une ligne entre ces deux points
                graphics.lineStyle(1, 0x555555);
                graphics.moveTo(cornerSource.x, cornerSource.y);
                graphics.lineTo(cornerDestination.x, cornerDestination.y);
            }

            // Draw polygon over diagonals
            graphics.lineStyle(1, 0x555555);
            graphics.drawPolygon(polygon.polygon);

            // Dots
            // console.log('dot');
            // let point = point3dIso(x, y, map[x][y])
            // graphics.lineStyle(1, 0x00FF00);
            // graphics.drawRect(point.x, point.y, 1, 1);
        }
    }
}

/**
 * Returns a polygon from x, y
 */
function getPolygonFromPoint(x, y, corners) {
    // The fours points/corner
    // Adjusted by the camera position
    xC = x - camera.x;
    yC = y - camera.y;
    // console.log('dots');
    let point1 = point3dIso(xC, yC, corners[0]);
    let point2 = point3dIso(xC + 1, yC, corners[1]);
    let point3 = point3dIso(xC + 1, yC + 1, corners[2]);
    let point4 = point3dIso(xC, yC + 1, corners[3]);

    // Stocke screen coords pour la souris/curseur
    // y coord for the map x,y point
    // Point 1 for all the x, y
    screenCoords[String(x) + '@' + String(y)] = point1.y;
    // Points 2 and 3 for the right side of the camera
    if (xC == camera.width - 1) {
        // We're at the right side of the camera/visible map
        screenCoords[String(x + 1) + '@' + String(y)] = point2.y;
        screenCoords[String(x + 1) + '@' + String(y + 1)] = point3.y;
    }
    // Point 4 for the bottom side camera
    if (yC == camera.height - 1) {
        // We're at the bottom side of the camera/visible map
        screenCoords[String(x) + '@' + String(y + 1)] = point4.y;
    }

    // The polygon
    let polygon = new PIXI.Polygon(point1, point2, point3, point4);
    // console.log(polygon)
    return {
        polygon: polygon,
        points: [
            point1,
            point2,
            point3,
            point4
        ]
    }
}

// Sort by keys
// https://stackoverflow.com/a/11811767
function getSortedKeys(obj) {
    var keys = keys = Object.keys(obj);
    return keys.sort(function (a, b) { return obj[b] - obj[a] });
}

function getSortedArray(obj) {
    return obj.sort(function (a, b) {
        return a - b;
    });
}

/**
 * Draw 3D Iso point with BLOCK_WIDTH
 */
function point3dIso(x, y, z) {
    let newX = x + y;
    let newY = 0.5 * y - 0.5 * x - 0.5 * z;

    return new PIXI.Point(
        // config.BLOCK_SIZE * newX + camera.worldX(),
        // config.BLOCK_SIZE * newY + camera.worldY()
        config.BLOCK_SIZE * newX,
        config.BLOCK_SIZE * newY
    );
}

/**
 * Draw cartesian point with BLOCK_WIDTH
 */
function point2d(x, y) {
    return new PIXI.Point(config.BLOCK_SIZE * x, config.BLOCK_SIZE * y);
}

/**
 * Returns a random int between min and max
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

