const fetcher = require("./fetcher");
const { all } = require("sdk/core/promise");

exports["test fetch_all"] = function(assert, done) {
    let f = fetcher.Fetcher();
    f.set_url("https:/addons.mozilla.org/en-US/firefox/collections/idenis/power/?page=1/");
    f.start().then(r => {console.log(r); done();}, console.log);

};

console.log(exports);

require("sdk/test").run(exports);