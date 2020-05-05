/**
 * Geometry drawer
 * @module geometry */

'use strict';

const _dgtorad = dg => ((Math.PI / 180) * dg);
/**
 * Shape fillstyle
 *  @constant
 */
const FILLSTYLE = 'rgba(0,0,0,0.2)';
/**
 * Text fillstyle
 *  @constant
 */
const LETTER_FILLSTYLE = 'rgba(0,0,0,0.4)';
/**
 * Stroke style. Empty means do not set.
 *  @constant
 */
const STROKE_STYLE = null;
/**
 * Minimum "clock placement" action iterations. Should be > 1
 *  @constant
 */
const MIN_CLOCK_ITERS = 2;
/**
 * Maximum "clock placement" action iterations.
 *  @constant
 *  @default
 */
const MAX_CLOCK_ITERS = 6;
/**
 * Possible answer letter set.
 *  @constant
 */
const POSSIBLE_LETTERS = 'ADEIHKMNOPSTWXZ'.split('');
/**
 * Whether text should be filled too.
 *  @constant
 */
const TEXT_FILL = true;
/**
 * Whether every picture in group should be rotated.
 *  @constant
 */
const ROTATE_PER_LAYER = true;

const createGeometryHelper = (opts = {}) => {
    const {
        rotatePerLayer = ROTATE_PER_LAYER, textFill = TEXT_FILL, possibleLetters = POSSIBLE_LETTERS,
        letterFillStyle = LETTER_FILLSTYLE, fillStyle = FILLSTYLE, strokeStyle = STROKE_STYLE
    } = opts;
    const _stroke = ctx => {
        ctx.save();
        strokeStyle && (ctx.strokeStyle = strokeStyle);
        ctx.stroke();
        ctx.restore();
    };
    const _fillup = (ctx, fill, res, shapeScope) => {
        if (fill) {
            ctx.save();
            _stroke(ctx);
            ctx.fillStyle = fillStyle;
            ctx.fill();
            if (shapeScope && shapeScope.unfillable) {
                ctx.lineWidth = res <= 30 ? res / 4 : res / 5;
                ctx.strokeStyle = fillStyle;
                _stroke(ctx);
            }
            ctx.restore();
        } else _stroke(ctx);
    };
    /**
     * Array of shape objects. Each of them has name and drawin function that accepts canvas context, resolution array
     * and boolean fill.
     */
    const shapes = [
        {
            name: 'square',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                const len = 4 * res / 5;
                ctx.translate(-len / 2, -len / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(len, 0);
                ctx.lineTo(len, len);
                ctx.lineTo(0, len);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            }
        },
        {
            name: 'rectangle',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.translate(0, res / 4);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(res / 2, 0);
                ctx.lineTo(res / 2, res / 4);
                ctx.lineTo(0, res / 4);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            }
        },
        {
            name: 'circle',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                const hr = Math.floor(res / 2);
                ctx.beginPath();
                ctx.arc(hr, hr, hr, 0, Math.PI * 2);
                ctx.closePath();
                _stroke(ctx);
                _fillup(ctx, fill, res, this);
                ctx.restore();
            }
        },
        {
            name: 'heart',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.rotate(_dgtorad(90));
                ctx.translate(-res / 2, -res / 2);
                const k = 0,
                    d = res;
                ctx.beginPath();
                ctx.moveTo(k, k + d / 4);
                ctx.quadraticCurveTo(k, k, k + d / 4, k);
                ctx.quadraticCurveTo(k + d / 2, k, k + d / 2, k + d / 4);
                ctx.quadraticCurveTo(k + d / 2, k, k + d * 3 / 4, k);
                ctx.quadraticCurveTo(k + d, k, k + d, k + d / 4);
                ctx.quadraticCurveTo(k + d, k + d / 2, k + d * 3 / 4, k + d * 3 / 4);
                ctx.lineTo(k + d / 2, k + d);
                ctx.lineTo(k + d / 4, k + d * 3 / 4);
                ctx.quadraticCurveTo(k, k + d / 2, k, k + d / 4);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            faces: true
        },
        {
            name: 'cross',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.lineWidth = res / 20;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(res, res);
                ctx.moveTo(0, res);
                ctx.lineTo(res, 0);
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            unfillable: true
        },
        {
            name: 'moon',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.rotate(_dgtorad(90));
                ctx.translate(-res / 2, -res / 2);
                ctx.beginPath();
                ctx.moveTo(res / 8, res - res / 5);
                ctx.bezierCurveTo(res / 5, 2 * res / 5, res - res / 5,
                    2 * res / 5, res - res / 8, res - res / 5);
                ctx.bezierCurveTo(res - res / 5, res / 5, res / 5,
                    res / 5, res / 8, res - res / 5);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            faces: true
        },
        {
            name: 'roof',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.lineWidth = res / 20;
                ctx.beginPath();
                ctx.moveTo(res / 2, res / 20);
                ctx.lineTo(res - res / 20, res / 2);
                ctx.lineTo(res / 2, res - res / 20);
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            unfillable: true,
            faces: true
        },
        {
            name: 'arrow',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.lineWidth = res / 20;
                ctx.beginPath();
                ctx.moveTo(res / 20, res / 2);
                ctx.lineTo(res - res / 20, res / 2);
                //ctx.closePath();
                ctx.moveTo(res - res / 3, res - res / 4);
                ctx.lineTo(res - res / 20, res / 2);
                ctx.lineTo(res - res / 3, res / 4);
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            unfillable: true,
            faces: true
        },
        {
            name: 'triangle',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(res, res / 2);
                ctx.lineTo(0, res);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            faces: true
        },
        {
            name: 'fivestar',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.rotate(_dgtorad(90))
                ctx.translate(-res / 2, -res / 2);
                ctx.beginPath();
                ctx.moveTo(res / 4, res);
                ctx.lineTo(res / 2, 4 * res / 6);
                ctx.lineTo(3 * res / 4, res);

                ctx.lineTo(2 * res / 3, res / 2);
                ctx.lineTo(res, res / 3);
                ctx.lineTo(3 * res / 5, res / 3);

                ctx.lineTo(res / 2, 0);
                ctx.lineTo(2 * res / 5, res / 3);
                ctx.lineTo(0, res / 3);
                ctx.lineTo(res / 3, res / 2);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.closePath();
                _stroke(ctx);
                ctx.restore();
            },
            faces: true
        },
        {
            name: 'pentagon',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.rotate(_dgtorad(90));
                ctx.translate(-res / 2, -res / 2);
                ctx.beginPath();
                ctx.moveTo(0, res / 2);
                ctx.lineTo(res / 3, res);
                ctx.lineTo(2 * res / 3, res);
                ctx.lineTo(res, res / 2);
                ctx.lineTo(2 * res / 3, 0);
                ctx.lineTo(res / 3, 0);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.closePath();
                _stroke(ctx);
                ctx.restore();
            }
        },
        {
            name: 'plus',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.rotate(_dgtorad(90));
                ctx.translate(-res / 2, -res / 2);
                ctx.beginPath();
                ctx.moveTo(0, res / 3);
                ctx.lineTo(0, 2 * res / 3);
                ctx.lineTo(res / 3, 2 * res / 3);
                ctx.lineTo(res / 3, res);
                ctx.lineTo(2 * res / 3, res);
                ctx.lineTo(2 * res / 3, 2 * res / 3);
                ctx.lineTo(res, 2 * res / 3);
                ctx.lineTo(res, res / 3);
                ctx.lineTo(2 * res / 3, res / 3);
                ctx.lineTo(2 * res / 3, 0);
                ctx.lineTo(res / 3, 0);
                ctx.lineTo(res / 3, res / 3);
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            }
        },
        {
            name: 'threelines',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.translate(-res / 2, -res / 2);
                ctx.lineWidth = res / 20;
                ctx.beginPath();

                ctx.moveTo(res / 20, res / 20);
                ctx.lineTo(res - res / 20, res / 20);

                ctx.moveTo(res / 20, res / 2);
                ctx.lineTo(res - res / 20, res / 2);

                ctx.moveTo(res / 20, res - res / 20);
                ctx.lineTo(res - res / 20, res - res / 20);

                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            unfillable: true
        },
        {
            name: 'sun',
            drawin: function (ctx, res, fill = false) {
                ctx.save();
                ctx.lineWidth = Math.max(1, res / 25);
                ctx.beginPath();
                for (let i = 0; i < 10; i++) {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(4 * res / 5 - res / 20, 0);
                    ctx.rotate(_dgtorad(36));
                }
                ctx.closePath();
                _fillup(ctx, fill, res, this);
                ctx.restore();
            },
            unfillable: true
        }
    ];

    /**
     * Draws a letter.
     * @param {Object} ctx canvas context
     * @param {Number} res resolution of the letter
     * @param {String} letter Letter to draw. If string of length > 1 is provided, only the first letter is drawn
     */
    const drawLetter = (ctx, res, letter) => {
        ctx.save();
        //ctx.translate(-res/2,0);
        ctx.textAlign = 'center';
        ctx.font = res + 'px serif';
        ctx.textBaseline = 'middle';
        if (textFill) {
            ctx.fillStyle = letterFillStyle;
            ctx.fillText(letter[0], 0, 0, res);
        } else {
            ctx.strokeText(letter[0], 0, 0, res);
        }
        ctx.restore();
    };

    /**
     * Object of painter functions.
     * @type {{clock: painters.clock, place: painters.place, insert: painters.insert}}
     */
    const painters = {
        /**
         * Places multiple pieces of shape, rotating around center, creating a clock pattern.
         * @param {Object} ctx canvas context
         * @param {Array} res resolution array
         * @param {Object} target target shape
         * @param {Object} params parameters for shape drawin provided by {@link deciders.decideParams}
         */
        clock: (ctx, res, target, params = {}) => {
            let skipFirst = params.skipFirst;
            let fill = Boolean(params.fill);
            let itercount = params.itercount || 4;
            let byangle = 360 / itercount;
            if (params.offangle && typeof params.offangle === 'number') {
                byangle += params.offangle;
            }
            let i = skipFirst ? 1 : 0;
            ctx.save();
            params.angle ? ctx.rotate(Number(params.angle)) : {};
            for (; i < itercount; i++) {
                ctx.rotate(_dgtorad(byangle));
                ctx.translate(res, 0);
                target.drawin(ctx, res, fill);
                ctx.translate(-res, 0);
            }
            ctx.restore();
        },
        /**
         * Places a single piece of shape.
         * @param {Object} ctx canvas context
         * @param {Array} res resolution array
         * @param {Object} target target shape
         * @param {Object} params parameters for shape drawin provided by {@link deciders.decideParams}
         */
        place: (ctx, res, target, params = {}) => {
            let rotangle = 0 || params.angle;
            let fill = Boolean(params.fill);
            ctx.save();
            if (rotangle)
                ctx.rotate(_dgtorad(rotangle));
            if (target.faces)
                ctx.rotate(_dgtorad(-90));
            target.drawin(ctx, res, fill);
            ctx.restore();
        },
        /**
         * Places a single piece of shape in an position with an offset.
         * @param {Object} ctx canvas context
         * @param {Array} res resolution array
         * @param {Object} target target shape
         * @param {Object} params parameters for shape drawin provided by {@link deciders.decideParams}
         */
        insert: (ctx, res, target, params = {}) => {
            let rotangle = params.angle || 0;
            let fill = Boolean(params.fill);
            let tx = params.tx || 0;
            let ty = params.ty || 0;
            ctx.save();
            ctx.translate(tx * res, ty * res);
            if (rotangle)
                ctx.rotate(_dgtorad(rotangle));
            if (target.faces)
                ctx.rotate(_dgtorad(-90));
            target.drawin(ctx, res, fill);
            ctx.restore();
        }
    };

    /**
     * Param/overdraw randomizers.
     */
    const deciders = {
        /**
         * Returns 3 overdraw functions.
         * @returns {Array}
         */
        decideOverdraws: () => {
            const res = [];
            res.push(random.randInt(0, 2) ? painters.place : painters.clock);
            res.push(painters.clock);
            res.push(random.randInt(1, 5) < 4 ? painters.insert : random.randInt(0, 1) ? painters.clock : painters.place);
            return res;
        },
        /**
         * Returns randomized parameters for shape overdraws.
         * @param {Array} ovds array of shape overdraws
         * @returns {Array} of params for provided overdraws
         */
        decideParams: ovds => {
            const res = [];
            let i = 0;
            for (let ovd of ovds) {
                const param = {};
                param.belongs = ovd.name;
                param.angle = random.getRandAngle();
                param.fill = i++ === 2;
                if (ovd === painters.insert) {
                    param.tx = random.randInt(0, 2) - 1;
                    param.ty = random.randInt(0, 2) - 1;
                    if (!param.tx && !param.ty) {
                        param.tx = random.randInt(0, 1) ? 1 : -1;
                        param.ty = random.randInt(0, 1) ? 1 : -1;
                    }
                }
                if (ovd === painters.clock) {
                    param.skipFirst = random.randInt(1, 5) > 3;
                    param.itercount = random.randInt(MIN_CLOCK_ITERS, MAX_CLOCK_ITERS);
                    param.offangle = random.getRandAngle();
                }
                res.push(param);
            }
            for (let i of [0, 1]) {
                if (res[i].fill && ovds[i] === painters.insert) {
                    if (ovds[i + 1] === painters.insert || ovds[Math.min(i + 2, 2)] === painters.insert)
                        if ((res[i].tx === res[i + 1].tx && res[i].ty === res[i + 1].ty) ||
                            (res[i].tx === res[Math.min(i + 2, 2)].tx &&
                                res[i].ty === res[Math.min(i + 2, 2)].ty))
                            res[i].fill = false;
                }
            }

            if (rotatePerLayer) {
                const baseAngle = random.randInt(10, 40),
                    perLayerRotations = [baseAngle, ...random.genDistinct(10, 45, 2)
                        .sort().map(val => val + baseAngle)];
                res.forEach((item, i) => {
                    item.layerRotation = perLayerRotations[i];
                });
            }
            return res;
        },
        /**
         * Generates options to choose from.
         * @param {Array} qShapeIndices shape indices of question tile
         * @param {Array} ovds overdraws
         * @param {Array} ovdParams parameters for overdraws
         * @param {Array} resolutions array of resolutions
         * @returns {{opts: (*|Array), answer: Array, letters: *}}
         */
        decideOptions: (qShapeIndices, ovds, ovdParams, resolutions) => {
            const cparr = arr => ([...arr]);
            const cpobj = obj => (Object.assign({}, obj));

            let optPreparedDraws = [];
            /**
             * swapping painters
             */
            {
                if (ovds[0] !== ovds[1]) {
                    const tmpIdcs = cparr(qShapeIndices);
                    const tmpParams = [ovdParams[1], ovdParams[0], ovdParams[2]];
                    [tmpIdcs[0], tmpIdcs[1]] = [tmpIdcs[1], tmpIdcs[0]];
                    optPreparedDraws.push(ctx => {
                        drawGroup(ctx, tmpIdcs, ovds, tmpParams, resolutions);
                    });
                }
                if (ovds[1] !== ovds[2]) {
                    const tmpIdcs = cparr(qShapeIndices);
                    const tmpParams = [ovdParams[0], ovdParams[2], ovdParams[1]];
                    [tmpIdcs[2], tmpIdcs[1]] = [tmpIdcs[1], tmpIdcs[2]];
                    optPreparedDraws.push(ctx => {
                        drawGroup(ctx, tmpIdcs, ovds, tmpParams, resolutions);
                    });
                }
                if (ovds[0] !== ovds[2]) {
                    const tmpIdcs = cparr(qShapeIndices);
                    const tmpParams = [ovdParams[2], ovdParams[1], ovdParams[0]];
                    [tmpIdcs[2], tmpIdcs[0]] = [tmpIdcs[0], tmpIdcs[2]];
                    optPreparedDraws.push(ctx => {
                        drawGroup(ctx, tmpIdcs, ovds, tmpParams, resolutions);
                    });
                }
            }

            /**
             * recurring shapes indices
             */
            {
                const recur = (i, j) => {
                    optPreparedDraws.push(ctx => {
                        const tmpIdcs = cparr(qShapeIndices);
                        tmpIdcs[i] = tmpIdcs[j];
                        drawGroup(ctx, tmpIdcs, ovds, ovdParams, resolutions);
                    });
                };

                [[1, 0], [1, 2], [0, 2], [0, 1], [2, 0]].forEach(pair => (recur(...pair)));
            }

            /**
             * changing clock iters
             */
            {
                const newGendIters = [];
                for (let i of [...Array(ovds.length).keys()]) {
                    if (ovds[i] === painters.clock)
                        optPreparedDraws.push(ctx => {
                            const newParams = [cpobj(ovdParams[0]), cpobj(ovdParams[1]), cpobj(ovdParams[2])];
                            newGendIters.push(newParams[i].itercount);
                            newParams[i].itercount = random.genDistinct(MIN_CLOCK_ITERS, MAX_CLOCK_ITERS, 1, newGendIters)[0];
                            ctx.save();
                            drawGroup(ctx, qShapeIndices, ovds, newParams, resolutions);
                            ctx.restore();
                        });
                }
            }

            /**
             * skipping first or second drawing, then changing first shape
             */
            {
                for (let i of [0, 1]) { // 1 means skip second
                    optPreparedDraws.push(ctx => {
                        const tempShapeIdces = [i ? qShapeIndices[0] : qShapeIndices[1], qShapeIndices[2]];
                        const tempOvds = [i ? ovds[0] : ovds[1], ovds[2]];
                        const tempParams = [i ? ovdParams[0] : ovdParams[1], ovdParams[2]];
                        const tempRess = [i ? resolutions[0] : resolutions[1], resolutions[2]];
                        tempShapeIdces[0] = random.genDistinct(0, shapes.length - 1, 1, tempShapeIdces[0])[0];
                        ctx.save();
                        drawGroup(ctx, tempShapeIdces, tempOvds, tempParams, tempRess);
                        ctx.restore();
                    });
                }
            }

            /**
             * changing first or second shapes
             */
            const newGendShapes = qShapeIndices.slice(0, 2);
            const changeShape = () => {
                const newGendShape = random.genDistinct(0, shapes.length - 1, 1, newGendShapes)[0],
                    newIdces = [...qShapeIndices];
                newIdces[random.randInt(0, 1)] = newGendShape;
                newGendShapes.push(newGendShape);
                optPreparedDraws.push(ctx => {
                    drawGroup(ctx, newIdces, ovds, ovdParams, resolutions);
                });
            };
            [...Array(10).keys()].forEach(i => (i > 2 && optPreparedDraws.length > 9 ? {} : changeShape()));

            /**
             * choosing random ten from prepared options
             */
            optPreparedDraws = random.shuffle(optPreparedDraws).slice(0, Math.min(10, optPreparedDraws.length));

            /**
             * create two correct answers, then create return value object
             */
            const letters = random.shuffle(possibleLetters).slice(0, 10);
            const correctAnswerLetters = [];
            {
                const correctShapeIndices = [qShapeIndices[2], random.genDistinct(0, shapes.length - 1,
                    1, qShapeIndices)[0]],
                    answrIdcesToBeReplaced = random.genDistinct(0, optPreparedDraws.length - 1, 2);
                answrIdcesToBeReplaced.forEach((idx, i) => {
                    correctAnswerLetters.push(letters[idx]);
                    optPreparedDraws[idx] = ctx => {
                        ctx.save();
                        const _shps = qShapeIndices.slice(0, 2);
                        _shps.push(correctShapeIndices[i]);
                        drawGroup(ctx, _shps, ovds, ovdParams, resolutions);
                        ctx.restore();
                    };
                });

            }
            return {opts: optPreparedDraws, answer: correctAnswerLetters, letters}
        }
    };

    /**
     * Number randomizers.
     */
    const random = {
        rnd: () => Math.random(),
        randInt: (min, max) => (Math.floor(random.rnd() * (max - min + 1)) + min),
        getRandAngle: () => (random.randInt(0, 45)),
        genDistinct: (min, max, n, distarr) => {
            if (!distarr) {
                distarr = [];
            }
            if (typeof distarr === 'number') {
                distarr = [distarr];
            }
            let res = [], gend = 0;
            [...Array(n).keys()].forEach(() => {
                do {
                    gend = random.randInt(min, max);
                } while (distarr.includes(gend) || res.includes(gend));
                res.push(gend);
            });
            return res;
        },
        shuffle: arr => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(random.rnd() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

    };

    /**
     * Draws a group of shapes.
     * @param {Object} context canvas context
     * @param {Array} providedShapes shapes or indices of shapes to draw
     * @param {Array} providedFunctions functions that draw them
     * @param {Array} providedParams params for draw functions
     * @param {Array} resolutions array of resolutions
     */
    const drawGroup = (context, providedShapes, providedFunctions, providedParams, resolutions) => {
        if (typeof providedShapes[0] === 'number')
            providedShapes = providedShapes.map(index => (shapes[index]));
        context.save();
        providedShapes.forEach((shape, idx) => {
            context.save();
            [...Array(providedShapes.length).keys()].forEach(i => context
                .rotate(_dgtorad(providedParams[i].layerRotation || 0)));
            providedFunctions[idx](context, resolutions[idx], shape, providedParams[idx]);
            context.restore();
        });
        context.restore();
    };
    return {shapes, painters, deciders, drawGroup, drawLetter, random}
};

module.exports = {createGeometryHelper};