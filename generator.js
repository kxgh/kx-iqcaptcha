/**
 * CAPTCHA generator
 * @module generator
 */

'use strict';

const fs = require('fs');
const cv = require('canvas');
const Geo = require('./geometry');

/**
 * Square dimension of one tile. Tile is an option or a puzzle picture frame. Change the tile res to appropriately
 * change other dimensions too.
 * @constant
 * @default
 * @type {number}
 */
const TILE_RES = 100;

const createGenerator = (opts = {}) => {

    const geo = Geo.createGeometryHelper(opts);

    const {tileRes = TILE_RES} = opts;
    const elementRes = 6 * tileRes / 10,
        padding = tileRes / 10,
        canvasWidth = 5 * padding + tileRes * 5,
        canvasHeigth = 4 * padding + tileRes * 5;

    /**
     * Provides a CAPTCHA object. Returned choices are array of option letters. Answer is 2 letter string of correct
     * answers, data is Base64 picture encoding. Mentioned properties are attributes of resolved Promise object which
     * the function returns.
     * @async
     * @returns {Promise<{choices: Array, answer: String, data: String}>}
     */
    const create = async () => {
        const canvas = cv.createCanvas(canvasWidth, canvasHeigth),
            ctx = canvas.getContext('2d');

        const topShapeIdces = geo.random.genDistinct(0, geo.shapes.length - 1, 3, []);

        const [midOffset, qOffset] = geo.random.genDistinct(1, geo.shapes.length - 1, 2, geo.shapes.length);
        const midShapeIdces = topShapeIdces.map(index => ((index + midOffset) % geo.shapes.length));
        const qShapeIdces = topShapeIdces.map(index => ((index + qOffset) % geo.shapes.length));

        const overdraws = geo.deciders.decideOverdraws();
        const overdrawsParams = geo.deciders.decideParams(overdraws);
        const resolutions = [];

        /**
         * decide resolutions/dimensions
         */
        {
            for (let i of [0, 1, 2]) {
                if (overdraws[i] === geo.painters.clock || overdraws[i] === geo.painters.insert) {
                    if (i === 2 && geo.random.randInt(0, 2))
                        resolutions.push(Math.floor(elementRes / 3));
                    else resolutions.push(Math.floor(elementRes / 2));
                } else resolutions.push(geo.random.randInt(0, 2) ? elementRes : Math.floor(elementRes / 2));
            }
        }


        /**
         * prepare for drawing
         */
        let layerCountMatrix = [[1, 2, 3], [1, 2, 3], [1, 2, 3]],
            rowIndexMatrix = geo.random.shuffle([[1, 1, 1], [2, 2, 2], [3, 3, 3]]),
            idxTranslation = {
                1: topShapeIdces,
                2: midShapeIdces,
                3: qShapeIdces
            };
        /**
         * shuffle question tiling
         */
        {
            if (geo.random.randInt(0, 1)) {
                layerCountMatrix = geo.random.shuffle(rowIndexMatrix);
                const replicated = geo.random.shuffle([1, 2, 3]);
                rowIndexMatrix = rowIndexMatrix.map(() => replicated);
            } else {
                layerCountMatrix.forEach(row => geo.random.shuffle(row));
                geo.random.shuffle(rowIndexMatrix);
            }

        }
        /**
         * drawing the 3x3 question part
         */
        {
            const boundColors = [0, 0, 0].map(() => 'rgb(' + [0, 0, 0].map(() =>
                (geo.random.randInt(50, 255))).reduce((i, j) => (i + ', ' + j)) + ')');
            ctx.save();
            ctx.translate(tileRes + padding, padding); // move one tile rightward and pad for y
            ctx.translate(tileRes / 2, tileRes / 2); // move half a tile so we always draw in middle
            for (let y of [0, 1, 2]) {
                for (let x of [0, 1, 2]) {
                    let [upToLayer, idces] = [layerCountMatrix[y][x], idxTranslation[rowIndexMatrix[y][x]]];
                    /**
                     * draw tile bounds
                     */
                    {
                        const gradient = ctx.createLinearGradient(0, 0, tileRes, tileRes);
                        boundColors.forEach((clr, i) => gradient.addColorStop(i / 2, clr));

                        ctx.save();
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = gradient;
                        ctx.strokeRect(-tileRes / 2, -tileRes / 2, tileRes, tileRes);
                        ctx.restore();
                    }
                    if (upToLayer === 3 && rowIndexMatrix[y][x] === 3)
                        geo.drawLetter(ctx, tileRes, '?');
                    else geo.drawGroup(ctx, idces.slice(0, upToLayer), overdraws, overdrawsParams, resolutions);

                    ctx.translate(tileRes + padding, 0); // move left for next tile in row
                }
                ctx.translate(-3 * (tileRes + padding), tileRes + padding); // move back to the left and step one row lower
            }
            ctx.restore();
        }

        const choices = geo.deciders.decideOptions(qShapeIdces, overdraws, overdrawsParams, resolutions);

        ctx.save();
        ctx.translate(tileRes / 2, (tileRes + padding) * 3 + tileRes / 2);
        for (let i of [...Array(10).keys()]) {
            if (i === 5) {
                ctx.translate(-5 * (tileRes + padding), tileRes + padding);
            }
            choices.opts[i % choices.opts.length](ctx);
            geo.drawLetter(ctx, tileRes, choices.letters[i % choices.opts.length]);
            ctx.translate(tileRes + padding, 0);
        }
        ctx.restore();
        return {
            choices: choices.letters,
            answer: choices.answer.join(''),
            data: canvas.toDataURL()
        };
    };

    const testGenToFile = (filename = Date.now() + 'IQCtestgen.html') => {
        create().then(gend => {
            const output = `<img alt="${gend.answer}" src="${gend.data}">`;
            console.log(gend.answer);
            fs.writeFileSync(filename, output);
        }).catch(err => {
            console.error(err)
        });
    };

    return {create, testGenToFile}
};

module.exports = {
    createGenerator
};