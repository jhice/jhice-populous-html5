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

// To store blockTypes
let blocksMap = [];

/**
 * 8 values around a given point
 * cannot have 2 levels of difference
 */
function uniformisePointUpDown(baseX, baseY, dir = 1, blocksList = [])
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

    // Elevate point
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

                // Current block class
                let currentClass = blocksMap[x][y].class;
            
                // Update adjacents points, up
                if (diff == -2) {
                    // Update adjacents to adjacents points, recursively
                    blocksList = uniformisePointUpDown(x, y, dir, blocksList);
                }
                // Update adjacents points, down
                if (diff == 2) {
                    // Update adjacents to adjacents points, recursively
                    blocksList = uniformisePointUpDown(x, y, dir, blocksList);
                }

                // After uniformising around this point
                // update Block Type X Y
                updateBlockTypeXY(x, y);

                // New block type
                let newBlockType = blocksMap[x][y].type;

                // House destroyed ?
                if (currentClass == 'house' && newBlockType != '1111') {
                    console.log('house destroyed at', x, y);
                    console.log('neighbours to check', blocksMap[x][y].houses);
                }
            }
        }
    }

    // Update first elevated point
    updateBlockTypeXY(baseX, baseY);

    blocksList.push(new PIXI.Point(baseX, baseY));
    return blocksList;
}

/**
 * Defines block type at x, y in blocksMap
 * 
 * @param {Number} x Map X
 * @param {Number} y Map Y
 */
function updateBlockTypeXY(x, y) {

    // Dont go out of map borders
    if (x >= config.COLS || y >= config.ROWS) {
        return;
    }

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
    // Ex. 2 2 2 3 => zMax - 1 = 2 => 0 0 0 1
    // Ex. 1 0 1 0 => zMax - 1 = 0 => 1 0 1 0
    blockType = [z1 - zMax, z2 - zMax, z3 - zMax, z4 - zMax].join('');

    // Cas particulier du 0, 0, 0, 0 si z de base = 0 => sea level = 0000
    if (z1 === 0 && z2 === 0 && z3 === 0 && z4 === 0) {
        // Sea level block
        blockType = '0000';
    }

    blocksMap[x][y].type = blockType;

    // Walkable ? (not rock)
    if (blocksMap[x][y].class != 'rock') {
        if (blockType != '0000') {
            // Not water
            blocksMap[x][y].isWalkable = true;
        } else {
            // Water
            blocksMap[x][y].isWalkable = false;
        }
    }
}

/**
 * Parse blocks to be computed for "construction value"
 * around a Point
 * 
 * @param {Point} point x, y
 * @param {Number} height block height => determines width around point
 */
function updateBlockValueAround(point, height) {
    for (let x = point.x - height; x <= point.x + height; x++) {
        for (let y = point.y - height; y <= point.y + height; y++) {
            if (x >= 0 && x <= config.ROWS && y >= 0 && y <= config.COLS) {
                updateBlockValue(x, y);
            }
        }
    }
}

/**
 * Computes "construction value" at x, y ('1111' adjacent blockTypes)
 * buildValue = 0 => not flat
 * buildValue > 0 => construction value
 * 
 * Updates neighbours
 * 
 * @param {Number} x
 * @param {Number} y 
 */
function updateBlockValue(x, y) {

    // Get block at x, y
    block = blocksMap[x][y];

    // Computes buildValue for flat block that is not water and not rock
    if (block.type == '1111' && block.class != 'rock') {
        // Base buildValue
        let buildValue = 0;
        // Neighbours blocks list
        let neighbours = [];
        // Space around the block
        let space = 1; // 2 for castles only
        // Block construction buildValue in and around the x, y block
        for (let i = x - space; i <= x + space; i++) {
            // Out of map offset x
            if (i < 0 || i > config.ROWS) {
                // Next i
                continue;
            }
            for (let j = y - space; j <= y + space; j++) {
                // Out of map offset x
                if (j < 0 || j > config.COLS) {
                    // Next j
                    continue;
                }
                // For free blockTypes 1111 and not rock, increase buildValue by 1
                if (blocksMap[i][j].type == '1111' && blocksMap[i][j].class != 'rock') {
                    buildValue += 1;
                    // Push to neighbours if not current block
                    if (i != x || j != y) {
                        neighbours.push({x: i, y: j});
                        // House ?
                        if (block.class == 'house') {
                            // Neighbours block is field
                            console.log('neighbours', i, j, 'for house at block', x, y);
                            blocksMap[i][j].class = 'field';
                        }
                    }
                }

                // // Update house ?
                // if (blocksMap[i][j].class == 'house') {
                //     // If not current block to avoid recursion
                //     if (i != x || j != y) {
                //         console.log('update house at', i, j, 'from block at', x, y);
                //         // updateBlockValue(i, j);
                //     }
                // }
            }
        }
        // Update block buildValue
        blocksMap[x][y].buildValue = buildValue;
        // Update block neighbours
        blocksMap[x][y].neighbours = neighbours;

    } else {
        // If not flat, buildValue is zero
        blocksMap[x][y].buildValue = 0;
        // Class is empty if not rock
        if (block.class != 'rock') {
            block.class = 'empty';
        }
        // Update block neighbours
        blocksMap[x][y].neighbours = [];

        //
        // Update house here ?
        //
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
    isVisible: function (x, y) {
        return x >= camera.x && x < camera.x + camera.width && y >= camera.y && y < camera.y + camera.height;
    }
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
graphics.alpha = 0.2;

// For cursor
const cursorGraphics = new PIXI.Graphics();
cursorGraphics.x = 0;
cursorGraphics.y = 240;
app.stage.addChild(cursorGraphics);

// For people
const peopleGraphics = new PIXI.Graphics();
peopleGraphics.x = 0;
peopleGraphics.y = 240;
app.stage.addChild(peopleGraphics);

// Generate sea level map
function clearMap()
{
    map = [];
    blocksMap = [];
    for (let x = 0; x < config.ROWS + 1; x++) {
        let row = [];
        let rowBlocks = [];
        for (let y = 0; y < config.COLS + 1; y++) {
            // z = 0
            row.push(0);
            // Create water blocks, not walkable
            // with random rock on it
            hasRock = getRandomInt(1, 10) == 1 ? 'rock' : 'empty';
            rowBlocks.push({
                type: '0000',
                isWalkable: false,
                buildValue: 0,
                class: hasRock,
                neighbours: [],
                houses: [],
            });
        }
        map.push(row);
        // Generate blocksMap to '0000'
        blocksMap.push(rowBlocks);
    }
    // console.log(map);
}

function generateProceduralMap()
{
    // Random generation based on land modify function
    const directions = [-1, 1];

    for (let mod = 1; mod <= config.ROWS * config.COLS / 2; mod++) {
        let randomDir = directions[getRandomInt(0, 1)];
        let randomX = getRandomInt(0, config.ROWS);
        let randomY = getRandomInt(0, config.COLS);
        uniformisePointUpDown(randomX, randomY, randomDir);
        updateBlockValueAround({x: randomX, y: randomY}, 7);
    }
}

// Used to get the opposite point of a polygon
const opposites = {
    3: 1,
    2: 0,
    1: 3,
    0: 2
}

function redrawMap()
{
    // Remove all sprites from container
    container.removeChildren();
    graphics.clear();

    drawMap();
    // requestAnimationFrame(generateProceduralMap);

    drawCursor();

    // drawDebugPeople();

    drawPeople();
}

document.querySelector('.buttons__new-map').addEventListener('click', function () {
    clearMap();
    generateProceduralMap();
    redrawMap();
});

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

    // Debug
    if (k == 'p') {
        people.state == 'START' ? people.state = 'IDLE' : people.state = 'START';
    }
}

// Modify land by left and right click
document.querySelector('canvas').addEventListener('click', modifyLand);
document.querySelector('canvas').addEventListener('contextmenu', modifyLand);

function modifyLand(event) {
    // Modify land
    // Up = left click
    if (event.type == 'click') {
        // console.log(cursor);
        let zCursor = map[cursor.x][cursor.y];
        let blocks = uniformisePointUpDown(cursor.x, cursor.y, 1, []);
        // console.log('uniformised blocks', blocks);
        // updateBlocksValue(blocks);
        updateBlockValueAround(cursor, zCursor + 2);
        redrawMap();
    }
    // Down = right click
    if (event.type == 'contextmenu') {
        // Do not display the context menu
        event.preventDefault();
        // console.log(cursor);
        let zCursor = map[cursor.x][cursor.y];
        let blocks = uniformisePointUpDown(cursor.x, cursor.y, -1, []);
        // console.log('uniformised blocks', blocks);
        // updateBlocksValue(blocks);
        updateBlockValueAround(cursor, zCursor + 2);
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

    // Debug
    document.getElementById('debug-block').textContent = blocksMap[cursor.x][cursor.y].type;
    document.getElementById('debug-block').textContent += ' x:' + cursor.x + ', y:' + cursor.y;
    document.getElementById('debug-block').textContent += ' z:' + map[cursor.x][cursor.y];
    document.getElementById('debug-block').textContent += ' ' + JSON.stringify(blocksMap[cursor.x][cursor.y]);
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
    for (let x = camera.x + camera.width - 1; x >= camera.x; x--) {
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
            // let blockType = [z1 - zMax, z2 - zMax, z3 - zMax, z4 - zMax].join('');
            // console.log('block type', blockType);

            // Get blockType from the map
            blockType = blocksMap[x][y].type;

            // Cas particulier du 0, 0, 0, 0 => sea level = 0000
            if (z1 === 0 && z2 === 0 && z3 === 0 && z4 === 0) {
                // Sea level block
                //blockType = '0000';
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

            // let blockSprite = new PIXI.Sprite(textures['b' + blockType]);
            let blockSprite = new PIXI.Sprite(sheet.textures['b' + blockType + '.png']);

            blockSprite.x = polygon.points[0].x;
            blockSprite.y = polygon.points[0].y + config.BLOCK_OFFSET_Y;
            // Cas des sprites qui démarrent à 1
            if (blockType[0] == '1') {
                blockSprite.y += config.BLOCK_OFFSET_Y_PLUS;
            }
            // blockSprite.alpha = blocksMap[x][y].buildValue / 26 + 0.2;
            container.addChild(blockSprite);

            // Second layer : houses, fields, rocks
            if (blocksMap[x][y].class != 'empty') {
                let classSprite = new PIXI.Sprite(sheet.textures[blocksMap[x][y].class + '.png']);
                classSprite.x = blockSprite.x;
                classSprite.y = blockSprite.y;
                // 1111 et rock
                if (blockType === '1111' && blocksMap[x][y].class === 'rock') {
                    classSprite.y -= config.BLOCK_OFFSET_Y_PLUS;
                }
                container.addChild(classSprite);
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

            // Debug construction value for flat blocks only and not rock
            if (blocksMap[x][y].type == '1111' && blocksMap[x][y].class != 'rock') {
                // Value + first letter of class
                let content = blocksMap[x][y].buildValue + ' (' + blocksMap[x][y].class[0] + ')';
                let textValue = new PIXI.Text(content, {
                        fontSize: 12,
                        fill: 0x333333,
                    }
                );
                textValue.x = polygon.points[0].x + 16; // + config.BLOCK_SIZE / 2;
                textValue.y = polygon.points[0].y - 8;
    
                container.addChild(textValue);
            }
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

// Placement on the map inside the grid
function drawDebugPeople() {

    for (let x = camera.x; x < camera.x + camera.width; x += 0.1) {

        let y = 4.5 + camera.y;
        z = getZ(x, y);
        let point = point3dIso(x - camera.x, y - camera.y, z);

        graphics.lineStyle(1, 0xFFFF00);
        graphics.drawRect(point.x, point.y, 1, 1);
    }

    for (let y = camera.y; y < camera.y + camera.height; y += 0.1) {

        let x = 4.5 + camera.x;
        z = getZ(x, y);
        let point = point3dIso(x - camera.x, y - camera.y, z);

        graphics.lineStyle(1, 0xFFFF00);
        graphics.drawRect(point.x, point.y, 1, 1);
    }

    // for (let r = 0; r <= 500; r += 1) {

    //     let x = Math.random() * config.COLS;
    //     let y = Math.random() * config.ROWS;
    //     z = getZ(x, y);
    //     let point = point3dIso(x, y, z);

    //     graphics.lineStyle(1, 0x00FF00);
    //     graphics.drawRect(point.x, point.y, 1, 1);
    // }
}

function getZ(x, y) {
    // calcul des parties entières et décimales de x et de y
    let xInt = Math.floor(x);
    let yInt = Math.floor(y);
    let decimalX = x - xInt;
    let decimalY = y - yInt;

    let blockType = blocksMap[xInt][yInt].type;
    // console.log(blockType);

    // Default Z
    let z = 0;

    // 0000
    if (blockType == '0000') {
        z = 0;
    }

    // 0110
    if (blockType == '0110') {
        z = decimalX;
    }
    // 1100
    if (blockType == '1100') {
        z = - decimalY;
    }
    // 1001
    if (blockType == '1001') {
        z = - decimalX;
    }
    // 0011
    if (blockType == '0011') {
        z = decimalY;
    }

    // 0100
    if (blockType == '0100') {
        z = (decimalX < -decimalY + 1) ? decimalX : -decimalY + 1
    }
    // 0010
    if (blockType == '0010') {
        z = (decimalY > decimalX) ? decimalX : decimalY
    }
    // 0001
    if (blockType == '0001') {
        z = (decimalX > -decimalY + 1) ? -decimalX + 1 : decimalY
    }
    // 1000
    if (blockType == '1000') {
        z = (decimalY < decimalX) ? -decimalX : -decimalY
    }

    // 0101
    if (blockType == '0101') {
        z = (decimalX < -decimalY + 1) ? decimalY + decimalX : -decimalY + -decimalX + 2
    }
    // 1010
    if (blockType == '1010') {
        z = (decimalY > decimalX) ? decimalX - decimalY : decimalY - decimalX
    }

    // 0111
    if (blockType == '0111') {
        z = (decimalY > decimalX) ? decimalY : decimalX
    }
    // 1110
    if (blockType == '1110') {
        z = (decimalX < -decimalY + 1) ? -decimalY : decimalX - 1
    }
    // 1101
    if (blockType == '1101') {
        z = (decimalY > decimalX) ? -decimalX : -decimalY
    }
    // 1011
    if (blockType == '1011') {
        z = (decimalX < -decimalY + 1) ? -decimalX : decimalY - 1
    }

    // 1111
    if (blockType == '1111') {
        z = 0;
    }

    // Add base z elevation
    z = z + map[xInt][yInt];

    return z;
}

function zAverage(xStart, yStart) {
    // Get int value
    x = Math.floor(xStart);
    y = Math.floor(yStart);
    // Corners coordonnées
    let z1 = map[x][y];
    let z2 = map[x + 1][y];
    let z3 = map[x + 1][y + 1];
    let z4 = map[x][y + 1];

    let average = (z1 + z2 + z3 + z4) / 4;

    return average;
}

let people = {
    x: 4.5,
    y: 4.5,
    state: 'START',
    destination: null,
    stepX: null,
    stepY: null,
    reachDestination: function () {
        return +(people.x).toPrecision(2) == +(people.destination.x).toPrecision(2)
            && +(people.y).toPrecision(2) == +(people.destination.y).toPrecision(2);
    },
    gotoDestination: function(point) {
        people.destination = point;
        let speed = 4;
        people.stepX = (point.x - people.x) / speed;
        people.stepY = (point.y - people.y) / speed;
    }
}

function movePeople() {
    people.x += people.stepX;
    people.y += people.stepY;
    // console.log(people);
}

function drawPeople() {

    // Clear people
    peopleGraphics.clear();

    // Still on map ?
    if (!camera.isVisible(people.x, people.y)) {
        return;
    }

    // Draw people
    let z = getZ(people.x, people.y);
    let point = point3dIso(people.x - camera.x, people.y - camera.y, z);
    // console.log("z people", z);

    // peopleGraphics.lineStyle(1, 0x00FF00);
    peopleGraphics.beginFill(0xFF3300);
    peopleGraphics.drawRect(point.x - 4, point.y - 16, 8, 16);
}

function findDestination() {
    do {
        var xRand = getRandomInt(-1, 1);
        var yRand = getRandomInt(-1, 1);
        var xDest = people.x + xRand;
        var yDest = people.y + yRand;
        // For debug, limit to camera view
        var isOutOfMap = xDest < 0 || xDest > camera.width || yDest < 0 || yDest > camera.height;
        // var isOutOfMap = xDest < 0 || xDest > config.COLS || yDest < 0 || yDest > config.ROWS;
        if (!isOutOfMap) {
            var isWalkable = blocksMap[Math.floor(xDest)][Math.floor(yDest)].isWalkable;
        } /* else {
            var isWalkable = true;
        } */
    } while (!isWalkable || isOutOfMap || (xDest == people.x && yDest == people.y));

    return new PIXI.Point(xDest, yDest);
}

function managePeople() {
    switch (people.state) {
        case 'START':
            // people.gotoDestination(new PIXI.Point(0.5 ,0.5));
            // people.state = 'MOVE';
            break;
        case 'IDLE':
            // Reinit people coords
            // people.x = +(people.x).toPrecision(2);
            // people.y = +(people.y).toPrecision(2);
            // console.log('IN IDLE');
            let point = findDestination();
            // console.log('Destination found', point);
            people.gotoDestination(point);
            people.state = 'MOVE';
            break;
        case 'MOVE':
            // console.log('IN MOVE');
            movePeople();
            drawPeople();
            if (people.reachDestination()) {
                people.state = 'SETTLE';
                // console.log(people);
                // Don't wait interval and go
                managePeople();
            }
            break;
        case 'SETTLE':
            let peopleIntX = Math.floor(people.x);
            let peopleIntY = Math.floor(people.y);
            // Get block under the people
            let block = blocksMap[peopleIntX][peopleIntY];
            // If flat and constructible
            if (block.type == '1111' && block.class == 'empty') {
                // Construct
                // console.log('settling on', block);
                block.class = 'house';
                // Make neighbours as fields
                for (neighbour of block.neighbours) {
                    blocksMap[neighbour.x][neighbour.y].class = 'field';
                    // Reference current house for later use (house destroy)
                    blocksMap[neighbour.x][neighbour.y].houses.push({x: peopleIntX, y: peopleIntY});
                }
                // Force map redraw
                redrawMap();
            } else {
                // Move
                people.state = 'IDLE';
                // Don't wait interval and go
                managePeople();
            }
            break;
    }
}

const loader = PIXI.Loader.shared;
loader.add("images/sprites.json").load(setup);

let sheet;

function setup() {
    sheet = loader.resources['images/sprites.json'];
    clearMap();
    generateProceduralMap();
    redrawMap();
    setInterval(() => {
        managePeople();
    }, 300);
}


// Stats
var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.querySelector('footer').appendChild(stats.dom);

function animate() {

    stats.begin();
    // monitored code goes here
    stats.end();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
