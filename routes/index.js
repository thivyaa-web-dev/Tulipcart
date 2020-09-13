var express      = require('express');
    router       = express.Router();
    bcrypt       = require('bcryptjs');
const{Product}   = require('../models/product');
const{User}      = require('../models/user');
const {Order}    = require('../models/order');
   Cart          = require('../models/cart');
   passport      = require('passport');
   LocalStrategy = require('passport-local').Strategy;
   cookieParser  = require('cookie-parser');

router.all('/*',(req,res,next)=> {
    req.app.locals.layout= 'layout';
    next();
})

const isLoggedout= (req,res,next)=> {
    if(! req.isAuthenticated()){  
        next();
    }else{
        req.flash('error_message',`You need to logout first.`);
        res.redirect('/');
    }
}

const isLoggedin= (req,res,next)=> {
    if(req.isAuthenticated()){
        
        User.findOne({email:req.user.email}).then((user)=> {
            req.session.cart= user.cart;
        })
//        console.log(req.session.cart);
        next();    
    }else{
        req.flash('error_message',`You need to login first.`);
        res.redirect('/');
    }
}

const isLoggedin_4_logout= (req,res,next)=> {
    if(req.isAuthenticated()){
        next();    
    }else{
//        req.flash('error_message',`You need to logout first.`);
        res.redirect('/');
    }
}

//using a middlware isloggedoout to check if it is authenticated
router.get('/signup',isLoggedout,(req,res,next)=> {
 
    res.render('routes_UI/signup');
})


router.get('/login',isLoggedout,(req,res,next)=> {
 
    res.render('routes_UI/login');
})


router.get('/profile',isLoggedin,(req,res,next)=> {
 
    Order.find({userEmail:req.user.email}).then((orders)=> {
        
        console.log(orders);
        res.render('routes_UI/profile',{user:req.user, orders:orders});
    })
})

router.get('/reduce/:id',(req,res)=> {
    
    let cart= new Cart(req.session.cart ? req.session.cart : {} );
    cart.reduceByOne(req.params.id);
    cart.generateArray();
    req.session.cart= cart;
    
    if(req.isAuthenticated()){ 
        User.findOne({email:req.user.email}).then((user)=> {
            user.cart= cart;  
            user.save();
            console.log(user.cart);
        })
    }
    console.log(req.session.cart);   
    res.redirect('/cart');    
})


router.get('/removeItem/:id',(req,res)=> {
    
    let cart= new Cart(req.session.cart ? req.session.cart : {} );
    cart.removeItem(req.params.id);
    cart.generateArray();
    req.session.cart= cart;
    
    if(req.isAuthenticated()){ 
        User.findOne({email:req.user.email}).then((user)=> {
            user.cart= cart;  
            user.save();
            console.log(user.cart);
        })
    } 
    console.log(req.session.cart);
    res.redirect('/cart');    
})

    

router.put('/add-to-cart/:id',(req,res,next)=> {

    let cart= new Cart(req.session.cart ? req.session.cart : {} );
    
    Product.findById(req.params.id).then((product)=> {
    
        cart.add(product, product.id);
        cart.generateArray();
        req.session.cart= cart;
        
        if(req.isAuthenticated()){
           User.findOne({email:req.user.email}).then((user)=> {
           user.cart=req.session.cart;
             user.save().then(()=>{
                  res.redirect('/'); 
             })
        })
        }else{
            res.redirect('/'); 
        }   
    }); 
});


router.get('/cart',(req,res)=> {
    
    let cart= req.session.cart || {};
    let itemsArray= cart.itemsArray ||[];
    
    res.render('routes_UI/cart',{cart, itemsArray, user:req.user});
})


router.get('/checkout',isLoggedin, (req,res)=> {
    let error_message= req.flash('error_message')[0];
    if(!req.session.cart){
        req.flash('error_message',`Add some items first.`);
        res.redirect('/cart');
    }else{
        res.render('routes_UI/checkout',{user:req.user, totalPrice:req.session.cart.totalPrice, error_message:error_message});
    }
})

router.post('/checkout',(req,res)=> {
    
    var stripe = require("stripe")("sk_test_JFyJNPEu7Ld6DOjnMxZU5CTY");

    stripe.charges.create({
      amount: req.session.cart.totalPrice * 100,
      currency: "usd",
      source: req.body.stripeToken, // obtained with Stripe.js
      description: "Charge for products."
    }, function(err, charge) {
      if(err){
          console.log(err);
          req.flash('error_message',err.message);
          return res.redirect('/checkout');
      }
        if(charge){
            
            console.log(charge);
            const newOrder= new Order({
                userEmail:req.user.email,
                order:req.user.cart,
                name:req.body.name,
                address:req.body.address,
                paymentId:charge.id,     
            })
            newOrder.save();
            
        
           User.findOne({email:req.user.email}).then((user)=> {
               
//              user.orders.push(user.cart);
//              console.log(user.orders[0]);
              req.session.cart= null;
              user.cart= null;
               
              user.save().then(()=> {
                  req.flash('success_message',`successfully bought product(s)!`);
                  res.redirect('/');
              })
           })
        }
    });
    
})
                           

router.get('/',(req, res)=> {
    

    let success_message= req.flash('success_message');

    Product.find().then((products)=> {
        
        let productChunks=[];
        const chunkSize= 4;
        for(let i=0; i<products.length; i +=chunkSize){
            productChunks.push(products.slice(i, i+chunkSize));
        }
        
        if(req.isAuthenticated()){     
            User.findOne({email:req.user.email}).then((user)=> {
                
                let x= JSON.stringify(req.session.cart);
                let y= JSON.stringify(user.cart);
                let z= (x !== y);
                
                console.log(user.cart);
                console.log(req.session.cart);
                if(req.session.cart && z){
                    
                    let cart= new Cart(user.cart ? user.cart : {} );
                
                    cart.add2(req.session.cart);
                    cart.generateArray();
                    req.session.cart= cart;
                    user.cart= cart;
                    
                    
                }else{
                    req.session.cart=user.cart;
                }   
                console.log(req.session.cart);
                user.save().then(()=> {
                    res.render('routes_UI/index', {productChunks, user:req.user,success_message});
                })     
            })          
        }
        
        else{
            res.render('routes_UI/index', {productChunks});
        }
        
    })
});


router.get('/logout',isLoggedin_4_logout,(req, res)=>{
 
    req.session.destroy();
    req.logout();
    res.redirect('/login');
    
});


router.post('/signup',(req,res)=> {
       
    if(req.body.password!==req.body.confirmPassword){
        req.flash('error_message',`Passwords do not match`);
        res.redirect('/signup');
    }else{
        
        User.findOne({ email: req.body.email}).then((user)=> {
            if(user){
               req.flash('error_message',`A user with this email already exists`);
               res.redirect('/signup');
            }else{
                    bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(req.body.password, salt, function(err, hash) {

                        const user= new User({
                                username:req.body.username,
                                email:req.body.email,
                                password:hash
                            });

                        user.save().then(()=> {
                            req.flash('success_message',`You have registered successfully, please login`);
                            res.redirect('/login');
                        });
                     });
                  });
            }
        })   
    }   
})


passport.use(new LocalStrategy({usernameField: 'email'},
  (email, password, done)=> {
    
    User.findOne({email:email}).then((user)=> {
        
      if (!user) {
        return done(null, false);
      }
        
        bcrypt.compare(password, user.password,(err, matched)=> {
            
                if(matched){
                    return done(null, user);
                }
                else{
                    return done(null, false);
                }
        });
    })
   }
));


passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



router.post('/login',
  passport.authenticate('local'
                        , {successRedirect: '/',
                          failureRedirect: '/login',
                          failureFlash: 'Invalid email or password.',
                          successFlash: 'You are logged in, now you can buy products.'}
                       ));



const products= [
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Carrots_of_many_colors.jpg',
        title: 'Carrot',
        description: 'Vegetable',
        price: 10
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Guava_Thailand.jpg',
        title: 'Guava',
        description: 'Fruit',
        price: 40
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Onions.jpg',
        title: 'Onion',
        description: 'Vegetable',
        price: 10
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Bright_red_tomato_and_cross_section02.jpg',
        title: 'Tomato',
        description: 'Fruit',
        price: 30
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Grapes.jpg',
        title: 'Grapes',
        description: 'Fruit',
        price: 20
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Lemon-edit1.jpg',
        title: 'lemon',
        description: 'Fruit',
        price: 30
    }),
    new Product({
        imagePath: 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Detroitdarkredbeets.png',
        title: 'Grapes',
        description: 'Fruit',
        price: 20
    })
    
        
    
    
   

]

for(let i=0; i < products.length; i++){
    
    Product.find().then((productss)=> {
        let count= 0;
        for(let j=0; j< productss.length; j++){
            if(products[i].title===productss[j].title){
               count++;
            }
        }
        if(count==0){
            products[i].save();
        }
    })
    
}


module.exports = router;
