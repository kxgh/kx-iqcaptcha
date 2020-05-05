# IQCaptcha

IQCaptcha generator and auth-state storer. Create canvas image based puzzle on server!

## Basic usage

The module exports
* `CaptchaMgr`: Class for automatic CAPTCHA creating, providing and dynamic capacity adjusting.
* `CaptchaAuthr`: Class for user authenticity verification with internal CAPTCHA generation using specified provider. 
* `generator`: if you do not wish to use any of these and only want the image/choices/answer object


Base64 encoded PNG:
![demo](https://raw.githubusercontent.com/kxgh/iq-captcha-demo-express-app/master/iqcdemo.png "demo")

  
* self-sufficient: does not scrape/download anything from web, needs no input
* hard to break
* hard to guess (answers are picked from more than just 10 letters!)
* infinite possible outputs!
* can fork child process
* image is created on server therefore the client does not need HTML5 support


* the puzzle is quite difficult. Recommended to use when the user actually needs to *earn* the access. Filter lazy
users!
* ES6 based

If you wish to use demo parser/GUI builder for frontend you can use
[the one from demo app](https://github.com/kxgh/iq-captcha-demo-express-app/blob/master/public/javascripts/iqcScript.js)

### Examples

Just generating, no management or auth:
```javascript
const iqc = require('@kxghnpm/kx-iqcaptcha').generator
    .createGenerator({tileRes: 120, rotatePerLayer: true});
console.log(await iqc.create());

/* output:
* { choices: [ 'I', 'D', 'T', 'P', 'E', 'M', 'O', 'Z', 'N', 'S' ],
* answer: 'DI',
* data:
*  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...'
*/
```

Auto generating, you need to implement your own auth:
```javascript
const iqc = require('@kxghnpm/kx-iqcaptcha');
const CaptchaMgr = iqc.CaptchaMgr;
const iqcMgr = new CaptchaMgr({initialCapacity: 5, logger: console, forks: true})
iqcMgr.begin(); // begin auto generation
// ...
let captcha = await iqcMgr.popCaptcha(); // get one
// ...
iqcMgr.terminate(); // stop captcha management
```

Auto generating, using bundled auth:
```javascript
const {CaptchaAuthr, CaptchaMgr} = require('@kxghnpm/kx-iqcaptcha');

const iqcMgr = new CaptchaMgr();
iqcMgr.begin();
const authPreferences = {
    requiredAnswers: 2,
    resetOnWrong: false,
    answerTimeout: 90000
};
const authr = new CaptchaAuthr(iqcMgr, authPreferences);
// ...
const rec = authr.tryAuth('uniqueUserId123','fX');
if(authr.authSucceeded(rec)){
    // pass !!!
}else{
    // not yet solved or expired
}
```

# API

## generator

### createGenerator

Creates generator object with functions mentioned below. Accepts `opts` params with these properties:
* `tileRes` tile resolution in pixels. A tile is considered to be one of the 3x3 squares or one of the offered answers. 
All other aspects of image are calculated using this parameter to keep proper ratio. Defaults to 100.

#### create()

Asynchronous function resolving object with following properties:
* `choices` list of characters that are current choices
* `answer` correct answer as a string of exactly two characters
* `data` base64 encoded png image

#### testGenToFile([filename])

Synchronously creates file with valid HTML img tag sourced to a newly created CAPTCHA image. `console.log`s correct 
answer and inserts it into image's alt attribute. For debugging or demo purposes only.
* `filename` the file which will be written to. Overwrites if the file exists. Defaults to `IQCtestgen.html` prepended 
with current timestamp.

## CaptchaMgr

Class for automatic CAPTCHA creating, providing and dynamic capacity adjusting. Its constructor accepts params object 
opts:

* `opts.initialCapacity` starting CAPTCHA capacity. Defaults to 3
* `opts.checkInterval` time interval for CAPTCHA checks in millisecondds. These checks ensure that the amount of ready 
 CAPTCHAs meet the current demand. Defaults to 1500.
* `opts.capacityDynamic` whether capacity should be dynamically adjusted. If set to `false`, the capacity stays at 
 initial value. Default `true`.
* `opts.capacityCutbackInterval` time in milliseconds after which capacity drops by one. Default 1000*60*60
* `opts.capacityCutbackMinPercentage` minimal ready/capacity ratio to perform cutback. Default 0.9
* `opts.logger` logger. Set this to `console` if you wish to see how capacity adjusts over time. Defaults to silent.
* `opts.forks` whether creation should run in one separate process. Defaults to `true`
* `opts.genOpts` generator options:
* `opts.genOpts.rotatePerLayer` whether every picture in group should be rotated. Defaults to `true`
* `opts.genOpts.textFill` whether text should be filled too. Default true
* `opts.genOpts.possibleLetters` array of possible letters. Default list of ADEIHKMNOPSTWXZ. Ten of these letters will 
be randomly chosen and will form possible answers. User will have to solve the CAPTCHA but also identify the letter
correct answer is represented by. Consider not including letters that look alike.
* `opts.genOpts.letterFillStyle` canvas style for text. Default `rgba(0,0,0,0.4)`
* `opts.genOpts.fillStyle` canvas style for shapes. Default `rgba(0,0,0,0.2)`
* `opts.genOpts.strokeStyle` canvas stroke style. Uses default if none provided (black).

### begin()

Starts the periodic, non-blocking checking for CAPTCHAs. If amount of ready CAPTCHAs is less than specified capacity,
a CAPTCHA is generated. This method needs to be called before calling any CAPTCHA providing functions.

### popCaptcha()

Retrieves ready CAPTCHA from the queue in a form of promise. Resolved object will be in form choices/answer/data (see 
generator's create function). If large amount of CAPTCHAs are required at once and the queue length is insufficient, 
creation is instantly prompted and the requests will be resolved FIFO style.

### terminate()

Stops all ongoing time intervals/checks. Kills child process.

## CaptchaAuthr

Class for user authenticity verification with internal CAPTCHA generation using specified provider. Its constructor
accepts 2 objects: 
* `provider` instance of `CaptchaMgr`. This manager will be used internally for CAPTCHA creation. Make sure to call 
`begin` on the provider.

* `authPreferences` authentication preferences. Details below:
* `authPreferences.maxWrong` the count of maximum allowed incorrect attempts before the subject needs to wait. Default 3
* `authPreferences.dropWrongAfter` the time in milliseconds after which an incorrect attempt is dropped. Default 10000
* `authPreferences.requiredAnswers` the number of answers required. Default 1
* `authPreferences.resetOnWrong` whether the correct answer count resets on wrong answer. Default `true`
* `authPreferences.answerTimeout` the time limit in milliseconds the subject has for one answer. Default 60000
* `authPreferences.onRegenWrong` the value that adds up to wrong count on subjects' new CAPTCHA generation request. 
Default 0.5
* `authPreferences.wrongOnTooLong` the value that adds up to wrong count when a subject takes too long. Default 0.5
* `authPreferences.tooFast` the time in milliseconds we consider too fast to be genuine answer. Default 1000
* `authPreferences.authTimeout` the time in milliseconds authentication expires. Default 1000*60*30

### tryAuth(id, ans)

Tries to authenticate the subject with provided answer. Returns current authentication record if provided
answer is falsy or sets up a new record if it is missing. Changes record's correct or incorrect answer count
or other information if needed. It has these required params:

* `id` subject's unique id as a string
* `ans` user's answer. Should be exactly two letters. Checks are not case insensitive and accepts any order. 

Asynchronous. Resolves state object with `captcha` as an attribute of object with attributes `challenge`,
`state` & `path`. Use `authSucceeded` function to check whether the auth was succesful.

### authSucceeded(stateVal)

Convenient method for checking whether authentication attempt was successful.
* `stateVal` state object provided by `tryAuth`

### deAuth(id)

Deauthenticates subject with provided id.
* `id` subject's unique id as a string

### deAuthAndGenNew(id)

Deauthenticates subject with provided id and generates new CAPTCHA for the subject.
* `id` subject's unique id as a string
