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
        if (player.length > 0) {
            var cells = getCellsArray();
            var direct = [0, 0];
            var weight = 0;
            for(var i = 0; i < cells.length; i++){
                if(this.isItMe(player, cells[i]))continue;
                var v_uni = this.unit([cells[i].x - player[0].x, cells[i].y - player[0].y]);
                var len = this.computeDistance(player[0].x, player[0].y, cells[i].x, cells[i].y, player[0].size, cells[i].size);
                if(this.isVirus(cells[i]) && this.isFood(player[0], cells[i]))weight = -1 * player[0].size * player[0].size * this.cost(Math.max(len - 100, 0.0001), 10);
                else if(this.isFood(player[0], cells[i]))weight = cells[i].size * cells[i].size * this.cost(len, 0.8);
                else if(this.isThreat(player[0], cells[i]))weight = -1 * player[0].size * player[0].size * this.cost(len);
                else weight = 0;
                direct[0]+= v_uni[0] * weight;
                direct[1]+= v_uni[1] * weight;
                if(Math.abs(weight) >= 1)drawPoint(player[0].x + (100 + player[0].size) * v_uni[0], player[0].y + (100 + player[0].size) * v_uni[1], 5, weight.toFixed());
                //drawLine(player[0].x, player[0].y, cells[i].x, cells[i].y, weight > 0 ? 1 : 5);
            }
            var center = Math.min(getMapEndX() - player[0].x, player[0].x - getMapStartX(), getMapEndY() - player[0].y, player[0].y - getMapStartY());
            weight = player[0].size * this.cost(center, 0.1);
            var v_cen = [player[0].x - (getMapStartX() + getMapEndX()) / 2, player[0].y - (getMapStartY() + getMapEndY()) / 2];
            v_cen = this.unit(v_cen);
            direct[0]+= v_cen[0] * -1 * weight;
            direct[1]+= v_cen[1] * -1 * weight;
            drawPoint(player[0].x + (100 + player[0].size) * -1 * v_cen[0], player[0].y + (100 + player[0].size) * -1 * v_cen[1], 5, weight.toFixed());
            //drawLine(player[0].x, player[0].y, (getMapStartX() + getMapEndX()) / 2, (getMapStartY() + getMapEndY()) / 2, 3);
            direct = this.unit(direct);
            //drawLine(player[0].x, player[0].y, player[0].x + direct[0] * player[0].size, player[0].y + direct[1] * player[0].size, 2);
            return [player[0].x + direct[0] * 100, player[0].y + direct[1] * 100];
        }
    }
    this.minmax = function(){
        var player = getPlayer();
        if(player.length > 0){
            var cells = getCellsArray();
            var bestDir = this.bestDirect(player[0], cells);
        }
    }
	this.getNeatInput = function(){ // try to get inputs for neat
		var player = getPlayer();
        if (player.length > 0) { //if player exist
			var playerId = player.map(function(value, index){return value.id;});
			//choose the max part
			var max_id = 0;
			for(var i=1; i<player.length; i++){
				if(player[i].size > player[max_id].size){
					max_id = i;
				}
			}
			//count cost
			var cost = [0, 0, 0, 0, 0, 0, 0, 0];
            var allIsIn = getCellsArray();
            for(var j = 0; j < allIsIn.length; j++){
                if(playerId.indexOf(allIsIn[j].id) >= 0)continue;
                var offsetX = allIsIn[j].x - player[max_id].x;
                var offsetY = allIsIn[j].y - player[max_id].y;
                var cellSize = allIsIn[j].size;
                var slope = offsetY / (offsetX + 0.001);
                var direct;

                if(slope > 2.44)direct = 4 * (offsetX > 0);
                else if(slope > 0.414)direct = 3 + 4 * (offsetX < 0);
                else if(slope > -0.414)direct = 2 + 4 * (offsetX < 0);
                else if(slope > -2.414)direct = 1 + 4 * (offsetX < 0);
                else direct = 4 * (offsetX < 0);

                var absX = offsetX>0 ? offsetX:-offsetX;
                var absY = offsetY>0 ? offsetY:-offsetY;
                var diffX = absX - player[max_id].size - cellSize;
                diffX = diffX>0 ? diffX:0;
                var diffY = absY - player[max_id].size - cellSize;
                diffY = diffY>0 ? diffY:0;
                var distance = diffX * diffX + diffY * diffY + 0.001;

                var ratio = cellSize / player[max_id].size;

                if(allIsIn[j].f){
                    cost[direct]-= ratio * 1000 / distance;
                }
                else if(cellSize * 1.33 < player[max_id].size)cost[direct]+= ratio * 10000 / distance;
                else if(cellSize > 1.1 * player[max_id].size)cost[direct]-= ratio * 10000 / distance;
            }

			return cost;
		}

	}

	this.NeatStruct = function(){
		this.numNode = 9;
		this.Node = [0, 1, 2, 3, 4, 5, 6, 7, 8];
		this.NodeOut = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
		this.NodeOutConfirmed = [0, 0, 0, 0, 0, 0, 0, 0, 0];

		this.numEdge = 8;
		this.Edge = [[0,8,1.0], [1,8,1.0], [2,8,1.0], [3,8,1.0], [4,8,1.0], [5,8,1.0], [6,8,1.0], [7,8,1.0]];
	}

	this.neat = function(){
		var input = this.getNeatInput();
		var struct = new this.NeatStruct();

        for(var i=0; i<8; i++){ //get inputs
			NodeOut[i] = input[i];
			NodeOutConfirmed[i] = 1;
		}
		for(var i=0; i<numEdge; i++){

		}


		return [0, 0];
	}

	this.version2 = function(){ //needs to be done: wall
        var player = getPlayer();
        if (player.length > 0) {
            var playerId = player.map(function(value, index){return value.id;});
            for(var i = 0; /*i < player.length*/ i < 1; i++){
                var cost = [];
                var allIsIn = getCellsArray();
				var numDirection = 32; //even number of direction
				for(var j=0; j<numDirection; j++){
					cost.push(0);
				}

                for(var j = 0; j < allIsIn.length; j++){
                    if(playerId.indexOf(allIsIn[j].id) >= 0)continue;
					//basic
                    var offsetX = allIsIn[j].x - player[i].x;
                    var offsetY = allIsIn[j].y - player[i].y;
					var offsetZ = Math.sqrt(offsetX*offsetX + offsetY*offsetY);
                    var cellSize = allIsIn[j].size;

					//compute directions
					var Rad = Math.atan2(offsetY, offsetX);
					var Rad2 = Math.atan(cellSize / offsetZ);
					var minDirection = Math.floor((Rad - Rad2) * numDirection / 2 / Math.PI) + numDirection / 2;
					var maxDirection = Math.floor((Rad + Rad2) * numDirection / 2 / Math.PI) + numDirection / 2;

					//distance minus size
					var absX = offsetX>0 ? offsetX:-offsetX;
					var absY = offsetY>0 ? offsetY:-offsetY;
					var diffX = absX - player[i].size - cellSize;
					diffX = diffX>0 ? diffX:0;
					var diffY = absY - player[i].size - cellSize;
					diffY = diffY>0 ? diffY:0;
					var distance = Math.sqrt(diffX * diffX + diffY * diffY + 0.00001);
					var ratio = cellSize / player[i].size;

					//for each direction in sight, count the cost
					for(var direction = minDirection; direction!=maxDirection+1; direction++){
						var realDirection = (direction+numDirection) % numDirection;
						if(allIsIn[j].f){
							if(distance<5 && cellSize<player[i].size)cost[realDirection]-= ratio * 1000 / distance;
							continue;
						}
						else if(cellSize * 1.33 < player[i].size)cost[realDirection]+= ratio * 10000 / distance;
						else if(cellSize > 1.0 * player[i].size)cost[realDirection]-= ratio * 10000 / distance;
					}
				}
				//console.log(cost);
				//deciding movement
				var bestDirect = 0;
				var worstDirect = 0;
				for(var j = 0; j < numDirection; j++){
					if(cost[j] > cost[bestDirect])bestDirect = j;
					if(cost[j] < cost[worstDirect])worstDirect = j;
				}
				if(cost[worstDirect] < -30){
					bestDirect = (worstDirect + numDirection/2)%numDirection;
				}
				//console.log(cost[bestDirect]);
				if(cost[bestDirect] == 0) return [0, 0];

				var bestRad = Math.PI + Math.PI/numDirection * (1 + bestDirect*2);
				return [player[i].x + 100*Math.cos(bestRad) , player[i].y + 100*Math.sin(bestRad)];
            }
        }
    }

	this.mainLoop = this.version1;
};
window.botList.push(new AposBot());


if ( typeof window.updateBotList == 'function' ) {
    window.updateBotList(); //This function might not exist yet.
} else {
    window.log("The launcher is not yet started.");
}
