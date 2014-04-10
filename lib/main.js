const { ActionButton } = require("sdk/ui/button/action");
const data = require("sdk/self").data;
const pm = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const { MatchPattern } = require("sdk/util/match-pattern");
const {Cu} = require("chrome");
Cu.import("resource://gre/modules/AddonManager.jsm");

const is_collection = new MatchPattern(/.*\/\/addons.mozilla.org\/.+\/firefox\/collections\/.+\/.+/);

const active_icon = {
    "32": data.url("icons/active32.png"),
    "64": data.url("icons/active64.png")
};
const inactive_icon = {
    "32": data.url("icons/inactive32.png"),
    "64": data.url("icons/inactive64.png")
};
var install_button = ActionButton({
    id: "install-button",
    label: "Cannot install add-ons form current page",
    icon: inactive_icon,
    onClick: install
});

tabs.on('activate', update);
tabs.on('load', update);

var worker = null;

function install() {
    if (worker !== null){
        worker.port.emit('get-add-ons');
    }
}

function update(tab){
    if (tab != tabs.activeTab){
        return; //we only care about what is active
    }
    if (is_collection.test(tabs.activeTab.url)){
        worker = tabs.activeTab.attach({
            contentScriptFile: data.url("content/get-add-ons.js")
        });
        worker.port.on("collection-page", function() {
            console.log("this page is definitely a AMO add-on collection page");
        });
        worker.port.on("no-add-ons-found", function(reason) {
            console.log(reason);
            console.log('todo: lock this page with action button state()');
        });
        worker.port.on('found-add-ons', function(add_ons){
            show_side_bar(add_ons);
        });
        install_button.icon = active_icon;
        install_button.label = "Click to install add-ons from this collection!";
    } else {
        if (worker !== null){
            worker.destroy();
            worker =  null;            
        }
        install_button.icon = inactive_icon;
        install_button.label = "Cannot install add-ons form current page";
    }
}

var sidebar = null;
function show_side_bar (add_ons) {
    if (sidebar === null){
        sidebar = require("sdk/ui/sidebar").Sidebar({
          id: 'my-sidebar',
          title: 'Install Collection',
          url: require("sdk/self").data.url("side_bar/side_bar.html"),
          onAttach: function (worker) {
            worker.port.on("ping", function() {
              console.log("add-on script got the message");
              worker.port.emit("pong");
              worker.port.emit("add-ons", add_ons);
            });
          }
        });        
    }
    sidebar.show();
}