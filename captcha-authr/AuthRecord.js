/**
 * Class that represents subject's authentication record.
 * @class AuthRecord
 */
class AuthRecord {
    /**
     * AuthRecords are constructed by parent {@link CaptchaAuthr}. There's no need to construct the records on your own.
     * @constructs AuthRecord
     * @param {Object} authPreferences provided by {@link CaptchaAuthr}
     */
    constructor(authPreferences) {
        this._authd = false;
        this._wrong = 0;
        this._correct = 0;
        this.lastLimitTime = 0;
        this.lastDownloadTime = Date.now();
        this.lastAuthTime = 0;
        this.authPreferences = authPreferences;
        this.customChecker = authPreferences.customChecker;
        this.customChallenger = authPreferences.customChallenger;

        if (!this.customChecker)
            this.customChecker = (ans1, ans2) => String(ans1).toLowerCase().split('').sort().join('')
                === String(ans2).toLowerCase().split('').sort().join('');
        if (!this.customChallenger)
            this.customChallenger = (captcha) => (captcha.data);
    }

    /**
     * Checks whether subject's authentication expired. The record should be deleted if expired.
     * @return {Boolean} true if expired, false otherwise
     */
    expired() {
        return this.lastAuthTime !== 0 && Date.now() - this.lastAuthTime > this.authPreferences.authTimeout;
    }

    _authenticate() {
        if (!this._authd) {
            this._authd = true;
            this.lastAuthTime = Date.now();
        }
    }

    get authd() {
        return this._authd;
    }

    /**
     * Gets correct answer count.
     * @returns {Number} correct count for record
     */
    get correct() {
        return this._correct;
    }

    /**
     * Sets correct answer count. Changes authenticated state if eligible.
     * @param value the value to be set
     */
    set correct(value) {
        this._correct = value;
        if (this._correct >= this.authPreferences.requiredAnswers)
            this._authenticate();
    }

    /**
     * Gets incorrect answer count.
     * @returns {Number} wrong count for record
     */
    get wrong() {
        return this._wrong;
    }

    /**
     * Sets incorrect answer count. Changes authenticated state if eligible.
     * @param value the value to be set
     */
    set wrong(value) {
        if (!this.isLimited()) {
            this._wrong = value;
            if (this.isLimited())
                this.lastLimitTime = Date.now();
        }
    }

    /**
     * Retrieves CAPTCHA from the specified CAPTCHA provider.
     * @async
     * @returns {Promise<void>}
     */
    async genCaptcha() {
        this.captcha = await this.authPreferences.provider.popCaptcha();
        this.lastDownloadTime = Date.now();
    }

    /**
     * Checks whether the answer is correct. If provided, custom checker is used.
     * @param {String} ans the provided answer
     * @returns {Boolean} whether the answer is correct
     */
    checkAnswer(ans) {
        return this.customChecker ? this.customChecker(ans, this.captcha.answer) : this.captcha.answer == ans;
    }

    /**
     * Returns CAPTCHA challenge. Could be question/image/object of both. Default is captcha's question property.
     * If provided, custom challenger is used.
     * @returns {*}
     */
    getChallenge() {
        return this.customChallenger ? this.customChallenger(this.captcha) : this.captcha.question;
    }

    /**
     * Tries to drop one incorrect answer. Succeeds only when specified time elapsed.
     */
    tryDroppingWrong() {
        if (this.isLimited() && Date.now() - this.lastLimitTime > this.authPreferences.dropWrongAfter) {
            this._wrong = 0;
            this.lastDownloadTime = Date.now();
        }
    }

    /**
     * Checks whether the subject answered incorrectly too many times and has to wait.
     * @returns {Boolean} true if is limited, false otherwise
     */
    isLimited() {
        return this._wrong > this.authPreferences.maxWrong;
    }

    /**
     * Checks whether the subject took too long to answer the challenge.
     * @returns {Boolean} true if took too long, false otherwise
     */
    tookTooLong() {
        return Date.now() - this.lastDownloadTime > this.authPreferences.answerTimeout;
    }

    /**
     * Checks whether the subject answered suspiciously fast.
     * @returns {Boolean} true if the answer was too fast, false otherwise
     */
    wasTooFast() {
        return Date.now() - this.lastDownloadTime < this.authPreferences.tooFast;
    }

    /**
     * Gets record info.
     * @return {{required: number, wrong: number, maxWrong: number, correct: number, resets: boolean, dropAfter: number, timeout: number, time: number, lastDownloadTime: number | *, lastLimitTime: number, onRegenWrong: number, lastAuthTime: number}}
     */
    getInfo() {
        return {
            required: this.authPreferences.requiredAnswers,
            wrong: this._wrong,
            maxWrong: this.authPreferences.maxWrong,
            correct: this._correct,
            resets: this.authPreferences.resetOnWrong,
            dropAfter: this.authPreferences.dropWrongAfter,
            timeout: this.authPreferences.answerTimeout,
            time: Date.now(),
            lastDownloadTime: this.lastDownloadTime,
            lastLimitTime: this.lastLimitTime,
            onRegenWrong: this.authPreferences.onRegenWrong,
            lastAuthTime: this.lastAuthTime
        };
    }
}

module.exports = AuthRecord;