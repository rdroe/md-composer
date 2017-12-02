//FileListModel.js


import events from 'events'; 

export default class extends events.EventEmitter {
        
    constructor(dir, callsign, extension) {

        super();
        this.dir = dir;
        this.callsign = callsign;
        this.extension = extension;
        this.files = [];
        
        this.go(this.dir);

    }
        
}