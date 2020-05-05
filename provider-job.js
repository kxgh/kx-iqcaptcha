const genOpts = JSON.parse(process.argv[2] || "");

const generator = require('./generator').createGenerator(genOpts);

process.on('message', msg => {
    if (msg === 'provide') {
        generator.create().then(result => {
            process.send(result);
        }).catch(err => {
            process.send({err});
        });
    }
});