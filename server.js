'use strict';

const express = require('express');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);
const bodyParser = require('body-parser')
const dns = require('dns');

const cors = require('cors');

const app = express();

// Basic Configuration 
const port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGOLAB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: 'false'}));
app.use(bodyParser.json());


//Mongoose Schemas
const Schema = mongoose.Schema;

const SchemaURL = new Schema({
  original_url: String
})

SchemaURL.plugin(AutoIncrement, {inc_field: 'short_url'});

const URL = mongoose.model('URL', SchemaURL);


app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//API to create short URLs
app.post("/api/shorturl/new", (req, res, next) => {
  const RegExpURL = /^(http|https):\/\/(([a-zA-Z0-9$\-_.+!*'(),;:&=]|%[0-9a-fA-F]{2})+@)?(((25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])(\.(25[0-5]|2[0-4][0-9]|[0-1][0-9][0-9]|[1-9][0-9]|[0-9])){3})|localhost|([a-zA-Z0-9\-\u00C0-\u017F]+\.)+([a-zA-Z]{2,}))(:[0-9]+)?(\/(([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*(\/([a-zA-Z0-9$\-_.+!*'(),;:@&=]|%[0-9a-fA-F]{2})*)*)?(\?([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?(\#([a-zA-Z0-9$\-_.+!*'(),;:@&=\/?]|%[0-9a-fA-F]{2})*)?)?$/;
  const url = req.body.url;
  const urlWithoutProtocol = url.replace(/(^\w+:|^)\/\//, '');
  const hostname = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];
  
  //Validate URL with RegExp
  if (RegExpURL.test(url)){
    
    //Validate hostname with DNS
    dns.resolve(hostname, (error) => {
      if (error){
        res.json({error: 'invalid URL'})        
      }else{
        
        //Check if URL already exist
        URL.findOne({original_url: urlWithoutProtocol}, (error, urlRecord) => {
          if (error) res.json({error: error.code});
          
          if(urlRecord) {
            res.json({original_url: urlRecord.original_url, short_url: urlRecord.short_url});
          }else{
            
            //Save URL in DB
            const newURL = new URL({
              original_url: urlWithoutProtocol
            });
            
            newURL.save((error, newURL) => {
              if (error) res.json({error: error.code});
              
              res.json({original_url: newURL.original_url, short_url: newURL.short_url});
            })
          }
        })    
      }
    });
  }else{
    res.json({error: 'invalid URL'});    
  }
})

//API to redirect short URLs

app.get('/api/shorturl/:shortUrl', (req, res, next) => {
  const short_url = req.params.shortUrl;
  
  URL.findOne({short_url: short_url}, (error, urlRecord) => {
    if (error) res.json({error: 'invalid URL'})

    if (urlRecord) {
      res.redirect('https://' + urlRecord.original_url);
    }else{
      res.json({error: 'invalid URL'})
    }
  })
})

app.listen(port, function () {
  console.log('Node.js listening ...');
  console.log("Mongoose Connection Ready: " + !!mongoose.connection.readyState);
});