require('dotenv').config();
const express = require("express");
const { createServer } = require('http'); 
const connectToDB = require("./config/db"); 
const mongoose = require('mongoose');
const app = express();
const server = createServer(app); 
 
const cors = require("cors");
const morgan = require("morgan");
 

// middleware
app.use(express.json());
app.use(express.urlencoded({extended:true})); 
connectToDB();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    callback(null, allowedOrigins.includes(origin));
  },
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
}));
app.use(morgan("dev"));  
 

const PORT = process.env.PORT;

 
let familiesCollectionName = null;
const talukaSlugToGujarati = {
  vyara: 'વ્યારા ',
  songadh: 'સોનગઢ',
  valod: 'વાલોડ',
  nizar: 'નિઝર ',
  uchchhal: 'ઉચ્છલ',
  kukarmunda: 'કુકરમુંડા ',
};

async function getFamiliesCollection() {
  if (familiesCollectionName) return mongoose.connection.db.collection(familiesCollectionName);
  const cols = await mongoose.connection.db.listCollections().toArray();
  for (const c of cols) {
    const coll = mongoose.connection.db.collection(c.name);
    const doc = await coll.findOne({ 'Taluka Name': { $exists: true } });
    if (doc) {
      familiesCollectionName = c.name;
      return coll;
    }
  }
  return null;
}

app.get("/api/taluka/:talukaName", async (req,res)=>{
  try {
    const talukaParam = decodeURIComponent(req.params.talukaName).toLowerCase();
    const coll = await getFamiliesCollection();
    if (!coll) return res.status(500).json({ success: false, message: 'No suitable collection found' });
    if (talukaParam === 'all') {
      const results = await coll.find({}).toArray();
      return res.json({ success: true, data: results });
    }
    const gujaratiName = talukaSlugToGujarati[talukaParam] || talukaParam;
    const results = await coll.find({ 'Taluka Name': gujaratiName }).toArray();
    if (results.length > 0) {
      return res.json({ success: true, data: results });
    }
    return res.json({ success: true, data: [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
})

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); 
});
