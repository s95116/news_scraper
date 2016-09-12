// Global dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request');
var cheerio = require('cheerio');
var handlebars = require("express-handlebars");

app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended:false
}));

//Make public a static directory
app.use(express.static('public'));

//Configure our database to work with mongoose
mongoose.connect('mongodb://localhost/news');
var db = mongoose.connection;

//Display any mongoose errors
db.on('error', function(err){
  console.log('Mongoose Error ', err);
});

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(express.static(process.cwd() + '/public')); 

app.engine('handlebars', handlebars({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

//If the log-in to mongoose succeeds, it logs a success message
db.once('open', function() {
  console.log('Mongoose connection successful.');
});

//bring in note and article models
var Note = require('./models/Note.js');
var Article = require('./models/Article.js');



//Routes

//Get request & scrape the website
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/scrape', function(req, res) {
  // first, we grab the body of the html with request
  request('http://www.echojs.com/', function(error, response, html) {
    // then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // now, we grab every h2 within an article tag, and do the following:
    $('article h2').each(function(i, element) {

        // save an empty result object
        var result = {};

        // add the text and href of every link, 
        // and save them as properties of the result obj
        result.title = $(this).children('a').text();
        result.link = $(this).children('a').attr('href');

        // using our Article model, create a new entry.
        // Notice the (result):
        // This effectively passes the result object to the entry (and the title and link)
        var entry = new Article (result);

        // now, save that entry to the db
        entry.save(function(err, doc) {
          // log any errors
          if (err) {
            console.log(err);
          } 
          // or log the doc
          else {
            console.log(doc);
          }
        });


    });
  });

});

//Retrieves the articles from the mongo database
app.get('/articles', function(req, res){
  // grab every doc in the Articles array
  Article.find({}, function(err, doc){
    // log any errors
    if (err){
      console.log(err);
    } 
    // or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});



//Post request
app.post('/articles/:id', function(req, res){
  // create a new note and pass the req.body to the entry.
  var newNote = new Note(req.body);

  // and save the new note the db
  newNote.save(function(err, doc){
    // log any errors
    if(err){
      console.log(err);
    } 
    // otherwise
    else {
      // using the Article id passed in the id parameter of our url, 
      // prepare a query that finds the matching Article in our db
      // and update it to make it's lone note the one we just saved
      Article.findOneAndUpdate({'_id': req.params.id}, {'note':doc._id})
      // execute the above query
      .exec(function(err, doc){
        // log any errors
        if (err){
          console.log(err);
        } else {
          // or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});






//Listen on port 3000
app.listen(3000, function() {
  console.log('App running on port 3000!');
});