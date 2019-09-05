# arrowrace
Further exploring the concept of Reinforcement Learning with the Q-Learning algorithm in my blog: https://www.ontdeksels.nl/ontdeksel-14-de-pijlenrace-naar-de-grens/ (Dutch).

![Demo screenshot](https://github.com/gkruiger/arrowrace/blob/master/screenshot.png "Demo screenshot")

This is a small game you might know from high school. It's a 'race' which you can do with your friends with only a piece of graph paper and a pencil. This time however, the algoritm will  search for the best route with the Q-learning algorithm.

## Your own track
You can upload your own track. Please make sure your track adheres to the following:
- Size: 700x400 pixels
- Track itself is in pure white (#ffffff)
- Start/finish is in pure red (#ff0000) and is a vertical line. The code assumes the initial direction is to the right.
- Rest is in pure black (#000000)

Make sure there is a possible solution, otherwise the algoritm will go on endlessly :)

## Tweaking the algoritm
If you're familiar (or want to become familiar) with the parameters you can adjust in Q-leaning, find the following lines of code in the source:

```
track = new Track(
    'track1',   // Trackname
    100,        // Times with a finish before it stops 
    40,         // Initial width of a cell in pixels
    0.7,        // Epsilon
    1,          // Learning rate
    0.9         // Discout
);
```

If you want to know more about epsilon, learning rate and/or discount: Google is your friend while playing around with it.

If you want to play around with the rewards, these can be easily found in the code. Current settings:
- Crash: -100
- Wrongful finish: -1000 (like one step forward and two steps back) 
- Rightful finish: +1000;
- Otherwise valid move: number of steps closer to the finish * 10;