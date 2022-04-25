var express = require("express");
var app = express();

var formidable = require("express-formidable");
app.use(formidable());
var mongodb = require("mongodb");
var mongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var http = require("http").createServer(app);
var bcrypt = require("bcrypt");
var fileSystem = require("fs");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTokenSecret123467890";

app.use("/public", express.static(__dirname + "/public")); //making server to use public folder
app.set("view engine", "ejs");

// var socketIO = require("socket.io")(http);
// var socketID = "";
var users = [];
var mainURL = "http://localhost:3000";

// socketIO.on("connection", function (socket) {
//   console.log("User Connection", socket.id);
//   socketID = socket.id;
// });

http.listen(3000, function () {
  console.log("server started.");

  mongoClient.connect("mongodb://localhost:27017", function (err, client) {
    var database = client.db("ffsdproject");
    console.log("Database connected");

    app.get("/", function (request, result) {
      result.render("landingpage");
    });
    app.get("/index", function (request, result) {
      result.render("index");
    });

    app.get("/signup", function (request, result) {
      result.render("signup");
    });
    app.post("/signup", function (request, result) {
      var name = request.fields.name;
      var username = request.fields.username;
      var email = request.fields.email;
      var password = request.fields.password;
      var confpass=request.fields.confirmpassword;
      var gender = request.fields.gender;
      var reset_token = "";

      database.collection("users").findOne(
        {
          $or: [
            {
              email: email,
            },
            {
              username: username,
            },
          ],
        },
        function (error, user) {
          if(password)
          if (user == null) {
            bcrypt.hash(password, 10, function (error, hash) {
              database.collection("users").insertOne(
                {
                  name: name,
                  username: username,
                  email: email,
                  password: hash,
                  gender: gender,
                  reset_token: reset_token,
                  profileImage: "",
                  coverPhoto: "",
                  dob: "",
                  city: "",
                  country: "",
                  aboutMe: "",
                  friends: [],
                  pages: [],
                  notifications: [],
                  groups: [],
                  posts: [],
                },
                function (error, data) {
                  result.json({
                    status: "success",
                    message: "Signed up successfully. You can login now.",
                  });
                }
              );
            });
          } else {
            result.json({
              status: "error",
              message: "Email or username already exist.",
            });
          }
        }
      );
    });

    app.get("/login", function (request, result) {
      result.render("login");
    });

    app.post("/login", function (request, result) {
      var email = request.fields.email;
      var password = request.fields.password;
      database.collection("users").findOne(
        {
          email: email,
        },
        function (error, user) {
          if (user == null) {
            result.json({
              status: "error",
              message: "Email does not exist",
            });
          } else {
            bcrypt.compare(password, user.password, function (error, isVerify) {
              if (isVerify) {
                var accessToken = jwt.sign({ email: email }, accessTokenSecret); //generate access token
                database.collection("users").findOneAndUpdate(
                  {
                    email: email,
                  },
                  {
                    $set: {
                      accessToken: accessToken,
                    },
                  },
                  function (error, data) {
                    result.json({
                      status: "success",
                      message: "Login successfully",
                      accessToken: accessToken,
                      profileImage: user.profileImage,
                    });
                  }
                );
              } else {
                result.json({
                  status: "error",
                  message: "Password is not correct",
                });
              }
            });
          }
        }
      );
    });
    app.get("/updateProfile", function (request, result) {
      result.render("updateProfile");
    });
    app.post("/getUser", function (request, result) {
      var accessToken = request.fields.accessToken;
      database.collection("users").findOne(
        {
          accessToken: accessToken,
        },
        function (error, user) {
          if (user == null) {
            result.json({
              status: "error",
              message: "User has been logged out. Please login again.",
            });
          } else {
            result.json({
              status: "success",
              message: "Record has been fetched.",
              data: user,
            });
          }
        }
      );
    });

    app.get("/logout", function (request, result) {
      result.redirect("/login");
    });

    app.post("/uploadCoverPhoto", function (request, result) {
      var accessToken = request.fields.accessToken;
      var coverPhoto = "";

      database.collection("users").findOne(
        {
          accessToken: accessToken,
        },
        function (error, user) {
          if (user == null) {
            result.json({
              status: "error",
              message: "User has been logged out. Please login again.",
            });
          } else {
            if (
              request.files.coverPhoto.size > 0 &&
              request.files.coverPhoto.type.includes("image")
            ) {
              if (user.coverPhoto != "") {
                fileSystem.unlink(user.coverPhoto, function (error) {
                  //
                });
              }

              coverPhoto =
                "public/images/" +
                new Date().getTime() +
                "-" +
                request.files.coverPhoto.name;

              // Read the file
              fileSystem.readFile(
                request.files.coverPhoto.path,
                function (err, data) {
                  if (err) throw err;
                  console.log("File read!");

                  // Write the file
                  fileSystem.writeFile(coverPhoto, data, function (err) {
                    if (err) throw err;
                    console.log("File written!");

                    database.collection("users").updateOne(
                      {
                        accessToken: accessToken,
                      },
                      {
                        $set: {
                          coverPhoto: coverPhoto,
                        },
                      },
                      function (error, data) {
                        result.json({
                          status: "status",
                          message: "Cover photo has been updated.",
                          data: mainURL + "/" + coverPhoto,
                        });
                      }
                    );
                  });
                }
              );
            } else {
              result.json({
                status: "error",
                message: "Please select valid image.",
              });
            }
          }
        }
      );

    });
	app.post("/uploadProfileImage", function (request, result) {
        var accessToken = request.fields.accessToken;
        var profileImage = "";

        database.collection("users").findOne(
          {
            accessToken: accessToken,
          },
          function (error, user) {
            if (user == null) {
              result.json({
                status: "error",
                message: "User has been logged out. Please login again.",
              });
            } else {
              if (
                request.files.profileImage.size > 0 &&
                request.files.profileImage.type.includes("image")
              ) {
                if (user.profileImage != "") {
                  fileSystem.unlink(user.profileImage, function (error) {
                    //
                  });
                }

                profileImage =
                  "public/images/" +
                  new Date().getTime() +
                  "-" +
                  request.files.profileImage.name;

                // Read the file
                fileSystem.readFile(
                  request.files.profileImage.path,
                  function (err, data) {
                    if (err) throw err;
                    console.log("File read!");

                    // Write the file
                    fileSystem.writeFile(profileImage, data, function (err) {
                      if (err) throw err;
                      console.log("File written!");

                      database.collection("users").updateOne(
                        {
                          accessToken: accessToken,
                        },
                        {
                          $set: {
                            profileImage: profileImage,
                          },
                        },
                        function (error, data) {
                          result.json({
                            status: "status",
                            message: "Profile image has been updated.",
                            data: mainURL + "/" + profileImage,
                          });
                        }
                      );
                    });
                  }
                );
              } else {
                result.json({
                  status: "error",
                  message: "Please select valid image.",
                });
              }
            }
          }
        );
      });
      app.post("/updateProfile",function(request,result){
        var accessToken=request.fields.accessToken;
        var name=request.fields.name;
        var dob=request.fields.dob;
        var city=request.fields.city;
        var country=request.fields.country;
        var aboutMe=request.fields.aboutMe;

        database.collection("users").findOne({
          "accessToken":accessToken
        },function(error,user){
          if(user==null)
          {
            result.json({
              "status":"error",
              "message":"User has been logged out. Please login again"
            });
          }
          else{
            database.collection("users").updateOne({
              "accessToken":accessToken
            },{
              $set:{
                "name":name,
                "dob":dob,
                "city":city,
                "country":country,
                "aboutMe":aboutMe
              }
            },function(error,data){
              result.json({
                "status":"status",
                "message":"Profile has been updated"
              });
            });
          }
        });
      });
      app.post("/addPost",function(request,result){
        var accessToken=request.fields.accessToken;
        var caption=request.fields.caption;
        var image="";
        var video="";
        var type=request.fields.type;
        var createdAt=new Date().getTime();
        var _id=request.fields._id;
        database.collection("users").findOne({
          "accessToken":accessToken
        },function (error,user) {
          if(user==null){
            result.json({
              "status":"error",
              "message":"User has been logged out.Please login again"
            });
          }else
          {
            if(request.files.image.size>0&&request.files.image.type.includes("image")){
               image="public/images"+new Date().getTime+"-"+request.files.image.name;
               fileSystem.rename(request.files.image.path,image,function(error){

               });
             }
             if(request.files.video.size>0&&request.files.video.type.includes("video"))
             {
               image="public/videos"+new Date().getTime+"-"+request.files.video.name;
               fileSystem.rename(request.files.video.path,video,function(error){

               });
             }
             if(type=="page_post"){
               database.collection("pages").findOne({
                 "_id":ObjectId(_id)
               },function(error,page){
                 if(page==null){
                   result.json({
                     "status":"error",
                     "message":"Page doesnot exist"
                   });
                   return;
                 }else
                 {
                   if(page.user._id.toString()!=user._id.toString()){
                     result.json({
                       "status":"error",
                       "message":"Sorry,you do not own this page"
                     });
                     return;
                   }
                   database.collection("posts").insertOne({
                     "caption":caption,
                     "image":image,
                     "video":video,
                     "type":type,
                     "createdAt":createdAt,
                     "likers":[],
                     "shares":[],
                     "user":{
                       "_id":page._id,
                       "name":page.name,
                       "profileImage":page.coverPhoto
                     }
                   },function(error,data){
                     result.json({
                       "status":"success",
                       "message":"Post has been uploaded"
                     })
                   })
                 }
               })
             }else if(type=="group_post"){
               database.collection("groups").findOne({
                 "_id":ObjectId(_id)
               },function(error,group){
                 if(group==null){
                   result.json({
                     "status":"error",
                     "message":"Group does not exist"
                   });
                   return;  
                 }else{
                   var isMember=false;
                   for(var a=0;a<group.members.length;a++){
                     var member=group.members[a];
                     if(member._id.toString()==user._id.toString()){
                       isMember=true;
                       break;
                     }
                   }
                   if(!isMember){
                     result.json({
                       "status":"error",
                       "message":"Sorry you are not a member of this group"
                     });
                     return;
                   }
                   database.collection("posts").insertOne({
                     "caption":caption,
                     "image":image,
                     "video":video,
                     "type":type,
                     "createdAt":createdAt,
                     "likers":[],
                     "shares":[],
                     "user":{
                       "_id":group._id,
                       "name":group.name,
                       "profileImage":group.coverPhoto
                     },
                     "uploader":{
                       "_id":user._id,
                       "name":user.name,
                       "profileImage":user.profileImage
                     }
                   },function(error,data){
                     result.json({
                       "status":"success",
                       "message":"Post has been uploaded"
                     })
                   })
                 }
               })
             }
             
             else{
              database.collection("posts").insertOne({
                "caption":caption,
                "image":image,
                "video":video,
                "type":type,
                "createdAt":createdAt,
                "likers":[],
                "shares":[],
                "user":{
                  "_id":user._id,
                  "name":user.name,
                  "profileImage":user.profileImage
                }
              },function(error,data){
                database.collection("users").updateOne({
                  "accessToken":accessToken
                },{
                  $push:{
                    "posts":{
                      "_id":data.insertedId,
                      "caption":caption,
                      "image":image,
                      "video":video,
                      "type":type,
                      "createdAt":createdAt,
                      "likers":[],
                      "shares":[],
  
                    }
                  }
                },function(error,data){
                  result.json({
                    "status":"success",
                    "message":"Post has been uploaded"
                  });
                });
              });
             }
          };
        });
      });
      app.post("/getNewsfeed", function (request, result) {
        var accessToken = request.fields.accessToken;
        database.collection("users").findOne({
          "accessToken": accessToken
        }, function (error, user) {
          if (user == null) {
            result.json({
              "status": "error",
              "message": "User has been logged out. Please login again."
            });
          } else {

            var ids = [];
            ids.push(user._id);
            for(var a=0;a<user.pages.length;a++){
              ids.push(user.pages[a]._id);
            }
            for(var a=0;a<user.groups.length;a++){
              if(user.groups[a].status=="Accepted"){
                ids.push(user.groups[a]._id);
              }
            }
            for(var a=0;a<user.friends.length;a++){
              ids.push(user.friends[a]._id);
            }


            database.collection("posts")
            .find({
              "user._id": {
                $in: ids
              }
            })
            .sort({
              "createdAt": -1
            })
            .limit(5)
            .toArray(function (error, data) {

              result.json({
                "status": "success",
                "message": "Record has been fetched",
                "data": data
              });
            });
          }
        });
      });
      app.post("/toggleLikePost", function (request, result) {

        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;

        database.collection("users").findOne({
          "accessToken": accessToken
        }, function (error, user) {
          if (user == null) {
            result.json({
              "status": "error",
              "message": "User has been logged out. Please login again."
            });
          } else {

            database.collection("posts").findOne({
              "_id": ObjectId(_id)
            }, function (error, post) {
              if (post == null) {
                result.json({
                  "status": "error",
                  "message": "Post does not exist."
                });
              } else {

                var isLiked = false;
                for (var a = 0; a < post.likers.length; a++) {
                  var liker = post.likers[a];

                  if (liker._id.toString() == user._id.toString()) {
                    isLiked = true;
                    break;
                  }
                }

                if (isLiked) {
                  database.collection("posts").updateOne({
                    "_id": ObjectId(_id)
                  }, {
                    $pull: {
                      "likers": {
                        "_id": user._id,
                      }
                    }
                  }, function (error, data) {

                    database.collection("users").updateOne({
                      $and: [{
                        "_id": post.user._id
                      }, {
                        "posts._id": post._id
                      }]
                    }, {
                      $pull: {
                        "posts.$[].likers": {
                          "_id": user._id,
                        }
                      }
                    });

                    result.json({
                      "status": "unliked",
                      "message": "Post has been unliked."
                    });
                  });
                } else {

                  database.collection("users").updateOne({
                    "_id": post.user._id
                  }, {
                    $push: {
                      "notifications": {
                        "_id": ObjectId(),
                        "type": "photo_liked",
                        "content": user.name + " has liked your post.",
                        "profileImage": user.profileImage,
                        "createdAt": new Date().getTime()
                      }
                    }
                  });

                  database.collection("posts").updateOne({
                    "_id": ObjectId(_id)
                  }, {
                    $push: {
                      "likers": {
                        "_id": user._id,
                        "name": user.name,
                        "profileImage": user.profileImage
                      }
                    }
                  }, function (error, data) {

                    database.collection("users").updateOne({
                      $and: [{
                        "_id": post.user._id
                      }, {
                        "posts._id": post._id
                      }]
                    }, {
                      $push: {
                        "posts.$[].likers": {
                          "_id": user._id,
                          "name": user.name,
                          "profileImage": user.profileImage
                        }
                      }
                    });

                    result.json({
                      "status": "success",
                      "message": "Post has been liked."
                    });
                  });
                }

              }
            });

          }
        });
      });

      app.post("/sharePost", function (request, result) {

        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;
        var type = "shared";
        var createdAt = new Date().getTime();

        database.collection("users").findOne({
          "accessToken": accessToken
        }, function (error, user) {
          if (user == null) {
            result.json({
              "status": "error",
              "message": "User has been logged out. Please login again."
            });
          } else {

            database.collection("posts").findOne({
              "_id": ObjectId(_id)
            }, function (error, post) {
              if (post == null) {
                result.json({
                  "status": "error",
                  "message": "Post does not exist."
                });
              } else {

                database.collection("posts").updateOne({
                  "_id": ObjectId(_id)
                }, {
                  $push: {
                    "shares": {
                      "_id": user._id,
                      "name": user.name,
                      "profileImage": user.profileImage
                    }
                  }
                }, function (error, data) {

                  database.collection("posts").insertOne({
                    "caption": post.caption,
                    "image": post.image,
                    "video": post.video,
                    "type": type,
                    "createdAt": createdAt,
                    "likers": [],
                    "shares": [],
                    "user": {
                      "_id": user._id,
                      "name": user.name,
                      "gender": user.gender,
                      "profileImage": user.profileImage
                    }
                  }, function (error, data) {

                    database.collection("users").updateOne({
                      $and: [{
                        "_id": post.user._id
                      }, {
                        "posts._id": post._id
                      }]
                    }, {
                      $push: {
                        "posts.$[].shares": {
                          "_id": user._id,
                          "name": user.name,
                          "profileImage": user.profileImage
                        }
                      }
                    });

                    result.json({
                      "status": "success",
                      "message": "Post has been shared."
                    });
                  });
                });
              }
            });
          }
        });
      });

      app.post("/deletePost", function (request, result) {

        var accessToken = request.fields.accessToken;
        var _id = request.fields._id;
        database.collection("users").findOne({
          "accessToken": accessToken
        }, function (error, user) {
          if (user == null) {
            result.json({
              "status": "error",
              "message": "User has been logged out. Please login again."
            });
          } else {

            database.collection("posts").findOne({
              "_id": ObjectId(_id)
            }, function (error, post) {
              if (post == null) {
                result.json({
                  "status": "error",
                  "message": "Post does not exist."
                });
              } else {

                database.collection("posts").deleteOne({
                  "_id": ObjectId(_id)
                },
                function (error, data) {
                  result.json({
                    "status":"success",
                    "message":"Post has been deleted"
                  })
                });
              }
            });
          }
        });
      });


  app.get("/search/:query", function (request, result) {
    var query = request.params.query;
    result.render("search", {
      "query": query
    });
  });
  app.post("/search", function (request, result) {
    var query = request.fields.query;
    database.collection("users").find({
      "name": {
        $regex: ".*" + query + ".*",
        $options: "i"
      }
    }).toArray(function (error, data) {

      database.collection("pages").find({
        "name":{
          $regex:".*"+query+".*",
          $options:"i"
        }
      }).toArray(function(error,pages){
        database.collection("groups").find({
          "name":{
            $regex:".*"+query+".*",
            $options:"i"
          }
        }).toArray(function(error,groups){
          result.json({
            "status": "success",
            "message": "Record has been fetched",
            "data": data,
            "pages":pages,
            "groups":groups
        });
        })
      });
    });
  });

  app.post("/sendFriendRequest",function(request,result){
    var accessToken=request.fields.accessToken;
    var _id=request.fields._id;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"User has been logged out.Please login again"
        });
      }else
      {
        var me=user;
        database.collection("users").findOne({
          "_id":ObjectId(_id)
        },function(error,user){
          if(user==null){
            result.json({
              "status":"error",
              "message":"User does not exist "
            });
          }
          else
          {
            database.collection("users").updateOne({
                          "_id":ObjectId(_id)
                        },{
                          $push:{
                            "friends":{
                              "_id":me._id,
                              "name":me.name,
                              "profileImage":me.profileImage,
                              "status":"Pending",
                              "sentByMe":false,
                              "inbox":[]

                            }
                          }
                        },function(error,data){
                            database.collection("users").updateOne({
                              "_id":me._id
                            },{
                              $push:{"friends":{
                                "_id":user._id,
                                "name":user.name,
                                "profileImage":user.profileImage,
                                "status":"Pending",
                                "sentByMe":true,
                                "inbox":[]
                              }
                            }
                            },function(error,data){
                              result.json({
                                "status":"success",
                                "message":"Friend Request has been sent"
                             });
                            });
                        });
                      }
                    });
                  }
                });
              });



  app.get("/friends",function(request,result){
    result.render("friends");
  });

  app.post("/acceptFriendRequest",function(request,result){
    var accessToken=request.fields.accessToken;
    var _id=request.fields._id;
    database.collection("users").findOne({
      "accessToken":accessToken},
      function(error,user){
        if(user==null){
          result.json({
            "status":"error",
            "message":"User has been logged out.Please Login again."
          });
        }
        else
        {
          var me=user; //saving user object in other variable and checking other account existence
          database.collection("users").findOne({
            "_id":ObjectId(_id)
          },function(error,user){
            if(user==null){
              result.json({
                "status":"error",
                "message":"user doesnot exist"
              });
            }
            else{
              database.collection("users").updateOne({
                "_id":ObjectId(_id)
              },{
                $push:{
                  "notifications":{
                    "_id":ObjectId(),
                    "type":"friend_request_accepted",
                    "content":me.name+" accepted your friend request.",
                    "profileImage":me.profileImage,
                    "createdAt":new Date().getTime()
                  }
                }
              });
              database.collection("users").updateOne({
                $and:[{
                  "_id":ObjectId(_id)
                },{
                  "friends._id":me._id
                }]
              },{
                $set:{
                  "friends.$.status":"Accepted"
                }
              },function(error,data){
                database.collection("users").updateOne({
                  $and:[{
                    "_id":me._id
                  },{
                    "friends._id":user._id
                  }]
                },{
                  $set:{
                    "friends.$.status":"Accepted"
                  }
                },function(error,data){
                  result.json({
                    "status":"success",
                    "message":"Friend Request has been accepted"
                  })
                })
              })
            }
          }
          )
        }
      })
    })

  app.post("/unfriend",function(request,result){
    var accessToken=request.fields.accessToken;
    var _id=request.fields._id;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"user has been logged out."
        });
      }
      else
      {
        var me=user;
        database.collection("users").findOne({
          "_id":ObjectId(_id)
        },function(error,user){
          if(user==null){
            result.json({
              "status":"error",
              "message":"user doesnot exist."
            });
          }
          else{
            database.collection("users").updateOne({
              "_id":ObjectId(_id)
            },{
              $pull:{
                "friends":{
                  "_id":me._id
                }
              }
            },function(error,data){
              database.collection("users").updateOne({
                "_id":me._id
              },{
                $pull:{
                  "friends":{
                    "_id":user._id
                  }
                }
              },function(error,data){
                result.json({
                  "status":"error",
                  "message":"Friend has been removed."
                });

              })
            })
          }
        })
      }
    })
  })


  app.get("/inbox",function(request,result){
    result.render("inbox");
  });
   app.post("/getFriendsChat",function(request,result){
     var accessToken=request.fields.accessToken;
     var _id=request.fields._id;
     database.collection("users").findOne({
       "accessToken":accessToken
     },function(error,user){
       if(user==null){
         result.json({
           "status":"error",
           "message":"User has been Logged out.Please login again."
         });
       }else
       {
         var index=user.friends.findIndex(function(friend){
           return friend._id==_id
         });
         var inbox=user.friends[index].inbox;
         result.json({
           "status":"success",
           "message":"Record has been fetched",
           "data":inbox
         });
       }
     });
   });

   app.post("/sendMessage",function(request,result){
     var accessToken=request.fields.accessToken;
     var _id=request.fields._id;
     var message=request.fields.message;
     database.collection("users").findOne({
       "accessToken":accessToken
     },function(error,user){
       if(user==null){
         result.json({
           "status":"error",
           "message":"User has been logged out"
         });
       }
       else
       {
         var me=user;
         database.collection("users").findOne({
           "_id":ObjectId(_id)
         },function(error,user){
           if(user==null){
             result.json({
               "status":"error",
               "message":"User doesnot exist."
             });
           }else
           {
             database.collection("users").updateOne({
               $and:[{
                 "_id":ObjectId(_id)
               },{
                 "friends._id":me._id
               }]
             },{
               $push:{
                 "friends.$.inbox":{
                   "_id":ObjectId(),
                   "message":message,
                   "from":me._id
                 }
               }
             },function(error,data){
               database.collection("users").updateOne({
                 $and:[{
                   "_id":me._id
                 },{
                   "friends._id":user._id
                 }]
               },{
                 $push:{
                   "friends.$.inbox":{
                    "_id":ObjectId(),
                    "message":message,
                    "from":me._id
                   }
                 }
               },function(error,data){
                 result.json({
                   "status":"success",
                   "message":"message has been sent"
                 });
               });
             });
           }
         });
       }

     });
   });

  app.get("/createPage",function(request,result){
    result.render("createPage");
  });
  app.post("/createPage",function(request,result){
    var accessToken=request.fields.accessToken;
    var name=request.fields.name;
    var domainName=request.fields.domainName;
    var additionalInfo=request.fields.additionalInfo;
    var coverPhoto="";
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"User has been logged out"
        });
      }
      else
      {
        if(request.files.coverPhoto.size>0&&request.files.coverPhoto.type.includes("image")){
          coverPhoto="public/images/"+new Date().getTime()+"-"+request.files.coverPhoto.name;
          fileSystem.rename(request.files.coverPhoto.path,coverPhoto,function(error){
            //
          });
          database.collection("pages").insertOne({
            "name":name,
            "domainName":domainName,
            "additionalInfo":additionalInfo,
            "coverPhoto":coverPhoto,
            "likers":[],
            "user":{
              "_id":user._id,
              "name":user.name,
              "profileImage":user.profileImage
            }
          },function(error,data){
            result.json({
              "status":"success",
              "message":"Page has been created"
            });
          });
        }
        else{
          result.json({
            "status":"error",
            "message":"Please select a cover photo"
          });
        }
      }
    })
  });

  app.get("/pages",function(request,result){
    result.render("pages");
  });
  app.post("/getPages",function(request,result){
    var accessToken=request.fields.accessToken;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"User has been logged out"
        });
      }else
      {
        database.collection("pages").find({
          $or:[{
            "user._id":user._id
          },{
            "likers._id":user._id
          }]
        }).toArray(function(error,data){
          result.json({
            "status":"success",
            "message":"Record has been fetched",
            "data":data
          });
        });
      }
    });
  });
  app.get("/page/:_id",function(request,result){
    var _id=request.params._id;
    database.collection("pages").findOne({
      "_id":ObjectId(_id)
    },function(error,page){
      if(page==null){
        result.json({
          "status":"error",
          "message":"Page doesnot exist"
        });
      }else
      {
        result.render("singlePage",{
          "_id":_id
        })
      }
    })
  })

  app.post("/getPageDetail",function(request,result){
    var _id=request.fields._id;
    database.collection("pages").findOne({
      "_id":ObjectId(_id)
    },function(error,page){
      if(page==null){
        result.json({
          "status":"error",
          "message":"Page doesnot exist"
        });
      }else{
        database.collection("posts").find({
          $and:[{
            "user._id":page._id
          },{
            "type":"page_post"
          }]
        }).toArray(function(error,posts){
          result.json({
            "status":"success",
            "message":"Record has been fetched",
            "data":page,
            "posts":posts
          })
        })
      }
    })
  })
  app.post("/toggleLikePage",function(request,result){
    var accessToken=request.fields.accessToken;
    var _id=request.fields._id;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"user has been logged out. Please login again"
        });
      }
      else
      {
        database.collection("pages").findOne({
          "_id":ObjectId(_id)
        },function(error,page){
          if(page==null){
            result.json({
            "status":"error",
            "message":"Page doesnot exist"
            })
          }
          else{
            var isLiked=false;
            for(var a=0;a<page.likers.length;a++){
              var liker=page.likers[a];
              if(liker._id.toString()==user._id.toString()){
                isLiked=true;
                break;
              }
            }
            if(isLiked){
              database.collection("pages").updateOne({
                "_id":ObjectId(_id)
              },{
                $pull:{
                  "likers":{
                    "_id":user._id,
                  }
                }
              },function(error,data){
                database.collection("users").updateOne({
                  "accessToken":accessToken
                },{
                  $pull:{
                    "pages":{
                      "_id":ObjectId(_id)
                    }
                  }
                },function(error,data){
                  result.json({
                    "status":"unliked",
                    "message":"Page has been Unliked"
                  })
                })
              })
            }else{
              database.collection("pages").updateOne({
                "_id":ObjectId(_id)
              },{
                $push:{
                  "likers":{
                    "_id":user._id,
                    "name":user.name,
                    "profileImage":user.profileImage
                  }
                }
              },function(error,data){
                database.collection("users").updateOne({
                  "accessToken":accessToken
                },{
                  $push:{
                    "pages":{
                      "_id":page._id,
                      "name":page.name,
                      "coverPhoto":page.coverPhoto
                    }
                  }
                },function(error,data){
                  result.json({
                    "status":"success",
                    "message":"Page has been Liked"
                  })
                })
              })
            }
          }
        })
      }
    })
  })
  app.post("/getMyPages",function(request,result){
    var accessToken=request.fields.accessToken;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"user has been logged out.Please login again"
        })
      }else
      {
        database.collection("pages").find({
          "user._id":user._id
        }).toArray(function(error,data){
          result.json({
            "status":"success",
            "message":"Record has been fetched",
            "data":data
          })
        })
      }
    })
  })
    app.get("/createGroup",function(request,result){
    result.render("createGroup");
  });
  app.post("/createGroup",function(request,result){
    var accessToken=request.fields.accessToken;
    var name=request.fields.name;
    var additionalInfo=request.fields.additionalInfo;
    var coverPhoto="";
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"User has been logged out"
        });
      }else{
        if(request.files.coverPhoto.size>0&&request.files.coverPhoto.type.includes("image")){
          coverPhoto="public/images/"+new Date().getTime()+"-"+request.files.coverPhoto.name;
          fileSystem.rename(request.files.coverPhoto.path,coverPhoto,function(error){

          })
          database.collection("groups").insertOne({
            "name":name,
            "additionalInfo":additionalInfo,
            "coverPhoto":coverPhoto,
            "members":[{
              "_id":user._id,
              "name":user.name,
              "profileImage":user.profileImage,
              "status":"Accepted"
            }],
            "user":{
              "_id":user._id,
              "name":user.name,
              "profileImage":user.profileImage
            }
          },function(error,data){
            database.collection("users").updateOne({
              "accessToken":accessToken
            },{
              $push:{
                "groups":{
                  "_id":data.insertedId,
                  "name":name,
                  "coverPhoto":coverPhoto,
                  "status":"accepted"

                }
              }
            },function(error,data){
              result.json({
                "status":"success",
                "message":"Group has been created"
              })
            })
          });
        }else{
          result.json({
            "status":"error",
            "message":"Please select a cover photo"
          })
        }
      }
    })
  })
   app.get("/groups",function(request,result){
    result.render("groups");
  });
  app.post("/getGroups",function(request,result){
    var accessToken=request.fields.accessToken;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"user has been logged out"
        })
      }else
      {
        database.collection("groups").find({
          $or:[{
            "user._id":user._id
          },{
            "members._id":user._id
          }]
        }).toArray(function(error,data){
          result.json({
            "status":"success",
            "message":"record has been fetched",
            "data":data
          })
        })
      }
    })
  })
  app.get("/group/:_id",function(request,result){
    var _id=request.params._id;
    database.collection("groups").findOne({
      "_id":ObjectId(_id)
    },function(error,group){
      if(group==null){
        result.json({
          "status":"error",
          "message":"Group doesnot exist"
        })
      }else
      {
        result.render("singleGroup",{
          "_id":_id
        })
      }
    });
  });
  app.post("/getGroupDetail",function (request,result) { 
    var _id=request.fields._id;
    database.collection("groups").findOne({
      "_id":ObjectId(_id)
    },function(error,group){
      if(group==null){
        result.json({
          "status":"error",
          "message":"Group doesnot exist."
        })
      }else
      {
        database.collection("posts").find({
          $and:[{
            "user._id":group._id
          },{
            "type":"group_post"
          }]
        }).toArray(function(error,posts){
          result.json({
            "status":"success",
            "message":"Record has been fetched",
            "data":group,
            "posts":posts
          })
        })
      }
    })
   })

   app.post("/toggleJoinGroup",function(request,result){
    var accessToken=request.fields.accessToken;
    var _id=request.fields._id;
    database.collection("users").findOne({
      "accessToken":accessToken
    },function(error,user){
      if(user==null){
        result.json({
          "status":"error",
          "message":"user has been logged out. Please login again"
        });
      }
      else
      {
        database.collection("groups").findOne({
          "_id":ObjectId(_id)
        },function(error,group){
          if(group==null){
            result.json({
            "status":"error",
            "message":"Group doesnot exist"
            })
          }
          else{
            var isMember=false;
            for(var a=0;a<group.members.length;a++){
              var member=group.members[a];
              if(member._id.toString()==user._id.toString()){
                isMember=true;
                break;
              }
            }
            if(isMember){
              database.collection("groups").updateOne({
                "_id":ObjectId(_id)
              },{
                $pull:{
                  "members":{
                    "_id":user._id,
                  }
                }
              },function(error,data){
                database.collection("users").updateOne({
                  "accessToken":accessToken
                },{
                  $pull:{
                    "groups":{
                      "_id":ObjectId(_id)
                    }
                  }
                },function(error,data){
                  result.json({
                    "status":"leaved",
                    "message":"Group has been left"
                  })
                })
              })
            }else{
              database.collection("groups").updateOne({
                "_id":ObjectId(_id)
              },{
                $push:{
                  "members":{
                    "_id":user._id,
                    "name":user.name,
                    "profileImage":user.profileImage,
                    "status":"Pending"
                  }
                }
              },function(error,data){
                database.collection("users").updateOne({
                  "accessToken":accessToken
                },{
                  $push:{
                    "groups":{
                      "_id":group._id,
                      "name":group.name,
                      "coverPhoto":group  .coverPhoto,
                      "status":"pending"
                    }
                  }
                },function(error,data){
                  database.collection("users").updateOne({
                    "_id":group.user._id
                  },{
                    $push:{
                      "notifications":{
                        "_id":ObjectId(),
                        "type":"group_join_request",
                        "content":user.name+" joined "+group.name,
                        "profileImage":user.profileImage,
                        "groupId":group._id,
                        "userId":user._id,
                        "status":"Pending",
                        "createdAt":new Date().getTime()
                      }
                    }
                  })
                  result.json({
                    "status":"success",
                    "message":"joined group"
                  })
                })
              })
            }
          }
        })
      }
    })
  })
    app.get("/notifications",function(request,result){
    result.render("notifications");
  });
});
});
