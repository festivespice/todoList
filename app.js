//jshint esversion:6
require('dotenv').config() //require dotenv as soon as possible

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const lodash = require("lodash");

const app = express();
mongoose.connect(process.env.DB_CONNECTSTRING, {
  useNewUrlParser: true
});

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "No item specified"]
  }
});
const Item = mongoose.model("Item", itemSchema);

const listSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: [true, "list name already in use"],
    required: [true, "no list name specified"]
  },
  items: [itemSchema] //uses the schema of 'item' and not the model. 
});
const List = mongoose.model("List", listSchema);

const newItem1 = new Item({
  name: "Buy food"
});
const newItem2 = new Item({
  name: "Cook food"
});
const newItem3 = new Item({
  name: "Eat food"
});
const defaultItems = [newItem1, newItem2, newItem3];

app.get("/", function (req, res) {

  const day = "Today";
  Item.find(function (err, itemsArr) {
    if (err) {
      console.log(err);
    } else if (itemsArr.length == 0) {
      Item.insertMany(defaultItems, function (err) { //if the list is empty, insert the defaults and redirect
        if (err) {
          console.log(err);
        } else {
          console.log("successfully added documents");
        }
      });
      res.redirect("/");
    } else { //if the list is not empty, render the list
      res.render("list", {
        listTitle: day,
        newListItems: itemsArr
      });
    }
  });
});

app.post("/", function (req, res) {

  const item = req.body.newItem; //value is in the text input of the form
  const list = req.body.list; //value is in the button of the form

  const newItem = new Item({
    name: item
  });
  if (list === "Today") {  //saves into default list
    newItem.save();
    res.redirect("/");

  } else { //comes from a custom list
    List.findOne({
      name: list
    }, function (err, foundList) { //use this found list item and add the document to its items list
      if (err) {
        console.log(err);
      } else {
        foundList.items.push(newItem);
        foundList.save(); //updates foundList
        res.redirect("/" + list); //redirects them to a specific get route: specific list
      }
    })
  }
});
app.post("/delete", function (req, res) {
  const listItem = req.body.checkbox;
  const listName = req.body.title; //needed to use a hidden element to store this value
  if (listName == "Today") {
    Item.deleteOne({
      _id: req.body.checkbox
    }, function (err) {
      //alternatively, you could use Model.findByIdAndRemove(<id>, callback)
      if (err) {
        console.log(err);
      } else {
        console.log("success");
        res.redirect("/");
      }
    })
  } else {
    List.findOneAndUpdate({ //instead of finding a list and then removing from the list and saving
      name: listName
    }, 
    {
      $pull: {items: {_id: listItem}} //removes object from array
    }, 
    function (err, foundList) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/" + listName);
      }
    });
  }
})

app.get("/:list", function (req, res) {
  const listName = lodash.capitalize(req.params.list); //specific list parameter
  const list = new List({
    name: listName,
    items: defaultItems
  });
  List.findOne({name: list.name}, function(err, foundList){
    if(err){
      console.log(err);
    }else{
      if(foundList == null) //doesn't exist
      {
        list.save(function(err){ //new list
          if(err){
            console.log(err);
          }else{
            res.redirect("/" + list.name);
          }
        });
      }else{
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });
})


let port = process.env.PORT;
if (port == null || port == "") { //local
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port " + port);
});