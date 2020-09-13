const express             =      require('express');
      mongoose            =      require('mongoose');
      upload              =      require('express-fileupload');
      bodyParser          =      require('body-parser');
      exphbs              =      require('express-handlebars');
      path                =      require('path');
      methodOverride      =      require('method-override');
      createError         =      require('http-errors');
      cookieParser        =      require('cookie-parser'); 
      logger              =      require('morgan');
      session             =      require('express-session'); 
      flash               =      require('connect-flash');
      passport            =      require('passport');
      LocalStrategy       =      require('passport-local').Strategy;
      MongoStore          =      require('connect-mongo')(session);

const app= express();
const port= process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));


//Database connection
mongoose.connect(process.env.MONGODB_URI ||'mongodb://localhost:27017/carts',
{ 

  useNewUrlParser: true
  


});


//upload-middleware
app.use(upload());                              


//body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));


//Express-handlebars
app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', '.hbs');


//method-override
app.use(methodOverride('_method'));


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


//express-session middleware,It creates ability to create session so that we can store data 
app.set('trust proxy', 1) 
app.use(session({
  secret: 'This is my spider task 3',
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({mongooseConnection: mongoose.connection}), 
  cookie: {maxAge: 720 * 60 * 1000}
}))


// Flash is used in order to display flash messages which goes away after refreshing to make the user aware.
app.use(flash());


//flash middleware lets the user to store messages to flash data to deliver success error messages
app.use((req,res,next)=> {
    res.locals.user= req.user || null;
    res.locals.success_message=req.flash('success_message');
    res.locals.error_message=req.flash('error_message');
    res.locals.error=req.flash('error');
    res.locals.success=req.flash('success');
    
    res.locals.login=req.isAuthenticated();
    res.locals.session=req.session;
    next();
});


app.use(passport.initialize());
app.use(passport.session());


//Load Routes
 var indexRouter = require('./routes/index');


//Use routes
app.use('/', indexRouter);


//Error 
app.use(function(req, res, next) {
  next(createError(404));
});


app.use(function(err, req, res, next) {
    
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});



app.listen(port,()=> {
    console.log(`Started on port ${port}`);
})
