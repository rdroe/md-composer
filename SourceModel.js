//SourceModel.js
var MongoClient = require('mongodb').MongoClient,
    url = "mongodb://localhost:27017/md-cleaner",
    cli = require('commander'),
    _ = require('lodash');
 
var glob = require ('glob-fs')({gitignore: true}),
        fs = require('fs'),
        path = require('path'),
        state = [];

    
export default class extends FileListModel { 
     
    go (dir) {
        this.cacheFiles();
    }
    
    createDestinationList () {

    }
    
    
}