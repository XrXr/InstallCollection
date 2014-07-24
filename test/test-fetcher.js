/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Author: XrXr
 */
const fetcher = require("./fetcher");
const { all } = require("sdk/core/promise");

let target = "https:/addons.mozilla.org/en-US/firefox/collections/idenis/power/?page=1/";

let test_add_on_list = (function(){
    function test_add_on (assert, add_on) {
        assert.ok(add_on.hasOwnProperty("name") &&
            add_on.hasOwnProperty("link"),
            "has 'name' and 'link' as properies" );
        assert.ok(typeof add_on.name === "string" &&
            typeof add_on.link === "string",
            "'name' and 'link' are strings");
    }

    function test_add_on_list (assert, add_ons) {
        assert.notEqual(add_ons, undefined, "add_on_list is defined");
        assert.ok(add_ons.hasOwnProperty('installs'),
            "has 'installs' property");
        assert.ok(add_ons.hasOwnProperty('manual_installs'),
            "has 'manual_installs' property");
        assert.ok(Array.isArray(add_ons.installs) &&
                    Array.isArray(add_ons.manual_installs),
                  "'manual_installs' and 'installs' are arrays");
        try {
            for (let e of add_ons.installs) {
                test_add_on(assert, e);
            }
        } catch (err){
            assert.ok(false, "add_on's inside add_on_list.installs are valid");
        }
        try{
            for (let e of add_ons.manual_installs) {
                test_add_on(assert, e);
            }
        } catch (err){
            assert.ok(false, "add_on's inside add_on_list.manual_installs are valid");
        }
    }
    return test_add_on_list;
})();

function no_reject (assert) {
    return _ => {
        assert.ok(false, "promise should never reject unless destroyer is called");
    };
}

let test_fetch = {
    "test valid result": function(assert, done){
        fetcher.fetch(target)[0].
        then(r => {
            test_add_on_list(assert, r);
        }, no_reject(assert)).
        then(done, done);
    },

    "test valid result, fetch_first == true": function(assert, done){
        fetcher.fetch(target, true)[0].then(r => {
            assert.strictEqual(r.constructor.name, "FetchResult",
                "constructor of the result is called FetchResult");
            assert.strictEqual(typeof r.add_ons, "object",
                "type of fetch_result.add_ons is object");
            assert.strictEqual(typeof r.total, "number",
                "type of fetch_result.total is number");
            test_add_on_list(assert, r.add_ons);
        }, no_reject(assert)).
            then(done, done);
    },

    "test destroyer": function(assert, done){
        let [promise, destroyer] = fetcher.fetch(target);
        assert.strictEqual(typeof destroyer, "function", "destroyer is a function");
        assert.ok(destroyer(), "First destroyer call returns true");
        let result = [];
        for (var i = 0; i < 100; i++) {
            result.push(destroyer());
        }
        assert.ok(result.every(e => e === false), "second to 101th call all return false");
        promise.then(r => {
            assert.ok(false, "promise shouldn't resolve successfully");
        }, () => {
            assert.ok(true, "promise should be rejected");
        }).then(done, done);
    }
};

let test_fetcher = {
    "test valid result": function(assert, done){
        let f = fetcher.Fetcher();
        f.set_url(target);
        f.start().then(r =>{
            test_add_on_list(assert, r);
        }).
        then(done, () => assert.ok(false, "Fetcher.start()'s promise rejected unexpectedly")).
        then(done, done);
    }
};

function test_fetcher_single (assert, done) {
    let f = fetcher.Fetcher();
    f.set_url("https://addons.mozilla.org/en-US/firefox/collections/mozilla/webdeveloper/");
    f.start().then(r =>{
        test_add_on_list(assert, r);
    }).
    then(done, () => assert.ok(false, "Fetcher.start()'s promise rejected unexpectedly, single page")).
    then(done, done);
}

exports["test merge()"] = function(assert){
    function maker(num){
        let a = {installs: [], manual_installs: []};
        for (let i = 0; i < num; i++){
           a.installs.push({});
           a.manual_installs.push({});
        }
        return a;
    }

    let sample = [];
    for (let i = 0; i < 100; i++){
        sample.push(maker(i));
    }
    let merged = fetcher.merge(sample);
    assert.strictEqual(Object.keys(merged).length, 2,
        "merged object has exactly two properties");
    assert.ok(Array.isArray(merged.installs),
        "merged.installs is array");
    assert.ok(Array.isArray(merged.manual_installs),
        "merged.manual_installs is array");
    // 0 + 1 + 2 ... + 99 = (1 + 99) * 99 / 2 = 4950
    assert.strictEqual(merged.installs.length, 4950,
        "merged.installs has expected length");
    assert.strictEqual(merged.manual_installs.length,
        4950, "merged.manual_installs has expected length");
};
exports["test fetch()"] = test_fetch;
exports["test Fetcher()"] = test_fetcher;
exports["test Fetcher(), single"] = test_fetcher_single;

require("sdk/test").run(exports);