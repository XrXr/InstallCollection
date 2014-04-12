const enabled = 'btn btn-success';
const disabled = 'btn btn-default';
const p_normal = "progress-bar";
const p_success = "progress-bar progress-bar-success";
const p_restart = "progress-bar progress-bar-warning";

//name space
var install_collection = {};

//modules
install_collection.Add_on = function(data){
    this.name = m.prop(data.name);
    this.url = m.prop(data.url);
    this.progress = m.prop(0);
    this.progress_class = m.prop(p_normal);
    this.button_class = m.prop(enabled);
};

install_collection.Add_on_list = Array;

//views
install_collection.install_view = function(ctrl){
    return  ctrl.list.map(function (add_on, index){
        return m('div', {style: {margin:'0 5% 0 5%'}},[
                    m('div', {class: 'progress'},[
                        m('div', {class: add_on.progress_class(),
                            role: 'progressbar',
                            style: {width: Math.round(add_on.progress()*100) + '%'}}),
                        m('div',{style:{position: "relative"}},[
                            m('div', {class: 'progress_text'},
                            add_on.name())
                        ])
                    ])
            ]);
    });
};

install_collection.selection_view = function(ctrl){
    return m('div',[m('button', {type: 'button',
            class: "btn btn-danger btn-lg", onclick: confirm,
            disabled: !ctrl.clear_to_install()},
         "Install Selected"),
        m('hr'),
        m('table',ctrl.list.map(function (add_on, index){
            return m('tr',[
                m('td',{style: {padding: "0 0 5px 0"}},[
                    m('button', {onclick: m.withAttr('class', function(value){
                        if (value.trim() == enabled){
                            add_on.button_class(disabled);
                            var all_disabled = true;
                            for (var i = 0; i < ctrl.list.length; i++) {
                                if (ctrl.list[i].button_class() == enabled){
                                    all_disabled = false;
                                    break;
                                }
                            }
                            if (all_disabled){
                                ctrl.clear_to_install(false); 
                            }
                        } else {
                            add_on.button_class(enabled);
                            ctrl.clear_to_install(true);
                        }
                        m.render(document.body, install_collection.selection_view(ctrl));
                    }),
                        type: 'button', class: add_on.button_class()},
                        add_on.name())
                    ])
                ]
            );
        }))]
    );
};

//controller
install_collection.install_controller = function(){
    this.clear_to_install = m.prop(true);
    this.list = new install_collection.Add_on_list();
    this.name = m.prop("");
    this.url = m.prop("");
    this.add = function(name, url){
        if (name()) {
            this.list.push(new install_collection.Add_on(
                {name: name(), url: url()}));
            this.name("");
            this.url("");
        }
    };
    this.clear = function() {
        this.list = new install_collection.Add_on_list();
    };
};

var ctrl = new install_collection.install_controller();
// ctrl.name("Write code");
// ctrl.url("Good luck!");
// ctrl.add(ctrl.name, ctrl.url);
// ctrl.name("Write code");
// ctrl.url("Good luck!");
// ctrl.add(ctrl.name, ctrl.url);
// ctrl.list[0].progress(0.5);
// console.log(ctrl.list.length); //2
m.render(document.body, install_collection.selection_view(ctrl));
// m.render(document.body, install_collection.install_view(ctrl));

function confirm(){
    var add_ons = {names: [], urls: []};
    for (var i = 0; i < ctrl.list.length; i++) {
        if (ctrl.list[i].button_class() == enabled){
            add_ons.names.push(ctrl.list[i].name());
            add_ons.urls.push(ctrl.list[i].url());            
        }
    }
    addon.port.emit("confirm-install", add_ons);
}

function get_add_on_by_name (name) {
    for (var i = 0; i < ctrl.list.length; i++) {
        if (ctrl.list[i].name() == name){
            return ctrl.list[i];
        }
    }
}

addon.port.emit("loaded");

addon.port.on("add-ons", function(add_ons) {
    for (var i = 0; i < add_ons.names.length; i++) {
        ctrl.name(add_ons.names[i]); 
        ctrl.url(add_ons.urls[i]); 
        ctrl.add(ctrl.name, ctrl.url);
    }
    m.render(document.body, install_collection.selection_view(ctrl));
});

addon.port.on("install", function(add_ons) {
    //switch to install view
    ctrl.clear();
    for (var i = 0; i < add_ons.names.length; i++) {
        ctrl.name(add_ons.names[i]); 
        ctrl.url(add_ons.urls[i]); 
        ctrl.add(ctrl.name, ctrl.url);
    }
    m.render(document.body, install_collection.install_view(ctrl));
});

addon.port.on("progress-update", function(progress_update) {
    get_add_on_by_name(progress_update.name).
        progress(progress_update.progress);
    m.render(document.body, install_collection.install_view(ctrl));
});

addon.port.on("install-finished", function(finished) {
    var add_on = get_add_on_by_name(finished.name);
    add_on.progress(1);
    if (finished.needs_restart){
        add_on.progress_class(p_restart);
        add_on.name(add_on.name() + " - Needs restart");
    } else {
        add_on.progress_class(p_success);
    }
    m.render(document.body, install_collection.install_view(ctrl));
    var all_done = true;
    for (var i = 0; i < ctrl.list.length; i++) {
        if (ctrl.list[i].progress_class() == p_normal){
            all_done = false;
            break;
        }
    }
    if (all_done){
        addon.port.emit("all-done");
    }
});