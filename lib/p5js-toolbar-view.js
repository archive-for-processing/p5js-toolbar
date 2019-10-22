'use babel';

const express = require('express')
const portfinder = require('portfinder');
const http = require('http');
const readdirp = require('readdirp');
const opn = require('opn');
const fse = require('fs-extra')
const request = require('request');
const download = require('download');

export default class P5jsToolbarView {

  constructor(serializedState) {

    // console.log("p5js-toolbar loading...");

    this.app = express()
    this.server;
    this.port;

    //serverStatus of the server if off = false, on = true
    this.serverStatus = false;

    this.localPath =  atom.packages.resolvePackagePath("p5js-toolbar")

    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('p5js-toolbar');
    const toolbar = this.element

    //create logo
    this.logo = document.createElement("img");
    this.logo.classList.add('p5logo');
    this.logo.src = this.localPath + "/images/p5js.svg";
    toolbar.appendChild(this.logo);

    //create play button
    this.button = document.createElement('img');
    this.button.classList.add('p5button');
    this.button.src = this.localPath + "/images/play-button.svg";
    toolbar.appendChild(this.button);

    this.button.addEventListener("mouseover", (e) => {
      if(this.serverStatus == true){
        this.button.src = this.localPath + "/images/stop-button-flip.svg";
      }else{
        this.button.src = this.localPath + "/images/play-button-flip.svg";
      }
    });

    this.button.addEventListener("mouseout", (e) => {
      if(this.serverStatus == true){
        this.button.src = this.localPath + "/images/stop-button.svg";
      }else{
        this.button.src = this.localPath + "/images/play-button.svg";
      }
    });

    this.button.addEventListener("click", (e) => {
      if(this.serverStatus == true){ //stop server
        // console.log("stop server")
        this.stopServer()
      }else{ //start server
        // console.log("start server")
        if(atom.project.getPaths()[1]){
          atom.notifications.addError('You might have more than one p5js project open? Open a single project and try again.');
        }else{

          //save all open tabs
          atom.workspace.getPanes().forEach((pane)=>{
            pane.saveItems()
          })

          //start the server
          this.startServer()
        }
      }
    });

    //create new project button
    this.newProject = document.createElement('a');
    this.newProject.classList.add('newProject');
    this.newProject.appendChild( document.createTextNode("+ New Project") );
    this.newProject.title = "+ New Project";
    this.newProject.href = "#"; //https://p5js.org/download/
    toolbar.appendChild(this.newProject);
    this.newProject.addEventListener("click", () => {
      console.log("Creating new p5js project...")

      this.generateNewProject();

      //+~+~+~++~+~ old notes +~+~+~+~+~+//
      // let modal = document.createElement('div');
      //
      // let input = document.createElement("input");
      // input.type = "text";
      // input.placeholder = "my p5.js project name..."
      // input.style = "width:100%;"
      // modal.appendChild(input);
      //
      // let saveB = document.createElement('div')
      // saveB.innerHTML = "name project."
      // modal.appendChild(saveB);
      //
      // saveB.addEventListener("click", () => {
      //   console.log(input.value)
      // })
      //
      // atom.workspace.addModalPanel({
      //   item: modal,
      //   visible: true,
      //   priority: 100,
      //   autoFocus: true
      // })
      //+~+~+~++~+~ old notes +~+~+~+~+~+//

    })


    //create helpful links
    function createLink(title, link){
      var c = document.createElement('a');
      c.appendChild( document.createTextNode(title) );
      c.title = title;
      c.href = link;
      toolbar.appendChild(c);
    }

    createLink("Reference", "http://p5js.org/reference");
    createLink("Forum", "https://discourse.processing.org/c/p5js");
    createLink("Examples", "https://p5js.org/examples/");
    // createLink("Learn", "https://p5js.org/learn/");
    createLink("Report Issue", "https://github.com/processing/p5.js/issues");


    // +~+~+~+~+~+~ Download Latest p5.js release from github +~+~+~+~+~~+
    this.downloadLatestp5()



  } //end constructor

  downloadLatestp5(){

    const options = {
      url: 'https://api.github.com/repos/processing/p5.js/releases',
      headers: {
        'User-Agent': 'p5js-toolbar'
      }
    };

    request(options, (error, response, body)=>{

      let api = JSON.parse(body) //get the github api and parse as json
      // console.log(api)

      //loop through each of the assets and check for the name, then get the URL and download
      for (asset in api[0].assets){

        if(
          api[0].assets[asset].name == 'p5.min.js' ||
          api[0].assets[asset].name == 'p5.sound.min.js'
        ){
          //download the files!
          let dl_url = api[0].assets[asset].browser_download_url
          let file_name = api[0].assets[asset].name
          // console.log(dl_url)

          // console.log(this.localPath)
          console.log('downloading latest version of ' + api[0].assets[asset].name)
          download(dl_url, this.localPath + "/p5").then(() => {
              console.log('download complete!');
          });

          //an alternative idea incase the above doesnt work for some reason.
          // download(dl_url).then(data => {
          //   fs.writeFileSync(this.localPath + "/p5/" + file_name, data);
          // });

        }
      }
    });
  }

  generateNewProject(){

    // Eventually this should pull from the p5.js website and build a file on the fly! or use a CDN for 'current'? // now this happens when the plugin is init, this is to save on the amount of requests, its likely that it's not going to be needed that often...

    atom.pickFolder((pickedPath)=>{
      console.log(pickedPath)

      if(pickedPath == null) return;

      pickedPath = pickedPath[0] //grab the first folder

      //rename so we can save in the same directory iteratively
      let newProjectName = "/p5"
      let count = 0
      while(fse.existsSync(pickedPath + newProjectName )){
        count++
        newProjectName = "/p5-" + count
      }

      if( !fse.existsSync(pickedPath + newProjectName ) ){ //check if a p5 folder exists so we dont overwrite
        fse.ensureDirSync(pickedPath + newProjectName) //create a new directory for the project to live in
        fse.copySync( this.localPath + "/p5", pickedPath + newProjectName)

        //open a new atom window to the project
        atom.open({
          pathsToOpen: [pickedPath + newProjectName, pickedPath + newProjectName + '/sketch.js' ],
          newWindow:true
        })

      }else{
        atom.notifications.addError('It looks like there is already a p5 project in the folder you selected to save into. Try Again.');

      }

    })
  }

  startServer(pathtoINDEX){
    console.log("***RUN THE SERVER***")
    if(atom.project.rootDirectories.length == 0 || atom.project.rootDirectories.length > 1){
      console.error('no index file found')
      atom.notifications.addError('Are you sure you have a SINGLE p5js project open?');
      return;
    }
      readdirp({ root: atom.project.getPaths()[0], fileFilter: 'index.html' }) //search out 0th project path for index.html
        .on('data', (entry) => {
          console.log(entry)
        // fs.existsSync(atom.project.getPaths()[0] + "/index.html")

        if(this.serverStatus == false){ //prevent spawning  multiple server instances in the case of multiple index.js files in sub directories
          console.log(atom.project)
          // console.log(atom.project.getPaths()[0])
          this.app.use(express.static(atom.project.getPaths()[0] )) // serve out static files
          portfinder.getPort((err, port) => { //get port
            if(err){ atom.notifications.addError(err); return;}
            this.port = port
            this.server = this.app.listen(port, () => { //start server & store it
              this.serverStatus = true
              console.log('p5jstoolbar server started on: ' + port)
              atom.notifications.addSuccess('p5js-toolbar started a server to run your project at http://localhost:' + port)
              this.button.src = this.localPath + "/images/stop-button.svg";
              opn('http://localhost:' + port + "/" + entry.path) //open browser
            });
          });
        }
    }).on('end', ()=>{
      //we can assume no file found, throw error
      if(this.serverStatus == false){ //prevent an error on successful find (only throw if the server is off)
          console.error('no index file found')
          atom.notifications.addError('No index.html file found, are you sure you have a valid p5js project open?');
      }

    }).on('error', function (err) {
      atom.notifications.addError('No index.html file found, are you sure you have a valid p5js project open?');
      console.error('fatal error', err);
    })

  }


  stopServer(){
    console.log("***STOP THE SERVER***")
    this.serverStatus = false
    this.button.src = this.localPath + "/images/play-button.svg";
    // console.log(this.server)
    if(this.server){
      atom.notifications.addWarning('p5js-toolbar closed the server running your project at http://localhost:' + this.port)
      this.server.close()
    }
  }


  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
    //kill the server too!
    this.stopServer()
  }

  getElement() {
    return this.element;
  }

}
