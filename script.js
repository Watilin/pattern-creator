"use strict";

const X_PITCH = 48;
const Y_PITCH = 32;

const DEFAULT_COLOR_PART = (() => {
  var match = getComputedStyle(document.body).backgroundColor.match(
    /#([\da-fA-F]{2})[[\da-fA-F]]{4}|([\da-fA-F])[\da-fA-F]{2}|(\d+),\s*\d+,\s*\d+/
  );
  if (match) {
    if (match[1]) {
      return Number.parseInt(match[1], 16);
    }
    if (match[2]) {
      return Number.parseInt(match[2].repeat(2), 16);
    }
    if (match[3]) {
      return Number.parseInt(match[3], 10);
    }
  }

  return 42;
})();

const DEFAULT_COLOR = "#" + (DEFAULT_COLOR_PART < 16 ? "0" : "") +
  DEFAULT_COLOR_PART.toString(16).repeat(3);

const DELTA_BUFFER_SIZE = 60;
const FPS_DROP_THRESHOLD = 15;

function pickColorCode() {
  var r = 0.8 + (0.4 * Math.random());
  var brightness = Math.floor(r * DEFAULT_COLOR_PART);
  var partCode = ((brightness < 16) ? "0" : "") + brightness.toString(16);
  return "#" + partCode.repeat(3);
}

function pickDelay() {
  return 5000 + 500 * Math.floor(6 * Math.random());
}

document.addEventListener("DOMContentLoaded", () => {
  var deltaBuffer = [];

  var $canvas = document.createElement("canvas");
  $canvas.id = "body-background";
  $canvas.style.display = "none";

  document.body.style.backgroundImage = "-moz-element(#body-background)";
  document.body.append($canvas);

  var w = window.innerWidth;
  var h = window.innerHeight;
  var boxesXCount = Math.ceil(w / X_PITCH);
  var boxesYCount = Math.ceil(h / Y_PITCH);

  $canvas.width = w;
  $canvas.height = h;

  var cx = $canvas.getContext("2d");

  var boxes = new Array(boxesXCount * boxesYCount);
  window.boxes = boxes;

  var now = performance.now();

  var boxesToAnimateCount = Math.round(boxesXCount * boxesYCount / 4);
  var boxesToAnimate = new Array(boxesToAnimateCount);
  for (let n = 0; n < boxesToAnimateCount; n++) {
    let boxIndex;
    do {
      boxIndex = Math.floor(boxesXCount * boxesYCount * Math.random());
    } while (boxesToAnimate.includes(boxIndex));

    let box = {
      x          : boxIndex % boxesXCount,
      y          : Math.floor(boxIndex / boxesXCount),
      startColor : DEFAULT_COLOR,
      endColor   : pickColorCode(),
      startTime  : now,
      endTime    : now + pickDelay(),
    };

    boxesToAnimate[n] = box;
    boxes[boxIndex] = box;
  }

  var previousTime;
  (function animateBackground(time) {
    var frameId = requestAnimationFrame(animateBackground);

    try {
      if (!previousTime) {
        previousTime = time;
      }
      else {
        deltaBuffer.unshift(time - previousTime);
        previousTime = time;
        if (deltaBuffer.length > DELTA_BUFFER_SIZE) {
          deltaBuffer.length = DELTA_BUFFER_SIZE;

          let deltaAverage = deltaBuffer
            .reduce((sum, delta) => sum + delta) / DELTA_BUFFER_SIZE;
          let fpsAverage = 1000 / deltaAverage;

          if (fpsAverage < FPS_DROP_THRESHOLD) {
            //boxesToAnimate.length = Math.ceil(boxesToAnimate.length / 2);
          }
        }
      }

      for (let box of boxesToAnimate) {
        if (time <= box.endTime) {
          // linear interpolation
          let tau = (time - box.startTime) / (box.endTime - box.startTime);
          console.assert(tau >= 0 && tau <= 1);
          let greyStart = Number.parseInt(box.startColor.substring(1, 3), 16);
          let greyEnd   = Number.parseInt(box.endColor  .substring(1, 3), 16);
          let grey = Math.round(greyStart + (greyEnd - greyStart) * tau);
          let color = "#" + (grey < 16 ? "0" : "") + grey.toString(16).repeat(3);

          cx.fillStyle = color;
          cx.fillRect(box.x * X_PITCH, box.y * Y_PITCH, X_PITCH, Y_PITCH);
        }
        else {
          // fill with final color
          cx.fillStyle = box.endColor;
          cx.fillRect(box.x * X_PITCH, box.y * Y_PITCH, X_PITCH, Y_PITCH);

          // remove from the list
          boxesToAnimate.splice(boxesToAnimate.indexOf(box), 1);

          setTimeout(() => {
            // pick a new box
            var newBoxIndex;
            do {
              newBoxIndex = Math.floor(boxesXCount * boxesYCount * Math.random());
            } while (boxesToAnimate.includes(newBoxIndex));
            let newBox = boxes[newBoxIndex];

            // create if non existent
            if (!newBox) {
              newBox = {
                x: newBoxIndex % boxesXCount,
                y: Math.floor(newBoxIndex / boxesXCount),
              };
              boxes[newBoxIndex] = newBox;
            }

            // pick a new color and a new time
            newBox.startColor = newBox.endColor || DEFAULT_COLOR;
            newBox.endColor = pickColorCode();
            newBox.startTime = time;
            newBox.endTime = time + pickDelay();

            boxesToAnimate.push(newBox);
          }, 10);
        }
      }

    }
    catch (err) {
      cancelAnimationFrame(frameId);
      throw err;
    }
  })(performance.now());
});
