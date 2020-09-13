const mongoose= require('mongoose');


// Mongoose Schema
const UserSchema= new mongoose.Schema({
    
    username:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    cart:{
        type: Object,
        default:null
    },
   
}, {usePushEach: true})

// creating a mongoose model
const User= mongoose.model('users', UserSchema);

module.exports={User};


