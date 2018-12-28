// ==UserScript==
// @name        AposBot
// @namespace   AposBot
// @include     http://agar.io/*
// @include     http://agario.fun/*
// @version     3.653
// @grant       none
// @author      http://www.twitch.tv/apostolique
// @require     https://cdn.rawgit.com/eligrey/FileSaver.js/5ed507ef8aa53d8ecfea96d96bc7214cd2476fd2/FileSaver.min.js
// ==/UserScript==
window.log = function(message){
    if(window.logDebugging === true){
        console.log.apply(console, arguments);
    }
}
var f = window;
var g = window.jQuery;


window.log("Apos Bot!");

window.botList = window.botList || [];


function AposBot() {
    this.name = "Rikka's thigh";

    this.toggleFollow = false;
    this.keyAction = function(key) {
        if (key.keyCode === 81) {
            window.log("Toggle Follow Mouse!");
            this.toggleFollow = !this.toggleFollow;
        }
    };
    this.mod = function(num, mod) {
        if (mod & (mod - 1) === 0 && mod !== 0) {
            return num & (mod - 1);
        }
        return num < 0 ? ((num % mod) + mod) % mod : num % mod;
    };
    this.splitDistance = 710;

    this.isMerging = function(cell1, cell2) {
        var dist = this.computeDistance(cell1.x, cell1.y, cell2.x, cell2.y, cell1.size, cell2.size);

        //debug logging
		window.log("Merge:", [cell1.x, cell1.y, cell2.x, cell2.y, cell1.size, cell2.size, dist].join(", "))

        return dist <= -50;
    };

    //Given an angle value that was gotten from valueAndleBased(),
    //returns a new value that scales it appropriately.
    this.paraAngleValue = function(angleValue, range) {
        return (15 / (range[1])) * (angleValue * angleValue) - (range[1] / 6);
    };

    this.getMass = function(size) {
        return Math.pow(size / 10, 2);
    };

    this.valueAngleBased = function(angle, range) {
        var leftValue = this.mod(angle - range[0], 360);
        var rightValue = this.mod(this.rangeToAngle(range) - angle, 360);

        var bestValue = Math.min(leftValue, rightValue);

        if (bestValue <= range[1]) {
            return this.paraAngleValue(bestValue, range);
        }
        return -1;
    };

    this.computeDistance = function(x1, y1, x2, y2, s1, s2) {
        s1 = s1 || 0;
        s2 = s2 || 0;
        var xdis = x1 - x2;
        var ydis = y1 - y2;
        var distance = Math.max(Math.sqrt(xdis * xdis + ydis * ydis) - (s1 + s2), 0.0001);
        return distance;
    };

    this.computeManhattan = function(x1, y1, x2, y2, s1, s2) {
        s1 = s1 || 0;
        s2 = s2 || 0;
        var xdis = x1 > x2 ? x1 - x2 : x2 - x1;
        var ydis = y1 > y2 ? y1 - y2 : y2 - y1;
        var distance = xdis + ydis;
        return distance;
    };

    this.computeDistanceFromCircleEdgeDeprecated = function(x1, y1, x2, y2, s2) {
        var tempD = this.computeDistance(x1, y1, x2, y2);

        var offsetX = 0;
        var offsetY = 0;

        var ratioX = tempD / (x1 - x2);
        var ratioY = tempD / (y1 - y2);

        offsetX = x1 - (s2 / ratioX);
        offsetY = y1 - (s2 / ratioY);

        drawPoint(offsetX, offsetY, 5, "");

        return this.computeDistance(x2, y2, offsetX, offsetY);
    };

    this.compareSize = function(player1, player2, ratio) {
        return player1.size * player1.size * ratio < player2.size * player2.size;
    };

    this.canSplit = function(player1, player2) {
        return this.compareSize(player1, player2, 2.8) && !this.compareSize(player1, player2, 20);
    };

    this.isItMe = function(player, cell){
        for(var i = 0; i < player.length; i++){
            if(cell.id == player[i].id)return true;
        }
        return false;
    };

    this.isFood = function(player, cell){
        return this.compareSize(cell, player, 1.33) || (cell.size <= 13);
    };

    this.isThreat = function(player, cell) {
        return !this.isVirus(cell) && this.compareSize(player, cell, 1.3);
    };

    this.isVirus = function(cell) {
        return cell.f;
    };

    this.isSplitTarget = function(that, blob, cell) {
        if (that.canSplit(cell, blob)) {
            return true;
        }
        return false;
    };

    this.getTimeToRemerge = function(mass){
        return Math.max(30, Math.floor(mass*0.02));
        //return ((mass*0.02) + 30);
    };

    this.separateListBasedOnFunction = function(that, listToUse, blob) {
        var foodElementList = [];
        var threatList = [];
        var virusList = [];
        var splitTargetList = [];

        var player = getPlayer();

        var mergeList = [];

        Object.keys(listToUse).forEach(function(element, index) {
            var isMe = that.isItMe(player, listToUse[element]);

            if (!isMe) {
                if (that.isFood(blob, listToUse[element]) && listToUse[element].isNotMoving()) {
                    //IT'S FOOD!
                    foodElementList.push(listToUse[element]);


                } else if (that.isThreat(blob, listToUse[element])) {
                    //IT'S DANGER!
                    threatList.push(listToUse[element]);
                    mergeList.push(listToUse[element]);
                } else if (that.isVirus(blob, listToUse[element])) {
                    //IT'S VIRUS!
                    virusList.push(listToUse[element]);
                }
                else if (that.isSplitTarget(that, blob, listToUse[element])) {
                        drawCircle(listToUse[element].x, listToUse[element].y, listToUse[element].size + 50, 7);
                        splitTargetList.push(listToUse[element]);
                        //foodElementList.push(listToUse[element]);
                        mergeList.push(listToUse[element]);
                }
                else {if (that.isVirus(null, listToUse[element])==false) {mergeList.push(listToUse[element]);}
                    }
            }/*else if(isMe && (getBlobCount(getPlayer()) > 0)){
                //Attempt to make the other cell follow the mother one
                foodElementList.push(listToUse[element]);
            }*/
        });

        foodList = [];
        for (var i = 0; i < foodElementList.length; i++) {
            foodList.push([foodElementList[i].x, foodElementList[i].y, foodElementList[i].size]);
        }

        //cell merging
        for (var i = 0; i < mergeList.length; i++) {
            for (var z = 0; z < mergeList.length; z++) {
                if (z != i && that.isMerging(mergeList[i], mergeList[z])) { //z != i &&
                        //found cells that appear to be merging - if they constitute a threat add them to the theatlist

                        //clone us a new cell
                        var newThreat = {};
                        var prop;

                        for (prop in mergeList[i]) {
                            newThreat[prop] = mergeList[i][prop];
                        }

                        //average distance and sum the size
                        newThreat.x = (mergeList[i].x + mergeList[z].x)/2;
                        newThreat.y = (mergeList[i].y + mergeList[z].y)/2;
                        newThreat.size = (mergeList[i].size + mergeList[z].size);
                        newThreat.nopredict = true;
                        //check its a threat
                        if (that.isThreat(blob, newThreat)) {
                             //IT'S DANGER!
                            threatList.push(newThreat);
                        }

                }
            }
        }

        return [foodList, threatList, virusList, splitTargetList];
    };

    this.getAll = function(blob) {
        var dotList = [];
        var player = getPlayer();
        var interNodes = getMemoryCells();

        dotList = this.separateListBasedOnFunction(this, interNodes, blob);

        return dotList;
    };

    this.clusterFood = function(foodList, blobSize) {
        var clusters = [];
        var addedCluster = false;

        //1: x
        //2: y
        //3: size or value
        //4: Angle, not set here.

        for (var i = 0; i < foodList.length; i++) {
            for (var j = 0; j < clusters.length; j++) {
                if (this.computeManhattan(foodList[i][0], foodList[i][1], clusters[j][0], clusters[j][1]) < blobSize * 2) {
                    clusters[j][0] = (foodList[i][0] + clusters[j][0]) / 2;
                    clusters[j][1] = (foodList[i][1] + clusters[j][1]) / 2;
                    clusters[j][2] += foodList[i][2];
                    addedCluster = true;
                    break;
                }
            }
            if (!addedCluster) {
                clusters.push([foodList[i][0], foodList[i][1], foodList[i][2], 0]);
            }
            addedCluster = false;
        }
        return clusters;
    };

    this.getAngle = function(x1, y1, x2, y2) {
        //Handle vertical and horizontal lines.

        if (x1 == x2) {
            if (y1 < y2) {
                return 271;
                //return 89;
            } else {
                return 89;
            }
        }

        return (Math.round(Math.atan2(-(y1 - y2), -(x1 - x2)) / Math.PI * 180 + 180));
    };

    this.slope = function(x1, y1, x2, y2) {
        var m = (y1 - y2) / (x1 - x2);

        return m;
    };

    this.slopeFromAngle = function(degree) {
        if (degree == 270) {
            degree = 271;
        } else if (degree == 90) {
            degree = 91;
        }
        return Math.tan((degree - 180) / 180 * Math.PI);
    };

    //Given two points on a line, finds the slope of a perpendicular line crossing it.
    this.inverseSlope = function(x1, y1, x2, y2) {
        var m = this.slope(x1, y1, x2, y2);
        return (-1) / m;
    };

    //Given a slope and an offset, returns two points on that line.
    this.pointsOnLine = function(slope, useX, useY, distance) {
        var b = useY - slope * useX;
        var r = Math.sqrt(1 + slope * slope);

        var newX1 = (useX + (distance / r));
        var newY1 = (useY + ((distance * slope) / r));
        var newX2 = (useX + ((-distance) / r));
        var newY2 = (useY + (((-distance) * slope) / r));

        return [
            [newX1, newY1],
            [newX2, newY2]
        ];
    };

    this.followAngle = function(angle, useX, useY, distance) {
        var slope = this.slopeFromAngle(angle);
        var coords = this.pointsOnLine(slope, useX, useY, distance);

        var side = this.mod(angle - 90, 360);
        if (side < 180) {
            return coords[1];
        } else {
            return coords[0];
        }
    };

    //Using a line formed from point a to b, tells if point c is on S side of that line.
    this.isSideLine = function(a, b, c) {
        if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0) {
            return true;
        }
        return false;
    };

    //angle range2 is within angle range2
    //an Angle is a point and a distance between an other point [5, 40]
    this.angleRangeIsWithin = function(range1, range2) {
        if (range2[0] == this.mod(range2[0] + range2[1], 360)) {
            return true;
        }
        window.log("r1: " + range1[0] + ", " + range1[1] + " ... r2: " + range2[0] + ", " + range2[1]);

        var distanceFrom0 = this.mod(range1[0] - range2[0], 360);
        var distanceFrom1 = this.mod(range1[1] - range2[0], 360);

        if (distanceFrom0 < range2[1] && distanceFrom1 < range2[1] && distanceFrom0 < distanceFrom1) {
            return true;
        }
        return false;
    };

    this.angleRangeIsWithinInverted = function(range1, range2) {
        var distanceFrom0 = this.mod(range1[0] - range2[0], 360);
        var distanceFrom1 = this.mod(range1[1] - range2[0], 360);

        if (distanceFrom0 < range2[1] && distanceFrom1 < range2[1] && distanceFrom0 > distanceFrom1) {
            return true;
        }
        return false;
    };

    this.angleIsWithin = function(angle, range) {
        var diff = this.mod(this.rangeToAngle(range) - angle, 360);
        if (diff >= 0 && diff <= range[1]) {
            return true;
        }
        return false;
    };

    this.rangeToAngle = function(range) {
        return this.mod(range[0] + range[1], 360);
    };

    this.anglePair = function(range) {
        return (range[0] + ", " + this.rangeToAngle(range) + " range: " + range[1]);
    };

    this.computeAngleRanges = function(blob1, blob2) {
        var mainAngle = this.getAngle(blob1.x, blob1.y, blob2.x, blob2.y);
        var leftAngle = this.mod(mainAngle - 90, 360);
        var rightAngle = this.mod(mainAngle + 90, 360);

        var blob1Left = this.followAngle(leftAngle, blob1.x, blob1.y, blob1.size);
        var blob1Right = this.followAngle(rightAngle, blob1.x, blob1.y, blob1.size);

        var blob2Left = this.followAngle(rightAngle, blob2.x, blob2.y, blob2.size);
        var blob2Right = this.followAngle(leftAngle, blob2.x, blob2.y, blob2.size);

        var blob1AngleLeft = this.getAngle(blob2.x, blob2.y, blob1Left[0], blob1Left[1]);
        var blob1AngleRight = this.getAngle(blob2.x, blob2.y, blob1Right[0], blob1Right[1]);

        var blob2AngleLeft = this.getAngle(blob1.x, blob1.y, blob2Left[0], blob2Left[1]);
        var blob2AngleRight = this.getAngle(blob1.x, blob1.y, blob2Right[0], blob2Right[1]);

        var blob1Range = this.mod(blob1AngleRight - blob1AngleLeft, 360);
        var blob2Range = this.mod(blob2AngleRight - blob2AngleLeft, 360);

        var tempLine = this.followAngle(blob2AngleLeft, blob2Left[0], blob2Left[1], 400);
        //drawLine(blob2Left[0], blob2Left[1], tempLine[0], tempLine[1], 0);

        if ((blob1Range / blob2Range) > 1) {
            drawPoint(blob1Left[0], blob1Left[1], 3, "");
            drawPoint(blob1Right[0], blob1Right[1], 3, "");
            drawPoint(blob1.x, blob1.y, 3, "" + blob1Range + ", " + blob2Range + " R: " + (Math.round((blob1Range / blob2Range) * 1000) / 1000));
        }

        //drawPoint(blob2.x, blob2.y, 3, "" + blob1Range);
    };

    this.debugAngle = function(angle, text) {
        var player = getPlayer();
        var line1 = this.followAngle(angle, player[0].x, player[0].y, 300);
        drawLine(player[0].x, player[0].y, line1[0], line1[1], 5);
        drawPoint(line1[0], line1[1], 5, "" + text);
    };

    //TODO: Don't let this function do the radius math.
    this.getEdgeLinesFromPoint = function(blob1, blob2, radius) {
        var px = blob1.x;
        var py = blob1.y;

        var cx = blob2.x;
        var cy = blob2.y;

        //var radius = blob2.size;

        /*if (blob2.isVirus()) {
            radius = blob1.size;
        } else if(canSplit(blob1, blob2)) {
            radius += splitDistance;
        } else {
            radius += blob1.size * 2;
        }*/

        var shouldInvert = false;

        var tempRadius = this.computeDistance(px, py, cx, cy);
        if (tempRadius <= radius) {
            radius = tempRadius - 5;
            shouldInvert = true;
        }

        var dx = cx - px;
        var dy = cy - py;
        var dd = Math.sqrt(dx * dx + dy * dy);
        var a = Math.asin(radius / dd);
        var b = Math.atan2(dy, dx);

        var t = b - a;
        var ta = {
            x: radius * Math.sin(t),
            y: radius * -Math.cos(t)
        };

        t = b + a;
        var tb = {
            x: radius * -Math.sin(t),
            y: radius * Math.cos(t)
        };

        var angleLeft = this.getAngle(cx + ta.x, cy + ta.y, px, py);
        var angleRight = this.getAngle(cx + tb.x, cy + tb.y, px, py);
        var angleDistance = this.mod(angleRight - angleLeft, 360);

        return [angleLeft, angleDistance, [cx + tb.x, cy + tb.y],
            [cx + ta.x, cy + ta.y]
        ];
    };

    this.addWall = function(listToUse, blob) {
        var distanceFromWallY = 1000;
        var distanceFromWallX = 1000;
        if (blob.x < getMapStartX() + distanceFromWallX) {
            //LEFT
            window.log("Left");
            listToUse.push([
                [115, true],
                [245, false], this.computeInexpensiveDistance(getMapStartX(), blob.y, blob.x, blob.y)
            ]);
            var lineLeft = this.followAngle(115, blob.x, blob.y, 190 + blob.size);
            var lineRight = this.followAngle(245, blob.x, blob.y, 190 + blob.size);
            drawLine(blob.x, blob.y, lineLeft[0], lineLeft[1], 5);
            drawLine(blob.x, blob.y, lineRight[0], lineRight[1], 5);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob.x, blob.y, 5);
        }
        if (blob.y < getMapStartY() + distanceFromWallY) {
            window.log("TOP");
            listToUse.push([
                [205, true],
                [335, false], this.computeInexpensiveDistance(blob.x, getMapStartY(), blob.x, blob.y)
            ]);
            var lineLeft = this.followAngle(205, blob.x, blob.y, 190 + blob.size);
            var lineRight = this.followAngle(335, blob.x, blob.y, 190 + blob.size);
            drawLine(blob.x, blob.y, lineLeft[0], lineLeft[1], 5);
            drawLine(blob.x, blob.y, lineRight[0], lineRight[1], 5);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob.x, blob.y, 5);
        }
        if (blob.x > getMapEndX() - distanceFromWallX) {
            window.log("RIGHT");
            listToUse.push([
                [295, true],
                [65, false], this.computeInexpensiveDistance(getMapEndX(), blob.y, blob.x, blob.y)
            ]);
            var lineLeft = this.followAngle(295, blob.x, blob.y, 190 + blob.size);
            var lineRight = this.followAngle(65, blob.x, blob.y, 190 + blob.size);
            drawLine(blob.x, blob.y, lineLeft[0], lineLeft[1], 5);
            drawLine(blob.x, blob.y, lineRight[0], lineRight[1], 5);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob.x, blob.y, 5);
        }
        if (blob.y > getMapEndY() - distanceFromWallY) {
            window.log("BOTTOM");
            listToUse.push([
                [25, true],
                [155, false], this.computeInexpensiveDistance(blob.x, getMapEndY(), blob.x, blob.y)
            ]);
            var lineLeft = this.followAngle(25, blob.x, blob.y, 190 + blob.size);
            var lineRight = this.followAngle(155, blob.x, blob.y, 190 + blob.size);
            drawLine(blob.x, blob.y, lineLeft[0], lineLeft[1], 5);
            drawLine(blob.x, blob.y, lineRight[0], lineRight[1], 5);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob.x, blob.y, 5);
        }
        return listToUse;
    };

    this.getAngleIndex = function(listToUse, angle) {
        if (listToUse.length === 0) {
            return 0;
        }

        for (var i = 0; i < listToUse.length; i++) {
            if (angle <= listToUse[i][0]) {
                return i;
            }
        }

        return listToUse.length;
    };

    this.addAngle = function(listToUse, range) {
        var newListToUse = listToUse.slice();

        var startIndex = 1;

        if (newListToUse.length > 0 && !newListToUse[0][1]) {
            startIndex = 0;
        }

        var startMark = this.getAngleIndex(newListToUse, range[0][0]);
        var startBool = this.mod(startMark, 2) != startIndex;

        var endMark = this.getAngleIndex(newListToUse, range[1][0]);
        var endBool = this.mod(endMark, 2) != startIndex;

        var removeList = [];

        if (startMark != endMark) {
            var biggerList = 0;
            if (endMark == newListToUse.length) {
                biggerList = 1;
            }

            for (var i = startMark; i < startMark + this.mod(endMark - startMark, newListToUse.length + biggerList); i++) {
                removeList.push(this.mod(i, newListToUse.length));
            }
        } else if (startMark < newListToUse.length && endMark < newListToUse.length) {
            var startDist = this.mod(newListToUse[startMark][0] - range[0][0], 360);
            var endDist = this.mod(newListToUse[endMark][0] - range[1][0], 360);

            if (startDist < endDist) {
                for (var i = 0; i < newListToUse.length; i++) {
                    removeList.push(i);
                }
            }
        }

        removeList.sort(function(a, b){return b-a;});

        for (var i = 0; i < removeList.length; i++) {
            newListToUse.splice(removeList[i], 1);
        }

        if (startBool) {
            newListToUse.splice(this.getAngleIndex(newListToUse, range[0][0]), 0, range[0]);
        }
        if (endBool) {
            newListToUse.splice(this.getAngleIndex(newListToUse, range[1][0]), 0, range[1]);
        }

        return newListToUse;
    };

    this.getAngleRange = function(blob1, blob2, index, radius) {
        var angleStuff = this.getEdgeLinesFromPoint(blob1, blob2, radius);

        var leftAngle = angleStuff[0];
        var rightAngle = this.rangeToAngle(angleStuff);
        var difference = angleStuff[1];

        drawPoint(angleStuff[2][0], angleStuff[2][1], 3, "");
        drawPoint(angleStuff[3][0], angleStuff[3][1], 3, "");

        window.log("Adding badAngles: " + leftAngle + ", " + rightAngle + " diff: " + difference);

        var lineLeft = this.followAngle(leftAngle, blob1.x, blob1.y, 150 + blob1.size - index * 10);
        var lineRight = this.followAngle(rightAngle, blob1.x, blob1.y, 150 + blob1.size - index * 10);

        if (blob2.isVirus()) {
            drawLine(blob1.x, blob1.y, lineLeft[0], lineLeft[1], 6);
            drawLine(blob1.x, blob1.y, lineRight[0], lineRight[1], 6);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob1.x, blob1.y, 6);
        } else if(getCells().hasOwnProperty(blob2.id)) {
            drawLine(blob1.x, blob1.y, lineLeft[0], lineLeft[1], 0);
            drawLine(blob1.x, blob1.y, lineRight[0], lineRight[1], 0);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob1.x, blob1.y, 0);
        } else {
            drawLine(blob1.x, blob1.y, lineLeft[0], lineLeft[1], 3);
            drawLine(blob1.x, blob1.y, lineRight[0], lineRight[1], 3);
            drawArc(lineLeft[0], lineLeft[1], lineRight[0], lineRight[1], blob1.x, blob1.y, 3);
        }

        return [leftAngle, difference];
    };

    //Given a list of conditions, shift the angle to the closest available spot respecting the range given.
    this.shiftAngle = function(listToUse, angle, range) {
        //TODO: shiftAngle needs to respect the range! DONE?
        for (var i = 0; i < listToUse.length; i++) {
            if (this.angleIsWithin(angle, listToUse[i])) {
                window.log("Shifting needed!");

                var angle1 = listToUse[i][0];
                var angle2 = this.rangeToAngle(listToUse[i]);

                var dist1 = this.mod(angle - angle1, 360);
                var dist2 = this.mod(angle2 - angle, 360);

                if (dist1 < dist2) {
                    if (this.angleIsWithin(angle1, range)) {
                        return angle1;
                    } else {
                        return angle2;
                    }
                } else {
                    if (this.angleIsWithin(angle2, range)) {
                        return angle2;
                    } else {
                        return angle1;
                    }
                }
            }
        }
        window.log("No Shifting Was needed!");
        return angle;
    };

    /**
     * This is the main bot logic. This is called quite often.
     * @return A 2 dimensional array with coordinates for every cells.  [[x, y], [x, y]]
     */
    this.eatNearest = function(){
        var player = getPlayer();
        if(player.length){
            var foodList = getCellsArray();
            if(foodList.length === 1)return [0, 0];
            var bestDist = 1000000;
            var bestIdx = 0;
            for(var i = 0; i < foodList.length; i++){
                if(this.isItMe(player, foodList[i]))continue;
                if(this.isFood(player[0], foodList[i])){
                    var curDist = this.computeDistance(player[0].x, player[0].y, foodList[i].x, foodList[i].y);
                    if(curDist < bestDist){
                        bestDist = curDist;
                        bestIdx = i;
                    }
                }
            }
            return [foodList[bestIdx].x, foodList[bestIdx].y];
        }
    }
    this.cost = function(x, offset){
        x/= 128;
        offset = offset || 1;
        x*= offset;
        return Math.exp(-1 * x);
    }
    this.unit = function(v){
        var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        return [v[0] / len, v[1] / len];
    }
    this.version1 = function(){
        var player = getPlayer();
        var isItMe = this.isItMe;
        var cells = getCellsArray().filter(function(item, index, array){
            return !(isItMe(player, item));
        });
        if(player.length > 0){
            var direct = [0, 0];
            var weight;
            for(var i = 0; i < player.length; i++){
                var best = this.bestDir(player[i], cells);
                direct[0]+= best[0] * player[i].size;
                direct[1]+= best[1] * player[i].size;
            }
            direct = this.unit(direct);
            return [player[0].x + direct[0] * 1000, player[0].y + direct[1] * 1000];
        }
    }
    /*
    this.bestDir = function(player, cells){
        var direct = [0, 0];
        var weight;
        for(var i = 0; i < cells.length; i++){
            var Vu = this.unit([cells[i].x - player.x, cells[i].y - player.y]);
            var Len = this.computeDistance(player.x, player.y, cells[i].x, cells[i].y, player.size, cells[i].size);
            if(this.isVirus(cells[i]) && this.isFood(player, cells[i]))weight = -1 * player.size * player.size * this.cost(Len, 10);
            else if(this.isFood(player, cells[i]))weight = cells[i].size * cells[i].size * this.cost(Len, 0,8);
            else if(this.isThreat(player, cells[i]))weight = -1 * player[i].size * player[i].size * this.cost(Len);
            else weight = 0;
            for(var k = 0; k < 2; k++)direct[k]+= Vu[k] * weight;
        }
        var Cen = Math.min(getMapEndX() - player.x, player.x - getMapStartX(), getMapEndY() - player.y, player.y - getMapStartY());
        weight = player.size * player.size * this.cost(Cen, 0.1);
        var Vu = [player.x - (getMapStartX() + getMapEndX()) / 2, player.y - (getMapStartY() + getMapEndY()) / 2];
        Vu = this.unit(Vu);
        for(var j = 0; j <= 1; j++)direct[j]+= -1 * Vu[j] * weight;
        direct = this.unit(direct);
        return direct;
    }
    this.minmax = function(){
        var player = getPlayer();
        if(player.length > 0){
            var cells = getCellsArray();
            var bestDir = this.bestDirect(player[0], cells);
        }
    }
	*/
    this.sendPost = function(cost, x, y){
		var str = "";
		for(var i=0; i<8; i++)
			str = str + String(cost[i]) + " ";
		str = str + String(x) + " " + String(y);

        window.needed = str;
	}

	this.RadToDirect = function(rad, numDirection){
		return Math.floor(rad * numDirection / 2 / Math.PI) + numDirection / 2;
	}

	this.DirectToRad = function(Direct, numDirection){
		Direct = (Direct + numDirection) % numDirection;
		return Math.PI + Math.PI/numDirection * (1 + Direct*2);
	}

	this.version2 = function(){ //needs to be done: wall
        var player = getPlayer();
        if (player.length > 0) {
            var playerId = player.map(function(value, index){return value.id;});

			//choose the id with max size
			var i = 0;
			for(var j=0; j<player.length; j++){
				if(player[j].size > player[i].size) i = j;
			}

			var numDirection = 8; //even number of direction
			var cost = [];
			for(var j=0; j<numDirection; j++) cost.push(0);
			var allIsIn = getCellsArray();
			var pX = player[i].x;
			var pY = player[i].y;
			var pSize = player[i].size;

            for(var j = 0; j < allIsIn.length; j++){
                if(playerId.indexOf(allIsIn[j].id) >= 0)continue; //self
				//basic
                var offsetX = allIsIn[j].x - pX;
                var offsetY = allIsIn[j].y - pY;
				var offsetZ = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
                var cellSize = allIsIn[j].size;
				//compute directions and rads
				var Rad = Math.atan2(offsetY, offsetX);
				var Rad2 = Math.atan(1.2* cellSize / offsetZ);
				var minDirection = this.RadToDirect(Rad - Rad2, numDirection);
				var maxDirection = this.RadToDirect(Rad + Rad2, numDirection);
				//distance
				var distance = this.computeDistance(pX, pY, allIsIn[j].x, allIsIn[j].y, pSize, cellSize);
				var ratio = cellSize / pSize;
				//for each direction in sight, count the cost
				for(var direction = minDirection; direction!=maxDirection+1; direction++){
					if(this.isVirus(allIsIn[j])){
						if(ratio < 1) cost[direction]-= ratio * Math.min(30*pSize , 3000 / distance);
						continue;
					}
					else if(cellSize * 1.16 < pSize) cost[direction]+= ratio * Math.min(100*cellSize ,  10000 / distance);
					else if(cellSize > 1.1 * pSize)  cost[direction]-= ratio * Math.min(30*cellSize ,  3000 / distance);
				}
			}

			//send data to global
			this.sendPost(cost, pX, pY);

			//get worst and best direction
			var worstDirect = 0;
			var bestDirect = 0;
			for(var j = 0; j < numDirection; j++){
				if(cost[j] > cost[bestDirect])bestDirect = j;
				if(cost[j] < cost[worstDirect])worstDirect = j;
			}

			//drawing and return
			var drawRadius = pSize * 1.3;
			drawCircle(player[i].x, player[i].y, drawRadius, 4);

			if(Math.abs(cost[worstDirect]) > Math.abs(cost[bestDirect])){
				worstDirect = (worstDirect + numDirection/2) % numDirection; //inverse the direction
				var worstRad = this.DirectToRad(worstDirect, numDirection);

				//drawing
				var startRad = this.DirectToRad(worstDirect - 0.5, numDirection);
				var endRad =   this.DirectToRad(worstDirect + 0.5, numDirection);
				drawArc(pX + drawRadius * Math.cos(startRad), pY + drawRadius * Math.sin(startRad)
				, pX + drawRadius * Math.cos(endRad), pY + drawRadius * Math.sin(endRad)
				, pX, pY, 5);
				drawPoint(pX + drawRadius * Math.cos(worstRad), pY + drawRadius * Math.sin(worstRad), 5, cost[worstDirect].toFixed(2));

				return [pX + 10 * pSize * Math.cos(worstRad), pY + 10 * pSize * Math.sin(worstRad)];
			}
			else{
				var bestRad = this.DirectToRad(bestDirect, numDirection);
				var startRad = this.DirectToRad(bestDirect - 0.5, numDirection);
				var endRad =   this.DirectToRad(bestDirect + 0.5, numDirection);

				drawArc(pX + drawRadius * Math.cos(startRad), pY + drawRadius * Math.sin(startRad)
				, pX + drawRadius * Math.cos(endRad), pY + drawRadius * Math.sin(endRad)
				, pX, pY, 2);
				drawPoint(pX + drawRadius * Math.cos(bestRad), pY + drawRadius * Math.sin(bestRad), 5, cost[bestDirect].toFixed(2));

				return [pX + 10 * pSize * Math.cos(bestRad), pY + 10 * pSize * Math.sin(bestRad)];
			}
        }


    }

	this.worstDir = function(player, cells){
        var playerId = player.map(function(value, index){return value.id;});

		var numDirection = 8; //even number of direction
		var cost = [];
		for(var j=0; j<numDirection; j++) cost.push(0);
		var allIsIn = cells;
		var pX = player[i].x;
		var pY = player[i].y;
		var pSize = player[i].size;

        for(var j = 0; j < allIsIn.length; j++){
            if(playerId.indexOf(allIsIn[j].id) >= 0)continue; //self
			//basic
            var offsetX = allIsIn[j].x - pX;
            var offsetY = allIsIn[j].y - pY;
			var offsetZ = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
            var cellSize = allIsIn[j].size;
			//compute directions and rads
		    var Rad = Math.atan2(offsetY, offsetX);
			var Rad2 = Math.atan(1.2* cellSize / offsetZ);
			var minDirection = this.RadToDirect(Rad - Rad2, numDirection);
			var maxDirection = this.RadToDirect(Rad + Rad2, numDirection);
			//distance
			var distance = this.computeDistance(pX, pY, allIsIn[j].x, allIsIn[j].y, pSize, cellSize);
			var ratio = cellSize / pSize;
			//for each direction in sight, count the cost
			for(var direction = minDirection; direction!=maxDirection+1; direction++){
				if(this.isVirus(allIsIn[j])){
					if(ratio < 1) cost[direction]-= ratio * Math.min(30*pSize , 3000 / distance);
					continue;
				}
				else if(cellSize * 1.16 < pSize) cost[direction]+= ratio * Math.min(100*cellSize ,  10000 / distance);
				else if(cellSize > 1.1 * pSize)  cost[direction]-= ratio * Math.min(30*cellSize ,  3000 / distance);
			}
		}
		//get worst and best direction
		var worstDirect = 0;
		var bestDirect = 0;
		for(var j = 0; j < numDirection; j++){
			if(cost[j] > cost[bestDirect])bestDirect = j;
			if(cost[j] < cost[worstDirect])worstDirect = j;
		}

		//return
		if(Math.abs(cost[worstDirect]) > Math.abs(cost[bestDirect])){
			worstDirect = (worstDirect + numDirection/2) % numDirection; //inverse the direction
			var worstRad = this.DirectToRad(worstDirect, numDirection);
			return [Math.cos(worstRad), Math.sin(worstRad)];
		}
		else{
			var bestRad = this.DirectToRad(bestDirect, numDirection);
			return [Math.cos(bestRad), Math.sin(bestRad)];
		}
	}

	this.mainLoop = this.version2;
};
window.botList.push(new AposBot());


if ( typeof window.updateBotList == 'function' ) {
    window.updateBotList(); //This function might not exist yet.
} else {
    window.log("The launcher is not yet started.");
}
