const AuthRecord = require('./AuthRecord');
class CaptchaAuthr {
    /**
     * Class for user authenticity verification with internal CAPTCHA generation using specified provider.
     * @param {CaptchaMgr} provider object with async CAPTCHA provider function popCaptcha
     * @param {Object} authPreferences authentication preferences
     * @param {number} [authPreferences.maxWrong] the count of maximum allowed incorrect attempts before the subject needs to wait. Default 3
     * @param {number} [authPreferences.dropWrongAfter] the time in milliseconds after which an incorrect attempt is dropped. Default 10000
     * @param {number} [authPreferences.requiredAnswers] the number of answers required. Default 1
     * @param {boolean} [authPreferences.resetOnWrong] whether the correct answer count resets on wrong answer. Default true
     * @param {number} [authPreferences.answerTimeout] the time limit in milliseconds the subject has for one answer. Default 60000
     * @param {number} [authPreferences.onRegenWrong] the value that adds up to wrong count on subjects' new CAPTCHA generation request. Default 0.5
     * @param {number} [authPreferences.wrongOnTooLong] the value that adds up to wrong count when a subject takes too long. Default 0.5
     * @param {number} [authPreferences.tooFast] the time in milliseconds we consider too fast to be genuine answer. Default 1000
     * @param {number} [authPreferences.authTimeout] the time in milliseconds authentication expires. Default 1000*60*30
     */
    constructor(provider, authPreferences = {}) {
        if (!provider || typeof provider.popCaptcha !== 'function' ) {
            throw new Error('Invalid CAPTCHA provider!');
        }
        this.map = new Map();
        this.lastOldCheck = Date.now();
        this.authPreferences =
            {
                provider,
                maxWrong: 3,
                dropWrongAfter: 10000,
                requiredAnswers: 1,
                resetOnWrong: true,
                answerTimeout: 60000,
                onRegenWrong: .5,
                wrongOnTooLong: .5,
                tooFast: 1 * 1000,
                authTimeout: 1000 * 60 * 30
            };
        Object.assign(this.authPreferences, authPreferences);

        this.getRecord = id => (this.map.get(id));
        this._regenRequested = ans => (ans == 'regen');
        this._genReturnValue = (record, state, withQ) => {
            const c = {
                state: state,
                info: record.getInfo()
            };
            if (withQ)
                c.challenge = record.getChallenge();
            return {captcha: c}
        };
    }

    /**
     * Convenient method for checking whether authentication attempt was successful.
     * @param {Object} stateVal state object provided by {@link tryAuth}
     * @returns {boolean} whether authentication succeeded
     */
    authSucceeded(stateVal) {
        return ((stateVal || {}).captcha || {}).state === 'success';
    }

    /**
     * Checks whether the subject with provided id is authenticated.
     * @param {String} id subject's unique id
     * @returns {Boolean} whether the subject is authenticated
     */
    isAuthd(id) {
        const record = this.getRecord(id);
        return record && record.authd && !record.expired();
    }

    /**
     * Deauthenticates subject with provided id.
     * @param {String} id subject's unique id
     */
    deAuth(id) {
        this.map.delete(id);
    }

    /**
     * Deauthenticates subject with provided id and generates new CAPTCHA for the subject.
     * @async
     * @param {String} id subject's unique id
     * @returns {Promise<{captcha}>} authentication state
     */
    async deAuthAndGenNew(id) {
        const r = new AuthRecord(this.authPreferences);
        await r.genCaptcha();
        this.map.set(id, r);
        return this._genReturnValue(r, 'new', true);
    }

    async _handleRegen(rec, id) {
        if (rec) {
            rec.wrong += this.authPreferences.onRegenWrong;
            rec.tryDroppingWrong();
            if (rec.isLimited())
                return this._genReturnValue(rec, 'limit');
            await rec.genCaptcha();
            return this._genReturnValue(rec, 'new', true);
        }
        return await this._handleNew(rec, id);
    }

    async _handleNew(rec, id) {
        if (!rec) {
            rec = new AuthRecord(this.authPreferences);
            await rec.genCaptcha();
            this.map.set(id, rec);
        }else if(rec.isLimited()){
            rec.tryDroppingWrong();
            if(!rec.isLimited())
                await rec.genCaptcha();
        }
        return this._genReturnValue(rec, 'new', true);
    }

    async _handleAnswer(rec, id, ans) {
        if (ans == 'regen') {
            return await this._handleRegen(rec, id);
        }
        if (rec) {
            if (rec.isLimited()) {
                rec.tryDroppingWrong();
                if (rec.isLimited())
                    return this._genReturnValue(rec, 'limit');
                else {
                    await rec.genCaptcha();
                    return this._genReturnValue(rec, 'new', true);
                }
            }
            if (rec.tookTooLong()) {
                rec.wrong += this.authPreferences.wrongOnTooLong;
                if (rec.isLimited())
                    return this._genReturnValue(rec, 'limit');
                await rec.genCaptcha();
                return this._genReturnValue(rec, 'timeout', true);
            }
            if (rec.checkAnswer(ans) && !rec.wasTooFast()) {
                rec.correct++;
                if (rec.authd) {
                    return this._genReturnValue(rec, 'success');
                } else {
                    await rec.genCaptcha();
                    return this._genReturnValue(rec, 'more', true);
                }
            } else {
                rec.wrong++;
                if (this.authPreferences.resetOnWrong)
                    rec.correct = 0;
                if (rec.isLimited())
                    return this._genReturnValue(rec, 'limit');
                else {
                    await rec.genCaptcha();
                    return this._genReturnValue(rec, 'wrong', true);
                }
            }
        } else return await this._handleNew(rec, id);
    }

    /**
     * Tries to authenticate the subject with provided answer. Returns current authentication record if provided
     * answer is falsy or sets up a new record if it is missing. Changes record's correct or incorrect answer count
     * or other information if needed.
     * @async
     * @param {String} id subject's unique id
     * @param {String} ans subject's answer
     * @returns {Promise<{Object}>} object with 'captcha' as an attribute of object with attributes 'challenge',
     * 'state' & 'path'
     */
    async tryAuth(id, ans) {
        this._delOld();
        try {
            let rec = this.getRecord(id);
            if (rec && rec.expired()) {
                this.deAuth(id);
                rec = null;
            }
            if (rec && rec.authd) {
                return this._genReturnValue(rec, 'success');
            }
            if (this._regenRequested(ans))
                return await this._handleRegen(this.getRecord(id), id);
            if (!ans)
                return await this._handleNew(this.getRecord(id), id);
            else return await this._handleAnswer(this.getRecord(id), id, ans);//body.captcha.answer
        } catch (err) {
            return {captcha: {state: 'error'}}
        }
    }

    _delOld() {
        if (Date.now() - this.lastOldCheck > this.authPreferences.authTimeout) {
            this.lastOldCheck = Date.now();
            const mapIter = this.map.entries(),
                toDelete = [];
            let entry;
            do {
                entry = mapIter.next();
                if (entry.value && entry.value[1].expired()) // if auth record expired
                    toDelete.push(entry.value[0]); // if yes push his key to array
            } while (!entry.done);

            // then deauth every record of key
            toDelete.forEach(k => this.deAuth(k));
        }
    }
}

module.exports = CaptchaAuthr;