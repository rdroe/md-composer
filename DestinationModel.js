// DestinationModel
// Backup the data to be manipulated
import FileListModel from './FileListModel.js';
import fs from 'fs';
import pandoc from 'node-pandoc'
import assert from 'assert'

const glob = require ('glob-fs');
let config;
        
export default class extends FileListModel {
    
    //back up and wipe the files in the filesystem area we are about
    //to use
    go () 
    {   this.setConfig();
        var that = this,
            ds = this.loadDirectoryInfo();

        this.once(
            'nonEmptyDirScanned', 
            function(filez) {
                this.backUp.call(this, filez);
            }
        );
        
        this.once(
            'emptyDirScanned', 
            function() {
                console.log('empty dir scanned');
            }
        );

        this.once('backedUp', function() {
            
            that.clearFiles();
            console.log('backed up');
            
        });
        
        
        

    }
    
    // Set up some initial configuration   
    setConfig ()
    {
        config = {
            'backupCollection': 'backups',
            formats: {
                'from': 'docx',
                'to' : 'markdown',
                'backup' : 'markdown',
                
            }
        };        
    }
    
    //get docxFiles dynamically gen'd
    get docxFiles ()
    {
        console.log('getting docxDir...');
        return this.dir + '/' + this.callsign + "*.docx";
    }

    // get dir (dynamically)
    get directory ()
    {
        console.log('getting directory...');
        return this.dir + '/';
    }
    
    // get pandoc args (dynamically generated)
    get pdArgs ()
    {
        return '-f ' + config.formats.from + ' -t ' + config.formats.to;
    }
    
    //Mock for now; clear the backed up files
    clearFiles () {
        
        var that = this;
        
        //here, syncronously remove files
        that.emitDocxState('2');
        
        //re-scann directory for docx
        that.once('emptyDirScanned-2', function() {
            console.log('dir now empty');
        });
        
        that.once('nonEmptyDirScanned-2', function() {
            console.log('dir NOT empty');
        });
       
    };
    
    //Treat directory
    loadDirectoryInfo () {
        
        console.log('46');
        const that = this, 
              dir = that.dir;
        
        //test access and existence of directory
        fs.access(dir, fs.constants.R_OK | fs.constants.W_OK, (err) => {
            
            //On error, presume non-existence
            if (err) {
                fs.mkdirSync(dir);
                that.emit('emptyDirScanned');
                return;

            }
            
            this.emitDocxState.call(that);
            
        });
    }
    
    //Emit docx (destination dir) state for the rest of the class
    emitDocxState(suffix)
    {
        if (!suffix) {
            suffix = '';
        } else {
            suffix = '-' + suffix;
        }
        
        const emptyEvNm = 'emptyDirScanned' + suffix,
                nonEmptyEvNm = 'nonEmptyDirScanned' + suffix,
                that = this;
        
        console.log('ev names', emptyEvNm, nonEmptyEvNm);
        //read docx files and tell whether dir is empty
        glob({gitignore: true}).readdir(that.docxFiles, function(err, files2) {


            //non-array is erroneous
            if (!Array.isArray(files2)) {
                //reject is sort of like throwing an error in async mode.
                reject('could not obtain info about destination directory');
            }


            if (files2.length === 0) {
                that.emit(emptyEvNm);

            } else if (files2.length >= 1) {
                that.emit(nonEmptyEvNm, files2);
            }
        });        
    }
    
    /**
     * Back up the specified array of files
     * @param {Array} files Files to back up to Mongo
     */
    backUp (files)
    {
        const   that = this,
                fileData = this.buildFileData(files);
        
        this.on('fileDataBuilt', function (fileTextArr) {
            this.saveFileData(fileTextArr);
        });
    }
    // Build file data
    buildFileData(fileArr)
    {
        const that = this,
              fileDataArr = [];
        
        fileArr.forEach(function(fileNm) {
            that.getText(fileNm, fileDataArr);
        });
        
        this.on('singleFileExtracted', function() {
            console.log(fileDataArr.length, fileArr.length);
            if (fileDataArr.length === fileArr.length) {
                console.log('142', fileDataArr);
                that.emit('fileDataBuilt', fileDataArr);
            }
        });
    }
    
    //Get the text (md-converted) for a specified file
    getText(filename, returnArray)
    {
        const   that = this,
                src = './' + filename,
                args = this.pdArgs;

        const callback = function (err, result) {
            
                returnArray.push({filename: filename , text: result});
                that.emit('singleFileExtracted');
        };

        // Call pandoc 
        pandoc(src, args, callback);
    }
    
    //Insert file data to configured mongo collection
    saveFileData(fileData)
    {   
        const that = this,
              MongoClient = require('mongodb').MongoClient,
              url = 'mongodb://localhost:27017/md-cleaner';
              

        MongoClient
            .connect(url)
            .then((db) => {
                    that.insertDocument(fileData, db)
                }
            )
            .catch((ee) => {
                console.log('catch', ee);
            }
        );
            
        that.on(
            'filesInserted', 
            (db) => {
                db.close();
                that.emit('backedUp');

            }
        );
        
    }
    
    // Insert a doc to the db
    insertDocument(fileData, db) {
        
        var that = this;
        
        db
        .collection(config.backupCollection)
        .insertOne(
            {
               dir: that.dir,
               files: fileData,
               date: new Date()
            }, 
            (err, result) => {
                //after inserting
                if (err) {
                    console.error(err);
                }
                assert.equal(err, null);
                console.log("Inserted a document into backups coll.");
                that.emit('filesInserted', db);
            }
        );
    };

} 