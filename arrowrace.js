// This class holds it all. Not very nice, but it works
class Track {
    // Loads the track and displays it
    constructor(trackName, cellWidth, maxRounds, epsilon, learningRate, discount) {
        // Initializing variables
        this.epsilon = epsilon;
        this.learningRate = learningRate;
        this.discount = discount;
        this.maxRounds = maxRounds;
        this.cellWidth = cellWidth;
        
        // Set context
        this.trackCanvas = document.getElementById('track');
        this.trackContext = this.trackCanvas.getContext('2d');

        // Initializes the qTable;
        this.qTable = new Map();

        // Load default track
        this.track = new Image();
        this.track.src = trackName + '.png';
        this.coordinates = [];
        this.track.onload = function() {
            this.resetTrack();
        }.bind(this);
    }

    // Loads the track (from given file) with error handling and displays it on the canvas
    loadTrack(files) {
        var fr = new FileReader();

        fr.onload = function () {
            this.track.src = fr.result;
        }.bind(this)
        fr.readAsDataURL(files[0]);

        this.track = new Image();
        this.track.onload = function() {
            this.resetTrack();
        }.bind(this)
    }

    // Change the cell width
    setWidth(width) {
        this.cellWidth = parseInt(width, 10);
        this.resetTrack();
    }

    // Runs the algorithm
    run() {
        // Resets the Q-table
        this.qTable.clear();

        // Draw track (without cells, so we can identify the track/border/start&finish)
        this.resetTrack(true);

        // Get coordinates of the track (x, y), including a start/finish flag
        this.coordinates = this.getCoordinates();
        if (!this.startAndFinish) {
            this.resetTrack();
            alert('No start/finish found at coordinates.');
        } else {
            // For each cell, find the distances to the finish
            this.getDistancesToFinish();

            // Get the starting point of the track
            this.startingPoint = this.getStartingPoint();
            this.currentPosition = this.startingPoint;

            // Draw track (again, but this time -with- the cells)
            this.resetTrack();

            // Initialize the number of played rounds/tries 
            this.rounds = 0;
            this.tries = 0;

            // Start race
            // While if the maxRounds has not yet been reached
            while(this.rounds < this.maxRounds) {
                this.startNewRace();
            }

            // Draw the best route found
            this.drawBestRoute();
        }
    }

    // Updates the track
    resetTrack(noCells) {
        // Empty canvas
        this.trackContext.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
        
        // Draw the track
        this.trackContext.drawImage(this.track, 0, 0);

        // Draw the cells
        if (!noCells) {
            this.drawCells();
        }
    }

    // Draw the cells / matrix
    drawCells() {
        this.trackContext.beginPath();   
        this.trackContext.strokeStyle = 'grey';    
        this.trackContext.lineWidth = 1;    
        for(let y=0; y<this.trackCanvas.height; y+=this.cellWidth) {
            this.trackContext.moveTo(0, y);
            this.trackContext.lineTo(this.trackCanvas.width, y);
        }
        for(let x=0; x<this.trackCanvas.width; x+=this.cellWidth) {
            this.trackContext.moveTo(x, 0);
            this.trackContext.lineTo(x, this.trackCanvas.height);
        }
        this.trackContext.stroke();
    }

    // Draws the best route currently found
    // Basically by finding the best move, execute it according to the games logic,
    // findint the best move for the new position, etc.
    drawBestRoute() {
        // But only if there is a route
        if( this.arrow != undefined ) {
            this.trackContext.beginPath();   
            this.trackContext.strokeStyle = 'green';
            this.trackContext.moveTo(this.arrow.positions[ 0 ][ 0 ], this.arrow.positions[ 0 ][ 1 ]);  
            this.trackContext.lineWidth = 10;    

            let bestArrow = {
                speedX: 0,
                speedY: 0,
                x: this.arrow.positions[ 0 ][ 0 ], 
                y: this.arrow.positions[ 0 ][ 1 ]
            }
            let bestAction = this.getBestAction( 
                this.getState( 
                    bestArrow.x,
                    bestArrow.y,
                    bestArrow.speedX,
                    bestArrow.speedY,
                    true
                ) 
            );
            
            while(bestAction != undefined) {

                // Execute action
                switch (bestAction) {
                    case 0: bestArrow.speedX-=this.cellWidth; bestArrow.speedY-=this.cellWidth; break;    // top left
                    case 1: bestArrow.speedY-=this.cellWidth; break;                                       // top
                    case 2: bestArrow.speedX+=this.cellWidth; bestArrow.speedY-=this.cellWidth; break;    // top right
                    case 3: bestArrow.speedX-=this.cellWidth; break;                                       // left
                    case 4: break;                                                                          // center
                    case 5: bestArrow.speedX+=this.cellWidth; break;                                       // right
                    case 6: bestArrow.speedX-=this.cellWidth; bestArrow.speedY+=this.cellWidth; break;    // bottom left
                    case 7: bestArrow.speedY+=this.cellWidth; break;                                       // bottom
                    case 8: bestArrow.speedX+=this.cellWidth; bestArrow.speedY+=this.cellWidth; break;    // bottom right
                }

                // Move with the current speeds
                bestArrow.x += bestArrow.speedX;
                bestArrow.y += bestArrow.speedY;

                this.trackContext.lineTo(bestArrow.x, bestArrow.y);
            
                bestAction = this.getBestAction( 
                    this.getState( 
                        bestArrow.x,
                        bestArrow.y,
                        bestArrow.speedX,
                        bestArrow.speedY,
                        true
                    ) 
                );
            }
            
            this.trackContext.stroke();
        }
    }

    // Get the coordinates (x, y) of the track, including a start/finish flag and the distance to the finish
    getCoordinates() {
        // Load track coordinates
        let finish = false;
        let coordinates = [];
        for (let y=0; y<this.trackCanvas.height; y++) {
            for (let x=0; x<this.trackCanvas.width; x++) {
                // only relevant coordinates 
                if ((x % this.cellWidth == 0) && (y % this.cellWidth == 0)) {
                    let pixel = this.trackContext.getImageData(x, y, 1, 1).data;        
                    // Red?
                    if (pixel[0] > 250) {
                        // Blue and green?
                        if (pixel[1] > 250 && pixel[2] > 250) {
                            // White = Track
                            finish = false;
                        } else {
                            // Red = Start/Finish
                            finish = true;
                        }

                        // Add coordinate to array
                        let coordinate = {
                            x: x,
                            y: y,
                            finish: finish
                        }
                        coordinates.push( coordinate );
                    }
                }
            }
        }
        
        // Check if start/finish is found
        if (!coordinates.some(element => element.finish == true)) {
            this.startAndFinish = false;
        } else {
            this.startAndFinish = true;
        }

        return coordinates;
    }

    // Finds the distance to the finish for each coordinate
    // Works by working from the finish, back to the start
    getDistancesToFinish() {
        // Add the distance to the finish
        // Set the start/finish itself to 0
        for(let i=0; i<this.coordinates.length; i++) {
            if (this.coordinates[i].finish) {
                this.coordinates[i].cellsToFinish = 0
            }
        }

        // Now set the distance to 1 for every cell that is 1 distance away to the left
        for(let i=0; i<this.coordinates.length; i++) {
            if (this.coordinates[i].cellsToFinish == 0) {
                // Found a finish, find the cells left to it
                for(let q=0; q<this.coordinates.length; q++) {
                    if ( 
                        (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left
                        this.coordinates[i].y == this.coordinates[q].y) || 
                        (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left and up
                        this.coordinates[i].y - this.cellWidth == this.coordinates[q].y) || 
                        (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left and down
                        this.coordinates[i].y + this.cellWidth == this.coordinates[q].y)
                    ) {
                        this.coordinates[q].cellsToFinish = 1;
                    }
                }
            }
        }

        let currentDistance = 1;
        // Keep setting the distance, until every distance is set
        while (this.coordinates.some(coordinate => coordinate.cellsToFinish == undefined)) {

            // Now set the distance to the rest... :)
            for(let i=0; i<this.coordinates.length; i++) {
                if (this.coordinates[i].cellsToFinish == currentDistance) {
                    // Found a cell with this distance, now find the cells next to it
                    for(let q=0; q<this.coordinates.length; q++) {
                        if ( 
                            (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left
                            this.coordinates[i].y == this.coordinates[q].y) || 
                            (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left and up
                            this.coordinates[i].y - this.cellWidth == this.coordinates[q].y) || 
                            (this.coordinates[i].x - this.cellWidth == this.coordinates[q].x && // 1 cell to the left and down
                            this.coordinates[i].y + this.cellWidth == this.coordinates[q].y) ||
                            (this.coordinates[i].x == this.coordinates[q].x &&                  // 1 cell up
                            this.coordinates[i].y - this.cellWidth == this.coordinates[q].y) || 
                            (this.coordinates[i].x == this.coordinates[q].x &&                  // 1 cell down
                            this.coordinates[i].y + this.cellWidth == this.coordinates[q].y) || 
                            (this.coordinates[i].x + this.cellWidth == this.coordinates[q].x && // 1 cell to the right 
                            this.coordinates[i].y == this.coordinates[q].y) || 
                            (this.coordinates[i].x + this.cellWidth == this.coordinates[q].x && // 1 cell to the right and up
                            this.coordinates[i].y - this.cellWidth == this.coordinates[q].y) || 
                            (this.coordinates[i].x + this.cellWidth == this.coordinates[q].x && // 1 cell to the right and down
                            this.coordinates[i].y + this.cellWidth == this.coordinates[q].y)
                        ) {
                            if (this.coordinates[q].cellsToFinish == undefined) { // Only if cellsToFinish is not (yet) defined
                                this.coordinates[q].cellsToFinish = currentDistance+1;
                            }
                        }
                    }
                }
            }

            // Next step
            currentDistance++;
        }

        // Save maximum distance
        this.maximumDistance = currentDistance+1;
    }

    // Returns the starting point based on the coordinates
    getStartingPoint() {
        // Starting point is 
        // - the middle of all coordinates 
        // - which have a  start/finish flag
        // - and are in the rightmost position
        let startingPoint;

        // First, get all the possible start/finish coordinates
        let startCandidates = [];
        let rightMostX = 0;
        for( let i=0; i<this.coordinates.length; i++) {
            if ( this.coordinates[ i ].finish == true ) {
                startCandidates.push( this.coordinates[ i ] );
                if ( this.coordinates[ i ].x > rightMostX ) {
                    rightMostX = this.coordinates[ i ].x
                }
            }
        }

        // Now, filter only those most to the right
        startCandidates = startCandidates.filter( item => {
            return item.x == rightMostX;
        })

        // And pick the 'middle' one
        startingPoint = startCandidates[ Math.floor(startCandidates.length/2) ];

        return startingPoint;
    }

    // Race until death or finish
    startNewRace() {
        // Updates the tries
        this.tries++;

        // Setup a new arrow: no speed and only one position: its starting point
        this.arrow = {
            speedX: 0,
            speedY: 0,
            positions: [ 
                [ this.startingPoint.x, this.startingPoint.y ]   
            ]
        }

        this.takeAStep();
    }  

    // Take a step until death or finish
    takeAStep() {
        var restart = false;

        while (!restart) { 
            // Save old state
            let oldState = this.getState(
                this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ],
                this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ],
                this.arrow.speedX,
                this.arrow.speedY
            );

            // Define next action with Epsilon-greedy
            let action;
            if (Math.random() < this.epsilon) {
                // Select best action
                action = this.getBestAction(oldState);
            } else {
                // Do a random action
                action = Math.floor(Math.random() * Math.floor(9));
            }

            // Execute action
            switch (action) {
                case 0: this.arrow.speedX-=this.cellWidth; this.arrow.speedY-=this.cellWidth; break;    // top left
                case 1: this.arrow.speedY-=this.cellWidth; break;                                       // top
                case 2: this.arrow.speedX+=this.cellWidth; this.arrow.speedY-=this.cellWidth; break;    // top right
                case 3: this.arrow.speedX-=this.cellWidth; break;                                       // left
                case 4: break;                                                                          // center
                case 5: this.arrow.speedX+=this.cellWidth; break;                                       // right
                case 6: this.arrow.speedX-=this.cellWidth; this.arrow.speedY+=this.cellWidth; break;    // bottom left
                case 7: this.arrow.speedY+=this.cellWidth; break;                                       // bottom
                case 8: this.arrow.speedX+=this.cellWidth; this.arrow.speedY+=this.cellWidth; break;    // bottom right
            }

            // Move with the current speeds current direction
            let newPosition = [
                this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ] + this.arrow.speedX,
                this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ] + this.arrow.speedY
            ]
            this.arrow.positions.push(newPosition);
            
            // Determine value
            let value = 0;

            // Crashed?
            if (this.isCrashed()) {
                value = -1000;
                restart = true;
            }

            // Finised the wrong way?
            if(this.isFinishedTheWrongWay()) {
                value = -1000
                restart = true;
            }

            // Finished the right way?
            if (this.isFinishedTheRightWay()) {
                value = 1000;
                restart = true;
            }

            // Still going? Value depends on size of the step taken
            if (value == 0) { 
                value = this.getLastStepSize() * 10;
            }

            // Save new state
            let newState = this.getState(
                this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ],
                this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ],
                this.arrow.speedX,
                this.arrow.speedY
            );

            // Update Q-table 
            this.updateQTable(oldState, newState, action, value);
        }
    }

    // You can off course just turn around an cross the finish :)
    // Detection is done by saying that crossing more than 1/4 of the distance in once step is suspicous enough
    isFinishedTheWrongWay() {
        if (this.getLastStepSize() > this.maximumDistance/4 ) {
            return true;
        } else {
            return false;
        }
    }

    // You also can finish like a real pro
    isFinishedTheRightWay() {
        // Finishing right can be by going over the finish: 
        // this is detected by a huge negative distance, more than 3/4 of the total distance
        if (-this.getLastStepSize() > this.maximumDistance*3/4 ) {
            return true;
        }

        // It also can be by landing precisely on the finish.
        // And this should be from a position close to the finish
        if (
            this.getDistanceToFinish(
                this.arrow.positions[ this.arrow.positions.length-2 ][ 0 ],
                this.arrow.positions[ this.arrow.positions.length-2 ][ 1 ]
            ) != 0 && 
            this.getDistanceToFinish(
                this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ],
                this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ]
            ) == 0 && 
            this.getDistanceToFinish(
                this.arrow.positions[ this.arrow.positions.length-2 ][ 0 ],
                this.arrow.positions[ this.arrow.positions.length-2 ][ 1 ]
            ) < (this.maximumDistance/4)
        ) {
            this.rounds++;
            return true;
        }

        return false;
    }

    // Returns the difference in distance to the finish by the last move
    getLastStepSize() {
        // Get the distance before the last move
        let distanceBefore = this.getDistanceToFinish(
            this.arrow.positions[ this.arrow.positions.length-2 ][ 0 ],
            this.arrow.positions[ this.arrow.positions.length-2 ][ 1 ]
        );

        // Special rule for the first move, since the finish (0 distance), is also the start (maximum distance)
        if (distanceBefore == 0) {
            distanceBefore = this.maximumDistance;
        }

        // Get the distance after the last move
        let distanceAfter = this.getDistanceToFinish(
            this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ],
            this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ]
        );

        return distanceBefore - distanceAfter;
    }

    // Returns the distance to the finish, based on coordinates
    getDistanceToFinish(x, y) {
        for (let i=0; i<this.coordinates.length; i++) {
            if (
                this.coordinates[i].x == x && 
                this.coordinates[i].y == y
            ) {
                return this.coordinates[i].cellsToFinish;
            }
        }
    }

    // Update Q-table based on the Q-function
    updateQTable(oldState, newState, action, value) {
        
        let valuesOldState = this.qTable.get(oldState);
        
        // If oldstate isn't found, create 'empty' values            
        if (valuesOldState==undefined) {
            valuesOldState = [];
            for(let i=0; i<9; i++) {
                valuesOldState.push(0);
            }
        }

        let max;
        (this.qTable.get(newState)==undefined) ? max = 0 : max = Math.max(...this.qTable.get(newState));

        // Q function
        valuesOldState[ action ] = 
            Math.round(
                valuesOldState[ action ] + 
                (this.learningRate *
                     (value + 
                    this.discount * max - 
                    valuesOldState[ action ])
                )
            );

        this.qTable.set(oldState, valuesOldState);
    }    

    // Check if the arrow is crashed (outside track coordinates)
    // True:  crashed  :(
    // False: still ok :)
    isCrashed() {
        let coordinates = this.coordinates.find( element => 
            element.x == this.arrow.positions[ this.arrow.positions.length-1 ][ 0 ] && 
            element.y == this.arrow.positions[ this.arrow.positions.length-1 ][ 1 ]
        );

        return( coordinates === undefined );
    }

    // Gets the current state of the arrow
    getState(xPos, yPos, speedX, speedY) {
        return  xPos + '-' +
                yPos + '-' +
                speedX + '-' +
                speedY;
    }

    // Return best action based on the state
    getBestAction(state, notRandom) {
        let values = this.qTable.get(state);

        if (values==undefined) {
            if (!notRandom) {
                return undefined;
            } else {
                // State not found, return random action
                return Math.floor(Math.random() * Math.floor(9));
            }
        } else {
            // State is found
            
            // If there is at least 1 action with a positive value, return best action
            if (Math.max(...values) > 0 ) {
                return values.indexOf(Math.max(...values));
            }

            // If there are only actions with negative values, return the 'best' action
            if (Math.max(...values) < 0 ) {
                return values.indexOf(Math.max(...values));
            }

            // There are 1 or more actions with zero values, return on of those randomly
            let action;
            do { 
                action = Math.floor(Math.random() * Math.floor(9));
            } while(values[action] != 0);
            return action;
        }
    }
}    

// Default settings/track
track = new Track(
    'track1',   // Trackname
    40,         // Initial width of a cell in pixels
    100,        // Times with a finish before it stops 
    0.7,        // Epsilon
    1,          // Learning rate
    0.9         // Discout
);

// Starting the algoritm
document.getElementById("start").addEventListener("click", runAlgorithm);
function runAlgorithm() {
    track.run();
}

// Upload of an user's own track
document.getElementById("file").addEventListener("change", handleFileChange, false);
function handleFileChange() {
    track.loadTrack(this.files);
}

// Input of the cell width
document.getElementById("size").addEventListener("change", handleSizeChange, false);
function handleSizeChange() {
    track.setWidth(this.value);
}