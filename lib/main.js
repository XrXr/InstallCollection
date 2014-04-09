const { ActionButton } = require("sdk/ui/button/action");
const data = require("sdk/self").data;
const pm = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const { MatchPattern } = require("sdk/util/match-pattern");

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

var collection_checker = pm.PageMod({
  include: /.*\/\/addons.mozilla.org\/.+\/firefox\/collections\/.+\/.+/,
  contentScriptFile: data.url("content/is-collection.js"),
    onAttach: function(worker) {
        worker.port.on("collection-page", function() {
          console.log("this page is definitely a AMO add-on collection page");
        });
    }
});

tabs.on('activate', update_button);
tabs.on('load', update_button);

function install() {
    console.log("SOMEONE CLICKED ME!");
}

function update_button(){
    if (is_collection.test(tabs.activeTab.url)){
        install_button.icon = active_icon;
        install_button.label = "Click to install add-ons from this collection!";
    } else {
        install_button.icon = inactive_icon;
        install_button.label = "Cannot install add-ons form current page";
    }
}