const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const app = express();
app.use(express.json());
app.use(cors());

const firebaseConfig = {
    apiKey: "AIzaSyAL_irUlJWnmP69E1EVwmdhQ_P2OaWFlNM",
    authDomain: "doorbell-79d5f.firebaseapp.com",
    projectId: "doorbell-79d5f",
    storageBucket: "doorbell-79d5f.firebasestorage.app",
    messagingSenderId: "208543328595",
    appId: "1:208543328595:web:c09d6e7cb46acf460059a6"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const MONGO_URI = 'mongodb+srv://gipsydanger810:kEuO5OJJmPSPYCws@cluster0.l1btn.mongodb.net/doorbell?retryWrites=true&w=majority';
const DATABASE_NAME = 'doorbell';
const COLLECTION_NAME = 'notifications';

async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  return client;
}

app.post("/logIn", async (req, res) => {
  const { correo, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, correo, password);
    const user = userCredential.user;
    
    res.json({
      msg: "Login exitoso",
      uid: user.uid,
      email: user.email
    });

  } catch (error) {
    console.error("Error al iniciar sesión:", error.code, error.message);
    res.status(400).json({
      msg: "Credenciales incorrectas",
      error: error.code
    });
  }
});

app.post('/saveNotification', async (req, res) => {
    const { message, notificationId, timestamp } = req.body;
  
    if (!message || !notificationId || !timestamp) {
      return res.status(400).json({ msg: "Faltan datos para guardar la notificación." });
    }
  
    try {
      const client = await connectToMongo();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection('notifications'); 
  
      const result = await collection.insertOne({
        message,
        notificationId,
        timestamp: new Date(timestamp),
      });
  
      res.status(200).json({ msg: "Notificación guardada exitosamente." });
      await client.close();
    } catch (error) {
      console.error("Error al guardar la notificación:", error);
      res.status(500).json({ msg: "Hubo un problema al guardar la notificación." });
    }
  });
  

  app.get('/getNotifications', async (req, res) => {
    try {
      const client = await connectToMongo();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);
  
      const notifications = await collection.find().sort({ timestamp: -1 }).toArray();
  
      res.json({ notifications });
  
      await client.close();
    } catch (error) {
      console.error('Error al obtener las notificaciones:', error);
      res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }
  });
  
app.get('/getLastNotification', async (req, res) => {
    try {
      const client = await connectToMongo();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);
  
      const lastNotification = await collection.findOne({}, { sort: { timestamp: -1 } });
  
      if (lastNotification) {
        res.json({ notification: lastNotification });
      } else {
        res.json({ notification: null });
      }
  
      await client.close();
    } catch (error) {
      console.error("Error al obtener la última notificación:", error);
      res.status(500).json({ error: "Error al obtener la notificación." });
    }
  });

  app.post('/simularTimbre', async (req, res) => {
    try {
      const message = "Alguien tocó el timbre";
      const notificationId = Math.random().toString(36).substring(2);
      const timestamp = new Date();
    
      const client = await connectToMongo();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);
      
      await collection.insertOne({ message, notificationId, timestamp });
      
      const tokensCollection = db.collection('push_tokens');
      const tokens = await tokensCollection.find({}).toArray();
      
      if (tokens.length > 0) {
        await sendPushNotifications(tokens.map(t => t.token), message, { notificationId, timestamp });
      }
      
      await client.close();

      console.log("Se mando la notificacion :D")
    
      res.status(200).json({ msg: "Timbre simulado correctamente." });
    } catch (error) {
      console.error("Error al simular el timbre:", error);
      res.status(500).json({ msg: "Error al simular el timbre." });
    }
  });
  
  const { Expo } = require('expo-server-sdk');
  const expo = new Expo();
  
  async function sendPushNotifications(tokens, message, data) {
    const messages = [];
    
    for (let pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`El token ${pushToken} no es un token válido de Expo`);
        continue;
      }
      
      messages.push({
        to: pushToken,
        title: '¡Timbre! 🔔',
        body: message,
        data: data,
        priority: 'high',     
        categoryId: 'alarmCategory', 
        channelId: 'Notifi',
        sound: 'quantum_bell.wav'
      });
    }
    
    const chunks = expo.chunkPushNotifications(messages);
    
    try {
      for (let chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        console.log('Notificaciones enviadas:', chunks);
      }
    } catch (error) {
      console.error('Error al enviar notificaciones push:', error);
    }
  }


  app.post('/simularMovimiento', async (req, res) => {
    try {
      const message = "Se detecto movimiento";
      const notificationId = Math.random().toString(36).substring(2);
      const timestamp = new Date();
    
      const client = await connectToMongo();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);
      
      await collection.insertOne({ message, notificationId, timestamp });
      
      const tokensCollection = db.collection('push_tokens');
      const tokens = await tokensCollection.find({}).toArray();
      
      if (tokens.length > 0) {
        await sendPushNotifications2(tokens.map(t => t.token), message, { notificationId, timestamp });
      }
      
      await client.close();

      console.log("Se mando la notificacion :D")
    
      res.status(200).json({ msg: "Movimiento detectado correctamente." });
    } catch (error) {
      console.error("Error al simular el sensor:", error);
      res.status(500).json({ msg: "Error al simular el sensor." });
    }
  });
  
  async function sendPushNotifications2(tokens, message, data) {
    const messages = [];
    
    for (let pushToken of tokens) {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`El token ${pushToken} no es un token válido de Expo`);
        continue;
      }
      
      messages.push({
        to: pushToken,
        title: '¡Movimiento! 🔔',
        body: message,
        data: data,
        priority: 'high',     
        categoryId: 'alarmCategory', 
        channelId: 'Notifi2',
        sound: 'atomic_bell.wav'
      });
    }
    
    const chunks = expo.chunkPushNotifications(messages);
    
    try {
      for (let chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        console.log('Notificaciones enviadas:', chunks);
      }
    } catch (error) {
      console.error('Error al enviar notificaciones push:', error);
    }
  }

app.post('/registerPushToken', async (req, res) => {
  const { token, deviceInfo } = req.body;
  
  if (!token) {
    return res.status(400).json({ msg: "Token no proporcionado." });
  }
  
  try {
    const client = await connectToMongo();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('push_tokens'); 
    
    await collection.updateOne(
      { token }, 
      { 
        $set: {
          token,
          deviceInfo: deviceInfo || 'Unknown',
          lastUpdated: new Date()
        }
      },
      { upsert: true } 
    );
    
    await client.close();
    
    res.status(200).json({ msg: "Token registrado exitosamente." });
  } catch (error) {
    console.error("Error al registrar el token:", error);
    res.status(500).json({ msg: "Error al registrar el token." });
  }
});
  

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
