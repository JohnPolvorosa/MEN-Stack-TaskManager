//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const app = express();

require('dotenv').config()

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

// Initialize mongoose DB
const mongoLocal = `mongodb://localhost:27017/${DB_NAME}`
const mongoAtlas = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0-hyjeh.mongodb.net/${DB_NAME}`

mongoose.connect(mongoAtlas, {
  useNewUrlParser: true,  useUnifiedTopology: true, useFindAndModify: false
});

// Initialize Schema
let itemsSchema = {
  name: String
}
// Initialize Model
let Item = mongoose.model("Item", itemsSchema);
// Initialize Mongoose Documents
let item1 = new Item({
  name: "Clean Room"
});
let item2 = new Item({
  name: "Fix CERB"
});
let item3 = new Item({
  name: "Intialize Stocks"
});
const defaultItems = [item1,item2,item3];

// Initialize a schema for different lists, placing the array schema of items for each list
let listSchema = {
  name: String,
  items: [itemsSchema]
}
// Create model
let List = mongoose.model("List", listSchema);

// HOME ROUTE
app.get("/", function(req, res) {
  
  // Find contents inside DB inside this model collection
  Item.find({}, function(err, results) {
    // If empty array, insert default items into to do list
    if (results.length === 0) {
      // Insert Many
      Item.insertMany(defaultItems , function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Succesfully saved default items into db");
        }
      });
      // Redirect after saving default items so it goes into else statement block
      res.redirect("/");
    } else {
      if (err) {
        console.log("Cannot find");
      } else {
        res.render("list", {listTitle: "Today", newListItems: results});
      }
    }
  });
});

app.post("/", function(req, res){
  
  // Grab user input from the form post method
  let itemName = req.body.newItem;
  let listName = req.body.list;

  let item = new Item({
    name: itemName
  });

  // Check if list is default homepage
  if (listName === "Today") {
    // Save item on mongo
    item.save();  
    // Reroute after saving
    res.redirect("/");
  } else {
    // Search and access list and embed it into list
    List.findOne({name: listName}, function(err, results) {
      results.items.push(item);
      results.save();
      res.redirect("/" + listName);
    });
  } 
});


// Dynamic routes expressjs
app.get("/:customName", function (req,res) {
  // ._capitalize to Capitalize first letter, rest lower case with LODASH
  let customName = _.capitalize(req.params.customName);

  List.findOne({name : customName}, function(err, results) {
    if (!err) {
      if (!results) {
        // Create a new list if does not exist
        let list = new List({
          name: customName,
          items: defaultItems
        });
        list.save();

        // Redirect to this page again after saving
        res.redirect("/" + customName);

      } else {
        // Already exists and show the existing list
        // console.log("Exists: " + results);
        res.render("list",{listTitle: results.name, newListItems: results.items});
      }
    }
  });
});

// Delete Route
app.post("/delete", function(req, res) {
  // Check for id number of checked item
  let checkedItem = req.body.checkbox;
  let listName = req.body.listName;

  if (listName === "Today") {
    // Delete in default page and redirect after
    Item.findByIdAndRemove(checkedItem, function(err) {
      if (!err) {
        console.log("Successfully deleted: " + checkedItem)
        res.redirect("/");
      } else {
        console.log(err);
      }
    });  
  } else {
    // A.findOneAndUpdate(conditions, update, callback) (3 parameters)
    // $pull:  { <field1>: <value|condition>, <field2>: <value|condition>, ... }
    // Use items inside pull and then use the id to check for which items to pull
    List.findOneAndUpdate(
      {name: listName}, // 1st param
      {$pull: {items: {_id: checkedItem}}}, // 2nd param
      function(err,results) { // 3rd param
      if (!err) {
        console.log("Succesfully deleted: " + checkedItem);
        res.redirect("/" + listName);
      } else {
        console.log(err);
      }
    });
  }
});


app.get("/about", function(req, res){
  res.render("about");
});

const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Server started");
});
