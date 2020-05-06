'use strict';
const generator = require('./generator');
const {fork} = require('child_process');
const {join} = require('path');
const authr = require('./captcha-authr');

class CaptchaMgr {
    /**
     * Class for automatic CAPTCHA creating, providing and dynamic capacity adjusting.
     * @param {Object} opts options for CAPTCHA management
     * @param {number} [opts.initialCapacity] starting CAPTCHA capacity. Default 3
     * @param {number} [opts.checkInterval] time interval for CAPTCHA checks in millisecondds. Default 1500
     * @param {boolean} [opts.capacityDynamic] whether capacity should be dynamically adjusted. Default true
     * @param {number} [opts.capacityCutbackInterval] time in milliseconds after which capacity drops by one. Default 1000*60*60
     * @param {number} [opts.capacityCutbackMinPercentage] minimal ready/capacity ratio to perform cutback. Default 0.9
     * @param {object} [opts.logger] logger
     * @param {boolean} [opts.forks] whether creation should run in separate process. Defaults to true
     * @param {object} [opts.genOpts] generator options
     * @param {boolean} [opts.genOpts.rotatePerLayer] whether every picture in group should be rotated. Default true
     * @param {boolean} [opts.genOpts.textFill] whether text should be filled too. Default true
     * @param {array<string>} [opts.genOpts.possibleLetters] list of possible letters. Default list of ADEIHKMNOPSTWXZ
     * @param {string} [opts.genOpts.letterFillStyle] canvas style for text. Default 'rgba(0,0,0,0.4)'
     * @param {string} [opts.genOpts.fillStyle] canvas style for shapes. Default 'rgba(0,0,0,0.2)'
     * @param {string} [opts.genOpts.strokeStyle] canvas stroke style. Uses default if none provided (black).
     */
    constructor(opts = {}) {
        this._capacity = opts.initialCapacity || 3;
        this._checkInterval = opts.checkInterval || 3000;
        this._capacityDynamic = opts.capacityDynamic !== false;
        this._capacityCutbackInterval = opts.capacityCutbackInterval || 1000 * 60 * 60;
        this._capacityCutbackMinPercentage = opts.capacityCutbackMinPercentage || .9;
        this._forks = !!opts.forks;
        this._logger = opts.logger || {debug: f => f, log: f => f, warn: f => f, error: f => f, info: f => f};
        this._pendingCaptchas = 0;
        this._readyQue = [];
        this._awaitingQue = [];
        this._terminate = false;
        this._genOpts = opts.genOpts || {};
    }

    /**
     * Starts the periodic, non-blocking checking for CAPTCHAs. If amount of ready CAPTCHAs is less
     * than specified capacity, a CAPTCHA is generated. This method needs to be called before calling any CAPTCHA
     * providing functions.
     */
    begin() {
        !this._generator && !this._generator && (this._generator = generator.createGenerator(this._genOpts));
        if (this._forks && !this._providerJob) {
            this._providerJob = fork(join(__dirname, 'provider-job'), [JSON.stringify(this._genOpts)]);
            this._providerJob.on('message', data => {
                if (data.err)
                    this._logger.warn(data.err);
                else _onCreated(this, data);
                this._pendingCaptchas--;
            });
        }


        this._ticking = setInterval(() => {
            this._logger.debug('--- Loop tick ---');
            this._checkForCaptchas();
        }, this._checkInterval);
        if (this._capacityCutbackInterval > 0 && this._capacityDynamic)
            this._cutback = setInterval(() => {
                if (this._capacity > 2 && this._readyQue.length / this._capacity > this._capacityCutbackMinPercentage) {
                    this._capacity--;
                    this._logger.debug('Capacity cut back to ', this._capacity)
                }
            }, Math.max(10000, this._capacityCutbackInterval));
    }

    _checkForCaptchas() {
        if (!this._terminate) {
            const req = (this._capacity - (this._pendingCaptchas + this._readyQue.length));
            this._logger.debug(`Checking  for  captchas, have  ${this._readyQue.length},  will  need: ${req}`);
            while (this._capacity > this._pendingCaptchas + this._readyQue.length) {
                this._createCaptcha();
            }
        }
    }

    async _createCaptcha() {
        this._pendingCaptchas++;
        if (this._forks) {
            this._providerJob.send('provide');
        } else {
            try {
                _onCreated(this, await this._generator.create());
                this._pendingCaptchas--;
            } catch (e) {
                this._logger.warn(e);
            }
        }
    }

    /**
     * Retrieves ready CAPTCHA from the queue in a form of promise.
     * @returns {Promise<{choices: Array, answer: String, data: String}>} resolved object consists of:<ul>
     * <li>choices: list of picked letter choices</li>
     * <li>answer: string of exactly two letters form the choices</li>
     * <li>data: Base64 encoded picture</li>
     * </ul>
     */
    async popCaptcha() {
        const _tryGettingCaptcha = () => {
            if (this._readyQue.length <= 2 && this._capacityDynamic)
                this._capacity++;
            if (this._awaitingQue.length === 0 && this._readyQue.length > 0) {
                return this._readyQue.shift();
            }
            return null;
        };

        const result = _tryGettingCaptcha();
        if (result)
            return Promise.resolve(result);
        let resolveFunc = f => f;
        const futureResult = new Promise(resolve => {
            resolveFunc = resolve;
        });
        this._awaitingQue.push(resolveFunc);
        return futureResult;
    }

    /**
     * Stops all ongoing intervals
     */
    terminate() {
        this._logger.debug('Stopping loops...');
        this._terminate = true;
        this._ticking && this._ticking.close();
        this._cutback && this._cutback.close();
        this._providerJob && this._providerJob.kill();
    }
}

const _onCreated = (captchaMgr, res) => {
    if (captchaMgr._awaitingQue.length)
        captchaMgr._awaitingQue.shift()(res);
    else captchaMgr._readyQue.push(res);
};

module.exports = {CaptchaMgr, generator, CaptchaAuthr: authr};